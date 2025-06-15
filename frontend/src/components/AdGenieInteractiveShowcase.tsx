
import React, { useState, useEffect } from 'react';
import { User, Instagram, Check, CloudRain, ArrowRight, Coffee, SlidersHorizontal } from 'lucide-react';

const SceneWrapper = ({ isActive, children, animation }) => (
  <div className={`
    absolute inset-0 w-full h-full flex items-center justify-center
    z-10 transition-all duration-700
    ${isActive ? 'opacity-100 pointer-events-auto scene-enter' : 'opacity-0 pointer-events-none scene-exit'}
    ${animation || ''}
  `}>
    {children}
  </div>
);

const ToggleSwitch = ({ label, checked, isHighlighted }) => (
  <div className={`
    flex items-center justify-between p-4 rounded-xl transition-all duration-300 border select-none
    ${isHighlighted ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-200 shadow-lg' : 'bg-gray-100/70 border-gray-200'}
  `}>
    <span className="text-sm font-medium text-gray-800">{label}</span>
    <div className={`
      relative inline-flex items-center h-7 rounded-full w-12 transition-colors duration-300
      ${checked ? 'bg-blue-600' : 'bg-gray-300'}
    `}>
      <span className={`
        inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-300
        ${checked ? 'translate-x-6' : 'translate-x-1'}
      `}/>
    </div>
  </div>
);

const AiCore = ({ scene, status }) => {
  const sceneStyles = [
    "w-24 h-24 bg-gray-300 blur-2xl",
    "w-48 h-48 bg-blue-400 blur-3xl",
    "w-64 h-64 bg-purple-500 blur-3xl",
  ];
  const statusClasses = {
    thinking: 'animate-spin-slow',
    idle: '',
    processing: 'animate-pulse'
  }
  return (
    <div className={`
      absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full z-0
      transition-all duration-1000 ${sceneStyles[scene]} ${statusClasses[status]}
    `} />
  );
};

