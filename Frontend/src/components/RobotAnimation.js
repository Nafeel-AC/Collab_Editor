import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { TypewriterEffect } from './TypewriterEffect';

const RobotAnimation = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Check if on mobile device
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen w-screen bg-black relative overflow-hidden">
      {/* Only show as background on desktop */}
      {!isMobile && (
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <DotLottieReact
            src="https://lottie.host/2d7d728a-7f45-432a-b2d8-582934cdfd6c/xYJD9c2kZ9.lottie"
            loop
            autoplay
            className="w-[100%] h-[100%] object-cover"
          />
        </div>
      )}
      
      {/* Enhanced gradient overlay for desktop */}
      {!isMobile && (
        <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-black/70 to-transparent pointer-events-none z-5"></div>
      )}
      
      {/* Content container - full-height on desktop, auto-height on mobile */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Text content - takes full height on desktop, normal flow on mobile */}
        <div className={`w-full ${!isMobile ? 'h-screen' : 'pt-16 pb-8'} flex flex-col justify-center items-center md:items-start px-6 md:pl-16 lg:pl-24`}>
          <div className="max-w-lg text-center md:text-left">
            {/* Static text for mobile */}
            {isMobile ? (
              <h1 className="text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                Welcome to the AI Assistant
              </h1>
            ) : (
              /* Typewriter effect for desktop */
            <TypewriterEffect
              words={[
                {
                  text: "Welcome",
                  className: "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500"
                },
                {
                  text: " to the ",
                  className: "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500"
                },
                {
                  text: "AI",
                  className: "text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500"
                },
                {
                  text: " Assistant",
                  className: "text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-blue-400"
                }
              ]}
              className="text-left mb-4"
            />
            )}
            
            <p className="text-gray-300 text-xl md:text-xl mb-8 z-20 relative">
              Your intelligent coding companion that helps you build better projects faster. Ask questions, get help with debugging, or generate new code.
            </p>
            
            <div className="flex gap-4 flex-col sm:flex-row">
              <button 
                onClick={() => navigate('/chatbot')} 
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-purple-500/30 w-full sm:w-auto"
              >
                Get Started
              </button>
              <button 
                onClick={() => navigate('/home')} 
                className="px-8 py-3 bg-transparent border border-gray-500 text-gray-300 rounded-full hover:border-gray-300 hover:text-white transition-all w-full sm:w-auto"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>

        {/* Animation below content on mobile */}
        {isMobile && (
          <div className="w-full h-[300px] flex items-center justify-center bg-black relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/0 to-black pointer-events-none z-5"></div>
          <DotLottieReact
            src="https://lottie.host/2d7d728a-7f45-432a-b2d8-582934cdfd6c/xYJD9c2kZ9.lottie"
            loop
            autoplay
              className="w-[130%] h-[130%] object-contain"
          />
        </div>
        )}
      </div>
    </div>
  );
};

export default RobotAnimation; 