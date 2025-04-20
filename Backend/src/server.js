// main entry point for the server 
import http from "http";
import dotenv from "dotenv";
import { connect_DB } from "./config/db.js";
import { app } from "./app.js";
import { initSocketServer } from "./socketServer.js";

dotenv.config({
    path: "./.env",
});

// Create HTTP server
const server = http.createServer(app);

// set up the server
const PORT = process.env.PORT || 3050; // Make sure port matches frontend

// Initialize Socket.IO server
const io = initSocketServer(server);
console.log("Socket.IO server initialized");

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
