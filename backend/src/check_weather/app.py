import json
import os
from datetime import datetime, timedelta, timezone, time
from decimal import Decimal
from typing import Dict, Any, List
from zoneinfo import ZoneInfo

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

# Minimum number of consecutive forecast hours that must satisfy a trigger
# condition before we consider it significant enough to act on.
MIN_CONSECUTIVE_HOURS: int = 2

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


def _get_next3h_forecast(
    lat: float, lon: float, now_utc: datetime
) -> Dict[str, List[Any]]:
    """Return a 3-hour hourly forecast for the given coordinates.

    Parameters
    ----------
    lat, lon : float
        Geographic latitude and longitude.
    now_utc : datetime
        The *current* UTC time used to bound the 3-hour window.

    Returns
    -------
    Dict[str, List[Any]]
        Mapping with keys ``"time"``, ``"temperature"`` and ``"precipitation"``. Each
        list is limited to timestamps that fall within the next three hours from
        *now_utc*.
    """
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&hourly=temperature_2m,precipitation"
        "&forecast_days=1&timezone=UTC"
    )
    logger.info("[CHECK_WEATHER] Fetching 3-hour forecast: %s", url)
    resp = HTTP_SESSION.get(url, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    hours = data.get("hourly", {}).get("time", [])
    temps = data.get("hourly", {}).get("temperature_2m", [])
    prec = data.get("hourly", {}).get("precipitation", [])

    # Log raw arrays length and first few entries for inspection
    logger.info(
        "[CHECK_WEATHER] Raw forecast arrays for next 3h | len=%s hours_sample=%s temps_sample=%s prec_sample=%s",
        len(hours),
        hours[:3],
        temps[:3],
        prec[:3],
    )

    # Build list limited to next 3 hours
    forecast: Dict[str, List[Any]] = {
        "time": [],
        "temperature": [],
        "precipitation": [],
    }
    for idx, ts in enumerate(hours):
        ts_dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if ts_dt.tzinfo is None:
            ts_dt = ts_dt.replace(tzinfo=timezone.utc)
        if 0 <= (ts_dt - now_utc).total_seconds() <= 3 * 3600:
            forecast["time"].append(
                ts_dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")
            )
            forecast["temperature"].append(float(temps[idx]))
            forecast["precipitation"].append(float(prec[idx]))
    logger.info(
        "[CHECK_WEATHER] Next 3-h forecast sample | time=%s temp=%s precip=%s",
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
    open_local: str | None,
    close_local: str | None,
    tz_name: str | None,
) -> int | None:
    """Return earliest index at which trigger condition holds for a sustained window.

    A valid trigger now requires the condition to be satisfied for *at least*
    ``MIN_CONSECUTIVE_HOURS`` consecutive forecast hours. This reduces false
    positives caused by short-lived fluctuations.
    """

    temps = forecast["temperature"]
    precs = forecast["precipitation"]

    total_hours = len(temps)
    if total_hours < MIN_CONSECUTIVE_HOURS:
        return None

    threshold = 1.5 * std_temp

    def window_satisfies(start: int) -> bool:
        end = start + MIN_CONSECUTIVE_HOURS
        if trigger_name == "coldWeather":
            return all((mean_temp - temps[i]) > threshold for i in range(start, end))
        if trigger_name == "hotWeather":
            return all((temps[i] - mean_temp) > threshold for i in range(start, end))
        if trigger_name == "rain":
            return all(precs[i] > 0.2 for i in range(start, end))
        return False

    for idx in range(0, total_hours - MIN_CONSECUTIVE_HOURS + 1):
        # Business hours gate --------------------------------------------------
        ts_iso = forecast["time"][idx]
        if not _is_within_local_hours(ts_iso, open_local, close_local, tz_name):
            continue

        if window_satisfies(idx):
            end_idx = idx + MIN_CONSECUTIVE_HOURS - 1
            if trigger_name == "rain":
                logger.info(
                    "[CHECK_WEATHER] %s sustained %sh window idx=%s-%s precip_avg=%.2f (local window)",
                    trigger_name,
                    MIN_CONSECUTIVE_HOURS,
                    idx,
                    end_idx,
                    sum(precs[idx:end_idx+1]) / MIN_CONSECUTIVE_HOURS,
                )
            else:
                # temperature delta info
                deltas = [abs(temps[i] - mean_temp) for i in range(idx, end_idx + 1)]
                logger.info(
                    "[CHECK_WEATHER] %s sustained %sh window idx=%s-%s avgΔ=%.2f°C threshold=%.2f°C (local window)",
                    trigger_name,
                    MIN_CONSECUTIVE_HOURS,
                    idx,
                    end_idx,
                    sum(deltas) / MIN_CONSECUTIVE_HOURS,
                    threshold,
                )
            return idx

    return None


# ---------------------------------------------------------------------------
# Local-hours helper
# ---------------------------------------------------------------------------


def _is_within_local_hours(
    ts_iso: str,
    open_local: str | None,
    close_local: str | None,
    tz_name: str | None,
) -> bool:
    """Return *True* if the UTC timestamp *ts_iso* falls within the local open window.

    Parameters
    ----------
    ts_iso : str
        Forecast timestamp in ISO-8601 Zulu (e.g. ``"2025-06-25T09:00:00Z"``).
    open_local, close_local : str | None
        Local time strings in HH:MM 24-hour format (e.g. ``"09:00"``).
    tz_name : str | None
        IANA time-zone identifier (e.g. ``"Asia/Yangon"``).
    """
    if not open_local or not close_local or not tz_name:
        return True  # insufficient data → allow

    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        return True  # unknown TZ → allow

    try:
        # Convert forecast timestamp to local time
        ts_dt = datetime.fromisoformat(ts_iso.replace("Z", "+00:00")).astimezone(tz)
        ts_local_time = time(ts_dt.hour, ts_dt.minute)

        open_parts = open_local.split(":")
        close_parts = close_local.split(":")
        if len(open_parts) != 2 or len(close_parts) != 2:
            return True

        open_time = time(int(open_parts[0]), int(open_parts[1]))
        close_time = time(int(close_parts[0]), int(close_parts[1]))

        if open_time <= close_time:
            return open_time <= ts_local_time < close_time
        # Overnight shift (e.g., 18:00 – 02:00)
        return ts_local_time >= open_time or ts_local_time < close_time
    except Exception:  # noqa: BLE001
        return True


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------


def lambda_handler(event: Dict[str, Any], context):
    """Entry point for AWS Lambda to evaluate weather triggers and emit events."""
    now_utc = datetime.now(timezone.utc)

    # 1. Scan all businesses (projection narrow)
    projection = "businessID, #loc, latitude, longitude, triggers, openTimeLocal, closeTimeLocal, #tz"
    expr_attr_names = {"#loc": "location", "#tz": "timeZone"}
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

        # Upcoming 3-hour forecast
        try:
            forecast = _get_next3h_forecast(lat, lon, now_utc)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "[CHECK_WEATHER] Forecast fetch failed for %s: %s",
                business_id,
                exc,
                exc_info=True,
            )
            continue

        open_local: str | None = item.get("openTimeLocal")
        close_local: str | None = item.get("closeTimeLocal")
        tz_name: str | None = item.get("timeZone")

        logger.info(
            "[CHECK_WEATHER] Open hours for %s: %s-%s (%s)",
            business_id,
            open_local,
            close_local,
            tz_name,
        )

        for trig_name in ("coldWeather", "hotWeather", "rain"):
            idx = _first_trigger_index(
                trig_name,
                forecast,
                mean_temp,
                std_temp,
                open_local,
                close_local,
                tz_name,
            )
            if idx is None:
                logger.info(
                    "[CHECK_WEATHER] Trigger %s not present within 3-h window",
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
                "triggerCategory": "weather",
                "city": city_name,
                "latitude": lat,
                "longitude": lon,
                "temperature": forecast["temperature"],
                "precipitation": forecast["precipitation"],
                "triggerTime": trigger_time_iso,
                "scheduleName": "",  # placeholder, will set below
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

            # inject into detail and upcomingPosts
            detail["scheduleName"] = schedule_name

            try:
                SCHEDULER.create_schedule(
                    Name=schedule_name,
                    GroupName="default",
                    ScheduleExpression=f"at({trigger_time_iso.rstrip('Z')})",
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
