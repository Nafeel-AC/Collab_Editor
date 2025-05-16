import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { API_BASE_URL } from '../config/api.config';
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
import { Users, ChevronDown, ChevronUp, Share2, X, AlertCircle } from 'lucide-react';
import axios from 'axios';

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
      }
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
    });
    
    // Handle connection error
    socketRef.current.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
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
  
  // Handle file selection
  useEffect(() => {
    if (selectedFile && selectedFile.type === 'file') {
      console.log('Selected file:', selectedFile.name);
      setCode(selectedFile.content || '// Empty file');
      
      // Determine language based on file extension
      const extension = selectedFile.name.split('.').pop().toLowerCase();
      const langMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'javascript',
        'tsx': 'javascript',
        'py': 'python',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'cpp',
        'h': 'cpp',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
      };
      
      const newLanguage = langMap[extension] || 'javascript';
      setLanguage(newLanguage);
      
      // Notify others of language change if connected
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('language-change', {
          roomId,
          language: newLanguage,
          fileId: selectedFile._id,
          sender: socketRef.current.id
        });
      }
    }
  }, [selectedFile, roomId]);
  
  // Get the appropriate language extension based on the selected language
  const getLanguageExtension = () => {
    const langMap = {
      'javascript': javascript(),
      'python': python(),
      'java': java(),
      'cpp': cpp(),
      'html': html(),
      'css': css(),
      'json': json(),
      'markdown': markdown(),
    };
    
    return langMap[language] || javascript();
  };
  
  // Handle code changes - with debouncing to avoid excessive updates
  const handleCodeChange = (value) => {
    // Don't process if this change was triggered by a remote update
    if (codeChangeRef.current) {
      console.log('Skipping local handling of remote update');
      return;
    }
    
    // Update local state immediately
    setCode(value);
    
    // Cancel previous debounce timer
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce the emission of updates to reduce network traffic
    debounceTimeoutRef.current = setTimeout(() => {
      // Only send updates if connected
      if (socketRef.current && socketRef.current.connected && roomId) {
        console.log('Sending code update to server');
        
        // Use both event names for compatibility
        const updateData = {
          roomId,
          code: value,
          content: value, // Include for compatibility with both event names
          sender: socketRef.current.id,
          fileId: selectedFile?._id,
          timestamp: Date.now() // Add timestamp for ordering
        };
        
        // Emit using both code-update and code-change events for maximum compatibility
        socketRef.current.emit('code-update', updateData);
        socketRef.current.emit('code-change', updateData);
        
        // Update file content in the backend
        if (selectedFile) {
          updateFileContent(selectedFile._id, value);
        }
      } else {
        console.warn('Cannot send update - socket disconnected or no room ID');
      }
    }, 300); // Slightly faster debounce (300ms) for more responsive updates
  };
  
  // Update file content in the backend
  const updateFileContent = async (fileId, content) => {
    if (!fileId) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        console.error('Failed to update file content');
      }
    } catch (err) {
      console.error('Error updating file content:', err);
    }
  };
  
  // Handle file selection
  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };
  
  // Copy room ID to clipboard
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    alert('Room ID copied to clipboard!');
  };
  
  // Handle connection status change
  const reconnect = () => {
    if (!isConnected && socketRef.current) {
      socketRef.current.connect();
    }
  };
  
  // Request current room users
  const requestRoomUsers = () => {
    if (socketRef.current && socketRef.current.connected && roomId) {
      console.log('Requesting room users manually...');
      socketRef.current.emit('get-room-users', { roomId });
    }
  };
  
  // Request room users on initial connection and periodically
  useEffect(() => {
    if (isConnected && roomId) {
      // Request room users initially
      requestRoomUsers();
      
      // Set up interval to periodically refresh the user list
      const interval = setInterval(requestRoomUsers, 10000); // Every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [isConnected, roomId]);
  
  // Close room
  const closeRoom = async () => {
    // If user is authenticated, check if they're the host
    const token = localStorage.getItem('token');
    const isUserLoggedIn = !!token;
    
    console.log('Closing room:', roomId);
    console.log('Current username:', username);
    console.log('Username from localStorage:', localStorage.getItem('userName'));
    console.log('Is user logged in:', isUserLoggedIn);
    
    if (isUserLoggedIn) {
      try {
        // Check if the current user is the host
        const roomResponse = await axios.get(`${API_BASE_URL}/api/rooms/${roomId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
        
        console.log('Room data:', roomResponse.data);
        
        // Fix: Make a more robust check for the creator
        if (roomResponse.data && roomResponse.data.room) {
          const room = roomResponse.data.room;
          console.log('Room creator:', room.createdBy);
          console.log('Current user:', username);
          
          // Check if the current user is the creator - store userName in localStorage for consistency
          localStorage.setItem('userName', username);
          
          const isCreator = room.createdBy === username;
          console.log('Is creator:', isCreator);
          
          if (isCreator) {
            // Show the save modal instead of confirm dialog
            setProjectName(`Project-${roomId}`);
            setProjectDescription(`Project created from room ${roomId}`);
            setShowSaveModal(true);
            return; // Don't proceed with room closing yet
          } else {
            console.log('User is not the creator of this room according to comparison');
            console.log(`Creator: "${room.createdBy}" (${typeof room.createdBy}), Current user: "${username}" (${typeof username})`);
            // Attempt to save anyway if username seems to be a close match (case difference, etc.)
            if (room.createdBy.toLowerCase() === username.toLowerCase()) {
              console.log('Username matches ignoring case, proceeding with save');
              setProjectName(`Project-${roomId}`);
              setProjectDescription(`Project created from room ${roomId}`);
              setShowSaveModal(true);
              return;
            }
          }
        } else {
          console.error('Room data not found in response:', roomResponse.data);
        }
      } catch (error) {
        console.error('Error checking if user is host:', error);
        console.error('Response data:', error.response?.data);
      }
    }
    
    // If we get here, either user is not logged in, not the host, or there was an error
    // Just close the room without saving
    finishRoomClose();
  };
  
  // Handle saving the project and then closing the room
  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      console.log('Saving project with name:', projectName);
      
      // Make sure we're using consistent username
      const savedUsername = localStorage.getItem('userName');
      
      // Check if we have originalProjectId in state (if this was loaded from a project)
      const originalProjectId = location.state?.originalProjectId;
      if (originalProjectId) {
        console.log('This room was loaded from project:', originalProjectId);
      }
      
      const saveResponse = await axios.post(`${API_BASE_URL}/api/projects/save/${roomId}`, {
        name: projectName,
        description: projectDescription || `Project created from room ${roomId}`,
        createdBy: savedUsername, // Add createdBy explicitly to ensure it matches
        originalProjectId // Pass the original project ID if it exists
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      console.log('Project save response:', saveResponse.data);
      const isNewProject = saveResponse.data.isNewProject;
      alert(isNewProject ? 'Project saved successfully!' : 'Project updated successfully!');
      
      // Close the modal and finish closing the room
      setShowSaveModal(false);
      finishRoomClose();
    } catch (saveError) {
      console.error('Error saving project:', saveError);
      console.error('Response data:', saveError.response?.data);
      alert(`Failed to save project: ${saveError.response?.data?.message || saveError.message}`);
      setIsSaving(false);
    }
  };
  
  // Cancel saving and just close the room
  const cancelSaveProject = () => {
    setShowSaveModal(false);
    finishRoomClose();
  };
  
  // Finish closing the room (after save or cancel)
  const finishRoomClose = async () => {
    const token = localStorage.getItem('token');
    
    // First try to close room in the backend
    try {
      if (token) {
        await axios.post(`${API_BASE_URL}/api/rooms/${roomId}/close`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
        console.log('Room closed in the backend successfully');
      }
    } catch (error) {
      console.error('Error closing room in backend:', error);
    }
    
    // Disconnect socket
    if (socketRef.current && socketRef.current.connected && roomId) {
      console.log('Disconnecting socket from room:', roomId);
      socketRef.current.emit('leave-room', { roomId });
    }
    
    // Navigate back to main page
    navigate('/');
  };
  
  // Handle beforeunload to close room when user closes the window
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      if (roomId) {
        // Try to close the room
        try {
          const token = localStorage.getItem('token');
          if (token) {
            await axios.post(`${API_BASE_URL}/api/rooms/${roomId}/close`, {}, {
              headers: {
                Authorization: `Bearer ${token}`
              },
              withCredentials: true
            });
          }
        } catch (error) {
          console.error('Error closing room on window close:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId]);
  
  return (
    <div className="flex flex-col h-screen bg-[#0F0F13] text-white">
      {/* Project Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#14141B] border border-[#2A2A3A] rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Save Project</h2>
            <p className="text-[#8F8FA3] mb-6">Save your project to access it later from your dashboard.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-[#1E1E29] border border-[#2A2A3A] rounded-md px-3 py-2 focus:outline-none focus:border-[#4D5DFE]"
                  placeholder="Enter project name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full bg-[#1E1E29] border border-[#2A2A3A] rounded-md px-3 py-2 focus:outline-none focus:border-[#4D5DFE] h-24 resize-none"
                  placeholder="Enter project description"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={cancelSaveProject}
                className="flex-1 bg-[#1E1E29] hover:bg-[#2A2A3A] text-white py-2 rounded-md transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                className="flex-1 bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white py-2 rounded-md transition-colors disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Project'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header with room info and users */}
      <header className="bg-[#14141B] border-b border-[#2A2A3A] p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">Room: {roomId}</h1>
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
          
          <div className="relative">
            <button
              onClick={() => {
                setShowUsers(!showUsers);
                if (!showUsers) {
                  requestRoomUsers(); // Refresh users when opening the panel
                }
              }}
              className="bg-[#1E1E29] hover:bg-[#2A2A3A] px-3 py-1 rounded-md flex items-center transition-colors"
            >
              <Users className="h-4 w-4 mr-2" />
              <span>{currentUsers.length} {currentUsers.length === 1 ? 'User' : 'Users'}</span>
              {showUsers ? (
                <ChevronUp className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2" />
              )}
            </button>
            
            {showUsers && (
              <div className="absolute right-0 mt-2 w-56 bg-[#14141B] border border-[#2A2A3A] rounded-md shadow-lg z-10">
                <div className="p-2 border-b border-[#2A2A3A] flex justify-between items-center">
                  <h3 className="text-sm font-medium">Users in this room</h3>
                  <button 
                    onClick={requestRoomUsers}
                    className="text-xs text-[#4D5DFE] hover:text-[#3A4AE1]"
                    title="Refresh users list"
                  >
                    Refresh
                  </button>
                </div>
                <ul className="max-h-60 overflow-y-auto">
                  {currentUsers && currentUsers.length > 0 ? (
                    currentUsers.map((user, index) => (
                      <li key={index} className="px-3 py-2 hover:bg-[#1E1E29] flex items-center">
                        <div className="h-2 w-2 rounded-full bg-[#4ADE80] mr-2" />
                        <span>{user.username || 'Anonymous'}</span>
                        {user.username === username && <span className="ml-2 text-xs text-[#8F8FA3]">(you)</span>}
                      </li>
                    ))
                  ) : (
                    <li className="px-3 py-2 text-[#8F8FA3]">No other users in this room</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
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
            <CodeTerminal code={code} language={language} />
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
      
      {/* Bottom Action Bar */}
      <div className="bg-[#14141B] border-t border-[#2A2A3A] p-2 flex justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => setShowExplorer(!showExplorer)}
            className={`px-3 py-1 rounded text-sm transition-colors ${showExplorer ? 'bg-[#4D5DFE] hover:bg-[#3A4AE1]' : 'bg-[#1E1E29] hover:bg-[#2A2A3A]'}`}
          >
            File Explorer
          </button>
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`px-3 py-1 rounded text-sm transition-colors ${showTerminal ? 'bg-[#4D5DFE] hover:bg-[#3A4AE1]' : 'bg-[#1E1E29] hover:bg-[#2A2A3A]'}`}
          >
            Terminal
          </button>
          <button
            onClick={() => setShowSnippets(!showSnippets)}
            className={`px-3 py-1 rounded text-sm transition-colors ${showSnippets ? 'bg-[#4D5DFE] hover:bg-[#3A4AE1]' : 'bg-[#1E1E29] hover:bg-[#2A2A3A]'}`}
          >
            Code Snippets
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;