// main entry point for the server 
import dotenv from "dotenv";
import { connect_DB } from "./config/db.js";
import { app } from "./app.js";
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from "./models/user.model.js";
import { socketHandler } from "./socket/socketHandler.js";

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
        methods: ["GET", "POST"],
        credentials: true
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

// Use the Socket.IO handler
socketHandler(io);

// setting up the routes
connect_DB().then(() => {
    console.log("Connected to the database");

    // starting the server
    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`http://localhost:${PORT}`);
    });

    app.on("error", (error) => {
        console.log(`There was error in the server ${error}`);
    });

}).catch((error) => {
    console.log("There was an error connecting to the database", error);
});
