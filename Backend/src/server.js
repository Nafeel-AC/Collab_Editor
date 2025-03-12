// main entry point for the server 
// import express from "express" ;
import dotenv from "dotenv" ;
import {connect_DB} from "./config/db.js";
import { app } from "./app.js";

dotenv.config({
    path: "./.env",
});

// set up the server
const PORT = process.env.PORT || 3000;

// setting up the routes
connect_DB().then(() => {
    console.log("Connected to the database");

    // starting the server
    app.listen(PORT , () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`http://localhost:${PORT}`);
    })
    
    app.on("error" , (error) => {
        console.log(`There was error in the server ${error}`);
    })

}).catch((error) => {
    console.log("There was an error connecting to the database" , error);
})
