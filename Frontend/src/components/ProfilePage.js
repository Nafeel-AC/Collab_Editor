import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Edit, Save, User, MapPin, GithubIcon, LinkedinIcon, TwitterIcon, Mail, Phone, Calendar, ArrowLeft, MailIcon, Code, Settings, Upload, Camera, MessageCircle, AlertCircle, Users, Trash2, Shield, Layers, Monitor, MoreHorizontal, Filter, Search, RefreshCw, UserX, X } from 'lucide-react';
import { API_BASE_URL, getImageUrl } from '../config/api.config.js';

// Add a style element to force dark theme globally
const darkModeStyle = `
  body, html {
    background-color: #0F0F13 !important; /* Updated deep dark background */
    color: white !important;
    background-image: radial-gradient(circle at 15% 50%, rgba(77, 93, 254, 0.08) 0%, transparent 45%), 
                      radial-gradient(circle at 85% 30%, rgba(77, 93, 254, 0.08) 0%, transparent 55%);
    background-attachment: fixed;
  }
  
  /* Custom scrollbar styling */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(25, 25, 35, 0.5);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(77, 93, 254, 0.5);
    border-radius: 10px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(77, 93, 254, 0.7);
  }
  
  /* Add glowing effect to certain elements */
  .glow-effect {
    box-shadow: 0 0 25px rgba(77, 93, 254, 0.15);
  }
  
  .card-glow {
    box-shadow: 0 4px 20px -5px rgba(77, 93, 254, 0.25);
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
    document.body.style.backgroundColor = '#0F0F13'; // Updated darker background
    
    // Create a style element
    const style = document.createElement('style');
    style.textContent = darkModeStyle;
    document.head.appendChild(style);
    
    // Cleanup function to remove the style when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Fetch unread messages
  const fetchUnreadMessages = async () => {
    try {
      setMessagesLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${API_BASE_URL}/api/messages/unread`, {
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
      const response = await axios.get(`${API_BASE_URL}/api/users/all-users`, {
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
      if (!token) {
        console.log('No token found, cannot fetch rooms');
        return;
      }
      
      console.log('Making request to get active rooms');
      const response = await axios.get(`${API_BASE_URL}/api/rooms/active`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      console.log('Active rooms response status:', response.status);
      
      if (response.data && Array.isArray(response.data)) {
        console.log('Active rooms data received, count:', response.data.length);
        
        // Filter out rooms with no participants or that are too old (redundant check)
        const validRooms = response.data.filter(room => 
          (room.participants && room.participants.length > 0) || 
          (room.lastActive && new Date(room.lastActive) > new Date(Date.now() - 3 * 60 * 60 * 1000))
        );
        
        console.log('Valid active rooms after client filtering:', validRooms.length);
        
        if (validRooms.length > 0) {
          console.log('First room example:', validRooms[0]);
        } else {
          console.log('No active rooms found after filtering');
        }
        
        setActiveRooms(validRooms);
      } else {
        console.error('Unexpected response format:', response.data);
        setActiveRooms([]);
      }
    } catch (err) {
      console.error('Error fetching active rooms:', err);
      console.error('Error status:', err.response?.status);
      console.error('Error details:', err.response?.data || err.message);
      setActiveRooms([]);
      
      // Show toast or notification
      if (err.response?.status === 403) {
        alert('You do not have permission to view active rooms');
      } else {
        console.error('Failed to fetch active rooms:', err.message);
      }
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
      
      await axios.delete(`${API_BASE_URL}/api/users/${userId}`, {
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
      
      await axios.put(`${API_BASE_URL}/api/users/${userId}/admin`, 
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
        
        const response = await axios.get(`${API_BASE_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          withCredentials: true
        });
        
        console.log('User data response:', response.data);
        console.log('Is admin value:', response.data.isAdmin);
        console.log('Role value:', response.data.role);
        
        // Cloudinary URLs are already absolute, no need to process them
        let profilePicUrl = response.data.profilePic;
        console.log('Profile image URL:', profilePicUrl);
        
        const userData = {
          ...response.data
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
      
      const response = await axios.post(`${API_BASE_URL}/api/users/profile-picture`, uploadFormData, {
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
    } finally {
      // ... existing code ...
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
      
      const response = await axios.put(`${API_BASE_URL}/api/users/profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      console.log('Profile update response:', response.data);
      
      // Ensure profile picture URL is properly formatted
      let profilePicUrl = response.data.user.profilePic;
      if (profilePicUrl && !profilePicUrl.startsWith('http')) {
        profilePicUrl = `${API_BASE_URL}${profilePicUrl}`;
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
      
      await axios.put(`${API_BASE_URL}/api/users/theme`, { theme: newTheme }, {
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
      document.body.style.backgroundColor = '#0F0F13'; // Updated darker background
      
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
      
      await axios.post(`${API_BASE_URL}/api/messages/mark-read/${messageId}`, {}, {
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
      
      await axios.post(`${API_BASE_URL}/api/messages/mark-all-read`, {}, {
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
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-[#14141B]/90 rounded-xl shadow-lg p-6 max-w-md w-full mx-4 border border-[#2A2A3A] card-glow backdrop-blur-sm">
          <h3 className="text-xl font-semibold text-white mb-3 flex items-center">
            <AlertCircle size={20} className="mr-2 text-[#E94560]" />
            Confirm Account Deletion
          </h3>
          <p className="text-[#D1D1E0] mb-4">
            Are you sure you want to delete the account for <span className="font-medium text-white">{userToDelete.userName}</span>? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setUserToDelete(null);
              }}
              className="px-4 py-2 bg-[#1E1E29]/80 hover:bg-[#2A2A3A] text-white rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteUser(userToDelete._id)}
              className="px-4 py-2 bg-[#E94560]/10 hover:bg-[#E94560]/20 text-[#E94560] rounded-md flex items-center"
            >
              <UserX size={16} className="mr-1.5" />
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
      <div className="bg-[#14141B]/80 rounded-xl shadow-sm p-6 backdrop-blur-sm card-glow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h3 className="font-semibold flex items-center text-[#D1D1E0] mb-4 sm:mb-0">
            <Shield size={16} className="mr-2 text-[#8F8FA3]" />
            Admin Controls
          </h3>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setAdminView('users')}
              className={`px-3 py-1.5 text-sm rounded-md flex items-center ${
                adminView === 'users' 
                  ? 'bg-[#4D5DFE] text-white glow-effect' 
                  : 'bg-[#1E1E29]/80 text-[#D1D1E0] hover:bg-[#2A2A3A]'
              }`}
            >
              <Users size={14} className="mr-1.5" />
              <span>Users</span>
            </button>
            <button
              onClick={() => setAdminView('rooms')}
              className={`px-3 py-1.5 text-sm rounded-md flex items-center ${
                adminView === 'rooms' 
                  ? 'bg-[#4D5DFE] text-white glow-effect' 
                  : 'bg-[#1E1E29]/80 text-[#D1D1E0] hover:bg-[#2A2A3A]'
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
                <Search size={16} className="absolute left-3 top-2.5 text-[#8F8FA3]" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={handleUserSearch}
                  placeholder="Search users by name or email..."
                  className="bg-[#1E1E29]/80 border border-[#2A2A3A] rounded-lg py-2 pl-10 pr-4 w-full text-sm text-[#D1D1E0] backdrop-blur-sm"
                />
              </div>
              <button
                onClick={fetchAllUsers}
                className="bg-[#1E1E29]/80 hover:bg-[#2A2A3A] text-[#D1D1E0] rounded-lg px-4 py-2 text-sm flex items-center justify-center backdrop-blur-sm"
              >
                <RefreshCw size={14} className="mr-1.5" />
                <span>Refresh</span>
              </button>
            </div>
            
            {usersLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#4D5DFE]"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-[#8F8FA3]">
                <Users size={40} className="mx-auto mb-3 opacity-20" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-[#2A2A3A] bg-[#14141B]/60 backdrop-blur-sm">
                <table className="min-w-full divide-y divide-[#2A2A3A]">
                  <thead className="bg-[#14141B]/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#D1D1E0] uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#D1D1E0] uppercase tracking-wider hidden sm:table-cell">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#D1D1E0] uppercase tracking-wider hidden md:table-cell">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#D1D1E0] uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-[#D1D1E0] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#1E1E29]/60 divide-y divide-[#2A2A3A]">
                    {filteredUsers.map(user => (
                      <tr key={user._id} className="hover:bg-[#2A2A3A]/60">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 relative">
                              <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/5 blur-sm"></div>
                              {user.profilePic ? (
                                <img 
                                  src={getImageUrl(user.profilePic)} 
                                  alt={user.userName} 
                                  className="h-8 w-8 rounded-full object-cover relative z-10"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-[#1E1E29] flex items-center justify-center relative z-10">
                                  <span className="text-xs font-medium text-[#D1D1E0]">
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
                          <div className="text-sm text-[#D1D1E0]">{user.email}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="text-sm text-[#D1D1E0]">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isAdmin 
                              ? 'bg-[#4D5DFE]/20 text-[#4D5DFE]' 
                              : 'bg-[#1E1E29] text-[#D1D1E0]'
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
                                  ? 'bg-[#4D5DFE]/30 text-[#4D5DFE]' 
                                  : 'bg-[#1E1E29] text-[#D1D1E0] hover:bg-[#2A2A3A]'
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
                              className="p-1.5 rounded-md bg-[#E94560]/30 text-[#E94560] hover:bg-[#E94560]/50"
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
              <div className="flex space-x-2">
                <button
                  onClick={fetchActiveRooms}
                  className="bg-[#1E1E29]/80 hover:bg-[#2A2A3A] text-[#D1D1E0] rounded-lg px-3 py-1.5 text-sm flex items-center backdrop-blur-sm"
                >
                  <RefreshCw size={14} className="mr-1.5" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      setRoomsLoading(true);
                      const token = localStorage.getItem('token');
                      if (!token) return;
                      
                      const response = await axios.post(`${API_BASE_URL}/api/rooms/cleanup`, {}, {
                        headers: {
                          Authorization: `Bearer ${token}`
                        },
                        withCredentials: true
                      });
                      
                      console.log('Cleanup response:', response.data);
                      alert(`Cleanup complete: ${response.data.message}`);
                      
                      // Refresh room list
                      fetchActiveRooms();
                    } catch (err) {
                      console.error('Error cleaning up rooms:', err);
                      alert('Error cleaning up rooms: ' + (err.response?.data?.error || err.message));
                    } finally {
                      setRoomsLoading(false);
                    }
                  }}
                  className="bg-[#E94560]/40 hover:bg-[#E94560]/60 text-[#E94560] rounded-lg px-3 py-1.5 text-sm flex items-center"
                >
                  <Trash2 size={14} className="mr-1.5" />
                  <span>Clean Up</span>
                </button>
              </div>
            </div>
            
            {roomsLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#4D5DFE]"></div>
              </div>
            ) : activeRooms.length === 0 ? (
              <div className="text-center py-10 text-[#8F8FA3] border border-[#2A2A3A] rounded-lg bg-[#1E1E29]/40 backdrop-blur-sm">
                <Monitor size={40} className="mx-auto mb-3 opacity-20" />
                <p className="mb-4">No active rooms at the moment</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={fetchActiveRooms}
                    className="bg-[#1E1E29]/80 hover:bg-[#2A2A3A] text-[#D1D1E0] rounded-lg px-3 py-1.5 text-sm flex items-center backdrop-blur-sm"
                  >
                    <RefreshCw size={14} className="mr-1.5" />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        setRoomsLoading(true);
                        const token = localStorage.getItem('token');
                        if (!token) return;
                        
                        const response = await axios.post(`${API_BASE_URL}/api/rooms/cleanup`, {}, {
                          headers: {
                            Authorization: `Bearer ${token}`
                          },
                          withCredentials: true
                        });
                        
                        console.log('Cleanup response:', response.data);
                        alert(`Cleanup complete: ${response.data.message}`);
                        
                        // Refresh room list
                        fetchActiveRooms();
                      } catch (err) {
                        console.error('Error cleaning up rooms:', err);
                        alert('Error cleaning up rooms: ' + (err.response?.data?.error || err.message));
                      } finally {
                        setRoomsLoading(false);
                      }
                    }}
                    className="bg-[#E94560]/20 hover:bg-[#E94560]/30 text-[#E94560] rounded-lg px-3 py-1.5 text-sm flex items-center"
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    <span>Clean Up</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {activeRooms.map(room => (
                  <div 
                    key={room._id} 
                    className="bg-[#1E1E29]/80 border border-[#2A2A3A] rounded-lg p-4 shadow backdrop-blur-sm card-glow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h5 className="text-white font-medium">{room.name || `Room #${room.roomId}`}</h5>
                      <div className="flex items-center space-x-2">
                        {room.participants && room.participants.length > 0 ? (
                          <span className="text-xs bg-[#4D5DFE]/30 text-[#4D5DFE] px-2 py-0.5 rounded-full flex items-center">
                            <span className="w-2 h-2 rounded-full bg-[#4D5DFE] animate-pulse mr-1.5"></span>
                            Live
                          </span>
                        ) : (
                          <span className="text-xs bg-[#2A2A3A] text-[#8F8FA3] px-2 py-0.5 rounded-full">
                            Idle
                          </span>
                        )}
                        <button
                          onClick={async () => {
                            try {
                              if (!window.confirm(`Close room ${room.roomId}?`)) return;
                              const token = localStorage.getItem('token');
                              await axios.post(`${API_BASE_URL}/api/rooms/${room.roomId}/close`, {}, {
                                headers: { Authorization: `Bearer ${token}` },
                                withCredentials: true
                              });
                              
                              // Remove room from list
                              setActiveRooms(rooms => rooms.filter(r => r._id !== room._id));
                            } catch (err) {
                              console.error('Error closing room:', err);
                              alert('Failed to close room: ' + (err.response?.data?.error || err.message));
                            }
                          }}
                          className="text-xs p-1 rounded-full bg-[#E94560]/20 text-[#E94560] hover:bg-[#E94560]/30"
                          title="Close room"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-[#8F8FA3] mb-3">
                      <div>Created: {new Date(room.createdAt).toLocaleString()}</div>
                      <div>Host: {room.createdBy?.userName || room.createdBy || 'Unknown'}</div>
                      <div className="flex items-center">
                        <span>Last Active: </span>
                        <span className={new Date(room.lastActive) > new Date(Date.now() - 60 * 60 * 1000) ? 'text-[#4ADE80]' : ''}>
                          {new Date(room.lastActive).toLocaleString()}
                        </span>
                      </div>
                      <div>Room ID: {room.roomId}</div>
                    </div>
                    
                    <div className="mb-3">
                      <h6 className="text-xs uppercase text-[#8F8FA3] mb-2">Participants</h6>
                      <div className="flex flex-wrap gap-2">
                        {room.participants && room.participants.length > 0 ? (
                          room.participants.map((participant, idx) => (
                            <div key={idx} className="flex items-center bg-[#1E1E29] rounded-full pl-1 pr-3 py-1">
                              <div className="w-5 h-5 rounded-full bg-[#4D5DFE] flex items-center justify-center mr-1.5">
                                <span className="text-xs">{participant.username?.charAt(0)?.toUpperCase() || 'U'}</span>
                              </div>
                              <span className="text-xs text-[#D1D1E0]">{participant.username}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-[#8F8FA3]">No current participants</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          // Copy room ID to clipboard
                          navigator.clipboard.writeText(room.roomId)
                            .then(() => alert(`Room ID copied: ${room.roomId}`))
                            .catch(err => console.error('Failed to copy ID:', err));
                        }}
                        className="text-xs bg-[#1E1E29] hover:bg-[#2A2A3A] text-[#D1D1E0] px-2 py-1 rounded"
                      >
                        Copy ID
                      </button>
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
  
  // Run cleanup when admin first switches to rooms view
  useEffect(() => {
    const runInitialCleanup = async () => {
      // Only run cleanup if user is admin and adminView is set to 'rooms'
      if ((user?.isAdmin === true || user?.role === 'admin') && adminView === 'rooms') {
        console.log('Running initial cleanup of inactive rooms');
        try {
          setRoomsLoading(true);
          const token = localStorage.getItem('token');
          if (!token) return;
          
          // Silently run cleanup
          const response = await axios.post(`${API_BASE_URL}/api/rooms/cleanup`, {}, {
            headers: {
              Authorization: `Bearer ${token}`
            },
            withCredentials: true
          });
          
          console.log('Initial cleanup response:', response.data);
          
          // Then fetch fresh rooms data
          fetchActiveRooms();
        } catch (err) {
          console.error('Error running initial cleanup:', err);
        } finally {
          setRoomsLoading(false);
        }
      }
    };
    
    runInitialCleanup();
  }, [adminView]); // Only run when adminView changes

  // Auto-refresh active rooms data when in admin view
  useEffect(() => {
    // Only set up auto-refresh if user is admin and adminView is set to 'rooms'
    if ((user?.isAdmin === true || user?.role === 'admin') && adminView === 'rooms') {
      console.log('Setting up auto-refresh for active rooms');
      
      // Set up auto-refresh interval
      const refreshInterval = setInterval(() => {
        console.log('Auto-refreshing active rooms data');
        fetchActiveRooms();
      }, 60000); // Refresh every minute
      
      // Cleanup function to clear interval when component unmounts or view changes
      return () => {
        console.log('Clearing active rooms refresh interval');
        clearInterval(refreshInterval);
      };
    }
  }, [user, adminView]); // Re-run effect when user or adminView changes
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F0F13]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#4D5DFE]"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0F0F13]">
        <div className="text-red-500 text-lg">{error}</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#0F0F13] text-white">
      {/* Accent glow elements */}
      <div className="fixed top-[-250px] left-[-250px] w-[500px] h-[500px] rounded-full bg-[#4D5DFE] opacity-[0.03] blur-[150px] pointer-events-none"></div>
      <div className="fixed bottom-[10%] right-[-150px] w-[400px] h-[400px] rounded-full bg-[#4D5DFE] opacity-[0.04] blur-[120px] pointer-events-none"></div>
      
      {/* Sticky Header with Back Button & Actions */}
      <header className="sticky top-0 z-10 bg-[#14141B]/90 border-b border-[#2A2A3A] backdrop-blur-sm shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')}
                className="mr-4 p-2 hover:bg-[#1E1E29]/80 rounded-full transition-colors duration-200"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold">
                {user?.isAdmin || user?.role === 'admin' ? 'Admin Dashboard' : 'Profile'}
              </h1>
            </div>
            
            <button 
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center rounded-md px-3 py-1.5 text-sm ${
                editMode 
                  ? 'bg-[#4ADE80]/20 text-[#4ADE80] hover:bg-[#4ADE80]/30' 
                  : 'bg-[#4D5DFE]/20 text-[#4D5DFE] hover:bg-[#4D5DFE]/30'
              } transition-colors duration-200`}
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
      
      <main className="container mx-auto px-4 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Profile card & info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-[#14141B]/80 rounded-xl shadow-lg p-6 border border-[#2A2A3A] backdrop-blur-sm card-glow">
              <div className="flex flex-col items-center">
                {editMode ? (
                  <>
                    <div className="mb-4">
                      <input
                        type="text"
                        name="profilePic"
                        value={formData.profilePic}
                        onChange={handleChange}
                        className="w-full bg-[#1E1E29]/80 border border-[#2A2A3A] rounded-md p-2 text-sm text-white focus:border-[#4D5DFE] focus:ring-1 focus:ring-[#4D5DFE] outline-none"
                        placeholder="Profile picture URL"
                      />
                    </div>
                    <div className="relative w-24 h-24 mb-4 group">
                      <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-md"></div>
                      <img 
                        src={previewUrl || formData.profilePic || `https://ui-avatars.com/api/?name=${formData.userName}&background=random&size=200`} 
                        alt="Profile Preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-[#2A2A3A] relative z-10"
                      />
                      <div 
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-20"
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
                          <span className="text-sm text-[#8F8FA3]">Selected: {selectedFile.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewUrl('');
                            }}
                            className="text-[#E94560] text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        
                        {uploadProgress > 0 && uploadProgress < 100 ? (
                          <div className="w-full bg-[#1E1E29] rounded-full h-2.5">
                            <div 
                              className="bg-[#4D5DFE] h-2.5 rounded-full" 
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={uploadProfilePicture}
                            className="w-full flex items-center justify-center space-x-2 bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-3 py-1.5 rounded-md text-sm transition-colors duration-200 glow-effect"
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
                      className="text-center bg-[#1E1E29] border border-[#2A2A3A] rounded-md p-2 text-lg font-semibold mb-1 w-full focus:border-[#4D5DFE] focus:ring-1 focus:ring-[#4D5DFE] outline-none"
                    />
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 mb-4 relative">
                      <div className="absolute inset-0 rounded-full bg-[#4D5DFE]/10 blur-md"></div>
                      <img 
                        src={user.profilePic || `https://ui-avatars.com/api/?name=${user.userName}&background=random&size=200`} 
                        alt={user.userName}
                        className="w-24 h-24 rounded-full object-cover border-2 border-[#2A2A3A] relative z-10"
                        onError={(e) => {
                          console.error("Error loading profile image:", e);
                          e.target.onerror = null;
                          e.target.src = `https://ui-avatars.com/api/?name=${user.userName || 'User'}&background=random&size=200`;
                        }}
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
                    className="w-full bg-[#1E1E29] border border-[#2A2A3A] rounded-md p-2 text-sm mt-3 focus:border-[#4D5DFE] focus:ring-1 focus:ring-[#4D5DFE] outline-none text-[#D1D1E0]"
                    placeholder="Write a short bio..."
                  ></textarea>
                ) : (
                  user.bio && <p className="text-[#D1D1E0] text-center mt-2">{user.bio}</p>
                )}
                
                {/* Contact buttons */}
                {!editMode && (user.role || user.location) && (
                  <div className="flex space-x-2 mt-4">
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1E1E29] text-[#D1D1E0] hover:bg-[#2A2A3A] transition-colors duration-200">
                      <MailIcon size={16} />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1E1E29] text-[#D1D1E0] hover:bg-[#2A2A3A] transition-colors duration-200">
                      <Phone size={16} />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1E1E29] text-[#D1D1E0] hover:bg-[#2A2A3A] transition-colors duration-200">
                      <Calendar size={16} />
                    </button>
                  </div>
                )}
              </div>

              {!editMode && (user.role || user.location) && (
                <div className="mt-6 pt-6 border-t border-[#2A2A3A]">
                  <div className="flex items-center text-[#D1D1E0] mb-3">
                    <User size={15} className="mr-2 text-[#8F8FA3]" />
                    <span className="capitalize">{user.role || 'User'}</span>
                  </div>
                  
                  {user.location && (
                    <div className="flex items-center text-[#D1D1E0]">
                      <MapPin size={15} className="mr-2 text-[#8F8FA3]" />
                      <span>{user.location}</span>
                    </div>
                  )}
                </div>
              )}
              
              {editMode && (
                <div className="mt-4">
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-[#8F8FA3] mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full bg-[#1E1E29] border border-[#2A2A3A] rounded-md p-2 text-sm text-[#D1D1E0] focus:border-[#4D5DFE] focus:ring-1 focus:ring-[#4D5DFE] outline-none"
                      placeholder="City, Country"
                    />
                  </div>
                </div>
              )}
              
              {/* Social links */}
              {editMode ? (
                <div className="mt-4 space-y-3">
                  <label className="block text-xs font-medium text-[#8F8FA3] mb-1">
                    Social Links
                  </label>
                  
                  <div className="flex items-center">
                    <GithubIcon size={16} className="text-[#8F8FA3] mr-2" />
                    <input
                      type="text"
                      name="socialLinks.github"
                      value={formData.socialLinks?.github || ''}
                      onChange={handleChange}
                      className="flex-grow bg-[#1E1E29] border border-[#2A2A3A] rounded-md p-2 text-sm text-[#D1D1E0] focus:border-[#4D5DFE] focus:ring-1 focus:ring-[#4D5DFE] outline-none"
                      placeholder="GitHub username"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <LinkedinIcon size={16} className="text-[#8F8FA3] mr-2" />
                    <input
                      type="text"
                      name="socialLinks.linkedin"
                      value={formData.socialLinks?.linkedin || ''}
                      onChange={handleChange}
                      className="flex-grow bg-[#1E1E29] border border-[#2A2A3A] rounded-md p-2 text-sm text-[#D1D1E0] focus:border-[#4D5DFE] focus:ring-1 focus:ring-[#4D5DFE] outline-none"
                      placeholder="LinkedIn profile URL"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <TwitterIcon size={16} className="text-[#8F8FA3] mr-2" />
                    <input
                      type="text"
                      name="socialLinks.twitter"
                      value={formData.socialLinks?.twitter || ''}
                      onChange={handleChange}
                      className="flex-grow bg-[#1E1E29] border border-[#2A2A3A] rounded-md p-2 text-sm text-[#D1D1E0] focus:border-[#4D5DFE] focus:ring-1 focus:ring-[#4D5DFE] outline-none"
                      placeholder="Twitter username"
                    />
                  </div>
                </div>
              ) : (
                (user.socialLinks?.github || user.socialLinks?.linkedin || user.socialLinks?.twitter) && (
                  <div className="mt-6 pt-6 border-t border-[#2A2A3A]">
                    <div className="flex space-x-4">
                      {user.socialLinks?.github && (
                        <a 
                          href={`https://github.com/${user.socialLinks.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8F8FA3] hover:text-[#4D5DFE] transition-colors duration-200"
                        >
                          <GithubIcon size={18} />
                        </a>
                      )}
                      
                      {user.socialLinks?.linkedin && (
                        <a 
                          href={user.socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8F8FA3] hover:text-[#4D5DFE] transition-colors duration-200"
                        >
                          <LinkedinIcon size={18} />
                        </a>
                      )}
                      
                      {user.socialLinks?.twitter && (
                        <a 
                          href={`https://twitter.com/${user.socialLinks.twitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#8F8FA3] hover:text-[#4D5DFE] transition-colors duration-200"
                        >
                          <TwitterIcon size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
            
            {/* Skills Section */}
            <div className="bg-[#14141B]/80 rounded-xl shadow-lg p-6 border border-[#2A2A3A] backdrop-blur-sm card-glow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <Code size={18} className="mr-2 text-[#4D5DFE]" />
                  <span>Skills & Expertise</span>
                </h2>
              </div>
              
              {editMode ? (
                <>
                  <div className="flex items-center mb-4">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      className="flex-grow bg-[#1E1E29] border border-[#2A2A3A] rounded-l-md p-2 text-sm text-[#D1D1E0] focus:border-[#4D5DFE] focus:ring-1 focus:ring-[#4D5DFE] outline-none"
                      placeholder="Add a skill (e.g. JavaScript, React)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddSkill}
                      className="bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-3 py-2 rounded-r-md transition-colors duration-200"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <div 
                        key={index}
                        className="bg-[#1E1E29] text-[#D1D1E0] px-3 py-1 rounded-full text-sm flex items-center"
                      >
                        {skill}
                        <button
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-2 text-[#E94560] hover:text-red-300"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    
                    {formData.skills.length === 0 && (
                      <p className="text-[#8F8FA3] text-sm">Add skills to showcase your expertise</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.skills && user.skills.length > 0 ? (
                    user.skills.map((skill, index) => (
                      <span 
                        key={index}
                        className="bg-[#1E1E29] text-[#D1D1E0] px-3 py-1 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-[#8F8FA3]">No skills added yet</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Settings Section */}
            <div className="bg-[#14141B]/80 rounded-xl shadow-lg p-6 border border-[#2A2A3A] backdrop-blur-sm card-glow">
              <div className="flex items-center mb-4">
                <Settings size={18} className="mr-2 text-[#4D5DFE]" />
                <h2 className="text-lg font-semibold">Account Settings</h2>
              </div>
              
              {/* Theme Settings */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[#D1D1E0] mb-3">Theme Preference</h3>
                <div className="flex space-x-3">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={theme === 'light'}
                      onChange={() => handleThemeChange('light')}
                      className="form-radio h-4 w-4 text-[#4D5DFE] focus:ring-[#4D5DFE] border-[#2A2A3A] bg-[#1E1E29]"
                    />
                    <span className="ml-2 text-sm text-[#D1D1E0]">Light Mode</span>
                  </label>
                  
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={theme === 'dark'}
                      onChange={() => handleThemeChange('dark')}
                      className="form-radio h-4 w-4 text-[#4D5DFE] focus:ring-[#4D5DFE] border-[#2A2A3A] bg-[#1E1E29]"
                    />
                    <span className="ml-2 text-sm text-[#D1D1E0]">Dark Mode</span>
                  </label>
                  
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value="system"
                      checked={theme === 'system'}
                      onChange={() => handleThemeChange('system')}
                      className="form-radio h-4 w-4 text-[#4D5DFE] focus:ring-[#4D5DFE] border-[#2A2A3A] bg-[#1E1E29]"
                    />
                    <span className="ml-2 text-sm text-[#D1D1E0]">System Default</span>
                  </label>
                </div>
              </div>
              
              {/* Account Management */}
              <div className="border-t border-[#2A2A3A] pt-6">
                <h3 className="text-sm font-medium text-[#D1D1E0] mb-3">Account Management</h3>
                
                <button 
                  onClick={() => navigate('/change-password')}
                  className="w-full bg-[#1E1E29] hover:bg-[#2A2A3A] text-[#D1D1E0] px-4 py-2 rounded-md text-sm text-left mb-3 transition-colors duration-200"
                >
                  Change Password
                </button>
                
                <button 
                  onClick={() => {
                    if (window.confirm('Are you sure you want to sign out?')) {
                      localStorage.removeItem('token');
                      navigate('/login');
                    }
                  }}
                  className="w-full bg-[#1E1E29] hover:bg-[#2A2A3A] text-[#D1D1E0] px-4 py-2 rounded-md text-sm text-left mb-3 transition-colors duration-200"
                >
                  Sign Out
                </button>
                
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-[#E94560]/10 hover:bg-[#E94560]/20 text-[#E94560] px-4 py-2 rounded-md text-sm text-left transition-colors duration-200"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
          
          {/* Right column - Skills and other user details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Skills Section */}
            <div className="bg-[#14141B]/80 rounded-xl shadow-lg p-6 border border-[#2A2A3A] backdrop-blur-sm card-glow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <Code size={18} className="mr-2 text-[#4D5DFE]" />
                  <span>Skills & Expertise</span>
                </h2>
              </div>
              
              {editMode ? (
                <>
                  <div className="flex items-center mb-4">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      className="flex-grow bg-[#1E1E29] border border-[#2A2A3A] rounded-l-md p-2 text-sm text-[#D1D1E0] focus:border-[#4D5DFE] focus:ring-1 focus:ring-[#4D5DFE] outline-none"
                      placeholder="Add a skill (e.g. JavaScript, React)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddSkill}
                      className="bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white px-3 py-2 rounded-r-md transition-colors duration-200"
                    >
                      Add
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map((skill, index) => (
                      <div 
                        key={index}
                        className="bg-[#1E1E29] text-[#D1D1E0] px-3 py-1 rounded-full text-sm flex items-center"
                      >
                        {skill}
                        <button
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-2 text-[#E94560] hover:text-red-300"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    
                    {formData.skills.length === 0 && (
                      <p className="text-[#8F8FA3] text-sm">Add skills to showcase your expertise</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.skills && user.skills.length > 0 ? (
                    user.skills.map((skill, index) => (
                      <span 
                        key={index}
                        className="bg-[#1E1E29] text-[#D1D1E0] px-3 py-1 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-[#8F8FA3]">No skills added yet</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Admin section OR Unread Messages section based on role */}
            {(user?.isAdmin === true || user?.role === 'admin') ? (
              renderAdminSection()
            ) : (
              <div className="bg-[#14141B]/80 rounded-xl shadow-lg p-6 border border-[#2A2A3A] backdrop-blur-sm card-glow">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold flex items-center">
                    <MessageCircle size={18} className="mr-2 text-[#4D5DFE]" />
                    <span>Unread Messages</span>
                  </h2>
                  {unreadMessages.length > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-[#4D5DFE] hover:text-[#3A4AE1] transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                
                {messagesLoading ? (
                  <div className="py-4 flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#4D5DFE]"></div>
                  </div>
                ) : unreadMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-[#8F8FA3] text-sm">
                    <AlertCircle size={24} className="mb-2 text-[#8F8FA3] opacity-50" />
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
                          className="bg-[#1E1E29] rounded-2xl p-5 shadow-lg border border-[#2A2A3A]"
                        >
                          {/* Sender info */}
                          <div className="flex items-center mb-3">
                            <div className="h-10 w-10 rounded-full bg-[#4D5DFE] flex-shrink-0 flex items-center justify-center shadow-md shadow-[#3A4AE1]/10">
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
                              <p className="text-xs text-[#8F8FA3]">
                                {group.messages.length} unread {group.messages.length === 1 ? 'message' : 'messages'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Message bubbles */}
                          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar px-1">
                            {group.messages.map((message, idx) => (
                              <div 
                                key={message._id || idx}
                                className="bg-[#1E1E29] px-4 py-3 rounded-xl text-sm text-white"
                              >
                                <div className="flex justify-between items-start">
                                  <p>{message.text || message.message}</p>
                                  <span className="text-xs text-[#8F8FA3] ml-2 whitespace-nowrap">
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
                              className="text-xs px-3 py-1.5 rounded-full bg-[#1E1E29] hover:bg-[#2A2A3A] text-[#D1D1E0] transition-colors"
                            >
                              Mark all as read
                            </button>
                            <button
                              onClick={() => handleGoToChat(group.sender.id)}
                              className="text-xs px-3 py-1.5 rounded-full bg-[#4D5DFE] hover:bg-[#3A4AE1] text-white transition-colors font-medium"
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