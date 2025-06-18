import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Businesses')

def lambda_handler(event, context):
    """
    List all businesses for a specific user.
    
    Args:
        event: Lambda event containing userId in query parameters
        context: Lambda runtime context
        
    Returns:
        dict: Response with user's businesses or error message
    """
    try:
        # Extract userId from query parameters
        query_params = event.get('queryStringParameters') or {}
        user_id = query_params.get('userId')
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'userId is required in query parameters.'})
            }
        
        # Scan the table with filter for user's businesses
        response = table.scan(
            FilterExpression='userId = :uid',
            ExpressionAttributeValues={
                ':uid': user_id
            }
        )
        
        businesses = response.get('Items', [])
        
        # Handle pagination if needed
        while 'LastEvaluatedKey' in response:
            response = table.scan(
                FilterExpression='userId = :uid',
                ExpressionAttributeValues={
                    ':uid': user_id
                },
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            businesses.extend(response.get('Items', []))
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'businesses': businesses,
                'count': len(businesses)
            })
        }
        
    except Exception as e:
        print(f"Error retrieving businesses: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Could not retrieve businesses.'})
        } 