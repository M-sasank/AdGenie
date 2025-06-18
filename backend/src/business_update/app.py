import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Businesses')

def lambda_handler(event, context):
    """
    Update a business record with ownership validation.
    
    Args:
        event: Lambda event containing businessID in path parameters and update data in body
        context: Lambda runtime context
        
    Returns:
        dict: Response with updated business data or error message
    """
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
        updated_item = {
            'businessID': business_id,
            **data  # Merge all data from request body
        }
        
        table.put_item(Item=updated_item)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(updated_item)
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
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Invalid JSON in request body.'})
        }
    except Exception as e:
        print(f"Error updating business: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Could not update the business.'})
        } 