"""Instagram Analytics Reader Lambda.

This function runs every 12 hours (EventBridge schedule) and enriches each
`publishedPosts` entry in the *Businesses* DynamoDB table with fresh metrics
retrieved from the Instagram Graph API.

It writes an `analytics` sub-object of the following shape into each post:

```
analytics: {
    fetchedAt: "2024-05-10T14:35:21Z",
    likeCount: 123,
    commentCount: 4,
    shareCount: null,          # field unavailable – kept for schema consistency
    impressions: 560,
    reach: 410,
    engagement: 134
}
```

If the analytics data exists and is less than 12 hours old, the post is skipped
for efficiency.
"""

from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

import boto3
import requests
from botocore.exceptions import ClientError

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

IG_API_VERSION: str = os.getenv("INSTAGRAM_API_VERSION", "v18.0")
IG_BASE_URL: str = f"https://graph.instagram.com/{IG_API_VERSION}"

# Insights must be called on facebook domain, not instagram.
FB_BASE_URL: str = os.getenv(
    "FACEBOOK_GRAPH_BASE", f"https://graph.facebook.com/{IG_API_VERSION}"
)

BUSINESSES_TABLE_NAME: str = os.getenv("BUSINESSES_TABLE", "Businesses")
DDB = boto3.resource("dynamodb")
BUSINESSES_TABLE = DDB.Table(BUSINESSES_TABLE_NAME)

REQUEST_TIMEOUT = 8  # seconds
ANALYTICS_TTL = timedelta(hours=12)

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _token_is_expired(expires_at_iso: str | None) -> bool:
    """Return ``True`` if *expires_at_iso* is missing or already past."""
    if not expires_at_iso:
        return True
    try:
        expiry_dt = datetime.fromisoformat(expires_at_iso.replace("Z", "+00:00"))
        return datetime.now(timezone.utc) >= expiry_dt
    except ValueError:
        return True


def _iso_now() -> str:  # noqa: D401  (simple helper)
    """Return current UTC time as an ISO-8601 string with *Z* suffix."""
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


