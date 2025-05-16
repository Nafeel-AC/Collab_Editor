import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Clear any cached navigation state
if (window.history && window.history.scrollRestoration) {
  window.history.scrollRestoration = 'manual';
}

// Clear any local storage cached routes
const cachedRoute = localStorage.getItem('lastRoute');
if (cachedRoute && (cachedRoute === '/LoginPage' || cachedRoute === '/SignupPage')) {
  localStorage.removeItem('lastRoute');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
