import boto3
import base64
import uuid
import json
import os
from decimal import Decimal
from typing import Dict
import logging
import random

# Initialize clients
sqs_client = boto3.client("sqs")
AD_CONTENT_QUEUE_URL = os.environ.get("AD_CONTENT_QUEUE_URL")

# DynamoDB client
dynamodb = boto3.resource("dynamodb")
BUSINESSES_TABLE = dynamodb.Table("Businesses")

# Logger setup
logger = logging.getLogger()
logger.setLevel(logging.INFO)


# Helper to robustly parse JSON embedded in LLM output
def _extract_json(text: str) -> dict:
    """Return first JSON object found inside text, or empty dict if none."""
    # Entry log with input overview
    logger.info(
        "[BEDROCK_GENERATE] _extract_json called. input_length=%s preview=%s",
        len(text),
        text[:100],
    )
    try:
        start = text.index("{")
    except ValueError:
        logger.info("[BEDROCK_GENERATE] _extract_json: No '{' found in text")
        return {}
    stack = 0
    for idx in range(start, len(text)):
        if text[idx] == "{":
            stack += 1
        elif text[idx] == "}":
            stack -= 1
            if stack == 0:
                try:
                    logger.info(
                        "[BEDROCK_GENERATE] Extracted JSON: %s", text[start : idx + 1]
                    )
                    return json.loads(text[start : idx + 1])
                except Exception:  # noqa: BLE001
                    return {}
    logger.info("[BEDROCK_GENERATE] _extract_json: Exhausted text without JSON")
    return {}


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