class AnalyticsUpdater:  # pylint: disable=too-few-public-methods
    """Encapsulates the end-to-end refresh workflow."""

    def __init__(self) -> None:
        self.businesses_processed = 0
        self.posts_updated = 0
        self.errors: List[str] = []

    # ----------------------------- Public API -----------------------------

    def run(self) -> Dict[str, Any]:
        """Execute the refresh pass over all businesses."""

        LOGGER.info("[IG_ANALYTICS] Starting scan of Businesses table %s", BUSINESSES_TABLE_NAME)

        scan_kwargs = {
            "ProjectionExpression": "businessID, publishedPosts, socialMedia",
        }
        start_key: Dict[str, Any] | None = None

        while True:
            if start_key:
                scan_kwargs["ExclusiveStartKey"] = start_key  # type: ignore[assignment]
            response = BUSINESSES_TABLE.scan(**scan_kwargs)
            items: List[Dict[str, Any]] = response.get("Items", [])
            for item in items:
                self._process_business(item)
            start_key = response.get("LastEvaluatedKey")
            if not start_key:
                break

        summary = {
            "businessesProcessed": self.businesses_processed,
            "postsUpdated": self.posts_updated,
            "errors": len(self.errors),
        }
        LOGGER.info("[IG_ANALYTICS] Completed run – %s", json.dumps(summary))
        return summary

    # --------------------------- Internal helpers -------------------------

    def _process_business(self, biz: Dict[str, Any]):
        business_id: str = biz["businessID"]
        insta_info = (
            biz.get("socialMedia", {})
            .get("instagram", {})
        )

        if not insta_info.get("connected"):
            return  # skip

        token_details = insta_info.get("tokenDetails", {})
        access_token: str | None = token_details.get("longLivedToken")
        expires_at: str | None = token_details.get("longLivedExpiresAt")

        if not access_token or _token_is_expired(expires_at):
            LOGGER.warning("[IG_ANALYTICS] Token missing/expired for business %s", business_id)
            return

        posts: List[Dict[str, Any]] = biz.get("publishedPosts", [])
        if not posts:
            return

        updated = False
        for idx, post in enumerate(posts):
            if self._needs_refresh(post):
                try:
                    analytics = self._fetch_post_metrics(post["postID"], access_token)
                except Exception as fetch_exc:  # noqa: BLE001
                    msg = f"{business_id}:{post['postID']} {fetch_exc}"
                    self.errors.append(msg)
                    LOGGER.warning("[IG_ANALYTICS] %s", msg)
                    continue
                if analytics:
                    posts[idx]["analytics"] = analytics
                    # compute engagement across posts (including new analytics)
                    total_engagement = sum(
                        (p.get("analytics", {}).get("likeCount", 0)
                         + p.get("analytics", {}).get("commentCount", 0)
                         + p.get("analytics", {}).get("saveCount", 0))
                        for p in posts
                    )

                    # Write only this index
                    try:
                        BUSINESSES_TABLE.update_item(
                            Key={"businessID": business_id},
                            UpdateExpression=(
                                f"SET publishedPosts[{idx}].analytics = :a, totalEngagement = :e"
                            ),
                            ExpressionAttributeValues={":a": analytics, ":e": total_engagement},
                        )
                        updated = True
                        self.posts_updated += 1
                    except ClientError as ddb_exc:
                        msg = f"DDB update failed {business_id}:{idx} {ddb_exc}"
                        self.errors.append(msg)
                        LOGGER.error("[IG_ANALYTICS] %s", msg)

        if updated:
            self.businesses_processed += 1

    @staticmethod
    def _needs_refresh(post: Dict[str, Any]) -> bool:
        """Determine if the `analytics` key is absent or stale."""
        analytics = post.get("analytics")
        if not analytics:
            return True
        try:
            fetched_at = datetime.fromisoformat(analytics["fetchedAt"].replace("Z", "+00:00"))
            return datetime.now(timezone.utc) - fetched_at > ANALYTICS_TTL
        except Exception:  # noqa: BLE001
            return True

    # ------------------------- HTTP helper -------------------------

    @staticmethod
    def _request_with_retry(url: str, params: Dict[str, Any]):
        """GET request with one retry on non-200 or exception."""
        for attempt in (0, 1):
            try:
                resp = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
                if resp.status_code == 200:
                    return resp
                if attempt == 0:
                    time.sleep(1)
            except Exception:  # noqa: BLE001
                if attempt == 0:
                    time.sleep(1)
        raise RuntimeError(f"request failed url={url} params={params}")

    # -------------------- Instagram API interaction --------------------

    def _fetch_post_metrics(self, media_id: str, token: str) -> Dict[str, Any]:
        """Return a metrics dict or *None* on failure."""
        basic_url = f"{IG_BASE_URL}/{media_id}"

        # 1. Basic request with media_type
        basic_resp = self._request_with_retry(
            basic_url,
            params={"access_token": token, "fields": "media_type,like_count,comments_count"},
        )
        basic_data = basic_resp.json()

        media_type = basic_data.get("media_type", "IMAGE")

        # 2. Determine metric list permitted by media_type
        if media_type in {"REEL", "VIDEO"}:
            metrics = "plays,saved"
        else:
            metrics = "saved"

        insights_url = f"{FB_BASE_URL}/{media_id}/insights"
        insights_resp = self._request_with_retry(
            insights_url,
            params={"access_token": token, "metric": metrics},
        )

        insight_items = insights_resp.json().get("data", [])
        insight_map = {d["name"]: d["values"][0]["value"] for d in insight_items}

        # Build analytics object
        like_count = basic_data.get("like_count", 0)
        comment_count = basic_data.get("comments_count", 0)
        save_count = insight_map.get("saved", 0)
        plays = insight_map.get("plays", 0)

        engagement = like_count + comment_count + save_count
        if plays:
            engagement += plays

        analytics = {
            "fetchedAt": _iso_now(),
            "likeCount": like_count,
            "commentCount": comment_count,
            "saveCount": save_count,
            "plays": plays,
            "reach": insight_map.get("reach", 0),
            "engagement": engagement,
        }

        return analytics


# ---------------------------------------------------------------------------
# Lambda entry-point
# ---------------------------------------------------------------------------

def lambda_handler(event: Dict[str, Any], context):  # noqa: D401
    """AWS Lambda handler wrapper."""

    updater = AnalyticsUpdater()
    summary = updater.run()
    return {"statusCode": 200, "body": json.dumps(summary)}
