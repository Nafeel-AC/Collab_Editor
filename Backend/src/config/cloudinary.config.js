import { v2 as cloudinary } from 'cloudinary';
import bufferToStream from '../utils/streamifyFile.js';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Get Cloudinary credentials from environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Log the credentials for debugging (remove in production)
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

/**
 * Upload an image to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary upload response
 */
export const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // Check if Cloudinary is properly configured
    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary is not properly configured. Missing credentials.');
      return reject(new Error('Cloudinary configuration error'));
    }
    
    // Check if the file buffer is valid
    if (!fileBuffer || fileBuffer.length === 0) {
      console.error('Invalid file buffer provided');
      return reject(new Error('Invalid file buffer'));
    }
    
    console.log(`Uploading file to Cloudinary (${fileBuffer.length} bytes)`);
    
    // Set default options
    const uploadOptions = {
      folder: options.folder || 'profile_pictures',
      resource_type: 'auto',
      ...options
    };

    try {
      // Upload stream to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          console.log('Cloudinary upload successful, URL:', result.secure_url);
          resolve(result);
        }
      );

      // Convert buffer to stream and pipe to uploadStream
      const stream = bufferToStream(fileBuffer);
      stream.pipe(uploadStream);
    } catch (error) {
      console.error('Error in uploadToCloudinary:', error);
      reject(error);
    }
  });
};

export default cloudinary; 