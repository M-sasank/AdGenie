import json
import boto3
import requests
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Day 4: The Instagram Poster
    Posts generated content to Instagram using Instagram Basic Display API
    """
    try:
        # Log the incoming event
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract content and Instagram credentials from event
        content = event.get('content', {})
        instagram_token = event.get('instagram_access_token')
        
        if not instagram_token:
            raise ValueError("Instagram access token is required")
        
        # TODO: Implement Instagram API integration
        # This would use Instagram Basic Display API or Instagram Graph API
        
        # Sample Instagram post structure
        post_data = {
            "caption": content.get('ad_copy', 'Check out our latest!'),
            "hashtags": ' '.join(content.get('hashtags', [])),
            "image_url": content.get('image_url'),
            "status": "scheduled"  # or "posted"
        }
        
        # Simulate Instagram API call
        # In real implementation, this would make actual API calls to Instagram
        post_response = {
            "post_id": f"ig_post_{context.aws_request_id}",
            "status": "success",
            "posted_at": "2024-01-01T12:00:00Z",
            "engagement": {
                "likes": 0,
                "comments": 0
            }
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Content posted to Instagram successfully',
                'post_data': post_data,
                'instagram_response': post_response
            })
        }
        
    except Exception as e:
        logger.error(f"Error posting to Instagram: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to post to Instagram',
                'message': str(e)
            })
        } 