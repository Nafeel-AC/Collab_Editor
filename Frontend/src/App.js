import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route exact path="/" element={<WelcomePage />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/LoginPage" element={<LoginPage />} />
        <Route path="/SignupPage" element={<SignupPage />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Support" element={<Support />} />
        <Route path="/robot-animation" element={<RobotAnimation />} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/tasks" element={<TaskBoard />} />
      </Routes>
    </Router>
  );
}

export default App;
