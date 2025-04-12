// main entry point for the server 
import dotenv from "dotenv";
import { connect_DB } from "./config/db.js";
import { app } from "./app.js";
import http from "http";
import { Server } from "socket.io";
import { socketHandler } from "./socket/socketHandler.js";

dotenv.config({
    path: "./.env",
});

// set up the server
const PORT = process.env.PORT || 3000;

// handle server for socket.io
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
        // allowedHeaders: ["Content-Type", "Authorization"],
    }
})

// Use the Socket.IO handler for the server
socketHandler(io);

// setting up the routes
connect_DB().then(() => {
    console.log("Connected to the database");

    // starting the server
    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`http://localhost:${PORT}`);
    })

    app.on("error", (error) => {
        console.log(`There was error in the server ${error}`);
    })

}).catch((error) => {
    console.log("There was an error connecting to the database", error);
})