def _generate_and_enqueue(
    caption: str,
    business_id: str,
    image_prompt: str,
    schedule_name: str | None = None,
    trigger_category: str | None = None,
) -> Dict:
    """Generate an image with Bedrock Titan, upload to S3, and enqueue for Instagram posting.

    Parameters
    ----------
    caption : str
        Pre-composed caption text to accompany the generated image.
    business_id : str
        Identifier of the business for which the content is generated.
    image_prompt : str
        Dynamic prompt for image generation.
    schedule_name : str | None, optional
        Name of the schedule for which the content is generated, by default None.

    Returns
    -------
    dict
        Lambda-style HTTP response (statusCode/body).
    """
    try:
        logger.info(
            "[BEDROCK_GENERATE] _generate_and_enqueue start | business_id=%s caption_preview=%s image_prompt_len=%s",
            business_id,
            caption[:120],
            len(image_prompt),
        )
        bedrock = boto3.client("bedrock-runtime")
        s3 = boto3.client("s3")
        BUCKET_NAME = os.environ.get("PUBLIC_BUCKET_NAME")
        if not BUCKET_NAME:
            logger.error("[BEDROCK_GENERATE] PUBLIC_BUCKET_NAME environment variable not set")
            return {
                "statusCode": 500,
                "body": "Server misconfiguration: bucket name missing",
            }

        # Safeguard against empty prompt and enforce model limit
        if not image_prompt:
            image_prompt = "Lifestyle photo for social media marketing."
        if len(image_prompt) > 512:
            logger.info("[BEDROCK_GENERATE] Truncating image_prompt from %s to 512 characters", len(image_prompt))
            image_prompt = image_prompt[:512]
        cfg_scale = round(random.uniform(6.0, 9.0), 1)
        seed = random.randint(0, 2**31 - 1)

        titan_body = json.dumps(
            {
                "taskType": "TEXT_IMAGE",
                "textToImageParams": {"text": image_prompt},
                "imageGenerationConfig": {
                    "numberOfImages": 1,
                    "height": 1024,
                    "width": 1024,
                    "cfgScale": cfg_scale,
                    "seed": seed,
                },
            }
        )

        image_response = bedrock.invoke_model(
            modelId="amazon.titan-image-generator-v1",
            contentType="application/json",
            accept="application/json",
            body=titan_body,
        )

        logger.info(
            "[BEDROCK_GENERATE] Image generation response received for business %s",
            business_id,
        )

        image_data = image_response["body"].read()
        image_json = json.loads(image_data)
        images_list = image_json.get("images") or []
        if not images_list:
            raise ValueError("Image generator returned no images")
        image_base64 = images_list[0]

        # Upload image to S3
        image_bytes = base64.b64decode(image_base64)
        image_key = f"generated-images/{uuid.uuid4()}.png"
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=image_key,
            Body=image_bytes,
            ContentType="image/png",
        )

        logger.info(
            "[BEDROCK_GENERATE] Uploaded image to S3 bucket=%s key=%s",
            BUCKET_NAME,
            image_key,
        )

        # Generate presigned URL valid for 6 hours (Instagram requires publicly accessible URL)
        s3_url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": BUCKET_NAME, "Key": image_key},
            ExpiresIn=21600,  # 6 hours
        )

        # Enqueue for Instagram posting
        message_body = {
            "caption": caption,
            "image_url": s3_url,
            "businessID": business_id,
            "seed": seed,
        }
        if schedule_name is not None:
            message_body["scheduleName"] = schedule_name
        if trigger_category is not None:
            message_body["triggerCategory"] = trigger_category
        sqs_resp = sqs_client.send_message(
            QueueUrl=AD_CONTENT_QUEUE_URL,
            MessageBody=json.dumps(message_body),
        )

        logger.info(
            "[BEDROCK_GENERATE] Sent message to SQS. MessageId=%s",
            sqs_resp.get("MessageId"),
        )

        logger.info(
            "[BEDROCK_GENERATE] _generate_and_enqueue completed for business %s",
            business_id,
        )

        return {
            "statusCode": 200,
            "body": json.dumps(
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
        return {"statusCode": 500, "body": "Generation failed"}


# Helper predicate to determine if an invocation is a weather-trigger event
# (EventBridge Rule or Scheduler) as opposed to an API Gateway request.

def _is_weather_event(event: dict) -> bool:  # noqa: D401
    """Return *True* if *event* looks like a weather-trigger invocation.

    Criteria:
    1. Must *not* contain the ``httpMethod`` key (that key indicates an API Gateway
       request).
    2. Either ``source`` equals ``"adgenie.weather"`` **or** the payload contains
       both ``triggerType`` and ``businessID`` keys (shape used by the Scheduler).
    """
    if event.get("httpMethod") is not None:
        # API Gateway always includes httpMethod; therefore not a weather event.
        return False
    if event.get("source") == "adgenie.weather":
        return True
    return "triggerType" in event and "businessID" in event


def _random_photo_style() -> str:
    """Return a randomized photography style suffix to diversify image prompts.

    The returned string includes camera type, lens, composition style, colour palette,
    and lighting description. Adding this to every prompt injects controlled
    randomness so that consecutive generations do not look identical while
    remaining contextually relevant.
    """
    camera_types = [
        "DSLR", "mirrorless camera", "medium-format camera", "smartphone camera"
    ]
    lenses = [
        "50 mm prime lens", "35 mm wide-angle lens", "85 mm portrait lens",
        "24-70 mm zoom lens", "macro lens"
    ]
    compositions = [
        "flat-lay composition", "overhead perspective", "cinematic close-up",
        "rule-of-thirds framing", "lifestyle candid shot"
    ]
    colour_palettes = [
        "muted pastel tones", "vibrant saturated colours",
        "warm earthy hues", "high-contrast black and white",
        "cool monochrome blues"
    ]
    lighting_styles = [
        "soft diffused lighting", "golden hour backlight",
        "dramatic chiaroscuro", "neon accent lighting",
        "studio softbox illumination"
    ]

    return (
        "Shot with a "
        + random.choice(camera_types)
        + " using a "
        + random.choice(lenses)
        + ", "
        + random.choice(compositions)
        + ", "
        + random.choice(colour_palettes)
        + ", "
        + random.choice(lighting_styles)
        + "."
    )


def lambda_handler(event, context):
    """Generate image and text using Amazon Bedrock models, upload to S3, and send to SQS queue.

    Supports two invocation patterns:
    1. API Gateway (httpMethod present) for manual generation.
    2. EventBridge (source == 'adgenie.weather') for automated weather triggers.
    """
    logger.info(
        "[BEDROCK_GENERATE] lambda_handler entry. Event keys=%s", list(event.keys())
    )

    # Weather event (EventBridge Rule or Scheduler) -----------------------------
    if _is_weather_event(event):
        logger.info("[BEDROCK_GENERATE] Processing EventBridge trigger")
        logger.info(event)
        try:
            # Support both EventBridge Rule (has "detail") and Scheduler (flat) payloads
            detail = event.get("detail") or event
            if isinstance(detail, str):
                detail = json.loads(detail)
            business_id = detail.get("businessID")
            trigger_type = detail.get("triggerType")
            trigger_category = detail.get("triggerCategory")
            schedule_name = detail.get("scheduleName")

            logger.info(
                "[BEDROCK_GENERATE] EventBridge detail. business_id=%s trigger_type=%s",
                business_id,
                trigger_type,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "[BEDROCK_GENERATE] Unable to parse EventBridge detail: %s", exc
            )
            return {"statusCode": 400, "body": "Bad event detail"}

        # Map trigger_type to base caption (tone-specific will be generated)
        trigger_prompt_map = {
            "coldWeather": "Stay warm with our cozy collection!",
            "rain": "Don't let the rain stop you - shop from home!",
            "sunAfterRain": "Perfect day for outdoor activities!",
            "hotWeather": "Beat the heat with our cooling products!",
            "payday": "Treat yourself with our special payday delights!",
            "weekend": "Kick off the weekend with our fresh picks!",
        }

        # Fetch business details
        try:
            biz_resp = BUSINESSES_TABLE.get_item(Key={"businessID": business_id})
            biz = biz_resp.get("Item", {})
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "[BEDROCK_GENERATE] Could not fetch business %s: %s", business_id, exc
            )
            biz = {}

        logger.info(
            "[BEDROCK_GENERATE] Business lookup %s: name=%s voice=%s products_count=%s",
            business_id,
            biz.get("businessName"),
            biz.get("brandVoice"),
            len(biz.get("products", "").split(",")) if biz.get("products") else 0,
        )

        business_name = biz.get("businessName", "Your Business")
        brand_voice = biz.get("brandVoice", "Warm & Friendly")
        location = biz.get("location", "")
        products_raw = biz.get("products", "")
        products_list = [p.strip() for p in products_raw.split(",") if p.strip()]
        first_product: str | None = products_list[0] if products_list else None
        second_product: str | None = (
            products_list[1] if len(products_list) > 1 else None
        )

        weather_desc = {
            "hotWeather": "a hot sunny day",
            "coldWeather": "a chilly day",
            "rain": "rainy weather",
            "sunAfterRain": "a sunny day just after rain",
            "payday": "payday celebration",
            "weekend": "a relaxed weekend mood",
        }.get(trigger_type, "the given occasion")

        json_prompt = f"""Generate a JSON response for a social media post. Follow this exact schema and always respond with a JSON object:
            {{
                "products": ["product1", "product2"],
                "caption": "Your engaging caption here \n \n #hashtag1 #hashtag2 #hashtag3"
            }}
        
            Description of the schema:
            products: Should be an array of 2 products in the list of available products: {products_list} that match the weather: {weather_desc}
            caption: Should be a 20-25 word caption that includes the products and 3 hashtags for business: {business_name} with brand voice: {brand_voice}
            
            EXAMPLES:
            {{"products": ["Hot coffee", "Chocolate croissant"], "caption": "Warm up with our perfect rainy day combo! #RainyDayTreat #CoffeeTime #Cozy"}}
            {{"products": ["Iced latte", "Fresh salad"], "caption": "Beat the heat with our refreshing summer favorites! #CoolDown #SummerFresh #ChillVibes"}}

            Important rules:
            1. Select EXACTLY 2 products that match the weather
            2. Cold/rainy weather = hot/warm items only (coffee, soup, hot chocolate)
            3. Hot weather = cold items only (iced drinks, ice cream, salads)
            4. Payday = indulgent/premium items (signature desserts, specialty drinks)
            5. Weekend = leisure/brunch items (pancakes, smoothies)
            6. Choose complementary products (coffee + pastry, soup + bread)
            7. Caption must be 20-25 words maximum
            8. Include exactly 3 hashtags at the end after a caption
            9. Use {brand_voice} tone throughout
            
            """

        try:
            bedrock = boto3.client("bedrock-runtime")
            logger.info(
                "[BEDROCK_GENERATE] Invoking text model for weather caption generation"
            )
            txt_resp = bedrock.invoke_model(
                modelId="amazon.titan-text-premier-v1:0",
                contentType="application/json",
                accept="application/json",
                body=json.dumps(
                    {
                        "inputText": json_prompt,
                        "textGenerationConfig": {
                            "maxTokenCount": 300,
                            "temperature": 0.3,
                            "topP": 0.8,
                        },
                    }
                ),
            )
            titan_resp = json.loads(txt_resp["body"].read().decode("utf-8"))
            output_text = titan_resp["results"][0]["outputText"].strip()
            logger.info(
                "[BEDROCK_GENERATE] Text-model raw output (weather): %s", output_text
            )
            result_json = _extract_json(output_text)
            selected_products = result_json.get("products", [])
            caption = result_json.get("caption", trigger_prompt_map.get(trigger_type))

            logger.info("[BEDROCK_GENERATE] Selected products: %s", selected_products)

            if selected_products:
                first_product = selected_products[0]
                second_product = (
                    selected_products[1] if len(selected_products) > 1 else None
                )

            # Prompt will be rebuilt after try/except
        except Exception as exc:
            logger.error("[BEDROCK_GENERATE] Text model JSON selection failed: %s", exc)
            caption = trigger_prompt_map.get(
                trigger_type, "Check out our latest offers!"
            )

        if not first_product:
            first_product = products_list[0] if products_list else "signature item"
        style_suffix = _random_photo_style()
        if trigger_type == "hotWeather":
            image_prompt = (
                f"A sun-drenched, Instagram-worthy {brand_voice.lower()} {biz.get('businessType', 'shop')} in {location} "
                f"with golden hour lighting streaming through large windows. Beautiful presentation of {first_product} "
                f"with ice crystals glistening, served in elegant glassware"
                + (
                    f" alongside perfectly arranged {second_product}"
                    if second_product
                    else ""
                )
                + ". Fresh mint garnish, condensation droplets, marble countertops, potted plants. "
                f"Bright, airy atmosphere with tropical vibes. "
                f"Professional food photography style, shallow depth of field, warm natural lighting. "
                + style_suffix
            )

        elif trigger_type == "coldWeather":
            image_prompt = (
                f"An irresistibly cozy {brand_voice.lower()} {biz.get('businessType', 'cafe')} in {location} "
                f"with warm amber lighting, exposed brick walls, and soft blankets draped over vintage chairs. "
                f"Steam rising dramatically from {first_product} in a beautiful ceramic mug"
                + (
                    f", perfectly paired with {second_product} on a rustic wooden board"
                    if second_product
                    else ""
                )
                + ". Flickering candles, fairy lights, "
                f"rain-spotted windows creating bokeh effects. Hygge aesthetic with rich textures, "
                f"cinnamon sticks and autumn leaves as props. Cinematic lighting, cozy atmosphere. "
                + style_suffix
            )

        elif trigger_type == "rain":
            image_prompt = (
                f"A romantic, shelter-from-the-storm {brand_voice.lower()} {biz.get('businessType', 'cafe')} in {location} "
                f"with large rain-streaked windows creating a dreamy backdrop. Intimate scene of {first_product} "
                f"steaming on a weathered wooden table by the window"
                + (
                    f" with {second_product} artfully plated beside it"
                    if second_product
                    else ""
                )
                + ". Rain droplets creating beautiful patterns on glass, soft jazz ambiance, warm pendant lighting casting golden pools. "
                f"Moody photography with rich shadows and highlights, vintage coffee shop aesthetic. "
                + style_suffix
            )

        elif trigger_type == "payday":
            image_prompt = (
                f"A celebratory {brand_voice.lower()} {biz.get('businessType', 'store')} in {location} bursting with payday excitement. "
                f"Eye-catching display of {first_product} glistening under accent lights"
                + (f" alongside luxurious {second_product}" if second_product else "")
                + ". Confetti elements, sleek marble counters, golden colour accents conveying luxury and reward. "
                f"High-energy atmosphere with smiling customers treating themselves. "
                f"Professional commercial photography, crisp focus, vibrant colours. "
                + style_suffix
            )

        elif trigger_type == "weekend":
            image_prompt = (
                f"A laid-back weekend scene at {business_name} in {location}. Sunlit patio seating with rustic wooden tables showcasing {first_product}"
                + (f" and {second_product}" if second_product else "")
                + ". People chatting leisurely, potted herbs, soft linen napkins fluttering in a gentle breeze. "
                f"Warm natural light, candid lifestyle vibe, shallow depth of field. "
                + style_suffix
            )

        else:  # sunAfterRain
            image_prompt = (
                f"A magical post-rain scene at {business_name} in {location} with dramatic sunbeams "
                f"breaking through clearing clouds, wet pavement reflecting golden light. Fresh, clean "
                f"storefront with outdoor seating showcasing {first_product}"
                + (f" and {second_product}" if second_product else "")
                + f" on a beautifully set table. Rainbow in the background, puddles creating mirror effects, "
                f"potted flowers glistening with raindrops. "
                f"Hopeful, uplifting atmosphere with vibrant colors and dramatic sky. "
                f"Professional lifestyle photography with perfect composition. "
                + style_suffix
            )

        logger.info(
            "[BEDROCK_GENERATE] Trigger %s for %s | Image prompt: %s | Caption: %s",
            trigger_type,
            business_id,
            image_prompt,
            caption,
        )

        gen_result = _generate_and_enqueue(caption, business_id, image_prompt, schedule_name, trigger_category)
        logger.info(
            "[BEDROCK_GENERATE] _generate_and_enqueue returned statusCode=%s",
            gen_result.get("statusCode"),
        )
        return gen_result

    # --------------------------------------------------------------------------
    # Existing API Gateway CORS & processing follows
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
    }

    # Handle OPTIONS request for CORS preflight
    if event.get("httpMethod") == "OPTIONS":
        logger.info("[BEDROCK_GENERATE] CORS preflight OPTIONS received")
        return {"statusCode": 200, "headers": cors_headers, "body": ""}

    try:
        # Parse request body to get businessID
        body = json.loads(event.get("body", "{}"))
        business_id = body.get("businessID")

        logger.info(
            "[BEDROCK_GENERATE] API Gateway request received. business_id=%s",
            business_id,
        )

        if not business_id:
            logger.info("[BEDROCK_GENERATE] businessID missing from request body")
            return {
                "statusCode": 400,
                "headers": {**cors_headers, "Content-Type": "application/json"},
                "body": json.dumps({"error": "businessID is required."}),
            }

        bedrock = boto3.client("bedrock-runtime")
        s3 = boto3.client("s3")
        BUCKET_NAME = os.environ.get("PUBLIC_BUCKET_NAME")
        if not BUCKET_NAME:
            logger.error("[BEDROCK_GENERATE] PUBLIC_BUCKET_NAME environment variable not set")
            return {
                "statusCode": 500,
                "body": "Server misconfiguration: bucket name missing",
            }

        # 1. Generate caption using Anazon Titan text model
        text_prompt = (
            body.get("baseCaption")
            or "Generate a creative caption for a summer beach photo."
        )
        logger.info(
            "[BEDROCK_GENERATE] Invoking text model for caption. Prompt=%s",
            text_prompt[:120],
        )
        text_model_id = "amazon.titan-text-premier-v1:0"

        text_response = bedrock.invoke_model(
            modelId=text_model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(
                {
                    "inputText": text_prompt,
                    "textGenerationConfig": {
                        "maxTokenCount": 256,
                        "temperature": 0.7,
                        "topP": 0.9,
                    },
                }
            ),
        )

        titan_caption_resp = json.loads(text_response["body"].read().decode("utf-8"))
        output_text = titan_caption_resp["results"][0]["outputText"].strip()
        logger.info("[BEDROCK_GENERATE] Text-model raw output (API): %s", output_text)
        parsed = _extract_json(output_text)
        caption = parsed.get("caption", output_text)

        logger.info("[BEDROCK_GENERATE] Caption generated: %s", caption)

        # 2. Generate image using Bedrock image model
        image_prompt = body.get("baseCaption")
        # Provide a sensible default if client omitted baseCaption
        if not image_prompt:
            image_prompt = "Engaging product shot for social media advertising."
        logger.info(
            "[BEDROCK_GENERATE] Invoking image model with prompt length=%s",
            len(image_prompt),
        )
        image_model_id = "amazon.titan-image-generator-v1"

        # Ensure image_prompt length within model limit (512 chars)
        if len(image_prompt) > 512:
            logger.info("[BEDROCK_GENERATE] Truncating image_prompt from %s to 512 characters", len(image_prompt))
            image_prompt = image_prompt[:512]
        cfg_scale = round(random.uniform(6.0, 9.0), 1)
        seed = random.randint(0, 2**31 - 1)

        titan_body = json.dumps(
            {
                "taskType": "TEXT_IMAGE",
                "textToImageParams": {"text": image_prompt},
                "imageGenerationConfig": {
                    "numberOfImages": 1,
                    "height": 1024,
                    "width": 1024,
                    "cfgScale": cfg_scale,
                    "seed": seed,
                },
            }
        )

        image_response = bedrock.invoke_model(
            modelId=image_model_id,
            contentType="application/json",
            accept="application/json",
            body=titan_body,
        )

        image_data = image_response["body"].read()
        image_json = json.loads(image_data)
        images_list = image_json.get("images") or []
        if not images_list:
            raise ValueError("Image generator returned no images")
        image_base64 = images_list[0]

        # 3. Upload image to S3
        image_bytes = base64.b64decode(image_base64)
        image_key = f"generated-images/{uuid.uuid4()}.png"

        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=image_key,
            Body=image_bytes,
            ContentType="image/png",
            # ACL='public-read'
        )

        # Generate presigned URL valid for 6 hours (Instagram requires publicly accessible URL)
        s3_url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": BUCKET_NAME, "Key": image_key},
            ExpiresIn=21600,  # 6 hours
        )

        # 4. Send message to SQS queue for Instagram posting
        logger.info(
            "[BEDROCK_GENERATE] Sending content to SQS queue: %s", AD_CONTENT_QUEUE_URL
        )

        message_body = {
            "caption": caption,
            "image_url": s3_url,
            "businessID": business_id,
            "seed": seed,
        }

        sqs_resp = sqs_client.send_message(
            QueueUrl=AD_CONTENT_QUEUE_URL, MessageBody=json.dumps(message_body)
        )

        logger.info(
            "[BEDROCK_GENERATE] Sent message to SQS. MessageId=%s",
            sqs_resp.get("MessageId"),
        )

        logger.info(
            "[BEDROCK_GENERATE] API Gateway processing complete for business %s",
            business_id,
        )

        return {
            "statusCode": 200,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps(
                {
                    "s3_public_url": s3_url,
                    "caption_generated": caption,
                    "message": "Content generated and queued for Instagram posting",
                },
                default=decimal_converter,
            ),
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": "Invalid JSON in request body."}),
        }
    except Exception as e:
        print(f"Error in bedrock_generate: {e}")
        return {
            "statusCode": 500,
            "headers": {**cors_headers, "Content-Type": "application/json"},
            "body": json.dumps({"error": f"Failed to generate content: {str(e)}"}),
        }
