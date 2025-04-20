import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  File as FileIcon,
  Plus,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit,
  Trash,
  X,
  Check,
  FileText,
  FileCode,
  FilePlus,
  FolderPlus
} from 'lucide-react';

// Helper to determine icon based on file extension
const getFileIcon = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();
  
  const iconMap = {
    js: <FileCode className="w-4 h-4 text-yellow-400" />,
    jsx: <FileCode className="w-4 h-4 text-yellow-400" />,
    ts: <FileCode className="w-4 h-4 text-blue-400" />,
    tsx: <FileCode className="w-4 h-4 text-blue-400" />,
    html: <FileCode className="w-4 h-4 text-orange-400" />,
    css: <FileCode className="w-4 h-4 text-purple-400" />,
    json: <FileCode className="w-4 h-4 text-green-400" />,
    md: <FileText className="w-4 h-4 text-gray-400" />,
    txt: <FileText className="w-4 h-4 text-gray-400" />,
    py: <FileCode className="w-4 h-4 text-blue-500" />,
    java: <FileCode className="w-4 h-4 text-red-500" />,
    rb: <FileCode className="w-4 h-4 text-red-400" />,
    php: <FileCode className="w-4 h-4 text-indigo-400" />,
  };
  
  return iconMap[extension] || <FileIcon className="w-4 h-4 text-gray-400" />;
};

