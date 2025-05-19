import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Bell, Search, Plus, Code2, LogIn, MoreVertical, UserPlus, Check, X, Users, MessageSquare, Send, ChevronLeft, LogOut, Settings, FolderOpen, ChevronDown, Menu, Folder, List, Trash2, Calendar, Clock, ArrowRight, Edit2, GripVertical } from 'lucide-react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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

  // Add state for mobile sidebar visibility
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Create a ref to store the current message timeout
  const messageTimeoutRef = useRef(null);

  // Add a new state variable for socket connection status
  const [socketStatus, setSocketStatus] = useState('disconnected'); // 'connected', 'disconnected', 'connecting', 'error'

  // Add new state variables for friends dropdown and messages dropdown
  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false);
  const [showMessagesDropdown, setShowMessagesDropdown] = useState(false);

  // Add a new state variable for right sidebar content
  const [rightSidebarContent, setRightSidebarContent] = useState('friends'); // 'friends', 'users', 'requests', 'chat'

  // Add state for left sidebar and main content
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [mainContent, setMainContent] = useState('projects'); // Changed from null to 'projects'

  // Add state for projects and tasks
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState({
    todo: [],
    inProgress: [],
    done: []
  });
  
  // Add state for task management
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskColumn, setNewTaskColumn] = useState('todo');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: new Date().toISOString().split('T')[0]
  });
  const [editingTask, setEditingTask] = useState(null);
  const [showEditTaskForm, setShowEditTaskForm] = useState(false);

  // Add state for screen size
  const [isMobileView, setIsMobileView] = useState(false);
  
  // Add useEffect to detect screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Initial check
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Handle selecting a friend, with different behavior for mobile vs desktop
  const handleSelectFriend = (friend) => {
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
    
    if (isMobileView) {
      // For mobile: Show chat in main content area
      setMainContent('chat');
      // Don't use the right sidebar for chat in mobile view
      setRightSidebarContent(null);
    } else {
      // For desktop: Use the right sidebar for chat
      setRightSidebarContent('chat');
    }
    
    // Fetch messages for the selected friend
    fetchMessages(friend._id || friend.id);
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

  // Handle navigation to Projects or Tasks page
  const handleNavigation = (destination) => {
    setShowLeftSidebar(false);
    setMainContent(destination);
    
    if (destination === 'projects') {
      fetchProjects();
    } else if (destination === 'tasks') {
      fetchTasks();
    } else if (isMobileView) {
      // For mobile view, handle messages-related content in main area
      if (destination === 'messages') {
        setRightSidebarContent('friends');
      } else if (destination === 'findFriends') {
        setRightSidebarContent('users');
      } else if (destination === 'requests') {
        setRightSidebarContent('requests');
      }
    }
  };

  // Fetch projects
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/projects`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      setProjects(response.data.projects || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to fetch projects');
      // For demo, create some sample projects if fetch fails
      setProjects([
        { _id: '1', name: 'Website Redesign', description: 'Modernizing our company website', language: 'javascript', createdAt: new Date() },
        { _id: '2', name: 'Mobile App Development', description: 'Building iOS and Android apps', language: 'react', createdAt: new Date() },
        { _id: '3', name: 'API Integration', description: 'Connecting to third-party services', language: 'typescript', createdAt: new Date() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tasks
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      // Organize tasks by status
      const tasksByStatus = {
        todo: [],
        inProgress: [],
        done: []
      };
      
      (response.data.tasks || []).forEach(task => {
        if (task.status === 'Todo') {
          tasksByStatus.todo.push(task);
        } else if (task.status === 'In Progress') {
          tasksByStatus.inProgress.push(task);
        } else if (task.status === 'Done') {
          tasksByStatus.done.push(task);
        } else {
          tasksByStatus.todo.push(task);
        }
      });
      
      setTasks(tasksByStatus);
      setError(null);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to fetch tasks');
      // For demo, create some sample tasks if fetch fails
      setTasks({
        todo: [
          { id: '1', title: 'Design landing page', description: 'Create wireframes and UI mockups', priority: 'medium', dueDate: new Date() },
          { id: '2', title: 'Update API documentation', description: 'Document new endpoints', priority: 'low', dueDate: new Date() }
        ],
        inProgress: [
          { id: '3', title: 'Implement user authentication', description: 'Add login and signup functionality', priority: 'high', dueDate: new Date() },
          { id: '4', title: 'Code review for PR #42', description: 'Review pull request from team', priority: 'high', dueDate: new Date() }
        ],
        done: [
          { id: '5', title: 'Fix responsive layout issues', description: 'Address mobile display problems', priority: 'medium', dueDate: new Date() }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle opening a project
  const handleOpenProject = (projectId) => {
    try {
      setLoading(true);
      // Navigate to the editor with the project ID
      navigate(`/editor/${projectId}`, { 
        state: { 
          username: userName,
          originalProjectId: projectId 
        } 
      });
      showSuccess('Opening project...');
    } catch (err) {
      console.error('Error opening project:', err);
      showError('Failed to open project');
    } finally {
      setLoading(false);
    }
  };

  // Handle creating a new project
  const handleCreateProject = () => {
    navigate('/create-room', { state: { username: userName } });
  };

  // Format date to a readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle adding a new task
  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      showError('Task title is required');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await axios.post(`${API_BASE_URL}/api/tasks`, {
        ...newTask,
        status: newTaskColumn === 'todo' ? 'Todo' : 
                newTaskColumn === 'inProgress' ? 'In Progress' : 'Done'
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      if (response.data) {
        // Add the new task to the appropriate column
        setTasks(prev => ({
          ...prev,
          [newTaskColumn]: [...prev[newTaskColumn], {
            id: response.data._id,
            title: newTask.title,
            description: newTask.description,
            priority: newTask.priority,
            dueDate: newTask.dueDate
          }]
        }));
        
        // Reset form
        setNewTask({
          title: '',
          description: '',
          priority: 'medium',
          dueDate: new Date().toISOString().split('T')[0]
        });
        
        setShowNewTaskForm(false);
        showSuccess('Task added successfully');
      }
    } catch (err) {
      console.error('Error adding task:', err);
      showError('Failed to add task');
      
      // Add task locally if API fails (for demo)
      setTasks(prev => ({
        ...prev,
        [newTaskColumn]: [...prev[newTaskColumn], {
          id: `temp_${Date.now()}`,
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          dueDate: newTask.dueDate
        }]
      }));
      
      // Reset form
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: new Date().toISOString().split('T')[0]
      });
      
      setShowNewTaskForm(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle moving a task between columns
  const handleMoveTask = async (taskId, sourceColumn, targetColumn) => {
    try {
      // Find the task in the source column
      const taskIndex = tasks[sourceColumn].findIndex(task => task.id === taskId);
      if (taskIndex === -1) return;
      
      const taskToMove = tasks[sourceColumn][taskIndex];
      
      // Optimistically update UI
      setTasks(prev => ({
        ...prev,
        [sourceColumn]: prev[sourceColumn].filter(task => task.id !== taskId),
        [targetColumn]: [...prev[targetColumn], taskToMove]
      }));
      
      // Update in the backend
      const statusMap = {
        todo: 'Todo',
        inProgress: 'In Progress',
        done: 'Done'
      };
      
      await axios.put(`${API_BASE_URL}/api/tasks/${taskId}`, {
        status: statusMap[targetColumn]
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      showSuccess('Task moved successfully');
    } catch (err) {
      console.error('Error moving task:', err);
      showError('Failed to move task');
      
      // Revert changes if API call fails
      fetchTasks();
    }
  };
  
  // Handle editing a task
  const handleEditTask = async () => {
    if (!editingTask || !editingTask.title.trim()) {
      showError('Task title is required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Find the column the task is in
      let taskColumn = null;
      Object.keys(tasks).forEach(column => {
        if (tasks[column].some(task => task.id === editingTask.id)) {
          taskColumn = column;
        }
      });
      
      if (!taskColumn) {
        throw new Error('Task not found');
      }
      
      // Update in backend
      await axios.put(`${API_BASE_URL}/api/tasks/${editingTask.id}`, {
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      // Update locally
      setTasks(prev => ({
        ...prev,
        [taskColumn]: prev[taskColumn].map(task => 
          task.id === editingTask.id ? editingTask : task
        )
      }));
      
      setShowEditTaskForm(false);
      setEditingTask(null);
      showSuccess('Task updated successfully');
    } catch (err) {
      console.error('Error updating task:', err);
      showError('Failed to update task');
      
      // Update locally if API fails (for demo)
      let taskColumn = null;
      Object.keys(tasks).forEach(column => {
        if (tasks[column].some(task => task.id === editingTask.id)) {
          taskColumn = column;
        }
      });
      
      if (taskColumn) {
        setTasks(prev => ({
          ...prev,
          [taskColumn]: prev[taskColumn].map(task => 
            task.id === editingTask.id ? editingTask : task
          )
        }));
      }
      
      setShowEditTaskForm(false);
      setEditingTask(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deleting a task
  const handleDeleteTask = async (taskId, column) => {
    const confirmed = window.confirm('Are you sure you want to delete this task?');
    if (!confirmed) return;
    
    try {
      setLoading(true);
      
      // Remove from UI first (optimistic update)
      setTasks(prev => ({
        ...prev,
        [column]: prev[column].filter(task => task.id !== taskId)
      }));
      
      // Delete from backend
      await axios.delete(`${API_BASE_URL}/api/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      showSuccess('Task deleted successfully');
    } catch (err) {
      console.error('Error deleting task:', err);
      showError('Failed to delete task');
      
      // If API fails, refresh tasks to restore state
      fetchTasks();
    } finally {
      setLoading(false);
    }
  };

  // Handle moving a task between columns via drag and drop
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    
    // Return if dropped outside a droppable area or in the same position
    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }
    
    // Find the task that was dragged
    const sourceColumn = source.droppableId;
    const targetColumn = destination.droppableId;
    const taskId = draggableId;
    
    // Handle the task move with our existing function
    await handleMoveTask(taskId, sourceColumn, targetColumn);
  };

  // Friends are now managed by state

  return (
    <div className="min-h-screen bg-[#0F0F13] text-white relative overflow-hidden">
      {/* Accent glow elements */}
      <div className="fixed top-[-250px] left-[-250px] w-[500px] h-[500px] rounded-full bg-[#4D5DFE] opacity-[0.03] blur-[150px] pointer-events-none"></div>
      <div className="fixed bottom-[10%] right-[-150px] w-[400px] h-[400px] rounded-full bg-[#4D5DFE] opacity-[0.04] blur-[120px] pointer-events-none"></div>
      
      {/* Top navigation bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#14141B]/80 backdrop-blur-sm border-b border-[#2A2A3A] z-50 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button 
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
            className="mr-3 p-2 hover:bg-[#1E1E29]/60 rounded-md transition-colors"
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-semibold">Dashboard</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Messages Button - Only show in desktop view */}
          {!isMobileView && (
            <button
              onClick={() => {
                // In desktop view, keep original sidebar toggle behavior
                if (rightSidebarContent === null) {
                  setRightSidebarContent('friends');
                } else {
                  setRightSidebarContent(null);
                }
              }}
              className="flex items-center space-x-2 p-2 hover:bg-[#1E1E29]/60 rounded-md transition-colors"
            >
              <MessageSquare size={20} />
              <span>Messages</span>
            </button>
          )}

          {/* User profile */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-md"></div>
              <img 
                src={userProfile?.profilePic || getImageUrl(`https://ui-avatars.com/api/?name=${userName}&background=4D5DFE&color=fff`)} 
                  alt={userName}
                className="w-8 h-8 rounded-full object-cover relative z-10"
              />
            </div>
            <button onClick={handleLogout} className="text-[#8F8FA3] hover:text-white p-2">
              <LogOut size={18} />
            </button>
          </div>
        </div>
        </div>

      {/* Left Sidebar */}
      {showLeftSidebar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowLeftSidebar(false)}></div>
          <div className="fixed top-16 left-0 h-full w-64 bg-[#14141B] border-r border-[#2A2A3A] z-50 shadow-lg overflow-hidden">
            <div className="p-4 border-b border-[#2A2A3A] flex justify-between items-center">
              <h2 className="font-medium">Menu</h2>
            <button 
                onClick={() => setShowLeftSidebar(false)}
                className="text-[#8F8FA3] hover:text-white p-1 rounded"
          >
                <X size={18} />
            </button>
            </div>
            <div className="p-3">
            <button 
                onClick={() => handleNavigation('projects')}
                className={`w-full flex items-center p-3 mb-2 rounded-md transition-colors ${mainContent === 'projects' ? 'bg-[#4D5DFE]/10 text-[#4D5DFE]' : 'hover:bg-[#1E1E29]/60'}`}
            >
                <Folder size={18} className="mr-3" />
                <span>Projects</span>
            </button>
            <button 
                onClick={() => handleNavigation('tasks')}
                className={`w-full flex items-center p-3 mb-2 rounded-md transition-colors ${mainContent === 'tasks' ? 'bg-[#4D5DFE]/10 text-[#4D5DFE]' : 'hover:bg-[#1E1E29]/60'}`}
              >
                <List size={18} className="mr-3" />
                <span>Tasks</span>
              </button>
              
              {/* Add Messages Menu Items for Mobile */}
              {isMobileView && (
                <>
                  <div className="mt-4 mb-2 px-3 text-sm text-[#8F8FA3]">Messages</div>
                  <button 
                    onClick={() => handleNavigation('messages')}
                    className={`w-full flex items-center p-3 mb-2 rounded-md transition-colors ${mainContent === 'messages' ? 'bg-[#4D5DFE]/10 text-[#4D5DFE]' : 'hover:bg-[#1E1E29]/60'}`}
                  >
                    <MessageSquare size={18} className="mr-3" />
                    <span>Friends</span>
                  </button>
                  <button 
                    onClick={() => handleNavigation('findFriends')}
                    className={`w-full flex items-center p-3 mb-2 rounded-md transition-colors ${mainContent === 'findFriends' ? 'bg-[#4D5DFE]/10 text-[#4D5DFE]' : 'hover:bg-[#1E1E29]/60'}`}
                  >
                    <UserPlus size={18} className="mr-3" />
                    <span>Find Friends</span>
                  </button>
                  <button 
                    onClick={() => handleNavigation('requests')}
                    className={`w-full flex items-center p-3 rounded-md transition-colors ${mainContent === 'requests' ? 'bg-[#4D5DFE]/10 text-[#4D5DFE]' : 'hover:bg-[#1E1E29]/60'}`}
                  >
                    <Bell size={18} className="mr-3" />
                    <span>Friend Requests</span>
                    {friendRequests.length > 0 && (
                      <span className="ml-2 bg-[#4D5DFE] text-white text-xs px-2 py-0.5 rounded-full">
                        {friendRequests.length}
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main content area with padding for fixed header */}
      <div className="pt-16 flex h-screen">
        {/* Main content area */}
        <div className={`flex-1 border-r border-[#2A2A3A] bg-[#14141B]/80 backdrop-blur-sm overflow-y-auto transition-all duration-300 ${rightSidebarContent && !isMobileView ? 'mr-72' : ''}`}>
          {mainContent === 'projects' ? (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">My Projects</h2>
                <button 
                  onClick={handleCreateProject}
                  className="bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-4 py-2 rounded-md text-sm transition-colors flex items-center shadow-lg shadow-[#4D5DFE]/20"
                >
                  <Plus size={16} className="mr-2" />
                  New Project
                </button>
              </div>

              {/* Search Projects */}
              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-2 pl-10 pr-4 bg-[#1E1E29]/60 border border-[#2A2A3A] rounded-md text-white placeholder-[#8F8FA3] focus:outline-none focus:border-[#4D5DFE]"
                />
                <Search className="absolute left-3 top-2.5 text-[#8F8FA3]" size={18} />
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#4D5DFE]"></div>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center p-8 bg-[#14141B]/60 rounded-lg border border-[#2A2A3A]">
                  <FolderOpen size={48} className="mx-auto mb-4 text-[#8F8FA3]" />
                  <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                  <p className="text-[#8F8FA3] mb-6">You haven't created any projects yet</p>
                  <button 
                    onClick={handleCreateProject}
                    className="bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-4 py-2 rounded-md text-sm transition-colors inline-flex items-center"
                  >
                    <Plus size={16} className="mr-2" />
                    Create your first project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects
                    .filter(project => 
                      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map(project => (
                    <div 
                      key={project._id}
                      className="bg-[#1E1E29]/40 rounded-lg p-4 border border-[#2A2A3A] hover:border-[#4D5DFE]/30 transition-colors cursor-pointer"
                      onClick={() => handleOpenProject(project._id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium">{project.name}</h3>
                        <div className="bg-[#4D5DFE]/10 px-2 py-0.5 rounded text-xs text-[#4D5DFE]">
                          {project.language || 'JavaScript'}
                        </div>
                      </div>
                      <p className="text-sm text-[#8F8FA3] mb-4 line-clamp-2">{project.description || 'No description provided'}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="w-6 h-6 rounded-full bg-[#4D5DFE]/20 border border-[#14141B]"></div>
                          ))}
                        </div>
                        <span className="text-xs text-[#8F8FA3]">
                          {project.createdAt ? formatDate(project.createdAt) : 'Unknown date'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : mainContent === 'tasks' ? (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Task Management</h2>
                <button 
                  onClick={() => setShowNewTaskForm(true)}
                  className="bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-4 py-2 rounded-md text-sm transition-colors flex items-center shadow-lg shadow-[#4D5DFE]/20"
                >
                  <Plus size={16} className="mr-2" />
                  <span className="font-bold">New Task</span>
                </button>
              </div>

              {/* New Task Form */}
              {showNewTaskForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-[#14141B] border border-[#2A2A3A] rounded-lg p-5 w-full max-w-md mx-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">Create New Task</h3>
                      <button 
                        onClick={() => setShowNewTaskForm(false)}
                        className="text-[#8F8FA3] hover:text-white p-1 rounded"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                          type="text"
                          value={newTask.title}
                          onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                          className="w-full bg-[#1E1E29]/60 border border-[#2A2A3A] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#4D5DFE]"
                          placeholder="Task title"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          value={newTask.description}
                          onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                          className="w-full bg-[#1E1E29]/60 border border-[#2A2A3A] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#4D5DFE] h-24"
                          placeholder="Task description"
                        ></textarea>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Priority</label>
                        <select
                          value={newTask.priority}
                          onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                          className="w-full bg-[#1E1E29]/60 border border-[#2A2A3A] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#4D5DFE]"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Due Date</label>
                        <input
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                          className="w-full bg-[#1E1E29]/60 border border-[#2A2A3A] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#4D5DFE]"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                          value={newTaskColumn}
                          onChange={(e) => setNewTaskColumn(e.target.value)}
                          className="w-full bg-[#1E1E29]/60 border border-[#2A2A3A] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#4D5DFE]"
                        >
                          <option value="todo">To Do</option>
                          <option value="inProgress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                      
                      <div className="flex space-x-3 pt-2">
                        <button
                          onClick={handleAddTask}
                          className="flex-1 bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-4 py-2 rounded-md transition-colors"
                        >
                          Create Task
                        </button>
                        <button
                          onClick={() => setShowNewTaskForm(false)}
                          className="flex-1 bg-[#1E1E29] hover:bg-[#2A2A3A] px-4 py-2 rounded-md border border-[#2A2A3A] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Edit Task Form */}
              {showEditTaskForm && editingTask && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-[#14141B] border border-[#2A2A3A] rounded-lg p-5 w-full max-w-md mx-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold">Edit Task</h3>
                      <button 
                        onClick={() => {
                          setShowEditTaskForm(false);
                          setEditingTask(null);
                        }}
                        className="text-[#8F8FA3] hover:text-white p-1 rounded"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Title</label>
                        <input
                          type="text"
                          value={editingTask.title}
                          onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                          className="w-full bg-[#1E1E29]/60 border border-[#2A2A3A] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#4D5DFE]"
                          placeholder="Task title"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          value={editingTask.description}
                          onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                          className="w-full bg-[#1E1E29]/60 border border-[#2A2A3A] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#4D5DFE] h-24"
                          placeholder="Task description"
                        ></textarea>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Priority</label>
                        <select
                          value={editingTask.priority}
                          onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})}
                          className="w-full bg-[#1E1E29]/60 border border-[#2A2A3A] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#4D5DFE]"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Due Date</label>
                        <input
                          type="date"
                          value={editingTask.dueDate}
                          onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                          className="w-full bg-[#1E1E29]/60 border border-[#2A2A3A] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#4D5DFE]"
                        />
                      </div>
                      
                      <div className="flex space-x-3 pt-2">
                        <button
                          onClick={handleEditTask}
                          className="flex-1 bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-4 py-2 rounded-md transition-colors"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => {
                            setShowEditTaskForm(false);
                            setEditingTask(null);
                          }}
                          className="flex-1 bg-[#1E1E29] hover:bg-[#2A2A3A] px-4 py-2 rounded-md border border-[#2A2A3A] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#4D5DFE]"></div>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* To Do Column */}
                    <div className="bg-[#14141B]/80 rounded-lg p-4 border border-[#2A2A3A]">
                      <div className="flex items-center mb-4">
                        <Clock className="h-4 w-4 mr-2 text-[#3B82F6]" />
                        <h3 className="text-lg font-bold">To Do</h3>
                        <span className="ml-2 bg-[#3B82F6]/20 text-[#3B82F6] text-xs px-2 py-0.5 rounded-full">
                          {tasks.todo.length}
                        </span>
                      </div>
                      <Droppable droppableId="todo">
                        {(provided) => (
                          <div 
                            className="space-y-3 min-h-[200px]"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            {tasks.todo.map((task, index) => (
                              <Draggable 
                                key={task.id} 
                                draggableId={task.id} 
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`bg-[#1E1E29]/60 rounded-lg p-3 border ${
                                      snapshot.isDragging 
                                        ? 'border-[#3B82F6] shadow-lg' 
                                        : 'border-[#2A2A3A] hover:border-[#3B82F6]/30'
                                    } cursor-pointer transition-colors`}
                                  >
                                    <div className="flex justify-between">
                                      <div className="flex items-center">
                                        <div 
                                          {...provided.dragHandleProps}
                                          className="mr-2 text-[#8F8FA3] cursor-grab hover:text-[#3B82F6]"
                                          title="Drag to reorder"
                                        >
                                          <GripVertical size={14} />
                                        </div>
                                        <h4 className="font-medium">{task.title}</h4>
                                      </div>
                                      <div className="flex space-x-1">
                                        <button 
                                          onClick={() => {
                                            setEditingTask(task);
                                            setShowEditTaskForm(true);
                                          }}
                                          className="p-1 text-[#8F8FA3] hover:text-white"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteTask(task.id, 'todo')}
                                          className="p-1 text-[#8F8FA3] hover:text-[#E94560]"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    {task.description && (
                                      <p className="text-sm text-[#8F8FA3] mb-3 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex justify-between items-center">
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                        task.priority === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-green-500/20 text-green-400'
                                      }`}>
                                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                      </span>
                                      <div className="text-xs text-[#8F8FA3] flex items-center">
                                        <Calendar size={12} className="mr-1" />
                                        {task.dueDate ? formatDate(task.dueDate) : 'No deadline'}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>

                    {/* In Progress Column */}
                    <div className="bg-[#14141B]/80 rounded-lg p-4 border border-[#2A2A3A]">
                      <div className="flex items-center mb-4">
                        <ArrowRight className="h-4 w-4 mr-2 text-[#F59E0B]" />
                        <h3 className="text-lg font-bold">In Progress</h3>
                        <span className="ml-2 bg-[#F59E0B]/20 text-[#F59E0B] text-xs px-2 py-0.5 rounded-full">
                          {tasks.inProgress.length}
                        </span>
                      </div>
                      <Droppable droppableId="inProgress">
                        {(provided) => (
                          <div 
                            className="space-y-3 min-h-[200px]"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            {tasks.inProgress.map((task, index) => (
                              <Draggable 
                                key={task.id} 
                                draggableId={task.id} 
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`bg-[#1E1E29]/60 rounded-lg p-3 border ${
                                      snapshot.isDragging 
                                        ? 'border-[#F59E0B] shadow-lg' 
                                        : 'border-[#2A2A3A] hover:border-[#F59E0B]/30'
                                    } cursor-pointer transition-colors`}
                                  >
                                    <div className="flex justify-between">
                                      <div className="flex items-center">
                                        <div 
                                          {...provided.dragHandleProps}
                                          className="mr-2 text-[#8F8FA3] cursor-grab hover:text-[#F59E0B]"
                                          title="Drag to reorder"
                                        >
                                          <GripVertical size={14} />
                                        </div>
                                        <h4 className="font-medium">{task.title}</h4>
                                      </div>
                                      <div className="flex space-x-1">
                                        <button 
                                          onClick={() => {
                                            setEditingTask(task);
                                            setShowEditTaskForm(true);
                                          }}
                                          className="p-1 text-[#8F8FA3] hover:text-white"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteTask(task.id, 'inProgress')}
                                          className="p-1 text-[#8F8FA3] hover:text-[#E94560]"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    {task.description && (
                                      <p className="text-sm text-[#8F8FA3] mb-3 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex justify-between items-center">
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                        task.priority === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-green-500/20 text-green-400'
                                      }`}>
                                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                      </span>
                                      <div className="text-xs text-[#8F8FA3] flex items-center">
                                        <Calendar size={12} className="mr-1" />
                                        {task.dueDate ? formatDate(task.dueDate) : 'No deadline'}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>

                    {/* Done Column */}
                    <div className="bg-[#14141B]/80 rounded-lg p-4 border border-[#2A2A3A]">
                      <div className="flex items-center mb-4">
                        <Check className="h-4 w-4 mr-2 text-[#10B981]" />
                        <h3 className="text-lg font-bold">Done</h3>
                        <span className="ml-2 bg-[#10B981]/20 text-[#10B981] text-xs px-2 py-0.5 rounded-full">
                          {tasks.done.length}
                        </span>
                      </div>
                      <Droppable droppableId="done">
                        {(provided) => (
                          <div 
                            className="space-y-3 min-h-[200px]"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            {tasks.done.map((task, index) => (
                              <Draggable 
                                key={task.id} 
                                draggableId={task.id} 
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`bg-[#1E1E29]/60 rounded-lg p-3 border ${
                                      snapshot.isDragging 
                                        ? 'border-[#10B981] shadow-lg' 
                                        : 'border-[#2A2A3A] hover:border-[#10B981]/30'
                                    } cursor-pointer transition-colors`}
                                  >
                                    <div className="flex justify-between">
                                      <div className="flex items-center">
                                        <div 
                                          {...provided.dragHandleProps}
                                          className="mr-2 text-[#8F8FA3] cursor-grab hover:text-[#10B981]"
                                          title="Drag to reorder"
                                        >
                                          <GripVertical size={14} />
                                        </div>
                                        <h4 className="font-medium">{task.title}</h4>
                                      </div>
                                      <div className="flex space-x-1">
                                        <button 
                                          onClick={() => {
                                            setEditingTask(task);
                                            setShowEditTaskForm(true);
                                          }}
                                          className="p-1 text-[#8F8FA3] hover:text-white"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteTask(task.id, 'done')}
                                          className="p-1 text-[#8F8FA3] hover:text-[#E94560]"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                    {task.description && (
                                      <p className="text-sm text-[#8F8FA3] mb-3 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex justify-between items-center">
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                        task.priority === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                                        'bg-green-500/20 text-green-400'
                                      }`}>
                                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                      </span>
                                      <div className="text-xs text-[#8F8FA3] flex items-center">
                                        <Calendar size={12} className="mr-1" />
                                        {task.dueDate ? formatDate(task.dueDate) : 'No deadline'}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>
                </DragDropContext>
              )}
            </div>
          ) : isMobileView && ['messages', 'findFriends', 'requests', 'chat'].includes(mainContent) ? (
            <div className="p-6">
              {/* Messages content for mobile view */}
              {mainContent === 'messages' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Friends</h2>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search friends..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-40 bg-[#1E1E29]/80 border border-[#2A2A3A] rounded-md py-1 pl-7 pr-2 text-xs focus:outline-none focus:border-[#4D5DFE]"
                      />
                      <Search className="absolute left-2 top-1.5 text-[#8F8FA3]" size={12} />
                    </div>
                  </div>
                  
                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#4D5DFE]"></div>
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center p-6 bg-[#14141B]/60 rounded-lg border border-[#2A2A3A]">
                      <Users className="mx-auto mb-4 text-[#8F8FA3]" size={32} />
                      <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                      <p className="text-[#8F8FA3] mb-6">Connect with other users to chat and collaborate</p>
                      <button 
                        onClick={() => handleNavigation('findFriends')} 
                        className="bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-4 py-2 rounded-md text-sm transition-colors inline-flex items-center"
                      >
                        <UserPlus size={16} className="mr-2" />
                        Find Friends
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {friends
                        .filter(friend => 
                          (friend.userName?.toLowerCase() || friend.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
                        )
                        .map(friend => (
                          <div 
                            key={friend._id || friend.id} 
                            className="bg-[#1E1E29]/40 rounded-lg p-4 border border-[#2A2A3A] hover:border-[#4D5DFE]/30 transition-colors cursor-pointer"
                            onClick={() => handleSelectFriend(friend)}
                          >
                            <div className="flex items-center">
                              <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-sm"></div>
                                <img 
                                  src={friend.profilePic || friend.avatar || getImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(friend.userName || friend.name || 'User')}&background=4D5DFE&color=fff`)}
                                  alt={friend.userName || friend.name || 'User'} 
                                  className="w-12 h-12 rounded-full object-cover relative z-10"
                                />
                              </div>
                              <div className="ml-3 truncate">
                                <h4 className="font-medium truncate">{friend.userName || friend.name || 'Unknown User'}</h4>
                                <p className="text-xs text-[#8F8FA3] truncate">
                                  {friend.status || 'Online'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
              
              {mainContent === 'findFriends' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Find Friends</h2>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-40 bg-[#1E1E29]/80 border border-[#2A2A3A] rounded-md py-1 pl-7 pr-2 text-xs focus:outline-none focus:border-[#4D5DFE]"
                      />
                      <Search className="absolute left-2 top-1.5 text-[#8F8FA3]" size={12} />
                    </div>
                  </div>
                  
                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#4D5DFE]"></div>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center p-6 bg-[#14141B]/60 rounded-lg border border-[#2A2A3A]">
                      <Users className="mx-auto mb-4 text-[#8F8FA3]" size={32} />
                      <h3 className="text-lg font-semibold mb-2">No users found</h3>
                      <p className="text-[#8F8FA3]">Try searching for different users</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {filteredUsers.map(user => (
                        <div key={user._id || user.id} className="bg-[#1E1E29]/40 rounded-lg p-4 border border-[#2A2A3A]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-sm"></div>
                                <img 
                                  src={user.profilePic || getImageUrl(`https://ui-avatars.com/api/?name=${user.userName || 'User'}&background=4D5DFE&color=fff`)} 
                                  alt={user.userName || 'User'} 
                                  className="w-10 h-10 rounded-full object-cover relative z-10"
                                />
                              </div>
                              <div className="ml-2 truncate">
                                <h4 className="font-medium text-sm truncate">{user.userName || 'Unknown User'}</h4>
                              </div>
                            </div>
                            <button 
                              className="p-1.5 bg-[#4D5DFE]/20 hover:bg-[#4D5DFE]/30 text-[#4D5DFE] rounded-md text-sm transition-colors" 
                              onClick={() => handleSendFriendRequest(user.id)}
                            >
                              <UserPlus size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {mainContent === 'requests' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Friend Requests</h2>
                  </div>
                  
                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#4D5DFE]"></div>
                    </div>
                  ) : friendRequests.length === 0 ? (
                    <div className="text-center p-6 bg-[#14141B]/60 rounded-lg border border-[#2A2A3A]">
                      <Bell className="mx-auto mb-4 text-[#8F8FA3]" size={32} />
                      <h3 className="text-lg font-semibold mb-2">No friend requests</h3>
                      <p className="text-[#8F8FA3]">You don't have any pending friend requests</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {friendRequests.map((request, index) => (
                        <div key={request.id || request._id || index} className="bg-[#1E1E29]/40 rounded-lg p-4 border border-[#2A2A3A]">
                          <div className="flex items-center mb-3">
                            <div className="relative">
                              <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-sm"></div>
                              <img 
                                src={request.avatar || getImageUrl(`https://ui-avatars.com/api/?name=${request.userName || request.name || 'User'}&background=4D5DFE&color=fff`)} 
                                alt={request.userName || request.name || 'User'} 
                                className="w-12 h-12 rounded-full object-cover relative z-10"
                              />
                            </div>
                            <div className="ml-3 truncate">
                              <h4 className="font-medium truncate">{request.userName || request.name || 'Unknown User'}</h4>
                              <p className="text-xs text-[#8F8FA3]">
                                Sent you a request
                              </p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleAcceptFriendRequest(request.id)}
                              className="flex-1 p-1.5 bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white rounded-md text-xs flex items-center justify-center transition-colors"
                            >
                              <Check size={12} className="mr-1" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectFriendRequest(request.id)}
                              className="flex-1 p-1.5 bg-[#E94560]/10 hover:bg-[#E94560]/20 text-[#E94560] rounded-md text-xs flex items-center justify-center transition-colors"
                            >
                              <X size={12} className="mr-1" />
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Chat UI for mobile view */}
              {mainContent === 'chat' && selectedFriend && (
                <div className="flex flex-col h-[calc(100vh-110px)]">
                  {/* Chat header */}
                  <div className="bg-[#14141B]/90 backdrop-blur-sm flex items-center p-4 rounded-t-lg border border-[#2A2A3A]">
                    <button 
                      className="mr-2 text-[#8F8FA3] hover:text-white"
                      onClick={() => {
                        // Go back to friends list
                        handleNavigation('messages');
                        setSelectedFriend(null);
                      }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-sm"></div>
                      <img 
                        src={selectedFriend.profilePic || selectedFriend.avatar || getImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriend.userName || selectedFriend.name || 'User')}&background=4D5DFE&color=fff`)} 
                        alt={selectedFriend.userName || selectedFriend.name || 'User'} 
                        className="w-10 h-10 rounded-full object-cover relative z-10"
                      />
                    </div>
                    <div className="ml-3 flex-1 truncate">
                      <h3 className="font-semibold truncate">{selectedFriend.userName || selectedFriend.name || 'Unknown User'}</h3>
                      <p className="text-xs text-[#8F8FA3]">
                        {selectedFriend.status || 'Online'}
                      </p>
                    </div>
                  </div>

                  {/* Messages area */}
                  <div className="flex-1 p-3 overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#0F0F13] to-[#14141B] border-l border-r border-[#2A2A3A]">
                    {loading ? (
                      <div className="flex justify-center items-center h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#4D5DFE]"></div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-[#8F8FA3]">
                        <MessageSquare size={32} className="mb-2 opacity-20" />
                        <p className="text-sm">No messages yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((message, index) => {
                          const isMyMessage = message.senderId === userId;
                          return (
                            <div 
                              key={message.id || index}
                              className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[90%] rounded-2xl p-2 ${
                                  isMyMessage 
                                    ? 'bg-[#4D5DFE]/90 text-white rounded-tr-none' 
                                    : 'bg-[#1E1E29]/80 backdrop-blur-sm text-white rounded-tl-none'
                                } ${message.pending ? 'opacity-70' : ''}`}
                              >
                                <p className="text-sm">{message.text}</p>
                                <p className="text-xs text-right opacity-70">
                                  {typeof message.timestamp === 'object' 
                                    ? message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                    : new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                  }
                                  {message.pending && ' • Sending...'}
                                  {message.error && ' • Failed to send'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Message input */}
                  <div className="p-3 border border-[#2A2A3A] bg-[#14141B]/90 backdrop-blur-sm rounded-b-lg">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-[#1E1E29]/80 border border-[#2A2A3A] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#4D5DFE] backdrop-blur-sm"
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || socketStatus === 'disconnected'}
                        className="p-2 bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 rounded-full bg-[#4D5DFE]/10 flex items-center justify-center mb-4">
                <Menu size={28} className="text-[#4D5DFE]" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to Your Dashboard</h2>
              <p className="text-[#8F8FA3] max-w-md mb-6">Click the menu icon in the top left to access your projects and tasks</p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => handleNavigation('projects')} 
                  className="bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-4 py-2 rounded-md flex items-center transition-colors"
                >
                  <Folder size={16} className="mr-2" />
                  View Projects
                </button>
                <button 
                  onClick={() => handleNavigation('tasks')} 
                  className="bg-[#1E1E29] border border-[#2A2A3A] hover:bg-[#2A2A3A] px-4 py-2 rounded-md flex items-center transition-colors"
                >
                  <List size={16} className="mr-2" />
                  View Tasks
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Sidebar - Only render for desktop view or when explicitly needed for mobile */}
        {(rightSidebarContent && (!isMobileView || (isMobileView && mainContent === null))) && (
          <div className="w-72 border-l border-[#2A2A3A] bg-[#14141B]/80 backdrop-blur-sm flex flex-col fixed top-16 right-0 bottom-0 transition-all duration-300 ease-in-out z-40">
            {/* Right sidebar content */}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;