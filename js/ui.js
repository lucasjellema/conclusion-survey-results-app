/**
 * ui.js
 * UI management module
 * 
 * This module handles all UI updates related to authentication status
 * It provides functions to update the UI based on the authentication state
 */

// Constants for DOM elements
const DOM_ELEMENTS = {
  welcomeMessage: document.getElementById('welcome-message'),
  signInButton: document.getElementById('signin-button'),
  signOutButton: document.getElementById('signout-button'),
  tokenSection: document.getElementById('token-section'),
  tokenToggle: document.getElementById('toggle-token'),
  tokenContent: document.getElementById('token-content'),
  tokenData: document.getElementById('token-data'),
  dataSection: document.getElementById('data-section'),
  userDataSection: document.getElementById('userdata-section'),
  fetchUserDataButton: document.getElementById('fetch-user-data'),
  saveUserDataButton: document.getElementById('save-user-data'),
  fetchDataButton: document.getElementById('fetch-data'),
  dataContent: document.getElementById('data-content'),
  userDataContent: document.getElementById('userdata-content'),
  apiData: document.getElementById('api-data'),
  apiUserData: document.getElementById('api-user-data'),
  dataStatus: document.getElementById('data-status'),
  userDataStatus: document.getElementById('user-data-status'),
  // Admin section elements
  adminSection: document.getElementById('admin-section'),
  fetchDeltaListButton: document.getElementById('fetch-delta-list'),
  deltaListContainer: document.getElementById('delta-list-container'),
  deltaFilesList: document.getElementById('delta-files-list'),
  deltaFileContentContainer: document.getElementById('delta-file-content-container'),
  deltaFileContent: document.getElementById('delta-file-content'),
  deltaFileStatus: document.getElementById('delta-file-status')
};

// CSS classes for styling different states
const UI_CLASSES = {
  authenticated: 'authenticated',
  unauthenticated: 'unauthenticated',
  loading: 'loading',
  error: 'error',
  success: 'success'
};

/**
 * Initialize the UI elements
 * @param {Function} signInCallback - Function to call when sign-in button is clicked
 * @param {Function} signOutCallback - Function to call when sign-out button is clicked
 * @param {Function} fetchDataCallback - Function to call when fetch data button is clicked
 * @param {Function} fetchUserDataCallback - Function to call when fetch user data button is clicked
 * @param {Function} saveUserDataCallback - Function to call when save user data button is clicked
 * @param {Function} fetchDeltaListCallback - Function to call when fetch delta list button is clicked
 * @param {Function} viewDeltaFileCallback - Function to call when a delta file is clicked
 */
export function initializeUI(signInCallback, signOutCallback, fetchDataCallback, fetchUserDataCallback, saveUserDataCallback, fetchDeltaListCallback, viewDeltaFileCallback) {
  // Check if DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setupEventListeners(signInCallback, signOutCallback, fetchDataCallback, fetchUserDataCallback, saveUserDataCallback, fetchDeltaListCallback, viewDeltaFileCallback));
  } else {
    setupEventListeners(signInCallback, signOutCallback, fetchDataCallback, fetchUserDataCallback, saveUserDataCallback, fetchDeltaListCallback, viewDeltaFileCallback);
  }
}

/**
 * Set up event listeners for buttons
 * @param {Function} signInCallback - Function to call when sign-in button is clicked
 * @param {Function} signOutCallback - Function to call when sign-out button is clicked
 * @param {Function} fetchDataCallback - Function to call when fetch data button is clicked
 * @param {Function} fetchUserDataCallback - Function to call when fetch user data button is clicked
 * @param {Function} saveUserDataCallback - Function to call when save user data button is clicked
 * @param {Function} fetchDeltaListCallback - Function to call when fetch delta list button is clicked
 * @param {Function} viewDeltaFileCallback - Function to call when a delta file is clicked
 */
