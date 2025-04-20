import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Bell, Search, Plus, Code2, LogIn, MoreVertical, UserPlus, Check, X, Users, MessageSquare, Send, ChevronLeft, LogOut } from 'lucide-react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  // Get authentication data from localStorage
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userName, setUserName] = useState(localStorage.getItem('userName') || location.state?.username);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [socket, setSocket] = useState(null);
  
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

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated) {
      // Get userId from localStorage if available, or from API
      const getCurrentUserId = async () => {
        try {
          const response = await fetch('http://localhost:3050/api/users/me', {
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
      console.log('Initializing socket connection for user:', userId);
      
      // Close any existing connections
      if (socket) {
        console.log('Closing existing socket connection:', socket.id);
        socket.disconnect();
      }
      
      const newSocket = io('http://localhost:3050', {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ['websocket', 'polling'],
        query: { userId } // Add userId as a query parameter
      });
      
      // Handle connection events
      newSocket.on('connect', () => {
        console.log('Socket connected successfully:', newSocket.id);
        setError(null); // Clear any previous connection errors
        setSocketStatus('connected');
        
        // Authenticate socket with user ID
        newSocket.emit('authenticate', { token, userId });
        
        // After connection, explicitly join the user's room for direct messages
        console.log(`Joining personal room for user: ${userId}`);
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setSocketStatus('error');
        setError('Connection error. Messages may not send. Attempting to reconnect...');
      });
      
      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Socket reconnection attempt #${attemptNumber}`);
        setSocketStatus('connecting');
        setError(`Connection lost. Reconnection attempt #${attemptNumber}...`);
      });
      
      newSocket.on('reconnect', () => {
        console.log('Socket reconnected successfully');
        setSocketStatus('connected');
        setError(null);
        // Re-authenticate after reconnection
        newSocket.emit('authenticate', { token, userId });
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${reason}`);
        setSocketStatus('disconnected');
        
        if (reason === 'io server disconnect') {
          // Server disconnected us, need to reconnect manually
          newSocket.connect();
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
        const response = await fetch('http://localhost:3050/api/users/friends', {
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
        const friendsResponse = await fetch('http://localhost:3050/api/users/friends', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });
        
        if (friendsResponse.ok) {
          try {
            const friendsData = await friendsResponse.json();
            if (Array.isArray(friendsData)) {
              setFriends(friendsData.map(friend => ({
                id: friend._id,
                name: friend.userName,
                status: 'Online',
                online: true,
                avatar: `https://ui-avatars.com/api/?name=${friend.userName}&background=random`
              })));
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
        const requestsResponse = await fetch('http://localhost:3050/api/users/friend-requests', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });
        
        if (requestsResponse.ok) {
          try {
            const requestsData = await requestsResponse.json();
            if (Array.isArray(requestsData)) {
              setFriendRequests(requestsData.map(user => ({
                id: user._id,
                name: user.userName,
                email: user.email,
                avatar: `https://ui-avatars.com/api/?name=${user.userName}&background=random`
              })));
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
        const usersResponse = await fetch('http://localhost:3050/api/users/all', {
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
              setUsers(usersData.map(user => ({
                id: user._id,
                name: user.userName,
                email: user.email,
                avatar: `https://ui-avatars.com/api/?name=${user.userName}&background=random`
              })));
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

      const refreshResponse = await fetch('http://localhost:3050/api/users/friend-requests', {
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
            setFriendRequests(refreshData.map(user => ({
              id: user._id,
              name: user.userName,
              email: user.email,
              avatar: `https://ui-avatars.com/api/?name=${user.userName}&background=random`
            })));
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
  
  // Handle sending friend request
  const handleSendFriendRequest = async (userId) => {
    try {
      setLoading(true);
      console.log(`Sending friend request to user with ID: ${userId}`);
      
      const response = await fetch('http://localhost:3050/api/users/send-friend-request', {
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
        alert(`Friend request sent to ${responseData.receiverName} successfully!`);
      } else {
        console.error('Failed to send friend request:', responseData);
        setError(responseData.error || 'Failed to send friend request');
      }
    } catch (err) {
      console.error('Error in sending friend request:', err);
      setError('Failed to send friend request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle accepting friend request
  const handleAcceptFriendRequest = async (requesterId) => {
    try {
      setLoading(true);
      console.log(`Accepting friend request from user with ID: ${requesterId}`);
      
      const response = await fetch('http://localhost:3050/api/users/accept-friend-request', {
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
            avatar: `https://ui-avatars.com/api/?name=${responseData.requester.name}&background=random`
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
      const response = await fetch('http://localhost:3050/api/users/reject-friend-request', {
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
    setSelectedFriend(friend);
    // Fetch messages for the selected friend
    fetchMessages(friend.id);
  };

  // Fetch messages for a selected friend
  const fetchMessages = async (friendId) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3050/api/messages/${friendId}`, {
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
        if (socket && sortedMessages.some(msg => msg.sender === friendId && !msg.read)) {
          socket.emit('mark-messages-read', { senderId: friendId });
        }
      } else {
        console.error('Failed to fetch messages');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
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

  // Handle sending a message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    
    if (!newMessage.trim() || !selectedFriend) {
      console.log("Cannot send empty message or no friend selected");
      return;
    }
    
    if (!socket) {
      console.error("Socket connection not established");
      setError("Connection issue. Please refresh the page.");
      return;
    }

    try {
      // Generate a unique reference ID for this message
      const messageRefId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const messageToSend = newMessage.trim();
      
      console.log(`Sending message to ${selectedFriend.id} with refId: ${messageRefId}`);
      
      // Clear any existing timeout
      if (messageTimeoutRef.current) {
        console.log('Clearing existing timeout before sending new message');
        clearTimeout(messageTimeoutRef.current);
        messageTimeoutRef.current = null;
      }
      
      // Add message to local state immediately for responsiveness
      const tempMessage = {
        id: messageRefId, // Use our reference ID
        senderId: userId,
        senderName: userName,
        receiverId: selectedFriend.id,
        text: messageToSend,
        timestamp: new Date(),
        pending: true,
        refId: messageRefId // Store reference ID for easier matching
      };
      
      setMessages(prevMessages => [...prevMessages, tempMessage]);
      
      // Clear message input before sending to avoid multiple sends on rapid clicks
      setNewMessage('');
      
      // Use socket to send message with reference ID
      socket.emit('send-direct-message', {
        receiverId: selectedFriend.id,
        message: messageToSend,
        refId: messageRefId // Include reference ID in the socket message
      });
      
      // Set new timeout with the refId in scope for better debugging
      messageTimeoutRef.current = setTimeout(() => {
        // If no response after 5 seconds, show error
        console.log(`Message send timed out for refId: ${messageRefId}`);
        setError("Message could not be delivered. Please try again.");
        
        // Remove pending status from message
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
      
    } catch (err) {
      console.error('Error sending message:', err);
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
      await fetch('http://localhost:3050/api/users/logout', {
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
      <div className="flex h-screen items-center justify-center bg-[#1a1a1a] text-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-300 mx-auto"></div>
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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-black to-gray-900 text-white">
      {/* Left sidebar with user info and tabs */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-72 flex flex-col border-r border-gray-700 bg-black backdrop-blur-sm bg-opacity-80 shadow-xl"
      >
        {/* User info and navigation header */}
        <div className="p-4 bg-gradient-to-r from-gray-900 to-black rounded-b-xl shadow-md border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-gray-500 to-gray-700 flex items-center justify-center text-xl font-bold mr-3 border border-gray-600">
                {userName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            <div>
                <h3 className="font-bold tracking-wide text-gray-200">{userName || 'User'}</h3>
                <div className="text-xs flex items-center">
                  <span className={`h-2 w-2 rounded-full mr-2 ${
                    socketStatus === 'connected' ? 'bg-green-500' : 
                    socketStatus === 'connecting' ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}></span>
                  <span className="text-gray-400">
                    {socketStatus === 'connected' ? 'Online' : 
                     socketStatus === 'connecting' ? 'Connecting...' : 
                     'Offline'}
                  </span>
            </div>
          </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="text-gray-400 hover:text-red-300 transition-colors p-2 rounded-full hover:bg-gray-800"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
        </div>

          {/* Create/Join Room buttons */}
          <div className="flex space-x-2 mt-3">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCreateRoom}
              className="flex-1 flex items-center justify-center bg-gradient-to-r from-gray-700 to-gray-900 p-2 rounded-lg text-sm shadow-lg hover:shadow-gray-700/30 transition-all border border-gray-600"
            >
              <Plus size={14} className="mr-1" /> Create Room
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/join-room', { state: { username: userName } })}
              className="flex-1 flex items-center justify-center bg-gray-800 p-2 rounded-lg text-sm shadow-lg hover:shadow-gray-700/30 transition-all border border-gray-700"
            >
              <LogIn size={14} className="mr-1" /> Join Room
            </motion.button>
          </div>

          {/* Add a simple room input field below the buttons */}
          {activeTab === 'friends' && !selectedFriend && (
            <div className="mt-3 p-2 bg-gray-900 rounded-lg border border-gray-800">
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  placeholder="Enter room ID to join..."
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="flex-1 p-2 text-sm bg-black border border-gray-700 rounded-lg focus:border-gray-500 focus:ring-1 focus:ring-gray-500 outline-none text-gray-200"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleJoinRoom}
                  disabled={!roomId.trim()}
                  className="p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogIn size={16} />
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs for navigating between friends, users, and requests */}
        <div className="flex border-b border-gray-800 bg-gray-900 bg-opacity-30">
          <motion.button
            whileHover={{ backgroundColor: "rgba(17, 24, 39, 0.8)" }}
            className={`flex-1 py-3 flex justify-center items-center text-sm font-medium transition-colors ${
              activeTab === 'friends' ? 'text-white border-b-2 border-gray-400' : 'text-gray-400'
            }`}
                onClick={() => setActiveTab('friends')} 
          >
            <Users size={16} className="mr-2" /> Friends
          </motion.button>
          <motion.button
            whileHover={{ backgroundColor: "rgba(17, 24, 39, 0.8)" }}
            className={`flex-1 py-3 flex justify-center items-center text-sm font-medium transition-colors ${
              activeTab === 'users' ? 'text-white border-b-2 border-gray-400' : 'text-gray-400'
            }`}
                onClick={() => setActiveTab('users')} 
          >
            <UserPlus size={16} className="mr-2" /> Users
          </motion.button>
          <motion.button
            whileHover={{ backgroundColor: "rgba(17, 24, 39, 0.8)" }}
            className={`flex-1 py-3 flex justify-center items-center text-sm font-medium transition-colors ${
              activeTab === 'requests' ? 'text-white border-b-2 border-gray-400' : 'text-gray-400'
            }`}
                onClick={() => setActiveTab('requests')} 
              >
            <Bell size={16} className="mr-2" /> 
            Requests
                {friendRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {friendRequests.length}
                  </span>
                )}
          </motion.button>
          </div>
          
        {/* Search input */}
        <div className="p-3 border-b border-gray-800">
                        <div className="relative">
                  <input
                    type="text"
              placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => {
                      const term = e.target.value;
                      setSearchTerm(term);
                      
                        // Filter users based on search term
                if (activeTab === 'users') {
                  if (term.length >= 2) {
                    setLoading(true);
                        setTimeout(() => {
                          const filtered = users.filter(user => 
                            user.name.toLowerCase().includes(term.toLowerCase()) || 
                            user.email.toLowerCase().includes(term.toLowerCase())
                          );
                          setFilteredUsers(filtered);
                          setLoading(false);
                        }, 300);
                      } else if (term.length === 0) {
                        setFilteredUsers(users.slice(0, 5));
                  }
                } else if (activeTab === 'friends') {
                  // Filter friends
                  if (term.length >= 1) {
                    const filtered = friends.filter(friend =>
                      friend.name.toLowerCase().includes(term.toLowerCase())
                    );
                    setFriends(filtered);
                  } else {
                    // Reset to original friends list from fetch
                    const fetchFriends = async () => {
                      try {
                        const response = await fetch('http://localhost:3050/api/users/friends', {
                          method: 'GET',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          },
                          credentials: 'include',
                        });
                        if (response.ok) {
                          const friendsData = await response.json();
                          setFriends(friendsData.map(friend => ({
                            id: friend._id,
                            name: friend.userName,
                            status: 'Online',
                            online: true,
                            avatar: `https://ui-avatars.com/api/?name=${friend.userName}&background=random`
                          })));
                        }
                      } catch (err) {
                        console.error('Error fetching friends:', err);
                      }
                    };
                    fetchFriends();
                  }
                }
              }}
              className="w-full p-2 pl-8 rounded-lg bg-black border border-gray-700 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-all outline-none text-sm text-gray-300"
            />
            <Search size={16} className="absolute left-2.5 top-2.5 text-gray-500" />
            
            {searchTerm.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setSearchTerm('');
                  if (activeTab === 'users') {
                    setFilteredUsers(users.slice(0, 5));
                  } else {
                    // Reset friends list
                    const fetchFriends = async () => {
                      try {
                        const response = await fetch('http://localhost:3050/api/users/friends', {
                          method: 'GET',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          },
                          credentials: 'include',
                        });
                        if (response.ok) {
                          const friendsData = await response.json();
                          setFriends(friendsData.map(friend => ({
                            id: friend._id,
                            name: friend.userName,
                            status: 'Online',
                            online: true,
                            avatar: `https://ui-avatars.com/api/?name=${friend.userName}&background=random`
                          })));
                        }
                      } catch (err) {
                        console.error('Error fetching friends:', err);
                      }
                    };
                    fetchFriends();
                  }
                }}
                className="absolute right-2.5 top-2.5 text-gray-500 hover:text-white"
              >
                <X size={14} />
              </motion.button>
            )}
                </div>
                
          {/* Show loading indicator when searching */}
          {loading && (
            <div className="text-center text-xs text-gray-400 mt-1">
              Searching...
            </div>
          )}
        </div>

        {/* User lists based on active tab */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <AnimatePresence mode="wait">
            {activeTab === 'friends' && (
              <motion.div
                key="friends"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {friends.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    <Users size={20} className="mx-auto mb-2" />
                    No friends yet. Add friends from the Users tab.
                  </div>
                ) : (
                  <div>
                    {friends.map((friend) => (
                      <motion.div
                        key={friend.id}
                        whileHover={{ backgroundColor: "rgba(17, 24, 39, 0.8)" }}
                        onClick={() => handleSelectFriend(friend)}
                        className={`flex items-center p-3 cursor-pointer transition-colors ${
                          selectedFriend?.id === friend.id ? 'bg-gray-800 bg-opacity-70' : ''
                        }`}
                      >
                        <div className="h-9 w-9 rounded-full bg-gradient-to-r from-gray-500 to-gray-700 flex items-center justify-center text-sm font-bold mr-3 border border-gray-600">
                          {friend.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-gray-200">{friend.name}</h4>
                          <p className="text-xs text-gray-500 truncate">Click to chat</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    <Search size={20} className="mx-auto mb-2" />
                    No users found.
                  </div>
                ) : (
                          <div>
                    {filteredUsers.map((user) => (
                      <motion.div
                        key={user.id}
                        whileHover={{ backgroundColor: "rgba(17, 24, 39, 0.8)" }}
                        className="flex items-center justify-between p-3 transition-colors"
                      >
                        <div className="flex items-center">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 flex items-center justify-center text-sm font-bold mr-3 border border-gray-700">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-200">{user.name}</h4>
                            <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleSendFriendRequest(user.id)}
                          className="p-2 rounded-full text-white bg-gray-700 hover:bg-gray-600 transition-colors border border-gray-600"
                        >
                          <UserPlus size={16} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            
            {activeTab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {friendRequests.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    <Bell size={20} className="mx-auto mb-2" />
                    No friend requests.
                  </div>
                ) : (
                        <div>
                    {friendRequests.map((request) => (
                      <motion.div
                        key={request.id}
                        whileHover={{ backgroundColor: "rgba(17, 24, 39, 0.8)" }}
                        className="flex items-center p-3 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 flex items-center justify-center text-sm font-bold mr-3 border border-gray-700">
                          {request.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-gray-200">{request.name}</h4>
                          <p className="text-xs text-gray-500 truncate">Sent you a friend request</p>
                      </div>
                        <div className="flex space-x-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          onClick={() => handleAcceptFriendRequest(request.id)}
                            className="p-1.5 rounded-full text-white bg-green-700 hover:bg-green-600 transition-colors border border-green-800"
                            title="Accept"
                          >
                            <Check size={14} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          onClick={() => handleRejectFriendRequest(request.id)}
                            className="p-1.5 rounded-full text-white bg-red-700 hover:bg-red-600 transition-colors border border-red-800"
                            title="Reject"
                        >
                            <X size={14} />
                          </motion.button>
                      </div>
                      </motion.div>
                    ))}
                    </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Main chat container */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex-1 flex flex-col"
      >
        {selectedFriend ? (
          <>
            {/* Chat header */}
            <div className="p-4 flex items-center border-b border-gray-800 bg-black bg-opacity-70 backdrop-blur-sm">
                <button 
                onClick={() => setSelectedFriend(null)}
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 mr-2 md:hidden"
                >
                <ChevronLeft size={18} />
                </button>
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-gray-500 to-gray-700 flex items-center justify-center text-sm font-bold mr-3 border border-gray-600">
                {selectedFriend.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="font-bold text-gray-200">{selectedFriend.name}</h3>
                <div className="text-xs text-gray-500 flex items-center">
                  <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                  Online
          </div>
        </div>
      </div>

            {/* Messages container */}
            <div
              ref={messagesEndRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
              style={{ backgroundImage: 'radial-gradient(circle at center, rgba(17, 24, 39, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)' }}
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-center p-6">
                  <div>
                    <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
                    <p>No messages yet.</p>
                    <p className="text-sm mt-1">Send a message to start the conversation!</p>
              </div>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isMine = message.senderId === userId;
                  return (
                    <motion.div
                      key={message.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-md ${
                          isMine 
                            ? 'bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-tr-none border border-gray-700' 
                            : 'bg-black text-white rounded-tl-none border border-gray-800'
                        } ${message.pending ? 'opacity-70' : ''} ${message.error ? 'bg-red-900 border-red-800' : ''}`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs text-gray-400 mt-1 text-right">
                          {message.pending && '⏳ Sending...'}
                          {message.error && '❌ Failed to send'}
                          {!message.pending && !message.error && new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="p-3 border-t border-gray-800 bg-black bg-opacity-70 backdrop-blur-sm">
              {error && (
                <div className="text-center text-red-500 text-xs mb-2">
                  {error}
              </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 p-3 rounded-full bg-gray-900 border border-gray-700 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-all outline-none text-sm"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!newMessage.trim() || socketStatus !== 'connected'}
                  className="p-3 rounded-full bg-gradient-to-r from-gray-700 to-gray-900 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-gray-700/30 transition-shadow border border-gray-600"
                >
                  <Send size={18} />
                </motion.button>
              </form>
              <div className="text-xs text-center mt-2 text-gray-500">
                {socketStatus === 'connected' ? (
                  <span className="text-green-400">✓ Connected</span>
                ) : (
                  <span className="text-yellow-400">⚠ Connection issues. Messages may not send.</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-center p-6 max-w-md">
              <div className="bg-gradient-to-br from-gray-500 via-gray-600 to-gray-800 w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center border border-gray-700">
                <MessageSquare size={30} className="text-gray-300" />
          </div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-300 to-white mb-2">Welcome to Chat</h2>
              <p className="text-gray-400 mb-6">Select a friend from the sidebar to start chatting or use the rooms feature for collaborative coding.</p>
              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('users')}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white shadow-lg transition-all flex items-center justify-center border border-gray-700"
                >
                  <UserPlus size={16} className="mr-2" /> Find Users
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreateRoom}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white shadow-lg transition-all flex items-center justify-center border border-gray-600"
                >
                  <Code2 size={16} className="mr-2" /> Create Coding Room
                </motion.button>
        </div>
      </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default Dashboard;