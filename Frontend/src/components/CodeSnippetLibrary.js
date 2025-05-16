import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Plus, Search, X, Edit, Trash, Code, Bookmark, Tag, Filter } from 'lucide-react';
import { API_BASE_URL } from '../config/api.config.js';

const CodeSnippetLibrary = ({ isOpen, onClose, token, roomId, onInsertSnippet }) => {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSnippets, setFilteredSnippets] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [newSnippetOpen, setNewSnippetOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState(null);
  
  // New snippet form state
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [category, setCategory] = useState('general');
  
  // Available categories and languages
  const categories = ['general', 'functions', 'components', 'hooks', 'styles', 'utilities'];
  const languages = ['javascript', 'typescript', 'html', 'css', 'jsx', 'python', 'java', 'c', 'cpp'];

  // Fetch snippets on component mount and when roomId changes
  useEffect(() => {
    if (isOpen && roomId) {
      fetchSnippets();
    }
  }, [isOpen, roomId]);

  // Filter snippets based on search term and active category
  useEffect(() => {
    if (snippets.length > 0) {
      let filtered = [...snippets];
      
      // Filter by search term
      if (searchTerm) {
        filtered = filtered.filter(snippet => 
          snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          snippet.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          snippet.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Filter by category
      if (activeCategory !== 'all') {
        filtered = filtered.filter(snippet => snippet.category === activeCategory);
      }
      
      setFilteredSnippets(filtered);
    } else {
      setFilteredSnippets([]);
    }
  }, [snippets, searchTerm, activeCategory]);

  // Fetch snippets from the server
  const fetchSnippets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Example API call to fetch snippets
      const response = await fetch(`${API_BASE_URL}/api/snippets/${roomId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch snippets');
      }
      
      const data = await response.json();
      setSnippets(data);
    } catch (err) {
      console.error('Error fetching snippets:', err);
      setError('Failed to load code snippets. Please try again.');
      
      // For testing, let's add some dummy snippets
      setSnippets([
        {
          id: '1',
          title: 'React Function Component',
          description: 'Basic React functional component template',
          code: `import React from 'react';\n\nconst ComponentName = ({ prop1, prop2 }) => {\n  return (\n    <div>\n      <h1>Hello World</h1>\n    </div>\n  );\n};\n\nexport default ComponentName;`,
          language: 'jsx',
          category: 'components',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'user1',
        },
        {
          id: '2',
          title: 'useEffect Hook',
          description: 'React useEffect hook with cleanup',
          code: `useEffect(() => {\n  // Side effect code here\n  const subscription = someAPI.subscribe();\n  \n  return () => {\n    // Cleanup code here\n    subscription.unsubscribe();\n  };\n}, [dependency1, dependency2]);`,
          language: 'javascript',
          category: 'hooks',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'user2',
        },
        {
          id: '3',
          title: 'Fetch API',
          description: 'Basic fetch API with error handling',
          code: `const fetchData = async (url) => {\n  try {\n    const response = await fetch(url);\n    \n    if (!response.ok) {\n      throw new Error(\`HTTP error! Status: \${response.status}\`);\n    }\n    \n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error('Fetch error:', error);\n    throw error;\n  }\n};`,
          language: 'javascript',
          category: 'utilities',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'user1',
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Add a new snippet
  const handleAddSnippet = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !code.trim()) {
      setError('Title and code are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const newSnippet = {
        title,
        description,
        code,
        language,
        category,
        roomId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: localStorage.getItem('userId') || 'unknown'
      };
      
      // For development without backend
      if (editingSnippet) {
        // Update existing snippet
        setSnippets(prevSnippets => 
          prevSnippets.map(snippet => 
            snippet.id === editingSnippet.id 
              ? { ...snippet, ...newSnippet, id: editingSnippet.id } 
              : snippet
          )
        );
      } else {
        // Add new snippet
        setSnippets(prevSnippets => [...prevSnippets, {
          ...newSnippet,
          id: Date.now().toString()
        }]);
      }
      
      // Reset form
      setTitle('');
      setCode('');
      setDescription('');
      setLanguage('javascript');
      setCategory('general');
      setNewSnippetOpen(false);
      setEditingSnippet(null);
      
      // In production, you would make an API call to save the snippet
      // Example API call:
      /*
      const response = await fetch(`${API_BASE_URL}/api/snippets`, {
        method: editingSnippet ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSnippet)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save snippet');
      }
      
      const savedSnippet = await response.json();
      
      if (editingSnippet) {
        setSnippets(prevSnippets => 
          prevSnippets.map(snippet => 
            snippet.id === editingSnippet.id ? savedSnippet : snippet
          )
        );
      } else {
        setSnippets(prevSnippets => [...prevSnippets, savedSnippet]);
      }
      */
      
    } catch (err) {
      console.error('Error saving snippet:', err);
      setError('Failed to save code snippet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete a snippet
  const handleDeleteSnippet = async (id) => {
    try {
      setLoading(true);
      setError(null);
      
      // For development without backend
      setSnippets(prevSnippets => prevSnippets.filter(snippet => snippet.id !== id));
      
      // In production, you would make an API call to delete the snippet
      // Example API call:
      /*
      const response = await fetch(`${API_BASE_URL}/api/snippets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete snippet');
      }
      
      setSnippets(prevSnippets => prevSnippets.filter(snippet => snippet.id !== id));
      */
      
    } catch (err) {
      console.error('Error deleting snippet:', err);
      setError('Failed to delete code snippet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Edit a snippet
  const handleEditSnippet = (snippet) => {
    setTitle(snippet.title);
    setCode(snippet.code);
    setDescription(snippet.description || '');
    setLanguage(snippet.language || 'javascript');
    setCategory(snippet.category || 'general');
    setEditingSnippet(snippet);
    setNewSnippetOpen(true);
  };

  // Copy snippet code to clipboard
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    // You could add a toast notification here
  };

  // Insert snippet into editor
  const handleInsertSnippet = (code) => {
    if (onInsertSnippet) {
      onInsertSnippet(code);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', bounce: 0.1, duration: 0.5 }}
        className="relative w-11/12 max-w-5xl h-4/5 bg-gradient-to-b from-black to-gray-900 rounded-xl border border-gray-800 shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <Code size={22} className="text-yellow-500" />
            <h2 className="text-xl font-bold text-gradient bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 to-yellow-300">
              Code Snippet Library
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Main Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-full md:w-64 border-r border-gray-800 p-4 bg-black bg-opacity-70">
            <div className="mb-4">
              <button
                onClick={() => setNewSnippetOpen(true)}
                className="w-full py-2 px-4 bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white rounded-lg flex items-center justify-center space-x-2 transition-all shadow-md border border-yellow-800"
              >
                <Plus size={16} />
                <span>New Snippet</span>
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-xs uppercase text-gray-500 font-semibold mb-2 tracking-wider">Categories</div>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setActiveCategory('all')}
                    className={`w-full text-left py-1.5 px-3 rounded-md text-sm flex items-center ${
                      activeCategory === 'all' 
                        ? 'bg-yellow-900 bg-opacity-30 text-yellow-400 border border-yellow-900' 
                        : 'text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <Bookmark size={14} className={activeCategory === 'all' ? 'text-yellow-400' : 'text-gray-500'} />
                    <span className="ml-2">All Snippets</span>
                  </button>
                </li>
                {categories.map(cat => (
                  <li key={cat}>
                    <button
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left py-1.5 px-3 rounded-md text-sm flex items-center ${
                        activeCategory === cat 
                          ? 'bg-yellow-900 bg-opacity-30 text-yellow-400 border border-yellow-900' 
                          : 'text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <Tag size={14} className={activeCategory === cat ? 'text-yellow-400' : 'text-gray-500'} />
                      <span className="ml-2 capitalize">{cat}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Main Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-gray-800">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search snippets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-2 pl-9 pr-4 bg-black border border-gray-800 rounded-lg text-gray-300 focus:border-yellow-700 focus:ring-1 focus:ring-yellow-700 outline-none transition-all"
                />
                <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Snippets List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full"></div>
                </div>
              ) : error ? (
                <div className="text-red-400 p-4 text-center">
                  <p>{error}</p>
                  <button 
                    onClick={fetchSnippets}
                    className="mt-2 text-yellow-500 hover:text-yellow-400"
                  >
                    Try Again
                  </button>
                </div>
              ) : filteredSnippets.length === 0 ? (
                <div className="text-gray-500 text-center p-6">
                  <Code size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No snippets found.</p>
                  {activeCategory !== 'all' && (
                    <button
                      onClick={() => setActiveCategory('all')}
                      className="mt-2 text-yellow-500 hover:text-yellow-400"
                    >
                      Show all snippets
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSnippets.map(snippet => (
                    <div 
                      key={snippet.id} 
                      className="border border-gray-800 rounded-lg bg-black bg-opacity-60 overflow-hidden hover:border-gray-700 transition-all"
                    >
                      <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900 bg-opacity-70">
                        <div>
                          <h3 className="font-medium text-yellow-100">{snippet.title}</h3>
                          {snippet.description && (
                            <p className="text-xs text-gray-400 mt-1">{snippet.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleCopyCode(snippet.code)}
                            className="p-1.5 text-gray-400 hover:text-white rounded-md"
                            title="Copy to clipboard"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => handleInsertSnippet(snippet.code)}
                            className="p-1.5 text-yellow-500 hover:text-yellow-400 rounded-md"
                            title="Insert into editor"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => handleEditSnippet(snippet)}
                            className="p-1.5 text-gray-400 hover:text-white rounded-md"
                            title="Edit snippet"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSnippet(snippet.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 rounded-md"
                            title="Delete snippet"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <pre className="p-4 overflow-auto text-sm text-gray-300 max-h-60 font-mono">
                          <code className={`language-${snippet.language || 'javascript'}`}>
                            {snippet.code}
                          </code>
                        </pre>
                        <div className="absolute right-2 bottom-2">
                          <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-md">
                            {snippet.language || 'javascript'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* New/Edit Snippet Modal */}
      <AnimatePresence>
        {newSnippetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="w-11/12 max-w-3xl bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-300">
                  {editingSnippet ? 'Edit Snippet' : 'Create New Snippet'}
                </h3>
                <button
                  onClick={() => {
                    setNewSnippetOpen(false);
                    setEditingSnippet(null);
                    setTitle('');
                    setCode('');
                    setDescription('');
                    setLanguage('javascript');
                    setCategory('general');
                  }}
                  className="p-2 text-gray-400 hover:text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleAddSnippet}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full py-2 px-3 bg-black border border-gray-800 rounded-lg text-gray-300 focus:border-yellow-700 focus:ring-1 focus:ring-yellow-700 outline-none transition-all"
                      placeholder="Enter snippet title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full py-2 px-3 bg-black border border-gray-800 rounded-lg text-gray-300 focus:border-yellow-700 focus:ring-1 focus:ring-yellow-700 outline-none transition-all"
                      placeholder="Brief description of what this snippet does"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full py-2 px-3 bg-black border border-gray-800 rounded-lg text-gray-300 focus:border-yellow-700 focus:ring-1 focus:ring-yellow-700 outline-none transition-all"
                      >
                        {languages.map(lang => (
                          <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full py-2 px-3 bg-black border border-gray-800 rounded-lg text-gray-300 focus:border-yellow-700 focus:ring-1 focus:ring-yellow-700 outline-none transition-all"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Code</label>
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full h-56 py-2 px-3 bg-black border border-gray-800 rounded-lg text-gray-300 focus:border-yellow-700 focus:ring-1 focus:ring-yellow-700 outline-none transition-all font-mono"
                      placeholder="Paste your code here"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setNewSnippetOpen(false);
                      setEditingSnippet(null);
                      setTitle('');
                      setCode('');
                      setDescription('');
                      setLanguage('javascript');
                      setCategory('general');
                    }}
                    className="py-2 px-4 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-2 px-6 bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-white rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-yellow-800"
                  >
                    {loading 
                      ? 'Saving...' 
                      : editingSnippet 
                        ? 'Update Snippet' 
                        : 'Save Snippet'
                    }
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CodeSnippetLibrary; 