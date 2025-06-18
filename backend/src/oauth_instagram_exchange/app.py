import json
import boto3
import requests
import uuid
from datetime import datetime, timedelta
import os

def lambda_handler(event, context):
    """
    Exchange Instagram OAuth authorization code for access token and store long-lived token.
    
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
        dict: Response with success status and message
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
                'body': json.dumps({'success': False, 'message': 'userId is required.'})
            }
        
        if not auth_code:
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'success': False, 'message': 'authorization code is required.'})
            }
        
        if not redirect_uri:
            return {
                'statusCode': 400,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'success': False, 'message': 'redirectUri is required.'})
            }
        
        # Get Instagram credentials from environment variables
        client_id = os.environ.get('INSTAGRAM_CLIENT_ID')
        client_secret = os.environ.get('INSTAGRAM_CLIENT_SECRET')
        token_url = os.environ.get('INSTAGRAM_TOKEN_URL', 'https://api.instagram.com/oauth/access_token')
        dynamodb_table = 'Businesses'
        
        print(f"Using token URL: {token_url}")
        
        if not all([client_id, client_secret, dynamodb_table]):
            print("Missing Instagram credentials or DynamoDB table")
            return {
                'statusCode': 500,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'success': False, 'message': 'Instagram credentials not configured.'})
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
                    'success': False,
                    'message': 'Failed to exchange authorization code for token.'
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
                'body': json.dumps({'success': False, 'message': 'No access token received from Instagram.'})
            }
        
        # Exchange short-lived token for long-lived token
        long_lived_token = None
        long_lived_expires_at = None
        warning_message = None
        
        try:
            long_lived_params = {
                'grant_type': 'ig_exchange_token',
                'client_secret': client_secret,
                'access_token': access_token
            }
            
            print("Exchanging short-lived token for long-lived token")
            long_lived_response = requests.get('https://graph.instagram.com/access_token', params=long_lived_params)
            
            print(f"Long-lived token response status: {long_lived_response.status_code}")
            print(f"Long-lived token response: {long_lived_response.text}")
            
            if long_lived_response.ok:
                long_lived_info = long_lived_response.json()
                long_lived_token = long_lived_info.get('access_token')
                expires_in = long_lived_info.get('expires_in', 5184000)  # Default 60 days
                
                # Calculate expiration timestamp (60 days from now)
                long_lived_expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat() + 'Z'
                print(f"Long-lived token acquired, expires at: {long_lived_expires_at}")
            else:
                print(f"Long-lived token exchange failed: {long_lived_response.text}")
                warning_message = "Instagram connected with short-lived token. Long-lived token exchange failed."
                # Set short-lived token expiration (1 hour)
                long_lived_expires_at = (datetime.utcnow() + timedelta(hours=1)).isoformat() + 'Z'
                
        except Exception as e:
            print(f"Long-lived token exchange error: {str(e)}")
            warning_message = "Instagram connected with short-lived token. Long-lived token exchange failed."
            long_lived_expires_at = (datetime.utcnow() + timedelta(hours=1)).isoformat() + 'Z'
        
        # Get Instagram username
        username = None
        try:
            # Use long-lived token if available, otherwise short-lived
            token_for_user_info = long_lived_token if long_lived_token else access_token
            user_info_response = requests.get(
                'https://graph.instagram.com/me',
                params={'access_token': token_for_user_info, 'fields': 'username'}
            )
            
            if user_info_response.ok:
                user_info = user_info_response.json()
                username = user_info.get('username', f'user_{instagram_user_id}')
                print(f"Retrieved username: {username}")
            else:
                print(f"Failed to get username: {user_info_response.text}")
                username = f'user_{instagram_user_id}' if instagram_user_id else 'instagram_user'
                
        except Exception as e:
            print(f"Username retrieval error: {str(e)}")
            username = f'user_{instagram_user_id}' if instagram_user_id else 'instagram_user'
        
        # Initialize DynamoDB
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table(dynamodb_table)
        
        # Find business record by userId
        try:
            # Scan for business with matching userId
            response = table.scan(
                FilterExpression='userId = :user_id',
                ExpressionAttributeValues={':user_id': user_id}
            )
            
            if not response.get('Items'):
                return {
                    'statusCode': 404,
                    'headers': {**cors_headers, 'Content-Type': 'application/json'},
                    'body': json.dumps({'success': False, 'message': 'No business found for this user.'})
                }
            
            business_item = response['Items'][0]
            business_id = business_item['businessID']
            
            print(f"Found business record: {business_id}")
            
        except Exception as e:
            print(f"Error finding business record: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'success': False, 'message': 'Failed to find business record.'})
            }
        
        # Prepare token details
        current_time = datetime.utcnow().isoformat() + 'Z'
        token_details = {
            'shortLivedToken': access_token,
            'longLivedToken': long_lived_token if long_lived_token else access_token,
            'longLivedExpiresAt': long_lived_expires_at,
            'instagramUserId': instagram_user_id or '',
            'scopes': 'instagram_business_basic',  # Default scope
            'lastRefreshed': current_time
        }
        
        # Update business record with token information
        try:
            # Get the existing business item
            business_response = table.get_item(Key={'businessID': business_id})
            business_item = business_response['Item']
            
            # Update Instagram fields
            if 'socialMedia' not in business_item:
                business_item['socialMedia'] = {}
            if 'instagram' not in business_item['socialMedia']:
                business_item['socialMedia']['instagram'] = {}
                
            business_item['socialMedia']['instagram'].update({
                'connected': True,
                'lastConnected': current_time,
                'username': username,
                'tokenDetails': token_details
            })
            
            # Save the updated business item
            table.put_item(Item=business_item)
            
            print(f"Successfully updated business record {business_id} with token information")
            
            # Return success response
            success_message = warning_message if warning_message else "Instagram account connected successfully"
            
            return {
                'statusCode': 200,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({
                    'success': True,
                    'message': success_message
                })
            }
            
        except Exception as e:
            print(f"Error updating business record: {str(e)}")
            return {
                'statusCode': 500,
                'headers': {**cors_headers, 'Content-Type': 'application/json'},
                'body': json.dumps({'success': False, 'message': 'Failed to store token information.'})
            }
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'success': False, 'message': 'Invalid JSON in request body.'})
        }
    except requests.exceptions.RequestException as e:
        print(f"Request error during token exchange: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'success': False, 'message': 'Network error during token exchange.'})
        }
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {**cors_headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'success': False, 'message': 'Could not exchange authorization code.'})
        } 