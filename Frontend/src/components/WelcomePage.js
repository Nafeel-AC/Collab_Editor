import React from 'react';
import { Link } from 'react-router-dom';
import { ShootingStars } from './ui/shooting-stars';
import { StarsBackground } from './ui/stars-background';
import { Button } from './ui/moving-border';
import { TypewriterEffectSmooth } from './TypewriterEffect';

const WelcomePage = () => {
  // Words for typewriter effect
  const words = [
    {
      text: "Collaborative",
      className: "text-cyan-500"
    },
    {
      text: "Coding",
      className: "text-white"
    },
    {
      text: "Made",
      className: "text-white"
    },
    {
      text: "Simple",
      className: "text-purple-500"
    },
  ];

  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden">
      {/* Fixed position background effects to ensure full screen coverage */}
      <div className="fixed inset-0 w-screen h-screen z-0">
        <StarsBackground 
          className="absolute inset-0 w-full h-full" 
          starDensity={0.0018}
          twinkleProbability={1}
          minTwinkleSpeed={0.3}
          maxTwinkleSpeed={0.8}
        />
        <ShootingStars 
          minSpeed={15}
          maxSpeed={30}
          minDelay={200}
          maxDelay={1000}
          starColor="#ffffff"
          trailColor="#51e2f5"
          starWidth={18}
          starHeight={2}
          className="absolute inset-0 w-full h-full"
        />
        
        {/* Lighter gradient overlay that doesn't obscure stars at bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/40 pointer-events-none" />
      </div>
      
      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo/Brand with Dragon icon */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/Dragon.jpg" 
              alt="Dragon Logo" 
              className="w-20 h-20 rounded-full border-2 border-cyan-500 shadow-lg shadow-cyan-500/40 object-cover"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-2">
            CodeSync
          </h1>
          <p className="text-xl text-cyan-200">Empowering Future Collaboration</p>
        </div>
        
        {/* Main content with typewriter effect */}
        <div className="max-w-3xl mb-12">
          <div className="flex justify-center mb-6">
            <TypewriterEffectSmooth 
              words={words} 
              cursorClassName="bg-cyan-500" 
            />
          </div>
          <p className="text-lg text-gray-300 mb-8">
            Share your code in real-time, collaborate with team members, and get instant feedback.
            Our collaborative editor makes team coding seamless and efficient.
          </p>
          
          {/* Call to action buttons with moving borders */}
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Button
              as={Link}
              to="/LoginPage"
              containerClassName="w-40 h-12"
              borderClassName="bg-[radial-gradient(#06b6d4_40%,transparent_60%)] opacity-90"
              className="bg-black/30 border-cyan-500/30 text-white font-semibold"
              duration={2000}
            >
              Login
            </Button>
            
            <Button
              as={Link}
              to="/SignupPage"
              containerClassName="w-40 h-12"
              borderClassName="bg-[radial-gradient(#a855f7_40%,transparent_60%)] opacity-90"
              className="bg-black/30 border-purple-500/30 text-white font-semibold"
              duration={3000}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage; 