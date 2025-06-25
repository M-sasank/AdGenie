import boto3
import base64
import uuid
import json
import os
from decimal import Decimal

# Initialize clients
sqs_client = boto3.client('sqs')
AD_CONTENT_QUEUE_URL = os.environ.get('AD_CONTENT_QUEUE_URL')

def decimal_converter(obj):
    """Convert Decimal types to int or float for JSON serialization
    
    :param obj: Object to convert
    :type obj: Any
    :return: Converted object for JSON serialization
    :rtype: int, float, or raises TypeError
    """
    if isinstance(obj, Decimal):
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)
    raise TypeError

def lambda_handler(event, context):
    """Generate image and text using Amazon Bedrock models, upload to S3, and send to SQS queue
    
    :param event: Lambda event containing businessID and customPrompt in request body
    :type event: dict
    :param context: Lambda runtime context
    :type context: LambdaContext
    :return: HTTP response with S3 URL, caption, and queue status
    :rtype: dict
    """
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }

    # Handle OPTIONS request for CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': ''
        }

    try:
        # Parse request body to get businessID and customPrompt
        body = json.loads(event.get('body', '{}'))
        business_id = body.get('businessID')
        custom_prompt = body.get('customPrompt', '').strip()
        
        if not business_id or not custom_prompt:
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'businessID and customPrompt are required.'})
            }

        bedrock = boto3.client('bedrock-runtime')
        s3 = boto3.client('s3')
        BUCKET_NAME = os.environ.get('PUBLIC_BUCKET_NAME')

        # 1. Rewrite prompt for image generation using Claude
        rewrite_system_prompt = (
            "Rewrite the following offer or announcement as a visual scene description for an AI image generator. "
            "Do not include any text, numbers, or offers. Focus on the mood, setting, and occasion."
        )
        rewrite_model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
        rewrite_response = bedrock.invoke_model(
            modelId=rewrite_model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 128,
                "messages": [
                    {"role": "system", "content": rewrite_system_prompt},
                    {"role": "user", "content": custom_prompt}
                ]
            })
        )
        rewrite_body = json.loads(rewrite_response['body'].read().decode('utf-8'))
        image_prompt = rewrite_body['content'][0]['text']

        # 2. Generate caption using Claude
        caption_model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
        caption_response = bedrock.invoke_model(
            modelId=caption_model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 256,
                "messages": [
                    {"role": "user", "content": custom_prompt}
                ]
            })
        )
        caption_body = json.loads(caption_response['body'].read().decode('utf-8'))
        caption = caption_body['content'][0]['text']

        # 3. Generate image using Titan
        image_model_id = "amazon.titan-image-generator-v2:0"
        titan_body = json.dumps({
            "taskType": "TEXT_IMAGE",
            "textToImageParams": {
                "text": image_prompt
            },
            "imageGenerationConfig": {
                "numberOfImages": 1,
                "height": 1024,
                "width": 1024,
                "cfgScale": 8.0
            }
        })
        image_response = bedrock.invoke_model(
            modelId=image_model_id,
            contentType="application/json",
            accept="application/json",
            body=titan_body
        )
        image_data = image_response['body'].read()
        image_json = json.loads(image_data)
        image_base64 = image_json['images'][0]
        image_bytes = base64.b64decode(image_base64)
        image_key = f"generated-images/{uuid.uuid4()}.png"
        
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=image_key,
            Body=image_bytes,
            ContentType='image/png',
            # ACL='public-read'
        )
        
        s3_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{image_key}"

        # 4. Send message to SQS queue for Instagram posting
        print(f"Sending content to queue: {AD_CONTENT_QUEUE_URL}")
        
        message_body = {
            'caption': caption,
            'image_url': s3_url,
            'businessID': business_id
        }
        
        sqs_client.send_message(
            QueueUrl=AD_CONTENT_QUEUE_URL,
            MessageBody=json.dumps(message_body)
        )

        return {
            'statusCode': 200,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({
                "s3_public_url": s3_url,
                "caption_generated": caption,
                "message": "Content generated and queued for Instagram posting"
            }, default=decimal_converter)
        }

    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Invalid JSON in request body.'})
        }
    except Exception as e:
        print(f"Error in bedrock_generate: {e}")
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Failed to generate content: {str(e)}'})
        }
