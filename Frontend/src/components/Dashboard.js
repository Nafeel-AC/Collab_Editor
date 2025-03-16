import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { Bell, Search, Plus, Code2, LogIn, MoreVertical } from 'lucide-react';

function Dashboard() {
  const location = useLocation();
  // Use the userName from the state or redirect if not present
  const username = location.state?.username;

  // Redirect to login if no username is present
  if (!username) {
    return <Navigate to="/LoginPage" replace />;
  }

  const messages = [
    { id: 1, user: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', message: 'Can you review my code?', time: '2m ago', online: true },
    { id: 2, user: 'Alex Morgan', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100', message: 'The new feature is ready', time: '1h ago', online: true },
    { id: 3, user: 'David Kim', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100', message: "Let's debug this together", time: '2h ago', online: false }
  ];

  const friends = [
    { id: 1, name: 'Emma Wilson', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', status: 'Working on React', online: true },
    { id: 2, name: 'James Lee', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', status: 'Available', online: true }
  ];

  return (
    <div className="flex h-screen bg-[#1a1a1a] text-gray-200">
      {/* Sidebar */}
      <div className="w-72 bg-[#212121] flex flex-col">
        {/* User Profile */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100"
              alt={username}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h3 className="font-semibold">{username}</h3>
              <p className="text-sm text-green-500">Online</p>
            </div>
          </div>
          <Bell className="w-5 h-5 text-gray-400" />
        </div>

        {/* Messages Section */}
        <div className="p-4">
          <h2 className="text-gray-400 text-sm font-medium mb-4">Messages</h2>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full bg-[#2a2a2a] rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-center gap-3">
                <div className="relative">
                  <img src={msg.avatar} alt={msg.user} className="w-10 h-10 rounded-full" />
                  {msg.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#212121]"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{msg.user}</h4>
                    <span className="text-xs text-gray-400">{msg.time}</span>
                  </div>
                  <p className="text-sm text-gray-400">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Friends Section */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-400 text-sm font-medium">Friends</h2>
            <button className="text-gray-400 hover:text-white">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between">
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
                <button className="text-gray-400 hover:text-white">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome back, {username}!</h1>
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
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors">
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
                  className="w-full bg-[#2a2a2a] rounded-md py-2 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400">
                  <LogIn className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;