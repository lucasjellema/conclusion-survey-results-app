/**
 * surveyWizard.js
 * Main survey wizard module
 * 
 * This module integrates all survey components and provides the main
 * interface for the application to interact with the survey system.
 */

import * as surveyData from './surveyData.js';
import { renderQuestionsForStep } from './questionRenderers.js';
import * as surveyNavigation from './surveyNavigation.js';

// Import extended renderers for complex question types
import { renderLikert, renderRangeSlider, renderMatrix2D } from './questionRenderersExtended.js';

// Constants for element IDs
const ELEMENT_IDS = {
  surveySection: 'survey-section',
  questionsContainer: 'survey-questions-container',
  progressBar: 'survey-progress-bar'
};

// Constants for default survey
const DEFAULT_SURVEY = {
  path: 'js/data/conclusionCloudSurvey.json'
};

// Survey state
const surveyState = {
  initialized: false,
  active: false
};



/**
 * Initialize the survey wizard
 * @param {string} surveyPath - Path to the survey definition JSON
 * @returns {Promise<boolean>} - Whether initialization was successful
 */
export async function initSurveyWizard(surveyPath = DEFAULT_SURVEY.path) {
  try {
    // Try to load the survey definition
    const surveyD = await surveyData.loadSurveyDefinition(surveyPath);
    // initialize survey description
    const surveyDescription = document.getElementById('survey-description');
    if (surveyDescription) {
      surveyDescription.style.display = 'block';
      surveyDescription.textContent = surveyD.description || 'No description available for this survey.';
    } else {
      console.warn('Survey description element not found, skipping description initialization.');
    }
    
    // Get required DOM elements
    const surveySection = document.getElementById(ELEMENT_IDS.surveySection);
    const questionsContainer = document.getElementById(ELEMENT_IDS.questionsContainer);
    const progressBar = surveySection.querySelector('.survey-progress-bar');
    
    if (!surveySection || !questionsContainer) {
      console.error('Required survey DOM elements not found');
      return false;
    }
    
    // Initialize navigation with submit handler
    surveyNavigation.initNavigation(
      surveySection,
      questionsContainer,
      progressBar,
      handleSurveySubmit
    );
    
    // Register custom renderers
    extendRenderers();
    
    // Mark as initialized
    surveyState.initialized = true;
    
    return true;
  } catch (error) {
    console.error('Failed to initialize survey wizard:', error);
    return false;
  }
}

/**
 * Show the survey wizard to the user
 * @returns {boolean} - Whether showing was successful
 */
export function showSurveyWizard() {
  if (!surveyState.initialized) {
    console.error('Survey wizard not initialized');
    return false;
  }
  
  // Get survey section element
  const surveySection = document.getElementById(ELEMENT_IDS.surveySection);
  
  if (!surveySection) {
    console.error('Survey section element not found');
    return false;
  }
  
  // Show the survey section
  surveySection.style.display = 'block';
  
  // Load the current step
  surveyNavigation.loadCurrentStep();
  
  // Mark as active
  surveyState.active = true;
  
  return true;
}

/**
 * Hide the survey wizard
 */
export function hideSurveyWizard() {
  const surveySection = document.getElementById(ELEMENT_IDS.surveySection);
  
  if (surveySection) {
    surveySection.style.display = 'none';
  }
  
  // Mark as inactive
  surveyState.active = false;
}

/**
 * Check if the survey wizard is currently visible
 * @returns {boolean} - Whether the wizard is visible
 */
export function isSurveyVisible() {
  return surveyState.active;
}

/**
 * Extend the question renderers with complex question types
 */
function extendRenderers() {
  // This function would normally register the extended renderers with the base renderer,
  // but we're importing them directly to keep the module structure simpler
}

/**
 * Handle survey submission
 * @param {Object} result - The submission result
 */
