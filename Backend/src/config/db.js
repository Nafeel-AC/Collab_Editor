// Database connection configuration
import mongoose from "mongoose" ;


const connect_DB = async () => {

    try {
        await mongoose.connect(process.env.mongoURL);

    } catch(error) {

        console.log(error);
        throw new Error("There was an error connecting to the database");

    }
}

export {connect_DB};