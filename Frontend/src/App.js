import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './components/landing_page';
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

// Protected route component - checks for authentication
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();
  
  if (!token) {
    // Redirect to login if not authenticated, but save the location they were trying to go to
    return <Navigate to="/LoginPage" state={{ from: location }} replace />;
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

  return (
    <Router>
      <CustomAlert />
      <Routes>
        {/* Public routes */}
        <Route exact path="/" element={<LandingPage />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/LoginPage" element={<LoginPage />} />
        <Route path="/SignupPage" element={<SignupPage />} />
        <Route path="/Support" element={<Support />} />
        <Route path="/robot-animation" element={<RobotAnimation />} />

        {/* Protected routes */}
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
        
        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
