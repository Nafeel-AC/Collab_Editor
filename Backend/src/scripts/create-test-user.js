// Script to create a test user for development
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

async function createTestUser() {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    
    if (existingUser) {
      console.log('Test user already exists with ID:', existingUser._id);
      return existingUser._id;
    }
    
    // Create a new test user
    const testUser = new User({
      userName: 'TestUser',
      email: 'test@example.com',
      password: 'password123',
      friends: [],
      friendRequests: [],
      sentFriendRequests: []
    });
    
    await testUser.save();
    console.log('Test user created with ID:', testUser._id);
    return testUser._id;
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    // Close the MongoDB connection
    mongoose.connection.close();
  }
}

// Execute the function
createTestUser();
