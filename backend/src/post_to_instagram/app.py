import json
import boto3
import requests
import time
import logging
from datetime import datetime
from urllib.parse import quote_plus

# Initialize clients
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Businesses')

# Instagram API constants
INSTAGRAM_API_BASE = "https://graph.instagram.com/v18.0"

# Logger setup
logger = logging.getLogger()
logger.setLevel(logging.INFO)
REQUEST_TIMEOUT = 25 # seconds

def get_business_instagram_token(business_id: str) -> tuple[str, str] | tuple[None, None]:
    """Retrieve Instagram access token and user ID for a business.
    
    :param business_id: The business ID to lookup
    :type business_id: str
    :return: Tuple of (access_token, instagram_user_id) or (None, None) if not found
    :rtype: tuple[str, str] | tuple[None, None]
    """
    try:
        response = table.get_item(Key={'businessID': business_id})
        
        if 'Item' not in response:
            logger.error(f"ERROR: Business {business_id} not found in database")
            return None, None
        
        business_data = response['Item']
        social_media = business_data.get('socialMedia', {})
        instagram = social_media.get('instagram', {})
        
        if not instagram.get('connected', False):
            logger.error(f"ERROR: Instagram not connected for business {business_id}")
            return None, None
        
        token_details = instagram.get('tokenDetails', {})
        access_token = token_details.get('longLivedToken')
        instagram_user_id = token_details.get('instagramUserId')
        
        if not access_token or not instagram_user_id:
            logger.error(f"ERROR: Missing Instagram credentials for business {business_id}")
            return None, None
        
        # Check token expiration
        expires_at = token_details.get('longLivedExpiresAt')
        if expires_at:
            expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if datetime.now(expiry_date.tzinfo) >= expiry_date:
                logger.error(f"ERROR: Instagram token expired for business {business_id}")
                return None, None
        
        logger.info(f"SUCCESS: Retrieved Instagram credentials for business {business_id}")
        return access_token, instagram_user_id
        
    except Exception as e:
        logger.exception(f"ERROR: Failed to retrieve Instagram token for business {business_id}: {str(e)}")
        return None, None

def create_instagram_media_container(image_url: str, caption: str, access_token: str, ig_user_id: str) -> str | None:
    """Create a media container on Instagram.
    
    :param image_url: URL of the image to post
    :type image_url: str
    :param caption: Caption for the post
    :type caption: str
    :param access_token: Instagram access token
    :type access_token: str
    :param ig_user_id: Instagram user ID
    :type ig_user_id: str
    :return: Container ID if successful, None otherwise
    :rtype: str | None
    """
    try:
        url = f"{INSTAGRAM_API_BASE}/{ig_user_id}/media"
        params = {
            'image_url': image_url,
            'caption': caption,
            'access_token': access_token
        }
        
        response = requests.post(url, params=params)
        logger.info("[POST_IG] create_container response %s - %s", response.status_code, response.text)
        
        if response.status_code == 200:
            result = response.json()
            container_id = result.get('id')
            logger.info("[POST_IG] Created media container %s", container_id)
            return container_id
        else:
            logger.error("[POST_IG] Failed to create media container: %s", response.text)
            return None
            
    except Exception as e:
        logger.exception("[POST_IG] Exception during media container creation: %s", e)
        return None

