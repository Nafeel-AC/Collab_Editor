// main entry point for the server 
import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { connect_DB } from "./config/db.js";
import { app } from "./app.js";
// Import both socket initializers
import { initSimpleCollabSocket } from "./simpleCollab.js";
import { initSocketServer } from "./socketServer.js";
import { v2 as cloudinary } from 'cloudinary';

dotenv.config({
    path: "./.env",
});

// Create HTTP server
const server = http.createServer(app);

// set up the server
const PORT = process.env.PORT || 3050; // Make sure port matches frontend

// Create a single Socket.IO instance that both modules will use
console.log("Initializing Socket.IO server...");
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:3000", 
            "http://127.0.0.1:3000", 
            "http://localhost:5173",
            "https://codesync-lake.vercel.app",
            "https://collabeditior-production-51a9.up.railway.app",
            process.env.FRONTEND_URL || "https://collab-editor-frontend.vercel.app" // Add your Vercel frontend URL here
        ],
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
    },
    transports: ['polling', 'websocket'], // Try polling first to handle potential WebSocket issues
    maxHttpBufferSize: 1e8, // 100 MB max for large code files
    pingTimeout: 60000, // Increase ping timeout
    pingInterval: 25000, // Check connection every 25 seconds
});

// Initialize both socket servers with the same io instance
console.log("Initializing simple collaborative editing socket server...");
initSimpleCollabSocket(server, io);

console.log("Initializing main socket server for messaging...");
initSocketServer(io);

// Before starting the server, after other initialization code
// Test Cloudinary configuration
const testCloudinaryConfig = async () => {
  try {
    // Get environment variables
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    // Log the credentials
    console.log('Cloudinary Configuration:');
    console.log('- Cloud Name:', cloudName || 'Not set');
    console.log('- API Key:', apiKey ? '***' + apiKey.slice(-4) : 'Not set');
    console.log('- API Secret:', apiSecret ? '******' : 'Not set');
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });
    
    // Test the configuration with a ping
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary configuration successful:', result.status);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary configuration error:', error.message);
    console.error('The app will start, but profile image uploads may not work.');
    return false;
  }
};

// Call the test function before starting the server
testCloudinaryConfig()
  .then(() => {
    console.log('Server initialization continues...');
  })
  .catch(error => {
    console.error('Error testing Cloudinary config:', error);
  });

// setting up the routes
connect_DB().then(() => {
    console.log("Connected to the database");

    // starting the server
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`http://localhost:${PORT}`);
        console.log(`Socket.IO server is running on ws://localhost:${PORT}`);
    });

    server.on("error", (error) => {
        console.log(`There was error in the server ${error}`);
    });

}).catch((error) => {
    console.log("There was an error connecting to the database", error);
});
