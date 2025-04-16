// main entry point for the server 
import dotenv from "dotenv";
import { connect_DB } from "./config/db.js";
import { app } from "./app.js";
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from "./models/user.model.js";
import { initializeSocket } from "./socket/socket.handler.js";
// import { socketHandler } from "./socket/socketHandler.js";

dotenv.config({
    path: "./.env",
});

// set up the server
const PORT = process.env.PORT || 3000;

// Create HTTP server
const httpServer = createServer(app);

// Use the Socket.IO handler
initializeSocket(httpServer);

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
