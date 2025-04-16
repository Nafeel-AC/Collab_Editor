import dotenv from 'dotenv';
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
// import { createServer } from 'http';
import { router as userRouter } from "./routes/user.route.js";
import { errorHandler } from './middlewares/error.middleware.js';
// import { initializeSocket } from './socket/socket.handler.js';
import { apiLimiter } from './middlewares/rateLimiter.middleware.js';

// Load environment variables
dotenv.config();

const app = express();

// set middlewares for the server
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));       // parses the incoming requests (from forms and postman) with urlencoded payloads and place it to req.body
app.use(cookieParser());

// Rate limiting
app.use('/api', apiLimiter);

// Serve static files from public directory
app.use(express.static('public'));

app.get("/", (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});

// set the routes for the server
app.use("/api/users", userRouter);

// Error handling
app.use(errorHandler);

// Create HTTP server
// const server = createServer(app);

// Initialize Socket.IO
// const io = initializeSocket(server);
// app.set('io', io);

// export { app, server };
export { app };