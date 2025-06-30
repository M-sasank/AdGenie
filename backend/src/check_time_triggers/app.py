import json
import os
from datetime import date, datetime, time, timedelta, timezone
import boto3
import logging
from zoneinfo import ZoneInfo

# AWS clients
DDB = boto3.resource("dynamodb")
SCHEDULER = boto3.client("scheduler")

TABLE_NAME = os.environ.get("BUSINESSES_TABLE", "Businesses")
TABLE = DDB.Table(TABLE_NAME)

BEDROCK_GENERATE_ARN = os.environ["BEDROCK_GENERATE_FUNCTION_ARN"]
SCHEDULER_ROLE_ARN = os.environ["SCHEDULER_ROLE_ARN"]

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _is_weekend(d: date) -> bool:
    return d.weekday() in (5, 6)  # Sat, Sun

def _is_payday(d: date) -> bool:
    # Pay-day definition: 1st and 29th of each month
    return d.day in (1, 29)

def _local_10am_utc(today: date, tz_name: str | None) -> str:
    """Return ISO timestamp for 10:00 local on *today* in UTC."""
    if not tz_name:
        tz_name = "UTC"
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")
    local_dt = datetime.combine(today, time(10, 0), tz)
    utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
    return utc_dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")

def _schedule_generation(business_id: str, trig_type: str, when_iso: str):
    """Create one-off EventBridge Scheduler job."""
    schedule_name = f"ag-{trig_type}-{business_id[:8]}-{int(datetime.utcnow().timestamp())}"
    detail = {
        "businessID": business_id,
        "triggerType": trig_type,
        "triggerCategory": "timeBased",
        "scheduleName": schedule_name,
    }
    SCHEDULER.create_schedule(
        Name=schedule_name,
        GroupName="default",
        ScheduleExpression=f"at({when_iso.rstrip('Z')})",
        FlexibleTimeWindow={"Mode": "OFF"},
        Target={
            "Arn": BEDROCK_GENERATE_ARN,
            "RoleArn": SCHEDULER_ROLE_ARN,
            "Input": json.dumps(detail),
        },
    )
    logger.info("[TIME_TRIGGER] Created schedule %s at %s for %s", schedule_name, when_iso, business_id)

# ---------------------------------------------------------------------------
# Safe wrapper for zones behind UTC
# ---------------------------------------------------------------------------

def _safe_schedule(business_id: str, trig_type: str, tz_name: str, local_day: date):
    """Schedule 10 AM local; if that time is already past in UTC, roll to next day."""
    when_iso = _local_10am_utc(local_day, tz_name)

    when_dt_utc = datetime.fromisoformat(when_iso.replace("Z", "+00:00"))
    if when_dt_utc <= datetime.now(timezone.utc):
        # move to next day's 10 AM
        when_iso = _local_10am_utc(local_day + timedelta(days=1), tz_name)
        logger.info("[TIME_TRIGGER] Rolled schedule to next day for past time. biz=%s type=%s newIso=%s", business_id, trig_type, when_iso)

    _schedule_generation(business_id, trig_type, when_iso)

# ---------------------------------------------------------------------------
# Lambda entrypoint
# ---------------------------------------------------------------------------

def lambda_handler(event, context):
    logger.info("[TIME_TRIGGER] === Daily time-trigger evaluation start | utc=%s ===", datetime.utcnow().isoformat())

    # Scan businesses that have time triggers configured
    projection = "businessID, triggers, #tz"
    resp = TABLE.scan(ProjectionExpression=projection, ExpressionAttributeNames={"#tz": "timeZone"})
    items = resp.get("Items", [])
    logger.info("[TIME_TRIGGER] DynamoDB scan returned %s items (page 1)", len(items))

    while "LastEvaluatedKey" in resp:
        resp = TABLE.scan(ProjectionExpression=projection, ExpressionAttributeNames={"#tz": "timeZone"}, ExclusiveStartKey=resp["LastEvaluatedKey"])
        items.extend(resp.get("Items", []))
        logger.info("[TIME_TRIGGER]  ... accumulated %s items", len(items))

    scheduled = 0
    for item in items:
        biz_id = item["businessID"]
        logger.info("[TIME_TRIGGER] ---------- Processing business %s ----------", biz_id)
        trig_cfg = (item.get("triggers", {}).get("timeBased") or {}) if isinstance(item.get("triggers"), dict) else {}
        tz_name = item.get("timeZone") or "UTC"

        try:
            local_today = datetime.now(ZoneInfo(tz_name)).date()
        except Exception:
            local_today = date.today()

        # Diagnostic logging
        weekend_flag = _is_weekend(local_today)
        payday_flag = _is_payday(local_today)
        logger.info(
            "[TIME_TRIGGER] biz=%s tz=%s local_today=%s weekend=%s payday=%s cfgWeekend=%s cfgPayday=%s",
            biz_id,
            tz_name,
            local_today,
            weekend_flag,
            payday_flag,
            trig_cfg.get("weekendSpecials"),
            trig_cfg.get("paydaySales"),
        )

        if trig_cfg.get("weekendSpecials") and weekend_flag:
            _safe_schedule(biz_id, "weekend", tz_name, local_today)
            scheduled += 1

        if trig_cfg.get("paydaySales") and payday_flag:
            _safe_schedule(biz_id, "payday", tz_name, local_today)
            scheduled += 1

    logger.info("[TIME_TRIGGER] === Completed. Total jobs scheduled today: %s ===", scheduled)
    return {"statusCode": 200, "body": json.dumps({"scheduled": scheduled})} 