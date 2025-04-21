import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const WelcomePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(10);

  // Automatically navigate to landing page after 10 seconds
  useEffect(() => {
    // Only start the timer when the animation is loaded
    if (!loading) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/home');
            return 0;
          }
          return prev - 1;
        });
      }, 1500);
      
      return () => clearInterval(timer);
    }
  }, [loading, navigate]);

  // Load Spline viewer script
  useEffect(() => {
    // Create script element for Spline viewer
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';
    script.async = true;
    
    // Add script to document head
    document.head.appendChild(script);
    
    // Add event listener to know when Spline is loaded
    script.addEventListener('load', () => {
      // Add a small delay to ensure everything is initialized
      setTimeout(() => {
        setLoading(false);
      }, 500);
    });
    
    // Cleanup function to remove script when component unmounts
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Add custom CSS for Spline viewer
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      spline-viewer {
        width: 100%;
        height: 100%;
        display: block;
      }
      
      /* Custom loading animation */
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: black;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 100;
        transition: opacity 0.5s ease-out;
      }
      
      .loading-spinner {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.2);
        border-top-color: white;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-black relative">
      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p className="text-gray-400">Loading animation...</p>
        </div>
      )}
      
      {/* Directly embed the Spline viewer in the page */}
      <spline-viewer 
        url="https://prod.spline.design/abar5Ka1OlZb23em/scene.splinecode"
        loading-anim="false"
        events-target="global"
        hide-loading="true"
        exposure="0.7"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      ></spline-viewer>
      
      {/* Timer countdown */}
      {!loading && (
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-white z-20">
          Continuing in {timeRemaining}s
        </div>
      )}
      
      {/* Built with Spline badge */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm text-white z-20 flex items-center space-x-1.5">
        <span>Built with Spline</span>
      </div>
      
      {/* Skip button */}
      <div className="absolute bottom-4 left-4 z-20">
        <button 
          onClick={() => navigate('/home')}
          className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white hover:bg-black/70 transition-colors"
        >
          Skip →
        </button>
      </div>
    </div>
  );
};

export default WelcomePage; 