import json

def lambda_handler(event, context):
    """AWS Lambda handler for processing SQS messages and posting to Instagram.
    
    :param event: SQS event containing message records
    :type event: dict
    :param context: Lambda runtime context
    :type context: LambdaContext
    :return: HTTP response with processing status
    :rtype: dict
    """
    for record in event['Records']:
        message_body = json.loads(record['body'])
        
        print(f"Processing message: {json.dumps(message_body)}")
        
        caption = message_body.get('caption')
        image_url = message_body.get('image_url')
        business_id = message_body.get('businessID')
    
        if not caption or not image_url or not business_id:
            print("ERROR: Message is missing required fields.")
            continue
            
        print(f"SUCCESS: Would post to Instagram for business {business_id} with caption: '{caption}'")

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Processing complete.'})
    } 