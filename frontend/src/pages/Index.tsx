
import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Badge, Chip } from "@nextui-org/react";
import { Zap, Target, Clock, TrendingUp, Instagram, Bot } from "lucide-react";
import AuthModal from "@/components/auth/AuthModal";
import AnimatedShowcase from "@/components/AnimatedShowcase";

const Index = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');

  const handleGetStarted = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="container mx-auto px-6 py-8 flex justify-between items-center backdrop-blur-xl bg-white/80 sticky top-0 z-50 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            AdGenie
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="light" 
            onClick={handleLogin}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Sign In
          </Button>
          <Button 
            onClick={handleGetStarted}
            color="primary"
            className="font-medium px-6 py-2.5 shadow-lg hover:shadow-xl transition-all duration-200"
            radius="full"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 text-center">
        <Chip 
          variant="flat" 
          color="default"
          className="mb-8 bg-gray-100 text-gray-700 px-4 py-2 font-medium"
          radius="full"
        >
          🤖 Your Personal Marketing Intern
        </Chip>
        <h1 className="text-6xl md:text-7xl font-bold mb-8 text-gray-900 tracking-tight leading-none">
          Never Miss a Marketing
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Opportunity Again
          </span>
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
          AdGenie automatically creates and posts perfect Instagram content for your business. 
          Weather changes? Holiday approaching? Your AI marketing intern is already on it.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button 
            size="lg" 
            onClick={handleGetStarted} 
            color="primary"
            className="font-medium px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
            radius="full"
            startContent={<Zap className="h-5 w-5" />}
          >
            Start Your 7-Day Free Trial
          </Button>
          <Button 
            size="lg" 
            variant="bordered" 
            className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-8 py-4 text-lg"
            radius="full"
          >
            Watch Demo
          </Button>
        </div>
        <p className="text-sm text-gray-500 font-medium">
          Setup in 5 minutes • No credit card required • Cancel anytime
        </p>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-24 bg-muted/30">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground tracking-tight">
            How AdGenie Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Set it up once, then watch your AI marketing intern work 24/7
          </p>
        </div>

        {/* Animated Showcase */}
        <div className="mb-20">
          <AnimatedShowcase />
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="shadow-lg bg-white p-8 hover:shadow-xl transition-all duration-300" radius="lg">
            <CardHeader className="pb-6 flex-col items-start">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">5-Minute Setup</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Tell us about your business, connect Instagram, and activate your triggers
              </p>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  Business profile setup
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  Instagram connection
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                  Smart trigger activation
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card className="shadow-lg bg-white p-8 hover:shadow-xl transition-all duration-300" radius="lg">
            <CardHeader className="pb-6 flex-col items-start">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">AI Creates Content</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Your marketing intern generates perfect posts based on weather, holidays, and trends
              </p>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  Weather-triggered posts
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  Holiday celebrations
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  Custom brand voice
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card className="shadow-lg bg-white p-8 hover:shadow-xl transition-all duration-300" radius="lg">
            <CardHeader className="pb-6 flex-col items-start">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Auto-Posting</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Sit back and watch engagement grow as your intern posts at perfect moments
              </p>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                  Automatic Instagram posting
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                  Perfect timing
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                  Manual boost button
                </li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Social Proof */}
      <section className="container mx-auto px-6 py-24">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-16 text-center">
          <h2 className="text-4xl font-bold mb-16 text-gray-900 tracking-tight">
            Join 1,000+ Businesses Already Using AdGenie
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-4">94%</div>
              <p className="text-gray-700 font-medium text-lg">Increase in engagement</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-purple-600 mb-4">5min</div>
              <p className="text-gray-700 font-medium text-lg">Average setup time</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600 mb-4">24/7</div>
              <p className="text-gray-700 font-medium text-lg">AI marketing intern</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-24 text-center bg-gray-50">
        <h2 className="text-5xl font-bold mb-6 text-gray-900 tracking-tight">
          Ready to Activate Your Marketing Intern?
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
          Join thousands of businesses that never miss a marketing opportunity
        </p>
        <Button 
          size="lg" 
          onClick={handleGetStarted} 
          color="primary"
          className="font-medium px-12 py-6 shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
          radius="full"
          startContent={<Instagram className="h-6 w-6" />}
        >
          Start Free Trial
        </Button>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-gray-100">
        <div className="text-center text-gray-500 font-medium">
          <p>&copy; 2024 AdGenie. All rights reserved.</p>
        </div>
      </footer>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />
    </div>
  );
};

export default Index;
