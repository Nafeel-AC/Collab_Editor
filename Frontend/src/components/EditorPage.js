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
import { Users, ChevronDown, ChevronUp, Share2, X, AlertCircle, FileText, Terminal, Code, Menu, Play, RefreshCw } from 'lucide-react';
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
    console.log('Location state:', location.state);
    
    // Connect to WebSocket server
    // Get authentication token
    const token = localStorage.getItem('token');
    
    socketRef.current = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: token
      },
      timeout: 10000 // Add a longer timeout
    });
    
    // Handle connection events
    socketRef.current.on('connect', () => {
      console.log('Connected to server with socket ID:', socketRef.current.id);
      setIsConnected(true);
      
      // Prepare join-room data with all necessary parameters
      const joinRoomData = { 
        roomId, 
        username,
        token, // Pass the token for authentication
        isExistingProject: location.state?.isExistingProject, // Pass flag if it's an existing project
        projectId: location.state?.projectId, // Pass the projectId for loading existing data
        createNewRoom: location.state?.isExistingProject ? true : false, // Explicitly tell server to create a new room
        forceCreateRoom: location.state?.forceCreateRoom // Additional flag for forced room creation
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