def poll_container_status(container_id: str, access_token: str, max_attempts: int = 10) -> str:
    """Poll the status of a media container until completion.
    
    :param container_id: The container ID to check
    :type container_id: str
    :param access_token: Instagram access token
    :type access_token: str
    :param max_attempts: Maximum number of polling attempts
    :type max_attempts: int
    :return: Final status of the container
    :rtype: str
    """
    try:
        url = f"{INSTAGRAM_API_BASE}/{container_id}"
        params = {
            'fields': 'status_code',
            'access_token': access_token
        }
        
        # Initial delay
        time.sleep(3)
        
        for attempt in range(max_attempts):
            response = requests.get(url, params=params)
            
            if response.status_code == 200:
                result = response.json()
                status = result.get('status_code', 'UNKNOWN')
                
                logger.info("[POST_IG] Container %s status %s", container_id, status)
                
                if status == 'FINISHED':
                    logger.info("[POST_IG] Container %s ready", container_id)
                    return status
                elif status == 'IN_PROGRESS':
                    # Exponential backoff
                    delay = 3 * (2 ** attempt)
                    logger.info("[POST_IG] Container %s processing, wait %s s", container_id, delay)
                    time.sleep(delay)
                else:
                    logger.error("[POST_IG] Container %s unexpected status %s", container_id, status)
                    return status
            else:
                logger.error("[POST_IG] Failed to check status: %s", response.text)
                return 'ERROR'
        
        logger.error("[POST_IG] Container %s polling timed out", container_id)
        return 'TIMEOUT'
        
    except Exception as e:
        logger.exception("[POST_IG] Exception during polling: %s", e)
        return 'ERROR'

def publish_instagram_media(container_id: str, access_token: str, ig_user_id: str) -> str | None:
    """Publish a media container to Instagram.
    
    :param container_id: The container ID to publish
    :type container_id: str
    :param access_token: Instagram access token
    :type access_token: str
    :param ig_user_id: Instagram user ID
    :type ig_user_id: str
    :return: Published media ID if successful, None otherwise
    :rtype: str | None
    """
    try:
        url = f"{INSTAGRAM_API_BASE}/{ig_user_id}/media_publish"
        params = {
            'creation_id': container_id,
            'access_token': access_token
        }
        
        response = requests.post(url, params=params)
        logger.info("[POST_IG] publish response %s - %s", response.status_code, response.text)
        
        if response.status_code == 200:
            result = response.json()
            media_id = result.get('id')
            logger.info("[POST_IG] Published media %s", media_id)
            return media_id
        else:
            logger.error("[POST_IG] Failed to publish media: %s", response.text)
            return None
            
    except Exception as e:
        logger.exception("[POST_IG] Exception during publish: %s", e)
        return None

def get_instagram_permalink(media_id: str, access_token: str) -> str | None:
    """Get the Instagram permalink for a published media.
    
    :param media_id: The published media ID
    :type media_id: str
    :param access_token: Instagram access token
    :type access_token: str
    :return: Instagram permalink URL if successful, None otherwise
    :rtype: str | None
    """
    try:
        url = f"{INSTAGRAM_API_BASE}/{media_id}"
        params = {
            'fields': 'permalink',
            'access_token': access_token
        }
        
        response = requests.get(url, params=params)
        logger.info("[POST_IG] permalink response %s - %s", response.status_code, response.text)
        
        if response.status_code == 200:
            result = response.json()
            permalink = result.get('permalink')
            logger.info("[POST_IG] Retrieved permalink %s", permalink)
            return permalink
        else:
            logger.error("[POST_IG] Failed to retrieve permalink: %s", response.text)
            return None
            
    except Exception as e:
        logger.exception("[POST_IG] Exception during permalink retrieval: %s", e)
        return None

