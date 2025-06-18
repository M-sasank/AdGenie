import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bot, Instagram, Zap, Calendar, TrendingUp, Coffee, Sun, Snowflake, Cloud, MapPin, Clock, Sparkles, Target, Wifi, Database, Cog, Brain, Cpu, PartyPopper, ArrowRight, CheckCircle, AlertCircle, Play, Settings, Bell, Activity, Users, Heart, MessageCircle, Share2, BarChart3, Lightbulb, Edit } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { businessService } from "@/services/businessService";
import { toast } from "sonner";
import EditBusinessModal from "@/components/EditBusinessModal";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const [businessData, setBusinessData] = useState(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [isLearning, setIsLearning] = useState(true);
  const [isGeneratingBoost, setIsGeneratingBoost] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkBusinessProfile = async () => {
      if (user) {
        try {
          const response = await businessService.getBusiness(user.sub);
          if (response.success && response.data) {
            setBusinessData(response.data);
            setIsLearning(false);
          } else {
            // Business profile doesn't exist, show learning state
            setIsLearning(true);
          }
        } catch (error) {
          console.error('Error checking business profile:', error);
          setIsLearning(true);
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
          setIsLearning(false);
          
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

  const handleContinueSetup = () => {
    navigate('/onboarding');
  };

  const handleBoostNow = async () => {
    setIsGeneratingBoost(true);
    try {
      // Simulate AI content generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      toast.success('New boost post generated and scheduled!');
    } catch (error) {
      toast.error('Failed to generate boost post. Please try again.');
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

  // Learning/Setup State
  if (isLearning) {
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
                {user.firstName || user.email}
              </span>
              <Button variant="outline" onClick={handleSignOut} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-16">
          {/* Minimalist AI Learning State */}
          <div className="max-w-2xl mx-auto text-center space-y-12">
            <div className="space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-900 rounded-2xl mb-6">
                <Brain className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight leading-tight">
                Setting up your AI marketing assistant
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg mx-auto">
                While you complete your setup, we're preparing intelligent marketing strategies tailored to your business.
              </p>
            </div>

            {/* Clean Progress Indicators */}
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Database className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Analyzing Data</h3>
                  <p className="text-sm text-gray-600">Learning your industry patterns</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Cog className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Configuring System</h3>
                  <p className="text-sm text-gray-600">Setting up automation triggers</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Preparing Content</h3>
                  <p className="text-sm text-gray-600">Crafting personalized messages</p>
                </div>
              </div>

              {/* Minimal Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <span>Processing</span>
                </div>
                <div className="w-64 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-gray-900 rounded-full transition-all duration-1000 ease-out" style={{ width: '65%' }}></div>
                </div>
              </div>
            </div>

            {/* Clean CTA */}
            <Button 
              onClick={handleContinueSetup}
              className="h-12 px-8 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-xl transition-all duration-200"
            >
              Continue Setup
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
                    <span>Generating...</span>
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
                      <p className="text-2xl font-bold text-gray-900">2h</p>
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
                          <Cloud className="w-4 h-4 text-blue-600" />
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
                    <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-yellow-50 to-orange-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Sun className="h-4 w-4 text-yellow-600" />
                          <Badge variant="outline" className="text-xs border-yellow-300 text-yellow-700">Weather Trigger</Badge>
                        </div>
                        <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">Published</Badge>
                      </div>
                      <p className="font-medium text-gray-900 mb-2">☀️ Perfect sunny day for iced coffee!</p>
                      <p className="text-sm text-gray-600 mb-3">
                        "Beat the heat with our signature cold brew! Made fresh daily with premium beans. 
                        Nothing says sunny day like a refreshing iced coffee. ☕❄️"
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">2 hours ago</span>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>❤️ 24</span>
                          <span>💬 7</span>
                          <span>📤 3</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-green-600" />
                          <Badge variant="outline" className="text-xs border-green-300 text-green-700">Monday Trigger</Badge>
                        </div>
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">Scheduled</Badge>
                      </div>
                      <p className="font-medium text-gray-900 mb-2">☕ Monday Motivation starts here!</p>
                      <p className="text-sm text-gray-600 mb-3">
                        "New week, new energy! Start your Monday right with our energizing espresso blend. 
                        Let's make this week amazing together! 💪"
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Scheduled for tomorrow 8:00 AM</span>
                        <Button variant="ghost" size="sm" className="text-xs">
                          <Play className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>

                    <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <PartyPopper className="h-4 w-4 text-purple-600" />
                          <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">Holiday Trigger</Badge>
                        </div>
                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-xs">Draft</Badge>
                      </div>
                      <p className="font-medium text-gray-900 mb-2">🎉 Thadingyut Festival Special!</p>
                      <p className="text-sm text-gray-600 mb-3">
                        "Celebrating the Festival of Lights with our community! Special traditional treats 
                        and warm beverages to brighten your celebration. 🏮✨"
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Ready for Thadingyut Festival</span>
                        <Button variant="ghost" size="sm" className="text-xs">
                          <ArrowRight className="w-3 h-3 mr-1" />
                          Edit & Approve
                        </Button>
                      </div>
                    </div>
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
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Monday Post</p>
                      <p className="text-xs text-gray-600">Tomorrow at 8:00 AM</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <PartyPopper className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Thadingyut Festival</p>
                      <p className="text-xs text-gray-600">In 5 days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Sun className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Weekend Special</p>
                      <p className="text-xs text-gray-600">This Saturday</p>
                    </div>
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
    </div>
  );
};

export default Dashboard;
