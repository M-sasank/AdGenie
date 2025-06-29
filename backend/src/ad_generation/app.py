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
            products_raw = biz.get("products", "")
            if isinstance(products_raw, str):
                products_list = [p.strip() for p in products_raw.split(",") if p.strip()]
            elif isinstance(products_raw, list):
                products_list = [str(p).strip() for p in products_raw]
            else:
                products_list = []

            products = products_list
            logger.info("[AD_GENERATION] Products parsed: %s (count=%s)", products_list[:5], len(products_list))
            time_zone = biz.get("timeZone", time_zone)

            logger.info(
                "[AD_GENERATION] Business lookup success. name='%s' voice='%s' type='%s' location='%s' tz='%s'",
                business_name,
                brand_voice,
                business_type,
                location,
                time_zone,
            )
            
            # Validate that we have meaningful business data
            if business_name == "Your Business":
                logger.warning("[AD_GENERATION] Business name is still default value - business data may not be properly set")
            if not brand_voice:
                logger.warning("[AD_GENERATION] Brand voice is empty - using default")
                brand_voice = "professional"
            if not business_type:
                logger.warning("[AD_GENERATION] Business type is empty - using default")
                business_type = "business"
        except Exception as lookup_exc:  # noqa: BLE001
            logger.warning("[AD_GENERATION] Could not fetch business %s: %s", business_id, lookup_exc)
            logger.exception("[AD_GENERATION] Full exception details:")
            # Set better defaults when lookup fails
            brand_voice = "professional"
            business_type = "business"

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

        # ------------------------------------------------------------------
        # Rewrite prompt with strict constraints: no people, no text/logos
        # ------------------------------------------------------------------
        top_products_ctx = ", ".join(products[:3]) if products else "general products"

        rewrite_system_prompt = (
            "You are creating a photography prompt for an AI image generator. Your job is to transform a business promotion into a detailed scene description.\n\n"
            f"BUSINESS CONTEXT:\n"
            f"• Business: {business_name}\n"
            f"• Type: {business_type}\n"
            f"• Style: {brand_voice}\n"
            f"• Location: {location}\n"
            f"• Products: {top_products_ctx}\n\n"
            "CRITICAL CONSTRAINTS - THE SCENE MUST HAVE:\n"
            "• ZERO people, humans, hands, faces, or body parts\n"
            "• ZERO text, letters, numbers, signs, logos, or written elements\n"
            "• ZERO readable content of any kind\n\n"
            "SCENE REQUIREMENTS:\n"
            "1. Show the business products in their natural business environment\n"
            "2. Match the business type's typical setting and atmosphere\n"
            "3. Reflect the brand style in visual mood and composition\n"
            "4. Use professional photography terms (lighting, angles, depth of field)\n"
            "5. Focus on products, environment, textures, and ambiance\n\n"
            "OUTPUT FORMAT:\n"
            "• Write ONE detailed paragraph describing the scene\n"
            "• Include specific product details and environmental elements\n"
            "• Use rich descriptive language for lighting and composition\n"
            "• DO NOT include explanations, notes, or commentary\n"
            "• DO NOT mention people, text, or any readable elements\n\n"
            "Remember: This is for an image generator that will create exactly what you describe, so be precise about what should and should NOT appear."
        )

        rewrite_input = f"{rewrite_system_prompt}\n\nMARKETING PROMOTION TO TRANSFORM:\n{custom_prompt}\n\nGenerate the scene description now:"

        logger.info("[AD_GENERATION] === IMAGE PROMPT GENERATION ===")
        logger.info("[AD_GENERATION] Business details being used:")
        logger.info("[AD_GENERATION] - Name: %s", business_name)
        logger.info("[AD_GENERATION] - Type: %s", business_type)
        logger.info("[AD_GENERATION] - Voice: %s", brand_voice)
        logger.info("[AD_GENERATION] - Location: %s", location)
        logger.info("[AD_GENERATION] - Products: %s", top_products_ctx)
        logger.info("[AD_GENERATION] Full prompt being sent to Titan text model:")
        logger.info("[AD_GENERATION] %s", rewrite_input)
        logger.info("[AD_GENERATION] ==========================================")

        titan_rewrite_body = json.dumps({
            "inputText": rewrite_input,
            "textGenerationConfig": {
                "maxTokenCount": 200,
                "temperature": 0.3,
                "topP": 0.9
            }
        })

        rewrite_response = bedrock.invoke_model(
            modelId="amazon.titan-text-premier-v1:0",
            contentType="application/json",
            accept="application/json",
            body=titan_rewrite_body
        )
        rewrite_body = json.loads(rewrite_response["body"].read().decode("utf-8"))
        image_prompt = rewrite_body["results"][0]["outputText"].strip()
        
        # Validate that the prompt doesn't mention forbidden elements
        forbidden_words = ['people', 'person', 'human', 'face', 'hand', 'text', 'sign', 'logo', 'letter', 'number', 'word', 'writing']
        prompt_lower = image_prompt.lower()
        found_forbidden = [word for word in forbidden_words if word in prompt_lower]
        
        if found_forbidden:
            logger.warning("[AD_GENERATION] Generated prompt contains forbidden words: %s", found_forbidden)
            # Clean the prompt by removing sentences with forbidden words
            sentences = image_prompt.split('.')
            clean_sentences = []
            for sentence in sentences:
                sentence_lower = sentence.lower()
                if not any(word in sentence_lower for word in forbidden_words):
                    clean_sentences.append(sentence)
            image_prompt = '. '.join(clean_sentences).strip()
            if image_prompt and not image_prompt.endswith('.'):
                image_prompt += '.'
        
        logger.info("[AD_GENERATION] Rewrite model completed. image_prompt_len=%s", len(image_prompt))
        logger.info("[AD_GENERATION] Generated image prompt: %s", image_prompt)
        logger.debug("[AD_GENERATION] image_prompt_preview=%s", (image_prompt[:120] + "...") if len(image_prompt) > 120 else image_prompt)

        # Append directive to reinforce no-people/no-text (keep <=512)
        directive = " Professional product photography, no people, no text or typography."

        max_len = 512 - len(directive)
        if len(image_prompt) > max_len:
            logger.info("[AD_GENERATION] Truncating image_prompt from %s to %s characters to accommodate directive", len(image_prompt), max_len)
            image_prompt = image_prompt[:max_len]

        image_prompt += directive

        logger.info("[AD_GENERATION] === FINAL IMAGE PROMPT ===")
        logger.info("[AD_GENERATION] Final image prompt sent to Titan Image Generator:")
        logger.info("[AD_GENERATION] %s", image_prompt)
        logger.info("[AD_GENERATION] ====================================")

        # 2. Generate caption using Amazon Titan Premier text model
        caption_model_id = "amazon.titan-text-premier-v1:0"
        
        # Ensure business name is not the default
        display_business_name = business_name if business_name != "Your Business" else "our store"
        
        caption_instruction = (
            f"Write a compelling Instagram caption for this promotion: '{custom_prompt}'\n\n"
            f"Business context:\n"
            f"- Name: {display_business_name}\n"
            f"- Type: {business_type}\n"
            f"- Brand voice: {brand_voice}\n"
            f"- Location: {location}\n"
            f"- Products: {top_products_ctx}\n\n"
            f"Requirements:\n"
            f"- 15-25 words maximum\n"
            f"- Match the {brand_voice} brand voice\n"
            f"- Include the business name naturally (not 'Your Business')\n"
            f"- End with 2-3 relevant hashtags for {business_type} in {location}\n"
            f"- Make it compelling and action-oriented\n"
            f"- Return ONLY the caption text, nothing else\n"
            f"- Do NOT include any explanations, notes, or commentary"
        )

        logger.info("[AD_GENERATION] === CAPTION GENERATION ===")
        logger.info("[AD_GENERATION] Full caption prompt being sent to Titan text model:")
        logger.info("[AD_GENERATION] %s", caption_instruction)
        logger.info("[AD_GENERATION] =========================================")

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
        raw_caption = caption_body["results"][0]["outputText"].strip()
        
        logger.info("[AD_GENERATION] === CAPTION MODEL RESPONSE ===")
        logger.info("[AD_GENERATION] Raw caption model output:")
        logger.info("[AD_GENERATION] %s", raw_caption)
        logger.info("[AD_GENERATION] ===================================")
        
        # Clean up any unwanted formatting or extra text
        caption = raw_caption.replace('"', '').strip()
        if caption.startswith('Caption:') or caption.startswith('caption:'):
            caption = caption.split(':', 1)[1].strip()
        
        # Remove any explanatory text that starts with "Note:" or similar
        if 'Note:' in caption:
            caption = caption.split('Note:')[0].strip()
        if 'The hashtags' in caption:
            caption = caption.split('The hashtags')[0].strip()
        if 'These hashtags' in caption:
            caption = caption.split('These hashtags')[0].strip()
        
        # Ensure it ends properly (remove incomplete sentences)
        sentences = caption.split('.')
        if len(sentences) > 1 and not sentences[-1].strip():
            # Remove empty last sentence
            caption = '.'.join(sentences[:-1])
        elif len(sentences) > 1 and len(sentences[-1].strip()) < 10:
            # Remove very short incomplete last sentence
            caption = '.'.join(sentences[:-1])
        
        logger.info("[AD_GENERATION] Caption generated. len=%s", len(caption))
        logger.info("[AD_GENERATION] Final cleaned caption: %s", caption)

        # 3. Generate image using Titan
        image_model_id = "amazon.titan-image-generator-v2:0"
        cfg_scale = round(random.uniform(6.0, 9.0), 1)
        seed = random.randint(0, 2**31 - 1)
        
        logger.info("[AD_GENERATION] === IMAGE GENERATION ===")
        logger.info("[AD_GENERATION] Invoking Titan image model. model_id=%s prompt_len=%s cfg_scale=%s seed=%s", image_model_id, len(image_prompt), cfg_scale, seed)
        logger.info("[AD_GENERATION] Image generation parameters:")
        logger.info("[AD_GENERATION] - Height: 1024")
        logger.info("[AD_GENERATION] - Width: 1024") 
        logger.info("[AD_GENERATION] - CFG Scale: %s", cfg_scale)
        logger.info("[AD_GENERATION] - Seed: %s", seed)
        logger.info("[AD_GENERATION] - Number of images: 1")
        logger.info("[AD_GENERATION] ================================")
        
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
        logger.info("[AD_GENERATION] Raw image model JSON keys: %s", list(image_json.keys()))
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
