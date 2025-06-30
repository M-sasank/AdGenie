
import React, { useState, useEffect } from 'react';
import { User, Instagram, Check, Zap, CloudRain, Sun, ArrowRight, ThumbsUp, MessageCircle, Send, Coffee, Mic, MapPin, ShoppingBag, Sparkles, SlidersHorizontal, MousePointer } from 'lucide-react';

const SceneWrapper = ({ isActive, children, className = "" }) => (
  <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${className}`}>
    {children}
  </div>
);

const ToggleSwitch = ({ label, checked, onToggle, isHighlighted }) => (
  <div className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 border ${isHighlighted ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-200 shadow-lg' : 'bg-gray-100/70 border-gray-200'}`} onClick={onToggle}>
    <span className="text-sm font-medium text-gray-800">{label}</span>
    <div className={`relative inline-flex items-center h-7 rounded-full w-12 transition-colors duration-300 cursor-pointer ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
  </div>
);

const AiCore = ({ scene, status }) => {
    const sceneStyles = [
        "w-24 h-24 bg-gray-300 blur-2xl", // Onboarding
        "w-48 h-48 bg-blue-400 blur-3xl", // Strategy
        "w-64 h-64 bg-purple-500 blur-3xl", // Automation
    ];

    const statusClasses = {
        thinking: 'animate-[spin_5s_linear_infinite]',
        idle: '',
        processing: 'animate-pulse'
    }

    return (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-1000 ease-in-out ${sceneStyles[scene]} ${statusClasses[status]}`}></div>
    )
}

