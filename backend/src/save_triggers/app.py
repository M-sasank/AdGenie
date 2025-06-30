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
    Day 10: Save Marketing Triggers
    Saves user's marketing plan choices and trigger preferences
    """
    try:
        # Log the incoming event
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract trigger data from event
        user_id = event.get('user_id')
        marketing_triggers = event.get('marketing_triggers', {})
        
        if not user_id:
            raise ValueError("User ID is required")
        
        # Prepare trigger data for storage
        trigger_data = {
            'user_id': user_id,
            'weather_triggers': {
                'enabled': marketing_triggers.get('weather_triggers', {}).get('enabled', False),
                'conditions': marketing_triggers.get('weather_triggers', {}).get('conditions', []),
                'location': marketing_triggers.get('weather_triggers', {}).get('location')
            },
            'holiday_triggers': {
                'enabled': marketing_triggers.get('holiday_triggers', {}).get('enabled', False),
                'holidays': marketing_triggers.get('holiday_triggers', {}).get('holidays', []),
                'advance_days': marketing_triggers.get('holiday_triggers', {}).get('advance_days', 3)
            },
            'schedule_triggers': {
                'enabled': marketing_triggers.get('schedule_triggers', {}).get('enabled', False),
                'frequency': marketing_triggers.get('schedule_triggers', {}).get('frequency', 'weekly'),
                'days_of_week': marketing_triggers.get('schedule_triggers', {}).get('days_of_week', []),
                'time_of_day': marketing_triggers.get('schedule_triggers', {}).get('time_of_day', '09:00')
            },
            'content_preferences': {
                'tone': marketing_triggers.get('content_preferences', {}).get('tone', 'professional'),
                'style': marketing_triggers.get('content_preferences', {}).get('style', 'promotional'),
                'include_hashtags': marketing_triggers.get('content_preferences', {}).get('include_hashtags', True),
                'max_hashtags': marketing_triggers.get('content_preferences', {}).get('max_hashtags', 10)
            },
            'created_at': context.aws_request_id,
            'last_updated': context.aws_request_id
        }
        
        # TODO: Save to DynamoDB
        # In a real implementation, you would save this to a DynamoDB table
        # table = dynamodb.Table('MarketingTriggers')
        # response = table.put_item(Item=trigger_data)
        
        # Simulate successful save
        save_response = {
            "operation": "triggers_saved",
            "user_id": user_id,
            "status": "success",
            "triggers_count": len([t for t in [
                trigger_data['weather_triggers']['enabled'],
                trigger_data['holiday_triggers']['enabled'],
                trigger_data['schedule_triggers']['enabled']
            ] if t])
        }
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Marketing triggers saved successfully',
                'trigger_data': trigger_data,
                'save_response': save_response
            })
        }
        
    except Exception as e:
        logger.error(f"Error saving marketing triggers: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to save marketing triggers',
                'message': str(e)
            })
        } 