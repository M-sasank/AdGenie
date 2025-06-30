import json
import boto3
from botocore.exceptions import ClientError
from decimal import Decimal
import logging

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Businesses')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def decimal_converter(obj):
    """Convert Decimal types to int or float for JSON serialization"""
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    raise TypeError

def lambda_handler(event, context):
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'PUT,OPTIONS'
    }

    # Handle preflight OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': ''
        }
        
    try:
        # Get businessID from path parameters
        business_id = event['pathParameters']['businessID']
        
        # Parse the request body
        data = json.loads(event['body'])
        
        # Validate userId is provided
        user_id = data.get('userId')
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'userId is required in request body.'})
            }
        
        # First, get the existing business to validate ownership
        response = table.get_item(
            Key={'businessID': business_id}
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Business not found.'})
            }
        
        existing_business = response['Item']
        
        # Validate ownership
        if existing_business.get('userId') != user_id:
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Access denied. You can only update your own businesses.'})
            }
        
        # Update the business with new data
        merged_item = {**existing_business, **data}
        weather_triggers = merged_item.get('triggers', {}).get('weather', {}) if isinstance(merged_item.get('triggers'), dict) else {}
        merged_item['weatherTriggerEnabledFlag'] = 'Y' if any(weather_triggers.values()) else 'N'
        logger.info("[BUSINESS_UPDATE] Weather flag set to %s for %s", merged_item['weatherTriggerEnabledFlag'], business_id)
        
        # Ensure coordinates are Decimal for DynamoDB
        if isinstance(merged_item.get('latitude'), float):
            merged_item['latitude'] = Decimal(str(merged_item['latitude']))
        if isinstance(merged_item.get('longitude'), float):
            merged_item['longitude'] = Decimal(str(merged_item['longitude']))
        
        table.put_item(Item=merged_item)
        logger.info("[BUSINESS_UPDATE] Updated business %s", business_id)
        
        return {
            'statusCode': 200,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps(merged_item, default=decimal_converter)
        }
        
    except KeyError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'businessID is required in path parameters.'})
        }
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Invalid JSON in request body.'})
        }
    except Exception as e:
        print(f"Error updating business: {e}")
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Could not update the business.'})
        } 