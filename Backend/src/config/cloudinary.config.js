import { v2 as cloudinary } from 'cloudinary';
import bufferToStream from '../utils/streamifyFile.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret'
});

/**
 * Upload an image to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary upload response
 */
export const uploadToCloudinary = (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    // Set default options
    const uploadOptions = {
      folder: options.folder || 'profile_pictures',
      resource_type: 'auto',
      ...options
    };

    // Upload stream to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // Convert buffer to stream and pipe to uploadStream
    const stream = bufferToStream(fileBuffer);
    stream.pipe(uploadStream);
  });
};

export default cloudinary; 