export default function AnimatedShowcase() {
  const [step, setStep] = useState(0);
  const [profileData, setProfileData] = useState({ name: '', voice: '', products: '' });
  const [typedProfileData, setTypedProfileData] = useState({ name: '', voice: '', products: '' });
  const [isTyping, setIsTyping] = useState('');
  const [isInstagramConnected, setIsInstagramConnected] = useState(false);
  const [triggers, setTriggers] = useState({ sunny: false, rainy: false });
  const [aiStatus, setAiStatus] = useState('idle');
  const [showInstaPost, setShowInstaPost] = useState(false);
  const [typedCaption, setTypedCaption] = useState('');

  const fullProfileData = {
      name: "The Wanderer's Café",
      voice: 'Warm & Friendly',
      products: 'Iced Lattes, Croissants...'
  }

  const timeline = [
    // --- Scene 1: Onboarding ---
    { step: 0, scene: 0, duration: 2500, action: () => { setIsTyping('name'); } },
    { step: 1, scene: 0, duration: 2500, action: () => { setIsTyping('voice'); } },
    { step: 2, scene: 0, duration: 3000, action: () => { setIsTyping('products'); } },
    { step: 3, scene: 0, duration: 1500, action: () => { setIsInstagramConnected(true); } },
    
    // --- Scene 2: Strategy ---
    { step: 4, scene: 1, duration: 2500, action: () => { setIsTyping(''); setAiStatus('thinking'); } },
    { step: 5, scene: 1, duration: 2000, action: () => setTriggers({ sunny: true, rainy: false }) },
    { step: 6, scene: 1, duration: 2500, action: () => setTriggers({ sunny: true, rainy: true }) },
    
    // --- Scene 3: Automation ---
    { step: 7, scene: 2, duration: 2000, action: () => { setAiStatus('processing'); setShowInstaPost(false); setTypedCaption(''); } },
    { step: 8, scene: 2, duration: 1500, action: () => { setShowInstaPost(true); setAiStatus('idle'); } },
    { step: 9, scene: 2, duration: 7500, action: () => {} }, // Caption typing & pause
  ];

  useEffect(() => {
    // FIX: Reset state when the animation cycle restarts
    if (step === 0) {
        setTypedProfileData({ name: '', voice: '', products: '' });
        setProfileData({ name: '', voice: '', products: '' });
        setIsInstagramConnected(false);
        setShowInstaPost(false);
        setTypedCaption('');
    }

    const currentTimelineStep = timeline[step];
    if (currentTimelineStep) {
        currentTimelineStep.action();
    }

    const timer = setTimeout(() => {
      setStep(prev => (prev + 1) % timeline.length);
    }, currentTimelineStep.duration);

    return () => clearTimeout(timer);
  }, [step]);
  
  useEffect(() => {
      if (!isTyping) return;

      let index = 0;
      const fieldToType = isTyping;
      const textToType = fullProfileData[fieldToType];
      
      const typingTimer = setInterval(() => {
          if (index < textToType.length) {
              setTypedProfileData(p => ({...p, [fieldToType]: textToType.substring(0, index + 1)}));
              index++;
          } else {
              clearInterval(typingTimer);
              setProfileData(p => ({...p, [fieldToType]: textToType}));
              setIsTyping('');
          }
      }, 100);

      return () => clearInterval(typingTimer);

  }, [isTyping]);

   useEffect(() => {
    if (step === 9) {
      const caption = "Don't let the Yangon rain get you down! 🌧️ Come find shelter with us and warm up with a rich hot chocolate and a buttery croissant.";
      let index = 0;
      const typingTimer = setInterval(() => {
        if (index < caption.length) {
          setTypedCaption(caption.substring(0, index + 1));
          index++;
        } else {
          clearInterval(typingTimer);
        }
      }, 50);
      return () => clearInterval(typingTimer);
    }
   }, [step]);


  return (
    <div className="w-full h-full flex items-center justify-center font-sans bg-gray-100">
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes fade-in-up {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
          .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
        `}</style>
      <div className="w-full max-w-5xl h-[600px] bg-transparent rounded-xl relative shadow-2xl">
        {/* macOS Window Frame */}
        <div className="absolute inset-0 bg-[#f0f0f5] rounded-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-9 bg-gray-200 flex items-center px-4 border-b border-gray-300/80 z-10">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>

            <div className="pt-9 h-full">
                {timeline[step] && <AiCore scene={timeline[step].scene} status={aiStatus} />}

                {/* --- SCENE 1: ONBOARDING --- */}
                <SceneWrapper isActive={timeline[step] && timeline[step].scene === 0} className="flex flex-col items-center justify-center p-8">
                    <h1 className="text-5xl font-bold text-gray-900 mb-3 animate-fade-in">Welcome to AdGenie.</h1>
                    <p className="text-gray-600 text-lg mb-10 animate-fade-in" style={{animationDelay: '0.2s'}}>Your AI marketing intern sets up in minutes.</p>
                    <div className="flex space-x-8">
                        <div className="bg-white/60 p-6 rounded-2xl shadow-xl border backdrop-blur-md w-80 animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-800">Business Profile</h3><User className="w-5 h-5 text-gray-400" /></div>
                            <div className="space-y-3">
                                <div className={`p-3 rounded-lg transition-all duration-300 ${isTyping === 'name' || profileData.name ? 'bg-blue-50' : 'bg-gray-100'}`}><p className="text-sm font-medium text-gray-800 h-5">{typedProfileData.name}{isTyping === 'name' && <span className="animate-pulse">|</span>}</p></div>
                                <div className={`p-3 rounded-lg transition-all duration-300 ${isTyping === 'voice' || profileData.voice ? 'bg-blue-50' : 'bg-gray-100'}`}><p className="text-sm font-medium text-gray-800 h-5">{typedProfileData.voice}{isTyping === 'voice' && <span className="animate-pulse">|</span>}</p></div>
                                <div className={`p-3 rounded-lg transition-all duration-300 ${isTyping === 'products' || profileData.products ? 'bg-blue-50' : 'bg-gray-100'}`}><p className="text-sm font-medium text-gray-800 h-5">{typedProfileData.products}{isTyping === 'products' && <span className="animate-pulse">|</span>}</p></div>
                            </div>
                        </div>
                        <div className={`bg-white/60 p-6 rounded-2xl shadow-xl border backdrop-blur-md w-80 transition-all duration-700 ease-out ${profileData.products ? 'opacity-100 animate-fade-in-up' : 'opacity-0'}`}>
                            <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-gray-800">Connect Socials</h3><Instagram className="w-5 h-5 text-gray-400" /></div>
                            <div className="space-y-3">
                                <div className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg">
                                   <div className="flex items-center space-x-3"><div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500"></div><span className={`text-sm font-medium transition-opacity duration-500 ${isInstagramConnected ? 'opacity-100' : 'opacity-0'}`}>wanderers_cafe</span></div>
                                   <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${isInstagramConnected ? 'bg-green-500' : 'bg-gray-300'}`}>{isInstagramConnected && <Check className="w-4 h-4 text-white animate-fade-in"/>}</div>
                                </div>
                            </div>
                             <p className="text-xs text-center mt-4 text-gray-500 transition-opacity duration-500 ${isInstagramConnected ? 'opacity-100' : 'opacity-0'}">Securely connected. Ready to post.</p>
                        </div>
                    </div>
                </SceneWrapper>

                {/* --- SCENE 2: STRATEGY --- */}
                <SceneWrapper isActive={timeline[step] && timeline[step].scene === 1} className="flex flex-col items-center justify-center bg-[#f0f0f5]/80 backdrop-blur-sm p-8">
                    <div className="w-16 h-16 bg-white shadow-md rounded-2xl flex items-center justify-center mb-4 animate-fade-in"><SlidersHorizontal className="w-8 h-8 text-blue-600" /></div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2 animate-fade-in" style={{animationDelay: '0.2s'}}>Activate Your Strategy</h1>
                    <p className="text-gray-600 text-lg mb-8 text-center max-w-xl animate-fade-in" style={{animationDelay: '0.4s'}}>Your AI has prepared a marketing plan. Activate the triggers you want to run automatically.</p>
                    <div className="w-full max-w-lg bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-xl border grid grid-cols-1 gap-y-4 animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                        <h3 className="font-semibold text-gray-800 text-md mb-2">🌦️ Weather Triggers</h3>
                        <ToggleSwitch label="Post when it's Hot & Sunny" checked={triggers.sunny} onToggle={() => {}} isHighlighted={step === 5} />
                        <ToggleSwitch label="Post when it's Raining" checked={triggers.rainy} onToggle={() => {}} isHighlighted={step === 6} />
                    </div>
                     <button className={`mt-8 font-bold py-4 px-10 rounded-xl shadow-lg transition-all duration-500 animate-fade-in ${step >= 6 ? 'bg-blue-600 text-white hover:scale-105' : 'bg-gray-300 text-gray-500'}`} style={{animationDelay: '1.2s'}}>
                      Activate
                    </button>
                </SceneWrapper>

                {/* --- SCENE 3: AUTOMATION --- */}
                <SceneWrapper isActive={timeline[step] && timeline[step].scene === 2} className="bg-gray-900">
                   <div className="w-full h-full flex items-center justify-center p-8 animate-fade-in">
                     <div className="flex items-center justify-center space-x-16 w-full">
                        <div className="text-center text-white animate-fade-in">
                            <div className="w-32 h-32 bg-blue-900/50 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30 shadow-2xl relative">
                                <div className={`absolute inset-0 bg-blue-400/20 rounded-2xl transition-all duration-500 ${step === 7 ? 'scale-110 opacity-100' : 'scale-100 opacity-0'}`}></div>
                                <CloudRain className="w-16 h-16 text-blue-300" />
                            </div>
                            <h3 className="font-semibold text-lg">Trigger Event</h3>
                            <p className="text-sm text-gray-400">Raining in Yangon</p>
                        </div>

                        <ArrowRight className={`w-12 h-12 transition-opacity duration-500 ${showInstaPost ? 'opacity-100' : 'opacity-0'}`} style={{ color: '#4f46e5' }} />
                        
                        <div className={`bg-white rounded-2xl border border-gray-200 shadow-2xl w-80 transition-all duration-700 ease-in-out ${showInstaPost ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                            <div className="p-4">
                                <div className="flex items-center space-x-3 mb-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                                        <Coffee className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">wanderers_cafe</div>
                                        <div className="text-xs text-gray-500">Yangon</div>
                                    </div>
                                    <Instagram className="w-5 h-5 text-pink-500 ml-auto" />
                                </div>
                                <div className="h-40 bg-gray-200 rounded-lg mb-2 flex items-center justify-center bg-cover" style={{backgroundImage: "url('https://placehold.co/300x200/605550/FFFFFF?text=Cozy+Vibes')"}}></div>
                                <div className="text-xs text-gray-800 leading-normal h-16">
                                    <span className="font-semibold">wanderers_cafe</span>
                                    <span className="ml-1.5">{typedCaption}</span>
                                    {step === 9 && typedCaption.length < 130 && <span className="inline-block w-0.5 h-3 bg-black ml-0.5 animate-pulse" />}
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-2">
                                    <div className="flex space-x-3">
                                      <ThumbsUp className="w-4 h-4 text-gray-500" />
                                      <MessageCircle className="w-4 h-4 text-gray-500" />
                                      <Send className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <div className="text-[10px] font-semibold text-blue-600">POSTED BY ADGENIE AI</div>
                                </div>
                            </div>
                        </div>
                     </div>
                   </div>
                </SceneWrapper>
            </div>
        </div>
      </div>
    </div>
  );
}
