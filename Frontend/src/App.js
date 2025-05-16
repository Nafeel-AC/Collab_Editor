import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LandingPage from './components/landing_page';
import WelcomePage from './components/WelcomePage';
import LoginPage from './components/Loginpage';
import SignupPage from './components/SignupPage';
import Dashboard from './components/Dashboard';
import Support from './components/Support';
import ChatbotPage from './components/chatbot';
import CreateRoom from './components/CreateRoom';
import TaskBoard from './components/TaskBoard';
import ProfilePage from './components/ProfilePage';
import EditorPage from './components/EditorPage';
import ProjectsPage from './components/ProjectsPage';
import CustomAlert from './components/ui/CustomAlert';
import { replaceAlert } from './utils/alertUtils';

import RobotAnimation from './components/RobotAnimation';
import './App.css';

// Location tracker component for debugging
const LocationTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    console.log('Current app location:', location.pathname);
    // Save the current route to localStorage to help with debugging
    localStorage.setItem('lastRoute', location.pathname);
  }, [location]);
  
  return null;
};

// Initial route handler to ensure welcome page is shown to non-logged in users
const InitialRouteHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Only redirect on the initial app load and if the user isn't logged in
    if (location.pathname === '/' && !localStorage.getItem('token')) {
      console.log('Initial route - directing to welcome page');
      navigate('/welcome', { replace: true });
    }
  }, [location, navigate]);
  
  return null;
};

// Protected route component - checks for authentication
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();
  
  if (!token) {
    // Redirect to welcome page if not authenticated, but save the location they were trying to go to
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }
  
  return children;
};

// Authentication check for routes after login
const AuthRedirect = ({ children }) => {
  const token = localStorage.getItem('token');
  
  // If user is logged in, redirect to the dashboard 
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  // Replace default alert with custom alert
  useEffect(() => {
    // Replace the default alert function
    const restoreAlert = replaceAlert();
    
    // Restore the original alert function when the component unmounts
    return () => {
      restoreAlert();
    };
  }, []);

  // Make sure to remove any cached hash state when the app loads
  useEffect(() => {
    if (window.location.hash) {
      window.location.hash = '';
    }
  }, []);

  return (
    <Router>
      <CustomAlert />
      <LocationTracker />
      <InitialRouteHandler />
      <Routes>
        {/* Public routes - only accessible when NOT logged in */}
        <Route path="/" element={
          <AuthRedirect>
            <WelcomePage />
          </AuthRedirect>
        } />
        <Route path="/welcome" element={
          <AuthRedirect>
            <WelcomePage />
          </AuthRedirect>
        } />
        <Route path="/LoginPage" element={
          <AuthRedirect>
            <LoginPage />
          </AuthRedirect>
        } />
        <Route path="/SignupPage" element={
          <AuthRedirect>
            <SignupPage />
          </AuthRedirect>
        } />
        
        {/* Shared public routes - accessible regardless of login status */}
        <Route path="/Support" element={<Support />} />
        <Route path="/robot-animation" element={<RobotAnimation />} />

        {/* Protected routes - only accessible when logged in */}
        <Route path="/home" element={
          <ProtectedRoute>
            <LandingPage />
          </ProtectedRoute>
        } />
        <Route path="/Dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/ProfilePage" element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/chatbot" element={
          <ProtectedRoute>
            <ChatbotPage />
          </ProtectedRoute>
        } />
        <Route path="/create-room" element={
          <ProtectedRoute>
            <CreateRoom />
          </ProtectedRoute>
        } />
        <Route path="/editor/:roomId" element={
          <ProtectedRoute>
            <EditorPage />
          </ProtectedRoute>
        } />
        <Route path="/tasks" element={
          <ProtectedRoute>
            <TaskBoard />
          </ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        } />
        
        {/* Catch all route - redirect to welcome or dashboard based on auth status */}
        <Route path="*" element={
          localStorage.getItem('token') 
            ? <Navigate to="/dashboard" replace /> 
            : <Navigate to="/welcome" replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;
