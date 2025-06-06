import json
import boto3
import logging
import requests
from datetime import datetime, timedelta

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')

def lambda_handler(event, context):
    """
    Day 11: Check Holidays
    Daily check for holiday triggers and trigger marketing campaigns
    """
    try:
        # Log the incoming event
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Get current date and upcoming dates
        today = datetime.now().date()
        upcoming_dates = [today + timedelta(days=i) for i in range(1, 8)]  # Next 7 days
        
        # TODO: Integrate with a holidays API (e.g., Calendarific, Holiday API)
        # Sample holiday data
        upcoming_holidays = [
            {
                "date": "2024-12-25",
                "name": "Christmas Day",
                "type": "national"
            },
            {
                "date": "2024-01-01",
                "name": "New Year's Day",
                "type": "national"
            },
            {
                "date": "2024-02-14",
                "name": "Valentine's Day",
                "type": "observance"
            }
        ]
        
        # TODO: Query DynamoDB for users with holiday triggers enabled
        # table = dynamodb.Table('MarketingTriggers')
        # response = table.scan(
        #     FilterExpression=Attr('holiday_triggers.enabled').eq(True)
        # )
        
        # Simulate users with holiday triggers
        users_with_triggers = [
            {
                "user_id": "user_123",
                "holiday_triggers": {
                    "enabled": True,
                    "holidays": ["Christmas Day", "New Year's Day", "Valentine's Day"],
                    "advance_days": 3
                }
            },
            {
                "user_id": "user_456", 
                "holiday_triggers": {
                    "enabled": True,
                    "holidays": ["Christmas Day"],
                    "advance_days": 5
                }
            }
        ]
        
        triggered_campaigns = []
        
        # Check each user's holiday triggers
        for user in users_with_triggers:
            user_id = user['user_id']
            holiday_config = user['holiday_triggers']
            advance_days = holiday_config.get('advance_days', 3)
            
            for holiday in upcoming_holidays:
                holiday_date = datetime.strptime(holiday['date'], '%Y-%m-%d').date()
                days_until_holiday = (holiday_date - today).days
                
                # Check if we should trigger a campaign for this holiday
                if (holiday['name'] in holiday_config['holidays'] and 
                    0 <= days_until_holiday <= advance_days):
                    
                    # TODO: Trigger ad generation Lambda function
                    campaign_data = {
                        "user_id": user_id,
                        "trigger_type": "holiday",
                        "holiday_name": holiday['name'],
                        "holiday_date": holiday['date'],
                        "days_until": days_until_holiday,
                        "campaign_type": f"holiday_{holiday['name'].lower().replace(' ', '_')}"
                    }
                    
                    triggered_campaigns.append(campaign_data)
                    
                    # In real implementation, invoke ad generation function
                    # lambda_client.invoke(
                    #     FunctionName='AdGenerationFunction',
                    #     InvocationType='Event',
                    #     Payload=json.dumps(campaign_data)
                    # )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Holiday check completed successfully',
                'date_checked': str(today),
                'upcoming_holidays': upcoming_holidays,
                'triggered_campaigns': triggered_campaigns,
                'campaigns_triggered_count': len(triggered_campaigns)
            })
        }
        
    except Exception as e:
        logger.error(f"Error checking holidays: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to check holidays',
                'message': str(e)
            })
        } 