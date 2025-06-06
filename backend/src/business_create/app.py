import json
import uuid
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Businesses')

def lambda_handler(event, context):
    try:
        data = json.loads(event['body'])
        
        # Generate a unique businessID
        business_id = f"BUS-{uuid.uuid4()}"
        
        item = {
            'businessID': business_id,
            'businessName': data.get('businessName'),
            'brandVoice': data.get('brandVoice'),
            # Add any other attributes from the request body
        }
        
        table.put_item(Item=item)
        
        return {
            'statusCode': 201, # Created
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'businessID': business_id})
        }
        
    except Exception as e:
        print(e)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Could not create the business.'})
        } 