import boto3
import base64
import uuid
import json
import os
import random
from decimal import Decimal
import logging

# Logger configuration
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize clients
sqs_client = boto3.client('sqs')
AD_CONTENT_QUEUE_URL = os.environ.get('AD_CONTENT_QUEUE_URL')

# AWS SDK
dynamodb = boto3.resource("dynamodb")
BUSINESSES_TABLE = dynamodb.Table("Businesses")

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
    logger.info("[AD_GENERATION] Lambda invoked. event_keys=%s", list(event.keys()))

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
        raw_body = event.get('body') or '{}'
        body = json.loads(raw_body)
        logger.info("[AD_GENERATION] Parsed body: %s", body)
        business_id = body.get('businessID')
        custom_prompt = body.get('customPrompt', '').strip()
        
        if not business_id or not custom_prompt:
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'businessID and customPrompt are required.'})
            }

        # Fetch business details to personalise caption
        business_name = "Your Business"
        # Additional business attributes with safe defaults
        brand_voice = ""
        business_type = ""
        location = ""
        products = []
        time_zone = ""

        try:
            biz_resp = BUSINESSES_TABLE.get_item(Key={"businessID": business_id})
            biz = biz_resp.get("Item", {})

            # Extract relevant fields if they exist
            business_name = biz.get("businessName", business_name)
            brand_voice = biz.get("brandVoice", brand_voice)
            business_type = biz.get("businessType", business_type)
            location = biz.get("location", location)
            products = biz.get("products", products)
            time_zone = biz.get("timeZone", time_zone)

            logger.info(
                "[AD_GENERATION] Business lookup success. name=%s voice=%s type=%s location=%s tz=%s",
                business_name,
                brand_voice,
                business_type,
                location,
                time_zone,
            )
        except Exception as lookup_exc:  # noqa: BLE001
            logger.warning("[AD_GENERATION] Could not fetch business %s: %s", business_id, lookup_exc)

        bedrock = boto3.client('bedrock-runtime')
        s3 = boto3.client('s3')
        BUCKET_NAME = os.environ.get('PUBLIC_BUCKET_NAME')
        if not BUCKET_NAME:
            logger.error("[AD_GENERATION] PUBLIC_BUCKET_NAME environment variable not set")
            return {
                'statusCode': 500,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Server misconfiguration: bucket name missing'})
            }

        # 1. Rewrite prompt for image generation using Amazon Titan Premier text model
        rewrite_model_id = "amazon.titan-text-premier-v1:0"
        logger.info("[AD_GENERATION] Invoking rewrite model. model_id=%s custom_prompt_len=%s", rewrite_model_id, len(custom_prompt))
        logger.debug("[AD_GENERATION] Rewrite input preview: %s", (custom_prompt[:120] + "...") if len(custom_prompt) > 120 else custom_prompt)
        rewrite_system_prompt = (
            "You are a helpful assistant that rewrites a marketing offer or announcement into a vivid scene description "
            "suitable as an input prompt for an AI image generator. "
            "Constraints: 1) Describe only the visual scene, mood, and elements. 2) Do NOT include any promotional text, numbers, offers, or hashtags. "
            "3) Return ONLY the rewritten scene description with no extra commentary or formatting."
        )

        titan_rewrite_body = json.dumps({
            "inputText": f"{rewrite_system_prompt}\n\n{custom_prompt}",
            "textGenerationConfig": {
                "maxTokenCount": 128,
                "temperature": 0.5,
                "topP": 0.9
            }
        })

        rewrite_response = bedrock.invoke_model(
            modelId=rewrite_model_id,
            contentType="application/json",
            accept="application/json",
            body=titan_rewrite_body
        )
        rewrite_body = json.loads(rewrite_response["body"].read().decode("utf-8"))
        image_prompt = rewrite_body["results"][0]["outputText"].strip()
        logger.info("[AD_GENERATION] Rewrite model completed. image_prompt_len=%s", len(image_prompt))
        logger.debug("[AD_GENERATION] image_prompt_preview=%s", (image_prompt[:120] + "...") if len(image_prompt) > 120 else image_prompt)

        # Ensure Titan prompt length <= 512 chars
        if len(image_prompt) > 512:
            logger.info("[AD_GENERATION] Truncating image_prompt from %s to 512 characters", len(image_prompt))
            logger.debug("[AD_GENERATION] image_prompt_before_truncate=%s", image_prompt)
            image_prompt = image_prompt[:512]

        # 2. Generate caption using Amazon Titan Premier text model
        caption_model_id = "amazon.titan-text-premier-v1:0"
        caption_instruction = (
            f"You are an expert social-media copywriter. "
            f"Write an engaging Instagram caption (20-25 words) for this promotion: {custom_prompt}. "
            f"Business name: '{business_name}'. "
            f"Brand voice: '{brand_voice}'. "
            f"Business type: '{business_type}'. "
            f"Location: '{location}'. "
            f"Primary products: {', '.join(products[:3]) if products else 'N/A'}. "
            "Use the stated brand voice, match the business type, and address the audience in the specified location. "
            "Finish with exactly three relevant hashtags. "
            "Return ONLY the caption text."
        )

        logger.info("[AD_GENERATION] Invoking caption model. model_id=%s", caption_model_id)
        logger.debug("[AD_GENERATION] caption_instruction=%s", caption_instruction)

        titan_caption_body = json.dumps({
            "inputText": caption_instruction,
            "textGenerationConfig": {
                "maxTokenCount": 128,
                "temperature": 0.7,
                "topP": 0.9
            }
        })

        caption_response = bedrock.invoke_model(
            modelId=caption_model_id,
            contentType="application/json",
            accept="application/json",
            body=titan_caption_body
        )
        caption_body = json.loads(caption_response["body"].read().decode("utf-8"))
        caption = caption_body["results"][0]["outputText"].strip()
        logger.info("[AD_GENERATION] Caption generated. len=%s", len(caption))
        logger.debug("[AD_GENERATION] Caption preview: %s", caption)

        # 3. Generate image using Titan
        image_model_id = "amazon.titan-image-generator-v2:0"
        cfg_scale = round(random.uniform(6.0, 9.0), 1)
        seed = random.randint(0, 2**31 - 1)
        logger.info("[AD_GENERATION] Invoking Titan image model. model_id=%s prompt_len=%s cfg_scale=%s seed=%s", image_model_id, len(image_prompt), cfg_scale, seed)
        titan_body = json.dumps({
            "taskType": "TEXT_IMAGE",
            "textToImageParams": {
                "text": image_prompt
            },
            "imageGenerationConfig": {
                "numberOfImages": 1,
                "height": 1024,
                "width": 1024,
                "cfgScale": cfg_scale,
                "seed": seed
            }
        })
        image_response = bedrock.invoke_model(
            modelId=image_model_id,
            contentType="application/json",
            accept="application/json",
            body=titan_body
        )
        image_data = image_response['body'].read()
        logger.info("[AD_GENERATION] Image model response received")
        image_json = json.loads(image_data)
        logger.info("[AD_GENERATION] Raw image model JSON: %s", image_json)
        images_list = image_json.get('images') or []
        if not images_list:
            raise ValueError("Image generator returned no images")
        image_base64 = images_list[0]
        image_bytes = base64.b64decode(image_base64)
        image_key = f"generated-images/{uuid.uuid4()}.png"
        
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=image_key,
            Body=image_bytes,
            ContentType='image/png',
            # ACL='public-read'
        )
        
        logger.info("[AD_GENERATION] Uploaded image to S3 bucket=%s key=%s seed=%s", BUCKET_NAME, image_key, seed)
        # Generate presigned URL valid for 6 hours so Instagram can fetch
        s3_url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": BUCKET_NAME, "Key": image_key},
            ExpiresIn=21600,
        )
        logger.debug("[AD_GENERATION] S3 presigned URL: %s", s3_url)

        # 4. Send message to SQS queue for Instagram posting
        logger.info("[AD_GENERATION] Sending content to SQS queue: %s", AD_CONTENT_QUEUE_URL)
        
        message_body = {
            'caption': caption,
            'image_url': s3_url,
            'businessID': business_id,
            'seed': seed,
            'triggerCategory': 'manual'
        }
        
        sqs_resp = sqs_client.send_message(
            QueueUrl=AD_CONTENT_QUEUE_URL,
            MessageBody=json.dumps(message_body)
        )

        logger.info("[AD_GENERATION] Message sent to SQS. MessageId=%s", sqs_resp.get('MessageId'))
        logger.debug("[AD_GENERATION] SQS message body: %s", message_body)

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
        logger.exception("[AD_GENERATION] Unhandled exception: %s", e)
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Failed to generate content: {str(e)}'})
        }
