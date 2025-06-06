import json
import boto3
import logging
from botocore.exceptions import ClientError

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    """
    Day 8-9: User Onboarding
    Saves business profile and Instagram connection details
    """
    try:
        # Log the incoming event
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract user data from event
        user_id = event.get('user_id')
        business_profile = event.get('business_profile', {})
        instagram_connection = event.get('instagram_connection', {})
        
        if not user_id:
            raise ValueError("User ID is required")
        
        # Prepare user data for storage
        user_data = {
            'user_id': user_id,
            'business_profile': {
                'business_name': business_profile.get('business_name'),
                'industry': business_profile.get('industry'),
                'description': business_profile.get('description'),
                'target_audience': business_profile.get('target_audience'),
                'business_hours': business_profile.get('business_hours'),
                'location': business_profile.get('location')
            },
            'instagram_connection': {
                'username': instagram_connection.get('username'),
                'access_token': instagram_connection.get('access_token'),
                'user_id': instagram_connection.get('user_id'),
                'connected_at': instagram_connection.get('connected_at'),
                'permissions': instagram_connection.get('permissions', [])
            },
            'onboarding_status': 'completed',
            'created_at': context.aws_request_id,
            'last_updated': context.aws_request_id
        }
        
        # TODO: Save to DynamoDB
        # In a real implementation, you would save this to a DynamoDB table
        # table = dynamodb.Table('UserProfiles')
        # response = table.put_item(Item=user_data)
        
        # Simulate successful save
        save_response = {
            "operation": "user_profile_saved",
            "user_id": user_id,
            "status": "success"
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'User onboarding completed successfully',
                'user_data': user_data,
                'save_response': save_response
            })
        }
        
    except Exception as e:
        logger.error(f"Error during user onboarding: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to complete user onboarding',
                'message': str(e)
            })
        } 