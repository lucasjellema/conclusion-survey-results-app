/**
 * app.js
 * Main application module
 * 
 * This module initializes the application and connects the authentication
 * and UI modules together. It handles the application lifecycle and
 * authentication flow.
 */

import * as auth from './auth.js';
import * as ui from './ui.js';
import * as dataService from './dataService.js';
import * as surveyWizard from './surveyWizard.js';

// Constants for application state
const APP_STATE = {
  initialized: false,
  authenticated: false
};

// Constants for event timing
const TIMING = {
  retryInterval: 1000, // ms between retries for MSAL loading
  maxRetries: 10       // maximum number of retries
};

/**
 * Initialize the application
 */
async function initializeApp() {
  // Add MSAL script to the page if not present
  await ensureMsalLoaded();

  // Initialize the authentication module
  APP_STATE.initialized = auth.initializeAuth();

  if (!APP_STATE.initialized) {
    ui.showError("Failed to initialize authentication system");
    return;
  }

  // Set up UI with auth callbacks and admin functionality
  ui.initializeUI(handleSignIn, handleSignOut, handleFetchData, handleFetchUserData, handleSaveUserData, handleFetchDeltaList, handleViewDeltaFile);
  
  // Initialize the survey wizard
  initializeSurveyWizard();

  // Check for authentication event
  // Add MSAL login success listener, broadcast from auth.js
  window.addEventListener('msalLoginSuccess', async (event) => {
    console.log('MSAL Login Success Event:', event.detail);
    // Update UI or perform actions after successful login
    const { account } = event.detail.payload;
    if (account) {
      console.log(`User ${account.username} logged in successfully`);
      console.log("Successful authentication response received");
      await updateUserState();
    }
  })
  
  //   // Check if user is already signed in
  await checkExistingAuth();
  // }
}


/**
 * Ensure MSAL script is loaded before proceeding
 */
async function ensureMsalLoaded() {
  // Check if MSAL is already available
  if (window.msal) {
    return;
  }

  return new Promise((resolve) => {
    // Create script tag for MSAL
    const msalScript = document.createElement('script');
    msalScript.src = "https://alcdn.msauth.net/browser/2.30.0/js/msal-browser.min.js";
    msalScript.async = true;
    msalScript.defer = true;

    // Handle script load event
    msalScript.onload = () => {
      console.log("MSAL.js loaded successfully");
      resolve();
    };

    // Handle script error
    msalScript.onerror = () => {
      console.error("Failed to load MSAL.js");
      ui.showError("Failed to load authentication library");
      resolve(); // Resolve anyway to allow error handling
    };

    // Add the script to the document head
    document.head.appendChild(msalScript);
  });
}

/**
 * Check if user is already authenticated
 */
async function checkExistingAuth() {
  const account = auth.getAccount();
  if (account) {
    console.log("Found existing account", account.username);
    await updateUserState();
  } else {
    // No account found, show unauthenticated state
    APP_STATE.authenticated = false;
    ui.showUnauthenticatedState();
  }
}

/**
 * Update the user state and UI based on authentication
 */
/**
 * Show or hide admin section based on user claims
 * @param {Object} idTokenClaims - The user's ID token claims
 */
function updateAdminAccess(idTokenClaims) {
  // Constants for admin roles checking
  const ADMIN_ROLES = {
    admin: 'admin',
    superAdmin: 'superadmin'
  };

  // Default is to hide admin section
  let showAdminSection = false;

  if (idTokenClaims) {
    // Check if user has roles claim and if they have admin role
    // Note: Adjust based on your token structure - roles might be in groups, roles, or other claims
    if (idTokenClaims.roles && Array.isArray(idTokenClaims.roles)) {
      // Check for admin role in roles array
      showAdminSection = idTokenClaims.roles.some(role =>
        role.toLowerCase() === ADMIN_ROLES.admin ||
        role.toLowerCase() === ADMIN_ROLES.superAdmin
      );
    }

    // For demo purposes, we'll show admin section to all authenticated users
    // In production, you would strictly enforce role-based access
    showAdminSection = true;
  }

  // Update UI to show/hide admin section
  ui.toggleAdminSection(showAdminSection);
}

async function updateUserState() {
  try {
    // Get user details from Microsoft Graph API
    const userDetails = await auth.getUserDetails();

    if (userDetails) {
      APP_STATE.authenticated = true;

      // Get ID token claims for display
      const idTokenClaims = auth.getIdTokenClaims();

      // Update UI with user details and token claims
      ui.showAuthenticatedUser(userDetails, idTokenClaims);

      // Update admin section visibility based on user claims
      updateAdminAccess(idTokenClaims);
    } else {
      APP_STATE.authenticated = false;
      ui.showUnauthenticatedState();
    }
  } catch (error) {
    console.error("Error updating user state:", error);
    APP_STATE.authenticated = false;
    ui.showUnauthenticatedState();
  }
}

/**
 * Handle sign-in button click
 */
function handleSignIn() {
  if (!APP_STATE.initialized) {
    ui.showError("Authentication system not initialized");
    return;
  }

  try {
    auth.signIn();
  } catch (error) {
    console.error("Sign in error:", error);
    ui.showError("Failed to sign in");
  }
}

/**
 * Handle sign-out button click
 */
function handleSignOut() {
  if (!APP_STATE.initialized) {
    return;
  }

  try {
    auth.signOut();
    APP_STATE.authenticated = false;
    ui.showUnauthenticatedState();
  } catch (error) {
    console.error("Sign out error:", error);
    ui.showError("Failed to sign out");
  }
}

/**
 * Handle fetch data button click
 */
