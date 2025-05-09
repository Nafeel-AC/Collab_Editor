// main entry point for the server 
import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import { connect_DB } from "./config/db.js";
import { app } from "./app.js";
// Import only what we're using
import { initSimpleCollabSocket } from "./simpleCollab.js";

dotenv.config({
    path: "./.env",
});

// Create HTTP server
const server = http.createServer(app);

// set up the server
const PORT = process.env.PORT || 3050; // Make sure port matches frontend

// Do NOT create a Socket.IO instance here
// Just pass the server to initSimpleCollabSocket which will create its own Socket.IO instance
console.log("Initializing simple collaborative editing socket server...");
initSimpleCollabSocket(server);

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
