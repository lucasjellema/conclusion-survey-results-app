/**
 * surveyData.js
 * Survey data management module
 * 
 * This module handles loading, storing, and managing survey data.
 * It provides functions to load survey definitions, save/retrieve user responses,
 * and track survey progress.
 */

import * as dataService from './dataService.js';
import * as auth from './auth.js';

// Constants for local storage keys
const STORAGE_KEYS = {
  currentStep: 'survey_current_step',
  responses: 'survey_responses'
};

// Survey state object
const surveyState = {
  definition: null,      // The full survey definition object
  currentStepIndex: 0,   // Current step index (0-based)
  responses: {},         // User responses to questions
  isLoaded: false        // Whether survey data is loaded
};

/**
 * Load a survey definition from a URL or path
 * @param {string} surveyPath - Path to the survey definition JSON
 * @returns {Promise<Object>} - The survey definition object
 */
export async function loadSurveyDefinition(surveyPath) {
  try {
    // Fetch the survey definition from the specified path
    const response = await fetch(surveyPath);
    
    if (!response.ok) {
      throw new Error(`Failed to load survey definition: ${response.status} ${response.statusText}`);
    }
    
    const surveyData = await response.json();
    
    // Store the survey definition in the state
    surveyState.definition = surveyData;
    surveyState.isLoaded = true;
    
    // Try to restore any saved progress
    restoreProgress();
    
    return surveyData;
  } catch (error) {
    console.error('Error loading survey definition:', error);
    throw error;
  }
}

/**
 * Get the current survey definition
 * @returns {Object|null} - The current survey definition or null if not loaded
 */
export function getSurveyDefinition() {
  return surveyState.definition;
}

/**
 * Check if a survey is currently loaded
 * @returns {boolean} - Whether a survey is loaded
 */
export function isSurveyLoaded() {
  return surveyState.isLoaded;
}

/**
 * Get all steps in the current survey
 * @returns {Array|null} - Array of step objects or null if no survey is loaded
 */
export function getAllSteps() {
  return surveyState.isLoaded ? surveyState.definition.steps : null;
}

/**
 * Get a specific step by index
 * @param {number} index - The step index (0-based)
 * @returns {Object|null} - The step object or null if not found
 */
export function getStepByIndex(index) {
  if (!surveyState.isLoaded || !surveyState.definition.steps) {
    return null;
  }
  
  if (index < 0 || index >= surveyState.definition.steps.length) {
    return null;
  }
  
  return surveyState.definition.steps[index];
}

/**
 * Get a specific step by ID
 * @param {string} stepId - The step ID
 * @returns {Object|null} - The step object or null if not found
 */
export function getStepById(stepId) {
  if (!surveyState.isLoaded || !surveyState.definition.steps) {
    return null;
  }
  
  return surveyState.definition.steps.find(step => step.id === stepId) || null;
}

/**
 * Get the current step
 * @returns {Object|null} - The current step object or null if no survey is loaded
 */
export function getCurrentStep() {
  return getStepByIndex(surveyState.currentStepIndex);
}

/**
 * Get the current step index
 * @returns {number} - The current step index (0-based)
 */
export function getCurrentStepIndex() {
  return surveyState.currentStepIndex;
}

/**
 * Move to a specific step by index
 * @param {number} index - The step index to move to (0-based)
 * @returns {boolean} - Whether the navigation was successful
 */
export function goToStep(index) {
  if (!surveyState.isLoaded || 
      index < 0 || 
      index >= surveyState.definition.steps.length) {
    return false;
  }
  
  surveyState.currentStepIndex = index;
  saveProgress();
  return true;
}

/**
 * Move to the next step
 * @returns {boolean} - Whether the navigation was successful
 */
export function nextStep() {
  return goToStep(surveyState.currentStepIndex + 1);
}

/**
 * Move to the previous step
 * @returns {boolean} - Whether the navigation was successful
 */
export function prevStep() {
  return goToStep(surveyState.currentStepIndex - 1);
}

/**
 * Check if there is a next step available
 * @returns {boolean} - Whether there is a next step
 */
export function hasNextStep() {
  if (!surveyState.isLoaded) {
    return false;
  }
  
  return surveyState.currentStepIndex < (surveyState.definition.steps.length - 1);
}

/**
 * Check if there is a previous step available
 * @returns {boolean} - Whether there is a previous step
 */
export function hasPrevStep() {
  if (!surveyState.isLoaded) {
    return false;
  }
  
  return surveyState.currentStepIndex > 0;
}