function setupEventListeners(signInCallback, signOutCallback, fetchDataCallback, fetchUserDataCallback, saveUserDataCallback, fetchDeltaListCallback, viewDeltaFileCallback) {
  // Re-assign DOM elements to ensure they're available
  const elements = {
    welcomeMessage: document.getElementById('welcome-message'),
    signInButton: document.getElementById('signin-button'),
    signOutButton: document.getElementById('signout-button'),
    tokenSection: document.getElementById('token-section'),
    tokenToggle: document.getElementById('toggle-token'),
    tokenContent: document.getElementById('token-content'),
    tokenData: document.getElementById('token-data'),
    dataSection: document.getElementById('data-section'),
    fetchDataButton: document.getElementById('fetch-data'),
    dataContent: document.getElementById('data-content'),
    apiData: document.getElementById('api-data'),
    dataStatus: document.getElementById('data-status'),
    userDataSection: document.getElementById('userdata-section'),
    fetchUserDataButton: document.getElementById('fetch-user-data'),
    saveUserDataButton: document.getElementById('save-user-data'),
    userDataContent: document.getElementById('userdata-content'),
    apiUserData: document.getElementById('api-user-data'),
    userDataStatus: document.getElementById('user-data-status'),
    // Admin section elements
    adminSection: document.getElementById('admin-section'),
    fetchDeltaListButton: document.getElementById('fetch-delta-list'),
    deltaListContainer: document.getElementById('delta-list-container'),
    deltaFilesList: document.getElementById('delta-files-list'),
    deltaFileContentContainer: document.getElementById('delta-file-content-container'),
    deltaFileContent: document.getElementById('delta-file-content'),
    deltaFileStatus: document.getElementById('delta-file-status')
  };
  
  // Set up sign in button
  if (elements.signInButton) {
    elements.signInButton.addEventListener('click', (event) => {
      event.preventDefault();
      if (typeof signInCallback === 'function') {
        signInCallback();
      }
    });
  }
  
  // Set up sign out button
  if (elements.signOutButton) {
    elements.signOutButton.addEventListener('click', (event) => {
      event.preventDefault();
      if (typeof signOutCallback === 'function') {
        signOutCallback();
      }
    });
  }
  
  // Set up token toggle button
  if (elements.tokenToggle) {
    elements.tokenToggle.addEventListener('click', () => {
      const isExpanded = elements.tokenToggle.getAttribute('aria-expanded') === 'true';
      toggleTokenVisibility(!isExpanded);
    });
  }
  
  // Set up fetch data button
  if (elements.fetchDataButton && typeof fetchDataCallback === 'function') {
    elements.fetchDataButton.addEventListener('click', () => {
      // Show loading status
      showDataStatus('Loading data...', UI_CLASSES.loading);
      
      // Call the fetch data callback
      fetchDataCallback();
    });
  }
  // Set up fetch user data button
  if (elements.fetchUserDataButton && typeof fetchUserDataCallback === 'function') {
    elements.fetchUserDataButton.addEventListener('click', () => {
      // Show loading status
      showDataStatus('Loading user data...', UI_CLASSES.loading);
      
      // Call the fetch user data callback
      fetchUserDataCallback();
    });
  }
  
  // Set up save user data button
  if (elements.saveUserDataButton && typeof saveUserDataCallback === 'function') {
    elements.saveUserDataButton.addEventListener('click', () => {
      // Show saving status
      showDataStatus('Saving user data...', UI_CLASSES.loading);
      
      // Call the save user data callback
      saveUserDataCallback();
    });
  }
  
  // Set up fetch delta list button (admin)
  if (elements.fetchDeltaListButton && typeof fetchDeltaListCallback === 'function') {
    elements.fetchDeltaListButton.addEventListener('click', () => {
      showDeltaStatus('Fetching delta files...', UI_CLASSES.loading);
      fetchDeltaListCallback();
    });
  }
}

/**
 * Update UI to show authenticated user with user information
 * @param {Object} user - The user object containing profile information
 * @param {Object|null} tokenClaims - The parsed ID token claims
 */
export function showAuthenticatedUser(user, tokenClaims) {
  const elements = {
    welcomeMessage: document.getElementById('welcome-message'),
    signInButton: document.getElementById('signin-button'),
    signOutButton: document.getElementById('signout-button'),
    tokenSection: document.getElementById('token-section'),
    tokenData: document.getElementById('token-data'),
    dataSection: document.getElementById('data-section')
  };
  
  // Update welcome message with user's name
  if (elements.welcomeMessage) {
    const displayName = user.displayName || user.name || 'Authenticated User';
    elements.welcomeMessage.innerHTML = `
      <p>Welcome, <strong>${displayName}</strong>!</p>
    `;
  }
  
  // Update button visibility
  if (elements.signInButton) {
    elements.signInButton.style.display = 'none';
  }
  
  if (elements.signOutButton) {
    elements.signOutButton.style.display = 'inline-block';
  }
  
  // Show token section and update token data
  if (elements.tokenSection) {
    elements.tokenSection.style.display = 'block';
    
    // Update token data if available
    if (elements.tokenData && tokenClaims) {
      elements.tokenData.value = JSON.stringify(tokenClaims, null, 2);
    }
  }
  
  // Show data section
  if (elements.dataSection) {
    elements.dataSection.style.display = 'block';
  }
  
  // Handle survey section - keep it hidden initially but allow access
  const surveySection = document.getElementById('survey-section');
  const surveyButton = document.getElementById('start-survey-button');
  
  // Show the survey button if it exists
  if (surveyButton) {
    surveyButton.style.display = 'inline-block';
    surveyButton.disabled = false;
  } else {
    // If button doesn't exist yet (timing issue), call the app function to set it up
    if (window.setupSurveyButton && typeof window.setupSurveyButton === 'function') {
      window.setupSurveyButton();
    }
  }
  
  // Add authenticated class to body
  document.body.classList.add(UI_CLASSES.authenticated);
  document.body.classList.remove(UI_CLASSES.unauthenticated);
}

