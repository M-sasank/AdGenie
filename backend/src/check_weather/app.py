import json
import boto3
import logging
import requests
from datetime import datetime

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')

def lambda_handler(event, context):
    """
    Day 12: Check Weather
    Hourly check for weather triggers and trigger marketing campaigns
    """
    try:
        # Log the incoming event
        logger.info(f"Received event: {json.dumps(event)}")
        
        current_time = datetime.now()
        
        # TODO: Query DynamoDB for users with weather triggers enabled
        # table = dynamodb.Table('MarketingTriggers')
        # response = table.scan(
        #     FilterExpression=Attr('weather_triggers.enabled').eq(True)
        # )
        
        # Simulate users with weather triggers
        users_with_triggers = [
            {
                "user_id": "user_123",
                "weather_triggers": {
                    "enabled": True,
                    "location": "New York, NY",
                    "conditions": ["rain", "snow", "sunny", "hot"]
                },
                "business_profile": {
                    "business_type": "coffee_shop"
                }
            },
            {
                "user_id": "user_456",
                "weather_triggers": {
                    "enabled": True,
                    "location": "Los Angeles, CA", 
                    "conditions": ["sunny", "hot"]
                },
                "business_profile": {
                    "business_type": "ice_cream_shop"
                }
            }
        ]
        
        triggered_campaigns = []
        
        # Check weather for each user's location
        for user in users_with_triggers:
            user_id = user['user_id']
            weather_config = user['weather_triggers']
            location = weather_config.get('location')
            
            if not location:
                continue
            
            # TODO: Integrate with weather API (e.g., OpenWeatherMap, WeatherAPI)
            # Sample weather data
            current_weather = {
                "location": location,
                "condition": "sunny",
                "temperature": 75,
                "humidity": 45,
                "description": "Clear sky"
            }
            
            # Check if current weather matches user's trigger conditions
            if current_weather['condition'] in weather_config['conditions']:
                # Generate campaign based on weather condition
                campaign_data = {
                    "user_id": user_id,
                    "trigger_type": "weather",
                    "weather_condition": current_weather['condition'],
                    "temperature": current_weather['temperature'],
                    "location": location,
                    "campaign_type": f"weather_{current_weather['condition']}",
                    "timestamp": str(current_time),
                    "weather_description": current_weather['description']
                }
                
                # Add business-specific context
                business_type = user.get('business_profile', {}).get('business_type')
                if business_type:
                    campaign_data['business_context'] = {
                        "type": business_type,
                        "weather_relevance": get_weather_relevance(business_type, current_weather['condition'])
                    }
                
                triggered_campaigns.append(campaign_data)
                
                # TODO: In real implementation, invoke ad generation function
                # lambda_client.invoke(
                #     FunctionName='AdGenerationFunction',
                #     InvocationType='Event',
                #     Payload=json.dumps(campaign_data)
                # )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Weather check completed successfully',
                'timestamp': str(current_time),
                'triggered_campaigns': triggered_campaigns,
                'campaigns_triggered_count': len(triggered_campaigns)
            })
        }
        
    except Exception as e:
        logger.error(f"Error checking weather: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Failed to check weather',
                'message': str(e)
            })
        }

def get_weather_relevance(business_type, weather_condition):
    """
    Helper function to determine how weather relates to business type
    """
    relevance_map = {
        "coffee_shop": {
            "rain": "Perfect weather for warm coffee",
            "snow": "Cozy up with hot drinks",
            "sunny": "Iced coffee weather",
            "hot": "Cool down with cold beverages"
        },
        "ice_cream_shop": {
            "sunny": "Perfect ice cream weather",
            "hot": "Beat the heat with ice cream",
            "rain": "Indoor treat time",
            "snow": "Comfort food for cold days"
        },
        "clothing_store": {
            "rain": "Stay dry with our rainwear",
            "snow": "Winter clothing collection",
            "sunny": "Light summer styles",
            "hot": "Cool, breathable fabrics"
        }
    }
    
    return relevance_map.get(business_type, {}).get(weather_condition, "Weather-appropriate promotion") 