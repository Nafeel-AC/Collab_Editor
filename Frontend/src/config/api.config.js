// API Configuration
export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://collabeditor-production-51a9.up.railway.app';

// For local development, uncomment the line below and comment the line above
// const API_BASE_URL = 'http://localhost:3050';

// Define a function to format image URLs, ensuring compatibility with Cloudinary
export const getImageUrl = (imageId) => {
  // If it's already a full URL (starts with http or https), return it as is
  if (imageId && (imageId.startsWith('http://') || imageId.startsWith('https://'))) {
    return imageId;
  }
  
  // If it's a Cloudinary URL without http/https prefix, add it
  if (imageId && imageId.includes('cloudinary.com') && !imageId.startsWith('http')) {
    return `https://${imageId}`;
  }
  
  // For regular API-hosted images
  if (imageId) {
    return `${API_BASE_URL}${imageId.startsWith('/') ? '' : '/'}${imageId}`;
  }
  
  // Return default image if no imageId provided
  return `https://ui-avatars.com/api/?name=U&background=random&color=fff&bold=true`;
}; 