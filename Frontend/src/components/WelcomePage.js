import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const WelcomePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showButton, setShowButton] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Show welcome button after animation plays for a bit
  useEffect(() => {
    if (iframeLoaded) {
      const timer = setTimeout(() => {
        setShowButton(true);
      }, 7000);
      
      return () => clearTimeout(timer);
    }
  }, [iframeLoaded]);

  // Create a self-contained Spline HTML
  useEffect(() => {
    const splineHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Spline Viewer</title>
        <script type="module" src="https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js"></script>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: transparent;
          }
          spline-viewer {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <spline-viewer url="https://prod.spline.design/wsnyqBN34003xlRb/scene.splinecode" 
                      loading-anim="true"
                      loading-anim-color="#3b82f6"
                      events-target="global"
                      play-mode="auto"></spline-viewer>
      </body>
      </html>
    `;
    
    // Create blob from HTML string
    const blob = new Blob([splineHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Set the iframe src
    const iframe = document.getElementById('spline-iframe');
    if (iframe) {
      iframe.src = url;
      
      // Mark loading as complete once iframe is loaded
      iframe.onload = () => {
        setLoading(false);
        setIframeLoaded(true);
      };
    }
    
    return () => {
      // Release the blob URL when component unmounts
      URL.revokeObjectURL(url);
    };
  }, []);

  const handleWelcomeClick = () => {
    // Navigate directly to landing page
    navigate('/home');
  };

  return (
    <div className="h-screen w-full relative overflow-hidden bg-black">
      {/* Tech circuit background */}
      <div className="absolute inset-0 z-0 tech-circuit-bg"></div>
      
      {/* Spline animation in iframe */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-400">Loading animation...</p>
          </div>
        ) : null}
        
        {/* The iframe is always present but invisible until loaded */}
        <iframe 
          id="spline-iframe"
          className={`w-full h-full border-0 ${loading ? 'opacity-0' : 'opacity-100'}`}
          title="Spline 3D Animation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin"
          loading="lazy"
        ></iframe>
      </div>
      
      {/* Stylish Welcome Button */}
      <div className={`absolute inset-0 flex items-center justify-center z-20 pointer-events-none transition-opacity duration-1000 ${showButton ? 'opacity-100' : 'opacity-0'}`}>
        <button 
          onClick={handleWelcomeClick}
          disabled={!showButton}
          className={`
            pointer-events-auto
            px-10 py-5 
            text-xl font-semibold
            bg-gradient-to-r from-gray-300 via-slate-100 to-gray-300
            text-gray-800
            rounded-full
            shadow-[0_0_15px_rgba(255,255,255,0.5)]
            relative
            overflow-hidden
            transform transition-all duration-500
            hover:shadow-[0_0_30px_rgba(255,255,255,0.8)]
            hover:scale-105
            active:scale-95
            before:absolute before:inset-0 
            before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent
            before:opacity-30 before:-translate-x-full before:hover:animate-shimmer
            group
          `}
        >
          <span className="relative z-10 flex items-center justify-center gap-3 group-hover:gap-5 transition-all duration-300">
            Welcome <ArrowRight className="w-5 h-5 transition-all duration-300 group-hover:translate-x-1" />
          </span>
        </button>
      </div>
      
      {/* Built with Spline badge */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-white z-20 flex items-center space-x-1.5">
        <span>Built with Spline</span>
      </div>
    </div>
  );
};

// Add the shimmer animation and futuristic tech circuit pattern
const customStyles = `
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.tech-circuit-bg {
  background-color: black;
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(40, 160, 240, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(120, 120, 255, 0.1) 0%, transparent 50%);
  opacity: 0.9;
}

.tech-circuit-bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10,10 L30,10 L30,20 L50,20 L50,40 L40,40 L40,50 L20,50 L20,80 L30,80 L30,70 L50,70 L50,90 L80,90 L80,60 L60,60 L60,40 L90,40 L90,10 L50,10' stroke='rgba(200, 200, 220, 0.4)' fill='none' stroke-width='0.5'/%3E%3Cpath d='M70,40 L70,20 L80,20 L80,30 L90,30' stroke='rgba(200, 200, 220, 0.4)' fill='none' stroke-width='0.5'/%3E%3Cpath d='M10,70 L40,70' stroke='rgba(200, 200, 220, 0.4)' fill='none' stroke-width='0.5'/%3E%3Ccircle cx='20' cy='20' r='2' fill='rgba(220, 220, 240, 0.7)'/%3E%3Ccircle cx='50' cy='50' r='2' fill='rgba(220, 220, 240, 0.7)'/%3E%3Ccircle cx='70' cy='70' r='2' fill='rgba(220, 220, 240, 0.7)'/%3E%3Ccircle cx='40' cy='40' r='1.5' fill='rgba(100, 200, 255, 0.7)'/%3E%3Ccircle cx='80' cy='20' r='1.5' fill='rgba(100, 200, 255, 0.7)'/%3E%3Ccircle cx='10' cy='90' r='1.5' fill='rgba(100, 200, 255, 0.7)'/%3E%3C/svg%3E");
  background-size: 300px 300px;
  opacity: 0.7;
  animation: pulse 8s infinite ease-in-out;
}

.tech-circuit-bg::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.8) 70%, black 100%);
  pointer-events: none;
}
`;

// Only add the style tag once
if (!document.getElementById('welcome-page-styles')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'welcome-page-styles';
  styleTag.textContent = customStyles;
  document.head.appendChild(styleTag);
}

export default WelcomePage; 