/**
 * Update UI to show unauthenticated state
 */
/**
 * Display a list of delta files in the admin section
 * @param {string[]} fileList - Array of delta file paths
 * @param {Function} viewDeltaFileCallback - Function to call when a file is clicked
 */
export function displayDeltaFilesList(fileList, viewDeltaFileCallback) {
  const elements = {
    deltaListContainer: document.getElementById('delta-list-container'),
    deltaFilesList: document.getElementById('delta-files-list')
  };
  
  if (!elements.deltaListContainer || !elements.deltaFilesList) {
    return;
  }
  
  // Clear previous list
  elements.deltaFilesList.innerHTML = '';
  
  // Show the list container
  elements.deltaListContainer.style.display = 'block';
  
  if (!fileList || fileList.length === 0) {
    elements.deltaFilesList.innerHTML = '<p>No delta files found.</p>';
    return;
  }
  
  // Create list of file links
  const fileListHtml = fileList.map(filePath => {
    // Extract just the filename part for display
    const fileName = filePath.split('/').pop();
    return `<div class="file-item"><a href="#" data-path="${filePath}">${fileName}</a></div>`;
  }).join('');
  
  elements.deltaFilesList.innerHTML = fileListHtml;
  
  // Add click event listeners to the file links
  const fileLinks = elements.deltaFilesList.querySelectorAll('a');
  fileLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const filePath = event.target.getAttribute('data-path');
      if (typeof viewDeltaFileCallback === 'function' && filePath) {
        showDeltaStatus('Loading file content...', UI_CLASSES.loading);
        viewDeltaFileCallback(filePath);
      }
    });
  });
}

/**
 * Display delta file content in the text area
 * @param {Object} fileData - The file data to display
 * @param {string} fileName - Name of the file
 */
export function displayDeltaFileContent(fileData, fileName) {
  const elements = {
    deltaFileContentContainer: document.getElementById('delta-file-content-container'),
    deltaFileContent: document.getElementById('delta-file-content')
  };
  
  if (!elements.deltaFileContentContainer || !elements.deltaFileContent) {
    return;
  }
  
  // Show the file content container
  elements.deltaFileContentContainer.style.display = 'block';
  
  // Format the data as pretty JSON
  const formattedData = JSON.stringify(fileData, null, 2);
  elements.deltaFileContent.value = formattedData;
  
  // Show success status
  showDeltaStatus(`Loaded file: ${fileName}`, UI_CLASSES.success);
}

/**
 * Show a status message for delta operations
 * @param {string} message - The status message to display
 * @param {string} [statusClass] - CSS class for styling the status
 */
export function showDeltaStatus(message, statusClass) {
  const elements = {
    deltaFileStatus: document.getElementById('delta-file-status')
  };
  
  if (elements.deltaFileStatus) {
    // Remove all status classes
    elements.deltaFileStatus.classList.remove(
      UI_CLASSES.loading, 
      UI_CLASSES.error, 
      UI_CLASSES.success
    );
    
    // Add specific status class if provided
    if (statusClass) {
      elements.deltaFileStatus.classList.add(statusClass);
    }
    
    // Set message text
    elements.deltaFileStatus.textContent = message;
  }
}

/**
 * Show error message for delta operations
 * @param {string} errorMessage - The error message to display
 */
export function showDeltaError(errorMessage) {
  showDeltaStatus(`Error: ${errorMessage}`, UI_CLASSES.error);
}

/**
 * Show or hide the admin section based on authentication status
 * @param {boolean} show - Whether to show (true) or hide (false) the admin section
 */
export function toggleAdminSection(show) {
  const adminSection = document.getElementById('admin-section');
  if (adminSection) {
    adminSection.style.display = show ? 'block' : 'none';
  }
}

