import json
import boto3
import requests
import uuid
from datetime import datetime

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
    try:
        data = json.loads(event['body'])
        
        # Validate required fields
        user_id = data.get('userId')
        auth_code = data.get('code')
        redirect_uri = data.get('redirectUri')
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'userId is required.'})
            }
        
        if not auth_code:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'authorization code is required.'})
            }
        
        if not redirect_uri:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'redirectUri is required.'})
            }
        
        # Get Instagram credentials from environment variables
        import os
        client_id = os.environ.get('INSTAGRAM_CLIENT_ID')
        client_secret = os.environ.get('INSTAGRAM_CLIENT_SECRET')
        token_url = os.environ.get('INSTAGRAM_TOKEN_URL', 'https://api.instagram.com/oauth/access_token')
        
        if not client_id or not client_secret:
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json'},
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
        
        token_response = requests.post(token_url, data=token_data)
        
        if not token_response.ok:
            error_details = token_response.text
            print(f"Token exchange failed: {error_details}")
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'error': 'Failed to exchange authorization code for token.',
                    'details': error_details
                })
            }
        
        token_info = token_response.json()
        
        # Extract token information
        access_token = token_info.get('access_token')
        user_info = token_info.get('user_id')
        
        if not access_token:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'No access token received from Instagram.'})
            }
        
        # Generate a unique token ID for future reference
        token_id = f"IG-TOKEN-{uuid.uuid4()}"
        
        # TODO: Store tokens in secure storage (future implementation)
        # For now, we'll just return the token ID and basic info
        
        print(f"Successfully exchanged token for user: {user_id}, Instagram user: {user_info}")
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'tokenID': token_id,
                'instagramUserId': str(user_info) if user_info else None,
                'username': f'@user_{user_info}' if user_info else '@connected_account',
                'connectedAt': datetime.utcnow().isoformat() + 'Z',
                'message': 'Instagram account connected successfully'
            })
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Invalid JSON in request body.'})
        }
    except requests.exceptions.RequestException as e:
        print(f"Request error during token exchange: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Network error during token exchange.'})
        }
    except Exception as e:
        print(f"Error exchanging Instagram token: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Could not exchange authorization code.'})
        } 