export default function AdGenieInteractiveShowcase() {
  const [step, setStep] = useState(0);
  const [profileData, setProfileData] = useState({ name: '', voice: '', products: '' });
  const [triggers, setTriggers] = useState({ sunny: false, rainy: false });
  const [aiStatus, setAiStatus] = useState('idle');
  const [showInstaPost, setShowInstaPost] = useState(false);
  const [typedCaption, setTypedCaption] = useState('');

  const timeline = [
    { step: 0, scene: 0, duration: 2000,   action: () => setProfileData({ name: "The Wanderer's Café", voice: '', products: '' }) },
    { step: 1, scene: 0, duration: 2100,   action: () => setProfileData(p => ({ ...p, voice: 'Warm & Friendly' })) },
    { step: 2, scene: 0, duration: 2300,   action: () => setProfileData(p => ({ ...p, products: 'Iced Lattes, Croissants...' })) },
    { step: 3, scene: 1, duration: 2400,   action: () => setAiStatus('thinking') },
    { step: 4, scene: 1, duration: 1800,   action: () => setTriggers({ sunny: true, rainy: false }) },
    { step: 5, scene: 1, duration: 2100,   action: () => setTriggers({ sunny: true, rainy: true }) },
    { step: 6, scene: 2, duration: 1200,   action: () => { setAiStatus('processing'); setShowInstaPost(false); setTypedCaption(''); }},
    { step: 7, scene: 2, duration: 1200,   action: () => { setShowInstaPost(true); setAiStatus('idle'); }},
    { step: 8, scene: 2, duration: 4000,   action: () => {} },
  ];

  useEffect(() => {
    const currentTimelineStep = timeline[step];
    if (currentTimelineStep) currentTimelineStep.action();
    const timer = setTimeout(() => setStep(prev => (prev + 1) % timeline.length), currentTimelineStep.duration);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step === 8) {
      const caption = "Don't let the Yangon rain get you down! 🌧️ Come find shelter with us and warm up with a rich hot chocolate and a buttery croissant.";
      let index = 0;
      setTypedCaption("");
      const typingTimer = setInterval(() => {
        if (index < caption.length) {
          setTypedCaption(caption.substring(0, index + 1));
          index++;
        } else {
          clearInterval(typingTimer);
        }
      }, 45);
      return () => clearInterval(typingTimer);
    }
  }, [step]);

  // Helper to check current scene
  const isScene = (sceneId) => timeline[step].scene === sceneId;

  return (
    <div className="w-full max-w-5xl mx-auto h-[590px] bg-black rounded-2xl p-2 sm:p-4 flex items-center justify-center font-sans shadow-2xl relative">
      <div className="w-full h-full bg-[#f0f0f5] rounded-lg relative overflow-hidden shadow-inner">

        {/* Dynamic Faded Scene BG */}
        <div className={`absolute inset-0 z-0 pointer-events-none
          transition-all duration-700
          ${isScene(0) ? "bg-white/80" : isScene(1) ? "bg-blue-50/80" : "bg-purple-50/70"}
        `} />

        <AiCore scene={timeline[step].scene} status={aiStatus} />

        {/* --- ONBOARDING --- */}
        <SceneWrapper isActive={isScene(0)} animation="scene-animate-in">
          <div className="w-full h-full flex flex-col items-center justify-center p-8 z-10">
            <h1 className="text-5xl font-bold text-gray-900 mb-3 fade-in-delayed-1">Welcome to AdGenie.</h1>
            <p className="text-gray-600 text-lg mb-10 fade-in-delayed-2">Your AI marketing intern sets up in minutes.</p>
            <div className="flex space-x-8">
              {/* Business Profile Card */}
              <div className="bg-white/60 p-6 rounded-2xl shadow-xl border backdrop-blur-md w-80 fade-in-delayed-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Business Profile</h3>
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <div className={`p-3 rounded-lg transition-all duration-300 ${step >= 0 ? 'bg-blue-50' : 'bg-gray-100'}`}>
                    <p className="text-sm font-medium text-gray-800">{profileData.name || '...'}</p>
                  </div>
                  <div className={`p-3 rounded-lg transition-all duration-300 ${step >= 1 ? 'bg-blue-50' : 'bg-gray-100'}`}>
                    <p className="text-sm font-medium text-gray-800">{profileData.voice || '...'}</p>
                  </div>
                  <div className={`p-3 rounded-lg transition-all duration-300 ${step >= 2 ? 'bg-blue-50' : 'bg-gray-100'}`}>
                    <p className="text-sm font-medium text-gray-800">{profileData.products || '...'}</p>
                  </div>
                </div>
              </div>
              {/* Social Card */}
              <div className="bg-white/60 p-6 rounded-2xl shadow-xl border backdrop-blur-md w-80 fade-in-delayed-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">Connect Socials</h3>
                  <Instagram className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg cursor-default">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500"></div>
                      <span className="text-sm font-medium">wanderers_cafe</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white"/>
                    </div>
                  </button>
                </div>
                <p className="text-xs text-center mt-4 text-gray-500">Securely connected. Ready to post.</p>
              </div>
            </div>
          </div>
        </SceneWrapper>

        {/* --- STRATEGY --- */}
        <SceneWrapper isActive={isScene(1)} animation="scene-animate-in">
          <div className="w-full h-full flex flex-col items-center justify-center bg-transparent p-8 z-10">
            <div className="w-16 h-16 bg-white shadow-md rounded-2xl flex items-center justify-center mb-4 fade-in-delayed-1">
              <SlidersHorizontal className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 fade-in-delayed-2">Activate Your Strategy</h1>
            <p className="text-gray-600 text-lg mb-8 text-center max-w-xl fade-in-delayed-3">Your AI has prepared a marketing plan. Activate the triggers you want to run automatically.</p>
            <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border grid grid-cols-1 gap-y-4 fade-in-delayed-4">
              <h3 className="font-semibold text-gray-800 text-md mb-2">🌦️ Weather Triggers</h3>
              <ToggleSwitch label="Post when it's Hot & Sunny" checked={triggers.sunny} isHighlighted={step === 4}/>
              <ToggleSwitch label="Post when it's Raining" checked={triggers.rainy} isHighlighted={step === 5}/>
            </div>
            <button className={`mt-8 font-bold py-4 px-10 rounded-xl shadow-lg transition-all duration-500 fade-in-delayed-5
              ${step >= 5 ? 'bg-blue-600 text-white hover:scale-105' : 'bg-gray-300 text-gray-500'}`}>
                Activate
            </button>
          </div>
        </SceneWrapper>

        {/* --- AUTOMATION / TRIGGER --- */}
        <SceneWrapper isActive={isScene(2)} animation="scene-animate-in">
          <div className="w-full h-full flex items-center justify-center p-8 z-10">
            <div className="flex flex-col md:flex-row w-full justify-center items-center space-y-8 md:space-y-0 md:space-x-20">
              {/* Weather Event Trigger */}
              <div className="text-center text-white fade-in-delayed-1">
                <div className="w-32 h-32 bg-blue-900/50 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30 shadow-2xl relative">
                  <div className={`absolute inset-0 bg-blue-400/20 rounded-2xl transition-all duration-500 ${step === 6 ? 'scale-110 opacity-100' : 'scale-100 opacity-0'}`} />
                  <CloudRain className="w-16 h-16 text-blue-300" />
                </div>
                <h3 className="font-semibold text-lg">Trigger Event</h3>
                <p className="text-sm text-gray-400">Raining in Yangon</p>
              </div>
              <ArrowRight className={`w-16 h-16 text-blue-400 transition-opacity duration-500 fade-in-delayed-4
                ${step >= 7 ? 'opacity-100' : 'opacity-30'}`} />

              {/* Instagram Post Preview */}
              <div className="fade-in-delayed-5">
                <div className={`bg-white rounded-2xl border border-gray-200 shadow-2xl w-80 transition-all duration-700 ease-in-out
                  ${showInstaPost ? 'scale-110 opacity-100 scene-insta-visible' : 'scale-90 opacity-0 scene-insta-hidden'}`}>
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
                    <div
                      className="h-40 bg-gray-200 rounded-lg mb-2 flex items-center justify-center bg-cover"
                      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1500673922987-e212871fec22?auto=format&fit=crop&w=400&q=80')" }}
                    />
                    <div className="text-xs text-gray-800 leading-normal min-h-[48px]">
                      <span className="font-semibold">wanderers_cafe</span>
                      <span className="ml-1.5">{typedCaption}</span>
                      {step === 8 && typedCaption.length < 130 &&
                        <span className="inline-block w-0.5 h-3 bg-black ml-0.5 animate-pulse" />}
                    </div>
                    {step > 8 && (
                      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100 pt-2">
                        <span className="flex items-center space-x-2">
                          <span>❤️ 127</span>
                          <span>💬 23</span>
                          <span>📤 15</span>
                        </span>
                        <span>Posted successfully</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SceneWrapper>

        {/* --- PROGRESS BAR AT THE VERY TOP --- */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-transparent z-20">
          <div className="h-full bg-blue-600 transition-all duration-1000 ease-linear"
            style={{ width: `${(step / (timeline.length -1)) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
