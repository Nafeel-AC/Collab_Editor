import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { API_BASE_URL, getImageUrl } from '../config/api.config';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { githubDark } from '@uiw/codemirror-theme-github';
import { Users, ChevronDown, ChevronUp, Share2, X, AlertCircle, FileText, Terminal, Code, Menu, Play, RefreshCw, MessageSquare, Send, ChevronLeft, UserPlus, Bell, Search } from 'lucide-react';
import axios from 'axios';
import { AnimatedTooltip } from './ui/animated-tooltip';

import FileExplorer from './FileExplorer';
import CodeTerminal from './CodeTerminal';
import CodeSnippetLibrary from './CodeSnippetLibrary';

const EditorPage = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const username = location.state?.username || localStorage.getItem('userName') || 'Anonymous';
  const navigate = useNavigate();
  
  // Extract project info from location state
  const projectId = location.state?.projectId;
  const isExistingProject = location.state?.isExistingProject;
  
  const [code, setCode] = useState('// Start coding here');
  const [language, setLanguage] = useState('javascript');
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentUsers, setCurrentUsers] = useState([]);
  const [showUsers, setShowUsers] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showSnippets, setShowSnippets] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [runCode, setRunCode] = useState(false);
  
  // State for mobile responsive tabbed interface
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'files', 'terminal', 'snippets'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileTerminal, setShowMobileTerminal] = useState(false);
  
  // Add state for project save modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Add state for project files
  const [projectFiles, setProjectFiles] = useState([]);
  const [isLoadingProject, setIsLoadingProject] = useState(isExistingProject);
  
  // Chat functionality state
  const [showChat, setShowChat] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [friendSearchTerm, setFriendSearchTerm] = useState('');
  const [userId, setUserId] = useState(localStorage.getItem('userId'));
  const messagesEndRef = useRef(null);
  const messageTimeoutRef = useRef(null);
  
  const socketRef = useRef(null);
  const codeChangeRef = useRef(false);
  const debounceTimeoutRef = useRef(null);
  
  // Add state for tracking image load errors
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  
  // Add state for mobile header dropdown
  const [showMobileHeaderMenu, setShowMobileHeaderMenu] = useState(false);
  
  // Store username in localStorage for persistence
  useEffect(() => {
    if (location.state?.username) {
      localStorage.setItem('lastEditorUsername', location.state.username);
    }
  }, [location.state?.username]);
  
  // Initialize socket connection
  useEffect(() => {
    // Clean up previous socket if it exists
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    console.log('Connecting to socket server...');
    console.log('Room ID:', roomId);
    
    // Get authentication token
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('No authentication token found');
      // You might want to redirect to login or show a message
      return;
    }
    
    // Get userId from localStorage or set it if not available
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    }
    
    // Create socket with same configuration as Dashboard
    socketRef.current = io(API_BASE_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['polling', 'websocket'], // Try polling first like Dashboard
      query: { 
        userId: storedUserId || 'anonymous',
        token: token // Pass token in query params
      },
      autoConnect: true,
      forceNew: true
    });
    
    // Handle connection events
    socketRef.current.on('connect', () => {
      console.log('Connected to server with socket ID:', socketRef.current.id);
      console.log('Transport used:', socketRef.current.io.engine.transport.name);
      setIsConnected(true);
      
      // Authenticate socket explicitly - THIS IS CRITICAL
      socketRef.current.emit('authenticate', { 
        token: token,
        userId: storedUserId 
      });
      
      // Prepare join-room data with all necessary parameters
      const joinRoomData = { 
        roomId, 
        username,
        token, // Pass the token for authentication
        isExistingProject: location.state?.isExistingProject,
        projectId: location.state?.projectId,
        createNewRoom: location.state?.isExistingProject ? true : false,
        forceCreateRoom: location.state?.forceCreateRoom
      };
      
      console.log('Joining room with data:', joinRoomData);
      
      // Join the room with additional information for existing projects
      socketRef.current.emit('join-room', joinRoomData);
      
      // Request users immediately after joining
      setTimeout(() => {
        requestRoomUsers();
      }, 1000);
    });
    
    // Listen for room closure notifications
    socketRef.current.on('room-closed', (data) => {
      console.log('Room has been closed:', data);
      
      // Show notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-md shadow-lg z-50 flex items-center';
      notification.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        <span>${data.message || 'Room has been closed'}</span>
      `;
      
      document.body.appendChild(notification);
      
      // Remove notification after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 5000);
      
      // Disconnect from room
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      // Navigate to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    });
    
    // Confirmation of successful room join
    socketRef.current.on('room-joined', (data) => {
      console.log('Successfully joined room:', data);
      
      // If this was an existing project, update the document title
      if (location.state?.isExistingProject && projectId) {
        // Load the project data if we haven't already
        if (!isLoadingProject && projectFiles.length === 0) {
          console.log('Loading project data after successful room join');
          fetchProjectData(projectId);
        }
      }
      
      // Request users since we're now successfully in the room
      requestRoomUsers();
    });
    
    // Handle connection error
    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
      console.error('Connection error details:', error.message);
      setIsConnected(false);
      
      // Try to connect again after a delay
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        socketRef.current.connect();
      }, 3000);
    });
    
    // Handle disconnection
    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
    });
    
    // Listen for room not found errors
    socketRef.current.on('room-not-found', (data) => {
      console.error('Room not found:', data);
      
      // Check if this is a project open attempt
      if (location.state?.isExistingProject) {
        console.log('This was an attempt to open an existing project. Creating new room...');
        
        // Force room creation on reconnect with a flag
        location.state.forceCreateRoom = true;
        
        // Try reconnecting with forced room creation
        setTimeout(() => {
          if (socketRef.current) {
            console.log('Reconnecting with forced room creation...');
            socketRef.current.connect();
          }
        }, 1000);
      } else {
        // For normal room connections, show error and navigate back
        alert(`Error: Room "${roomId}" not found. The room may have been closed or does not exist.`);
        navigate('/dashboard');
      }
    });

    // Listen for room join errors
    socketRef.current.on('join-room-error', (data) => {
      console.error('Error joining room:', data);
      alert(`Error joining room: ${data.message || 'Unknown error'}`);
      navigate('/dashboard');
    });
    
    // Define the remote code update handler
    const handleRemoteCodeUpdate = (data) => {
      console.log('Received code update:', {
        from: data.sender,
        myId: socketRef.current?.id,
        codeLength: (data.code || data.content || '').length
      });
      
      // Check if this update is from another user (not our own echo)
      if (data.sender !== socketRef.current?.id) {
        console.log('Applying remote code update');
        
        // Prevent our own change handler from firing due to this remote update
        codeChangeRef.current = true;
        
        // Update code editor with the received content
        setCode(data.code || data.content || '');
        
        // Reset flag after a short delay to ensure the UI has updated
        setTimeout(() => {
          codeChangeRef.current = false;
        }, 50);
        
        // Update file content in the backend if this change matches the currently selected file
        if (data.fileId && selectedFile && data.fileId === selectedFile._id) {
          updateFileContent(data.fileId, data.code || data.content);
        }
      } else {
        console.log('Ignoring my own code update echo');
      }
    };
    
    // Listen for both event names (code-update and code-change) for compatibility
    socketRef.current.on('code-update', handleRemoteCodeUpdate);
    socketRef.current.on('code-change', handleRemoteCodeUpdate);
    
    // Handle language changes
    socketRef.current.on('language-change', (data) => {
      console.log('Language changed to:', data.language);
      // Only process updates from other users
      if (data.sender !== socketRef.current.id) {
        setLanguage(data.language);
      }
    });
    
    // Load initial document
    socketRef.current.on('load-document', (content) => {
      console.log('Loaded document:', content);
      setCode(content || '// Start coding here');
    });
    
    // Clean up on unmount
    return () => {
      console.log('Cleaning up socket connection');
      // Cancel any pending debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      if (socketRef.current) {
        // Leave room before disconnecting
        if (socketRef.current.connected) {
          console.log(`Leaving room: ${roomId}`);
          socketRef.current.emit('leave-room', { roomId });
        }
        
        // Remove all listeners
        socketRef.current.off('code-update');
        socketRef.current.off('code-change');
        socketRef.current.off('room-users');
        socketRef.current.off('language-change');
        socketRef.current.off('load-document');
        socketRef.current.off('error');
        
        // Disconnect the socket
        socketRef.current.disconnect();
      }
    };
  }, [roomId, username]);
  
  // Add a new useEffect to periodically refresh the user list
  useEffect(() => {
    // Initial user request
    requestRoomUsers();
    
    // Set up an interval to refresh the users list every 30 seconds
    const intervalId = setInterval(() => {
      if (isConnected) {
        console.log('Refreshing room users list...');
        requestRoomUsers();
      }
    }, 30000); // Changed back to 30s to prevent UI flickering
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [isConnected, roomId]);
  
  // Update the handler for room users to better manage the state
  useEffect(() => {
    if (!socketRef.current) return;

    const handleRoomUsersUpdate = (users) => {
      console.log('Room users updated:', users);
      if (Array.isArray(users)) {
        // Create unique user list by socket ID
        const uniqueUsers = {};
        users.forEach(user => {
          // Use socketId as unique key to prevent duplicates
          if (user.socketId) {
            uniqueUsers[user.socketId] = user;
          }
        });

        // Convert back to array
        const uniqueUserArray = Object.values(uniqueUsers);
        console.log(`Filtered to ${uniqueUserArray.length} unique users from ${users.length} total`);
        
        // Debug what profile data we're getting
        uniqueUserArray.forEach(user => {
          console.log(`User ${user.username} profile data:`, user);
        });
        
        // Only update state if users have actually changed
        const currentIds = new Set(currentUsers.map(u => u.socketId));
        const newIds = new Set(uniqueUserArray.map(u => u.socketId));
        
        // Check if the sets are different sizes or contain different IDs
        const hasUserChanges = currentIds.size !== newIds.size || 
          [...currentIds].some(id => !newIds.has(id)) || 
          [...newIds].some(id => !currentIds.has(id));
        
        if (hasUserChanges) {
          setCurrentUsers(uniqueUserArray);
        } else {
          console.log('No changes in user list, skipping re-render');
        }
      } else {
        console.error('Received non-array users data:', users);
        setCurrentUsers([]);
      }
    };

    // Set up the event listener
    socketRef.current.on('room-users', handleRoomUsersUpdate);
    
    // Cleanup function to remove listener
    return () => {
      if (socketRef.current) {
        socketRef.current.off('room-users', handleRoomUsersUpdate);
      }
    };
  }, [socketRef.current, currentUsers]);
  
  // Add a useEffect to fetch user profiles when users change
  useEffect(() => {
    if (currentUsers && currentUsers.length > 0) {
      // Check if we need to fetch profiles
      const usersNeedingProfiles = currentUsers.filter(user => 
        user.username && !user.profilePicture
      );
      
      if (usersNeedingProfiles.length > 0) {
        console.log('Fetching profiles for users without profile data:', 
          usersNeedingProfiles.map(u => u.username));
        fetchUserProfiles(currentUsers);
      } else {
        console.log('All users have profile data, skipping fetch');
      }
    }
  }, [currentUsers]);
  
  // Add beforeunload handler to alert when closing
  useEffect(() => {
    // Add event listener to handle closing the tab/window
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  // Add function to fetch user profiles
  const fetchUserProfiles = async (users) => {
    try {
      // Only fetch profiles for users that have a username
      const usersToFetch = users
        .filter(user => user.username)
        .map(user => user.username);
      
      if (usersToFetch.length === 0) return;
      
      console.log('Fetching profiles for users:', usersToFetch);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        return;
      }
      
      // Log the API URL for debugging
      console.log(`Making request to: ${API_BASE_URL}/api/users/profiles-by-username`);
      
      const response = await axios.post(`${API_BASE_URL}/api/users/profiles-by-username`, {
        usernames: usersToFetch
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.profiles) {
        console.log('Received user profiles:', response.data.profiles);
        
        // Update the current users with their profile data
        const updatedUsers = currentUsers.map(user => {
          // Find the matching profile, accounting for case differences
          const profile = response.data.profiles.find(p => 
            p.userName?.toLowerCase() === user.username?.toLowerCase()
          );
          
          if (profile) {
            console.log(`Found profile for ${user.username}:`, profile);
            return {
              ...user,
              profilePicture: profile.profilePic // Note: Backend uses profilePic, not profilePicture
            };
          }
          
          return user;
        });
        
        console.log('Updated users with profiles:', updatedUsers);
        setCurrentUsers(updatedUsers);
      }
    } catch (error) {
      console.error('Error fetching user profiles:', error.response || error);
      // Don't update the state if there's an error, just continue with what we have
    }
  };
  
  // Helper function to get profile image URL
  const getProfileImageUrl = (user) => {
    // Check if we've already had an error with this user's image
    if (imageLoadErrors[user.username]) {
      // Return default avatar if there was a previous error
      const firstLetter = (user.username || 'A')[0].toUpperCase();
      return `https://ui-avatars.com/api/?name=${firstLetter}&background=random&color=fff&bold=true`;
    }
    
    try {
      // Log the user object to debug
      console.log(`Getting image URL for user:`, user);
      
      // Check if user has a profile picture from the API
      if (user.profilePicture) {
        // If the profile picture is a full URL, use it directly
        if (user.profilePicture.startsWith('http')) {
          console.log(`Using direct URL: ${user.profilePicture}`);
          return user.profilePicture;
        }
        // Otherwise get the full URL from our API utility
        console.log(`Using API utility for: ${user.profilePicture}`);
        return getImageUrl(user.profilePicture);
      }
    } catch (error) {
      console.warn('Error getting profile image:', error);
      // Continue to fallback
    }
    
    // Fallback to default image based on username (first letter)
    const firstLetter = (user.username || 'A')[0].toUpperCase();
    console.log(`Using fallback avatar for ${user.username}`);
    return `https://ui-avatars.com/api/?name=${firstLetter}&background=random&color=fff&bold=true`;
  };
  
  // Handle image load error
  const handleImageError = (username) => {
    setImageLoadErrors(prev => ({
      ...prev,
      [username]: true
    }));
  };
  
  // Function to render the mobile editor content
  const renderMobileEditorContent = () => {
    return (
      <div className="h-full relative">
        <CodeMirror
          value={code}
          height={showMobileTerminal ? "50%" : "100%"}
          theme={githubDark}
          extensions={[getLanguageExtension()]}
          onChange={handleCodeChange}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
        />
        
        {/* Sticky Run Button */}
        <button 
          onClick={() => {
            setShowMobileTerminal(true);
            setRunCode(true);
          }}
          className="absolute bottom-4 right-4 bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white p-3 rounded-full shadow-lg z-10"
        >
          <Play size={20} />
        </button>
        
        {/* Mobile Terminal */}
        {showMobileTerminal && (
          <div className="h-[50%] border-t border-[#2A2A3A]">
            <div className="flex justify-between items-center bg-[#1E1E29] px-3 py-2">
              <h3 className="text-sm font-semibold">Terminal</h3>
              <button 
                onClick={() => setShowMobileTerminal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <CodeTerminal 
              code={code} 
              language={language} 
              autoRun={runCode} 
              onRunComplete={() => setRunCode(false)} 
            />
          </div>
        )}
      </div>
    );
  };
  
  // Function to render the current tab content on mobile
  const renderMobileTabContent = () => {
    switch (activeTab) {
      case 'editor':
        return renderMobileEditorContent();
      case 'explorer':
        return (
          <FileExplorer 
            roomId={roomId}
            onFileSelect={(file) => {
              handleFileSelect(file);
              setActiveTab('editor'); // Switch back to editor after selecting a file
            }}
            selectedFile={selectedFile}
            initialFiles={isExistingProject ? projectFiles : undefined}
          />
        );
      default:
        return renderMobileEditorContent();
    }
  };
  
  // Function to get the appropriate language extension for CodeMirror
  const getLanguageExtension = () => {
    switch (language) {
      case 'javascript':
        return javascript();
      case 'python':
        return python();
      case 'java':
        return java();
      case 'cpp':
        return cpp();
      case 'html':
        return html();
      case 'css':
        return css();
      case 'json':
        return json();
      case 'markdown':
        return markdown();
      default:
        return javascript(); // Default to JavaScript
    }
  };
  
  // Function to handle code changes in the editor
  const handleCodeChange = (value) => {
    // If the change event was triggered by a remote update, don't broadcast it
    if (codeChangeRef.current) {
      return;
    }
    
    // Update local state
    setCode(value);
    
    // Set up debounce for sending updates
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      // Send update if socket is connected
      if (socketRef.current && socketRef.current.connected && roomId) {
        const updateData = {
          roomId,
          code: value,
          content: value,
          sender: socketRef.current.id,
          fileId: selectedFile?._id,
          timestamp: Date.now()
        };
        
        socketRef.current.emit('code-update', updateData);
        socketRef.current.emit('code-change', updateData);
        
        console.log('Sent code update');
        
        // Update file content in the backend
        if (selectedFile) {
          updateFileContent(selectedFile._id, value);
        }
      }
    }, 500); // 500ms debounce
  };
  
  // Function to update a file's content in the backend
  const updateFileContent = async (fileId, content) => {
    try {
      await axios.put(`${API_BASE_URL}/api/files/${fileId}`, {
        content,
        roomId
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('File content updated in backend');
    } catch (error) {
      console.error('Error updating  content:', error);
    }
  };
  
  // Function to handle file selection
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setCode(file.content || '');
  };
  
  // Function to copy the room ID to clipboard
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied to clipboard!');
  };
  
  // Function to reconnect to the socket server
  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  };
  
  // Function to request room users
  const requestRoomUsers = () => {
    if (socketRef.current && socketRef.current.connected) {
      console.log('Requesting room users for room:', roomId);
      socketRef.current.emit('get-room-users', { roomId });
    } else {
      console.log('Cannot request users: Socket not connected');
    }
  };
  
  // Function to handle closing the room without saving
  const closeRoomWithoutSave = async () => {
    // Show confirmation and wait for response
    const isConfirmed = window.confirm('Are you sure you want to close this room without saving? All changes will be lost.');
    
    // Only proceed if confirmed
    if (isConfirmed) {
      try {
        // Notify all users in the room that it's being closed
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('close-room', {
            roomId,
            username,
            savedProject: false
          });
        }
        
        await finishRoomClose();
      } catch (error) {
        console.error("Error closing room:", error);
        alert("Failed to close room. Please try again.");
      }
    }
  };
  
  // Function to handle closing the room
  const closeRoom = async () => {
    // Show confirmation
    const isConfirmed = window.confirm('Are you sure you want to close this room? All unsaved changes will be lost.');
    
    // Only proceed if confirmed
    if (isConfirmed) {
      // Show save project modal if applicable
      const shouldSave = window.confirm('Would you like to save this project before closing?');
      
      if (shouldSave) {
            setShowSaveModal(true);
          } else {
        // Notify all users in the room that it's being closed without saving
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('close-room', {
            roomId,
            username,
            savedProject: false
          });
        }
        
        // Close without saving
        await closeRoomWithoutSave();
      }
    }
  };
  
  // Function to handle project save
  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Save the current code to the selected file if any
      if (selectedFile) {
        await updateFileContent(selectedFile._id, code);
      }
      
      // Create project in backend
      const response = await axios.post(`${API_BASE_URL}/api/projects`, {
        name: projectName,
        description: projectDescription,
        roomId
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Project saved:', response.data);
      
      setIsSaving(false);
      setShowSaveModal(false);
      
      // Notify all users in the room that it's being closed after saving
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('close-room', {
          roomId,
          username,
          savedProject: true
        });
      }
      
      // Show success message
      alert('Project saved successfully!');
      
      // Continue with room closure if applicable
      await finishRoomClose();
    } catch (error) {
      console.error('Error saving project:', error);
      setIsSaving(false);
      alert(`Error saving project: ${error.response?.data?.message || error.message}`);
    }
  };
  
  // Function to cancel project save
  const cancelSaveProject = () => {
    setShowSaveModal(false);
  };
  
  // Function to finish room closure process
  const finishRoomClose = async () => {
    try {
      // Only attempt to delete the room if it's a newly created room
      // If it's an existing project opened from the dashboard, just navigate away
      if (!location.state?.isExistingProject) {
        // Clean up on server
        await axios.delete(`${API_BASE_URL}/api/rooms/${roomId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('Room closed successfully');
      } else {
        console.log('Navigating away from existing project without deleting room');
      }
      
      // Clean up socket
      if (socketRef.current) {
        if (socketRef.current.connected) {
      socketRef.current.emit('leave-room', { roomId });
        }
        socketRef.current.disconnect();
      }
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error closing room:', error);
      
      // Even if there's an error, still navigate away
      navigate('/dashboard');
    }
  };
  
  // Function to handle beforeunload event
    const handleBeforeUnload = async (e) => {
    // Show a confirmation dialog to the user
    const message = 'Are you sure you want to leave? Any unsaved changes will be lost.';
    e.returnValue = message;
    
    return message;
  };
  
  // Function to check if we're on mobile
  const isMobile = () => window.innerWidth < 768;

  // Add resize listener to update view on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isMobile()) {
        setIsMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Load project data if this is an existing project
  useEffect(() => {
    // If this is an existing project, fetch the project data
    if (isExistingProject && projectId) {
      console.log(`Loading existing project (ID: ${projectId}) into room: ${roomId}`);
      fetchProjectData(projectId);
      
      // Update document title to show it's an existing project
      document.title = `Loading project... - ${roomId}`;
    } else {
      document.title = `Collaborative Editor - ${roomId}`;
    }
  }, [projectId, isExistingProject, roomId]);
  
  // Function to fetch project data
  const fetchProjectData = async (projectId) => {
    try {
      setIsLoadingProject(true);
      
      // Get authentication token
          const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }
      
      console.log(`Fetching project data for project ID: ${projectId}`);
      
      // Fetch project details
      const response = await axios.get(`${API_BASE_URL}/api/projects/${projectId}`, {
              headers: {
                Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data) {
        console.log('Project data loaded:', response.data);
        
        // Store project info
        setProjectName(response.data.name || '');
        setProjectDescription(response.data.description || '');
        document.title = `${response.data.name || 'Project'} - ${roomId}`;
        
        // Load files from project
        if (response.data.files && Array.isArray(response.data.files)) {
          console.log('Project files found:', response.data.files.length);
          setProjectFiles(response.data.files);
          
          // If there are files, select the first one to display in the editor
          if (response.data.files.length > 0) {
            const mainFile = response.data.files[0];
            console.log('Setting main file:', mainFile);
            setSelectedFile(mainFile);
            setCode(mainFile.content || '// Start coding here');
            
            // If we have a language extension, set the editor language
            if (mainFile.name) {
              const extension = mainFile.name.split('.').pop().toLowerCase();
              switch (extension) {
                case 'js':
                  setLanguage('javascript');
                  break;
                case 'py':
                  setLanguage('python');
                  break;
                case 'java':
                  setLanguage('java');
                  break;
                case 'cpp':
                case 'c':
                  setLanguage('cpp');
                  break;
                case 'html':
                  setLanguage('html');
                  break;
                case 'css':
                  setLanguage('css');
                  break;
                case 'json':
                  setLanguage('json');
                  break;
                case 'md':
                  setLanguage('markdown');
                  break;
                default:
                  // Keep default language
                  break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      alert(`Error loading project: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoadingProject(false);
    }
  };
  
  // Chat functionality methods
  
  // Fetch friends list
  const fetchFriends = async () => {
    try {
      setMessagesLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        return;
      }
      
      console.log('Fetching friends...');
      const response = await axios.get(`${API_BASE_URL}/api/users/friends`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Friends API response:', response.data);
      
      // Process friends data
      const friendsData = response.data;
      
      if (Array.isArray(friendsData)) {
        console.log(`Found ${friendsData.length} friends`);
        
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
      } else if (response.data && response.data.friends && Array.isArray(response.data.friends)) {
        console.log(`Found ${response.data.friends.length} friends in nested structure`);
        // Handle alternative response structure with a 'friends' property
        setFriends(response.data.friends);
      } else {
        console.warn('Unexpected friends data structure:', friendsData);
      }
    } catch (err) {
      console.error('Error fetching friends:', err.response?.data || err.message || err);
    } finally {
      setMessagesLoading(false);
    }
  };
  
  // Fetch messages for selected friend
  const fetchMessages = async (friendId) => {
    if (!friendId) {
      console.error('Invalid friend ID provided to fetchMessages:', friendId);
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptFetch = async () => {
      try {
        setMessagesLoading(true);
        console.log(`Fetching messages for friend ID: ${friendId}`);
        
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/messages/${friendId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });

        if (response.ok) {
          const messagesData = await response.json();
          console.log('Raw messages data:', messagesData);
          
          // Process messages to ensure valid timestamps
          const processedMessages = messagesData.map(msg => {
            // Safely create date objects
            let timestamp = null;
            try {
              timestamp = new Date(msg.createdAt || msg.timestamp || Date.now());
              // Verify it's a valid date
              if (isNaN(timestamp.getTime())) {
                timestamp = new Date(); // Fallback to current time if invalid
              }
            } catch (e) {
              console.error('Error parsing message timestamp:', e);
              timestamp = new Date(); // Fallback to current time
            }
            
            return {
              ...msg,
              parsedTimestamp: timestamp // Add a reliable timestamp field
            };
          });
          
          // Sort messages by the validated timestamp
          const sortedMessages = processedMessages.sort((a, b) => 
            a.parsedTimestamp - b.parsedTimestamp
          );
          
          console.log(`Fetched ${sortedMessages.length} messages with ${friendId}`);
          setMessages(sortedMessages);
          
          // Mark received messages as read
          if (socketRef.current && socketRef.current.connected && sortedMessages.some(msg => msg.sender === friendId && !msg.read)) {
            console.log('Marking messages as read');
            socketRef.current.emit('mark-messages-read', { senderId: friendId });
          }
          
          // Scroll to bottom of messages
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to fetch messages:', errorData);
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying message fetch (${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return attemptFetch();
          } else {
            console.error(`Could not load messages. ${errorData.error || response.statusText}`);
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
          console.error('Failed to load messages after multiple attempts');
        }
      } finally {
        setMessagesLoading(false);
      }
    };
    
    // Start the fetch process
    await attemptFetch();
  };
  
  // Handle sending a message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    
    if (!newMessage.trim() || !selectedFriend) {
      console.log("Cannot send empty message or no friend selected");
      return;
    }
    
    if (!socketRef.current) {
      console.error("Socket connection not established");
      return;
    }

    try {
      // Generate a unique reference ID for this message
      const messageRefId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      const messageToSend = newMessage.trim();
      
      // Ensure we have the correct friend ID format
      const friendId = selectedFriend._id || selectedFriend.id;
      
      console.log(`DEBUG: Sending message to ${friendId} with refId: ${messageRefId}`);
      console.log('DEBUG: Socket ID:', socketRef.current.id);
      console.log('DEBUG: Socket connected:', socketRef.current.connected);
      
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
        senderName: username,
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
      console.log('DEBUG: Socket connected status before sending:', socketRef.current.connected);
      
      // Set new timeout - we'll use this as a backup in case the socket acknowledgment fails
      messageTimeoutRef.current = setTimeout(() => {
        console.log(`DEBUG: Message send timed out for refId: ${messageRefId}`);
        
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
      
      // Send the message with acknowledgment callback - EXACTLY as in Dashboard
      socketRef.current.emit('send-direct-message', {
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
          
          // Update the message status to sent immediately rather than waiting for receive-direct-message
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              (msg.refId === messageRefId || msg.id === messageRefId)
                ? {...msg, pending: false, delivered: true, messageId: response.messageId || msg.id} 
                : msg
            )
          );
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
          
          // Try to reconnect if authentication is the issue
          if (response?.error?.includes('authenticated') && socketRef.current) {
            console.log('Trying to reconnect socket due to auth error...');
            // Re-authenticate
            const token = localStorage.getItem('token');
            if (token) {
              socketRef.current.emit('authenticate', { 
                token, 
                userId: localStorage.getItem('userId') 
              });
            }
          }
        }
      });
      
      console.log('DEBUG: Emitted send-direct-message event');
    } catch (err) {
      console.error('DEBUG: Error in handleSendMessage:', err);
    }
  };
  
  // Handle selecting a friend to chat with
  const handleSelectFriend = (friend) => {
    console.log('Selected friend for chat:', friend);
    setSelectedFriend(friend);
    fetchMessages(friend._id || friend.id);
  };
  
  // Add useEffect to load friends when chat is opened
  useEffect(() => {
    if (showChat && friends.length === 0) {
      fetchFriends();
    }
  }, [showChat]);
  
  // Add socket event listeners for messaging
  useEffect(() => {
    if (socketRef.current) {
      console.log('Setting up messaging event listeners');
      
      // Handle socket authentication success
      const handleAuthenticated = (data) => {
        console.log('Socket authenticated successfully for user:', data.userId);
      };
      
      // Handle socket authentication error
      const handleAuthError = (error) => {
        console.error('Socket authentication error:', error);
        // Re-authenticate with current token
        const token = localStorage.getItem('token');
        const storedUserId = localStorage.getItem('userId');
        if (token && socketRef.current && socketRef.current.connected) {
          console.log('Trying to re-authenticate socket...');
          socketRef.current.emit('authenticate', { token, userId: storedUserId });
        }
      };
      
      // Handle socket reconnect
      const handleReconnect = (attempt) => {
        console.log(`Socket reconnected after ${attempt} attempts`);
        // Re-authenticate after reconnect
        const token = localStorage.getItem('token');
        const storedUserId = localStorage.getItem('userId');
        if (token && socketRef.current) {
          socketRef.current.emit('authenticate', { token, userId: storedUserId });
        }
      };
      
      // Handle incoming messages - match Dashboard implementation exactly
      const handleIncomingMessage = (data) => {
        console.log('Received message event:', data);
        
        if (data && (data.senderId || data.sender)) {
          // Extract message information with fallbacks for different formats
          const msgSenderId = data.senderId || data.sender;
          const msgText = data.text || data.message;
          const msgRefId = data.refId || null;
          
          // Verify the received message is from the currently selected friend
          // Compare both _id and id to be safe
          let isFromSelectedFriend = false;
          if (selectedFriend) {
            const selectedFriendId = selectedFriend._id || selectedFriend.id;
            isFromSelectedFriend = msgSenderId === selectedFriendId || 
                                  msgSenderId === selectedFriend._id || 
                                  msgSenderId === selectedFriend.id;
          }
          
          // Only process if we're currently chatting with this person
          if (isFromSelectedFriend) {
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
              
              // If no match by refId, check if this is a duplicate message
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
            
            // Mark as read since we're viewing the conversation
            if (showChat && socketRef.current && socketRef.current.connected) {
              console.log(`Marking message from ${msgSenderId} as read`);
              socketRef.current.emit('mark-messages-read', { senderId: msgSenderId });
            }
            
            // Scroll to bottom of messages
            setTimeout(() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          } else {
            console.log(`Message not for current chat: from ${msgSenderId}, selected friend: ${selectedFriend ? (selectedFriend._id || selectedFriend.id) : 'none'}`);
          }
        } else {
          console.warn('Received malformed message data:', data);
        }
      };
      
      // Handle message status updates
      const handleMessageStatusUpdate = (data) => {
        console.log('Message status updated:', data);
        
        // Handle authentication errors
        if (data.error && data.error.includes('authenticated')) {
          handleAuthError(data.error);
          return;
        }
        
        // Update message status in state
        if (data.refId) {
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              (msg.refId === data.refId || msg.id === data.refId || msg.id === data.messageId)
                ? {...msg, ...data, pending: false} 
                : msg
            )
          );
        }
      };
      
      // Handle messages read confirmation
      const handleMessagesRead = (data) => {
        console.log('Messages read by:', data.by);
      };
      
      // Add listeners
      socketRef.current.on('authenticated', handleAuthenticated);
      socketRef.current.on('authentication_error', handleAuthError);
      socketRef.current.on('reconnect', handleReconnect);
      socketRef.current.on('receive-direct-message', handleIncomingMessage);
      socketRef.current.on('message-status-update', handleMessageStatusUpdate);
      socketRef.current.on('messages-read', handleMessagesRead);
      
      // Cleanup function
      return () => {
        console.log('Cleaning up messaging event listeners');
        if (socketRef.current) {
          socketRef.current.off('authenticated', handleAuthenticated);
          socketRef.current.off('authentication_error', handleAuthError);
          socketRef.current.off('reconnect', handleReconnect);
          socketRef.current.off('receive-direct-message', handleIncomingMessage);
          socketRef.current.off('message-status-update', handleMessageStatusUpdate);
          socketRef.current.off('messages-read', handleMessagesRead);
        }
      };
    }
  }, [socketRef.current, selectedFriend, showChat, userId]);
  
  // Make sure we have the userId
  useEffect(() => {
    // Get userId from localStorage
    const storedUserId = localStorage.getItem('userId');
    
    if (storedUserId) {
      setUserId(storedUserId);
      console.log('Using stored userId:', storedUserId);
    } else {
      // If no userId in localStorage, try to fetch from API
      const fetchUserId = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          
          const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          
          if (response.data && response.data._id) {
            console.log('Fetched userId from API:', response.data._id);
            setUserId(response.data._id);
            localStorage.setItem('userId', response.data._id);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      };
      
      fetchUserId();
    }
  }, []);
  
  // Add socket connection handlers for more reliable operation
  useEffect(() => {
    // Skip if no socket
    if (!socketRef.current) return;
    
    const token = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    
    // Auto re-authenticate every 5 minutes to keep session alive
    const reauthInterval = setInterval(() => {
      console.log('Performing periodic re-authentication');
      if (socketRef.current && socketRef.current.connected && token) {
        socketRef.current.emit('authenticate', { token, userId: storedUserId });
      }
    }, 300000); // 5 minutes
    
    // Listen for connection issues
    const handleConnect = () => {
      console.log('Socket reconnected, re-authenticating');
      if (token) {
        socketRef.current.emit('authenticate', { token, userId: storedUserId });
      }
    };
    
    const handleDisconnect = (reason) => {
      console.log('Socket disconnected, reason:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        setTimeout(() => {
          if (socketRef.current) {
            socketRef.current.connect();
          }
        }, 1000);
      }
    };
    
    // Add connection event listeners
    socketRef.current.on('connect', handleConnect);
    socketRef.current.on('disconnect', handleDisconnect);
    
    // Clean up on unmount
    return () => {
      clearInterval(reauthInterval);
      if (socketRef.current) {
        socketRef.current.off('connect', handleConnect);
        socketRef.current.off('disconnect', handleDisconnect);
      }
    };
  }, [socketRef.current]);
  
  return (
    <div className="flex flex-col h-screen bg-[#14141B] text-white">
      {/* Header */}
      <header className="bg-[#1E1E29] border-b border-[#2A2A3A] h-16 flex items-center px-4 justify-between">
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setShowMobileHeaderMenu(!showMobileHeaderMenu)}
            className="text-white"
          >
            <Menu size={24} />
          </button>
              </div>
              
        {/* Room Details and Actions */}
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500' }`}></div>
            
            {!isConnected && (
              <button
                onClick={reconnect}
                className="text-[#4D5DFE] hover:text-[#3A4AE1]"
                title="Reconnect"
              >
                <RefreshCw size={16} />
              </button>
            )}
            
            <h1 className="text-lg md:text-xl font-bold truncate max-w-[150px] md:max-w-none">
              {projectName ? `${projectName} (${roomId})` : roomId}
            </h1>
            
            {/* Desktop buttons */}
            <div className="hidden md:flex items-center space-x-2">
            <button
              onClick={copyRoomId}
              className="bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-2 py-1 rounded-md text-sm flex items-center transition-colors"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </button>
            <button
              onClick={closeRoom}
              className="bg-[#E94560] hover:bg-[#D32F4D] text-white px-2 py-1 rounded-md text-sm flex items-center transition-colors"
            >
              <X className="h-4 w-4 mr-1" />
              Close
            </button>
              <button
                onClick={closeRoomWithoutSave}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded-md text-sm flex items-center transition-colors"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Close without saving
            </button>
            </div>
          </div>
          
          {/* AnimatedTooltip for users directly in the header */}
          <div className="flex-1 flex justify-center items-center">
            {currentUsers.length > 0 && (
              <AnimatedTooltip 
                size={45}
                items={currentUsers.map(user => ({
                  id: user.socketId || user.id || Math.random().toString(),
                  name: user.username || 'Anonymous',
                  designation: user.username === username ? '(you)' : '',
                  image: getProfileImageUrl(user)
                }))}
              />
            )}
          </div>
          
          {/* Chat button */}
          <div>
            <button
              onClick={() => setShowChat(!showChat)}
              className="bg-[#1E1E29] hover:bg-[#2A2A3A] p-2 rounded-full transition-colors relative"
              title="Chat"
            >
              <MessageSquare size={20} className={showChat ? "text-[#4D5DFE]" : "text-gray-300"} />
            </button>
          </div>
        </div>
      </header>
      
      {/* Mobile Header Menu */}
      {showMobileHeaderMenu && (
        <div className="md:hidden absolute top-16 right-0 z-50 bg-[#1E1E29] border-l border-b border-[#2A2A3A] shadow-xl rounded-bl-md w-64">
          <div className="p-4 space-y-3">
            <button
              onClick={() => {
                copyRoomId();
                setShowMobileHeaderMenu(false);
              }}
              className="w-full bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-3 py-2 rounded-md text-sm flex items-center transition-colors"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Room
            </button>
                  <button 
              onClick={() => {
                setShowSaveModal(true);
                setShowMobileHeaderMenu(false);
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm flex items-center transition-colors"
            >
              <FileText className="h-4 w-4 mr-2" />
              Save Project
            </button>
            <button
              onClick={() => {
                closeRoomWithoutSave();
                setShowMobileHeaderMenu(false);
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-md text-sm flex items-center transition-colors"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Close Without Saving
            </button>
            <button
              onClick={() => {
                closeRoom();
                setShowMobileHeaderMenu(false);
              }}
              className="w-full bg-[#E94560] hover:bg-[#D32F4D] text-white px-3 py-2 rounded-md text-sm flex items-center transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Close Room
                  </button>
                  
            <button
              onClick={() => {
                setShowChat(!showChat);
                setShowMobileHeaderMenu(false);
              }}
              className="w-full bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-3 py-2 rounded-md text-sm flex items-center transition-colors"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {showChat ? 'Close Chat' : 'Open Chat'}
            </button>
                </div>
              </div>
            )}
      
      {/* Loading indicator for projects */}
      {isLoadingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#1E1E29] rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D5DFE]"></div>
            <p className="mt-4 text-white">Loading project...</p>
          </div>
        </div>
      )}
      
      {/* Chat sidebar */}
      {showChat && (
        <div className="fixed top-16 right-0 bottom-0 w-72 border-l border-[#2A2A3A] bg-[#14141B]/80 backdrop-blur-sm flex flex-col z-40 transition-all duration-300 ease-in-out">
          {selectedFriend ? (
            // Chat with selected friend
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-[#2A2A3A] bg-[#14141B]/90 backdrop-blur-sm flex items-center">
                <button 
                  className="mr-3 text-[#8F8FA3] hover:text-white"
                  onClick={() => setSelectedFriend(null)}
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-sm"></div>
                  <img 
                    src={selectedFriend.profilePic || selectedFriend.avatar || getImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriend.userName || selectedFriend.name || 'User')}&background=4D5DFE&color=fff`)} 
                    alt={selectedFriend.userName || selectedFriend.name || 'User'} 
                    className="w-9 h-9 rounded-full object-cover relative z-10"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriend.userName || selectedFriend.name || 'User')}&background=4D5DFE&color=fff`;
                    }}
                  />
                </div>
                <div className="ml-3 flex-1 truncate">
                  <h3 className="font-semibold truncate">{selectedFriend.userName || selectedFriend.name || 'Unknown User'}</h3>
                  <p className="text-xs text-[#8F8FA3]">
                    {selectedFriend.status || 'Online'}
                  </p>
                </div>
                <button 
                  className="text-[#8F8FA3] hover:text-white"
                  onClick={() => setShowChat(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Messages area */}
              <div className="flex-1 p-3 overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#0F0F13] to-[#14141B]">
                {messagesLoading ? (
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
                              {(() => {
                                try {
                                  const dateObj = typeof message.timestamp === 'object' 
                                    ? message.timestamp 
                                    : new Date(message.timestamp || message.createdAt);
                                  
                                  // Add explicit check for invalid date
                                  if (!dateObj || isNaN(dateObj.getTime())) {
                                    return 'Just now';
                                  }
                                  
                                  return dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                } catch (e) {
                                  console.error('Error parsing message timestamp:', e);
                                  return 'Just now';
                                }
                              })()}
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
              <div className="p-3 border-t border-[#2A2A3A] bg-[#14141B]/90 backdrop-blur-sm">
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
                    disabled={!newMessage.trim()}
                    className="p-2 bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            // Friends list
            <>
              <div className="p-4 border-b border-[#2A2A3A] flex justify-between items-center">
                <h2 className="font-semibold">Friends</h2>
                <button 
                  onClick={() => setShowChat(false)}
                  className="p-1.5 bg-[#1E1E29]/60 hover:bg-[#1E1E29] rounded-md transition-colors"
                  title="Close"
                >
                  <X size={16} className="text-[#8F8FA3]" />
                </button>
              </div>
              
              <div className="p-3">
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search friends..."
                    value={friendSearchTerm}
                    onChange={(e) => setFriendSearchTerm(e.target.value)}
                    className="w-full bg-[#1E1E29]/80 border border-[#2A2A3A] rounded-md px-3 py-2 pl-8 text-sm focus:outline-none focus:border-[#4D5DFE]"
                  />
                  <Search className="absolute left-2.5 top-2.5 text-[#8F8FA3]" size={14} />
                </div>
                
                {messagesLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#4D5DFE]"></div>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center p-4 bg-[#14141B]/60 rounded-lg border border-[#2A2A3A]">
                    <Users className="mx-auto mb-3 text-[#8F8FA3]" size={24} />
                    <h3 className="text-sm font-semibold mb-1">No friends yet</h3>
                    <p className="text-xs text-[#8F8FA3] mb-3">Connect with other users to chat</p>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto custom-scrollbar max-h-[calc(100vh-180px)]">
                    {friends
                      .filter(friend => 
                        (friend.userName?.toLowerCase() || friend.name?.toLowerCase() || '').includes(friendSearchTerm.toLowerCase())
                      )
                      .map(friend => (
                        <div 
                          key={friend._id || friend.id} 
                          className="flex items-center p-2 hover:bg-[#1E1E29]/60 rounded-md cursor-pointer transition-colors"
                          onClick={() => handleSelectFriend(friend)}
                        >
                          <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-sm"></div>
                            <img 
                              src={friend.profilePic || friend.avatar || getImageUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(friend.userName || friend.name || 'User')}&background=4D5DFE&color=fff`)} 
                              alt={friend.userName || friend.name || 'User'} 
                              className="w-9 h-9 rounded-full object-cover relative z-10"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.userName || friend.name || 'User')}&background=4D5DFE&color=fff`;
                              }}
                            />
                          </div>
                          <div className="ml-2 truncate">
                            <h4 className="font-medium text-sm truncate">{friend.userName || friend.name || 'Unknown User'}</h4>
                            <p className="text-xs text-[#8F8FA3] truncate">
                              {friend.status || 'Online'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* File Explorer */}
        {showExplorer && (
          <div className="w-64 border-r border-[#2A2A3A] flex-shrink-0 overflow-y-auto bg-[#14141B]">
            <FileExplorer 
              roomId={roomId}
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              initialFiles={isExistingProject ? projectFiles : undefined}
            />
          </div>
        )}
        
        <div className="flex-1 flex flex-col">
          {/* Main Editor Area */}
          <div className="flex-1 overflow-hidden">
            <CodeMirror
              value={code}
              height="100%"
              theme={githubDark}
              extensions={[getLanguageExtension()]}
              onChange={handleCodeChange}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                history: true,
                foldGutter: true,
                drawSelection: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                syntaxHighlighting: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                rectangularSelection: true,
                crosshairCursor: true,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                closeBracketsKeymap: true,
                defaultKeymap: true,
                searchKeymap: true,
                historyKeymap: true,
                foldKeymap: true,
                completionKeymap: true,
                lintKeymap: true,
              }}
            />
          </div>
          
          {/* Terminal */}
          {showTerminal && (
            <CodeTerminal code={code} language={language} autoRun={runCode} onRunComplete={() => setRunCode(false)} />
          )}
        </div>
        
        {/* Code Snippet Library */}
        {showSnippets && (
          <div className="w-80 border-l border-[#2A2A3A] flex-shrink-0 overflow-y-auto bg-[#14141B]">
            <CodeSnippetLibrary onSnippetSelect={(snippet) => {
              const newCode = code + '\n\n' + snippet.code;
              setCode(newCode);
              
              // Broadcast the code update to other users
              if (socketRef.current && socketRef.current.connected && roomId) {
                const updateData = {
                  roomId,
                  code: newCode,
                  content: newCode,
                  sender: socketRef.current.id,
                  fileId: selectedFile?._id,
                  timestamp: Date.now()
                };
                
                socketRef.current.emit('code-update', updateData);
                socketRef.current.emit('code-change', updateData);
                
                console.log('Sent code update with snippet');
                
                // Update file content in the backend
                if (selectedFile) {
                  updateFileContent(selectedFile._id, newCode);
                }
              }
            }} />
          </div>
        )}
      </div>
      
      {/* Mobile Layout with Tabs */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        {/* Mobile file name indicator */}
        {selectedFile && (
          <div className="bg-[#1E1E29] px-4 py-2 text-sm truncate border-b border-[#2A2A3A]">
            <div className="flex items-center">
              <FileText size={14} className="mr-2 text-[#4D5DFE]" />
              <span className="truncate">{selectedFile.name}</span>
            </div>
          </div>
        )}
        
        {renderMobileTabContent()}
        
        {/* Mobile Tabs Navigation - Simplified to just Editor and Explorer */}
        <div className="flex border-t border-[#2A2A3A] bg-[#14141B]">
          <button
            className={`flex-1 py-3 flex flex-col items-center justify-center ${activeTab === 'editor' ? 'text-[#4D5DFE]' : 'text-gray-400'}`}
            onClick={() => setActiveTab('editor')}
          >
            <Code size={22} />
            <span className="text-xs mt-1">Editor</span>
          </button>
          <button
            className={`flex-1 py-3 flex flex-col items-center justify-center ${activeTab === 'explorer' ? 'text-[#4D5DFE]' : 'text-gray-400'}`}
            onClick={() => setActiveTab('explorer')}
          >
            <FileText size={22} />
            <span className="text-xs mt-1">Explorer</span>
          </button>
        </div>
      </div>
      
      {/* Project Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E29] rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">Save Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#14141B] border border-[#2A2A3A] rounded-md text-white"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description (optional)</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#14141B] border border-[#2A2A3A] rounded-md text-white h-24"
                  placeholder="Describe your project"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
          <button
                  onClick={cancelSaveProject}
                  className="px-4 py-2 bg-[#2A2A3A] text-white rounded-md hover:bg-[#3A3A4A]"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProject}
                  className="px-4 py-2 bg-[#4D5DFE] text-white rounded-md hover:bg-[#3D4DF0] flex items-center"
                  disabled={isSaving || !projectName.trim()}
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Project'
                  )}
          </button>
        </div>
      </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorPage;