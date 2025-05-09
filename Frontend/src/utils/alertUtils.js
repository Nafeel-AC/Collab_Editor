/**
 * Utility functions for displaying custom alerts
 * Uses the CustomAlert component which is globally mounted in App.js
 */

/**
 * Shows a custom alert with the specified type
 * @param {string} message - The message to display
 * @param {string} type - The type of alert (info, success, warning, error)
 * @param {number} duration - How long the alert should stay visible in ms (default: 3000)
 */
export const showCustomAlert = (message, type = 'info', duration = 3000) => {
  if (window.showCustomAlert) {
    return window.showCustomAlert(message, type, duration);
  } else {
    // Fallback to default alert if custom alert is not available
    console.warn('Custom alert component not initialized, falling back to default alert');
    alert(message);
  }
};

/**
 * Shows an info alert
 * @param {string} message - The message to display
 * @param {number} duration - How long the alert should stay visible in ms (default: 3000)
 */
export const showInfo = (message, duration = 3000) => {
  return showCustomAlert(message, 'info', duration);
};

/**
 * Shows a success alert
 * @param {string} message - The message to display
 * @param {number} duration - How long the alert should stay visible in ms (default: 3000)
 */
export const showSuccess = (message, duration = 3000) => {
  return showCustomAlert(message, 'success', duration);
};

/**
 * Shows a warning alert
 * @param {string} message - The message to display
 * @param {number} duration - How long the alert should stay visible in ms (default: 3000)
 */
export const showWarning = (message, duration = 3000) => {
  return showCustomAlert(message, 'warning', duration);
};

/**
 * Shows an error alert
 * @param {string} message - The message to display
 * @param {number} duration - How long the alert should stay visible in ms (default: 4000)
 */
export const showError = (message, duration = 4000) => {
  return showCustomAlert(message, 'error', duration);
};

/**
 * Shows a confirmation modal with OK and Cancel buttons
 * @param {string} message - The confirmation message
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
export const showConfirm = async (message) => {
  if (window.showCustomConfirm) {
    return await window.showCustomConfirm(message);
  } else {
    // Fallback to default confirm if custom confirm is not available
    console.warn('Custom confirm component not initialized, falling back to default confirm');
    return window.confirm(message);
  }
};

/**
 * Replacement for the global window.alert function
 * @param {string} message - The message to display
 */
export const replaceAlert = () => {
  // Store the original alert function
  const originalAlert = window.alert;
  const originalConfirm = window.confirm;
  
  // Replace global alert with our custom alert
  window.alert = (message) => {
    return showCustomAlert(message, 'info', 3000);
  };
  
  // Replace global confirm with our custom confirm
  window.confirm = (message) => {
    return showConfirm(message);
  };
  
  // Return a function to restore the original functions if needed
  return () => {
    window.alert = originalAlert;
    window.confirm = originalConfirm;
  };
};

export default {
  showCustomAlert,
  showInfo,
  showSuccess,
  showWarning,
  showError,
  showConfirm,
  replaceAlert
}; 