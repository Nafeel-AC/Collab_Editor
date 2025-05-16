// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://collabeditor-production-51a9.up.railway.app';

// For local development, uncomment the line below and comment the line above
// const API_BASE_URL = 'http://localhost:3050';

// For image URLs
const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export { API_BASE_URL, getImageUrl }; 