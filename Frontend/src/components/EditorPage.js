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
  
  // Add state for project save modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const socketRef = useRef(null);
  const codeChangeRef = useRef(false);
  const debounceTimeoutRef = useRef(null);
  
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
      
      // Join the room
      socketRef.current.emit('join-room', { 
        roomId, 
        username,
        token // Pass the token for authentication
      });
      
      console.log('Joined room:', roomId, 'as', username);
      
      // Request users immediately after joining
      setTimeout(() => {
        requestRoomUsers();
      }, 1000);
    });
    
    // Handle connection error
    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
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
    
    // Handle room users update
    socketRef.current.on('room-users', (users) => {
      console.log('Room users updated:', users);
      if (Array.isArray(users)) {
        // Debug what profile data we're getting
        users.forEach(user => {
          console.log(`User ${user.username} profile data:`, user);
        });
        setCurrentUsers(users);
      } else {
        console.error('Received non-array users data:', users);
        setCurrentUsers([]);
      }
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
    
    // Handle errors
    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
      alert(`Connection error: ${error.message}`);
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
        requestRoomUsers();
      }
    }, 30000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [isConnected, roomId]);
  
  // Add a useEffect to fetch user profiles when users change
  useEffect(() => {
    if (currentUsers && currentUsers.length > 0) {
      fetchUserProfiles(currentUsers);
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
      
      const response = await axios.post(`${API_BASE_URL}/api/users/profiles-by-username`, {
        usernames: usersToFetch
      });
      
      if (response.data && response.data.profiles) {
        console.log('Received user profiles:', response.data.profiles);
        
        // Update the current users with their profile data
        const updatedUsers = currentUsers.map(user => {
          const profile = response.data.profiles.find(p => p.username === user.username);
          
          if (profile) {
            return {
              ...user,
              profilePicture: profile.profilePicture
            };
          }
          
          return user;
        });
        
        setCurrentUsers(updatedUsers);
      }
    } catch (error) {
      console.error('Error fetching user profiles:', error);
      // Don't update the state if there's an error, just continue with what we have
    }
  };
  
  // Helper function to get profile image URL
  const getProfileImageUrl = (user) => {
    // Check if user has a profile picture from the API
    if (user.profilePicture) {
      return getImageUrl(user.profilePicture);
    }
    
    // Fallback to default image based on username (first letter)
    const firstLetter = (user.username || 'A')[0].toUpperCase();
    return `https://ui-avatars.com/api/?name=${firstLetter}&background=random&color=fff&bold=true`;
  };
  
  // Function to render the current tab content on mobile
  const renderMobileTabContent = () => {
    switch (activeTab) {
      case 'editor':
        return (
          <div className="h-full">
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
        );
      case 'files':
        return (
          <FileExplorer 
            roomId={roomId}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
          />
        );
      case 'terminal':
        return (
          <CodeTerminal code={code} language={language} />
        );
      case 'snippets':
        return (
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
        );
      default:
        return null;
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
  
  // Function to handle closing the room
  const closeRoom = async () => {
    // Show confirmation
    const isConfirmed = window.confirm('Are you sure you want to close this room? All unsaved changes will be lost.');
    
    if (isConfirmed) {
      // Show save project modal if applicable
      const shouldSave = window.confirm('Would you like to save this project before closing?');
      
      if (shouldSave) {
        setShowSaveModal(true);
      } else {
        // Directly close the room without saving
        await finishRoomClose();
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
  
  // Function to finish room closure proce
  const finishRoomClose = async () => {
    try {
      // Clean up on server
      await axios.delete(`${API_BASE_URL}/api/rooms/${roomId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Room closed successfully');
      
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
  
  return (
    <div className="flex flex-col h-screen bg-[#14141B] text-white">
      {/* Header */}
      <header className="bg-[#1E1E29] border-b border-[#2A2A3A] h-16 flex items-center px-4 justify-between">
        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
              {roomId}
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
            </div>
          </div>
          
          {/* AnimatedTooltip for users directly in the header */}
          <div className="flex-1 flex justify-center items-center">
            {currentUsers.length > 0 && (
              <AnimatedTooltip 
                size={45}
                items={currentUsers.map(user => {
                  return {
                    id: user.socketId || user.id || Math.random().toString(),
                    name: user.username || 'Anonymous',
                    designation: user.username === username ? '(you)' : '',
                    image: getProfileImageUrl(user)
                  };
                })}
              />
            )}
          </div>
        </div>
      </header>
      
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* File Explorer */}
        {showExplorer && (
          <div className="w-64 border-r border-[#2A2A3A] flex-shrink-0 overflow-y-auto bg-[#14141B]">
            <FileExplorer 
              roomId={roomId}
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
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
        
        {/* Mobile Tabs Navigation */}
        <div className="flex border-t border-[#2A2A3A] bg-[#14141B]">
          <button 
            className={`flex-1 py-3 flex flex-col items-center justify-center ${activeTab === 'editor' ? 'text-[#4D5DFE]' : 'text-gray-400'}`}
            onClick={() => setActiveTab('editor')}
          >
            <Code size={20} />
            <span className="text-xs mt-1">Editor</span>
          </button>
          <button 
            className={`flex-1 py-3 flex flex-col items-center justify-center ${activeTab === 'files' ? 'text-[#4D5DFE]' : 'text-gray-400'}`}
            onClick={() => setActiveTab('files')}
          >
            <FileText size={20} />
            <span className="text-xs mt-1">Files</span>
          </button>
          <button 
            className={`flex-1 py-3 flex flex-col items-center justify-center ${activeTab === 'terminal' ? 'text-[#4D5DFE]' : 'text-gray-400'}`}
            onClick={() => setActiveTab('terminal')}
          >
            <Terminal size={20} />
            <span className="text-xs mt-1">Terminal</span>
          </button>
          <button 
            className={`flex-1 py-3 flex flex-col items-center justify-center ${activeTab === 'snippets' ? 'text-[#4D5DFE]' : 'text-gray-400'}`}
            onClick={() => setActiveTab('snippets')}
          >
            <Code size={20} />
            <span className="text-xs mt-1">Snippets</span>
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