// Component to build the file tree
const FileExplorer = ({ roomId, onFileSelect, selectedFile }) => {
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [newItemMode, setNewItemMode] = useState(null); // 'file', 'folder', or null
  const [newItemName, setNewItemName] = useState('');
  const [newItemParent, setNewItemParent] = useState(null);
  const [renamingItem, setRenamingItem] = useState(null);
  const [newName, setNewName] = useState('');
  
  const menuRef = useRef(null);
  const newItemInputRef = useRef(null);
  const renameInputRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus input when creating new item
  useEffect(() => {
    if (newItemMode && newItemInputRef.current) {
      newItemInputRef.current.focus();
    }
  }, [newItemMode]);

  // Focus input when renaming
  useEffect(() => {
    if (renamingItem && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingItem]);

  // Fetch files from the server
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:3050/api/files/room/${roomId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch files');
        }
        
        const data = await response.json();
        setFiles(data.files || []);
        
        // Automatically expand root level
        const expanded = {};
        data.files.forEach(file => {
          if (file.type === 'folder' && !file.path.includes('/')) {
            expanded[file._id] = true;
          }
        });
        setExpandedFolders(expanded);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching files:', err);
        setError('Failed to load files');
        setLoading(false);
      }
    };

    // Initialize files if room is empty
    const initializeFiles = async () => {
      try {
        const response = await fetch(`http://localhost:3050/api/files/initialize/${roomId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: 'Anonymous' }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to initialize files');
        }
        
        await fetchFiles();
      } catch (err) {
        console.error('Error initializing files:', err);
        setError('Failed to initialize files');
        setLoading(false);
      }
    };

    if (roomId) {
      fetchFiles();
      
      // If no files were found, initialize with defaults
      if (files.length === 0 && !loading && !error) {
        initializeFiles();
      }
    }
  }, [roomId]);

  // Build the file tree structure
  const buildFileTree = () => {
    const rootItems = files.filter(file => !file.path.includes('/') || file.parentId === null);
    return rootItems.sort((a, b) => {
      // Folders first
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
  };

  // Get children of a folder
  const getFolderChildren = (folderId) => {
    return files
      .filter(file => file.parentId && file.parentId.toString() === folderId.toString())
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  };

  // Toggle folder expansion
  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Handle file selection
  const handleFileClick = (file) => {
    if (file.type === 'folder') {
      toggleFolder(file._id);
    } else {
      onFileSelect(file);
    }
  };

  // Create new file or folder
  const handleCreateItem = async (e) => {
    e.preventDefault();
    
    if (!newItemName.trim()) return;
    
    try {
      const parentPath = newItemParent ? 
        files.find(f => f._id === newItemParent)?.path : '';
      
      const newItemPath = parentPath ? 
        `${parentPath}/${newItemName}` : newItemName;
      
      const response = await fetch('http://localhost:3050/api/files/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          name: newItemName,
          type: newItemMode,
          path: newItemPath,
          parentId: newItemParent,
          content: newItemMode === 'file' ? '// New file' : '',
          language: newItemMode === 'file' ? 
            (newItemName.endsWith('.js') ? 'javascript' : 
             newItemName.endsWith('.py') ? 'python' : 
             newItemName.endsWith('.html') ? 'html' : 
             newItemName.endsWith('.css') ? 'css' : 
             newItemName.endsWith('.md') ? 'markdown' : 
             'javascript') : '',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create item');
      }
      
      const data = await response.json();
      
      // Add new file to the list
      setFiles(prev => [...prev, data.file]);
      
      // If it's a folder, expand it
      if (newItemMode === 'folder') {
        setExpandedFolders(prev => ({
          ...prev,
          [data.file._id]: true
        }));
      }
      
      // If it's a file, select it
      if (newItemMode === 'file') {
        onFileSelect(data.file);
      }
      
      // Reset state
      setNewItemMode(null);
      setNewItemName('');
      setNewItemParent(null);
      
      // If parent folder exists, make sure it's expanded
      if (newItemParent) {
        setExpandedFolders(prev => ({
          ...prev,
          [newItemParent]: true
        }));
      }
    } catch (err) {
      console.error('Error creating item:', err);
      alert(`Failed to create ${newItemMode}: ${err.message}`);
    }
  };

  // Cancel new item creation
  const handleCancelCreate = () => {
    setNewItemMode(null);
    setNewItemName('');
    setNewItemParent(null);
  };

  // Start creating new file/folder
  const startCreatingItem = (type, parentId = null) => {
    setNewItemMode(type);
    setNewItemParent(parentId);
    setNewItemName('');
    setMenuOpen(null); // Close the menu
  };

  // Handle file/folder renaming
  const handleRename = async (e) => {
    e.preventDefault();
    
    if (!newName.trim() || !renamingItem) return;
    
    try {
      const response = await fetch(`http://localhost:3050/api/files/${renamingItem}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newName
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to rename item');
      }
      
      const data = await response.json();
      
      // Update files list
      setFiles(prev => prev.map(file => 
        file._id === renamingItem ? data.file : file
      ));
      
      // Reset rename state
      setRenamingItem(null);
      setNewName('');
    } catch (err) {
      console.error('Error renaming item:', err);
      alert(`Failed to rename: ${err.message}`);
    }
  };

  // Start renaming file/folder
  const startRenaming = (fileId) => {
    const file = files.find(f => f._id === fileId);
    if (file) {
      setRenamingItem(fileId);
      setNewName(file.name);
      setMenuOpen(null); // Close the menu
    }
  };

  // Delete file/folder
  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3050/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      
      // Remove from files list
      setFiles(prev => prev.filter(file => file._id !== fileId));
      setMenuOpen(null);
    } catch (err) {
      console.error('Error deleting item:', err);
      alert(`Failed to delete: ${err.message}`);
    }
  };

  // Render the file tree
  const renderFileTree = (items, level = 0) => {
    return items.map(item => {
      const isFolder = item.type === 'folder';
      const isExpanded = expandedFolders[item._id];
      const isSelected = selectedFile && selectedFile._id === item._id;
      const isRenaming = renamingItem === item._id;
      
      return (
        <div key={item._id} style={{ marginLeft: `${level * 12}px` }}>
          <div 
            className={`flex items-center py-1.5 px-2 text-sm rounded-md cursor-pointer relative group transition-colors
              ${isSelected && !isFolder ? 'bg-blue-600 bg-opacity-90 text-white shadow-sm' : 
                'text-gray-200 hover:bg-gray-700 hover:bg-opacity-70'}`}
            onClick={() => handleFileClick(item)}
          >
            {isFolder && (
              <span className="mr-1 text-gray-400 hover:text-white transition-colors flex items-center" 
                    onClick={(e) => { e.stopPropagation(); toggleFolder(item._id); }}>
                {isExpanded ? 
                  <ChevronDown className="w-4 h-4 transform transition-transform" /> : 
                  <ChevronRight className="w-4 h-4 transform transition-transform" />}
              </span>
            )}
            
            <span className="mr-1.5 flex items-center">
              {isFolder 
                ? (isExpanded ? 
                    <FolderOpen className="w-4 h-4 text-yellow-300" /> : 
                    <Folder className="w-4 h-4 text-yellow-300" />)
                : getFileIcon(item.name)
              }
            </span>
            
            {isRenaming ? (
              <form onSubmit={handleRename} className="flex-1 flex">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 bg-gray-800 text-white text-sm py-0.5 px-1.5 outline-none border border-blue-500 rounded focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
                <button 
                  type="submit" 
                  className="ml-1 text-green-400 hover:text-green-300 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleRename(e); }}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  className="ml-1 text-red-400 hover:text-red-300 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setRenamingItem(null); }}
                >
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <>
                <span className="flex-1 truncate font-medium text-sm">{item.name}</span>
                
                <button 
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-opacity transition-colors"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setMenuOpen(menuOpen === item._id ? null : item._id); 
                  }}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                {menuOpen === item._id && (
                  <div 
                    ref={menuRef}
                    className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-30 py-1 min-w-[160px] transform origin-top-right scale-100 opacity-100 transition-all duration-150"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isFolder && (
                      <>
                        <button 
                          className="w-full text-left px-4 py-1.5 hover:bg-gray-700 flex items-center text-sm text-gray-200 hover:text-white transition-colors"
                          onClick={() => startCreatingItem('file', item._id)}
                        >
                          <FilePlus className="w-3.5 h-3.5 mr-2" />
                          New File
                        </button>
                        <button 
                          className="w-full text-left px-4 py-1.5 hover:bg-gray-700 flex items-center text-sm text-gray-200 hover:text-white transition-colors"
                          onClick={() => startCreatingItem('folder', item._id)}
                        >
                          <Folder className="w-3.5 h-3.5 mr-2" />
                          New Folder
                        </button>
                        <div className="border-t border-gray-700 my-1"></div>
                      </>
                    )}
                    <button 
                      className="w-full text-left px-4 py-1.5 hover:bg-gray-700 flex items-center text-sm text-gray-200 hover:text-white transition-colors"
                      onClick={() => startRenaming(item._id)}
                    >
                      <Edit className="w-3.5 h-3.5 mr-2" />
                      Rename
                    </button>
                    <button 
                      className="w-full text-left px-4 py-1.5 hover:bg-gray-700 flex items-center text-sm text-red-400 hover:text-red-300 transition-colors"
                      onClick={() => handleDelete(item._id)}
                    >
                      <Trash className="w-3.5 h-3.5 mr-2" />
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Render folder children if expanded */}
          {isFolder && isExpanded && (
            <div className="animate-fadeIn">
              {renderFileTree(getFolderChildren(item._id), level + 1)}
              
              {/* Form for new item inside this folder */}
              {newItemMode && newItemParent === item._id && (
                <div style={{ marginLeft: `${(level + 1) * 12}px` }} className="mt-1 mb-1 animate-slideDown">
                  <form onSubmit={handleCreateItem} className="flex items-center bg-gray-800 bg-opacity-50 rounded-md p-1">
                    <span className="mr-1.5">
                      {newItemMode === 'folder' 
                        ? <Folder className="w-4 h-4 text-yellow-300" /> 
                        : <FileIcon className="w-4 h-4 text-gray-400" />}
                    </span>
                    <input
                      ref={newItemInputRef}
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder={`New ${newItemMode}`}
                      className="flex-1 bg-gray-800 text-white text-sm py-0.5 px-1.5 outline-none border border-blue-500 rounded-md focus:ring-1 focus:ring-blue-500"
                    />
                    <button type="submit" className="ml-1 text-green-400 hover:text-green-300 transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      className="ml-1 text-red-400 hover:text-red-300 transition-colors"
                      onClick={handleCancelCreate}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="bg-gray-900 text-white h-full overflow-y-auto">
      <div className="flex justify-between items-center py-3 px-3 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
        <h3 className="font-semibold text-sm text-blue-400">Files</h3>
        <div className="flex space-x-1">
          <button
            className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            onClick={() => startCreatingItem('file')}
            title="New File"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            onClick={() => startCreatingItem('folder')}
            title="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div className="p-2">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="text-red-400 text-sm p-3 bg-red-900 bg-opacity-20 rounded-md">
            {error}
          </div>
        ) : (
          <div>
            {renderFileTree(buildFileTree())}
            
            {/* Form for new item at root level */}
            {newItemMode && newItemParent === null && (
              <div className="mt-2 animate-slideDown">
                <form onSubmit={handleCreateItem} className="flex items-center bg-gray-800 bg-opacity-50 rounded-md p-1.5">
                  <span className="mr-1.5">
                    {newItemMode === 'folder' 
                      ? <Folder className="w-4 h-4 text-yellow-300" /> 
                      : <FileIcon className="w-4 h-4 text-gray-400" />}
                  </span>
                  <input
                    ref={newItemInputRef}
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder={`New ${newItemMode}`}
                    className="flex-1 bg-gray-800 text-white text-sm py-0.5 px-1.5 outline-none border border-blue-500 rounded-md focus:ring-1 focus:ring-blue-500"
                  />
                  <button type="submit" className="ml-1 text-green-400 hover:text-green-300 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button 
                    type="button" 
                    className="ml-1 text-red-400 hover:text-red-300 transition-colors"
                    onClick={handleCancelCreate}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Add these animations to your global CSS or create them in your component
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-in-out;
  }
  
  .animate-slideDown {
    animation: slideDown 0.3s ease-in-out;
  }
`;
document.head.appendChild(style);

export default FileExplorer; 