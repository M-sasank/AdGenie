import json
import boto3
import requests
import time
from datetime import datetime
from urllib.parse import quote_plus

# Initialize clients
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Businesses')

# Instagram API constants
INSTAGRAM_API_BASE = "https://graph.instagram.com/v18.0"

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
            print(f"ERROR: Business {business_id} not found in database")
            return None, None
        
        business_data = response['Item']
        social_media = business_data.get('socialMedia', {})
        instagram = social_media.get('instagram', {})
        
        if not instagram.get('connected', False):
            print(f"ERROR: Instagram not connected for business {business_id}")
            return None, None
        
        token_details = instagram.get('tokenDetails', {})
        access_token = token_details.get('longLivedToken')
        instagram_user_id = token_details.get('instagramUserId')
        
        if not access_token or not instagram_user_id:
            print(f"ERROR: Missing Instagram credentials for business {business_id}")
            return None, None
        
        # Check token expiration
        expires_at = token_details.get('longLivedExpiresAt')
        if expires_at:
            expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if datetime.now(expiry_date.tzinfo) >= expiry_date:
                print(f"ERROR: Instagram token expired for business {business_id}")
                return None, None
        
        print(f"SUCCESS: Retrieved Instagram credentials for business {business_id}")
        return access_token, instagram_user_id
        
    except Exception as e:
        print(f"ERROR: Failed to retrieve Instagram token for business {business_id}: {str(e)}")
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
        print(f"Media container creation response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            container_id = result.get('id')
            print(f"SUCCESS: Created media container {container_id}")
            return container_id
        else:
            print(f"ERROR: Failed to create media container: {response.text}")
            return None
            
    except Exception as e:
        print(f"ERROR: Exception during media container creation: {str(e)}")
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
                
                print(f"Container {container_id} status check {attempt + 1}: {status}")
                
                if status == 'FINISHED':
                    print(f"SUCCESS: Container {container_id} is ready for publishing")
                    return status
                elif status == 'IN_PROGRESS':
                    # Exponential backoff
                    delay = 3 * (2 ** attempt)
                    print(f"Container {container_id} still processing, waiting {delay}s...")
                    time.sleep(delay)
                else:
                    print(f"ERROR: Container {container_id} has unexpected status: {status}")
                    return status
            else:
                print(f"ERROR: Failed to check container status: {response.text}")
                return 'ERROR'
        
        print(f"ERROR: Container {container_id} polling timed out after {max_attempts} attempts")
        return 'TIMEOUT'
        
    except Exception as e:
        print(f"ERROR: Exception during status polling: {str(e)}")
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
        print(f"Media publish response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            media_id = result.get('id')
            print(f"SUCCESS: Published media with ID {media_id}")
            return media_id
        else:
            print(f"ERROR: Failed to publish media: {response.text}")
            return None
            
    except Exception as e:
        print(f"ERROR: Exception during media publishing: {str(e)}")
        return None

def post_to_instagram(image_url: str, caption: str, business_id: str) -> bool:
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
    print(f"Starting Instagram post for business {business_id}")
    
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
        print(f"ERROR: Container not ready for publishing, final status: {status}")
        return False
    
    # Publish the media
    media_id = publish_instagram_media(container_id, access_token, ig_user_id)
    if not media_id:
        return False
    
    print(f"SUCCESS: Instagram post completed for business {business_id}, media ID: {media_id}")
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
            print(f"Processing message: {json.dumps(message_body)}")
            
            caption = message_body.get('caption')
            image_url = message_body.get('image_url')
            business_id = message_body.get('businessID')
        
            if not caption or not image_url or not business_id:
                error_msg = "Message is missing required fields (caption, image_url, businessID)"
                print(f"ERROR: {error_msg}")
                errors.append(error_msg)
                failed += 1
                continue
            
            # Attempt to post to Instagram
            success = post_to_instagram(image_url, caption, business_id)
            
            if success:
                successful += 1
                print(f"SUCCESS: Posted to Instagram for business {business_id}")
            else:
                failed += 1
                error_msg = f"Failed to post to Instagram for business {business_id}"
                errors.append(error_msg)
                
        except Exception as e:
            failed += 1
            error_msg = f"Exception processing message: {str(e)}"
            print(f"ERROR: {error_msg}")
            errors.append(error_msg)

    # Return processing summary
    result = {
        'processed': processed,
        'successful': successful,
        'failed': failed,
        'errors': errors
    }
    
    print(f"Processing complete: {json.dumps(result)}")
    
    return {
        'statusCode': 200,
        'body': json.dumps(result)
    } 