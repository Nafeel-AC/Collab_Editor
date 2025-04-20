import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Code2 } from 'lucide-react';

const CreateRoom = () => {
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the username passed from the dashboard
  const username = location.state?.username || 'Anonymous';

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');
    
    try {
      console.log("Creating room with username:", username);
      
      const response = await fetch('http://localhost:3050/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          createdBy: username,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Room creation error:", data);
        throw new Error(data.message || data.error || 'Failed to create room');
      }
      
      console.log("Room created successfully:", data);
      navigate(`/editor/${data.roomId}`, { state: { username } });
    } catch (err) {
      console.error("Room creation failed:", err);
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // If we're having issues with backend auth, we can generate a client-side room ID
  const handleCreateLocalRoom = () => {
    // Generate a random room ID
    const randomRoomId = Math.random().toString(36).substring(2, 10);
    console.log("Generated local room ID:", randomRoomId);
    navigate(`/editor/${randomRoomId}`, { state: { username } });
  };

  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    
    navigate(`/editor/${roomId}`, { state: { username } });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-blue-600 rounded-full">
            <Code2 size={32} />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-6">Collaborative Code Editor</h2>
        
        <div className="space-y-6">
          <div>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="w-full bg-blue-600 hover:bg-blue-700 transition-colors py-2 px-4 rounded-md font-medium flex items-center justify-center"
            >
              {isCreating ? (
                <span className="animate-pulse">Creating Room...</span>
              ) : (
                <span>Create New Room</span>
              )}
            </button>
          </div>
          
          <div className="flex items-center">
            <div className="flex-grow h-px bg-gray-600"></div>
            <span className="px-3 text-gray-400 text-sm">OR</span>
            <div className="flex-grow h-px bg-gray-600"></div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Join an existing room
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room ID"
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleJoinRoom}
              className="w-full bg-green-600 hover:bg-green-700 transition-colors py-2 px-4 rounded-md font-medium"
            >
              Join Room
            </button>
          </div>
          
          {error && (
            <div className="bg-red-500 bg-opacity-20 p-3 rounded-md">
              <div className="text-red-500 text-sm mb-2">
                {error}
              </div>
              <button 
                onClick={handleCreateLocalRoom}
                className="text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
              >
                Try Offline Mode
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateRoom; 