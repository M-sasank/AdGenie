import { useState } from "react";
import AuthModal from "@/components/auth/AuthModal";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import SocialProof from "@/components/landing/SocialProof";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleSwitchMode = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
  };

  const handleGoToDashboard = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      setAuthMode('login');
      setShowAuthModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        onLogin={handleLogin}
        onGetStarted={handleGetStarted}
        onGoToDashboard={handleGoToDashboard}
        showGoToDashboard={!!user}
      />
      <main>
        <Hero onGetStarted={handleGetStarted} />
        <Features />
        <SocialProof />
        <CTA onGetStarted={handleGetStarted} />
      </main>
      <Footer />
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onSwitchMode={handleSwitchMode}
      />
    </div>
  );
};

export default Index;
