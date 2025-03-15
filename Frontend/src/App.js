import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './components/landing_page';
import LoginPage from './components/Loginpage';
import SignupPage from './components/SignupPage';
import Dashboard from './components/Dashboard';
import Support from './components/Support';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route exact path="/" element={<LandingPage />} />
        <Route path="/LoginPage" element={<LoginPage />} />
        <Route path="/SignupPage" element={<SignupPage />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Support" element={<Support />} />
      </Routes>
    </Router>
  );
}

export default App;
