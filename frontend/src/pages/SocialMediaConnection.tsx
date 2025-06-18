import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Instagram, CheckCircle, AlertCircle, Loader2, ArrowRight, Zap, Shield, Clock } from 'lucide-react';

interface BusinessData {
  businessID: string;
  businessName: string;
  socialMedia?: {
    instagram?: {
      connected: boolean;
      lastConnected?: string;
      username?: string;
      tokenDetails?: {
        longLivedExpiresAt: string;
      };
    };
  };
}

const SocialMediaConnection = () => {
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      fetchBusinessData();
    } else if (!loading && !user) {
      setError('User not authenticated');
      setIsLoading(false);
    }
  }, [user, loading]);

  const fetchBusinessData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_BASE_URL}/businesses?userId=${encodeURIComponent(user.sub)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(response);
      if (!response.ok) {
        throw new Error('Failed to fetch business data');
      }

      const data = await response.json();
      const businesses = data.businesses || [];
      
      // Get the first business (should be filtered by userId already)
      const userBusiness = businesses[0];

      if (!userBusiness) {
        setError('No business found. Please complete onboarding first.');
        setTimeout(() => navigate('/onboarding'), 2000);
        return;
      }

      setBusinessData(userBusiness);
    } catch (err) {
      console.error('Error fetching business data:', err);
      setError('Failed to load business information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectInstagram = () => {
    setIsConnecting(true);
    
    // Generate state parameter for CSRF protection
    const state = btoa(JSON.stringify({
      userId: user?.sub,
      timestamp: Date.now(),
      source: 'social_media_page'
    }));

    // Store state in localStorage for validation
    localStorage.setItem('instagram_oauth_state', state);

    // Construct Instagram OAuth URL
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_INSTAGRAM_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_INSTAGRAM_REDIRECT_URI,
      scope: import.meta.env.VITE_INSTAGRAM_SCOPE,
      response_type: 'code',
      state: state
    });

    const oauthUrl = `${import.meta.env.VITE_INSTAGRAM_AUTH_URL}?${params.toString()}`;
    
    // Redirect to Instagram OAuth
    window.location.href = oauthUrl;
  };

  const handleProceedToDashboard = () => {
    if (isInstagramConnected()) {
      navigate('/dashboard');
    } else {
      toast.error('Please connect your Instagram account to continue');
    }
  };

  const isInstagramConnected = () => {
    return businessData?.socialMedia?.instagram?.connected || false;
  };

  const getConnectionStatus = () => {
    if (!businessData?.socialMedia?.instagram) {
      return { status: 'not_connected', message: 'Not connected' };
    }

    const instagram = businessData.socialMedia.instagram;
    
    if (!instagram.connected) {
      return { status: 'not_connected', message: 'Not connected' };
    }

    // Check if token is expired
    if (instagram.tokenDetails?.longLivedExpiresAt) {
      const expirationDate = new Date(instagram.tokenDetails.longLivedExpiresAt);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        return { status: 'expired', message: 'Token expired - please reconnect' };
      }
      
      if (daysUntilExpiry <= 7) {
        return { status: 'expiring_soon', message: `Expires in ${daysUntilExpiry} days` };
      }
    }

    return { status: 'connected', message: 'Connected successfully' };
  };

  const formatLastConnected = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-sm border-gray-200 bg-white">
          <CardContent className="p-8 text-center space-y-6">
            <Loader2 className="w-12 h-12 text-gray-600 animate-spin mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Loading Your Business</h2>
              <p className="text-gray-600">Checking your social media connections...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-sm border-gray-200 bg-white">
          <CardContent className="p-8 text-center space-y-6">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Error</h2>
              <p className="text-gray-600">{error}</p>
            </div>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const connectionStatus = getConnectionStatus();
  const isConnected = isInstagramConnected();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Connect Your Social Media</h1>
            <p className="text-xl text-gray-600">
              Almost there! Connect Instagram to activate your AI assistant.
            </p>
            <p className="text-gray-500">
              {businessData?.businessName && `Setting up for ${businessData.businessName}`}
            </p>
          </div>
        </div>

        {/* Instagram Connection Card */}
        <Card className="shadow-sm border-gray-200 bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Instagram Business</h3>
                <p className="text-sm text-gray-600">Required for automated posting</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus.status === 'connected' ? 'bg-green-500' :
                  connectionStatus.status === 'expiring_soon' ? 'bg-yellow-500' :
                  'bg-gray-400'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">
                    {isConnected ? (
                      businessData?.socialMedia?.instagram?.username || 'Connected Account'
                    ) : 'Instagram Account'}
                  </p>
                  <p className={`text-sm ${
                    connectionStatus.status === 'connected' ? 'text-green-600' :
                    connectionStatus.status === 'expiring_soon' ? 'text-yellow-600' :
                    'text-gray-500'
                  }`}>
                    {connectionStatus.message}
                  </p>
                </div>
              </div>
              
              {isConnected ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Connected</span>
                </div>
              ) : (
                <Button
                  onClick={handleConnectInstagram}
                  disabled={isConnecting}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  {isConnecting ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    'Connect Instagram'
                  )}
                </Button>
              )}
            </div>

            {/* Connection Details */}
            {isConnected && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-gray-500">Last Connected</p>
                  <p className="font-medium text-gray-900">
                    {formatLastConnected(businessData?.socialMedia?.instagram?.lastConnected)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-500">Account Status</p>
                  <p className="font-medium text-gray-900">Active</p>
                </div>
              </div>
            )}

            {/* Features List */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">What we'll do with your Instagram:</h4>
              <ul className="space-y-2">
                <li className="flex items-center space-x-3 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Post AI-generated content automatically</span>
                </li>
                <li className="flex items-center space-x-3 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Schedule posts based on your triggers</span>
                </li>
                <li className="flex items-center space-x-3 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Maintain your brand voice and style</span>
                </li>
                <li className="flex items-center space-x-3 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>Secure access (you can revoke anytime)</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate('/onboarding')}
            variant="ghost"
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Setup
          </Button>

          <Button
            onClick={handleProceedToDashboard}
            disabled={!isConnected}
            className={`${
              isConnected 
                ? 'bg-gray-900 hover:bg-gray-800 text-white' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            } transition-all duration-200`}
          >
            <span>Proceed to Dashboard</span>
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Help Text */}
        {!isConnected && (
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center space-x-2 text-blue-800 text-sm">
              <Clock className="w-4 h-4" />
              <span>Instagram connection is required to activate your AI marketing assistant</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialMediaConnection; 