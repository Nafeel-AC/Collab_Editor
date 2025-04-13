// main entry point for the server 
import dotenv from "dotenv" ;
import {connect_DB} from "./config/db.js";
import { app } from "./app.js";
import { router as chatRoutes } from "./routes/chat.route.js";
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from "./models/user.model.js";
import express from 'express';

dotenv.config({
    path: "./.env",
});

// set up the server
const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO instance
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store online users and their messages
const onlineUsers = new Map(); // userId -> socket
const userMessages = new Map(); // userId -> array of messages

// Add login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user in database
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if password matches
        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate access token using user's method
        const accessToken = user.createAccessToken();

        res.json({
            message: 'Login successful',
            token: accessToken,
            user: {
                _id: user._id,
                email: user.email,
                userName: user.userName
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await User.findById(decoded.userId).populate('friends');
        
        if (!user) {
            return next(new Error('User not found'));
        }

        socket.user = {
            _id: user._id,
            email: user.email,
            userName: user.userName,
            friends: user.friends.map(f => f._id.toString())
        };
        next();
    } catch (error) {
        next(new Error('Authentication failed'));
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log('User connected:', socket.user.email);

    // Add user to online users
    onlineUsers.set(userId, socket);

    // Initialize user messages if not exists
    if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
    }

    // Send user's previous messages
    const previousMessages = userMessages.get(userId);
    if (previousMessages.length > 0) {
        socket.emit('previous messages', previousMessages);
    }

    // Send online status to friends
    socket.user.friends.forEach(friendId => {
        const friendSocket = onlineUsers.get(friendId);
        if (friendSocket) {
            friendSocket.emit('friend online', {
                userId: userId,
                userName: socket.user.userName
            });
        }
    });

    // Handle private messages
    socket.on('private message', async ({ recipientId, message }) => {
        try {
            // Check if they are friends
            if (!socket.user.friends.includes(recipientId)) {
                socket.emit('error', { message: 'You can only send messages to friends' });
                return;
            }

            const messageData = {
                senderId: userId,
                senderName: socket.user.userName,
                recipientId,
                message,
                timestamp: new Date()
            };

            // Store message for both users
            userMessages.get(userId).push(messageData);
            if (!userMessages.has(recipientId)) {
                userMessages.set(recipientId, []);
            }
            userMessages.get(recipientId).push(messageData);

            // Send to recipient if online
            const recipientSocket = onlineUsers.get(recipientId);
            if (recipientSocket) {
                recipientSocket.emit('private message', messageData);
            }

            // Send back to sender
            socket.emit('private message', messageData);

        } catch (error) {
            console.error('Error sending private message:', error);
            socket.emit('error', { message: 'Error sending message' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        console.log('User disconnected:', socket.user.email);

        // Notify friends about offline status
        socket.user.friends.forEach(friendId => {
            const friendSocket = onlineUsers.get(friendId);
            if (friendSocket) {
                friendSocket.emit('friend offline', {
                    userId: userId,
                    userName: socket.user.userName
                });
            }
        });
    });
});

// Add routes for user management
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('userName email _id');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// setting up the routes
connect_DB().then(() => {
    console.log("Connected to the database");

    // starting the server
    app.use("/api/chat", chatRoutes);

    httpServer.listen(PORT , () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`http://localhost:${PORT}`);
    })
    
    app.on("error" , (error) => {
        console.log(`There was error in the server ${error}`);
    })

}).catch((error) => {
    console.log("There was an error connecting to the database" , error);
});
