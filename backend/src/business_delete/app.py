import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Businesses')

def lambda_handler(event, context):
    try:
        # Get businessID from path parameters
        business_id = event['pathParameters']['businessID']
        
        # First check if the business exists
        response = table.get_item(
            Key={'businessID': business_id}
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Business not found.'})
            }
        
        # Delete the business
        table.delete_item(
            Key={'businessID': business_id}
        )
        
        return {
            'statusCode': 204,  # No Content
            'headers': {'Content-Type': 'application/json'},
            'body': ''
        }
        
    except KeyError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'businessID is required in path parameters.'})
        }
    except Exception as e:
        print(e)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Could not delete the business.'})
        } 