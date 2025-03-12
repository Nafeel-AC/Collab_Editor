// Database connection configuration
import mongoose from "mongoose" ;
import dotenv from "dotenv" ;

// dotenv.config(); // to access the environment variables
// console.log(dotenv)

const connect_DB = async () => {
    // console.log(process.env.mongoURL);
    try {
        await mongoose.connect(process.env.mongoURL);
        // console.log("Connected to the database");
    } catch(error) {
        // throw new Error("There was an error connecting to the database" , error);
        console.log(error);
        throw new Error("There was an error connecting to the database");
        // throw new Error("There was an error connecting to the database");
    }
}

export {connect_DB};