/**
 * Check if a step has been visited.
 * A step is considered visited if its index is less than or equal to the current step index.
 * @param {number} index - The index of the step to check.
 * @returns {boolean} - True if the step has been visited, false otherwise.
 */
export function hasVisitedStep(index) {
  return index <= surveyState.currentStepIndex;
}

/**
 * Validate if all required questions on a given step are answered.
 * @param {string} stepId - The ID of the step to validate.
 * @returns {boolean} - True if all required questions are answered, false otherwise.
 */
export function areAllRequiredQuestionsAnswered(stepId) {
  const step = getStepById(stepId);
  if (!step || !step.questions) {
    return true;
  }

  const requiredQuestions = step.questions.filter(q => q.required);
  for (const question of requiredQuestions) {
    const response = getResponse(question.id);
    if (!response || response.value === undefined || response.value === null ||
        (Array.isArray(response.value) && response.value.length === 0) ||
        (typeof response.value === 'string' && response.value.trim() === '')) {
      return false;
    }
  }
  return true;
}

/**
 * Save a response to a question
 * @param {string} questionId - The question ID
 * @param {any} value - The response value
 * @param {string} [comment] - Optional comment for the question
 * @returns {boolean} - Whether the save was successful
 */
export function saveResponse(questionId, value, comment = null) {
  if (!surveyState.isLoaded) {
    return false;
  }
  
  // Create response object
  surveyState.responses[questionId] = {
    value,
    timestamp: new Date().toISOString()
  };
  
  // Add comment if provided
  if (comment !== null && comment.trim() !== '') {
    surveyState.responses[questionId].comment = comment;
  }
  
  // Save progress to local storage
  saveProgress();
  
  return true;
}

/**
 * Get a response for a specific question
 * @param {string} questionId - The question ID
 * @returns {Object|null} - The response object or null if not found
 */
export function getResponse(questionId) {
  return surveyState.responses[questionId] || null;
}

/**
 * Get all responses
 * @returns {Object} - All response objects
 */
export function getAllResponses() {
  return { ...surveyState.responses };
}

/**
 * Save survey progress to local storage
 */
function saveProgress() {
  try {
    // Save current step
    localStorage.setItem(STORAGE_KEYS.currentStep, surveyState.currentStepIndex.toString());
    
    // Save responses
    localStorage.setItem(STORAGE_KEYS.responses, JSON.stringify(surveyState.responses));
  } catch (error) {
    console.error('Error saving survey progress:', error);
  }
}

/**
 * Restore survey progress from local storage
 */
function restoreProgress() {
  try {
    // Restore current step
    const savedStep = localStorage.getItem(STORAGE_KEYS.currentStep);
    if (savedStep !== null) {
      const stepIndex = parseInt(savedStep, 10);
      if (!isNaN(stepIndex) && stepIndex >= 0 && 
          surveyState.definition && 
          stepIndex < surveyState.definition.steps.length) {
        surveyState.currentStepIndex = stepIndex;
      }
    }
    
    // Restore responses
    const savedResponses = localStorage.getItem(STORAGE_KEYS.responses);
    if (savedResponses !== null) {
      surveyState.responses = JSON.parse(savedResponses);
    }
  } catch (error) {
    console.error('Error restoring survey progress:', error);
  }
}

/**
 * Clear all survey responses and reset progress
 */
export function clearResponses() {
  surveyState.responses = {};
  surveyState.currentStepIndex = 0;
  saveProgress();
}

/**
 * Submit survey responses to the server
 * @returns {Promise<Object>} - Server response
 */
export async function submitSurvey() {
  if (!surveyState.isLoaded || Object.keys(surveyState.responses).length === 0) {
    throw new Error('No survey responses to submit');
  }
  
  try {
    // Get username from token if available
    const idTokenClaims = auth.getIdTokenClaims();
    const username = idTokenClaims ? 
      (idTokenClaims.preferred_username || idTokenClaims.email || idTokenClaims.name || 'unknown') : 
      'unknown';
    
    // Prepare submission data
    const submissionData = {
      surveyId: surveyState.definition.id || 'unknown',
      surveyTitle: surveyState.definition.title,
      completedAt: new Date().toISOString(),
      responses: surveyState.responses,
      username: username // Include username from token
    };
    
    // Use the dataService to save the survey data
    const result = await dataService.saveUserData(submissionData);
    
    return result;
  } catch (error) {
    console.error('Error submitting survey:', error);
    throw error;
  }
}