function handleSurveySubmit(result) {
  console.log('Survey submitted with result:', result);
  
  // Show success message
  const questionsContainer = document.getElementById(ELEMENT_IDS.questionsContainer);
  if (questionsContainer) {
    // Clear the container
    questionsContainer.innerHTML = '';
    
    // Create success message
    const successContainer = document.createElement('div');
    successContainer.className = 'survey-submit-success';
    
    const heading = document.createElement('h2');
    heading.textContent = 'Thank You!';
    
    const message = document.createElement('p');
    message.textContent = 'Your survey responses have been successfully submitted.';
    
    // Display submission details if available
    if (result && result.submittedData) {
      const submissionDetails = document.createElement('div');
      submissionDetails.className = 'submission-details';
      
      const detailsHeading = document.createElement('h3');
      detailsHeading.textContent = 'Submission Details';
      submissionDetails.appendChild(detailsHeading);
      
      // Show survey title and timestamp
      const surveyTitle = document.createElement('p');
      surveyTitle.innerHTML = `<strong>Survey:</strong> ${result.submittedData.surveyTitle || 'Cloud Survey'}`;
      submissionDetails.appendChild(surveyTitle);
      
      const timestamp = document.createElement('p');
      timestamp.innerHTML = `<strong>Submitted:</strong> ${new Date(result.submittedData.completedAt).toLocaleString()}`;
      submissionDetails.appendChild(timestamp);
      
      // Add collapsible responses section
      const responsesToggle = document.createElement('details');
      const responsesToggleSummary = document.createElement('summary');
      responsesToggleSummary.textContent = 'View Your Responses';
      responsesToggle.appendChild(responsesToggleSummary);
      
      // Format responses as a list
      const responsesList = document.createElement('ul');
      responsesList.className = 'responses-list';
      
      if (result.submittedData.responses) {
        Object.entries(result.submittedData.responses).forEach(([questionId, response]) => {
          const responseItem = document.createElement('li');
          responseItem.className = 'response-item';
          
          // Try to find the question title from the survey definition
          let questionTitle = questionId;
          try {
            // Use the imported surveyData module instead of accessing it through window
            const allSteps = surveyData.getAllSteps();
            if (allSteps) {
              for (const step of allSteps) {
                for (const question of step.questions || []) {
                  if (question.id === questionId) {
                    questionTitle = question.title;
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.error('Error finding question title:', e);
          }
          
          // Format the response value based on its type
          let responseValue = 'No response';
          if (response.value !== undefined && response.value !== null) {
            if (typeof response.value === 'object') {
              responseValue = JSON.stringify(response.value);
            } else {
              responseValue = String(response.value);
            }
          }
          
          responseItem.innerHTML = `<strong>${questionTitle}:</strong> <span class="response-value">${responseValue}</span>`;
          
          // Add comment if present
          if (response.comment) {
            const commentElem = document.createElement('div');
            commentElem.className = 'response-comment';
            commentElem.innerHTML = `<em>Comment:</em> ${response.comment}`;
            responseItem.appendChild(commentElem);
          }
          
          responsesList.appendChild(responseItem);
        });
      }
      
      responsesToggle.appendChild(responsesList);
      submissionDetails.appendChild(responsesToggle);
      successContainer.appendChild(submissionDetails);
    }
    
    successContainer.appendChild(heading);
    successContainer.appendChild(message);
    
    // Add a return button
    const returnButton = document.createElement('button');
    returnButton.textContent = 'Return to Home';
    returnButton.className = 'survey-nav-button';
    returnButton.addEventListener('click', () => {
      hideSurveyWizard();
    });
    
    successContainer.appendChild(returnButton);
    questionsContainer.appendChild(successContainer);
  }
}

/**
 * Reset the survey to its initial state
 */
export function resetSurvey() {
  if (!surveyState.initialized) {
    return;
  }
  
  // Clear responses
  surveyData.clearResponses();
  
  // Reload the first step
  surveyNavigation.loadCurrentStep();
}
