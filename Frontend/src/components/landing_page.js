import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import GradientText from "./gradient_text";
import { CarouselDemo } from "./CarouselDemo";
import { MacbookDemo } from "./MacbookDemo";
import Footer from "./Footer";
import { LogOut, User, ChevronDown, Menu, X, MessageSquare, LayoutDashboard, LifeBuoy, CheckSquare } from "lucide-react";
import { TypewriterEffectSmooth } from "./TypewriterEffect";
import axios from "axios";
import { API_BASE_URL, getImageUrl } from '../config/api.config';

export default function LandingPage() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUserName = localStorage.getItem("userName");
    
    if (token) {
      setIsAuthenticated(true);
      setUserName(storedUserName || "User");
      
      // Fetch user profile data to get the profile picture
      const fetchUserProfile = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            },
            withCredentials: true
          });
          
          // Process profile picture URL
          let profileData = response.data;
          if (profileData.profilePic) {
            // Using Cloudinary, URLs should be complete HTTP/HTTPS URLs already
            console.log("Profile picture URL:", profileData.profilePic);
          } else {
            // Set a default avatar if no profile pic is available
            profileData.profilePic = `https://ui-avatars.com/api/?name=${profileData.userName || 'User'}&background=random`;
          }
          
          setUserProfile(profileData);
          console.log("Loaded user profile:", profileData);
        } catch (err) {
          console.error('Error fetching user profile for landing page:', err);
        }
      };
      
      fetchUserProfile();
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
    setIsAuthenticated(false);
    setShowDropdown(false);
    
    // Force reload to ensure all components update
    window.location.reload();
  };

  return (
    <div
      className="winking-rough"
      style={{ fontFamily: "'Winking Rough', sans-serif" }}
    >
      <style jsx>{`
        @media (max-width: 768px) {
          .section-padding {
            padding-top: 2rem;
            padding-bottom: 2rem;
          }
        }
      `}</style>
      
      <header className="py-4 bg-black sm:py-6">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="shrink-0">
              <a
                href="#"
                title=""
                className="flex text-4xl font-bold text-gray-400 md:text-left text-center w-full md:w-auto"
              >
                CodeSync
              </a>
            </div>

            <div className="flex md:hidden">
              <button 
                type="button" 
                className="text-white"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {userProfile?.profilePic ? (
                  <img 
                    src={userProfile.profilePic} 
                    alt={userName || "User"}
                    className="h-10 w-10 rounded-full object-cover border-2 border-cyan-500 shadow-md shadow-cyan-500/20"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${userName || 'User'}&background=random`;
                    }}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
                    <User size={20} className="text-white" />
                  </div>
                )}
              </button>
            </div>

            <nav className="hidden ml-10 mr-auto space-x-10 lg:ml-20 lg:space-x-12 md:flex md:items-center md:justify-start">
              <Link
                to="/robot-animation"
                className="text-base font-bold text-gray-400 transition-all duration-200 hover:text-white"
              >
                ChatBot
              </Link>

              {isAuthenticated && (
                <Link
                  to="/tasks"
                  className="text-base font-bold text-gray-400 transition-all duration-200 hover:text-white"
                >
                  Tasks
                </Link>
              )}

              {isAuthenticated && (
                <Link
                  to="/Dashboard"
                  className="text-base font-bold text-gray-400 transition-all duration-200 hover:text-white"
                >
                  Dashboard
                </Link>
              )}

              <Link
                to="/Support"
                className="text-base font-bold text-gray-400 transition-all duration-200 hover:text-white"
              >
                Support
              </Link>
            </nav>

            {/* Mobile profile dropdown */}
            {showDropdown && (
              <div className="absolute right-4 top-16 z-50 bg-gray-900 border border-gray-700 rounded-md shadow-lg w-48 py-1 md:hidden">
                <Link
                  to="/ProfilePage"
                  className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                  onClick={() => setShowDropdown(false)}
                >
                  <User size={16} className="mr-2" /> My Profile
                </Link>
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    <LogOut size={16} className="mr-2" /> Sign Out
                  </button>
                )}
                {!isAuthenticated && (
                  <Link
                    to="/LoginPage"
                    className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    onClick={() => setShowDropdown(false)}
                  >
                    <LogOut size={16} className="mr-2" /> Login
                  </Link>
                )}
              </div>
            )}

            {/* Desktop login/user profile */}
            {!isAuthenticated ? (
              <div className="relative hidden md:items-center md:justify-center md:inline-flex group">
                <div className="absolute transition-all duration-200 rounded-full -inset-px bg-gradient-to-r from-cyan-500 to-purple-500 group-hover:shadow-lg group-hover:shadow-cyan-500/50"></div>
                <Link
                  to="/LoginPage"
                  className="relative inline-flex items-center justify-center px-6 py-2 text-base font-bold text-gray-400 bg-black border border-transparent rounded-full"
                >
                  Login
                </Link>
              </div>
            ) : (
              <div className="relative hidden md:flex items-center">
                <button 
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-2 text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-all duration-200"
                >
                  {userProfile?.profilePic ? (
                    <img 
                      src={userProfile.profilePic} 
                      alt={userName}
                      className="h-10 w-10 rounded-full object-cover border-2 border-cyan-500 shadow-md shadow-cyan-500/20"
                      onError={(e) => {
                        console.error("Error loading profile image:", e);
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${userName || 'User'}&background=random`;
                      }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
                      <User size={20} className="text-white" />
                    </div>
                  )}
                  <span className="font-medium">{userName}</span>
                  <ChevronDown size={16} className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showDropdown && (
                  <div className="absolute top-full mt-1 right-0 bg-gray-900 border border-gray-700 rounded-md shadow-lg w-48 py-1 z-50">
                    <button
                      onClick={() => {
                        navigate('/ProfilePage');
                        setShowDropdown(false);
                      }}
                      className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      My Profile
                    </button>
                    <Link
                      to="/Dashboard"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/tasks"
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      My Tasks
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white flex items-center"
                    >
                      <LogOut size={14} className="mr-2" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="relative py-12 overflow-hidden bg-black sm:pb-16 lg:pb-20 xl:pb-24">
        <div className="px-4 mx-auto relative sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid items-center grid-cols-1 gap-y-12 lg:grid-cols-2 gap-x-16">
            <div className="flex flex-col items-center md:items-start">
              {/* Mobile static heading */}
              <h3 className="font-playfair italic text-6xl font-bold text-center w-full tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-sm mb-4 md:hidden">
                Collaborative Code Editor
              </h3>

              {/* Desktop typewriter effect */}
              <div className="hidden md:flex justify-start w-full">
              <TypewriterEffectSmooth
                words={[
                  {
                    text: "Collaborative",
                      className: "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-bold drop-shadow-sm"
                  },
                  {
                    text: "Code",
                      className: "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-bold drop-shadow-sm"
                  },
                  {
                    text: "Editor",
                      className: "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 font-bold drop-shadow-sm"
                  }
                ]}
                  className="font-playfair italic text-5xl lg:text-6xl xl:text-7xl font-bold w-full tracking-tight leading-tight"
              />
              </div>
              <p className="mt-6 font-playfair italic text-lg md:text-lg font-normal text-gray-400 sm:mt-8 text-center md:text-left px-4 md:px-0">
                Build your projects with your team in real-time. Share your
                code, collaborate and get instant feedback.
              </p>

              <form
                action="#"
                method="POST"
                className="relative mt-8 rounded-full sm:mt-12 w-full max-w-md mx-auto md:mx-0"
              >
                <div className="relative">
                  <div className="absolute rounded-full -inset-px bg-gradient-to-r from-cyan-500 to-purple-500"></div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-6">
                      <svg
                        className="w-5 h-5 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      type="email"
                      name=""
                      id=""
                      placeholder="Try Java Developer, React Dev etc."
                      className="block w-full py-3 pr-6 text-white placeholder-gray-500 bg-black border border-transparent rounded-full pl-14 sm:py-4 focus:border-transparent focus:ring-0 text-sm sm:text-base"
                    />
                  </div>
                </div>
                <div className="sm:absolute flex sm:right-1.5 sm:inset-y-1.5 mt-4 sm:mt-0 justify-center md:justify-start">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center w-full px-4 py-3 text-sm font-semibold tracking-widest text-black uppercase transition-all duration-200 bg-white rounded-full sm:w-auto sm:py-3 hover:opacity-90"
                  >
                    Find A Developer
                  </button>
                </div>
              </form>

              <div className="mt-8 sm:mt-12 text-center md:text-left">
                <p className="text-base md:text-lg font-normal text-gray-400">
                  Trusted by 50k+ users
                </p>

                <div className="flex items-center mt-3 justify-center md:justify-start"></div>
                <div className="flex items-center mt-3 justify-center md:justify-start">
                  <div className="flex">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.8586 4.71248C11.2178 3.60691 12.7819 3.60691 13.1412 4.71248L14.4246 8.66264C14.5853 9.15706 15.046 9.49182 15.5659 9.49182H19.7193C20.8818 9.49182 21.3651 10.9794 20.4247 11.6626L17.0645 14.104C16.6439 14.4095 16.4679 14.9512 16.6286 15.4456L17.912 19.3958C18.2713 20.5013 17.0059 21.4207 16.0654 20.7374L12.7052 18.2961C12.2846 17.9905 11.7151 17.9905 11.2945 18.2961L7.93434 20.7374C6.99388 21.4207 5.72851 20.5013 6.08773 19.3958L7.37121 15.4456C7.53186 14.9512 7.35587 14.4095 6.93529 14.104L3.57508 11.6626C2.63463 10.9794 3.11796 9.49182 4.28043 9.49182H8.43387C8.95374 9.49182 9.41448 9.15706 9.57513 8.66264L10.8586 4.71248Z"
                        fill="url(#b)"
                      />
                      <defs>
                        <linearGradient
                          id="b"
                          x1="3.07813"
                          y1="3.8833"
                          x2="23.0483"
                          y2="6.90161"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop
                            offset="0%"
                            style={{ stopColor: "var(--color-cyan-500)" }}
                          />
                          <stop
                            offset="100%"
                            style={{ stopColor: "var(--color-purple-500)" }}
                          />
                        </linearGradient>
                      </defs>
                    </svg>
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10.8586 4.71248C11.2178 3.60691 12.7819 3.60691 13.1412 4.71248L14.4246 8.66264C14.5853 9.15706 15.046 9.49182 15.5659 9.49182H19.7193C20.8818 9.49182 21.3651 10.9794 20.4247 11.6626L17.0645 14.104C16.6439 14.4095 16.4679 14.9512 16.6286 15.4456L17.912 19.3958C18.2713 20.5013 17.0059 21.4207 16.0654 20.7374L12.7052 18.2961C12.2846 17.9905 11.7151 17.9905 11.2945 18.2961L7.93434 20.7374C6.99388 21.4207 5.72851 20.5013 6.08773 19.3958L7.37121 15.4456C7.53186 14.9512 7.35587 14.4095 6.93529 14.104L3.57508 11.6626C2.63463 10.9794 3.11796 9.49182 4.28043 9.49182H8.43387C8.95374 9.49182 9.41448 9.15706 9.57513 8.66264L10.8586 4.71248Z"
                        fill="url(#b)"
                      />
                      <defs>
                        <linearGradient
                          id="b"
                          x1="3.07813"
                          y1="3.8833"
                          x2="23.0483"
                          y2="6.90161"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop
                            offset="0%"
                            style={{ stopColor: "var(--color-cyan-500)" }}
                          />
                          <stop
                            offset="100%"
                            style={{ stopColor: "var(--color-purple-500)" }}
                          />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <span className="ml-2 text-base font-normal text-white">
                    {" "}
                    4.1/5{" "}
                  </span>
                  <span className="ml-1 text-base font-normal text-gray-500">
                    {" "}
                    (14k Reviews){" "}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0">
                <svg
                  className="blur-3xl filter opacity-70"
                  style={{ filter: "blur(64px)" }}
                  width="444"
                  height="536"
                  viewBox="0 0 444 536"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M225.919 112.719C343.98 64.6648 389.388 -70.487 437.442 47.574C485.496 165.635 253.266 481.381 135.205 529.435C17.1445 577.488 57.9596 339.654 9.9057 221.593C-38.1482 103.532 107.858 160.773 225.919 112.719Z"
                    fill="url(#c)"
                  />
                  <defs>
                    <linearGradient
                      id="c"
                      x1="82.7339"
                      y1="550.792"
                      x2="-39.945"
                      y2="118.965"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop
                        offset="0%"
                        style={{ stopColor: "var(--color-cyan-500)" }}
                      />
                      <stop
                        offset="100%"
                        style={{ stopColor: "var(--color-purple-500)" }}
                      />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="absolute inset-0">
                <img
                  className="object-cover w-full h-full opacity-50"
                  src="https://landingfoliocom.imgix.net/store/collection/dusk/images/noise.png"
                  alt=""
                />
              </div>

              <div className="mt-8 md:mt-0 py-8 md:py-0">
                <div className="relative w-full max-w-[400px] md:max-w-[500px] lg:max-w-[600px] mx-auto">
                  <div className="pb-[100%] relative">
              <DotLottieReact
                src="https://lottie.host/a349f2a2-00d0-4d10-947a-25eb5475015b/V4T6cReIh4.json"
                loop
                autoplay
                style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%", 
                        height: "100%",
                  zIndex: 10,
                }}
              />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Macbook Section */}
      <div className="hidden md:block">
      <MacbookDemo />
      </div>

      {/* Carousel Section */}
      <CarouselDemo />
      <Footer/>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black bg-opacity-90 backdrop-blur-sm border-t border-gray-800 md:hidden">
        <div className="flex items-center justify-around p-3">
          {isAuthenticated && (
            <Link to="/Dashboard" className="flex flex-col items-center text-gray-400 hover:text-white">
              <div className="p-2 rounded-full hover:bg-gray-800 transition-colors">
                <LayoutDashboard size={20} />
              </div>
              <span className="text-xs mt-1">Dashboard</span>
            </Link>
          )}
          <Link to="/robot-animation" className="flex flex-col items-center text-gray-400 hover:text-white">
            <div className="p-2 rounded-full hover:bg-gray-800 transition-colors">
              <MessageSquare size={20} />
            </div>
            <span className="text-xs mt-1">ChatBot</span>
          </Link>
          {isAuthenticated && (
            <Link to="/tasks" className="flex flex-col items-center text-gray-400 hover:text-white">
              <div className="p-2 rounded-full hover:bg-gray-800 transition-colors">
                <CheckSquare size={20} />
              </div>
              <span className="text-xs mt-1">Tasks</span>
            </Link>
          )}
          <Link to="/Support" className="flex flex-col items-center text-gray-400 hover:text-white">
            <div className="p-2 rounded-full hover:bg-gray-800 transition-colors">
              <LifeBuoy size={20} />
            </div>
            <span className="text-xs mt-1">Support</span>
          </Link>
        </div>
      </div>

      {/* Add padding at the bottom of the page to prevent content from being hidden behind bottom nav */}
      <div className="pb-20 md:pb-0"></div>
    </div>
  );
}
