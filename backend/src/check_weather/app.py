import json
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, Any, List

import boto3
import requests
import logging
import traceback
import statistics
import secrets

# ---------------------------------------------------------------------------
# Clients initialised outside the handler for connection reuse
# ---------------------------------------------------------------------------

dynamodb = boto3.resource("dynamodb")
EVENT_BRIDGE = boto3.client("events")
TABLE_NAME = os.environ.get("BUSINESSES_TABLE", "Businesses")
BUSINESSES_TABLE = dynamodb.Table(TABLE_NAME)

# Scheduler client for one-off delayed invocations
SCHEDULER = boto3.client("scheduler")

# Environment variables
BEDROCK_GENERATE_FUNCTION_ARN = os.environ.get("BEDROCK_GENERATE_FUNCTION_ARN")
SCHEDULER_ROLE_ARN = os.environ.get("SCHEDULER_ROLE_ARN")

# Persistent HTTP session for external API calls
HTTP_SESSION = requests.Session()

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def _get_coordinates(city_name: str) -> Dict[str, float]:
    """Resolve a city name to latitude and longitude using Open-Meteo geocoding API.

    Parameters
    ----------
    city_name : str
        Human-readable city name (e.g. "Yangon, Myanmar").

    Returns
    -------
    Dict[str, float]
        Dictionary with keys ``latitude`` and ``longitude``.

    Raises
    ------
    RuntimeError
        If the API fails or no results are returned.
    """
    url = (
        "https://geocoding-api.open-meteo.com/v1/search"
        f"?name={requests.utils.quote(city_name)}&count=1&language=en&format=json"
    )
    logger.info("[CHECK_WEATHER] Fetching geocoding: %s", url)
    resp = HTTP_SESSION.get(url, timeout=10)
    if resp.status_code != 200:
        raise RuntimeError(f"Geocoding API HTTP {resp.status_code}")
    data = resp.json()
    if not data.get("results"):
        raise RuntimeError("No geocoding results")
    result = data["results"][0]
    logger.info("[CHECK_WEATHER] Geocoding results: %s", result)
    return {
        "latitude": float(result["latitude"]),
        "longitude": float(result["longitude"]),
    }


def _get_30day_stats(lat: float, lon: float, now_utc: datetime) -> tuple[float, float]:
    """Return *(mean, std_dev)* of the past 30-day daily-mean temperature.

    Parameters
    ----------
    lat, lon : float
        Geographic coordinates.
    now_utc : datetime
        Current UTC time (used to derive date range).

    Returns
    -------
    tuple[float, float]
        Mean temperature and *population* standard deviation (°C). If fewer than
        two valid data points are available, ``std_dev`` is set to ``0.5`` to
        ensure some sensitivity.
    """
    end_date = (now_utc - timedelta(days=1)).date()
    start_date = end_date - timedelta(days=29)
    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={start_date}&end_date={end_date}"
        "&daily=temperature_2m_mean&timezone=UTC"
    )
    logger.info("[CHECK_WEATHER] Fetching 30-day archive: %s", url)
    resp = HTTP_SESSION.get(url, timeout=10)
    resp.raise_for_status()
    temps = resp.json().get("daily", {}).get("temperature_2m_mean", [])
    temps_clean = [float(t) for t in temps if t is not None]
    if not temps_clean:
        raise RuntimeError("Archive data missing")
    mean_temp = statistics.mean(temps_clean)
    std_temp = statistics.pstdev(temps_clean) if len(temps_clean) > 1 else 0.0
    if std_temp == 0:
        std_temp = 0.5  # enforce minimal sensitivity
    logger.info("[CHECK_WEATHER] 30-day stats | mean=%.2f°C std=%.2f°C", mean_temp, std_temp)
    return mean_temp, std_temp


