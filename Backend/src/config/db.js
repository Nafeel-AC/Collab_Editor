// Database connection configuration
import mongoose from "mongoose" ;


const connect_DB = async () => {

    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.mongoURL);
        console.log("Connected to MongoDB successfully");
        
        // Fix potential index issues
        try {
            // Get a reference to the rooms collection
            const db = mongoose.connection.db;
            const collections = await db.listCollections().toArray();
            
            if (collections.some(collection => collection.name === 'rooms')) {
                console.log("Found rooms collection, checking for problematic index");
                
                // Get collection info to check indexes
                const roomCollection = db.collection('rooms');
                const indexes = await roomCollection.indexes();
                
                // Look for problematic indexes and drop them
                for (const index of indexes) {
                    // Check for any indexes that might be causing issues (like roomKey_1)
                    if (index.name !== '_id_' && index.name.includes('roomKey')) {
                        console.log(`Found problematic index: ${index.name}, dropping it...`);
                        await roomCollection.dropIndex(index.name);
                        console.log(`Successfully dropped index: ${index.name}`);
                    }
                }
            } else {
                console.log("Rooms collection not found yet, no need to fix indexes");
            }
        } catch (indexError) {
            console.warn("Error checking/fixing indexes (non-fatal):", indexError);
        }

    } catch(error) {
        console.error("MongoDB connection error:", error);
        throw new Error("There was an error connecting to the database");
    }
}

export {connect_DB};