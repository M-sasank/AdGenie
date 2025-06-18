import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Instagram, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface InstagramCallbackState {
  status: 'loading' | 'success' | 'error';
  message: string;
}

const InstagramCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [callbackState, setCallbackState] = useState<InstagramCallbackState>({
    status: 'loading',
    message: 'Processing Instagram connection...'
  });

  useEffect(() => {
    const handleCallback = async () => {
      // Helper function to get redirect destination based on source
      const getRedirectDestination = (source?: string) => {
        return source === 'edit_modal' ? '/dashboard' : '/onboarding';
      };

      try {
        // Extract parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Parse state early to determine redirect destination for errors
        let parsedState;
        let redirectDestination = '/onboarding'; // default fallback

        if (state) {
          try {
            parsedState = JSON.parse(atob(state));
            redirectDestination = getRedirectDestination(parsedState.source);
          } catch {
            // Keep default redirect if state parsing fails
          }
        }

        // Handle OAuth errors
        if (error) {
          setCallbackState({
            status: 'error',
            message: errorDescription || 'Instagram authorization failed'
          });
          toast.error('Instagram connection failed');
          setTimeout(() => navigate(redirectDestination), 3000);
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          setCallbackState({
            status: 'error',
            message: 'Missing authorization code or state parameter'
          });
          toast.error('Invalid callback parameters');
          setTimeout(() => navigate(redirectDestination), 3000);
          return;
        }

        // Validate state parameter (CSRF protection)
        const storedState = localStorage.getItem('instagram_oauth_state');
        if (!storedState || storedState !== state) {
          setCallbackState({
            status: 'error',
            message: 'Invalid state parameter - possible CSRF attack'
          });
          toast.error('Security validation failed');
          setTimeout(() => navigate(redirectDestination), 3000);
          return;
        }

        // Parse state to get user information (re-parse if not done earlier)
        if (!parsedState) {
          try {
            parsedState = JSON.parse(atob(state));
            redirectDestination = getRedirectDestination(parsedState.source);
          } catch {
            setCallbackState({
              status: 'error',
              message: 'Invalid state format'
            });
            toast.error('Invalid callback state');
            setTimeout(() => navigate(redirectDestination), 3000);
            return;
          }
        }

        // Validate user matches
        if (!user || parsedState.userId !== user.sub) {
          setCallbackState({
            status: 'error',
            message: 'User mismatch - please try again'
          });
          toast.error('User validation failed');
          setTimeout(() => navigate(redirectDestination), 3000);
          return;
        }

        // Exchange code for access token
        const tokenResponse = await fetch(`${import.meta.env.VITE_BACKEND_BASE_URL}/oauth/instagram/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.sub,
            code: code,
            redirectUri: import.meta.env.VITE_INSTAGRAM_REDIRECT_URI
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(errorData.error || 'Token exchange failed');
        }

        const tokenData = await tokenResponse.json();
        
        // Handle different OAuth sources
        const isFromEditModal = parsedState.source === 'edit_modal';
        
        if (isFromEditModal) {
          // Store Instagram connection data for edit modal to pick up
          const businessData = JSON.parse(parsedState.businessData);
          const updatedBusinessData = {
            ...businessData,
            socialMedia: {
              ...businessData.socialMedia,
              instagram: {
                connected: true,
                lastConnected: new Date().toISOString(),
                tokenID: tokenData.tokenID,
                username: tokenData.username || '@connected_account'
              }
            }
          };

          localStorage.setItem('updated_business_data_edit', JSON.stringify(updatedBusinessData));
          localStorage.removeItem('instagram_oauth_state');

          setCallbackState({
            status: 'success',
            message: 'Instagram reconnected successfully!'
          });

          toast.success('Instagram account reconnected!');

          // Redirect back to dashboard after short delay
          setTimeout(() => {
            navigate('/dashboard?instagram_reconnected=true');
          }, 2000);
        } else {
          // Original onboarding flow
          const businessData = JSON.parse(parsedState.businessData);
          const updatedBusinessData = {
            ...businessData,
            socialMedia: {
              ...businessData.socialMedia,
              instagram: {
                connected: true,
                lastConnected: new Date().toISOString(),
                tokenID: tokenData.tokenID,
                username: tokenData.username || '@connected_account'
              }
            }
          };

          localStorage.setItem('updated_business_data', JSON.stringify(updatedBusinessData));
          localStorage.removeItem('instagram_oauth_state');

          setCallbackState({
            status: 'success',
            message: 'Instagram connected successfully!'
          });

          toast.success('Instagram account connected!');

          // Redirect back to onboarding after short delay
          setTimeout(() => {
            navigate('/onboarding?instagram_connected=true');
          }, 2000);
        }

      } catch (error: any) {
        console.error('Instagram OAuth callback error:', error);
        
        // Determine redirect destination for catch block
        let redirectDestination = '/onboarding'; // default fallback
        
        try {
          const state = searchParams.get('state');
          if (state) {
            const parsedState = JSON.parse(atob(state));
            redirectDestination = getRedirectDestination(parsedState.source);
          }
        } catch {
          // Keep default redirect if state parsing fails
        }
        
        setCallbackState({
          status: 'error',
          message: error.message || 'Failed to connect Instagram account'
        });
        toast.error('Instagram connection failed');
        setTimeout(() => navigate(redirectDestination), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, user]);

  const getIcon = () => {
    switch (callbackState.status) {
      case 'loading':
        return <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-12 h-12 text-red-600" />;
      default:
        return <Instagram className="w-12 h-12 text-purple-600" />;
    }
  };

  const getStatusColor = () => {
    switch (callbackState.status) {
      case 'loading':
        return 'text-purple-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-sm border-gray-200 bg-white">
        <CardContent className="p-8 text-center space-y-6">
          {/* Instagram Logo Background */}
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto">
            <Instagram className="w-10 h-10 text-white" />
          </div>

          {/* Status Icon */}
          <div className="flex justify-center">
            {getIcon()}
          </div>

          {/* Status Message */}
          <div className="space-y-2">
            <h1 className={`text-xl font-semibold ${getStatusColor()}`}>
              {callbackState.status === 'loading' && 'Connecting Instagram...'}
              {callbackState.status === 'success' && 'Instagram Connected!'}
              {callbackState.status === 'error' && 'Connection Failed'}
            </h1>
            <p className="text-gray-600">
              {callbackState.message}
            </p>
          </div>

          {/* Additional Info */}
          {callbackState.status === 'loading' && (
            <p className="text-sm text-gray-500">
              Please wait while we complete the connection process...
            </p>
          )}
          
          {callbackState.status === 'success' && (
            <p className="text-sm text-gray-500">
              Redirecting you back to complete your setup...
            </p>
          )}

          {callbackState.status === 'error' && (
            <p className="text-sm text-gray-500">
              You'll be redirected back to try again...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstagramCallback; 