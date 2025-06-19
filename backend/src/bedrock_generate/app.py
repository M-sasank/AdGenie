import boto3
import base64
import uuid
import json
import os

def lambda_handler(event, context):
    bedrock = boto3.client('bedrock-runtime')
    s3 = boto3.client('s3')
    BUCKET_NAME = os.environ.get('PUBLIC_BUCKET_NAME')

    # 1. Generate caption using Bedrock text model
    text_prompt = "Generate a creative caption for a summer beach photo."
    text_model_id = "anthropic.claude-3-5-sonnet-20241022-v2:0"  # Claude 3.5 Sonnet v2
    text_response = bedrock.invoke_model(
        modelId=text_model_id,
        contentType="application/json",
        accept="application/json",
        body=json.dumps({"prompt": text_prompt})
    )
    caption = text_response['body'].read().decode('utf-8')

    # 2. Generate image using Bedrock image model
    image_prompt = "A beautiful summer beach with palm trees and clear blue water."
    image_model_id = "amazon.titan-image-generator-v1"  # Titan Image Generator G1 v2
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
    image_base64 = image_json['images'][0]  # Titan returns 'images' list

    # 3. Upload image to S3
    image_bytes = base64.b64decode(image_base64)
    image_key = f"generated-images/{uuid.uuid4()}.png"
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=image_key,
        Body=image_bytes,
        ContentType='image/png',
        ACL='public-read'
    )
    s3_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{image_key}"

    return {
        "s3_public_url": s3_url,
        "caption_generated": caption
    } 