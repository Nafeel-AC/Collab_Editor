import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0.3);
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/Dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setGlowIntensity(prev => {
        if (prev >= 0.6) return 0.3;
        return prev + 0.01;
      });
    }, 50);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      // Configure axios to include credentials
      const response = await axios.post("http://localhost:3050/api/users/login", {
        email,
        password
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log("Login response:", response.data);

      if (response.data.token) {
        // Store token in localStorage for client-side access
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userName", response.data.userName);
        
        // Force navigation with replace for cleaner history
        navigate("/Dashboard", { replace: true });
      } else {
        setError("Invalid login response");
      }
    } catch (err) {
      console.error("Login error:", err);
      
      if (err.response) {
        // Structured error handling based on status codes
        switch (err.response.status) {
          case 404:
            setError("User not found. Please check your email address.");
            break;
          case 401:
            setError("Incorrect password. Please try again.");
            break;
          case 400:
            setError("Please provide both email and password.");
            break;
          default:
            setError(err.response.data.message || "Login failed. Please try again.");
        }
      } else if (err.request) {
        // Network error
        setError("Unable to connect to the server. Please check your internet connection.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const boxShadowStyle = {
    boxShadow: `0 0 20px rgba(192,192,192,${glowIntensity}), 0 0 30px rgba(192,192,192,${glowIntensity/2})`,
    transition: 'box-shadow 0.3s ease'
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div 
          className="w-full max-w-md backdrop-blur-sm bg-black/30 rounded-xl p-8 relative border border-gray-700/50"
          style={boxShadowStyle}
        >
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-gray-300 to-silver mb-2">Welcome Back</h1>
            <p className="text-gray-400">Sign in to continue to CollabCode</p>
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-900/40 border border-red-800 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 text-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transition-all"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 text-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 mt-4 rounded-lg font-medium transition-all duration-200 flex justify-center items-center ${
                isLoading 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white shadow-lg'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{" "}
              <Link to="/SignupPage" className="text-blue-400 hover:text-blue-300 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      {/* Right Side - Animation */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-bl from-gray-800 via-gray-900 to-black items-center justify-center">
        <DotLottieReact
          src="https://lottie.host/e93e121a-408f-402e-af29-2dfddf48da86/ONiAhgUSlj.lottie"
          autoplay
          loop
          style={{ width: "85%", height: "85%" }}
        />
      </div>
    </div>
  );
};

export default LoginPage;
