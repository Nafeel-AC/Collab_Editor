import { Server } from 'socket.io';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { Message } from '../models/message.model.js';

export const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000, // 1 minute
        pingInterval: 25000, // 25 seconds
    });

    // Middleware to authenticate socket connections
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            
            if (!token) {
                return next(new Error('Authentication error: Token not provided'));
            }

            const user = await verifyToken(token);
            if (!user) {
                return next(new Error('Authentication error: Invalid token'));
            }

            socket.user = user;
            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error'));
        }
    });

    const connectedUsers = new Map();

    io.on('connection', (socket) => {
        const userId = socket.user._id;
        console.log(`User connected: ${userId}`);
        
        // Store user connection
        connectedUsers.set(userId.toString(), socket.id);
        socket.join(userId.toString());

        // Send initial online status
        io.emit('user_status', {
            userId: userId.toString(),
            status: 'online'
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${userId}`);
            connectedUsers.delete(userId.toString());
            io.emit('user_status', {
                userId: userId.toString(),
                status: 'offline'
            });
        });

        // Handle connection errors
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            socket.emit('error', {
                message: 'Connection error occurred. Please refresh the page.'
            });
        });

        // Handle reconnection attempts
        socket.on('reconnect_attempt', () => {
            console.log(`Reconnection attempt by user: ${userId}`);
        });

        socket.on('reconnect', () => {
            console.log(`User reconnected: ${userId}`);
            connectedUsers.set(userId.toString(), socket.id);
            io.emit('user_status', {
                userId: userId.toString(),
                status: 'online'
            });
        });

        // Handle ping (keep-alive)
        socket.on('ping', () => {
            socket.emit('pong');
        });

        // Handle message typing status
        socket.on('typing', ({ recipientId }) => {
            io.to(recipientId).emit('typing', { userId: userId.toString() });
        });

        socket.on('stop_typing', ({ recipientId }) => {
            io.to(recipientId).emit('stop_typing', { userId: userId.toString() });
        });

        // Handle message read status
        socket.on('message_read', async ({ messageId }) => {
            try {
                const message = await Message.findById(messageId);
                if (message && message.recipient.toString() === userId.toString()) {
                    await message.markAsRead();
                    io.to(message.sender.toString()).emit('message_status', {
                        messageId,
                        status: 'read'
                    });
                }
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        });
    });

    // Attach io instance to app for use in routes
    return io;
}; 