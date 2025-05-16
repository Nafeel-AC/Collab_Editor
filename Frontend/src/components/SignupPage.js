import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../config/api.config';

const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0.3);
  const [passwordStrength, setPasswordStrength] = useState({
    strength: '',
    color: ''
  });

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard", { replace: true });
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

  const checkPasswordStrength = (password) => {
    // Check password length
    if (password.length === 0) {
      return { strength: '', color: '' };
    }
    
    if (password.length < 8) {
      return { strength: 'Too short', color: 'text-red-500' };
    }
    
    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    
    const strength = hasUpperCase + hasLowerCase + hasNumbers + hasSpecialChars;
    
    if (strength <= 1) {
      return { strength: 'Weak', color: 'text-red-500' };
    } else if (strength === 2) {
      return { strength: 'Moderate', color: 'text-yellow-500' };
    } else if (strength >= 3) {
      return { strength: 'Strong', color: 'text-green-500' };
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Check password strength when password field changes
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/users/signup`, {
        userName: formData.userName,
        email: formData.email,
        password: formData.password
      });

      if (response.data.token) {
        // Store token in localStorage for client-side access
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userName", response.data.userName);
        localStorage.setItem("userId", response.data.userId);
        
        // Redirect to dashboard after successful registration
        navigate("/dashboard", { replace: true });
      } else {
        setError("Invalid registration response");
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
      {/* Left Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div 
          className="w-full max-w-md backdrop-blur-sm bg-black/30 rounded-xl p-8 relative border border-gray-700/50"
          style={boxShadowStyle}
        >
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-100 via-gray-300 to-silver mb-2">Create Account</h1>
            <p className="text-gray-400">Join CollabCode and start collaborating</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-900/40 border border-red-800 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="userName" className="block text-sm font-medium text-gray-300 mb-1">
                Username
              </label>
              <div className="relative">
                <input
                  id="userName"
                  type="text"
                  name="userName"
                  value={formData.userName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 text-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transition-all"
                  placeholder="Choose a username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 text-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transition-all"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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
              {formData.password && (
                <div className="mt-1 flex items-center">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        passwordStrength.strength === 'Weak' || passwordStrength.strength === 'Too short' 
                          ? 'bg-red-500 w-1/3' 
                          : passwordStrength.strength === 'Moderate' 
                            ? 'bg-yellow-500 w-2/3' 
                            : 'bg-green-500 w-full'
                      }`}
                    />
                  </div>
                  <span className={`ml-2 text-xs ${passwordStrength.color}`}>
                    {passwordStrength.strength}
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">Password must be at least 8 characters</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 text-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 ${
                isLoading 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white shadow-lg'
              } font-medium rounded-lg transition-all duration-200 flex justify-center items-center mt-6`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link to="/LoginPage" className="text-blue-400 hover:text-blue-300 font-medium">
                Sign in
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

export default SignupPage;
