import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Target, Clock, TrendingUp, Instagram, Bot } from "lucide-react";
import AuthModal from "@/components/auth/AuthModal";
import AnimatedShowcase from "@/components/AnimatedShowcase";
import { motion, useScroll, useTransform } from "framer-motion";

const Index = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

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
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="container mx-auto px-6 py-8 flex justify-between items-center backdrop-blur-xl bg-white/80 sticky top-0 z-50 border-b border-gray-100"
      >
        <motion.div 
          className="flex items-center space-x-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            AdGenie
          </h1>
        </motion.div>
        <div className="flex items-center space-x-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="ghost" 
              onClick={handleLogin}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Sign In
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={handleGetStarted}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get Started
            </Button>
          </motion.div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section 
        style={{ opacity, scale }}
        className="container mx-auto px-6 py-24 text-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Badge variant="secondary" className="mb-8 bg-gray-100 text-gray-700 border-0 px-4 py-2 rounded-full font-medium">
            🤖 Your Personal Marketing Intern
          </Badge>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-6xl md:text-7xl font-bold mb-8 text-gray-900 tracking-tight leading-none"
        >
          Never Miss a Marketing
          <br />
          <motion.span 
            className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent"
            animate={{ 
              backgroundPosition: ['0%', '100%'],
            }}
            transition={{ 
              duration: 5,
              repeat: Infinity,
              repeatType: "reverse"
            }}
            style={{ 
              backgroundSize: '200% auto',
            }}
          >
            Opportunity Again
          </motion.span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto font-medium leading-relaxed"
        >
          AdGenie automatically creates and posts perfect Instagram content for your business. 
          Weather changes? Holiday approaching? Your AI marketing intern is already on it.
        </motion.p>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              size="lg" 
              onClick={handleGetStarted} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
            >
              <Zap className="mr-2 h-5 w-5" />
              Start Your 7-Day Free Trial
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-8 py-4 rounded-full text-lg"
            >
              Watch Demo
            </Button>
          </motion.div>
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-sm text-gray-500 font-medium"
        >
          Setup in 5 minutes • No credit card required • Cancel anytime
        </motion.p>
      </motion.section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-24 bg-muted/30">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground tracking-tight">
            How AdGenie Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Set it up once, then watch your AI marketing intern work 24/7
          </p>
        </motion.div>

        {/* Animated Showcase */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-20"
        >
          <AnimatedShowcase />
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            {
              icon: Target,
              gradient: "from-green-400 to-blue-500",
              title: "5-Minute Setup",
              description: "Tell us about your business, connect Instagram, and activate your triggers",
              items: [
                "Business profile setup",
                "Instagram connection",
                "Smart trigger activation"
              ],
              color: "green"
            },
            {
              icon: Bot,
              gradient: "from-purple-400 to-pink-500",
              title: "AI Creates Content",
              description: "Your marketing intern generates perfect posts based on weather, holidays, and trends",
              items: [
                "Weather-triggered posts",
                "Holiday celebrations",
                "Custom brand voice"
              ],
              color: "purple"
            },
            {
              icon: TrendingUp,
              gradient: "from-orange-400 to-red-500",
              title: "Auto-Posting",
              description: "Sit back and watch engagement grow as your intern posts at perfect moments",
              items: [
                "Automatic Instagram posting",
                "Perfect timing",
                "Manual boost button"
              ],
              color: "orange"
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <motion.div
                whileHover={{ 
                  scale: 1.05,
                  transition: { type: "spring", stiffness: 300 }
                }}
              >
                <Card className="border-0 shadow-lg bg-white rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-6">
                    <motion.div 
                      className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <feature.icon className="h-8 w-8 text-white" />
                    </motion.div>
                    <CardTitle className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-600 text-lg leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 text-gray-600">
                      {feature.items.map((item, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: i * 0.1 }}
                          className="flex items-center"
                        >
                          <div className={`w-2 h-2 bg-${feature.color}-400 rounded-full mr-3`}></div>
                          {item}
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-6 py-24"
      >
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-16 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold mb-16 text-gray-900 tracking-tight"
          >
            Join 1,000+ Businesses Already Using AdGenie
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { value: "94%", color: "blue", text: "Increase in engagement" },
              { value: "5min", color: "purple", text: "Average setup time" },
              { value: "24/7", color: "green", text: "AI marketing intern" }
            ].map((stat, index) => (
              <motion.div 
                key={stat.value}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="text-center"
              >
                <motion.div 
                  className={`text-5xl font-bold text-${stat.color}-600 mb-4`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {stat.value}
                </motion.div>
                <p className="text-gray-700 font-medium text-lg">{stat.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-6 py-24 text-center bg-gray-50"
      >
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-5xl font-bold mb-6 text-gray-900 tracking-tight"
        >
          Ready to Activate Your Marketing Intern?
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto font-medium leading-relaxed"
        >
          Join thousands of businesses that never miss a marketing opportunity
        </motion.p>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            size="lg" 
            onClick={handleGetStarted} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-12 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
          >
            <Instagram className="mr-3 h-6 w-6" />
            Start Free Trial
          </Button>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-6 py-12 border-t border-gray-100"
      >
        <div className="text-center text-gray-500 font-medium">
          <p>&copy; 2024 AdGenie. All rights reserved.</p>
        </div>
      </motion.footer>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
      />
    </div>
  );
};

export default Index;
