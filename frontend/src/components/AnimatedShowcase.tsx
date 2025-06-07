
import { useState, useEffect } from "react";
import { MousePointer, Instagram, User, Calendar, Cloud, Zap } from "lucide-react";

const AnimatedShowcase = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const steps = [
    { id: 'signup', duration: 2000 },
    { id: 'details', duration: 2500 },
    { id: 'weather', duration: 2000 },
    { id: 'post', duration: 3000 },
    { id: 'pause', duration: 1500 }
  ];

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setTimeout(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, steps[currentStep].duration);

    return () => clearTimeout(timer);
  }, [currentStep, isPlaying]);

  const getMousePosition = () => {
    switch(currentStep) {
      case 0: return { x: '15%', y: '25%' }; // Signup button
      case 1: return { x: '50%', y: '40%' }; // Form fields
      case 2: return { x: '75%', y: '30%' }; // Weather trigger
      case 3: return { x: '80%', y: '70%' }; // Instagram post
      default: return { x: '50%', y: '50%' };
    }
  };

  const mousePos = getMousePosition();

  return (
    <div className="relative w-full max-w-5xl mx-auto h-96 bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-100 overflow-hidden">
      {/* Background Browser Window */}
      <div className="absolute inset-0 bg-white rounded-3xl shadow-inner">
        {/* Browser Header */}
        <div className="h-8 bg-gray-100 rounded-t-3xl flex items-center px-4 border-b border-gray-200">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
          </div>
          <div className="ml-4 text-xs text-gray-500 font-medium">adgenie.com</div>
        </div>

        {/* Main Content Area */}
        <div className="p-8 h-full relative">
          {/* Signup Button */}
          <div className={`absolute top-8 left-16 transition-all duration-500 ${
            currentStep >= 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            <button className={`px-6 py-3 bg-blue-600 text-white rounded-full font-medium transition-all duration-300 ${
              currentStep === 0 ? 'ring-4 ring-blue-200 shadow-lg' : ''
            }`}>
              Get Started
            </button>
          </div>

          {/* Form Fields */}
          <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 w-80 transition-all duration-700 ${
            currentStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <User className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-800">Business Setup</span>
              </div>
              <div className={`h-10 bg-gray-100 rounded-lg transition-all duration-500 ${
                currentStep === 1 ? 'bg-blue-50 border-2 border-blue-200' : ''
              }`}></div>
              <div className="h-10 bg-gray-100 rounded-lg"></div>
              <div className="h-10 bg-gray-100 rounded-lg"></div>
            </div>
          </div>

          {/* Weather Trigger */}
          <div className={`absolute top-16 right-20 transition-all duration-700 ${
            currentStep >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}>
            <div className={`bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-2xl shadow-lg transition-all duration-500 ${
              currentStep === 2 ? 'ring-4 ring-blue-200 animate-pulse' : ''
            }`}>
              <Cloud className="w-8 h-8 mb-2" />
              <div className="text-sm font-medium">Weather Alert</div>
              <div className="text-xs opacity-90">Sunny day detected</div>
            </div>
          </div>

          {/* AI Processing */}
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ${
            currentStep >= 2 ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="flex items-center space-x-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full shadow-lg">
              <Zap className={`w-5 h-5 ${currentStep === 2 ? 'animate-spin' : ''}`} />
              <span className="font-medium">AI Creating Content...</span>
            </div>
          </div>

          {/* Instagram Post */}
          <div className={`absolute bottom-8 right-16 transition-all duration-700 ${
            currentStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className={`bg-white rounded-2xl border border-gray-200 shadow-lg w-64 transition-all duration-500 ${
              currentStep === 3 ? 'ring-4 ring-green-200 shadow-xl' : ''
            }`}>
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Instagram className="w-6 h-6 text-pink-500" />
                  <span className="font-semibold text-gray-800">New Post</span>
                </div>
                <div className="h-32 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-lg mb-3 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">☀️ Sunny Day Special!</span>
                </div>
                <div className="text-xs text-gray-500">
                  "Perfect weather for our outdoor collection! ☀️ #sunny #fashion"
                </div>
              </div>
            </div>
          </div>

          {/* Success Indicator */}
          <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-500 ${
            currentStep >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-medium text-sm">
              ✅ Posted Successfully!
            </div>
          </div>
        </div>

        {/* Animated Mouse Cursor */}
        <div 
          className="absolute w-6 h-6 pointer-events-none transition-all duration-1000 ease-in-out z-10"
          style={{ 
            left: mousePos.x, 
            top: mousePos.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <MousePointer className={`w-6 h-6 text-gray-800 transition-all duration-300 ${
            [0, 1, 2, 3].includes(currentStep) ? 'scale-110' : 'scale-100'
          }`} />
          {[0, 1, 2, 3].includes(currentStep) && (
            <div className="absolute -inset-2 bg-blue-400 rounded-full opacity-30 animate-ping"></div>
          )}
        </div>
      </div>

      {/* Play/Pause Control */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full p-2 hover:bg-white transition-all duration-200"
      >
        {isPlaying ? '⏸️' : '▶️'}
      </button>

      {/* Step Indicators */}
      <div className="absolute bottom-4 left-4 flex space-x-2">
        {steps.slice(0, -1).map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default AnimatedShowcase;
