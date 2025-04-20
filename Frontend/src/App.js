import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import WelcomePage from './components/WelcomePage';
import LandingPage from './components/landing_page';
import LoginPage from './components/Loginpage';
import SignupPage from './components/SignupPage';
import Dashboard from './components/Dashboard';
import Support from './components/Support';
import ChatbotPage from './components/chatbot';
import CreateRoom from './components/CreateRoom';
import TaskBoard from './components/TaskBoard';

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
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route exact path="/" element={<WelcomePage />} />
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
        <Route path="/tasks" element={
          <ProtectedRoute>
            <TaskBoard />
          </ProtectedRoute>
        } />
        
        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
