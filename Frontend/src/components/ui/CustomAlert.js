import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Check, AlertTriangle, XCircle, X } from 'lucide-react';

// Types of alerts: info, success, warning, error
const ALERT_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

// Alert icons based on type
const AlertIcon = ({ type }) => {
  switch (type) {
    case ALERT_TYPES.SUCCESS:
      return <Check className="h-6 w-6 shrink-0 stroke-current" />;
    case ALERT_TYPES.WARNING:
      return <AlertTriangle className="h-6 w-6 shrink-0 stroke-current" />;
    case ALERT_TYPES.ERROR:
      return <XCircle className="h-6 w-6 shrink-0 stroke-current" />;
    case ALERT_TYPES.INFO:
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="h-6 w-6 shrink-0 stroke-current">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      );
  }
};

// Global alert state and functions
const alerts = [];
let showAlertFunction;
let confirmCallback = null;
let confirmModalState = { isOpen: false, message: '' };
let setConfirmModalState = null;

// Confirmation Modal Component
const ConfirmModal = () => {
  const [state, setState] = useState({ isOpen: false, message: '' });
  
  // Initialize the state setter
  useEffect(() => {
    setConfirmModalState = setState;
    
    // Cleanup
    return () => {
      setConfirmModalState = null;
    };
  }, []);
  
  const handleConfirm = () => {
    if (confirmCallback) {
      confirmCallback(true);
      confirmCallback = null;
    }
    setState({ isOpen: false, message: '' });
  };
  
  const handleCancel = () => {
    if (confirmCallback) {
      confirmCallback(false);
      confirmCallback = null;
    }
    setState({ isOpen: false, message: '' });
  };
  
  return (
    <AnimatePresence>
      {state.isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#0F0F13] border border-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 card-glow relative"
          >
            <div className="flex items-start mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-400 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Confirmation</h3>
                <p className="mt-2 text-gray-300">{state.message}</p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-md transition-colors"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// CustomAlert component
const CustomAlert = () => {
  const [visibleAlerts, setVisibleAlerts] = useState([]);
  
  // Initialize showAlert function
  useEffect(() => {
    // Function to show an alert
    showAlertFunction = (message, type = ALERT_TYPES.INFO, duration = 3000) => {
      const id = Date.now();
      const newAlert = { id, message, type, duration };
      
      // Add alert to the stack
      alerts.push(newAlert);
      setVisibleAlerts([...alerts]);
      
      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          removeAlert(id);
        }, duration);
      }
      
      return id;
    };
    
    // Add to window object for global access
    window.showCustomAlert = showAlertFunction;
    
    // Function to show confirmation dialog
    window.showCustomConfirm = (message) => {
      return new Promise((resolve) => {
        // Store the callback to be called when user confirms or cancels
        confirmCallback = resolve;
        
        // Show the confirmation modal
        if (setConfirmModalState) {
          setConfirmModalState({ isOpen: true, message });
        } else {
          // Fallback to native confirm if modal not available
          resolve(window.confirm(message));
        }
      });
    };
    
    // Cleanup function
    return () => {
      delete window.showCustomAlert;
      delete window.showCustomConfirm;
    };
  }, []);
  
  // Function to remove an alert
  const removeAlert = (id) => {
    const index = alerts.findIndex(alert => alert.id === id);
    if (index !== -1) {
      alerts.splice(index, 1);
      setVisibleAlerts([...alerts]);
    }
  };
  
  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        <AnimatePresence>
          {visibleAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`alert alert-${alert.type} shadow-lg backdrop-blur-sm card-glow`}
              role="alert"
            >
              <div className="flex justify-between w-full items-center">
                <div className="flex items-center">
                  <AlertIcon type={alert.type} />
                  <span className="text-sm md:text-base">{alert.message}</span>
                </div>
                <button 
                  onClick={() => removeAlert(alert.id)}
                  className="ml-2 p-1 rounded-full hover:bg-[#2A2A3A]/50"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <ConfirmModal />
    </>
  );
};

// Export component and helper functions
export { CustomAlert, ALERT_TYPES };

// Helper function to show different types of alerts
export const showAlert = {
  info: (message, duration) => showAlertFunction(message, ALERT_TYPES.INFO, duration),
  success: (message, duration) => showAlertFunction(message, ALERT_TYPES.SUCCESS, duration),
  warning: (message, duration) => showAlertFunction(message, ALERT_TYPES.WARNING, duration),
  error: (message, duration) => showAlertFunction(message, ALERT_TYPES.ERROR, duration),
};

export default CustomAlert; 