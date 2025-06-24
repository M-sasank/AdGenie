import json
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, Any, List

import boto3
import requests
import logging

# ---------------------------------------------------------------------------
# Clients initialised outside the handler for connection reuse
# ---------------------------------------------------------------------------

dynamodb = boto3.resource("dynamodb")
EVENT_BRIDGE = boto3.client("events")
TABLE_NAME = os.environ.get("BUSINESSES_TABLE", "Businesses")
BUSINESSES_TABLE = dynamodb.Table(TABLE_NAME)

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
    resp = HTTP_SESSION.get(url, timeout=10)
    if resp.status_code != 200:
        raise RuntimeError(f"Geocoding API HTTP {resp.status_code}")
    data = resp.json()
    if not data.get("results"):
        raise RuntimeError("No geocoding results")
    result = data["results"][0]
    logger.info("[CHECK_WEATHER] Geocoding results: %s", result)
    return {"latitude": float(result["latitude"]), "longitude": float(result["longitude"])}


def _get_7day_avg_temp(lat: float, lon: float, now_utc: datetime) -> float:
    """
    Return the 7-day average temperature in °C for the given coordinates.

    Uses Open-Meteo Archive API with daily mean temperature.
    """
    end_date = (now_utc - timedelta(days=1)).date()
    start_date = end_date - timedelta(days=6)
    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={start_date}&end_date={end_date}"
        "&daily=temperature_2m_mean&timezone=UTC"
    )
    resp = HTTP_SESSION.get(url, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    temps: List[float] = data.get("daily", {}).get("temperature_2m_mean", [])
    temps_clean = [t for t in temps if t is not None]
    if not temps_clean:
        raise RuntimeError("Archive data missing")
    logger.info("[CHECK_WEATHER] 7-day average temperature: %s", temps_clean)
    return sum(temps_clean) / len(temps_clean)


def _get_next12h_forecast(lat: float, lon: float, now_utc: datetime) -> Dict[str, List[float]]:
    """Fetch next 12-hour forecast for temperature (°C) and precipitation (mm)."""
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&hourly=temperature_2m,precipitation"
        "&forecast_days=1&timezone=UTC"
    )
    resp = HTTP_SESSION.get(url, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    hours = data.get("hourly", {}).get("time", [])
    temps = data.get("hourly", {}).get("temperature_2m", [])
    prec = data.get("hourly", {}).get("precipitation", [])

    # Build list limited to next 12 hours
    forecast: Dict[str, List[float]] = {"temperature": [], "precipitation": []}
    for idx, ts in enumerate(hours):
        ts_dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if ts_dt.tzinfo is None:
            ts_dt = ts_dt.replace(tzinfo=timezone.utc)
        if 0 <= (ts_dt - now_utc).total_seconds() <= 12 * 3600:
            forecast["temperature"].append(float(temps[idx]))
            forecast["precipitation"].append(float(prec[idx]))
    logger.info("[CHECK_WEATHER] Next 12-hour forecast: %s", forecast)
    return forecast


def _detect_triggers(forecast: Dict[str, List[float]], avg_temp: float) -> Dict[str, bool]:
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
    logger.info("[CHECK_WEATHER] Trigger results: %s", {
        "coldWeather": cold,
        "hotWeather": hot,
        "rain": rainy,
        "sunAfterRain": sun_after_rain,
    })
    return {
        "coldWeather": cold,
        "hotWeather": hot,
        "rain": rainy,
        "sunAfterRain": sun_after_rain,
    }


def _matches_business_preferences(trigger_name: str, weather_prefs: Dict[str, bool]) -> bool:
    mapping = {
        "coldWeather": weather_prefs.get("coolPleasant"),
        "hotWeather": weather_prefs.get("hotSunny"),
        "rain": weather_prefs.get("rainy"),
        "sunAfterRain": weather_prefs.get("hotSunny"),
    }
    return bool(mapping.get(trigger_name))


# ---------------------------------------------------------------------------
# Lambda handler
# ---------------------------------------------------------------------------

def lambda_handler(event: Dict[str, Any], context):
    """Entry point for AWS Lambda to evaluate weather triggers and emit events."""
    now_utc = datetime.now(timezone.utc)

    # 1. Scan all businesses (projection narrow)
    projection = "businessID, #loc, latitude, longitude, triggers"
    expr_attr_names = {"#loc": "location"}
    response = BUSINESSES_TABLE.scan(ProjectionExpression=projection, ExpressionAttributeNames=expr_attr_names)
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
        triggers_cfg = (
            item.get("triggers", {}).get("weather", {}) if isinstance(item.get("triggers"), dict) else {}
        )
        if not any(triggers_cfg.values()):
            continue  # Weather triggers not enabled

        logger.info("[CHECK_WEATHER] Weather triggers enabled for business %s", business_id)

        city_name = item.get("location") or ""
    
        # Ensure coordinates
        lat = item.get("latitude")
        lon = item.get("longitude")
        if isinstance(lat, Decimal):
            lat = float(lat)
        if isinstance(lon, Decimal):
            lon = float(lon)
        if lat is None or lon is None:
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
                logger.warning("[CHECK_WEATHER] Geocoding failed for %s: %s", business_id, exc)
                continue

        # 7-day average temp
        try:
            avg_temp = _get_7day_avg_temp(lat, lon, now_utc)
        except Exception as exc:  # noqa: BLE001
            logger.warning("[CHECK_WEATHER] Archive fetch failed for %s: %s", business_id, exc)
            continue

        # Upcoming 12-hour forecast
        try:
            forecast = _get_next12h_forecast(lat, lon, now_utc)
        except Exception as exc:  # noqa: BLE001
            logger.warning("[CHECK_WEATHER] Forecast fetch failed for %s: %s", business_id, exc)
            continue

        trigger_results = _detect_triggers(forecast, avg_temp)

        for trig_name, trig_matched in trigger_results.items():
            if not trig_matched:
                continue
            if not _matches_business_preferences(trig_name, triggers_cfg):
                continue

            detail = {
                "businessID": business_id,
                "triggerType": trig_name,
                "city": city_name,
                "latitude": lat,
                "longitude": lon,
                "temperature": forecast["temperature"],
                "precipitation": forecast["precipitation"],
                "timestamp": now_utc.isoformat(),
            }
            logger.info("[CHECK_WEATHER] Emitting trigger %s for business %s", trig_name, business_id)
            EVENT_BRIDGE.put_events(
                Entries=[
                    {
                        "Source": "adgenie.weather",
                        "DetailType": "Weather Trigger Activated",
                        "Detail": json.dumps(detail),
                        "Time": now_utc,
                    }
                ]
            )

    logger.info("[CHECK_WEATHER] Completed run, scanned %s businesses", len(items))
    return {"statusCode": 200, "body": json.dumps({"processed": len(items)})}
