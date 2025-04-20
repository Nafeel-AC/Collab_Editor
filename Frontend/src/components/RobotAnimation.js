import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RobotAnimation = () => {
  const navigate = useNavigate();
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Load the Spline viewer script if it hasn't been loaded yet
    if (!document.querySelector('script[src*="splinetool/viewer"]')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';
      script.async = true;
      script.onload = () => setScriptLoaded(true);
      document.head.appendChild(script);
    } else {
      setScriptLoaded(true);
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 flex">
        {/* Left side - Welcome text */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-start pl-8 md:pl-16 lg:pl-24 z-10">
          <div className="max-w-lg">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 mb-4">
              Welcome to the AI Assistant
            </h1>
            <p className="text-gray-300 text-lg md:text-xl mb-8">
              Your intelligent coding companion that helps you build better projects faster. Ask questions, get help with debugging, or generate new code.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/chatbot')} 
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-purple-500/30"
              >
                Get Started
              </button>
              <button 
                onClick={() => navigate('/home')} 
                className="px-8 py-3 bg-transparent border border-gray-500 text-gray-300 rounded-full hover:border-gray-300 hover:text-white transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Right side - Animation */}
        <div className="absolute right-0 w-full md:w-3/5 h-full">
          {scriptLoaded ? (
            <spline-viewer 
              url="https://prod.spline.design/PiIBXn9DRONKpSrz/scene.splinecode"
              className="w-full h-full"
            ></spline-viewer>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-white text-2xl">Loading robot...</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Purple gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default RobotAnimation; 