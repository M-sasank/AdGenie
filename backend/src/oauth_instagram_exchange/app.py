import json
import boto3
import requests
import uuid
from datetime import datetime
import os

def lambda_handler(event, context):
    """
    Exchange Instagram OAuth authorization code for access token.
    
    Expected request body:
    {
        "userId": "string (required)",
        "code": "string (required)", 
        "redirectUri": "string (required)"
    }
    
    Args:
        event: Lambda event containing the authorization code and user info
        context: Lambda runtime context
        
    Returns:
        dict: Response with token information or error message
    """
    print("Received event:", json.dumps(event))
    
    # Define CORS headers
    cors_headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }

    # Handle OPTIONS request for CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        print("Handling OPTIONS request")
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': ''
        }

    try:
        print("Processing request body:", event.get('body'))
        data = json.loads(event['body'])
        
        # Validate required fields
        user_id = data.get('userId')
        auth_code = data.get('code')
        redirect_uri = data.get('redirectUri')
        
        print(f"Received data - userId: {user_id}, code: {auth_code}, redirectUri: {redirect_uri}")
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'userId is required.'})
            }
        
        if not auth_code:
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'authorization code is required.'})
            }
        
        if not redirect_uri:
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'redirectUri is required.'})
            }
        
        # Get Instagram credentials from environment variables
        client_id = os.environ.get('INSTAGRAM_CLIENT_ID')
        client_secret = os.environ.get('INSTAGRAM_CLIENT_SECRET')
        token_url = os.environ.get('INSTAGRAM_TOKEN_URL', 'https://api.instagram.com/oauth/access_token')
        graph_url = os.environ.get('INSTAGRAM_GRAPH_URL')
        
        print(f"Using token URL: {token_url}")
        
        if not all([client_id, client_secret, graph_url]):
            print("Missing Instagram credentials or graph URL")
            return {
                'statusCode': 500,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Instagram credentials not configured.'})
            }
        
        # Exchange authorization code for access token
        token_data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri,
            'code': auth_code
        }
        
        print(f"Exchanging code for token for user: {user_id}")
        print(f"Token request data: {json.dumps({**token_data, 'client_secret': '***'})}")
        
        token_response = requests.post(token_url, data=token_data)
        
        print(f"Token response status: {token_response.status_code}")
        print(f"Token response body: {token_response.text}")
        
        if not token_response.ok:
            error_details = token_response.text
            print(f"Token exchange failed: {error_details}")
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Failed to exchange authorization code for token.',
                    'details': error_details
                })
            }
        
        token_info = token_response.json()
        print(f"Token info: {json.dumps({**token_info, 'access_token': '***'})}")
        
        # Extract token information
        access_token = token_info.get('access_token')
        instagram_user_id = token_info.get('user_id')
        
        if not access_token:
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'No access token received from Instagram.'})
            }
        
        # Get username from Instagram Graph API
        username = f"@{instagram_user_id}" # Fallback username
        if graph_url:
            try:
                graph_api_url = f"{graph_url}?fields=username&access_token={access_token}"
                print(f"Fetching username from {graph_url}")
                user_profile_response = requests.get(graph_api_url)
                if user_profile_response.ok:
                    username = user_profile_response.json().get('username', username)
                    print(f"Successfully fetched username: {username}")
                else:
                    print(f"Failed to fetch username: {user_profile_response.text}")
            except requests.exceptions.RequestException as e:
                print(f"Error fetching username: {str(e)}")

        # Generate a unique token ID for future reference
        token_id = f"IG-TOKEN-{uuid.uuid4()}"
        
        # Prepare data for response and database
        instagram_data = {
            'tokenID': token_id,
            'instagramUserId': str(instagram_user_id) if instagram_user_id else None,
            'username': username,
            'connectedAt': datetime.utcnow().isoformat() + 'Z',
            'connected': True
        }

        # Save to DynamoDB
        try:
            dynamodb = boto3.resource('dynamodb')
            table_name = os.environ.get('DYNAMODB_TABLE')
            if not table_name:
                raise ValueError("DYNAMODB_TABLE environment variable not set")
            table = dynamodb.Table(table_name)
            
            print(f"Updating DynamoDB for businessID: {user_id}")
            table.update_item(
                Key={'businessID': user_id},
                UpdateExpression="SET instagram = :ig, instagramConnected = :ic",
                ExpressionAttributeValues={
                    ':ig': instagram_data,
                    ':ic': True
                }
            )
            print("Successfully updated DynamoDB")
        except Exception as e:
            print(f"Error updating DynamoDB: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Failed to save Instagram connection to database.'})
            }

        print(f"Successfully exchanged token for user: {user_id}, Instagram user: {instagram_user_id}")
        
        response_body = {
            'message': 'Instagram account connected successfully',
            'instagram': instagram_data
        }
        
        print(f"Sending response: {json.dumps(response_body)}")
        
        return {
            'statusCode': 200,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps(response_body)
        }
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Invalid JSON in request body.'})
        }
    except requests.exceptions.RequestException as e:
        print(f"Request error during token exchange: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Network error during token exchange.'})
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Could not exchange authorization code.'})
        } 