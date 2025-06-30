import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bot, Instagram, Zap, Calendar, TrendingUp, Coffee, Sun, Cloud, CloudRain, Clock, Sparkles, PartyPopper, ArrowRight, CheckCircle, Play, Activity, Users, Heart, MessageCircle, Share2, BarChart3, Lightbulb, Edit, DollarSign, HelpCircle } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { businessService } from "@/services/businessService";
import { toast } from "sonner";
import EditBusinessModal from "@/components/EditBusinessModal";
import { BoostNowModal } from '@/components/BoostNowModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { parseISO, differenceInMinutes, differenceInHours, format, isToday, isTomorrow, differenceInWeeks } from 'date-fns';

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [businessData, setBusinessData] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [isGeneratingBoost, setIsGeneratingBoost] = useState(false);
  const [nextPostDelta, setNextPostDelta] = useState<string>("--");
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [publishedPostsList, setPublishedPostsList] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const navigate = useNavigate();

  // Trigger configuration mapping
  const triggerConfig = {
    weather: {
      hotSunny: { icon: Sun, color: 'text-yellow-600', label: 'Hot & Sunny' },
      rainy: { icon: CloudRain, color: 'text-blue-800', label: 'Rainy Weather' },
      coolPleasant: { icon: Cloud, color: 'text-blue-600', label: 'Cool & Pleasant' }
    },
    timeBased: {
      mondayCoffee: { icon: Clock, color: 'text-green-600', label: 'Monday Coffee' },
      paydaySales: { icon: DollarSign, color: 'text-green-700', label: 'Payday Sales' },
      weekendSpecials: { icon: Calendar, color: 'text-orange-600', label: 'Weekend Specials' }
    },
    holidays: {
      localFestivals: { icon: PartyPopper, color: 'text-purple-600', label: 'Local Festivals' },
      internationalHolidays: { icon: PartyPopper, color: 'text-purple-700', label: 'International Holidays' }
    },
    manual: {
      boostNow: { icon: Zap, color: 'text-orange-600', label: 'Manual Boost' }
    }
  };

  // Calculate active triggers count
  const activeTriggerCount = useMemo(() => {
    if (!businessData?.triggers) return 0;
    
    let count = 0;
    Object.values(businessData.triggers).forEach(category => {
      Object.values(category).forEach(isActive => {
        if (isActive === true) count++;
      });
    });
    return count;
  }, [businessData?.triggers]);

  // Calculate posts this month count
  const postsThisMonthCount = useMemo(() => {
    if (!businessData?.publishedPosts) return 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return businessData.publishedPosts.filter(post => {
      if (!post.timestamp) return false;
      const postDate = new Date(post.timestamp);
      return postDate.getMonth() === currentMonth && postDate.getFullYear() === currentYear;
    }).length;
  }, [businessData?.publishedPosts]);

  // Total engagement across all published posts (likes + comments + views + shares)
  const totalEngagement = useMemo(() => {
    if (typeof (businessData as any)?.totalEngagement === 'number') {
      return (businessData as any).totalEngagement;
    }
    return (businessData?.publishedPosts || []).reduce((acc: number, p: any) => {
      const a = p.analytics || {};
      return acc + (a.likeCount || 0) + (a.commentCount || 0) + (a.viewCount || 0) + (a.shareCount || 0);
    }, 0);
  }, [businessData?.publishedPosts, (businessData as any)?.totalEngagement]);

  // Average engagement per post
  const avgEngagementPerPost = useMemo(() => {
    const posts = businessData?.publishedPosts || [];
    if (posts.length === 0) return 0;
    return Math.round(totalEngagement / posts.length);
  }, [totalEngagement, businessData?.publishedPosts]);

  // Posts per week since first published post
  const postsPerWeek = useMemo(() => {
    const posts = businessData?.publishedPosts || [];
    if (posts.length === 0) return 0;
    const first = parseISO(posts[posts.length - 1].timestamp || new Date().toISOString());
    const weeks = Math.max(differenceInWeeks(new Date(), first), 1);
    return (posts.length / weeks).toFixed(1);
  }, [businessData?.publishedPosts]);

  // Trigger success: percentage of posts auto-generated via triggerCategory (not manual)
  const triggerSuccess = useMemo(() => {
    const posts = businessData?.publishedPosts || [];
    if (posts.length === 0) return 0;
    const auto = posts.filter(p => p.triggerCategory && p.triggerCategory !== 'manual').length;
    return Math.round((auto / posts.length) * 100);
  }, [businessData?.publishedPosts]);

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

    // Common transform function
    const transform = (post: any) => {
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

      // Determine trigger styling and background based on triggerCategory
      let triggerIcon = Sun;
      let triggerColor = 'text-yellow-600';
      let triggerBg = 'bg-yellow-100';
      let triggerLabel = 'Weather Trigger';
      let containerBg = 'bg-gradient-to-r from-yellow-50 to-orange-50';

      if (post.triggerCategory === 'holiday') {
        triggerIcon = PartyPopper;
        triggerColor = 'text-purple-600';
        triggerBg = 'bg-purple-100';
        triggerLabel = 'Holiday Trigger';
        containerBg = 'bg-gradient-to-r from-purple-50 to-purple-100';
      } else if (post.triggerCategory === 'timeBased') {
        triggerIcon = Clock;
        triggerColor = 'text-blue-600';
        triggerBg = 'bg-blue-100';
        triggerLabel = 'Time-Based Trigger';
        containerBg = 'bg-gradient-to-r from-blue-50 to-blue-100';
      } else if (post.triggerCategory === 'manual') {
        triggerIcon = Zap;
        triggerColor = 'text-orange-600';
        triggerBg = 'bg-orange-100';
        triggerLabel = 'Manual Boost';
        containerBg = 'bg-gradient-to-r from-orange-50 to-yellow-50';
      }

      return {
        ...post,
        timeAgo,
        displayCaption,
        triggerIcon,
        triggerColor,
        triggerBg,
        triggerLabel,
        containerBg,
      };
    };

    const sorted = publishedRaw
      .filter(p => p && p.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map(transform);

    setPublishedPostsList(sorted);
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

  const handleBoostSubmit = async (prompt: string) => {
    if (!businessData?.businessID) {
      toast.error('Business ID not found.');
      return;
    }
    setIsGeneratingBoost(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_BASE_URL}/manual-test-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessID: businessData.businessID, customPrompt: prompt }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate post');
      }
      const data = await response.json();
      toast.success('Boost post generated and queued for Instagram!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate post');
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
          <div 
            className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity duration-200"
            onClick={() => navigate("/")}
          >
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
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-4 gap-6 mb-10">
              <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 relative">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Active Triggers</p>
                      <p className="text-2xl font-bold text-gray-900">{activeTriggerCount}</p>
                    </div>
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="absolute bottom-3 right-3">
                      <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Number of automation triggers currently enabled (weather, time-based, holidays)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Card>
              
              <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 relative">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Posts This Month</p>
                      <p className="text-2xl font-bold text-gray-900">{postsThisMonthCount}</p>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Instagram className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="absolute bottom-3 right-3">
                      <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Total number of AI-generated posts published to Instagram this month</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Card>
              
              <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 relative">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Engagement</p>
                      <p className="text-2xl font-bold text-gray-900">{totalEngagement}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="absolute bottom-3 right-3">
                      <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Combined likes, comments, views, and shares across all your published posts (refreshed every 3 hrs)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Card>
              
              <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 relative">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Next Post</p>
                      <p className="text-2xl font-bold text-gray-900">{nextPostDelta}</p>
                    </div>
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="absolute bottom-3 right-3">
                      <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Time until your next scheduled AI-generated post is published</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Business Profile & Triggers */}
              <div className="lg:col-span-1 space-y-6">
                {/* Business Profile */}
                <Card className="border border-gray-200/70 bg-white/80 backdrop-blur-xl shadow-md rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-gray-900">
                      <Coffee className="h-5 w-5 text-gray-600" />
                      <span>Business Profile</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-500">
                      Key details at a glance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="divide-y divide-gray-100">
                    <dl className="text-sm">
                      <div className="flex items-start justify-between py-3">
                        <dt className="text-gray-500">Name</dt>
                        <dd className="font-medium text-gray-900 text-right max-w-[80%] truncate hover:overflow-visible" title={businessData?.businessName}>{businessData?.businessName}</dd>
                      </div>
                      <div className="flex items-start justify-between py-3">
                        <dt className="text-gray-500">Type</dt>
                        <dd><Badge variant="secondary" className="bg-gray-100 text-gray-700 lowercase first-letter:uppercase">{businessData?.businessType}</Badge></dd>
                      </div>
                      <div className="flex items-start justify-between py-3">
                        <dt className="text-gray-500">Location</dt>
                        <dd className="text-gray-900 text-right max-w-[80%] truncate" title={businessData?.location}>{businessData?.location?.split(',')[0] || '--'}</dd>
                      </div>
                      <div className="flex items-start justify-between py-3">
                        <dt className="text-gray-500">Brand Voice</dt>
                        <dd className="text-gray-900 lowercase first-letter:uppercase">{businessData?.brandVoice || '--'}</dd>
                      </div>
                      <div className="flex items-start justify-between py-3">
                        <dt className="text-gray-500">Peak Time</dt>
                        <dd className="text-gray-900 lowercase first-letter:uppercase">{businessData?.peakTime || '--'}</dd>
                      </div>
                    </dl>
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
                      {Object.entries(businessData?.triggers || {}).map(([category, triggers]) =>
                        Object.entries(triggers).filter(([, isActive]) => isActive === true).map(([triggerKey]) => {
                          const config = triggerConfig[category]?.[triggerKey];
                          if (!config) return null;
                          const IconComponent = config.icon;
                          return (
                            <div key={`${category}.${triggerKey}`} className="flex items-center space-x-3">
                              <IconComponent className={`w-4 h-4 ${config.color}`} />
                              <span className="text-sm font-medium text-gray-700">{config.label}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent AI Posts & Content Preview */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Posts */}
                <Card className="border-gray-200 bg-white shadow-sm">
                  <CardHeader className="flex items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="flex items-center space-x-2 text-gray-900">
                        <Sparkles className="h-5 w-5 text-gray-600" />
                        <span>Recent AI Posts</span>
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        Latest content from your marketing assistant
                      </CardDescription>
                    </div>
                    {publishedPostsList.length > 3 && (
                      <Button variant="link" className="mt-1" onClick={() => setShowAllPosts(!showAllPosts)}>
                        {showAllPosts ? 'Collapse' : 'View All'}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {publishedPostsList.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No published posts yet</p>
                        <p className="text-gray-400 text-xs mt-1">Your AI-generated content will appear here once published</p>
                      </div>
                    ) : (
                      (showAllPosts ? publishedPostsList : publishedPostsList.slice(0,3)).map((post, index) => {
                        const TriggerIcon = post.triggerIcon;
                        return (
                          <div key={post.postID || index} className={`border border-gray-200 rounded-lg p-4 ${post.containerBg}`}>
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
                        <p className="text-2xl font-bold text-gray-900">{avgEngagementPerPost}</p>
                        <p className="text-sm text-gray-600">Avg Engagement</p>
                        <p className="text-xs text-green-600 mt-1">per AI post</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{postsPerWeek}</p>
                        <p className="text-sm text-gray-600">Content Frequency</p>
                        <p className="text-xs text-blue-600 mt-1">posts / week</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{triggerSuccess}%</p>
                        <p className="text-sm text-gray-600">Auto Posts</p>
                        <p className="text-xs text-purple-600 mt-1">of total posts</p>
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
                <Button 
                  onClick={() => setBoostOpen(true)}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Boost Now
                </Button>

                <Button variant="outline" className="w-full" onClick={() => setIsEditModalOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Business Details
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Posts card moved here */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <span>Upcoming Posts</span>
                </CardTitle>
                <CardDescription className="text-gray-600">Scheduled AI posts</CardDescription>
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

      <BoostNowModal
        open={boostOpen}
        onClose={() => setBoostOpen(false)}
        onSubmit={handleBoostSubmit}
      />
    </div>
  );
};

export default Dashboard;
