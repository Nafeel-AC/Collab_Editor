import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Navigate, useNavigate, Link } from 'react-router-dom';
import { Bell, Search, Plus, Code2, LogIn, MoreVertical, UserPlus, Check, X, Users, MessageSquare, Send, ChevronLeft, LogOut, Settings, FolderOpen, AlertCircle } from 'lucide-react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { showSuccess, showError } from '../utils/alertUtils';
import { API_BASE_URL, getImageUrl } from '../config/api.config';

// Add a style element to force dark theme globally with bluish glow effects
const darkModeStyle = `
  body, html {
    background-color: #0F0F13 !important;
    color: white !important;
    background-image: radial-gradient(circle at 15% 50%, rgba(77, 93, 254, 0.08) 0%, transparent 45%), 
                      radial-gradient(circle at 85% 30%, rgba(77, 93, 254, 0.08) 0%, transparent 55%);
    background-attachment: fixed;
  }
  
  /* Add glowing effect to certain elements */
  .glow-effect {
    box-shadow: 0 0 25px rgba(77, 93, 254, 0.15);
  }
  
  .card-glow {
    box-shadow: 0 4px 20px -5px rgba(77, 93, 254, 0.25);
  }
  
  /* Custom scrollbar styling */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(25, 25, 35, 0.5);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(77, 93, 254, 0.5);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(77, 93, 254, 0.7);
  }
`;

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  // Get authentication data from localStorage
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userName, setUserName] = useState(localStorage.getItem('userName') || location.state?.username);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [socket, setSocket] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  // State for users, friends, and friend requests
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'users', 'requests'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roomId, setRoomId] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState(null);

  // Create a ref to store the current message timeout
  const messageTimeoutRef = useRef(null);

  // Add a new state variable for socket connection status
  const [socketStatus, setSocketStatus] = useState('disconnected'); // 'connected', 'disconnected', 'connecting', 'error'

  // Apply dark mode with bluish glow effects
  useEffect(() => {
    // Apply dark theme to document
    document.documentElement.classList.add('dark');
    // Remove light mode if it exists
    document.documentElement.classList.remove('light');
    // Set body background color to dark
    document.body.style.backgroundColor = '#0F0F13';
    
    // Create a style element
    const style = document.createElement('style');
    style.textContent = darkModeStyle;
    document.head.appendChild(style);
    
    // Cleanup function to remove the style when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated) {
      // Get userId from localStorage if available, or from API
      const getCurrentUserId = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/users/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include',
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUserId(userData._id);
            localStorage.setItem('userId', userData._id);
            
            // Initialize socket after getting user ID
            const cleanup = initializeSocket(userData._id);
            return cleanup;
          }
        } catch (error) {
          console.error('Error fetching current user:', error);
        }
      };
      
      const storedUserId = localStorage.getItem('userId');
      let cleanup;
      
      if (storedUserId) {
        setUserId(storedUserId);
        cleanup = initializeSocket(storedUserId);
      } else {
        getCurrentUserId().then(cleanupFn => {
          cleanup = cleanupFn;
        });
      }
      
      return () => {
        // Cleanup socket connection
        if (cleanup) {
          cleanup();
        } else if (socket) {
          console.log('Closing socket connection during component unmount');
          socket.disconnect();
        }
      };
    }
  }, [isAuthenticated, token]);
  
  // Function to initialize socket
  const initializeSocket = (userId) => {
    try {
      console.log('SOCKET DEBUG: Initializing connection for user:', userId);
      
      // Close any existing connections
      if (socket) {
        console.log('SOCKET DEBUG: Closing existing connection:', socket.id);
        socket.disconnect();
      }
      
      // Force polling first to handle WebSocket issues
      const newSocket = io(API_BASE_URL, {
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ['polling', 'websocket'], // Try polling first
        query: { userId }, // Add userId as a query parameter
        autoConnect: true,
        forceNew: true
      });
      
      // Handle connection events
      newSocket.on('connect', () => {
        console.log('SOCKET DEBUG: Connected successfully:', newSocket.id);
        console.log('SOCKET DEBUG: Transport used:', newSocket.io.engine.transport.name);
        setError(null); // Clear any previous connection errors
        setSocketStatus('connected');
        
        // Authenticate socket with user ID
        newSocket.emit('authenticate', { token, userId });
        
        // After connection, explicitly join the user's room for direct messages
        console.log(`SOCKET DEBUG: Joining personal room for user: ${userId}`);
        
        // Debug: Check that we can send messages
        console.log('SOCKET DEBUG: Ready for sending messages:', newSocket.connected);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('SOCKET DEBUG: Connection error:', error);
        console.error('SOCKET DEBUG: Error message:', error.message);
        console.error('SOCKET DEBUG: Error details:', JSON.stringify(error));
        setSocketStatus('error');
        setError('Connection error. Messages may not send. Attempting to reconnect...');
        
        // Force reconnect after a short delay
        setTimeout(() => {
          if (!newSocket.connected) {
            console.log('SOCKET DEBUG: Forcing reconnection...');
            newSocket.connect();
          }
        }, 3000);
      });
      
      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`SOCKET DEBUG: Reconnection attempt #${attemptNumber}`);
        setSocketStatus('connecting');
        setError(`Connection lost. Reconnection attempt #${attemptNumber}...`);
      });
      
      newSocket.on('reconnect', () => {
        console.log('SOCKET DEBUG: Reconnected successfully');
        setSocketStatus('connected');
        setError(null);
        // Re-authenticate after reconnection
        newSocket.emit('authenticate', { token, userId });
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log(`SOCKET DEBUG: Disconnected: ${reason}`);
        setSocketStatus('disconnected');
        
        if (reason === 'io server disconnect' || reason === 'transport close') {
          // Server disconnected us or transport closed, try to reconnect manually
          console.log('SOCKET DEBUG: Attempting manual reconnection...');
          setTimeout(() => {
            newSocket.connect();
          }, 1000);
        }
        // else the socket will automatically try to reconnect
      });
      
      newSocket.on('authenticated', (data) => {
        console.log('Socket authenticated for user:', data.userId);
      });
      
      // Listen for direct messages
      newSocket.on('receive-direct-message', data => {
        console.log('Received message event:', data);
        
        if (data && (data.senderId || data.sender)) {
          // Extract message information with fallbacks for different formats
          const msgSenderId = data.senderId || data.sender;
          const msgText = data.text || data.message;
          const msgRefId = data.refId || null;
          
          // Log received message details for debugging
          console.log(`Received message: "${msgText}" from ${msgSenderId} with refId: ${msgRefId}`);
          
          // Create new message object with consistent format
          const newMsg = {
            id: data.id || `recv_${Date.now()}`,
            senderId: msgSenderId,
            senderName: data.senderName || 'Unknown',
            receiverId: userId,
            text: msgText,
            timestamp: new Date(data.timestamp || data.createdAt || Date.now()),
            refId: msgRefId // Store the reference ID
          };
          
          setMessages(prevMessages => {
            // First try to find a pending message with matching refId
            if (msgRefId) {
              const pendingIndex = prevMessages.findIndex(msg => 
                msg.pending && (msg.refId === msgRefId || msg.id === msgRefId)
              );
              
              if (pendingIndex !== -1) {
                console.log(`Found pending message with matching refId: ${msgRefId}`);
                
                // Clear timeout since we received acknowledgment
                if (messageTimeoutRef.current) {
                  console.log('Clearing message timeout as message was delivered');
                  clearTimeout(messageTimeoutRef.current);
                  messageTimeoutRef.current = null;
                }
                
                // Replace the pending message with the confirmed one
                const updatedMessages = [...prevMessages];
                updatedMessages[pendingIndex] = {
                  ...updatedMessages[pendingIndex],
                  pending: false,
                  error: false,
                  id: data.id || updatedMessages[pendingIndex].id,
                  timestamp: new Date(data.timestamp || data.createdAt || Date.now())
                };
                
                return updatedMessages;
              } else {
                console.log(`No pending message found with refId: ${msgRefId}`);
              }
            } else {
              console.log('Received message without a refId');
            }
            
            // If no match by refId, check if this is a duplicate message by comparing text and timestamp
            const isDuplicate = prevMessages.some(msg => 
              !msg.pending && 
              (msg.senderId === msgSenderId || msg.sender === msgSenderId) && 
              msg.text === msgText &&
              Math.abs(new Date(msg.timestamp) - new Date(data.timestamp || data.createdAt || Date.now())) < 1000
            );
            
            // Only add if not a duplicate
            if (!isDuplicate) {
              console.log('Adding new message to state:', newMsg);
              return [...prevMessages, newMsg];
            } else {
              console.log('Detected duplicate message, not adding to state');
            }
            
            return prevMessages;
          });
          
          // If this message is from the selected friend, mark as read
          if (selectedFriend && (msgSenderId === selectedFriend.id)) {
            // Mark as read logic
            console.log(`Marking message from ${msgSenderId} as read`);
            if (socket) {
              socket.emit('mark-messages-read', { senderId: msgSenderId });
            }
            
            // Ensure messages container scrolls to bottom on new message
            setTimeout(() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          } else {
            console.log(`Message from ${msgSenderId} not marked as read (selected friend: ${selectedFriend?.id || 'none'})`);
          }
        } else {
          console.warn('Received malformed message data:', data);
        }
      });
      
      newSocket.on('messages-read', (data) => {
        console.log('Messages read by:', data.by);
      });
      
      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        setError(error.message);
      });
      
      // Ping the server every 30 seconds to keep the connection alive
      const pingInterval = setInterval(() => {
        if (newSocket.connected) {
          console.log('Sending ping to server');
          newSocket.emit('ping');
        }
      }, 30000);
      
      // Clear ping interval when socket disconnects
      newSocket.on('disconnect', () => {
        clearInterval(pingInterval);
      });
      
      setSocket(newSocket);
      
      // Return a cleanup function to clear the ping interval
      return () => {
        clearInterval(pingInterval);
        if (newSocket) {
          newSocket.disconnect();
        }
      };
    } catch (err) {
      console.error('Error initializing socket:', err);
      setError('Failed to connect to the server. Please refresh the page.');
    }
  };
  
  // Check authentication on component mount
  useEffect(() => {
    // If no token is present, redirect to login
    if (!token) {
      navigate('/LoginPage', { replace: true });
      return;
    }

    // Verify token validity by making a request to get user data
    const verifyToken = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/friends`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          // If token is invalid, clear storage and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          setIsAuthenticated(false);
          navigate('/LoginPage', { replace: true });
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        setError('Authentication failed. Please log in again.');
      }
    };

    verifyToken();
  }, [token, navigate]);
  
  // Initialize filtered users when the users array changes
  useEffect(() => {
    // Initially show first 5 users when tab is switched to users
    if (activeTab === 'users') {
      setFilteredUsers(users.slice(0, 5));
    }
  }, [users, activeTab]);

  // Fetch all users, friends, and friend requests
  useEffect(() => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch friends
        const friendsResponse = await fetch(`${API_BASE_URL}/api/users/friends`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });
        
        if (friendsResponse.ok) {
          try {
            const friendsData = await friendsResponse.json();
            console.log('Raw friends data from API:', friendsData);
            
            if (Array.isArray(friendsData)) {
              const mappedFriends = friendsData.map(friend => {
                console.log('Friend object from API:', friend);
                
                // Process profile picture URL
                let profilePicUrl = null;
                
                if (friend.profilePic) {
                  // Handle server-side uploaded images
                  if (friend.profilePic.startsWith('/uploads/')) {
                    profilePicUrl = getImageUrl(friend.profilePic);
                    console.log('Using server uploaded profile picture:', profilePicUrl);
                  } 
                  // Handle fully qualified URLs (already starting with http)
                  else if (friend.profilePic.startsWith('http')) {
                    profilePicUrl = friend.profilePic;
                    console.log('Using full URL profile picture:', profilePicUrl);
                  }
                  // Handle partial paths that need server prefix
                  else {
                    profilePicUrl = getImageUrl(friend.profilePic);
                    console.log('Using prefixed profile picture:', profilePicUrl);
                  }
                } else {
                  // Fallback to UI Avatars
                  profilePicUrl = getImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(friend.userName || 'Unknown')}&background=random`);
                  console.log('Using UI Avatars fallback:', profilePicUrl);
                }
                
                return {
                  _id: friend._id,
                  id: friend._id,
                  name: friend.userName || 'Unknown User',
                  userName: friend.userName || 'Unknown User',
                  status: 'Online',
                  online: true,
                  avatar: profilePicUrl,
                  profilePic: profilePicUrl
                };
              });
              
              console.log('Mapped friends with profile pics:', mappedFriends);
              setFriends(mappedFriends);
            } else {
              console.error('Friends data is not an array:', friendsData);
            }
          } catch (parseError) {
            console.error('Error parsing friends response:', parseError);
            const text = await friendsResponse.text();
            console.error('Raw response:', text);
          }
        } else {
          console.error('Friends response not OK:', friendsResponse.status);
        }
        
        // Fetch friend requests
        const requestsResponse = await fetch(`${API_BASE_URL}/api/users/friend-requests`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });
        
        if (requestsResponse.ok) {
          try {
            const requestsData = await requestsResponse.json();
            console.log('Raw friend requests data:', requestsData);
            
            if (Array.isArray(requestsData)) {
              setFriendRequests(requestsData.map(user => {
                // Process profile picture URL
                let profilePicUrl = null;
                
                if (user.profilePic) {
                  // Handle server-side uploaded images
                  if (user.profilePic.startsWith('/uploads/')) {
                    profilePicUrl = getImageUrl(user.profilePic);
                  } 
                  // Handle fully qualified URLs (already starting with http)
                  else if (user.profilePic.startsWith('http')) {
                    profilePicUrl = user.profilePic;
                  }
                  // Handle partial paths that need server prefix
                  else {
                    profilePicUrl = getImageUrl(user.profilePic);
                  }
                } else {
                  // Fallback to UI Avatars
                  profilePicUrl = getImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName || 'Unknown')}&background=random`);
                }
                
                return {
                  id: user._id,
                  _id: user._id,
                  name: user.userName || 'Unknown User',
                  userName: user.userName || 'Unknown User',
                  email: user.email || '',
                  avatar: profilePicUrl,
                  profilePic: profilePicUrl
                };
              }));
            } else {
              console.error('Friend requests data is not an array:', requestsData);
            }
          } catch (parseError) {
            console.error('Error parsing friend requests response:', parseError);
            const text = await requestsResponse.text();
            console.error('Raw response:', text);
          }
        } else {
          console.error('Friend requests response not OK:', requestsResponse.status);
        }
        
        // Fetch all users (for sending friend requests)
        const usersResponse = await fetch(`${API_BASE_URL}/api/users/all`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });
        
        if (usersResponse.ok) {
          try {
            const usersData = await usersResponse.json();
            if (Array.isArray(usersData)) {
              setUsers(usersData.map(user => {
                // Process profile picture URL
                let profilePicUrl = null;
                
                if (user.profilePic) {
                  // Handle server-side uploaded images
                  if (user.profilePic.startsWith('/uploads/')) {
                    profilePicUrl = getImageUrl(user.profilePic);
                  } 
                  // Handle fully qualified URLs (already starting with http)
                  else if (user.profilePic.startsWith('http')) {
                    profilePicUrl = user.profilePic;
                  }
                  // Handle partial paths that need server prefix
                  else {
                    profilePicUrl = getImageUrl(user.profilePic);
                  }
                } else {
                  // Fallback to UI Avatars
                  profilePicUrl = getImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName || 'Unknown')}&background=random`);
                }
                
                return {
                  id: user._id,
                  name: user.userName || 'Unknown User',
                  userName: user.userName || 'Unknown User',
                  email: user.email || '',
                  avatar: profilePicUrl,
                  profilePic: profilePicUrl
                };
              }));
            } else {
              console.error('Users data is not an array:', usersData);
            }
          } catch (parseError) {
            console.error('Error parsing users response:', parseError);
            const text = await usersResponse.text();
            console.error('Raw response:', text);
          }
        } else {
          console.error('Users response not OK:', usersResponse.status);
        }
      } catch (err) {
        setError('Failed to fetch data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, token]);
  
  // Add cleanup for timeout when component unmounts
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Add this new function after the existing fetchData function
  const refreshFriendRequests = async () => {
    try {
      console.log("Refreshing friend requests");
      setLoading(true);

      const refreshResponse = await fetch(`${API_BASE_URL}/api/users/friend-requests`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
      });
      
      if (refreshResponse.ok) {
        try {
          const refreshData = await refreshResponse.json();
          if (Array.isArray(refreshData)) {
            console.log(`Found ${refreshData.length} friend requests:`, refreshData);
            setFriendRequests(refreshData.map(user => {
              // Process profile picture URL
              let profilePicUrl = null;
              
              if (user.profilePic) {
                // Handle server-side uploaded images
                if (user.profilePic.startsWith('/uploads/')) {
                  profilePicUrl = getImageUrl(user.profilePic);
                } 
                // Handle fully qualified URLs (already starting with http)
                else if (user.profilePic.startsWith('http')) {
                  profilePicUrl = user.profilePic;
                }
                // Handle partial paths that need server prefix
                else {
                  profilePicUrl = getImageUrl(user.profilePic);
                }
              } else {
                // Fallback to UI Avatars
                profilePicUrl = getImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(user.userName || 'Unknown')}&background=random`);
              }
              
              return {
                id: user._id,
                _id: user._id,
                name: user.userName || 'Unknown User',
                userName: user.userName || 'Unknown User',
                email: user.email || '',
                avatar: profilePicUrl,
                profilePic: profilePicUrl
              };
            }));
          } else {
            console.error('Friend requests data is not an array:', refreshData);
          }
        } catch (parseError) {
          console.error('Error parsing friend requests response:', parseError);
        }
      } else {
        console.error('Friend requests refresh failed:', refreshResponse.status);
      }
    } catch (err) {
      console.error('Error refreshing friend requests:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add auto-refresh effect for friend requests when tab is active
  useEffect(() => {
    if (activeTab === 'requests' && isAuthenticated) {
      refreshFriendRequests();
      
      // Set up an interval to refresh friend requests every 30 seconds
      const intervalId = setInterval(refreshFriendRequests, 30000);
      
      // Clean up interval when component unmounts or tab changes
      return () => clearInterval(intervalId);
    }
  }, [activeTab, isAuthenticated, token]);
  
  // Get the current user's profile info
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!token) return;
        
        const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
        
        // Process profile picture URL
        let profileData = response.data;
        console.log("Raw profile data:", profileData);
        
        // Check for invalid profile picture URLs (localhost or migration needed)
        if (profileData.profilePic && (profileData.profilePic.includes('localhost') || profileData.profilePic.includes('127.0.0.1'))) {
          console.warn("Detected local profile picture URL that won't work in production:", profileData.profilePic);
          profileData.profilePic = null;
        } else if (profileData.needsProfilePicMigration) {
          console.warn("User profile picture needs migration");
          profileData.profilePic = null;
        }
        
        // Set default avatar if no profile pic is available
        if (!profileData.profilePic) {
          console.log("Setting default avatar");
          profileData.profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.userName || 'User')}&background=random`;
        } else {
          console.log("Using profile picture URL:", profileData.profilePic);
        }
        
        setUserProfile(profileData);
        console.log("Set user profile with picture:", profileData.profilePic);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };

    fetchUserProfile();
  }, [token]);
  
  // Handle sending friend request
  const handleSendFriendRequest = async (userId) => {
    try {
      setLoading(true);
      console.log(`Sending friend request to user with ID: ${userId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/users/send-friend-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: userId }),
      });
      
      const responseData = await response.json();
      
      if (response.ok) {
        console.log('Friend request sent successfully:', responseData);
        // Remove user from the list
        setUsers(users.filter(user => user.id !== userId));
        // Show success message
        setError(null);
        showSuccess(`Friend request sent to ${responseData.receiverName} successfully!`);
      } else {
        console.error('Failed to send friend request:', responseData);
        setError(responseData.error || 'Failed to send friend request');
        showError(responseData.error || 'Failed to send friend request');
      }
    } catch (err) {
      console.error('Error in sending friend request:', err);
      setError('Failed to send friend request. Please try again.');
      showError('Failed to send friend request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle accepting friend request
  const handleAcceptFriendRequest = async (requesterId) => {
    try {
      setLoading(true);
      console.log(`Accepting friend request from user with ID: ${requesterId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/users/accept-friend-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ requesterId }),
      });
      
      const responseData = await response.json();
      
      if (response.ok) {
        console.log('Friend request accepted successfully:', responseData);
        
        // Find the user in friend requests
        const acceptedUser = friendRequests.find(req => req.id === requesterId);
        
        // Remove from friend requests
        setFriendRequests(prevRequests => prevRequests.filter(req => req.id !== requesterId));
        
        // Add to friends list using either the response data or the local data
        if (responseData && responseData.requester) {
          // Use data from the response if available
          setFriends(prevFriends => [...prevFriends, {
            id: responseData.requester.id,
            name: responseData.requester.name,
            status: 'Online',
            online: true,
            avatar: responseData.requester.profilePic || 
              `https://ui-avatars.com/api/?name=${responseData.requester.name}&background=random`
          }]);
        } else if (acceptedUser) {
          // Fallback to using local data
          setFriends(prevFriends => [...prevFriends, {
            id: acceptedUser.id,
            name: acceptedUser.name,
            status: 'Online',
            online: true,
            avatar: acceptedUser.avatar
          }]);
        }
      } else {
        console.error('Failed to accept friend request:', responseData);
        setError(responseData.error || 'Failed to accept friend request');
      }
    } catch (err) {
      console.error('Error accepting friend request:', err);
      setError('Failed to accept friend request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle rejecting friend request
  const handleRejectFriendRequest = async (requesterId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/reject-friend-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ requesterId }),
      });
      
      if (response.ok) {
        // Remove from friend requests
        setFriendRequests(friendRequests.filter(req => req.id !== requesterId));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to reject friend request');
      }
    } catch (err) {
      setError('Failed to reject friend request');
      console.error(err);
    }
  };
  
  const handleCreateRoom = () => {
    navigate('/create-room', { state: { username: userName } });
  };

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    
    navigate(`/editor/${roomId}`, { state: { username: userName } });
  };

  // Handle selecting a friend to message
  const handleSelectFriend = (friend) => {
    console.log('Selected friend object:', friend);
    
    // Make sure we have a valid friend object
    if (!friend) {
      console.error('Invalid friend object:', friend);
      return;
    }
    
    // Normalize the friend object to ensure it has consistent properties
    const normalizedFriend = {
      _id: friend._id || friend.id,
      id: friend._id || friend.id,
      userName: friend.userName || friend.name || 'Unknown User',
      name: friend.userName || friend.name || 'Unknown User',
      profilePic: friend.profilePic || friend.avatar,
      avatar: friend.profilePic || friend.avatar,
      status: friend.status || 'Online'
    };
    
    console.log('Normalized friend object:', normalizedFriend);
    setSelectedFriend(normalizedFriend);
    
    // Fetch messages for the selected friend
    fetchMessages(normalizedFriend._id || normalizedFriend.id);
  };

  // Fetch messages for a selected friend
  const fetchMessages = async (friendId) => {
    if (!friendId) {
      console.error('Invalid friend ID provided to fetchMessages:', friendId);
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptFetch = async () => {
      try {
        setLoading(true);
        console.log(`Fetching messages for friend ID: ${friendId}`);
        
        const response = await fetch(`${API_BASE_URL}/api/messages/${friendId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });

        if (response.ok) {
          const messagesData = await response.json();
          
          // Sort messages by timestamp
          const sortedMessages = messagesData.sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
          );
          
          console.log(`Fetched ${sortedMessages.length} messages with ${friendId}`);
          setMessages(sortedMessages);
          
          // Mark received messages as read
          if (socket && socket.connected && sortedMessages.some(msg => msg.sender === friendId && !msg.read)) {
            console.log('Marking messages as read');
            socket.emit('mark-messages-read', { senderId: friendId });
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to fetch messages:', errorData);
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying message fetch (${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return attemptFetch();
          } else {
            setError(`Could not load messages. ${errorData.error || response.statusText}`);
          }
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying message fetch after error (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptFetch();
        } else {
          setError('Failed to load messages. Please try again later.');
        }
      } finally {
        setLoading(false);
        
        // Scroll to bottom of messages
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };
    
    // Start the fetch process
    await attemptFetch();
  };

  // Handle sending a message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    
    if (!newMessage.trim() || !selectedFriend) {
      console.log("DEBUG: Cannot send empty message or no friend selected");
      return;
    }
    
    if (!socket) {
      console.error("DEBUG: Socket connection not established");
      setError("Connection issue. Please refresh the page.");
      return;
    }

    try {
      // Generate a unique reference ID for this message
      const messageRefId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const messageToSend = newMessage.trim();
      
      // Ensure we have the correct friend ID format
      const friendId = selectedFriend._id || selectedFriend.id;
      
      console.log(`DEBUG: Sending message to ${friendId} with refId: ${messageRefId}`);
      console.log('DEBUG: Socket ID:', socket.id);
      console.log('DEBUG: Socket connected:', socket.connected);
      console.log('DEBUG: Socket status:', socketStatus);
      
      // Clear any existing timeout
      if (messageTimeoutRef.current) {
        console.log('DEBUG: Clearing existing timeout before sending new message');
        clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
      
      // Add message to local state immediately for responsiveness
      const tempMessage = {
        id: messageRefId, // Use our reference ID
        senderId: userId,
        senderName: userName,
        receiverId: friendId,
        text: messageToSend,
        timestamp: new Date(),
        pending: true,
        refId: messageRefId // Store reference ID for easier matching
      };
      
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Clear message input before sending to avoid multiple sends on rapid clicks
      setNewMessage('');
      
      // Check if socket is connected
      console.log('DEBUG: Socket connected status before sending:', socket.connected);
      
      // Set new timeout - we'll use this as a backup in case the socket acknowledgment fails
      messageTimeoutRef.current = setTimeout(() => {
        console.log(`DEBUG: Message send timed out for refId: ${messageRefId}`);
        setError("Message could not be delivered. Network issue detected.");
        
        // Update message status to error
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            (msg.refId === messageRefId || msg.id === messageRefId)
              ? {...msg, error: true, pending: false} 
              : msg
          )
        );
        
        // Clear the reference
        messageTimeoutRef.current = null;
      }, 5000);
      
      console.log('DEBUG: About to emit send-direct-message event');
      // Send the message with acknowledgment callback
      socket.emit('send-direct-message', {
        receiverId: friendId,
        message: messageToSend,
        refId: messageRefId // Include reference ID in the socket message
      }, (response) => {
        // This is the acknowledgment callback
        console.log('DEBUG: Message send acknowledgment received:', response);
        
        // Clear timeout since we received server response (success or error)
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current);
          messageTimeoutRef.current = null;
        }
        
        if (response && response.success) {
          // Message was successfully received by server
          console.log(`DEBUG: Message ${messageRefId} successfully delivered to server`);
          
          // No need to update message status, the receive-direct-message event will handle it
        } else {
          // Server reported an error
          console.error('DEBUG: Server reported error with message:', response?.error || 'Unknown error');
          
          // Update message status to error
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              (msg.refId === messageRefId || msg.id === messageRefId)
                ? {...msg, error: true, pending: false} 
                : msg
            )
          );
          
          // Show error to user
          setError(response?.error || "Message could not be delivered. Please try again.");
        }
      });
      
      console.log('DEBUG: Emitted send-direct-message event');
      
    } catch (err) {
      console.error('DEBUG: Error in handleSendMessage:', err);
      setError('Failed to send message. Please try again.');
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      // Disconnect socket if connected
      if (socket) {
        socket.disconnect();
      }
      
      // Call logout API
      await fetch(`${API_BASE_URL}/api/users/logout`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
      });
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userId');
      
      // Update state
      setIsAuthenticated(false);
      
      // Navigate to login page
      navigate('/LoginPage', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, attempt to clear local data and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userId');
      navigate('/LoginPage', { replace: true });
    }
  };
  
  // If authentication check is still in progress, show a loading state
  if (loading && !userName) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1c1c1f] text-[#e6e6e6]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3b82f6] mx-auto"></div>
          <p className="mt-4 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/LoginPage" replace />;
  }

  // Friends are now managed by state

  return (
    <div className="min-h-screen bg-[#0F0F13] text-white">
      {/* Fixed top navigation */}
      <header className="sticky top-0 z-50 w-full bg-[#11111A] border-b border-gray-800 shadow-md backdrop-blur-sm bg-opacity-80">
        <div className="flex items-center justify-between px-4 py-3 lg:py-4 mx-auto max-w-7xl">
          <div className="flex items-center">
            <Link to="/home" className="flex items-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent mr-4">
                CodeSync
              </div>
            </Link>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Search bar - only on larger screens */}
            <div className="hidden md:block relative">
              <input
                type="text"
                placeholder="Search..."
                className="py-2 pl-10 pr-4 w-64 bg-gray-800/50 border border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            
            {/* User profile and notifications */}
            <div className="flex items-center">
              <button className="p-2 rounded-full hover:bg-gray-800 relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <Link to="/ProfilePage" className="flex items-center mx-2 p-1 rounded-full hover:bg-gray-800/50">
                {userProfile && userProfile.profilePic ? (
                  <img 
                    src={userProfile.profilePic} 
                    alt={userName} 
                    className="w-8 h-8 rounded-full border border-gray-600"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-sm font-bold">{userName ? userName.substring(0, 1).toUpperCase() : 'U'}</span>
                  </div>
                )}
                <span className="ml-2 font-medium hidden md:block">{userName}</span>
              </Link>
              
              <button 
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-gray-800 text-red-400 hover:text-red-300"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content area */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)]">
        {/* Sidebar - collapsible on mobile */}
        <aside className="w-full md:w-64 lg:w-72 bg-[#0A0A12] border-r border-gray-800 md:h-full overflow-y-auto custom-scrollbar">
          <div className="p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Dashboard</h2>
              {socketStatus !== 'connected' && (
                <button 
                  onClick={() => {
                    console.log('Reconnecting socket manually...');
                    if (socket) {
                      socket.connect();
                    } else {
                      initializeSocket(userId);
                    }
                  }} 
                  className="p-1.5 bg-red-500/20 border border-red-500/30 rounded-md flex items-center justify-center"
                  title="Connection lost. Click to reconnect."
                >
                  <AlertCircle size={16} className="text-red-400" />
                </button>
              )}
            </div>

            <Link 
              to="/editor/new"
              className="flex items-center justify-center w-full p-3 mb-6 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-purple-500/20"
            >
              <Code2 className="mr-2 h-5 w-5" />
              New Coding Room
            </Link>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2 text-sm font-medium text-gray-400">
                <span>Projects</span>
                <Link to="/projects" className="text-xs text-cyan-500 hover:text-cyan-400">View All</Link>
              </div>
              <button 
                onClick={handleCreateRoom}
                className="w-full py-2 px-3 mb-2 flex items-center text-sm font-medium bg-gray-800/50 hover:bg-gray-800 rounded-md transition-colors"
              >
                <Plus className="mr-2 h-4 w-4 text-cyan-500" />
                Create Room
              </button>
              <div className="relative">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter Room ID"
                  className="w-full py-2 px-3 text-sm bg-gray-800/50 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!roomId}
                  className="absolute right-2 top-2 p-1 bg-cyan-500/20 text-cyan-500 rounded hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogIn className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* Tabs for different sections */}
            <div className="flex border-b border-gray-800 mb-4">
              <button
                onClick={() => setActiveTab('friends')}
                className={`flex-1 py-2 text-sm font-medium ${activeTab === 'friends' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
              >
                Friends
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-2 text-sm font-medium ${activeTab === 'users' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-2 text-sm font-medium relative ${activeTab === 'requests' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-400'}`}
              >
                Requests
                {friendRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    {friendRequests.length}
                  </span>
                )}
              </button>
            </div>
            
            {/* Search input for users/friends */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Search ${activeTab === 'friends' ? 'friends' : 'users'}...`}
                className="w-full py-2 pl-8 pr-4 text-sm bg-gray-800/50 border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            </div>

            {/* List content based on active tab */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'friends' && (
                <div>
                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#4D5DFE]"></div>
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center p-6 text-[#8F8FA3]">
                      <Users className="mx-auto mb-2 opacity-20" size={32} />
                      <p className="text-sm">No friends yet</p>
                      <button 
                        onClick={() => setActiveTab('users')} 
                        className="mt-2 text-[#4D5DFE] text-xs flex items-center mx-auto"
                      >
                        <UserPlus size={12} className="mr-1" />
                        Add Friends
                      </button>
                    </div>
                  ) : (
                    <div>
                      {friends
                        .filter(friend => 
                          friend.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          friend.name?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map(friend => {
                          console.log('Rendering friend:', friend);
                          return (
                            <div 
                              key={friend._id || friend.id} 
                              className={`flex items-center p-3 hover:bg-[#1E1E29]/60 cursor-pointer transition-colors ${selectedFriend?._id === friend._id || selectedFriend?.id === friend.id ? 'bg-[#1E1E29]/80' : ''}`}
                              onClick={() => handleSelectFriend(friend)}
                            >
                              <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-sm"></div>
                                {/* Log the image source for debugging */}
                                {console.log('Friend image src:', friend.profilePic || friend.avatar)}
                                <img 
                                  src={friend.profilePic || friend.avatar || getImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(friend.userName || friend.name || 'User')}&background=4D5DFE&color=fff`)}
                                  alt={friend.userName || friend.name || 'User'} 
                                  className="w-10 h-10 rounded-full object-cover relative z-10"
                                  onError={(e) => {
                                    console.log('Image failed to load:', e.target.src);
                                    e.target.onerror = null;
                                    e.target.src = getImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(friend.userName || friend.name || 'User')}&background=4D5DFE&color=fff`);
                                  }}
                                />
                              </div>
                              <div className="ml-3">
                                <h4 className="font-medium">{friend.userName || friend.name || 'Unknown User'}</h4>
                                <p className="text-xs text-[#8F8FA3]">
                                  {friend.status || 'Online'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'users' && (
                <div>
                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#4D5DFE]"></div>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center p-6 text-[#8F8FA3]">
                      <Users className="mx-auto mb-2 opacity-20" size={32} />
                      <p className="text-sm">No users found</p>
                    </div>
                  ) : (
                    <div>
                      {filteredUsers.map(user => (
                        <div key={user._id} className="flex items-center justify-between p-3 hover:bg-[#1E1E29]/60">
                          <div className="flex items-center">
                            <div className="relative">
                              <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-sm"></div>
                              <img 
                                src={user.profilePic || getImageUrl(`https://ui-avatars.com/api/?name=${user.userName || 'User'}&background=4D5DFE&color=fff`)} 
                                alt={user.userName || 'User'} 
                                className="w-10 h-10 rounded-full object-cover relative z-10"
                              />
                            </div>
                            <div className="ml-3">
                              <h4 className="font-medium">{user.userName || 'Unknown User'}</h4>
                              <p className="text-xs text-[#8F8FA3]">
                                {user.email || 'No email provided'}
                              </p>
                            </div>
                          </div>
                          <button className="p-2 bg-[#4D5DFE]/20 hover:bg-[#4D5DFE]/30 text-[#4D5DFE] rounded-md text-sm transition-colors" onClick={() => handleSendFriendRequest(user.id)}>
                            <UserPlus size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'requests' && (
                <div>
                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#4D5DFE]"></div>
                    </div>
                  ) : friendRequests.length === 0 ? (
                    <div className="text-center p-6 text-[#8F8FA3]">
                      <Bell className="mx-auto mb-2 opacity-20" size={32} />
                      <p className="text-sm">No friend requests</p>
                    </div>
                  ) : (
                    <div>
                      {friendRequests.map((request, index) => (
                        <div key={request.id || request._id || index} className="p-3 hover:bg-[#1E1E29]/60">
                          <div className="flex items-center mb-2">
                            <div className="relative">
                              <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-sm"></div>
                              <img 
                                src={request.avatar || getImageUrl(`https://ui-avatars.com/api/?name=${request.userName || request.name || 'User'}&background=4D5DFE&color=fff`)} 
                                alt={request.userName || request.name || 'User'} 
                                className="w-10 h-10 rounded-full object-cover relative z-10"
                              />
                            </div>
                            <div className="ml-3">
                              <h4 className="font-medium">{request.userName || request.name || 'Unknown User'}</h4>
                              <p className="text-xs text-[#8F8FA3]">
                                Sent you a friend request
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAcceptFriendRequest(request.id)}
                              className="flex-1 p-2 bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white rounded-md text-sm flex items-center justify-center transition-colors glow-effect"
                            >
                              <Check size={14} className="mr-1" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectFriendRequest(request.id)}
                              className="flex-1 p-2 bg-[#E94560]/10 hover:bg-[#E94560]/20 text-[#E94560] rounded-md text-sm flex items-center justify-center transition-colors"
                            >
                              <X size={14} className="mr-1" />
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
        
        {/* Main content area - messages or user view */}
        <main className="flex-grow bg-[#0F0F13] relative overflow-hidden">
          {selectedFriend ? (
            <div className="h-full flex flex-col">
              {/* Chat header */}
              <div className="p-4 bg-[#11111A] border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center">
                  <button 
                    onClick={() => setSelectedFriend(null)} 
                    className="mr-2 p-1.5 rounded-full hover:bg-gray-800 md:hidden"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center">
                    {selectedFriend.profilePic ? (
                      <img 
                        src={selectedFriend.profilePic} 
                        alt={selectedFriend.userName} 
                        className="w-10 h-10 rounded-full border border-gray-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-bold">
                          {selectedFriend.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="ml-3">
                      <h3 className="font-medium">{selectedFriend.userName}</h3>
                      <p className="text-xs text-gray-400">{selectedFriend.online ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <button className="p-2 rounded-full hover:bg-gray-800" title="Create a room with this user">
                    <Users size={18} />
                  </button>
                </div>
              </div>
              
              {/* Messages container */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((message, index) => (
                  <div 
                    key={index}
                    className={`flex ${message.sender === userId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[75%] md:max-w-[60%] p-3 rounded-lg ${
                        message.sender === userId 
                          ? 'bg-gradient-to-r from-cyan-600/30 to-purple-600/30 border border-cyan-600/30' 
                          : 'bg-gray-800 border border-gray-700'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className="text-right text-xs text-gray-400 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message input */}
              <div className="p-4 bg-[#11111A] border-t border-gray-800">
                <form onSubmit={handleSendMessage} className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-grow py-2 px-4 bg-gray-800 border border-gray-700 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-r-lg disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center p-8 max-w-md">
                <FolderOpen size={64} className="mx-auto mb-6 text-gray-400" />
                <h2 className="text-2xl font-bold mb-2">No conversation selected</h2>
                <p className="text-gray-400 mb-6">
                  Select a friend from the list to start a conversation or create a collaborative coding room.
                </p>
                <Link 
                  to="/editor/new"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-purple-500/20"
                >
                  <Code2 className="mr-2 h-5 w-5" />
                  Create Coding Room
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Modal for connection errors */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md p-4 bg-red-900/80 border border-red-700 rounded-lg shadow-lg backdrop-blur-sm">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-white">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-400 hover:text-red-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;