def post_to_instagram(image_url: str, caption: str, business_id: str, trigger_category: str | None = None) -> bool:
    """
    Complete workflow to post content to Instagram.
    
    :param image_url: URL of the image to post
    :type image_url: str
    :param caption: Caption for the post
    :type caption: str
    :param business_id: Business ID for token lookup
    :type business_id: str
    :return: True if successful, False otherwise
    :rtype: bool
    """
    logger.info("[POST_IG] Start post workflow for business %s", business_id)
    
    # Get Instagram credentials
    access_token, ig_user_id = get_business_instagram_token(business_id)
    if not access_token or not ig_user_id:
        return False
    
    # Create media container
    container_id = create_instagram_media_container(image_url, caption, access_token, ig_user_id)
    if not container_id:
        return False
    
    # Poll until container is ready
    status = poll_container_status(container_id, access_token)
    if status != 'FINISHED':
        logger.error(f"ERROR: Container not ready for publishing, final status: {status}")
        return False
    
    # Publish the media
    media_id = publish_instagram_media(container_id, access_token, ig_user_id)
    if not media_id:
        return False

    # Get Instagram permalink
    permalink = get_instagram_permalink(media_id, access_token)

    # --------------------------------------------------------------------
    # Record successful publication in Businesses.publishedPosts
    # --------------------------------------------------------------------
    try:
        current_ts = datetime.utcnow().isoformat() + "Z"
        post_record = {
            "postID": media_id,
            "s3Url": image_url,
            "caption": caption,
            "timestamp": current_ts,
            "status": "published",
        }
        
        if permalink:
            post_record["permalink"] = permalink
        
        if trigger_category:
            post_record["triggerCategory"] = trigger_category
        
        table.update_item(
            Key={"businessID": business_id},
            UpdateExpression=(
                "SET publishedPosts = list_append(if_not_exists(publishedPosts, :empty), :post)"
            ),
            ExpressionAttributeValues={
                ":empty": [],
                ":post": [post_record],
            },
        )
        logger.info(
            f"INFO: publishedPosts updated for business {business_id} with postID {media_id}"
        )
    except Exception as update_exc:
        logger.exception(
            f"ERROR: Failed to update publishedPosts for {business_id}: {update_exc}"
        )

    logger.info("[POST_IG] Post completed for business %s mediaID %s", business_id, media_id)
    return True

def lambda_handler(event, context):
    """
    AWS Lambda handler for processing SQS messages and posting to Instagram.
    
    :param event: SQS event containing message records
    :type event: dict
    :param context: Lambda runtime context
    :type context: LambdaContext
    :return: HTTP response with processing status
    :rtype: dict
    """
    processed = 0
    successful = 0
    failed = 0
    errors = []
    
    for record in event['Records']:
        processed += 1
        
        try:
            message_body = json.loads(record['body'])
            logger.info("[POST_IG] Processing message %s", json.dumps(message_body))
            
            caption = message_body.get('caption')
            image_url = message_body.get('image_url')
            business_id = message_body.get('businessID')
            schedule_name = message_body.get('scheduleName')
            trigger_category = message_body.get('triggerCategory')
        
            if not caption or not image_url or not business_id:
                error_msg = "Message is missing required fields (caption, image_url, businessID)"
                logger.error(f"ERROR: {error_msg}")
                errors.append(error_msg)
                failed += 1
                continue
            
            # Attempt to post to Instagram
            success = post_to_instagram(image_url, caption, business_id, trigger_category)
            
            if success:
                successful += 1
                logger.info(f"SUCCESS: Posted to Instagram for business {business_id}")

                # Cleanup upcomingPosts entry if schedule_name provided
                if schedule_name:
                    try:
                        item = table.get_item(Key={"businessID": business_id}, ProjectionExpression="upcomingPosts")
                        posts = item.get("Item", {}).get("upcomingPosts", [])
                        idx_to_remove = next(
                            (i for i, p in enumerate(posts) if p.get("scheduleName") == schedule_name),
                            None,
                        )
                        if idx_to_remove is not None:
                            table.update_item(
                                Key={"businessID": business_id},
                                UpdateExpression=f"REMOVE upcomingPosts[{idx_to_remove}]",
                            )
                            logger.info(
                                f"INFO: Removed upcomingPosts[{idx_to_remove}] for business {business_id}"
                            )
                    except Exception as cleanup_exc:
                        logger.error(
                            f"ERROR: Failed to cleanup upcomingPosts for {business_id}: {cleanup_exc}"
                        )
            else:
                failed += 1
                error_msg = f"Failed to post to Instagram for business {business_id}"
                errors.append(error_msg)
                
        except Exception as e:
            failed += 1
            error_msg = f"Exception processing message: {str(e)}"
            logger.exception(f"ERROR: {error_msg}")
            errors.append(error_msg)

    # Return processing summary
    result = {
        'processed': processed,
        'successful': successful,
        'failed': failed,
        'errors': errors
    }
    
    logger.info("[POST_IG] Processing complete %s", json.dumps(result))
    
    return {
        'statusCode': 200,
        'body': json.dumps(result)
    } 