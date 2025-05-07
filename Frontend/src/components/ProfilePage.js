import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Edit, Save, User, MapPin, GithubIcon, LinkedinIcon, TwitterIcon, Mail, Phone, Calendar, ArrowLeft, MailIcon, Code, Settings, Upload, Camera, MessageCircle, AlertCircle, Users, Trash2, Shield, Layers, Monitor, MoreHorizontal, Filter, Search, RefreshCw, UserX } from 'lucide-react';

// Add a style element to force dark theme globally
const darkModeStyle = `
  body, html {
    background-color: #111827 !important; /* gray-900 */
    color: white !important;
  }
  
  /* Custom scrollbar styling */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(31, 41, 55, 0.5);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 130, 246, 0.7);
  }
`;

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  // Admin-specific states
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [activeRooms, setActiveRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [adminView, setAdminView] = useState('users'); // 'users' or 'rooms'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    userName: '',
    bio: '',
    location: '',
    skills: [],
    socialLinks: {
      github: '',
      linkedin: '',
      twitter: ''
    },
    profilePic: ''
  });
  
  // Custom skill input
  const [newSkill, setNewSkill] = useState('');
  
  // Theme settings - set dark theme as default
  const [theme, setTheme] = useState('dark');
  
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = months[new Date().getMonth()];
  const currentYear = new Date().getFullYear();
  
  // Force dark mode application
  useEffect(() => {
    // Apply dark theme to document
    document.documentElement.classList.add('dark');
    // Remove light mode if it exists
    document.documentElement.classList.remove('light');
    // Set body background color to dark
    document.body.style.backgroundColor = '#111827'; // gray-900
  }, []);
  
  // Fetch unread messages
  const fetchUnreadMessages = async () => {
    try {
      setMessagesLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get('http://localhost:3050/api/messages/unread', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      // Process messages with sender information
      const messages = response.data.map(msg => ({
        ...msg,
        // Format timestamp for display
        formattedTime: new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        }),
        // Format date for display
        formattedDate: new Date(msg.createdAt || msg.timestamp).toLocaleDateString()
      }));
      
      console.log('Unread messages:', messages);
      setUnreadMessages(messages);
    } catch (err) {
      console.error('Error fetching unread messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  };
  
  // Fetch all registered users (admin only)
  const fetchAllUsers = async () => {
    const userIsAdmin = user?.isAdmin === true || user?.role === 'admin';
    console.log('Fetching all users, user is admin:', userIsAdmin, 'User data:', user);
    
    if (!userIsAdmin) {
      console.log('Not fetching users because user is not admin');
      return;
    }
    
    try {
      setUsersLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        return;
      }
      
      console.log('Making request to get all users');
      const response = await axios.get('http://localhost:3050/api/users/all-users', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      console.log('All users response status:', response.status);
      console.log('Users data received:', response.data);
      
      if (Array.isArray(response.data)) {
        setAllUsers(response.data);
        setFilteredUsers(response.data);
        console.log('Users set in state:', response.data.length);
      } else {
        console.error('Response data is not an array:', response.data);
        // If response is not an array, try to handle it
        if (response.data && typeof response.data === 'object') {
          // Check if there's a data property
          const usersData = response.data.users || response.data;
          if (Array.isArray(usersData)) {
            setAllUsers(usersData);
            setFilteredUsers(usersData);
            console.log('Users set in state from object:', usersData.length);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      console.error('Error details:', err.response?.data || err.message);
      if (err.response) {
        console.error('Error status:', err.response.status);
        console.error('Error headers:', err.response.headers);
      }
    } finally {
      setUsersLoading(false);
    }
  };
  
  // Fetch active rooms (admin only)
  const fetchActiveRooms = async () => {
    const userIsAdmin = user?.isAdmin === true || user?.role === 'admin';
    console.log('Fetching active rooms, user is admin:', userIsAdmin);
    
    if (!userIsAdmin) {
      console.log('Not fetching rooms because user is not admin');
      return;
    }
    
    try {
      setRoomsLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      
      console.log('Making request to get active rooms');
      const response = await axios.get('http://localhost:3050/api/rooms/active', {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      console.log('Active rooms response:', response.data);
      setActiveRooms(response.data);
      console.log('Active rooms set in state:', response.data.length);
    } catch (err) {
      console.error('Error fetching active rooms:', err);
      console.error('Error details:', err.response?.data || err.message);
    } finally {
      setRoomsLoading(false);
    }
  };
  
  // Handle user search (admin only)
  const handleUserSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setUserSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredUsers(allUsers);
      return;
    }
    
    const filtered = allUsers.filter(user => 
      user.userName.toLowerCase().includes(term) || 
      user.email.toLowerCase().includes(term)
    );
    
    setFilteredUsers(filtered);
  };
  
  // Delete user account (admin only)
  const handleDeleteUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await axios.delete(`http://localhost:3050/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      // Remove the deleted user from the lists
      const updatedUsers = allUsers.filter(user => user._id !== userId);
      setAllUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user: ' + (err.response?.data?.error || err.message));
    }
  };
  
  // Toggle user admin status (admin only)
  const handleToggleAdmin = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await axios.put(`http://localhost:3050/api/users/${userId}/admin`, 
        { isAdmin: !currentStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        }
      );
      
      // Update the user's admin status in the lists
      const updatedUsers = allUsers.map(user => {
        if (user._id === userId) {
          return { ...user, isAdmin: !currentStatus };
        }
        return user;
      });
      
      setAllUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
    } catch (err) {
      console.error('Error updating admin status:', err);
      alert('Failed to update admin status: ' + (err.response?.data?.error || err.message));
    }
  };
  
  // Fetch data specifically for admin
  useEffect(() => {
    // Check if user is admin using both the isAdmin flag and role field
    const userIsAdmin = user?.isAdmin === true || user?.role === 'admin';
    console.log('User admin check in effect:', userIsAdmin, 'User data:', user);
    
    if (user && userIsAdmin) {
      console.log('Fetching admin data immediately...');
      // Add delay to ensure user state is fully propagated
      setTimeout(() => {
        fetchAllUsers();
        fetchActiveRooms();
      }, 100);
    }
  }, [user]); // Dependency on user object will trigger when user data is loaded
  
  // Modified original fetchUserData useEffect to include admin data fetch calls
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/LoginPage');
          return;
        }
        
        const response = await axios.get(`http://localhost:3050/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
        
        console.log('User data response:', response.data);
        console.log('Is admin value:', response.data.isAdmin);
        console.log('Role value:', response.data.role);
        
        // Ensure profile picture URL is properly formatted
        let profilePicUrl = response.data.profilePic;
        if (profilePicUrl && !profilePicUrl.startsWith('http')) {
          profilePicUrl = `http://localhost:3050${profilePicUrl}`;
        }
        
        const userData = {
          ...response.data,
          profilePic: profilePicUrl
        };
        
        setUser(userData);
        console.log('User state after setting:', userData);
        console.log('Is user admin?', userData.isAdmin === true);
        
        setFormData({
          userName: userData.userName || '',
          bio: userData.bio || '',
          location: userData.location || '',
          skills: userData.skills || [],
          socialLinks: {
            github: userData.socialLinks?.github || '',
            linkedin: userData.socialLinks?.linkedin || '',
            twitter: userData.socialLinks?.twitter || ''
          },
          profilePic: profilePicUrl || ''
        });
        
        // Use dark theme by default, or user preference if available
        setTheme(userData.theme || 'dark');
        setLoading(false);
        
        // Fetch unread messages only for non-admin users
        if (!userData.isAdmin) {
          fetchUnreadMessages();
        }
        
        // If user is admin, fetch admin-specific data
        if (userData.isAdmin) {
          fetchAllUsers();
          fetchActiveRooms();
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data: ' + (err.response?.data?.error || err.message));
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigate]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested fields (socialLinks)
      const [parent, child] = name.split('.');
      
      // Make sure the parent object exists
      if (!formData[parent]) {
        formData[parent] = {};
      }
      
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // File selection handler
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview URL
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result);
      };
      fileReader.readAsDataURL(file);
    }
  };
  
  // Trigger file input click
  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };
  
  // Handle file upload
  const uploadProfilePicture = async () => {
    if (!selectedFile) return false;
    
    try {
      const token = localStorage.getItem('token');
      const uploadFormData = new FormData();
      uploadFormData.append('profilePic', selectedFile);
      
      const response = await axios.post(`http://localhost:3050/api/users/profile-picture`, uploadFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      
      console.log('Profile picture upload response:', response.data);
      
      // Make sure we have a valid profilePic URL from the response
      if (response.data && response.data.profilePic) {
        // Update the formData with the new profile picture URL
        setFormData({
          ...formData,
          profilePic: response.data.profilePic
        });
        
        // Reset states
        setSelectedFile(null);
        setUploadProgress(0);
        setPreviewUrl('');
        
        // Show success message
        alert('Profile picture updated successfully!');
        return true;
      } else {
        console.error('Invalid response from server:', response.data);
        alert('Failed to upload profile picture: Invalid server response');
        return false;
      }
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      alert('Failed to upload profile picture: ' + (err.response?.data?.error || err.message));
      return false;
    }
  };
  
  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };
  
  const handleRemoveSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      // Ensure socialLinks exists
      if (!formData.socialLinks) {
        formData.socialLinks = { github: '', linkedin: '', twitter: '' };
      }
      
      // If there's a selected file, upload it first
      if (selectedFile) {
        const uploadSuccess = await uploadProfilePicture();
        if (!uploadSuccess) {
          // If upload failed, stop the submission
          return;
        }
      }
      
      const response = await axios.put(`http://localhost:3050/api/users/profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      console.log('Profile update response:', response.data);
      
      // Ensure profile picture URL is properly formatted
      let profilePicUrl = response.data.profilePic;
      if (profilePicUrl && !profilePicUrl.startsWith('http')) {
        profilePicUrl = `http://localhost:3050${profilePicUrl}`;
      }
      
      const userData = {
        ...response.data,
        profilePic: profilePicUrl
      };
      
      setUser(userData);
      setEditMode(false);
      setSelectedFile(null);
      setPreviewUrl('');
      
      // Show success message
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile: ' + (err.response?.data?.error || err.message));
    }
  };
  
  const handleThemeChange = async (newTheme) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(`http://localhost:3050/api/users/theme`, { theme: newTheme }, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      setTheme(newTheme);
      
      // Always keep dark theme applied regardless of selection
      // This ensures the page stays in dark mode even if a user tries to change it
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.style.backgroundColor = '#111827'; // gray-900
      
      // Store the user's preference for future reference
      localStorage.setItem('theme', newTheme);
    } catch (err) {
      console.error('Error updating theme:', err);
      alert('Failed to update theme: ' + (err.response?.data?.error || err.message));
    }
  };
  
  // Navigate to chat with a specific friend
  const handleGoToChat = (senderId) => {
    navigate('/Dashboard', { state: { openChat: senderId } });
  };
  
  // Mark a specific message as read
  const handleMarkAsRead = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(`http://localhost:3050/api/messages/mark-read/${messageId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      // Update local state by removing the read message
      setUnreadMessages(prevMessages => prevMessages.filter(msg => msg._id !== messageId));
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };
  
  // Mark all messages as read
  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.post(`http://localhost:3050/api/messages/mark-all-read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      // Clear all unread messages from the local state
      setUnreadMessages([]);
    } catch (err) {
      console.error('Error marking all messages as read:', err);
    }
  };
  
  // Render delete confirmation modal
  const renderDeleteConfirmation = () => {
    if (!showDeleteConfirm || !userToDelete) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-xl font-semibold text-white mb-3">Confirm Account Deletion</h3>
          <p className="text-gray-300 mb-4">
            Are you sure you want to delete the account for <span className="font-medium text-white">{userToDelete.userName}</span>? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setUserToDelete(null);
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteUser(userToDelete._id)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Render admin view section
  const renderAdminSection = () => {
    // Check if user is admin using both the isAdmin flag and role field
    const userIsAdmin = user?.isAdmin === true || user?.role === 'admin';
    console.log('User admin check in render:', userIsAdmin);
    
    if (!userIsAdmin) {
      console.log('Not showing admin section because user is not admin');
      return null;
    }
    
    return (
      <div className="bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h3 className="font-semibold flex items-center text-gray-400 mb-4 sm:mb-0">
            <Shield size={16} className="mr-2 text-gray-500" />
            Admin Controls
          </h3>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setAdminView('users')}
              className={`px-3 py-1.5 text-sm rounded-md flex items-center ${
                adminView === 'users' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Users size={14} className="mr-1.5" />
              <span>Users</span>
            </button>
            <button
              onClick={() => setAdminView('rooms')}
              className={`px-3 py-1.5 text-sm rounded-md flex items-center ${
                adminView === 'rooms' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Layers size={14} className="mr-1.5" />
              <span>Active Rooms</span>
            </button>
          </div>
        </div>
        
        {adminView === 'users' ? (
          <div>
            <div className="mb-4 flex flex-col sm:flex-row justify-between gap-3">
              <div className="relative flex-grow">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={handleUserSearch}
                  placeholder="Search users by name or email..."
                  className="bg-gray-700 border border-gray-600 rounded-lg py-2 pl-10 pr-4 w-full text-sm"
                />
              </div>
              <button
                onClick={fetchAllUsers}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg px-4 py-2 text-sm flex items-center justify-center"
              >
                <RefreshCw size={14} className="mr-1.5" />
                <span>Refresh</span>
              </button>
            </div>
            
            {usersLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Users size={40} className="mx-auto mb-3 opacity-20" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-700">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900 divide-y divide-gray-800">
                    {filteredUsers.map(user => (
                      <tr key={user._id} className="hover:bg-gray-850">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              {user.profilePic ? (
                                <img 
                                  src={user.profilePic.startsWith('http') ? user.profilePic : `http://localhost:3050${user.profilePic}`} 
                                  alt={user.userName} 
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-300">
                                    {user.userName?.charAt(0)?.toUpperCase() || 'U'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-white">{user.userName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
                          <div className="text-sm text-gray-300">{user.email}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="text-sm text-gray-400">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isAdmin 
                              ? 'bg-purple-800 text-purple-200' 
                              : 'bg-gray-700 text-gray-300'
                          }`}>
                            {user.isAdmin ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleToggleAdmin(user._id, user.isAdmin)}
                              className={`p-1.5 rounded-md ${
                                user.isAdmin 
                                  ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-800/50' 
                                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                              }`}
                              title={user.isAdmin ? "Remove admin rights" : "Make admin"}
                            >
                              <Shield size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setUserToDelete(user);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-1.5 rounded-md bg-red-900/30 text-red-400 hover:bg-red-800/50"
                              title="Delete user"
                              disabled={user._id === user._id} // Can't delete yourself
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h4 className="text-sm font-medium text-white">Active Collaborative Rooms</h4>
              <button
                onClick={fetchActiveRooms}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg px-3 py-1.5 text-sm flex items-center"
              >
                <RefreshCw size={14} className="mr-1.5" />
                <span>Refresh</span>
              </button>
            </div>
            
            {roomsLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : activeRooms.length === 0 ? (
              <div className="text-center py-10 text-gray-500 border border-gray-700 rounded-lg">
                <Monitor size={40} className="mx-auto mb-3 opacity-20" />
                <p>No active rooms at the moment</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {activeRooms.map(room => (
                  <div 
                    key={room._id} 
                    className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="text-white font-medium">{room.name || `Room #${room._id.slice(-6)}`}</h5>
                      <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mb-3">
                      <div>Created: {new Date(room.createdAt).toLocaleString()}</div>
                      <div>Host: {room.createdBy?.userName || 'Unknown'}</div>
                    </div>
                    
                    <div className="mb-3">
                      <h6 className="text-xs uppercase text-gray-500 mb-2">Participants</h6>
                      <div className="flex flex-wrap gap-2">
                        {room.participants && room.participants.length > 0 ? (
                          room.participants.map((participant, idx) => (
                            <div key={idx} className="flex items-center bg-gray-800 rounded-full pl-1 pr-3 py-1">
                              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center mr-1.5">
                                <span className="text-xs">{participant.userName?.charAt(0)?.toUpperCase() || 'U'}</span>
                              </div>
                              <span className="text-xs text-gray-300">{participant.userName}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No participants</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-red-500 text-lg">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Inject dark mode style */}
      <style dangerouslySetInnerHTML={{ __html: darkModeStyle }} />
      
      {/* Header */}
      <header className="bg-gray-800 shadow-sm py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-300 hover:text-blue-400 transition-colors"
            >
              <ArrowLeft size={18} className="mr-1" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-semibold text-white">
              {(user?.isAdmin === true || user?.role === 'admin') ? 'Admin Dashboard' : 'My Profile'}
            </h1>
            {(user?.isAdmin === true || user?.role === 'admin') && (
              <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-1 rounded-full">
                Admin Account
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              <span className="font-medium">{currentMonth}, {currentYear}</span>
            </div>
            
            <button 
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center rounded-md px-3 py-1.5 text-sm ${
                editMode 
                  ? 'bg-green-800/30 text-green-400' 
                  : 'bg-blue-800/30 text-blue-400'
              }`}
            >
              {editMode ? (
                <>
                  <Save size={14} className="mr-1.5" />
                  <span>Save</span>
                </>
              ) : (
                <>
                  <Edit size={14} className="mr-1.5" />
                  <span>Edit Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>
      
      {/* Delete Confirmation Modal */}
      {renderDeleteConfirmation()}
      
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Profile card & info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex flex-col items-center">
                {editMode ? (
                  <>
                    <div className="mb-4">
                      <input
                        type="text"
                        name="profilePic"
                        value={formData.profilePic}
                        onChange={handleChange}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                        placeholder="Profile picture URL"
                      />
                    </div>
                    <div className="relative w-24 h-24 mb-4 group">
                      <img 
                        src={previewUrl || formData.profilePic || `https://ui-avatars.com/api/?name=${formData.userName}&background=random&size=200`} 
                        alt="Profile Preview"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                      <div 
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={triggerFileSelect}
                      >
                        <Camera size={20} className="text-white" />
                      </div>
                      
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </div>
                    
                    {/* Upload button (visible when a file is selected) */}
                    {selectedFile && (
                      <div className="mb-4 w-full">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm text-gray-400">Selected: {selectedFile.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewUrl('');
                            }}
                            className="text-red-400 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        
                        {uploadProgress > 0 && uploadProgress < 100 ? (
                          <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={uploadProfilePicture}
                            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm"
                          >
                            <Upload size={14} />
                            <span>Upload Picture</span>
                          </button>
                        )}
                      </div>
                    )}
                    
                    <input
                      type="text"
                      name="userName"
                      value={formData.userName}
                      onChange={handleChange}
                      className="text-center bg-gray-700 border border-gray-600 rounded-md p-2 text-lg font-semibold mb-1 w-full"
                    />
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 mb-4">
                      <img 
                        src={user.profilePic || `https://ui-avatars.com/api/?name=${user.userName}&background=random&size=200`} 
                        alt={user.userName}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    </div>
                    <h2 className="text-xl font-bold text-white">{user.userName}</h2>
                  </>
                )}
                
                {editMode ? (
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="3"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm mt-3"
                    placeholder="Write a short bio..."
                  ></textarea>
                ) : (
                  user.bio && <p className="text-gray-400 text-center mt-2">{user.bio}</p>
                )}
                
                {/* Contact buttons */}
                {!editMode && (
                  <div className="flex space-x-2 mt-4">
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 text-gray-300">
                      <MailIcon size={16} />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 text-gray-300">
                      <Phone size={16} />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-700 text-gray-300">
                      <Calendar size={16} />
                    </button>
                  </div>
                )}
              </div>

              {!editMode && (user.role || user.location) && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="flex items-center text-gray-300 mb-3">
                    <User size={15} className="mr-2 text-gray-500" />
                    <span className="capitalize">{user.role || 'User'}</span>
                  </div>
                  
                  {user.location && (
                    <div className="flex items-center text-gray-300">
                      <MapPin size={15} className="mr-2 text-gray-500" />
                      <span>{user.location}</span>
                    </div>
                  )}
                </div>
              )}
              
              {editMode && (
                <div className="mt-4">
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                      placeholder="City, Country"
                    />
                  </div>
                </div>
              )}
              
              {/* Social links */}
              {editMode ? (
                <div className="mt-4 space-y-3">
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Social Links
                  </label>
                  
                  <div className="flex items-center">
                    <GithubIcon size={16} className="text-gray-500 mr-2" />
                    <input
                      type="text"
                      name="socialLinks.github"
                      value={formData.socialLinks?.github || ''}
                      onChange={handleChange}
                      className="flex-grow bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                      placeholder="GitHub username"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <LinkedinIcon size={16} className="text-gray-500 mr-2" />
                    <input
                      type="text"
                      name="socialLinks.linkedin"
                      value={formData.socialLinks?.linkedin || ''}
                      onChange={handleChange}
                      className="flex-grow bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                      placeholder="LinkedIn profile URL"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <TwitterIcon size={16} className="text-gray-500 mr-2" />
                    <input
                      type="text"
                      name="socialLinks.twitter"
                      value={formData.socialLinks?.twitter || ''}
                      onChange={handleChange}
                      className="flex-grow bg-gray-700 border border-gray-600 rounded-md p-2 text-sm"
                      placeholder="Twitter username"
                    />
                  </div>
                </div>
              ) : (
                (user.socialLinks?.github || user.socialLinks?.linkedin || user.socialLinks?.twitter) && (
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <div className="flex space-x-4">
                      {user.socialLinks?.github && (
                        <a 
                          href={`https://github.com/${user.socialLinks.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-400"
                        >
                          <GithubIcon size={18} />
                        </a>
                      )}
                      
                      {user.socialLinks?.linkedin && (
                        <a 
                          href={user.socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-400"
                        >
                          <LinkedinIcon size={18} />
                        </a>
                      )}
                      
                      {user.socialLinks?.twitter && (
                        <a 
                          href={`https://twitter.com/${user.socialLinks.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-400"
                        >
                          <TwitterIcon size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              )}
              
              {editMode && (
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-4 py-1.5 bg-blue-800 text-blue-400 hover:bg-blue-700 rounded-md text-sm font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
            
            {/* Account Settings */}
            <div className="bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center text-gray-400">
                  <Settings size={16} className="mr-2 text-gray-500" />
                  Account Settings
                </h3>
              </div>
              
              {/* Theme Settings */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Theme Preference</h4>
                <div className="space-y-2">
                  <label className="flex items-center text-sm text-gray-400 cursor-pointer">
                    <input 
                      type="radio" 
                      name="theme" 
                      checked={theme === 'light'} 
                      onChange={() => handleThemeChange('light')}
                      className="form-radio h-4 w-4 text-blue-600 mr-2"
                    />
                    <span>Light Mode</span>
                  </label>
                  
                  <label className="flex items-center text-sm text-gray-400 cursor-pointer">
                    <input 
                      type="radio" 
                      name="theme" 
                      checked={theme === 'dark'} 
                      onChange={() => handleThemeChange('dark')}
                      className="form-radio h-4 w-4 text-blue-600 mr-2"
                    />
                    <span className="font-medium">Dark Mode</span>
                  </label>
                  
                  <label className="flex items-center text-sm text-gray-400 cursor-pointer">
                    <input 
                      type="radio" 
                      name="theme" 
                      checked={theme === 'system'} 
                      onChange={() => handleThemeChange('system')}
                      className="form-radio h-4 w-4 text-blue-600 mr-2"
                    />
                    <span>System Default</span>
                  </label>
                </div>
              </div>
              
              {/* Account Management */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Account Management</h4>
                <div className="space-y-2">
                  <button 
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-700 transition-colors flex items-center"
                  >
                    <span>Change Password</span>
                  </button>
                  
                  <button 
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-700 transition-colors flex items-center text-red-500"
                  >
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column - Skills and other user details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills Section */}
            <div className="bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold flex items-center text-gray-400">
                  <Code size={16} className="mr-2 text-gray-500" />
                  Skills & Expertise
                </h3>
              </div>
              
              {editMode ? (
                <div>
                  <div className="flex mb-4">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      className="flex-grow bg-gray-700 border border-gray-600 rounded-l-md p-2 text-sm"
                      placeholder="Add a skill..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="bg-blue-600 text-white px-4 py-2 rounded-r-md transition-colors text-sm"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.skills && formData.skills.map((skill, index) => (
                      <div key={index} className="bg-blue-700/30 text-blue-300 px-3 py-1 rounded-full text-sm flex items-center">
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-2 text-blue-400 hover:text-blue-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.skills && user.skills.map((skill, index) => (
                    <span key={index} className="bg-blue-700/30 text-blue-300 px-3 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                  
                  {(!user.skills || user.skills.length === 0) && (
                    <p className="text-gray-500 text-sm">No skills added yet</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Admin section OR Unread Messages section based on role */}
            {(user?.isAdmin === true || user?.role === 'admin') ? (
              renderAdminSection()
            ) : (
              <div className="bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold flex items-center text-gray-400">
                    <MessageCircle size={16} className="mr-2 text-gray-500" />
                    Unread Messages
                  </h3>
                  {unreadMessages.length > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                
                {messagesLoading ? (
                  <div className="py-4 flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
                  </div>
                ) : unreadMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-gray-500 text-sm">
                    <AlertCircle size={24} className="mb-2 text-gray-400 opacity-50" />
                    <p>No unread messages to display.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Group messages by sender */}
                    {(() => {
                      // Group messages by sender
                      const messagesBySender = {};
                      unreadMessages.forEach(message => {
                        const senderId = message.senderId || message.sender;
                        if (!messagesBySender[senderId]) {
                          messagesBySender[senderId] = {
                            messages: [],
                            sender: {
                              id: senderId,
                              name: message.senderName,
                              profilePic: message.senderProfilePic
                            }
                          };
                        }
                        messagesBySender[senderId].messages.push(message);
                      });
                      
                      // Convert to array
                      return Object.values(messagesBySender).map((group, index) => (
                        <div 
                          key={group.sender.id || index}
                          className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-5 shadow-lg border border-gray-700"
                        >
                          {/* Sender info */}
                          <div className="flex items-center mb-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0 flex items-center justify-center shadow-md shadow-purple-500/10">
                              {group.sender.profilePic ? (
                                <img 
                                  src={group.sender.profilePic} 
                                  alt={group.sender.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-white font-bold">
                                  {group.sender.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                              )}
                            </div>
                            <div className="ml-3">
                              <h4 className="font-medium text-white">
                                {group.sender.name}
                              </h4>
                              <p className="text-xs text-gray-400">
                                {group.messages.length} unread {group.messages.length === 1 ? 'message' : 'messages'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Message bubbles */}
                          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar px-1">
                            {group.messages.map((message, idx) => (
                              <div 
                                key={message._id || idx}
                                className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 px-4 py-3 rounded-xl text-sm text-white"
                              >
                                <div className="flex justify-between items-start">
                                  <p>{message.text || message.message}</p>
                                  <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                                    {message.formattedTime}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex justify-end mt-2 space-x-2">
                            <button
                              onClick={() => group.messages.forEach(msg => handleMarkAsRead(msg._id))}
                              className="text-xs px-3 py-1.5 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                            >
                              Mark all as read
                            </button>
                            <button
                              onClick={() => handleGoToChat(group.sender.id)}
                              className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white transition-colors font-medium"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage; 