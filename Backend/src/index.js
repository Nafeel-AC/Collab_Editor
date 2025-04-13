import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { router } from './routes/user.route.js';
import { connectDB } from './db/index.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { verifyToken } from './middlewares/auth.middleware.js';
import Message from './models/message.model.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store online users
const onlineUsers = new Map(); // userId -> socketId

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected');

    // User authentication
    socket.on('authenticate', async (token) => {
        try {
            const user = await verifyToken(token);
            if (user) {
                const userId = user._id.toString();
                onlineUsers.set(userId, socket.id);
                console.log('User authenticated:', userId);
                socket.userId = userId;

                // Join a personal room for this user
                socket.join(userId);
            }
        } catch (error) {
            console.error('Socket authentication failed:', error);
        }
    });

    // Handle new message
    socket.on('new_message', async (data) => {
        try {
            if (!socket.userId) {
                console.error('Unauthorized message attempt');
                return;
            }

            const { recipientId, content } = data;

            // Create and save the message
            const message = new Message({
                sender: socket.userId,
                recipient: recipientId,
                content: content,
                timestamp: new Date(),
                read: false
            });

            const savedMessage = await message.save();
            console.log('Message saved:', savedMessage);

            // Emit to sender's room
            io.to(socket.userId).emit('message_update', {
                ...savedMessage.toObject(),
                isSent: true
            });

            // Emit to recipient's room if they're online
            if (onlineUsers.has(recipientId)) {
                io.to(recipientId).emit('message_update', {
                    ...savedMessage.toObject(),
                    isReceived: true
                });
            }

        } catch (error) {
            console.error('Error handling new message:', error);
            socket.emit('message_error', { error: 'Failed to send message' });
        }
    });

    // Handle read receipts
    socket.on('mark_read', async ({ messageIds }) => {
        try {
            if (!socket.userId) return;

            await Message.updateMany(
                { 
                    _id: { $in: messageIds },
                    recipient: socket.userId
                },
                { read: true }
            );

            // Notify senders that their messages were read
            const messages = await Message.find({ _id: { $in: messageIds } });
            messages.forEach(msg => {
                if (onlineUsers.has(msg.sender.toString())) {
                    io.to(msg.sender.toString()).emit('message_read', {
                        messageId: msg._id,
                        readBy: socket.userId
                    });
                }
            });
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
        }
        console.log('Client disconnected');
    });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Routes
app.use('/api/users', router);

// Connect to database
connectDB();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 