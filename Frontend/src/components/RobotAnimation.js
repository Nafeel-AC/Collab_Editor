import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { TypewriterEffect } from './TypewriterEffect';

const RobotAnimation = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 flex">
        {/* Left side - Welcome text */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-start pl-8 md:pl-16 lg:pl-24 z-10">
          <div className="max-w-lg">
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
        <div className="absolute right-0 w-full md:w-3/5 h-full flex items-center justify-center">
          <DotLottieReact
            src="https://lottie.host/2d7d728a-7f45-432a-b2d8-582934cdfd6c/xYJD9c2kZ9.lottie"
            loop
            autoplay
            className="w-full h-full"
          />
        </div>
      </div>
      
      {/* Purple gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default RobotAnimation; 