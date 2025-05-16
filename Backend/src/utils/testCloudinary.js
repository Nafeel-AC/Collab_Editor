// Utility to test Cloudinary credentials
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Get Cloudinary credentials from environment variables
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

// Test the configuration
const testConfiguration = async () => {
  try {
    // Try to get account info as a simple API test
    const result = await cloudinary.api.ping();
    console.log('Cloudinary ping successful:', result);
    console.log('✅ Cloudinary credentials are valid!');
    return true;
  } catch (error) {
    console.error('❌ Cloudinary configuration test failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('API key')) {
      console.error('The API key appears to be invalid. Please check your CLOUDINARY_API_KEY environment variable.');
    } else if (error.message.includes('API secret')) {
      console.error('The API secret appears to be invalid. Please check your CLOUDINARY_API_SECRET environment variable.');
    } else if (error.message.includes('cloud name')) {
      console.error('The cloud name appears to be invalid. Please check your CLOUDINARY_CLOUD_NAME environment variable.');
    }
    
    return false;
  }
};

// Run the test
testConfiguration()
  .then(isValid => {
    if (!isValid) {
      console.error('Please fix the Cloudinary configuration in your .env file and try again.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error during test:', error);
    process.exit(1);
  });

// Export for use in other files if needed
export default testConfiguration; 