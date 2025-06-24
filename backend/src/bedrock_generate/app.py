import boto3
import base64
import uuid
import json
import os
from decimal import Decimal
from typing import Dict
import logging

# Initialize clients
sqs_client = boto3.client('sqs')
AD_CONTENT_QUEUE_URL = os.environ.get('AD_CONTENT_QUEUE_URL')

# Logger setup
logger = logging.getLogger()
logger.setLevel(logging.INFO)

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

def _generate_and_enqueue(caption: str, business_id: str) -> Dict:
    """Generate an image with Bedrock Titan, upload to S3, and enqueue for Instagram posting.

    Parameters
    ----------
    caption : str
        Pre-composed caption text to accompany the generated image.
    business_id : str
        Identifier of the business for which the content is generated.

    Returns
    -------
    dict
        Lambda-style HTTP response (statusCode/body).
    """
    try:
        bedrock = boto3.client('bedrock-runtime')
        s3 = boto3.client('s3')
        BUCKET_NAME = os.environ.get('PUBLIC_BUCKET_NAME')

        # Use a generic prompt for image generation; could be refined per trigger.
        image_prompt = "Marketing social media post background image."
        image_model_id = "amazon.titan-image-generator-v1"

        titan_body = json.dumps({
            "taskType": "TEXT_IMAGE",
            "textToImageParams": {"text": image_prompt},
            "imageGenerationConfig": {
                "numberOfImages": 1,
                "height": 1024,
                "width": 1024,
                "cfgScale": 8.0,
            },
        })

        image_response = bedrock.invoke_model(
            modelId=image_model_id,
            contentType="application/json",
            accept="application/json",
            body=titan_body,
        )

        image_data = image_response['body'].read()
        image_json = json.loads(image_data)
        image_base64 = image_json['images'][0]

        # Upload image to S3
        image_bytes = base64.b64decode(image_base64)
        image_key = f"generated-images/{uuid.uuid4()}.png"
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=image_key,
            Body=image_bytes,
            ContentType='image/png',
        )

        s3_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{image_key}"

        # Enqueue for Instagram posting
        message_body = {
            'caption': caption,
            'image_url': s3_url,
            'businessID': business_id,
        }
        sqs_client.send_message(
            QueueUrl=AD_CONTENT_QUEUE_URL,
            MessageBody=json.dumps(message_body),
        )

        return {
            'statusCode': 200,
            'body': json.dumps(
                {
                    "s3_public_url": s3_url,
                    "caption_generated": caption,
                    "message": "Content generated and queued via EventBridge trigger",
                },
                default=decimal_converter,
            ),
        }
    except Exception as exc:  # noqa: BLE001
        logger.error("[BEDROCK_GENERATE] _generate_and_enqueue failed: %s", exc)
        return {'statusCode': 500, 'body': 'Generation failed'}

def lambda_handler(event, context):
    """Generate image and text using Amazon Bedrock models, upload to S3, and send to SQS queue.

    Supports two invocation patterns:
    1. API Gateway (httpMethod present) for manual generation.
    2. EventBridge (source == 'adgenie.weather') for automated weather triggers.
    """
    # EventBridge invocation path ------------------------------------------------
    if event.get('source') == 'adgenie.weather':
        try:
            # Detail arrives as a JSON-encoded string
            detail = event.get('detail')
            if isinstance(detail, str):
                detail = json.loads(detail)
            business_id = detail.get('businessID')
            trigger_type = detail.get('triggerType')
        except Exception as exc:  # noqa: BLE001
            logger.error("[BEDROCK_GENERATE] Unable to parse EventBridge detail: %s", exc)
            return {'statusCode': 400, 'body': 'Bad event detail'}

        # Map trigger_type to a base caption prompt
        trigger_prompt_map = {
            'coldWeather': 'Stay warm with our cozy collection!',
            'rain': "Don't let the rain stop you - shop from home!",
            'sunAfterRain': 'Perfect day for outdoor activities!',
            'hotWeather': 'Beat the heat with our cooling products!',
        }
        base_caption = trigger_prompt_map.get(trigger_type, 'Check out our latest offers!')
        logger.info("[BEDROCK_GENERATE] Processing EventBridge trigger %s for business %s", trigger_type, business_id)

        # Override default caption generation prompt
        return _generate_and_enqueue(base_caption, business_id)

    # --------------------------------------------------------------------------
    # Existing API Gateway CORS & processing follows
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
        # Parse request body to get businessID
        body = json.loads(event.get('body', '{}'))
        business_id = body.get('businessID')
        
        if not business_id:
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'businessID is required.'})
            }

        bedrock = boto3.client('bedrock-runtime')
        s3 = boto3.client('s3')
        BUCKET_NAME = os.environ.get('PUBLIC_BUCKET_NAME')

        # 1. Generate caption using Claude 3 Sonnet
        text_prompt = body.get('baseCaption') or "Generate a creative caption for a summer beach photo."
        text_model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
        
        text_response = bedrock.invoke_model(
            modelId=text_model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 256,
                "messages": [
                    {
                        "role": "user",
                        "content": text_prompt
                    }
                ]
            })
        )
        
        # Parse Claude 3 response
        response_body = json.loads(text_response['body'].read().decode('utf-8'))
        caption = response_body['content'][0]['text']

        # 2. Generate image using Bedrock image model
        image_prompt = "A beautiful summer beach with palm trees and clear blue water."
        image_model_id = "amazon.titan-image-generator-v1"
        
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

        # 3. Upload image to S3
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
