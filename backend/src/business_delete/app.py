import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Businesses')

def lambda_handler(event, context):
    """
    Delete a business record with ownership validation.
    
    Args:
        event: Lambda event containing businessID in path parameters and userId in query parameters
        context: Lambda runtime context
        
    Returns:
        dict: Response confirming deletion or error message
    """
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
    }

    # Handle preflight OPTIONS request
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 204,
            'headers': cors_headers,
            'body': ''
        }
        
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
                'body': json.dumps({'error': 'Access denied. You can only delete your own businesses.'})
            }
        
        # Delete the business
        table.delete_item(
            Key={'businessID': business_id}
        )
        
        return {
            'statusCode': 200,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'message': 'Business deleted successfully.'})
        }
        
    except KeyError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'businessID is required in path parameters.'})
        }
    except Exception as e:
        print(f"Error deleting business: {e}")
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Could not delete the business.'})
        } 