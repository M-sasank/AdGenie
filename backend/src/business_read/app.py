import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Businesses')

def lambda_handler(event, context):
    """
    Retrieve a specific business by ID with ownership validation.
    
    Args:
        event: Lambda event containing businessID in path parameters and userId in query parameters
        context: Lambda runtime context
        
    Returns:
        dict: Response with business data or error message
    """
    try:
        # Get businessID from path parameters
        business_id = event['pathParameters']['businessID']
        
        # Get userId from query parameters for ownership validation
        query_params = event.get('queryStringParameters') or {}
        user_id = query_params.get('userId')
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'userId is required in query parameters.'})
            }
        
        response = table.get_item(
            Key={'businessID': business_id}
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Business not found.'})
            }
        
        business = response['Item']
        
        # Validate ownership
        if business.get('userId') != user_id:
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Access denied. You can only view your own businesses.'})
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(business)
        }
        
    except KeyError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'businessID is required in path parameters.'})
        }
    except Exception as e:
        print(f"Error retrieving business: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Could not retrieve the business.'})
        } 