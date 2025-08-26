/**
 * conditionEvaluator.js
 * Question condition evaluation module
 * 
 * This module handles the evaluation of conditions for conditional survey questions.
 * It supports various condition types and logical combinations of conditions.
 */

import * as surveyData from './surveyData.js';

// Constants for condition types
const CONDITION_TYPES = {
  ANSWERED: 'answered',
  EQUALS: 'equals',
  NOT_EQUALS: 'notEquals',
  CONTAINS: 'contains',
  GREATER_THAN: 'greaterThan',
  LESS_THAN: 'lessThan',
  TOP_RANKED: 'topRanked',
  OPTION_CHECKED: 'optionChecked' // New condition type for checkbox options
};

// Constants for logical operators
const OPERATORS = {
  AND: 'and',
  OR: 'or'
};

/**
 * Evaluate if a condition is met
 * @param {Object} condition - The condition object to evaluate
 * @returns {boolean} - Whether the condition is met
 */
function evaluateCondition(condition) {
  if (!condition || !condition.questionId || !condition.type) {
    console.error('Invalid condition object', condition);
    return false;
  }

  // Get the response for the referenced question
  const response = surveyData.getResponse(condition.questionId);
  
  // If there's no response and we're not checking "answered", condition is not met
  if (!response && condition.type !== CONDITION_TYPES.ANSWERED) {
    return false;
  }

  // Get the value from the response
  const responseValue = response ? response.value : null;

  // Evaluate based on condition type
  switch (condition.type) {
    case CONDITION_TYPES.ANSWERED:
      // Check if the question has been answered (response exists and value is not null/undefined/empty)
      return !!response && 
             responseValue !== null && 
             responseValue !== undefined && 
             (typeof responseValue !== 'string' || responseValue.trim() !== '');
      
    case CONDITION_TYPES.EQUALS:
      // Check if response value equals the condition value
      if (typeof responseValue === 'object' && responseValue.isOther) {
        // Handle "other" option in radio buttons
        return false; // Unless specifically checking for "other"
      }
      return responseValue === condition.value;
      
    case CONDITION_TYPES.NOT_EQUALS:
      // Check if response value doesn't equal the condition value
      return responseValue !== condition.value;
      
    case CONDITION_TYPES.CONTAINS:
      // Check if array response contains the condition value
      if (Array.isArray(responseValue)) {
        return responseValue.includes(condition.value);
      }
      // For checkbox questions where the value is an object with checked properties
      if (responseValue && typeof responseValue === 'object') {
        return Object.entries(responseValue)
          .some(([key, checked]) => key === condition.value && checked);
      }
      return false;
      
    case CONDITION_TYPES.GREATER_THAN:
      // Check if numeric response is greater than threshold
      if (condition.threshold === undefined || condition.threshold === null) {
        console.error('Missing threshold for greaterThan condition', condition);
        return false;
      }
      const numValue = parseFloat(responseValue);
      return !isNaN(numValue) && numValue > condition.threshold;
      
    case CONDITION_TYPES.LESS_THAN:
      // Check if numeric response is less than threshold
      if (condition.threshold === undefined || condition.threshold === null) {
        console.error('Missing threshold for lessThan condition', condition);
        return false;
      }
      const numVal = parseFloat(responseValue);
      return !isNaN(numVal) && numVal < condition.threshold;
      
    case CONDITION_TYPES.TOP_RANKED:
      // Check if an option is the top ranked in a multiValueSlider
      if (!condition.optionId || !responseValue.value) {
        return false;
      }
      
      // For multiValueSlider, find the highest positioned option
      if (typeof responseValue.value === 'object' && Object.keys(responseValue.value).length > 0) {
        // Find the option with the highest value (rightmost position)
        const positions = Object.entries(responseValue.value);
        if (positions.length === 0) return false;
        
        // Sort by position value in descending order
        positions.sort((a, b) => b[1] - a[1]);
        
        // Check if the top option matches the condition's optionId
        return positions[0][0] === condition.optionId;
      }
      return false;
      
    case CONDITION_TYPES.OPTION_CHECKED:
      // Check if a specific checkbox option is checked
      if (!condition.optionId) {
        console.error('Missing optionId for optionChecked condition', condition);
        return false;
      }
      
      // For checkbox questions
      if (responseValue && typeof responseValue === 'object') {
        // Look for the specific option being checked
        return responseValue[condition.optionId] === true;
      }
      return false;
      
    default:
      console.error('Unknown condition type:', condition.type);
      return false;
  }
}

/**
 * Evaluate if conditions for a question are met
 * @param {Object} question - The question object with conditions
 * @returns {boolean} - Whether all conditions are met
 */
export function shouldShowQuestion(question) {
  // If there are no conditions, always show the question
  if (!question.conditions || !question.conditions.rules || question.conditions.rules.length === 0) {
    return true;
  }

  const operator = question.conditions.operator || OPERATORS.AND;
  const rules = question.conditions.rules;

  // Evaluate each rule
  const results = rules.map(rule => evaluateCondition(rule));

  // Combine results based on operator
  if (operator === OPERATORS.AND) {
    // All conditions must be true
    return results.every(result => result === true);
  } else if (operator === OPERATORS.OR) {
    // At least one condition must be true
    return results.some(result => result === true);
  }

  // Default to true if something is wrong with the operator
  console.error('Unknown operator:', operator);
  return true;
}
