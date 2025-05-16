// API configuration
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3050';

export const getApiUrl = (path = '') => {
  // Remove trailing slash from API_URL and leading slash from path if they exist
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${cleanPath}`;
};

export const getSocketUrl = () => API_URL;

export default API_URL; 