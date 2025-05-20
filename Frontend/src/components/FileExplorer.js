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
import { showError, showSuccess, showWarning, showConfirm } from '../utils/alertUtils';
import { API_BASE_URL } from '../config/api.config';

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
const FileExplorer = ({ roomId, onFileSelect, selectedFile, initialFiles }) => {
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
  const [creating, setCreating] = useState(false);
  
  // Track if initialFiles are being used
  const [usingInitialFiles, setUsingInitialFiles] = useState(false);
  // Store derived folders
  const [derivedFolders, setDerivedFolders] = useState([]);
  
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
  const fetchFiles = async () => {
    // If initial files are provided and not already loaded, use them
    if (initialFiles && initialFiles.length > 0 && !usingInitialFiles) {
      console.log('Using provided initial files:', initialFiles);
      setFiles(initialFiles);
      setLoading(false);
      setUsingInitialFiles(true);
      
      // Automatically expand root level
      const expanded = {};
      initialFiles.forEach(file => {
        if (file.type === 'folder' && (!file.path || !file.path.includes('/'))) {
          expanded[file._id] = true;
        }
      });
      setExpandedFolders(expanded);
      
      return;
    }
    
    // Continue with normal fetch if no initial files or initialFiles already loaded
    if (usingInitialFiles) {
      console.log('Initial files already loaded, skipping fetch');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/files/room/${roomId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data = await response.json();
      console.log('Fetched files from API:', data.files);
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
    // If we're using initial files, don't initialize
    if (initialFiles && initialFiles.length > 0) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/files/initialize/${roomId}`, {
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

  // Ensure folder structure exists based on file paths
  const ensureFolderStructure = (filesList) => {
    console.log('Analyzing file paths to ensure folder structure...');
    
    // Map to track created folders to avoid duplicates
    const folderMap = new Map();
    const result = [...filesList];
    
    // First pass: collect all folders that already exist
    filesList.forEach(file => {
      if (file.type === 'folder') {
        // Store with normalized path (both with and without leading slash)
        const normalizedPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
        folderMap.set(normalizedPath, file);
        folderMap.set(normalizedPath.substring(1), file);
        console.log(`Existing folder: ${file.name}, path: ${file.path}`);
      }
    });
    
    // Second pass: identify required folders from file paths
    const requiredFolderPaths = new Set();
    
    filesList.forEach(file => {
      if (file.type === 'file' && file.path) {
        // Normalize path (ensure it starts with slash for consistent processing)
        const normalizedPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
        const pathParts = normalizedPath.split('/').filter(Boolean);
        
        // Skip if file is at root level
        if (pathParts.length <= 1) return;
        
        // Log the file we're processing
        console.log(`Processing file path: ${normalizedPath}`);
        
        // Identify all folder paths needed for this file
        let currentPath = '';
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentPath = `${currentPath}/${pathParts[i]}`;
          requiredFolderPaths.add(currentPath);
        }
      }
    });
    
    console.log(`Required folder paths identified: ${Array.from(requiredFolderPaths).join(', ')}`);
    
    // Create synthetic folders for all required paths that don't exist
    Array.from(requiredFolderPaths)
      .sort((a, b) => a.split('/').length - b.split('/').length) // Process shallowest paths first
      .forEach(folderPath => {
        // Check if this folder or a variant already exists
        const normalizedPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
        const pathWithoutSlash = normalizedPath.substring(1);
        
        if (!folderMap.has(normalizedPath) && !folderMap.has(pathWithoutSlash)) {
          const folderName = normalizedPath.split('/').filter(Boolean).pop();
          
          // Create synthetic folder
          const syntheticFolder = {
            _id: `folder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: folderName,
            type: 'folder',
            path: normalizedPath,
            content: '',
            synthetic: true
          };
          
          // Find parent folder if this is a nested folder
          const lastSlashIndex = normalizedPath.lastIndexOf('/');
          if (lastSlashIndex > 0) { // Has a parent (not root)
            const parentPath = normalizedPath.substring(0, lastSlashIndex);
            const parentPathWithoutSlash = parentPath.substring(1);
            
            // Look for parent with or without leading slash
            const parentFolder = folderMap.get(parentPath) || folderMap.get(parentPathWithoutSlash);
            
            if (parentFolder) {
              syntheticFolder.parentId = parentFolder._id;
              console.log(`Assigned parent ${parentFolder.name} (${parentFolder._id}) to folder ${folderName}`);
            } else {
              console.log(`No parent found for ${folderName} at path ${parentPath}`);
            }
          }
          
          // Add to result and map
          result.push(syntheticFolder);
          folderMap.set(normalizedPath, syntheticFolder);
          folderMap.set(pathWithoutSlash, syntheticFolder);
          
          console.log(`Created synthetic folder: ${folderName} with path ${normalizedPath}`);
        } else {
          console.log(`Folder already exists at ${normalizedPath}`);
        }
      });
    
    // Update derived folders state for reference
    const newDerivedFolders = result.filter(file => !filesList.includes(file));
    setDerivedFolders(newDerivedFolders);
    
    console.log(`Added ${newDerivedFolders.length} derived folders from file paths`);
    
    // After creating folders, set up parent-child relationships for all files
    // This ensures files are correctly placed in their synthetic folders
    const updatedFiles = result.map(file => {
      if (file.type === 'file' && file.path && file.path.includes('/') && !file.parentId) {
        // Find the parent folder for this file
        const filePath = file.path.startsWith('/') ? file.path : `/${file.path}`;
        const parentPath = filePath.substring(0, filePath.lastIndexOf('/'));
        const parentPathNoSlash = parentPath.substring(1);
        
        // Look for parent with or without leading slash
        const parentFolder = folderMap.get(parentPath) || folderMap.get(parentPathNoSlash);
        
        if (parentFolder) {
          // Clone the file to avoid mutating the original
          const updatedFile = {...file, parentId: parentFolder._id};
          console.log(`Assigned parent folder ${parentFolder.name} to file ${file.name}`);
          return updatedFile;
        }
      }
      return file;
    });
    
    return updatedFiles;
  };

  // Load files either from initialFiles or from API
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      console.log('Initial files provided to FileExplorer:', initialFiles);
      
      // Log all file paths and relationships for debugging
      initialFiles.forEach(file => {
        console.log(`File: ${file.name}, Path: ${file.path}, Type: ${file.type}, ParentId: ${file.parentId || 'none'}`);
      });
      
      // Ensure folder structure exists based on file paths
      const filesWithFolders = ensureFolderStructure(initialFiles);
      
      setFiles(filesWithFolders);
      setLoading(false);
      setUsingInitialFiles(true);
      
      // Expand all folders to show complete structure
      const expanded = {};
      filesWithFolders.forEach(file => {
        if (file.type === 'folder') {
          expanded[file._id] = true;
          console.log(`Auto-expanding folder: ${file.name}`);
        }
      });
      setExpandedFolders(expanded);
      
      // Pre-select the first real file (not folder) to display in editor
      const firstFile = initialFiles.find(file => file.type === 'file');
      if (firstFile && onFileSelect) {
        console.log(`Auto-selecting file: ${firstFile.name}`);
        onFileSelect(firstFile);
      }
    } else if (roomId) {
      console.log('No initial files, fetching from API');
      fetchFiles();
      
      // If no files were found, initialize with defaults
      if (files.length === 0 && !loading && !error) {
        initializeFiles();
      }
    }
  }, [roomId, initialFiles]);

  // Alias for fetchFiles to make the code clearer
  const refreshFiles = fetchFiles;

  // Build the file tree structure
  const buildFileTree = () => {
    console.log('Building file tree with', files.length, 'files');
    
    // Check if files use parentId relationship or path-based relationships
    const usesParentId = files.some(file => file.parentId);
    console.log('File structure uses parentId relationships:', usesParentId);
    
    if (usesParentId) {
      // Get root items (files/folders without a parent or with null parentId)
      const rootItems = files.filter(file => 
        !file.parentId || 
        file.parentId === null || 
        !files.some(f => f._id === file.parentId)
      );
      
      console.log('Root items using parentId:', rootItems.map(item => `${item.name} (${item.type})`));
      
      // Check if we found any root items
      if (rootItems.length === 0 && files.length > 0) {
        console.warn('No root items found with parentId approach, may need to fall back to path-based approach');
      }
      
      return rootItems.sort((a, b) => {
        // Folders first
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });
    } else {
      // Path-based organization if parentId isn't used
      // Look for items at root level (no slash or just one segment after slash)
      const rootItems = files.filter(file => {
        // Strip leading slash if present
        const normalizedPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
        
        // Root items have no slashes in normalized path, or are directly at root level
        return !normalizedPath.includes('/') || 
               normalizedPath.split('/').length === 1 || 
               file.path === '/' + file.name;
      });
      
      console.log('Root items using path:', rootItems.map(item => `${item.name} (${item.type})`));
      
      // Check if we found any root items
      if (rootItems.length === 0 && files.length > 0) {
        console.warn('No root items found with path approach, will attempt to extract from file paths');
        
        // As a fallback, try to extract root level items from file paths
        const rootItems = [];
        const seenRootNames = new Set();
        
        files.forEach(file => {
          if (file.path) {
            // Normalize path
            const normalizedPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
            // Get the first segment of the path
            const firstSegment = normalizedPath.split('/')[0];
            
            // If this is a root file, add it
            if (normalizedPath === firstSegment) {
              rootItems.push(file);
              seenRootNames.add(file.name);
            } 
            // Otherwise check if we need to add a synthetic folder for this file
            else if (firstSegment && !seenRootNames.has(firstSegment)) {
              // Create a synthetic root folder
              const syntheticFolder = {
                _id: `root_folder_${firstSegment}_${Date.now()}`,
                name: firstSegment,
                type: 'folder',
                path: `/${firstSegment}`,
                synthetic: true
              };
              
              rootItems.push(syntheticFolder);
              seenRootNames.add(firstSegment);
              console.log(`Created synthetic root folder: ${firstSegment}`);
            }
          }
        });
        
        return rootItems.sort((a, b) => {
          // Folders first
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          // Then alphabetically
          return a.name.localeCompare(b.name);
        });
      }
      
      return rootItems.sort((a, b) => {
        // Folders first
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });
    }
  };

  // Get children of a folder
  const getFolderChildren = (folderId) => {
    const folder = files.find(file => file._id === folderId);
    if (!folder) {
      console.warn(`Folder with ID ${folderId} not found`);
      return [];
    }
    
    console.log(`Getting children for folder: ${folder.name}, path: ${folder.path}, id: ${folderId}`);
    
    // Try to find children using parentId reference first (more reliable)
    const childrenById = files.filter(file => 
      file.parentId && file.parentId.toString() === folderId.toString()
    );
    
    if (childrenById.length > 0) {
      console.log(`Found ${childrenById.length} children for folder ${folder.name} using parentId`);
      return childrenById.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    }
    
    // Fallback to path-based lookup if parentId doesn't yield results
    const parentPath = folder.path || '';
    console.log(`Looking for children of ${folder.name} with path ${parentPath}`);
    
    // Normalize the parent path (ensure it has a leading slash)
    const normalizedParentPath = parentPath.startsWith('/') ? parentPath : `/${parentPath}`;
    
    // Find direct children by path
    const children = files.filter(file => {
      if (file._id === folderId) return false; // Skip the parent itself
      
      // Normalize the file path
      const filePath = file.path || '';
      const normalizedFilePath = filePath.startsWith('/') ? filePath : `/${filePath}`;
      
      // Skip if the file path doesn't start with the parent path
      if (!normalizedFilePath.startsWith(normalizedParentPath + '/')) {
        return false;
      }
      
      // Count path segments to ensure direct child relationship
      const parentSegments = normalizedParentPath.split('/').filter(Boolean).length;
      const fileSegments = normalizedFilePath.split('/').filter(Boolean).length;
      
      // A direct child has exactly one more path segment than its parent
      return fileSegments === parentSegments + 1;
    });
    
    console.log(`Found ${children.length} children for folder ${folder.name} using path`);
    
    // If still no children, try more aggressive path matching (for synthetic folders)
    if (children.length === 0 && folder.synthetic) {
      console.log(`Trying alternative path matching for synthetic folder ${folder.name}`);
      
      // Extract the folder name from path
      const folderName = folder.name;
      
      const altChildren = files.filter(file => {
        if (file._id === folderId) return false; // Skip the parent itself
        if (file.parentId) return false; // Skip files already assigned to a parent
        
        const filePath = file.path || '';
        const normalizedFilePath = filePath.startsWith('/') ? filePath : `/${filePath}`;
        const pathParts = normalizedFilePath.split('/').filter(Boolean);
        
        // Check if this file is in a path that includes the folder name
        return pathParts.length > 1 && pathParts[0] === folderName;
      });
      
      console.log(`Found ${altChildren.length} children using alternative matching`);
      
      if (altChildren.length > 0) {
        return altChildren.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
      }
    }
    
    return children.sort((a, b) => {
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
      setCreating(true);
      const parentPath = newItemParent ? 
        files.find(f => f._id === newItemParent)?.path : '';
      
      const newItemPath = parentPath ? 
        `${parentPath}/${newItemName}` : newItemName;
      
      const response = await fetch(`${API_BASE_URL}/api/files/create`, {
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
      
      // Show success message
      showSuccess(`${newItemMode === 'file' ? 'File' : 'Folder'} created successfully`);
      
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
      setCreating(false);
      
      // If parent folder exists, make sure it's expanded
      if (newItemParent) {
        setExpandedFolders(prev => ({
          ...prev,
          [newItemParent]: true
        }));
      }
      
      // Refresh file list
      refreshFiles();
    } catch (err) {
      console.error('Error creating item:', err);
      showError(`Failed to create ${newItemMode}: ${err.message}`);
      setCreating(false);
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
      const response = await fetch(`${API_BASE_URL}/api/files/${renamingItem}/rename`, {
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
      
      // Show success message
      showSuccess('Item renamed successfully');
      
      // Reset rename state
      setRenamingItem(null);
      setNewName('');
      
      // Refresh file list
      refreshFiles();
    } catch (err) {
      console.error('Error renaming item:', err);
      showError(`Failed to rename: ${err.message}`);
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
    try {
      const fileToDelete = files.find(f => f._id === fileId);
      if (!fileToDelete) return;
      
      const isFolder = fileToDelete.type === 'folder';
      const typeLabel = isFolder ? 'folder' : 'file';
      
      // Use our custom confirm dialog with await since it returns a Promise
      const isConfirmed = await showConfirm(`Are you sure you want to delete this ${typeLabel}? This action cannot be undone.`);
      
      if (!isConfirmed) {
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      
      // Remove from files list
      setFiles(prev => prev.filter(file => file._id !== fileId));
      setMenuOpen(null);
      
      // Show success message
      showSuccess(`${isFolder ? 'Folder' : 'File'} deleted successfully`);
      
      // Refresh file list
      refreshFiles();
    } catch (err) {
      console.error('Error deleting item:', err);
      showError(`Failed to delete: ${err.message}`);
    }
  };

  // Render the file tree
  const renderFileTree = (items, level = 0) => {
    // Sort items: folders first, then files, alphabetically within each type
    const sortedItems = [...items].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return sortedItems.map(item => {
      const isFolder = item.type === 'folder';
      const isExpanded = expandedFolders[item._id];
      const isSelected = selectedFile && selectedFile._id === item._id;
      const isRenaming = renamingItem === item._id;
      
      // Get children if this is a folder
      const children = isFolder ? getFolderChildren(item._id) : [];
      const hasChildren = children.length > 0;
      
      return (
        <div key={item._id} style={{ marginLeft: `${level * 12}px` }} className="mb-0.5">
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
                
                {/* Show folder/file count for folders */}
                {isFolder && hasChildren && (
                  <span className="text-xs text-gray-500 mr-2">
                    {children.filter(c => c.type === 'folder').length > 0 && 
                      `${children.filter(c => c.type === 'folder').length} ${children.filter(c => c.type === 'folder').length === 1 ? 'folder' : 'folders'}`}
                    {children.filter(c => c.type === 'folder').length > 0 && children.filter(c => c.type === 'file').length > 0 && ', '}
                    {children.filter(c => c.type === 'file').length > 0 && 
                      `${children.filter(c => c.type === 'file').length} ${children.filter(c => c.type === 'file').length === 1 ? 'file' : 'files'}`}
                  </span>
                )}
                
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
              {renderFileTree(children, level + 1)}
              
              {/* If folder is empty, show a message */}
              {children.length === 0 && (
                <div style={{ marginLeft: `${(level + 1) * 12}px` }} className="py-1.5 px-2 text-sm text-gray-400 italic">
                  Empty folder
                </div>
              )}
              
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
                      placeholder={`New ${newItemMode}...`}
                      className="flex-1 bg-transparent text-white text-sm py-0.5 px-1.5 outline-none border border-blue-500 rounded focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button 
                      type="submit"
                      disabled={creating || !newItemName.trim()}
                      className={`ml-1 text-green-400 hover:text-green-300 transition-colors ${creating || !newItemName.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
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