import React, { useState, useEffect } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Bell, Search, Plus, Code2, LogIn, MoreVertical, UserPlus, Check, X, Users, MessageSquare } from 'lucide-react';

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get authentication data from localStorage
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userName, setUserName] = useState(localStorage.getItem('userName') || location.state?.username);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  
  // State for users, friends, and friend requests
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'users', 'requests'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roomId, setRoomId] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Check authentication on component mount
  useEffect(() => {
    // If no token is present, redirect to login
    if (!token) {
      navigate('/LoginPage', { replace: true });
      return;
    }

    // Verify token validity by making a request to get user data
    const verifyToken = async () => {
      try {
        const response = await fetch('http://localhost:3050/api/users/friends', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          // If token is invalid, clear storage and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('userName');
          setIsAuthenticated(false);
          navigate('/LoginPage', { replace: true });
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        setError('Authentication failed. Please log in again.');
      }
    };

    verifyToken();
  }, [token, navigate]);
  
  // Initialize filtered users when the users array changes
  useEffect(() => {
    // Initially show first 5 users when tab is switched to users
    if (activeTab === 'users') {
      setFilteredUsers(users.slice(0, 5));
    }
  }, [users, activeTab]);

  // Fetch all users, friends, and friend requests
  useEffect(() => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch friends
        const friendsResponse = await fetch('http://localhost:3050/api/users/friends', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });
        
        if (friendsResponse.ok) {
          try {
            const friendsData = await friendsResponse.json();
            if (Array.isArray(friendsData)) {
              setFriends(friendsData.map(friend => ({
                id: friend._id,
                name: friend.userName,
                status: 'Online',
                online: true,
                avatar: `https://ui-avatars.com/api/?name=${friend.userName}&background=random`
              })));
            } else {
              console.error('Friends data is not an array:', friendsData);
            }
          } catch (parseError) {
            console.error('Error parsing friends response:', parseError);
            const text = await friendsResponse.text();
            console.error('Raw response:', text);
          }
        } else {
          console.error('Friends response not OK:', friendsResponse.status);
        }
        
        // Fetch friend requests
        const requestsResponse = await fetch('http://localhost:3050/api/users/friend-requests', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });
        
        if (requestsResponse.ok) {
          try {
            const requestsData = await requestsResponse.json();
            if (Array.isArray(requestsData)) {
              setFriendRequests(requestsData.map(user => ({
                id: user._id,
                name: user.userName,
                email: user.email,
                avatar: `https://ui-avatars.com/api/?name=${user.userName}&background=random`
              })));
            } else {
              console.error('Friend requests data is not an array:', requestsData);
            }
          } catch (parseError) {
            console.error('Error parsing friend requests response:', parseError);
            const text = await requestsResponse.text();
            console.error('Raw response:', text);
          }
        } else {
          console.error('Friend requests response not OK:', requestsResponse.status);
        }
        
        // Fetch all users (for sending friend requests)
        const usersResponse = await fetch('http://localhost:3050/api/users/all', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });
        
        if (usersResponse.ok) {
          try {
            const usersData = await usersResponse.json();
            if (Array.isArray(usersData)) {
              setUsers(usersData.map(user => ({
                id: user._id,
                name: user.userName,
                email: user.email,
                avatar: `https://ui-avatars.com/api/?name=${user.userName}&background=random`
              })));
            } else {
              console.error('Users data is not an array:', usersData);
            }
          } catch (parseError) {
            console.error('Error parsing users response:', parseError);
            const text = await usersResponse.text();
            console.error('Raw response:', text);
          }
        } else {
          console.error('Users response not OK:', usersResponse.status);
        }
      } catch (err) {
        setError('Failed to fetch data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, token]);
  
  // Handle sending friend request
  const handleSendFriendRequest = async (userId) => {
    try {
      const response = await fetch('http://localhost:3050/api/users/send-friend-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ targetUserId: userId }),
      });
      
      if (response.ok) {
        // Remove user from the list
        setUsers(users.filter(user => user.id !== userId));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send friend request');
      }
    } catch (err) {
      setError('Failed to send friend request');
      console.error(err);
    }
  };
  
  // Handle accepting friend request
  const handleAcceptFriendRequest = async (requesterId) => {
    try {
      const response = await fetch('http://localhost:3050/api/users/accept-friend-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ requesterId }),
      });
      
      if (response.ok) {
        // Find the user in friend requests
        const acceptedUser = friendRequests.find(req => req.id === requesterId);
        
        // Remove from friend requests
        setFriendRequests(friendRequests.filter(req => req.id !== requesterId));
        
        // Add to friends list
        if (acceptedUser) {
          setFriends([...friends, {
            id: acceptedUser.id,
            name: acceptedUser.name,
            status: 'Online',
            online: true,
            avatar: acceptedUser.avatar
          }]);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to accept friend request');
      }
    } catch (err) {
      setError('Failed to accept friend request');
      console.error(err);
    }
  };
  
  // Handle rejecting friend request
  const handleRejectFriendRequest = async (requesterId) => {
    try {
      const response = await fetch('http://localhost:3050/api/users/reject-friend-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ requesterId }),
      });
      
      if (response.ok) {
        // Remove from friend requests
        setFriendRequests(friendRequests.filter(req => req.id !== requesterId));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to reject friend request');
      }
    } catch (err) {
      setError('Failed to reject friend request');
      console.error(err);
    }
  };
  
  const handleCreateRoom = () => {
    navigate('/create-room', { state: { username: userName } });
  };

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    
    navigate(`/editor/${roomId}`, { state: { username: userName } });
  };

  // Handle selecting a friend to message
  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    // Fetch messages for the selected friend
    fetchMessages(friend.id);
  };

  // Fetch messages for a selected friend
  const fetchMessages = async (friendId) => {
    try {
      const response = await fetch(`http://localhost:3050/api/messages/${friendId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
      });

      if (response.ok) {
        const messagesData = await response.json();
        setMessages(messagesData);
      } else {
        console.error('Failed to fetch messages');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`http://localhost:3050/api/messages/${selectedFriend.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ message: newMessage }),
      });

      if (response.ok) {
        const messageData = await response.json();
        setMessages([...messages, messageData]);
        setNewMessage('');
      } else {
        console.error('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };
  
  // If authentication check is still in progress, show a loading state
  if (loading && !userName) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1a1a1a] text-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-300 mx-auto"></div>
          <p className="mt-4 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/LoginPage" replace />;
  }

  // Friends are now managed by state

  return (
    <div className="flex h-screen bg-[#1a1a1a] text-gray-200">
      {/* Sidebar */}
      <div className="w-72 bg-[#212121] flex flex-col">
        {/* User Profile */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100"
              alt={userName}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h3 className="font-semibold">{userName}</h3>
              <p className="text-sm text-green-500">Online</p>
            </div>
          </div>
          <Bell className="w-5 h-5 text-gray-400" />
        </div>

        {/* Social Section Tabs */}
        <div className="p-4 border-t border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-4">
              <button 
                onClick={() => setActiveTab('friends')} 
                className={`flex items-center ${activeTab === 'friends' ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}
              >
                <Users className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">Friends</span>
              </button>
              <button 
                onClick={() => setActiveTab('users')} 
                className={`flex items-center ${activeTab === 'users' ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}
              >
                <UserPlus className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">Add</span>
              </button>
              <button 
                onClick={() => setActiveTab('requests')} 
                className={`flex items-center ${activeTab === 'requests' ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}
                style={{ position: 'relative' }}
              >
                <Bell className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">Requests</span>
                {friendRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {friendRequests.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Display based on active tab */}
          <div className="space-y-4">
            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div>
                {friends.length === 0 ? (
                  <p className="text-gray-400 text-sm">No friends yet. Add some friends to see them here.</p>
                ) : (
                  friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={friend.avatar} alt={friend.name} className="w-10 h-10 rounded-full" />
                          {friend.online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#212121]"></div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{friend.name}</h4>
                          <p className="text-sm text-gray-400">{friend.status}</p>
                        </div>
                      </div>
                      <button 
                        className="text-gray-400 hover:text-white"
                        onClick={() => handleSelectFriend(friend)}
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {/* Add Users Tab */}
            {activeTab === 'users' && (
              <div>
                {/* Search input for finding users */}
                <div className="relative mb-4">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for users..."
                    className="w-full bg-[#2a2a2a] rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => {
                      const term = e.target.value;
                      setSearchTerm(term);
                      
                      // Filter users based on search input
                      if (term.length >= 2) { // Only search if at least 2 characters are entered
                        setLoading(true);
                        // Filter users based on search term
                        setTimeout(() => {
                          const filtered = users.filter(user => 
                            user.name.toLowerCase().includes(term.toLowerCase()) || 
                            user.email.toLowerCase().includes(term.toLowerCase())
                          );
                          setFilteredUsers(filtered);
                          setLoading(false);
                        }, 300);
                      } else if (term.length === 0) {
                        // If search is cleared, show first 5 users
                        setFilteredUsers(users.slice(0, 5));
                      }
                    }}
                  />
                </div>
                
                {loading ? (
                  <p className="text-gray-400 text-sm">Searching users...</p>
                ) : searchTerm.length >= 2 && filteredUsers.length === 0 ? (
                  <p className="text-gray-400 text-sm">No users found. Try a different search term.</p>
                ) : searchTerm.length < 2 ? (
                  <p className="text-gray-400 text-xs mb-3">Type at least 2 characters to search for users</p>
                ) : (
                  <div>
                    <p className="text-gray-400 text-xs mb-3">Search for users by name or email to add them as friends</p>
                    {filteredUsers.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                          <div>
                            <h4 className="font-medium">{user.name}</h4>
                            <p className="text-sm text-gray-400">{user.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleSendFriendRequest(user.id)}
                          className="text-blue-500 hover:text-blue-400 bg-[#2a2a2a] p-2 rounded-full"
                        >
                          <UserPlus className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    {filteredUsers.length > 5 && (
                      <p className="text-gray-400 text-xs text-center mt-2">Refine your search to see more specific results</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Friend Requests Tab */}
            {activeTab === 'requests' && (
              <div>
                {loading ? (
                  <p className="text-gray-400 text-sm">Loading requests...</p>
                ) : friendRequests.length === 0 ? (
                  <p className="text-gray-400 text-sm">No friend requests.</p>
                ) : (
                  friendRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <img src={request.avatar} alt={request.name} className="w-10 h-10 rounded-full" />
                        <div>
                          <h4 className="font-medium">{request.name}</h4>
                          <p className="text-sm text-gray-400">{request.email}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleAcceptFriendRequest(request.id)}
                          className="text-green-500 hover:text-green-400 bg-[#2a2a2a] p-2 rounded-full"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleRejectFriendRequest(request.id)}
                          className="text-red-500 hover:text-red-400 bg-[#2a2a2a] p-2 rounded-full"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="bg-red-500 bg-opacity-20 text-red-500 p-2 rounded-md mt-2">
                {error}
                <button 
                  className="ml-2 text-red-400 hover:text-red-300"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {selectedFriend ? (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Chat with {selectedFriend.name}</h2>
            <div className="bg-[#212121] p-4 rounded-lg mb-4">
              <div className="h-64 overflow-y-auto">
                {messages.map((msg, index) => (
                  <div key={index} className="mb-2">
                    <span className="font-semibold">{msg.senderName}:</span> {msg.text}
                  </div>
                ))}
              </div>
              <div className="flex mt-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-[#2a2a2a] rounded-md py-2 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button 
                  onClick={handleSendMessage}
                  className="ml-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Welcome back, {userName}!</h1>
            <p className="text-gray-400 mb-8">Ready to start coding? Create or join a room below.</p>

            <div className="grid grid-cols-2 gap-6">
              {/* Create Room Card */}
              <div className="bg-[#212121] p-6 rounded-lg">
                <div className="w-12 h-12 bg-[#2a2a2a] rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <Code2 className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Create New Room</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Start a new coding session and invite your team members to collaborate.
                </p>
                <button 
                  onClick={handleCreateRoom}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors"
                >
                  Create Room
                </button>
              </div>

              {/* Join Room Card */}
              <div className="bg-[#212121] p-6 rounded-lg">
                <div className="w-12 h-12 bg-[#2a2a2a] rounded-lg flex items-center justify-center mb-4 mx-auto">
                  <LogIn className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Join Existing Room</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Enter a room code to join an existing coding session.
                </p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter room code"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-[#2a2a2a] rounded-md py-2 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button 
                    onClick={handleJoinRoom}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400"
                  >
                    <LogIn className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;