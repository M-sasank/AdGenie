import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { toast } from 'sonner';
import { Bot, MapPin, Clock, Coffee, Shirt, Heart, Sparkles, CheckCircle, Building2, Palette, Package, ArrowRight, ArrowLeft, User, MessageSquare, Zap, Sun, CloudRain, Calendar, DollarSign, PartyPopper } from 'lucide-react';
import { TriggerCard } from '@/components/onboarding/TriggerCard';
import { businessService } from '@/services/businessService';

interface BusinessData {
  businessName: string;
  location: string;
  businessType: string;
  brandVoice: string;
  peakTime: string;
  products: string;
  triggers: {
    weather: {
      hotSunny: boolean;
      rainy: boolean;
      coolPleasant: boolean;
    };
    timeBased: {
      mondayCoffee: boolean;
      paydaySales: boolean;
      weekendSpecials: boolean;
    };
    holidays: {
      localFestivals: boolean;
      internationalHolidays: boolean;
    };
    manual: {
      boostNow: boolean;
    };
  };
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to AdGenie',
    subtitle: 'Meet your AI marketing assistant',
    description: 'We\'ll create a smart marketing robot that understands your brand and automatically posts relevant content when the perfect moment arrives.',
    icon: Bot
  },
  {
    id: 'businessName',
    title: 'What\'s your business name?',
    subtitle: 'This is how we\'ll address your brand',
    description: 'Your business name helps us personalize every piece of content we create.',
    icon: Building2,
    field: 'businessName' as keyof BusinessData,
    placeholder: 'The Wanderer\'s Café'
  },
  {
    id: 'location',
    title: 'Where are you located?',
    subtitle: 'Location helps us connect with your community',
    description: 'We\'ll create location-specific content that resonates with your local audience.',
    icon: MapPin,
    field: 'location' as keyof BusinessData,
    placeholder: 'Yangon, Myanmar'
  },
  {
    id: 'businessType',
    title: 'What type of business is this?',
    subtitle: 'We\'ll tailor content to your industry',
    description: 'Understanding your business type helps us create relevant, industry-specific content.',
    icon: Coffee,
    field: 'businessType' as keyof BusinessData,
    isSelect: true,
    options: [
      { value: 'cafe', label: 'Café', icon: Coffee },
      { value: 'restaurant', label: 'Restaurant' },
      { value: 'clothing', label: 'Clothing Brand', icon: Shirt },
      { value: 'retail', label: 'Retail Store' },
      { value: 'service', label: 'Service Business' },
      { value: 'other', label: 'Other' }
    ]
  },
  {
    id: 'brandVoice',
    title: 'How should we communicate?',
    subtitle: 'Your brand\'s personality matters',
    description: 'This determines the tone and style of all your marketing content.',
    icon: MessageSquare,
    field: 'brandVoice' as keyof BusinessData,
    isSelect: true,
    options: [
      { value: 'warm-friendly', label: 'Warm & Friendly' },
      { value: 'professional', label: 'Professional' },
      { value: 'playful', label: 'Playful & Fun' },
      { value: 'elegant', label: 'Elegant & Sophisticated' },
      { value: 'casual', label: 'Casual & Relaxed' }
    ]
  },
  {
    id: 'peakTime',
    title: 'What are your business hours?',
    subtitle: 'Perfect timing for maximum impact',
    description: 'We\'ll schedule your content when your business is open and your audience is most active.',
    icon: Clock,
    field: 'peakTime' as keyof BusinessData,
    placeholder: '9:00 AM - 5:00 PM'
  },
  {
    id: 'products',
    title: 'What do you offer?',
    subtitle: 'Tell us about your products or services',
    description: 'This helps us create specific, compelling content about what makes your business special.',
    icon: Package,
    field: 'products' as keyof BusinessData,
    isTextarea: true,
    placeholder: 'Iced lattes, hot chocolate, croissants, artisan sandwiches...'
  },
  {
    id: 'triggers',
    title: 'Choose your marketing triggers',
    subtitle: 'When should your AI assistant post?',
    description: 'Select the moments when you want your marketing assistant to automatically create and post content.',
    icon: Zap,
    isTriggers: true
  },

  {
    id: 'complete',
    title: 'Your marketing assistant is ready!',
    subtitle: 'Intelligent automation starts now',
    description: 'Your AI assistant is trained and ready. It will monitor triggers and create perfectly timed, on-brand content automatically.',
    icon: CheckCircle
  }
];

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [businessData, setBusinessData] = useState<BusinessData>({
    businessName: '',
    location: '',
    businessType: '',
    brandVoice: '',
    peakTime: '',
    products: '',
    triggers: {
      weather: {
        hotSunny: true,
        rainy: true,
        coolPleasant: false
      },
      timeBased: {
        mondayCoffee: true,
        paydaySales: false,
        weekendSpecials: true
      },
      holidays: {
        localFestivals: true,
        internationalHolidays: false
      },
      manual: {
        boostNow: true
      }
    }
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingBusiness, setCheckingBusiness] = useState(true);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Helper function to check Instagram connection status
  const isInstagramConnected = (businessData: any) => {
    return businessData?.socialMedia?.instagram?.connected === true;
  };

  // Check if user already has a business profile
  useEffect(() => {
    const checkExistingBusiness = async () => {
      if (loading) return; // Wait for auth to load
      
      if (!user) {
        // User not authenticated, redirect to home
        navigate('/');
        return;
      }

      try {
        const response = await businessService.getBusiness(user.sub);
        if (response.success && response.data) {
          // Business profile exists, check Instagram connection and redirect accordingly
          if (isInstagramConnected(response.data)) {
            // Both business and Instagram are set up - redirect to dashboard
            navigate('/dashboard');
          } else {
            // Business exists but Instagram not connected - redirect to social media connection
            navigate('/social-media-connection');
          }
          return;
        } else {
          // No business profile exists - allow onboarding to proceed
          setCheckingBusiness(false);
        }
      } catch (error) {
        console.error('Error checking existing business:', error);
        // On error, allow onboarding to proceed (safer fallback)
        setCheckingBusiness(false);
      }
    };

    checkExistingBusiness();
  }, [user, loading, navigate]);

  const currentStepData = steps[currentStep];
  const isWelcomeStep = currentStepData.id === 'welcome';
  const isCompleteStep = currentStepData.id === 'complete';
  const isTriggersStep = currentStepData.id === 'triggers';

  const isFormStep = !isWelcomeStep && !isCompleteStep && !isTriggersStep;



  const createBusiness = async (data: BusinessData) => {
    console.log('Creating business with data:', data);
    
    const endpoint = `${import.meta.env.VITE_BACKEND_BASE_URL}/businesses`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        userId: user?.sub
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create business.');
    }

    const result = await response.json();
    const { businessID } = result;

    console.log('Business created with ID:', businessID);
    
    return { success: true };
  };

  const handleInputChange = (value: string) => {
    if (currentStepData.field) {
      setBusinessData(prev => ({ ...prev, [currentStepData.field!]: value }));
    }
  };

  const handleTriggerChange = (category: string, trigger: string, value: boolean) => {
    setBusinessData(prev => ({
      ...prev,
      triggers: {
        ...prev.triggers,
        [category]: {
          ...prev.triggers[category as keyof typeof prev.triggers],
          [trigger]: value
        }
      }
    }));
  };



  const handleNext = async () => {
    if (isCompleteStep) {
      setIsSubmitting(true);
      try {
        await createBusiness(businessData);
        toast.success('Your marketing assistant is ready!');
        setTimeout(() => navigate('/social-media-connection'), 1000);
      } catch (error) {
        toast.error('Something went wrong. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isFormStep && currentStepData.field) {
      const value = businessData[currentStepData.field];
      if (!value) {
        toast.error('Please fill in this field to continue');
        return;
      }
    }



    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
      setIsAnimating(false);
    }, 300);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const getCurrentValue = (): string => {
    if (currentStepData.field) {
      const value = businessData[currentStepData.field];
      // Only return string values for form fields
      return typeof value === 'string' ? value : '';
    }
    return '';
  };

  // Show loading state while checking business profile
  if (loading || checkingBusiness) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-sm border-gray-200 bg-white">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-12 h-12 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Checking Your Profile</h2>
              <p className="text-gray-600">Verifying your account status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderInput = () => {
    // Special handling for peak time step to use TimePicker with range
    if (currentStepData.id === 'peakTime') {
      return (
        <TimePicker
          label="Business Hours"
          value={businessData.peakTime}
          onChange={(time) => handleInputChange(time)}
          className="max-w-md mx-auto"
          isRange={true}
        />
      );
    }

    if (currentStepData.isSelect) {
      return (
        <Select onValueChange={handleInputChange} value={getCurrentValue()}>
          <SelectTrigger className="h-12 text-base border-gray-300 rounded-xl focus:border-gray-900 focus:ring-1 focus:ring-gray-900">
            <SelectValue placeholder="Choose an option" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-gray-200">
            {currentStepData.options?.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value} 
                className="text-base py-3 px-4 rounded-lg hover:bg-gray-50"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (currentStepData.isTextarea) {
      return (
        <Textarea
          value={getCurrentValue()}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={currentStepData.placeholder}
          className="min-h-[120px] text-base border-gray-300 rounded-xl focus:border-gray-900 focus:ring-1 focus:ring-gray-900 resize-none"
        />
      );
    }

    return (
      <Input
        value={getCurrentValue()}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={currentStepData.placeholder}
        className="h-12 text-base border-gray-300 rounded-xl focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
      />
    );
  };

  const renderTriggers = () => {
    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        {/* Weather Triggers */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Sun className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Weather-Based Posts</h3>
          </div>
          <div className="space-y-3 ml-11">
            <TriggerCard
              label="Hot & Sunny Days"
              description="Promote cold drinks and refreshing items"
              checked={businessData.triggers.weather.hotSunny}
              onToggle={(checked) => handleTriggerChange('weather', 'hotSunny', checked)}
            />
            <TriggerCard
              label="Rainy Weather"
              description="Promote warm, cozy items and indoor comfort"
              checked={businessData.triggers.weather.rainy}
              onToggle={(checked) => handleTriggerChange('weather', 'rainy', checked)}
            />
            <TriggerCard
              label="Cool & Pleasant"
              description="Perfect weather for outdoor dining or activities"
              checked={businessData.triggers.weather.coolPleasant}
              onToggle={(checked) => handleTriggerChange('weather', 'coolPleasant', checked)}
            />
          </div>
        </div>

        {/* Time-Based Triggers */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Time-Based Campaigns</h3>
          </div>
          <div className="space-y-3 ml-11">
            <TriggerCard
              label="Monday Coffee Motivation"
              description="Start the week with energizing posts every Monday"
              checked={businessData.triggers.timeBased.mondayCoffee}
              onToggle={(checked) => handleTriggerChange('timeBased', 'mondayCoffee', checked)}
            />
            <TriggerCard
              label="Payday Specials"
              description="Special offers on the last day of each month"
              checked={businessData.triggers.timeBased.paydaySales}
              onToggle={(checked) => handleTriggerChange('timeBased', 'paydaySales', checked)}
            />
            <TriggerCard
              label="Weekend Specials"
              description="Weekend promotions and relaxed vibes"
              checked={businessData.triggers.timeBased.weekendSpecials}
              onToggle={(checked) => handleTriggerChange('timeBased', 'weekendSpecials', checked)}
            />
          </div>
        </div>

        {/* Holiday Triggers */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <PartyPopper className="w-4 h-4 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Holiday Celebrations</h3>
          </div>
          <div className="space-y-3 ml-11">
            <TriggerCard
              label="Local Festivals"
              description="Celebrate local holidays and cultural events"
              checked={businessData.triggers.holidays.localFestivals}
              onToggle={(checked) => handleTriggerChange('holidays', 'localFestivals', checked)}
            />
            <TriggerCard
              label="International Holidays"
              description="New Year, Valentine's Day, Christmas, etc."
              checked={businessData.triggers.holidays.internationalHolidays}
              onToggle={(checked) => handleTriggerChange('holidays', 'internationalHolidays', checked)}
            />
          </div>
        </div>

        {/* Manual Trigger */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Manual Control</h3>
          </div>
          <div className="space-y-3 ml-11">
            <TriggerCard
              label='"Boost Now!" Button'
              description="Generate instant content when you need a quick boost"
              checked={businessData.triggers.manual.boostNow}
              onToggle={(checked) => handleTriggerChange('manual', 'boostNow', checked)}
            />
          </div>
        </div>
      </div>
    );
  };



  const IconComponent = currentStepData.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <span className="font-medium">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-gray-900 font-semibold">{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gray-900 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Main Card */}
        <Card className={`shadow-sm border-gray-200 bg-white transition-all duration-300 ease-out ${
          isAnimating ? 'opacity-50 scale-[0.98]' : 'opacity-100 scale-100'
        }`}>
          <CardContent className="p-12 text-center space-y-8">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-gray-900 flex items-center justify-center">
                <IconComponent className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                {currentStepData.title}
              </h1>
              <p className="text-xl text-gray-600 font-medium">
                {currentStepData.subtitle}
              </p>
              <p className="text-gray-600 leading-relaxed max-w-lg mx-auto">
                {currentStepData.description}
              </p>
            </div>

            {/* Input Field */}
            {isFormStep && (
              <div className="space-y-6">
                {renderInput()}
              </div>
            )}

            {/* Triggers Selection */}
            {isTriggersStep && (
              <div className="space-y-6">
                {renderTriggers()}
              </div>
            )}



            {/* Navigation */}
            <div className="flex items-center justify-between pt-6">
              <Button
                onClick={handleBack}
                variant="ghost"
                size="lg"
                disabled={currentStep === 0}
                className="h-12 px-6 text-gray-600 hover:text-gray-900 disabled:opacity-0 transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>

              <Button
                onClick={handleNext}
                size="lg"
                disabled={isSubmitting}
                className="h-12 px-8 bg-gray-900 hover:bg-gray-800 text-white transition-all duration-200 rounded-xl font-medium"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Setting up your assistant...</span>
                  </div>
                ) : isCompleteStep ? (
                  <div className="flex items-center space-x-2">
                    <span>Go to Dashboard</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Continue</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
