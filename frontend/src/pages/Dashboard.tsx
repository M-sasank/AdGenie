import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bot, Instagram, Zap, Calendar, TrendingUp, Coffee, Sun, Cloud, CloudRain, Clock, Sparkles, PartyPopper, ArrowRight, CheckCircle, Play, Activity, Users, Heart, MessageCircle, Share2, BarChart3, Lightbulb, Edit } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { businessService } from "@/services/businessService";
import { toast } from "sonner";
import EditBusinessModal from "@/components/EditBusinessModal";
import { parseISO, differenceInMinutes, differenceInHours, format, isToday, isTomorrow } from 'date-fns';

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [businessData, setBusinessData] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [isGeneratingBoost, setIsGeneratingBoost] = useState(false);
  const [nextPostDelta, setNextPostDelta] = useState<string>("--");
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [publishedPostsList, setPublishedPostsList] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();

  // Helper function to check Instagram connection status
  const isInstagramConnected = (businessData: any) => {
    return businessData?.socialMedia?.instagram?.connected === true;
  };

  useEffect(() => {
    const checkBusinessProfile = async () => {
      if (user) {
        try {
          const response = await businessService.getBusiness(user.sub);
          if (response.success && response.data) {
            // Business profile exists, now check Instagram connection
            if (isInstagramConnected(response.data)) {
              // Both business and Instagram are set up - show Dashboard
              setBusinessData(response.data);
            } else {
              // Business exists but Instagram not connected - redirect to social media connection
              navigate('/social-media-connection');
              return;
            }
          } else {
            // Business profile doesn't exist - redirect to onboarding
            navigate('/onboarding');
            return;
          }
        } catch (error) {
          console.error('Error checking business profile:', error);
          // On error, redirect to onboarding to be safe
          navigate('/onboarding');
          return;
        }
      }
      setLoadingBusiness(false);
    };

    if (!loading && user) {
      checkBusinessProfile();
    }
  }, [user, loading, navigate]);

  // Check for Instagram reconnection on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const instagramReconnected = urlParams.get('instagram_reconnected');
    
    if (instagramReconnected === 'true') {
      // Check for updated business data from Instagram callback
      const updatedBusinessData = localStorage.getItem('updated_business_dataObject');
      if (updatedBusinessData) {
        try {
          const parsedData = JSON.parse(updatedBusinessData);
          setBusinessData(parsedData);
          localStorage.removeItem('updated_business_dataObject');
          
          toast.success('Instagram account reconnected successfully!');
        } catch (error) {
          console.error('Error parsing updated business data:', error);
          toast.error('Error processing Instagram reconnection');
        }
      }
      
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, []);

  // Compute upcoming posts whenever businessData changes
  useEffect(() => {
    if (!businessData) return;

    const postsRaw: any[] = (businessData as any).upcomingPosts || [];
    const now = new Date();

    const futurePosts = postsRaw
      .filter(p => {
        if (!p || !p.scheduledTime) return false;
        const ts = parseISO(p.scheduledTime);
        return ts > now;
      })
      .sort((a, b) => parseISO(a.scheduledTime).getTime() - parseISO(b.scheduledTime).getTime());

    // Next post delta
    if (futurePosts.length === 0) {
      setNextPostDelta("--");
    } else {
      const firstTs = parseISO(futurePosts[0].scheduledTime);
      const mins = differenceInMinutes(firstTs, now);
      if (mins < 60) {
        setNextPostDelta(`${mins}m`);
      } else {
        const hrs = differenceInHours(firstTs, now);
        setNextPostDelta(`${hrs}h`);
      }
    }

    // Build display list (max 3)
    const list = futurePosts.slice(0, 3).map(item => {
      const ts = parseISO(item.scheduledTime);
      let subtitle = format(ts, 'PPpp');
      if (isToday(ts)) {
        subtitle = `Today at ${format(ts, 'p')}`;
      } else if (isTomorrow(ts)) {
        subtitle = `Tomorrow at ${format(ts, 'p')}`;
      }

      const triggerMap: Record<string, any> = {
        hotWeather: { icon: Sun, color: 'text-yellow-600', bg: 'bg-yellow-100', title: 'Hot & Sunny' },
        coldWeather: { icon: Cloud, color: 'text-blue-600', bg: 'bg-blue-100', title: 'Cold Day' },
        rain: { icon: CloudRain, color: 'text-blue-800', bg: 'bg-blue-100', title: 'Rainy Weather' },
        mondayCoffee: { icon: Clock, color: 'text-green-600', bg: 'bg-green-100', title: 'Monday Coffee' },
      };

      const map = triggerMap[item.triggerType] || { icon: Calendar, color: 'text-gray-600', bg: 'bg-gray-100', title: item.triggerType };
      return { ...item, subtitle, ...map };
    });

    setUpcomingList(list);
  }, [businessData]);

  // Compute published posts whenever businessData changes
  useEffect(() => {
    if (!businessData) return;

    const publishedRaw: any[] = (businessData as any).publishedPosts || [];
    const now = new Date();

    // Sort by timestamp descending (newest first) and take first 3
    const recentPosts = publishedRaw
      .filter(p => p && p.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3)
      .map(post => {
        const postDate = new Date(post.timestamp);
        let timeAgo = '';
        
        const minutesDiff = differenceInMinutes(now, postDate);
        if (minutesDiff < 60) {
          timeAgo = `${minutesDiff}m ago`;
        } else {
          const hoursDiff = differenceInHours(now, postDate);
          if (hoursDiff < 24) {
            timeAgo = `${hoursDiff}h ago`;
          } else if (isToday(postDate)) {
            timeAgo = 'Today';
          } else {
            timeAgo = format(postDate, 'MMM d');
          }
        }

        // Truncate caption for display
        const displayCaption = post.caption?.length > 100 
          ? post.caption.substring(0, 100) + '...' 
          : post.caption;

        // Determine trigger styling based on triggerCategory
        let triggerIcon = Sun;
        let triggerColor = 'text-yellow-600';
        let triggerBg = 'bg-yellow-100';
        let triggerLabel = 'Weather Trigger';
        
        if (post.triggerCategory === 'holiday') {
          triggerIcon = PartyPopper;
          triggerColor = 'text-purple-600';
          triggerBg = 'bg-purple-100';
          triggerLabel = 'Holiday Trigger';
        } else if (post.triggerCategory === 'timeBased') {
          triggerIcon = Clock;
          triggerColor = 'text-green-600';
          triggerBg = 'bg-green-100';
          triggerLabel = 'Time-Based Trigger';
        }

        return {
          ...post,
          timeAgo,
          displayCaption,
          triggerIcon,
          triggerColor,
          triggerBg,
          triggerLabel
        };
      });

    setPublishedPostsList(recentPosts);
  }, [businessData]);

  if (loading || loadingBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-6">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-600 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  const handleBoostNow = async () => {
    if (!businessData?.businessID) {
      toast.error('Business profile not found. Please complete your setup first.');
      return;
    }

    setIsGeneratingBoost(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessID: businessData.businessID
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      
      toast.success(
        <div>
          <div className="font-medium">Content Generated Successfully!</div>
          <div className="text-sm text-gray-600 mt-1">
            Your post has been queued for Instagram and will be published shortly.
          </div>
        </div>
      );
      
    } catch (error: any) {
      console.error('Boost generation error:', error);
      toast.error(
        error.message || 'Failed to generate boost post. Please try again.'
      );
    } finally {
      setIsGeneratingBoost(false);
    }
  };

  const handleTriggerToggle = (triggerPath: string, value: boolean) => {
    // Update trigger in business data
    toast.success(value ? 'Trigger activated' : 'Trigger deactivated');
  };

  const handleBusinessUpdate = (updatedData: any) => {
    setBusinessData(prev => ({ ...prev, ...updatedData }));
  };

  // Active Dashboard State
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight">AdGenie</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 font-medium">
              {businessData?.businessName || user.firstName || user.email}
            </span>
            <Button variant="outline" onClick={handleSignOut} className="border-gray-300 text-gray-700 hover:bg-gray-50">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Welcome Section with Boost Now */}
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                  Welcome back
                </h2>
                <p className="text-gray-600 text-lg">
                  Your AI assistant is managing campaigns for {businessData?.businessName}.
                </p>
              </div>
              <Button 
                onClick={handleBoostNow}
                disabled={isGeneratingBoost}
                className="h-12 px-8 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-all duration-200"
              >
                {isGeneratingBoost ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating Content...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <span>Boost Now!</span>
                  </div>
                )}
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6 mb-10">
              <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Active Triggers</p>
                      <p className="text-2xl font-bold text-gray-900">6</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Posts This Month</p>
                      <p className="text-2xl font-bold text-gray-900">24</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Instagram className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Engagement Rate</p>
                      <p className="text-2xl font-bold text-gray-900">+24%</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Next Post</p>
                      <p className="text-2xl font-bold text-gray-900">{nextPostDelta}</p>
                    </div>
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Business Profile & Triggers */}
              <div className="lg:col-span-1 space-y-6">
                {/* Business Profile */}
                <Card className="border-gray-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-gray-900">
                      <Coffee className="h-5 w-5 text-gray-600" />
                      <span>Business Profile</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-gray-700">Business Name</span>
                      <span className="text-gray-600">{businessData?.businessName}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-gray-700">Business Type</span>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700">{businessData?.businessType}</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-gray-700">Location</span>
                      <span className="text-gray-600">{businessData?.location}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-gray-700">Brand Voice</span>
                      <Badge variant="outline" className="border-gray-300 text-gray-600">{businessData?.brandVoice}</Badge>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="font-medium text-gray-700">Peak Time</span>
                      <span className="text-gray-600">{businessData?.peakTime}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Active Triggers Management */}
                <Card className="border-gray-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-gray-900">
                      <Zap className="h-5 w-5 text-gray-600" />
                      <span>Active Triggers</span>
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Manage your automation triggers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Sun className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium text-gray-700">Hot & Sunny</span>
                        </div>
                        <Switch defaultChecked onCheckedChange={(checked) => handleTriggerToggle('weather.hotSunny', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CloudRain className="w-4 h-4 text-blue-800" />
                          <span className="text-sm font-medium text-gray-700">Rainy Weather</span>
                        </div>
                        <Switch defaultChecked onCheckedChange={(checked) => handleTriggerToggle('weather.rainy', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">Monday Coffee</span>
                        </div>
                        <Switch defaultChecked onCheckedChange={(checked) => handleTriggerToggle('timeBased.mondayCoffee', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-gray-700">Weekend Specials</span>
                        </div>
                        <Switch defaultChecked onCheckedChange={(checked) => handleTriggerToggle('timeBased.weekendSpecials', checked)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <PartyPopper className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-gray-700">Local Festivals</span>
                        </div>
                        <Switch defaultChecked onCheckedChange={(checked) => handleTriggerToggle('holidays.localFestivals', checked)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent AI Posts & Content Preview */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Posts */}
                <Card className="border-gray-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-gray-900">
                      <Sparkles className="h-5 w-5 text-gray-600" />
                      <span>Recent AI Posts</span>
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Latest content from your marketing assistant
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {publishedPostsList.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No published posts yet</p>
                        <p className="text-gray-400 text-xs mt-1">Your AI-generated content will appear here once published</p>
                      </div>
                    ) : (
                      publishedPostsList.map((post, index) => {
                        const TriggerIcon = post.triggerIcon;
                        return (
                          <div key={post.postID || index} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-yellow-50 to-orange-50">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <TriggerIcon className={`h-4 w-4 ${post.triggerColor}`} />
                                <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">{post.triggerLabel}</Badge>
                              </div>
                              <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Published</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">
                              {post.displayCaption}
                            </p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">{post.timeAgo}</span>
                              <div className="flex items-center space-x-2">
                                {(post.permalink || post.postID) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-xs"
                                    onClick={() => window.open(post.permalink || `https://www.instagram.com/p/${post.postID}`, '_blank')}
                                  >
                                    <Instagram className="w-3 h-3 mr-1" />
                                    View on Instagram
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Performance Insights */}
                <Card className="border-gray-200 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-gray-900">
                      <TrendingUp className="h-5 w-5 text-gray-600" />
                      <span>Performance Insights</span>
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      AI-generated content performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">+32%</p>
                        <p className="text-sm text-gray-600">Engagement Rate</p>
                        <p className="text-xs text-green-600 mt-1">vs manual posts</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">4.2x</p>
                        <p className="text-sm text-gray-600">Content Frequency</p>
                        <p className="text-xs text-blue-600 mt-1">posts per week</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">89%</p>
                        <p className="text-sm text-gray-600">Trigger Success</p>
                        <p className="text-xs text-purple-600 mt-1">auto-posted</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-orange-500" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Boost Now!
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate('/holidays')}>
                  <PartyPopper className="w-4 h-4 mr-2" />
                  Manage Holidays
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setIsEditModalOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Business Details
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Post Published</p>
                      <p className="text-xs text-gray-600">☀️ Perfect sunny day for iced coffee!</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Trigger Activated</p>
                      <p className="text-xs text-gray-600">Weather: Hot & Sunny</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-2 bg-purple-50 rounded-lg">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Content Generated</p>
                      <p className="text-xs text-gray-600">Monday motivation post</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Snapshot */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <span>Today's Engagement</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-600">Likes</span>
                    </div>
                    <span className="font-semibold text-gray-900">47</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-600">Comments</span>
                    </div>
                    <span className="font-semibold text-gray-900">12</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Share2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600">Shares</span>
                    </div>
                    <span className="font-semibold text-gray-900">8</span>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Engagement Rate</span>
                      <Badge className="bg-green-100 text-green-800 text-xs">+24%</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <span>AI Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-50 rounded-lg border-l-3 border-yellow-400">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Best Time to Post</p>
                    <p className="text-xs text-yellow-700">Your audience is most active between 2-4 PM on weekdays</p>
                  </div>
                  
                  <div className="p-3 bg-blue-50 rounded-lg border-l-3 border-blue-400">
                    <p className="text-sm font-medium text-blue-800 mb-1">Trending Hashtag</p>
                    <p className="text-xs text-blue-700">#LocalCoffee is trending in your area - consider using it!</p>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg border-l-3 border-green-400">
                    <p className="text-sm font-medium text-green-800 mb-1">Content Tip</p>
                    <p className="text-xs text-green-700">Posts with emojis get 25% more engagement for your business type</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <span>Upcoming</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingList.length === 0 ? (
                    <p className="text-sm text-gray-500">-- no upcoming posts --</p>
                  ) : (
                    upcomingList.map((item, idx) => {
                      const IconComp = item.icon;
                      return (
                        <div key={idx} className="flex items-center space-x-3">
                          <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center`}>
                            <IconComp className={`w-4 h-4 ${item.color}`} />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.title}</p>
                            <p className="text-xs text-gray-600">{item.subtitle}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Edit Business Modal */}
      {businessData && (
        <EditBusinessModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          businessData={businessData}
          onUpdate={handleBusinessUpdate}
        />
      )}
    </div>
  );
};

export default Dashboard;
