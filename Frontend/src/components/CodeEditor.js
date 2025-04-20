import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Editor } from '@monaco-editor/react';
import { io } from 'socket.io-client';
import { Save, Copy, Users, Terminal, Play, X, ChevronLeft, ChevronRight, Send, RefreshCw, Sidebar, FileIcon, User, LoaderCircle } from 'lucide-react';
import CodeTerminal from './CodeTerminal';
import FileExplorer from './FileExplorer';

// Debounce helper function
const debounce = (fn, delay) => {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

const CodeEditor = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const socketRef = useRef(null);
  const [language, setLanguage] = useState('javascript');
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [theme, setTheme] = useState('vs-dark');
  const [isConnected, setIsConnected] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [initialDocument, setInitialDocument] = useState('// Start coding here...');
  const [error, setError] = useState(null);
  const socketInitialized = useRef(false);
  
  // File management state
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [files, setFiles] = useState([]);

  // Local state to track if the current edit is from the local user or remote
  const isRemoteEditRef = useRef(false);
  const lastChangeTimeRef = useRef(0);
  const editorContentRef = useRef('// Start coding here...');
  const resizeTimeoutRef = useRef(null);
   
  // New state for HTML preview
  const [isHtmlPreview, setIsHtmlPreview] = useState(false);
  const [htmlPreviewContent, setHtmlPreviewContent] = useState('');
  const iframeRef = useRef(null);
  
  // User input state
  const [inputPrompt, setInputPrompt] = useState('');
  const [userInputs, setUserInputs] = useState([]);
  const [currentUserInput, setCurrentUserInput] = useState('');
  const [waitingForInput, setWaitingForInput] = useState(false);
  const inputRef = useRef(null);
  
  // State for code execution sidebar
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTerminalVisible, setIsTerminalVisible] = useState(false);
  const [executionOutput, setExecutionOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [currentCode, setCurrentCode] = useState('// Start coding here...');

  // Get the username passed from the dashboard
  const username = location.state?.username || 'Anonymous';

  // Handle editor layout update
  const updateEditorLayout = useCallback(debounce(() => {
    if (editorRef.current) {
      editorRef.current.layout();
    }
  }, 100), []);

  // Effect to debug sidebar state changes
  useEffect(() => {
    console.log("File explorer visibility changed:", showFileExplorer);
  }, [showFileExplorer]);

  // Effect to handle editor resize when sidebar visibility changes
  useEffect(() => {
    updateEditorLayout();
  }, [showSidebar, showFileExplorer, updateEditorLayout]);

  // Force initial editor layout update
  useEffect(() => {
    if (editorRef.current) {
      setTimeout(() => {
        updateEditorLayout();
      }, 500);
    }
  }, []);
  
  // Check if HTML is selected whenever language changes
  useEffect(() => {
    setIsHtmlPreview(language === 'html');
  }, [language]);

  // Handle file selection
  const handleFileSelect = async (file) => {
    if (file.type === 'folder') return;
    
    try {
      // Fetch file content
      const response = await fetch(`http://localhost:3050/api/files/${file._id}/content`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch file content');
      }
      
      const data = await response.json();
      
      // Set current file and language
      setCurrentFile(file);
      setLanguage(data.language || 'javascript');
      
      // Update editor content
      if (editorRef.current) {
        editorRef.current.setValue(data.content || '');
        editorContentRef.current = data.content || '';
      }
      
    } catch (err) {
      console.error('Error selecting file:', err);
      setError(`Failed to open file: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!username) {
      navigate('/LoginPage');
      return;
    }

    // Clean up any existing socket connection first
    if (socketRef.current) {
      console.log('Cleaning up existing socket connection before reinitializing');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Prevent multiple socket connections
    if (socketInitialized.current) {
      console.log('Socket already initialized, skipping reconnection');
      return;
    }
    
    socketInitialized.current = true;
    console.log('Initializing socket connection...');
    
    // Connect to socket.io server
    try {
      socketRef.current = io('http://localhost:3050', {
        withCredentials: true,
        reconnectionAttempts: 5,
        timeout: 10000,
        query: { 
          username, // Send username as a query parameter
          roomId,   // Include room ID in connection query
          timestamp: Date.now() // Add timestamp to help identify unique connections
        }
      });
    } catch (err) {
      console.error('Socket connection error:', err);
      setError('Failed to connect to collaboration server. Please try again later.');
      socketInitialized.current = false;
      return;
    }

    // Setup socket event listeners
    socketRef.current.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Connected to socket server with ID:', socketRef.current.id);
      
      // Join the current room
      socketRef.current.emit('join-room', { roomId, username });
      
      // We no longer request the document right away as we'll use the file system
      // to manage documents
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(`Connection error: ${err.message}`);
    });

    socketRef.current.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Disconnected from socket server. Reason:', reason);
    });

    socketRef.current.on('error', (errorData) => {
      console.error('Socket error:', errorData);
      setError(errorData.message || 'An error occurred with the collaboration server');
    });

    socketRef.current.on('room-users', (users) => {
      console.log('Updated room users:', users);
      
      // Filter out duplicate users by unique socketId or username
      if (Array.isArray(users)) {
        // If users are objects with socketId and username
        if (users.length > 0 && typeof users[0] === 'object') {
          const uniqueUsers = users.filter((user, index, self) => 
            self.findIndex(u => u.socketId === user.socketId) === index
          );
          setConnectedUsers(uniqueUsers);
        } 
        // If users are just strings (usernames)
        else {
          const uniqueUsers = [...new Set(users)];
          setConnectedUsers(uniqueUsers);
        }
      } else {
        setConnectedUsers(users || []);
      }
    });

    // Handle remote code changes
    socketRef.current.on('code-change', (data) => {
      // Don't apply changes from self
      if (data.sender === socketRef.current.id) {
        return;
      }

      // Check if the change is for the currently opened file
      if (currentFile && data.fileId && data.fileId !== currentFile._id) {
        console.log(`Received change for different file (${data.fileId}), ignoring`);
        return;
      }
      
      if (editorRef.current) {
        try {
          // Set the flag that indicates we're applying a remote change
          isRemoteEditRef.current = true;
          
          console.log(`Applying remote change from ${data.sender}`);
          
          // Get the full document content from the remote
          const remoteContent = data.content;
          
          // Apply the whole document rather than individual edits
          // This is more reliable for keeping editors in sync
          editorRef.current.setValue(remoteContent);
          
          // Update our local reference
          editorContentRef.current = remoteContent;
          
        } catch (err) {
          console.error('Error applying remote change:', err);
        } finally {
          // Clear the remote edit flag after a brief delay
          // This helps avoid edit loops
          setTimeout(() => {
            isRemoteEditRef.current = false;
          }, 10);
        }
      }
    });

    socketRef.current.on('language-change', (data) => {
      // Only update language if it's for the current file
      if (currentFile && data.fileId && data.fileId !== currentFile._id) {
        return;
      }
      setLanguage(data.language);
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up socket connection');
      socketInitialized.current = false;
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('connect_error');
        socketRef.current.off('disconnect');
        socketRef.current.off('error');
        socketRef.current.off('room-users');
        socketRef.current.off('code-change');
        socketRef.current.off('language-change');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, username, navigate, currentFile]);

  // Update current code whenever editor content changes
  const updateCurrentCode = (content) => {
    setCurrentCode(content);
    
    // Don't send changes if they're from a remote edit
    if (isRemoteEditRef.current) return;
    
    // Throttle sending updates to avoid overwhelming the server
    const now = Date.now();
    if (now - lastChangeTimeRef.current < 50) return;
    lastChangeTimeRef.current = now;
    
    // Only send if we have a connected socket
    if (!socketRef.current || !socketRef.current.connected) {
      console.warn('Socket not connected, cannot sync changes');
      return;
    }
    
    // Send the entire document content instead of just the changes
    socketRef.current.emit('code-change', {
      roomId,
      content,
      sender: socketRef.current.id,
      fileId: currentFile?._id // Include file ID to sync the right file
    });
    
    // Update our reference to the current content
    editorContentRef.current = content;
    
    // Save the file content to the server
    if (currentFile) {
      saveFile(content);
    }
  };

  // Save file content to the server
  const saveFile = debounce(async (content) => {
    if (!currentFile) return;
    
    try {
      const response = await fetch(`http://localhost:3050/api/files/${currentFile._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          language
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save file');
      }
    } catch (err) {
      console.error('Error saving file:', err);
      // Don't show error to avoid disrupting the user experience for auto-saves
    }
  }, 1000); // Debounce saves to avoid too many requests

  // Handle editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    console.log('Editor mounted, setting reference');
    editorRef.current = editor;
    
    if (initialDocument) {
      console.log('Setting initial document from state');
      editor.setValue(initialDocument);
      editorContentRef.current = initialDocument;
      setCurrentCode(initialDocument);
    }
    
    // Setup change event listener
    editor.onDidChangeModelContent((event) => {
      // Skip if this change was caused by a remote edit
      if (isRemoteEditRef.current) return;
      
      // Get the current content of the editor
      const content = editor.getValue();
      setCurrentCode(content);
      
      // Sync the content with other clients
      updateCurrentCode(content);
    });
    
    // Set up periodic document saving
    const saveInterval = setInterval(() => {
      if (!editor || !socketRef.current || !socketRef.current.connected) return;
      
      const document = editor.getValue();
      console.log('Saving document to server...');
      
      socketRef.current.emit('save-document', { 
        roomId, 
        document
      });
    }, 10000); // Save every 10 seconds
    
    // Return cleanup function
    return () => {
      console.log('Cleaning up editor');
      clearInterval(saveInterval);
    };
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    
    // Update file language on the server if we have a current file
    if (currentFile) {
      updateFileLanguage(currentFile._id, newLanguage);
    }
    
    if (socketRef.current && socketRef.current.connected && currentFile) {
      socketRef.current.emit('language-change', { 
        roomId, 
        language: newLanguage,
        fileId: currentFile._id 
      });
    }
  };

  // Function to update file language
  const updateFileLanguage = async (fileId, language) => {
    try {
      const response = await fetch(`http://localhost:3050/api/files/${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update file language');
      }
    } catch (err) {
      console.error('Error updating file language:', err);
      // Silently fail to avoid disrupting the user experience
    }
  };

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Manual reconnect function
  const handleReconnect = () => {
    if (socketRef.current) {
      socketRef.current.connect();
    } else {
      // If socket was completely destroyed, reload the page
      window.location.reload();
    }
  };

  // Execute code function
  const executeCode = async (additionalInputs = []) => {
    if (!editorRef.current) return;
    
    const code = editorRef.current.getValue();
    if (!code.trim()) {
      setExecutionOutput('No code to execute');
      return;
    }

    setIsExecuting(true);
    setExecutionOutput('Executing code...');
    setShowSidebar(true);
    
    // If HTML is selected, run in browser instead of sending to Gemini
    if (language === 'html') {
      try {
        setHtmlPreviewContent(code);
        setExecutionOutput('HTML preview loaded in sidebar.');
        
        // If we have an iframe reference, we can ensure it's refreshed
        if (iframeRef.current) {
          iframeRef.current.srcdoc = code;
        }
      } catch (err) {
        setExecutionOutput(`Error previewing HTML: ${err.message}`);
        console.error('HTML preview error:', err);
      } finally {
        setIsExecuting(false);
      }
      return;
    }
    
    // If this is a fresh execution (not adding more inputs), clear previous inputs
    if (additionalInputs.length === 0) {
      setUserInputs([]);
      setWaitingForInput(false);
      setInputPrompt('');
    }

    try {
      // Create prompt for Gemini
      const prompt = `
You are a code interpreter that only outputs the result of executing the following code.
Only respond with the exact output of the code (including all console.log statements and errors).
Do not include any explanations, markdown formatting, or additional text - ONLY output.
Never include your own text like "Output:" or "Result:" or code blocks with backticks.

Language: ${language}

Code to execute:
${code}
`;

      // Send to backend
      const response = await fetch('http://localhost:3050/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          language,
          userInputs: [...userInputs, ...additionalInputs]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to execute code');
      }

      const data = await response.json();
      
      // Check if input is required
      if (data.status === 'input_required') {
        setWaitingForInput(true);
        setInputPrompt(data.inputPrompt);
        setExecutionOutput(prev => 
          `${prev}\n\n[Program is waiting for input: ${data.inputPrompt}]`
        );
        
        // Focus the input field
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
        
      } else {
        // Execution completed
        setWaitingForInput(false);
        setInputPrompt('');
        setExecutionOutput(data.output || 'No output');
      }
    } catch (err) {
      setExecutionOutput(`Error: ${err.message || 'Failed to execute code'}`);
      console.error('Execution error:', err);
      setWaitingForInput(false);
      setInputPrompt('');
    } finally {
      setIsExecuting(false);
    }
  };

  // Refresh HTML preview
  const refreshHtmlPreview = () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
    setHtmlPreviewContent(code);
    
    if (iframeRef.current) {
      iframeRef.current.srcdoc = code;
    }
  };

  // Handle user input submission
  const handleInputSubmit = (e) => {
    e.preventDefault();
    if (!currentUserInput.trim()) return;
    
    const newInput = currentUserInput.trim();
    setUserInputs(prev => [...prev, newInput]);
    setCurrentUserInput('');
    
    // Add the input to the output display
    setExecutionOutput(prev => `${prev}\n${newInput}`);
    
    // Continue execution with the new input
    executeCode([newInput]);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
    // We'll update the editor layout in the useEffect
  };

  // Toggle file explorer visibility
  const toggleFileExplorer = () => {
    console.log("Toggling file explorer from", showFileExplorer, "to", !showFileExplorer);
    setShowFileExplorer(!showFileExplorer);
    
    // Force editor layout update after toggling with a slight delay
    setTimeout(() => {
      console.log("Updating editor layout after toggle");
      updateEditorLayout();
    }, 300);
  };

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* File Explorer */}
      <div className={`${showFileExplorer ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out h-full overflow-hidden border-r border-gray-700 bg-gray-900 flex-shrink-0`}>
        {showFileExplorer && (
          <FileExplorer 
            roomId={roomId} 
            onFileSelect={handleFileSelect}
            selectedFile={currentFile}
          />
        )}
      </div>

      {/* File Explorer Toggle Button */}
      <button
        onClick={toggleFileExplorer}
        className="fixed top-16 z-30 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-r-md shadow-lg transition-all duration-300 flex items-center justify-center"
        style={{ 
          left: showFileExplorer ? '16rem' : '0', 
          transform: showFileExplorer ? 'translateX(0)' : 'translateX(0)',
          width: '32px',
          height: '32px'
        }}
        title={showFileExplorer ? "Hide Files" : "Show Files"}
      >
        <Sidebar className="h-4 w-4" />
      </button>
      
      {/* Main Editor Area */}
      <div className="flex flex-col flex-1 h-full">
        {/* Header with language selector and controls */}
        <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            {/* Language Dropdown */}
            <div className="relative">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="bg-gray-700 text-gray-200 rounded px-3 py-1.5 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
              </select>
            </div>

            {/* Theme Dropdown */}
            <div className="relative">
              <select
                value={theme}
                onChange={e => handleThemeChange(e.target.value)}
                className="bg-gray-700 text-gray-200 rounded px-3 py-1.5 border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="vs-dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            {/* Current file display */}
            {currentFile && (
              <div className="ml-4 px-3 py-1.5 bg-gray-700 rounded text-gray-200 flex items-center">
                <FileIcon className="h-4 w-4 mr-2 text-blue-400" />
                <span className="truncate max-w-[200px]">{currentFile.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Run Code Button */}
            <button
              onClick={executeCode}
              disabled={isExecuting}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded shadow 
                ${isExecuting ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'} 
                transition duration-200`}
            >
              {isExecuting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Run Code</span>
                </>
              )}
            </button>

            {/* Room ID display and copy button */}
            <div className="flex items-center space-x-1 bg-gray-700 rounded px-2 py-1.5">
              <span className="text-gray-300 text-sm">Room: </span>
              <span className="text-gray-200 font-mono">{roomId}</span>
              <button 
                onClick={copyRoomId}
                className="ml-2 text-gray-400 hover:text-white"
                title="Copy Room ID"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Toggle Output Sidebar Button */}
            <button
              onClick={toggleSidebar}
              className={`bg-gray-700 hover:bg-gray-600 text-gray-200 p-1.5 rounded shadow transition duration-200 ${showSidebar ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              title={showSidebar ? "Hide Terminal" : "Show Terminal"}
            >
              <Terminal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Connection status message */}
        {error && (
          <div className="bg-red-600 text-white px-4 py-2 text-center">
            {error} <button onClick={handleReconnect} className="underline ml-2">Reconnect</button>
          </div>
        )}

        {/* Connected users list */}
        {connectedUsers.length > 0 && (
          <div className="bg-gray-800 px-4 py-2 flex items-center border-b border-gray-700">
            <span className="text-gray-400 text-sm mr-2">Connected:</span>
            <div className="flex flex-wrap max-w-[80%]">
              {/* Show first 5 users only */}
              {connectedUsers.slice(0, 5).map((user, index) => (
                <div 
                  key={index} 
                  className="flex items-center bg-gray-700 rounded-full px-3 py-0.5 text-sm text-gray-200 mr-2 mb-1"
                  style={{ backgroundColor: (typeof user === 'object' ? user.username === username : user === username) ? '#2563eb' : '#374151' }}
                >
                  <User className="h-3 w-3 mr-1" />
                  {typeof user === 'object' ? user.username : user}
                </div>
              ))}
              
              {/* Show additional users count if more than 5 */}
              {connectedUsers.length > 5 && (
                <div className="flex items-center bg-gray-700 rounded-full px-3 py-0.5 text-sm text-gray-200 mr-2 mb-1">
                  +{connectedUsers.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor Area */}
        <div className={`flex-1 overflow-hidden ${copiedMessage ? 'animate-flash' : ''}`}>
          <Editor
            height="100%"
            language={language}
            value={currentCode}
            onChange={updateCurrentCode}
            theme={theme}
            onMount={handleEditorDidMount}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace',
              renderLineHighlight: "line",
              cursorBlinking: "blink",
              tabSize: 2,
            }}
          />
        </div>

        {/* Output Sidebar */}
        <div 
          className={`${showSidebar ? 'h-64' : 'h-0'} transition-all duration-300 ease-in-out border-t border-gray-700 overflow-hidden bg-gray-800`}
        >
          <div className="flex justify-between items-center px-3 py-2 bg-gray-800 border-b border-gray-700">
            <div className="text-gray-300 font-semibold">Output</div>
            <button
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-white p-1"
              title="Close Terminal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="h-[calc(100%-36px)] overflow-auto p-3 font-mono text-sm">
            {language === 'html' && !isExecuting && (
              <div className="h-full bg-white">
                <iframe
                  srcDoc={htmlPreviewContent}
                  title="HTML Preview"
                  className="w-full h-full border-none"
                  ref={iframeRef}
                />
              </div>
            )}

            {isExecuting && (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center">
                  <LoaderCircle className="h-8 w-8 animate-spin text-blue-500" />
                  <p className="mt-2 text-gray-300">Executing code...</p>
                </div>
              </div>
            )}

            {!isExecuting && language !== 'html' && executionOutput && (
              <div className="whitespace-pre-wrap text-gray-200 max-h-full overflow-auto">
                {executionOutput}
              </div>
            )}
          </div>
        </div>

        {/* User Input for CLI */}
        {waitingForInput && !isHtmlPreview && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-800 border-t border-gray-700">
            <form onSubmit={handleInputSubmit} className="flex">
              <input
                type="text"
                value={currentUserInput}
                onChange={(e) => setCurrentUserInput(e.target.value)}
                className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded-l text-white"
                placeholder="Enter input..."
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700"
              >
                Submit
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor; 