async function handleFetchData() {
  if (!APP_STATE.authenticated) {
    ui.showDataError("You must be authenticated to fetch data");
    return;
  }

  try {
    // Get data from the API
    const data = await dataService.getData();

    // Display the data in the UI
    ui.displayData(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    ui.showDataError(error.message || "Failed to fetch data");
  }
}

/**
 * Handle fetch user data button click
 */
async function handleFetchUserData() {
  if (!APP_STATE.authenticated) {
    ui.showDataError("You must be authenticated to fetch user data");
    return;
  }

  try {
    // Get user data from the API
    const userdata = await dataService.getUserData();

    // Display the user data in the UI
    ui.displayUserData(userdata);
  } catch (error) {
    console.error("Error fetching user data:", error);
    ui.showDataError(error.message || "Failed to fetch user data");
  }
}

/**
 * Handle save user data button click
 * Saves the current content of the user data textarea to the API
 */
async function handleSaveUserData() {
  // Constants for DOM elements
  const USER_DATA_ELEMENTS = {
    userDataTextarea: document.getElementById('api-user-data')
  };

  if (!APP_STATE.authenticated) {
    ui.showDataError("You must be authenticated to save user data");
    return;
  }

  try {
    // Get current content from the textarea
    const userDataText = USER_DATA_ELEMENTS.userDataTextarea.value;

    // Parse the JSON content
    let userData;
    try {
      userData = JSON.parse(userDataText);
    } catch (parseError) {
      throw new Error("Invalid JSON data. Please ensure data is in correct format.");
    }

    // Save data to the API
    await dataService.saveUserData(userData);

    // Show success message
    ui.showDataStatus("User data saved successfully", "success");
  } catch (error) {
    console.error("Error saving user data:", error);
    ui.showDataError(error.message || "Failed to save user data");
  }
}


/**
 * Handle fetch delta list button click (admin function)
 */
async function handleFetchDeltaList() {
  if (!APP_STATE.authenticated) {
    ui.showDeltaError("You must be authenticated to access admin functions");
    return;
  }

  try {
    // Get delta file list from API
    const fileList = await dataService.getDeltaListAsAdmin();

    // Display the file list in the UI
    ui.displayDeltaFilesList(fileList, handleViewDeltaFile);

    if (fileList.length === 0) {
      ui.showDeltaStatus("No delta files found", "success");
    } else {
      ui.showDeltaStatus(`Found ${fileList.length} delta files`, "success");
    }
  } catch (error) {
    console.error("Error fetching delta file list:", error);
    ui.showDeltaError(error.message || "Failed to fetch delta file list");
  }
}

/**
 * Handle viewing a delta file when clicked in the list
 * @param {string} filePath - Path of the delta file to view
 */
async function handleViewDeltaFile(filePath) {
  if (!APP_STATE.authenticated) {
    ui.showDeltaError("You must be authenticated to access admin functions");
    return;
  }

  try {
    // Extract file name for display
    const fileName = filePath.split('/').pop() || filePath;

    // Fetch the delta file content
    const fileData = await dataService.getDeltaFileData(filePath);

    // Display the file content in the UI
    ui.displayDeltaFileContent(fileData, fileName);
  } catch (error) {
    console.error(`Error fetching delta file ${filePath}:`, error);
    ui.showDeltaError(error.message || "Failed to fetch delta file content");
  }
}

/**
 * Initialize the survey wizard
 */
async function initializeSurveyWizard() {
  try {
    // Initialize the survey wizard
    const initialized = await surveyWizard.initSurveyWizard();
    
    if (!initialized) {
      console.error('Failed to initialize survey wizard');
      return;
    }
    
    console.log('Survey wizard initialized successfully');
    
    // Expose setupSurveyButton to global scope for UI.js to use
    window.setupSurveyButton = setupSurveyButton;
    
    // Set up survey button click handler
    setupSurveyButton();
    
  } catch (error) {
    console.error('Error initializing survey wizard:', error);
  }
}

/**
 * Set up the survey button and its click handler
 */
function setupSurveyButton() {
  // Get existing button or create a new one
  let surveyButton = document.getElementById('start-survey-button');
  
  if (!surveyButton) {
    // Create the survey button
    surveyButton = document.createElement('button');
    surveyButton.id = 'start-survey-button';
    surveyButton.className = 'action-button survey-button';
    surveyButton.textContent = 'Show Survey Results';
    
    // Add to button container instead of welcome message
    // This ensures it won't be removed when welcome message is updated
    const buttonContainer = document.querySelector('.button-container');
    if (buttonContainer) {
      buttonContainer.appendChild(surveyButton);
    }
  }
  
  // Add click event listener
  surveyButton.addEventListener('click', handleShowSurveyResults);
  
  // Make the button visible
  surveyButton.style.display = 'inline-block';
}

function handleShowSurveyResults() {
  // Check if user is authenticated
  if (APP_STATE.authenticated) {
    // hide description
    const descriptionElement = document.getElementById('survey-description');
    if (descriptionElement) {
      descriptionElement.style.display = 'none';
    }
    // find anchor with id resultsLink and perform its navigation
    const resultsLink = document.getElementById('resultsLink');
    if (resultsLink) {
      resultsLink.click();
    }
  } else {
    // Prompt user to sign in first
    alert('Please sign in to view the survey results');
  }
}

/**
 * Show the survey to the user
 */
function showSurvey() {
  // Hide other content sections
  const dataSection = document.getElementById('data-section');
  const adminSection = document.getElementById('admin-section');
  const buttonContainer = document.querySelector('.button-container');
  
  if (dataSection) dataSection.style.display = 'none';
  if (adminSection) adminSection.style.display = 'none';
  if (buttonContainer) buttonContainer.style.display = 'none'; // Hide the button container
  
  // Show the survey wizard
  surveyWizard.showSurveyWizard();
}

// Initialize the application when the document is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