def _get_7day_avg_temp(lat: float, lon: float, now_utc: datetime) -> float:
    """Return the 7-day average temperature in °C for logging purposes."""
    end_date = (now_utc - timedelta(days=1)).date()
    start_date = end_date - timedelta(days=6)
    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={start_date}&end_date={end_date}"
        "&daily=temperature_2m_mean&timezone=UTC"
    )
    # logger.info("[CHECK_WEATHER] Fetching 7-day archive: %s", url)
    resp = HTTP_SESSION.get(url, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    temps: List[float] = data.get("daily", {}).get("temperature_2m_mean", [])
    temps_clean = [t for t in temps if t is not None]
    if not temps_clean:
        raise RuntimeError("Archive data missing")
    logger.info("[CHECK_WEATHER] 7-day average temperature: %s", temps_clean)
    return sum(temps_clean) / len(temps_clean)


def _get_next12h_forecast(
    lat: float, lon: float, now_utc: datetime
) -> Dict[str, List[Any]]:
    """Fetch next 12-hour forecast including time, temperature (°C) and precipitation (mm)."""
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&hourly=temperature_2m,precipitation"
        "&forecast_days=1&timezone=UTC"
    )
    logger.info("[CHECK_WEATHER] Fetching 12-hour forecast: %s", url)
    resp = HTTP_SESSION.get(url, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    hours = data.get("hourly", {}).get("time", [])
    temps = data.get("hourly", {}).get("temperature_2m", [])
    prec = data.get("hourly", {}).get("precipitation", [])

    # Log raw arrays length and first 12 entries for inspection
    logger.info(
        "[CHECK_WEATHER] Raw forecast arrays | len=%s hours_sample=%s temps_sample=%s prec_sample=%s",
        len(hours),
        hours[:12],
        temps[:12],
        prec[:12],
    )

    # Build list limited to next 12 hours
    forecast: Dict[str, List[Any]] = {
        "time": [],
        "temperature": [],
        "precipitation": [],
    }
    for idx, ts in enumerate(hours):
        ts_dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if ts_dt.tzinfo is None:
            ts_dt = ts_dt.replace(tzinfo=timezone.utc)
        if 0 <= (ts_dt - now_utc).total_seconds() <= 12 * 3600:
            forecast["time"].append(
                ts_dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")
            )
            forecast["temperature"].append(float(temps[idx]))
            forecast["precipitation"].append(float(prec[idx]))
    logger.info(
        "[CHECK_WEATHER] Next 12-h forecast sample | time=%s temp=%s precip=%s",
        forecast["time"] if "time" in forecast else "n/a",
        forecast["temperature"],
        forecast["precipitation"],
    )
    return forecast


def _detect_triggers(
    forecast: Dict[str, List[float]], avg_temp: float
) -> Dict[str, bool]:
    """Return a mapping of trigger name → bool for the forecast window."""
    cold = any(t <= avg_temp - 5 for t in forecast["temperature"])
    hot = any(t >= avg_temp + 5 for t in forecast["temperature"])
    rainy = any(p > 0 for p in forecast["precipitation"])
    # sun after rain: at least one precip>0 followed by precip==0 later
    sun_after_rain = False
    seen_rain = False
    for p in forecast["precipitation"]:
        if p > 0:
            seen_rain = True
        elif seen_rain and p == 0:
            sun_after_rain = True
            break
    logger.info(
        "[CHECK_WEATHER] Trigger results: %s",
        {
            "coldWeather": cold,
            "hotWeather": hot,
            "rain": rainy,
            "sunAfterRain": sun_after_rain,
        },
    )
    return {
        "coldWeather": cold,
        "hotWeather": hot,
        "rain": rainy,
        "sunAfterRain": sun_after_rain,
    }


def _matches_business_preferences(
    trigger_name: str, weather_prefs: Dict[str, bool]
) -> bool:
    mapping = {
        "coldWeather": weather_prefs.get("coolPleasant"),
        "hotWeather": weather_prefs.get("hotSunny"),
        "rain": weather_prefs.get("rainy"),
    }
    return bool(mapping.get(trigger_name))


# ---------------------------------------------------------------------------
# Trigger evaluation helpers
# ---------------------------------------------------------------------------


def _first_trigger_index(
    trigger_name: str,
    forecast: Dict[str, List[Any]],
    mean_temp: float,
    std_temp: float,
) -> int | None:
    """Return earliest index (0-based) at which *trigger_name* condition is met.

    Parameters
    ----------
    trigger_name : str
        One of ``coldWeather``, ``hotWeather``, ``rain``, ``sunAfterRain``.
    forecast : Dict[str, List[Any]]
        Output from :pyfunc:`_get_next12h_forecast`.
    mean_temp : float
        30-day historical average temperature.
    std_temp : float
        Population standard deviation of the past 30-day daily-mean temperature.

    Returns
    -------
    int | None
        Index of the first hour that satisfies the trigger or ``None``.
    """
    temps = forecast["temperature"]
    precs = forecast["precipitation"]

    threshold = 1.5 * std_temp

    if trigger_name == "coldWeather":
        for idx, t in enumerate(temps):
            delta = mean_temp - t
            if delta > threshold:
                logger.info(
                    "[CHECK_WEATHER] coldWeather first idx=%s temp=%.2f delta=%.2f thresh=%.2f",
                    idx,
                    t,
                    delta,
                    threshold,
                )
                return idx
    elif trigger_name == "hotWeather":
        for idx, t in enumerate(temps):
            delta = t - mean_temp
            if delta > threshold:
                logger.info(
                    "[CHECK_WEATHER] hotWeather first idx=%s temp=%.2f delta=%.2f thresh=%.2f",
                    idx,
                    t,
                    delta,
                    threshold,
                )
                return idx
    elif trigger_name == "rain":
        for idx, p in enumerate(precs):
            if p > 0.2:
                logger.info("[CHECK_WEATHER] rain first index %s precip=%s", idx, p)
                return idx
    return None


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------


def lambda_handler(event: Dict[str, Any], context):
    """Entry point for AWS Lambda to evaluate weather triggers and emit events."""
    now_utc = datetime.now(timezone.utc)

    # 1. Scan all businesses (projection narrow)
    projection = "businessID, #loc, latitude, longitude, triggers"
    expr_attr_names = {"#loc": "location"}
    response = BUSINESSES_TABLE.scan(
        ProjectionExpression=projection, ExpressionAttributeNames=expr_attr_names
    )
    items = response.get("Items", [])

    while "LastEvaluatedKey" in response:
        response = BUSINESSES_TABLE.scan(
            ProjectionExpression=projection,
            ExpressionAttributeNames=expr_attr_names,
            ExclusiveStartKey=response["LastEvaluatedKey"],
        )
        items.extend(response.get("Items", []))

    for item in items:
        business_id = item["businessID"]
        logger.info("[CHECK_WEATHER] Processing business %s", business_id)
        triggers_cfg = (
            item.get("triggers", {}).get("weather", {})
            if isinstance(item.get("triggers"), dict)
            else {}
        )
        if not any(triggers_cfg.values()):
            continue  # Weather triggers not enabled

        logger.info(
            "[CHECK_WEATHER] Weather triggers enabled for business %s", business_id
        )

        city_name = item.get("location") or ""

        # Ensure coordinates
        lat = item.get("latitude")
        lon = item.get("longitude")
        if isinstance(lat, Decimal):
            lat = float(lat)
        if isinstance(lon, Decimal):
            lon = float(lon)
        if lat is None or lon is None:
            logger.info(
                "[CHECK_WEATHER] Coordinates missing for %s, resolving for city '%s'",
                business_id,
                city_name,
            )
            try:
                coords = _get_coordinates(city_name)
                lat = coords["latitude"]
                lon = coords["longitude"]
                # Write back to DynamoDB for caching
                BUSINESSES_TABLE.update_item(
                    Key={"businessID": business_id},
                    UpdateExpression="SET latitude = :lat, longitude = :lon",
                    ExpressionAttributeValues={
                        ":lat": Decimal(str(lat)),
                        ":lon": Decimal(str(lon)),
                    },
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "[CHECK_WEATHER] Geocoding failed for %s: %s",
                    business_id,
                    exc,
                    exc_info=True,
                )
                continue

        # 30-day mean & std
        try:
            mean_temp, std_temp = _get_30day_stats(lat, lon, now_utc)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "[CHECK_WEATHER] Stats fetch failed for %s: %s",
                business_id,
                exc,
                exc_info=True,
            )
            continue

        # Upcoming 12-hour forecast
        try:
            forecast = _get_next12h_forecast(lat, lon, now_utc)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "[CHECK_WEATHER] Forecast fetch failed for %s: %s",
                business_id,
                exc,
                exc_info=True,
            )
            continue

        for trig_name in ("coldWeather", "hotWeather", "rain"):
            idx = _first_trigger_index(trig_name, forecast, mean_temp, std_temp)
            if idx is None:
                logger.info(
                    "[CHECK_WEATHER] Trigger %s not present within 12-h window",
                    trig_name,
                )
                continue

            user_pref = _matches_business_preferences(trig_name, triggers_cfg)
            logger.info(
                "[CHECK_WEATHER] Trigger candidate %s index=%s prefEnabled=%s",
                trig_name,
                idx,
                user_pref,
            )
            if not user_pref:
                continue

            trigger_time_iso = forecast["time"][idx]

            detail = {
                "businessID": business_id,
                "triggerType": trig_name,
                "city": city_name,
                "latitude": lat,
                "longitude": lon,
                "temperature": forecast["temperature"],
                "precipitation": forecast["precipitation"],
                "triggerTime": trigger_time_iso,
                "timestamp": now_utc.isoformat(),
            }

            # ----------------------------------------------------------------
            #  Create one-off schedule in EventBridge Scheduler
            # ----------------------------------------------------------------
            if not BEDROCK_GENERATE_FUNCTION_ARN or not SCHEDULER_ROLE_ARN:
                logger.error(
                    "[CHECK_WEATHER] Missing ENV ARNs; skipping schedule creation for %s",
                    trig_name,
                )
                continue

            ts_epoch = int(
                datetime.fromisoformat(trigger_time_iso.replace("Z", "+00:00")).timestamp()
            )
            biz8 = business_id[:8]
            rand4 = secrets.token_hex(2)
            schedule_name = f"ag-{trig_name}-{biz8}-{ts_epoch}-{rand4}"

            try:
                SCHEDULER.create_schedule(
                    Name=schedule_name,
                    GroupName="default",
                    ScheduleExpression=f"at({trigger_time_iso})",
                    FlexibleTimeWindow={"Mode": "OFF"},
                    Target={
                        "Arn": BEDROCK_GENERATE_FUNCTION_ARN,
                        "RoleArn": SCHEDULER_ROLE_ARN,
                        "Input": json.dumps(detail),
                    },
                )
                logger.info(
                    "[CHECK_WEATHER] Created schedule name=%s expr=at(%s) target=%s",
                    schedule_name,
                    trigger_time_iso,
                    BEDROCK_GENERATE_FUNCTION_ARN,
                )

                # Record upcoming post in DynamoDB
                update_resp = BUSINESSES_TABLE.update_item(
                    Key={"businessID": business_id},
                    UpdateExpression=(
                        "SET upcomingPosts = list_append(if_not_exists(upcomingPosts, :empty), :post)"
                    ),
                    ExpressionAttributeValues={
                        ":empty": [],
                        ":post": [
                            {
                                "triggerType": trig_name,
                                "scheduledTime": trigger_time_iso,
                                "scheduleName": schedule_name,
                                "status": "scheduled",
                            }
                        ],
                    },
                )
                logger.info(
                    "[CHECK_WEATHER] upcomingPosts updated for %s | response=%s",
                    business_id,
                    update_resp,
                )
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "[CHECK_WEATHER] Failed to create schedule for %s: %s",
                    business_id,
                    exc,
                    exc_info=True,
                )

    logger.info("[CHECK_WEATHER] Completed run, scanned %s businesses", len(items))
    return {"statusCode": 200, "body": json.dumps({"processed": len(items)})}
