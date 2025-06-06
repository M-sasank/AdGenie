import json
import boto3
import os

bedrock_runtime = boto3.client(service_name='bedrock-runtime')
sqs_client = boto3.client('sqs')

AD_CONTENT_QUEUE_URL = os.environ.get('AD_CONTENT_QUEUE_URL')

def generate_caption(business_details, trigger_type):
    """Generate a marketing caption for the business.
    
    :param business_details: Dictionary containing business information
    :type business_details: dict
    :param trigger_type: Type of trigger that initiated the ad generation
    :type trigger_type: str
    :return: Generated caption text
    :rtype: str
    """
    print(f"Generating caption for {business_details['businessName']} based on trigger: {trigger_type}")
    return f"A test caption for {business_details['businessName']} on {trigger_type}."

def generate_image(prompt):
    """Generate an image URL based on the provided prompt.
    
    :param prompt: Text prompt for image generation
    :type prompt: str
    :return: URL of the generated image
    :rtype: str
    """
    print(f"Generating image with prompt: {prompt}")
    return "https://plus.unsplash.com/premium_photo-1668184521768-776b8a87ee4f?q=80&w=1548&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"

def lambda_handler(event, context):
    """AWS Lambda handler for ad generation requests.
    
    :param event: Lambda event containing request data
    :type event: dict
    :param context: Lambda runtime context
    :type context: LambdaContext
    :return: HTTP response with status and message
    :rtype: dict
    """
    print(f"Received event: {json.dumps(event)}")
    
    try:
        body = json.loads(event.get('body', '{}'))
        business_id = body.get('businessID')
        trigger_type = body.get('triggerType')

        if not business_id or not trigger_type:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'businessID and triggerType are required.'})
            }

        business_details = {
            'businessName': 'Test Cafe',
            'brandVoice': 'Friendly and energetic'
        }

        caption = generate_caption(business_details, trigger_type)
        image_url = generate_image(prompt=caption)
        
        print(f"Sending ad content to queue: {AD_CONTENT_QUEUE_URL}")
        
        message_body = {
            'caption': caption,
            'image_url': image_url,
            'businessID': business_id
        }
        
        sqs_client.send_message(
            QueueUrl=AD_CONTENT_QUEUE_URL,
            MessageBody=json.dumps(message_body)
        )
        
        return {
            'statusCode': 202,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'message': 'Ad generation request accepted and is being processed.'})
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Failed the process.'})
        } 