export function showUnauthenticatedState() {
  const elements = {
    welcomeMessage: document.getElementById('welcome-message'),
    signInButton: document.getElementById('signin-button'),
    signOutButton: document.getElementById('signout-button'),
    tokenSection: document.getElementById('token-section')
  };
  
  // Reset welcome message
  if (elements.welcomeMessage) {
    elements.welcomeMessage.innerHTML = `
      <p>Welcome, please sign in</p>
    `;
  }
  
  // Update button visibility
  if (elements.signInButton) {
    elements.signInButton.style.display = 'inline-block';
  }
  
  if (elements.signOutButton) {
    elements.signOutButton.style.display = 'none';
  }
  
  // Hide token section and data section
  if (elements.tokenSection) {
    elements.tokenSection.style.display = 'none';
  }
  
  if (elements.dataSection) {
    elements.dataSection.style.display = 'none';
  }
  
  if (elements.userDataSection) {
    elements.userDataSection.style.display = 'none';
  }
  
  // Hide the survey section
  const surveySection = document.getElementById('survey-section');
  if (surveySection) {
    surveySection.style.display = 'none';
  }
  
  // Update survey button state if it exists
  const surveyButton = document.getElementById('start-survey-button');
  if (surveyButton) {
    surveyButton.style.display = 'inline-block'; // Still show the button
    surveyButton.disabled = false; // Enable the button, sign-in will be prompted on click
  }
  
  // Update body class
  document.body.classList.add(UI_CLASSES.unauthenticated);
  document.body.classList.remove(UI_CLASSES.authenticated);
}

/**
 * Display data in the API data textarea
 * @param {Object} data - The data to display
 */
export function displayData(data) {
  const elements = {
    apiData: document.getElementById('api-data')
  };
  
  if (elements.apiData && data) {
    // Format the data as pretty JSON
    const formattedData = JSON.stringify(data, null, 2);
    elements.apiData.value = formattedData;
    
    // Show success status
    showDataStatus('Data fetched successfully', UI_CLASSES.success);
  }
}
/**
 * Display data in the API data textarea
 * @param {Object} data - The data to display
 */
export function displayUserData(data) {
  const elements = {
    apiUserData: document.getElementById('api-user-data')
  };
  
  if (elements.apiUserData && data) {
    // Format the data as pretty JSON
    const formattedData = JSON.stringify(data, null, 2);
    elements.apiUserData.value = formattedData;
    
    // Show success status
    showDataStatus('User Data fetched successfully', UI_CLASSES.success);
  }
}

/**
 * Show a data status message
 * @param {string} message - The status message to display
 * @param {string} [statusClass] - CSS class for styling the status
 */
export function showDataStatus(message, statusClass) {
  const elements = {
    dataStatus: document.getElementById('data-status')
  };
  
  if (elements.dataStatus) {
    // Remove all status classes
    elements.dataStatus.classList.remove(
      UI_CLASSES.loading, 
      UI_CLASSES.error, 
      UI_CLASSES.success
    );
    
    // Add specific status class if provided
    if (statusClass) {
      elements.dataStatus.classList.add(statusClass);
    }
    
    // Set message text
    elements.dataStatus.textContent = message;
  }
}

/**
 * Display an error message for data fetching
 * @param {string} errorMessage - The error message to display
 */
export function showDataError(errorMessage) {
  showDataStatus(`Error: ${errorMessage}`, UI_CLASSES.error);
}

/**
 * Show error message in the UI
 * @param {string} message - Error message to display
 */
export function showError(message) {
  const elements = {
    welcomeMessage: document.getElementById('welcome-message')
  };
  
  if (elements.welcomeMessage) {
    elements.welcomeMessage.innerHTML = `
      <p class="error-message">Error: ${message}</p>
      <p>Please try again or contact support if the issue persists.</p>
    `;
  }
}

/**
 * Toggle the visibility of the token content section
 * @param {boolean} show - Whether to show or hide the token content
 */
export function toggleTokenVisibility(show) {
  const elements = {
    tokenToggle: document.getElementById('toggle-token'),
    tokenContent: document.getElementById('token-content')
  };
  
  if (elements.tokenToggle && elements.tokenContent) {
    if (show) {
      elements.tokenContent.style.display = 'block';
      elements.tokenToggle.setAttribute('aria-expanded', 'true');
      elements.tokenToggle.textContent = 'Hide Token';
    } else {
      elements.tokenContent.style.display = 'none';
      elements.tokenToggle.setAttribute('aria-expanded', 'false');
      elements.tokenToggle.textContent = 'Show Token';
    }
  }
}
