import json
import uuid
import boto3
import logging
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Businesses')

# Logger setup
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Create a new business record in DynamoDB with social media schema validation.
    
    Expected Schema:
    {
        "userId": "string (required)",
        "businessName": "string (required)", 
        "location": "string (optional)",
        "businessType": "string (optional)",
        "brandVoice": "string (optional)",
        "peakTime": "string (optional)",
        "products": "string (optional)",
        "triggers": "object (optional)",
        "socialMedia": {
            "instagram": {
                "connected": "boolean (required)",
                "tokenID": "string (optional)",
                "lastConnected": "ISO timestamp (optional)",
                "username": "string (optional)"
            }
        }
    }
    
    Args:
        event: Lambda event containing the business data in the request body
        context: Lambda runtime context
        
    Returns:
        dict: Response with businessID on success or error message on failure
    """
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }

    try:
        data = json.loads(event['body'])
        
        # Validate required fields
        if not data.get('userId'):
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'userId is required.'})
            }
        
        if not data.get('businessName'):
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'businessName is required.'})
            }
        
        # Determine if weather triggers are enabled
        weather_triggers = data.get('triggers', {}).get('weather', {}) if isinstance(data.get('triggers'), dict) else {}
        weather_flag = 'Y' if any(weather_triggers.values()) else 'N'
        logger.info("[BUSINESS_CREATE] Weather flag set to %s", weather_flag)
        
        # Generate a unique businessID
        business_id = f"BUS-{uuid.uuid4()}"
        
        # Convert numeric coordinates to Decimal if present
        if isinstance(data.get('latitude'), float):
            data['latitude'] = Decimal(str(data['latitude']))
        if isinstance(data.get('longitude'), float):
            data['longitude'] = Decimal(str(data['longitude']))
        
        item = {
            'businessID': business_id,
            **data,  # Store all fields from the request body
            'weatherTriggerEnabledFlag': weather_flag
        }
        
        table.put_item(Item=item)
        logger.info("[BUSINESS_CREATE] Created business %s", business_id)
        
        return {
            'statusCode': 201, # Created
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'businessID': business_id})
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Invalid JSON in request body.'})
        }
    except Exception as e:
        print(f"Error creating business: {e}")
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Could not create the business.'})
        } 