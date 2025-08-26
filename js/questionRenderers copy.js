/**
 * questionRenderers.js
 * Question rendering module
 * 
 * This module provides functions to render different types of survey questions.
 * Each question type has its own renderer that creates the appropriate HTML elements.
 */

import * as surveyData from './surveyData.js';
// Import specific functions directly from each module
import { renderLikert, renderRangeSlider, renderMatrix2D } from './questionRenderersExtended.js';
import * as questionRenderersRank from './questionRenderersRank.js';
import * as questionRenderersTags from './questionRenderersTags.js';
// Import D3.js version of multi-value slider
import { renderMultiValueSlider } from './questionRenderersMultiValueSliderD3.js';
// Import condition evaluator
import { shouldShowQuestion } from './conditionEvaluator.js';

// Constants for question types
const QUESTION_TYPES = {
  SHORT_TEXT: 'shortText',
  LONG_TEXT: 'longText',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  LIKERT: 'likert',
  RANGE_SLIDER: 'rangeSlider',
  MATRIX_2D: 'matrix2d',
  RANK_OPTIONS: 'rankOptions',
  TAGS: 'tags',
  MULTI_VALUE_SLIDER: 'multiValueSlider'
};

/**
 * Process template strings in question text
 * @param {string} text - The text to process
 * @param {Object} data - The data object with replacement values
 * @returns {string} - The processed text
 */
function processTemplate(text, data) {
  if (!text || typeof text !== 'string' || !data) {
    return text;
  }
  
  // Replace {{variable}} with values from data object
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    return data[trimmedKey] !== undefined ? data[trimmedKey] : match;
  });
}

/**
 * Create the main container for a question
 * @param {Object} question - The question object
 * @param {Object} templateData - Optional data for template processing
 * @returns {HTMLElement} - The question container element
 */
function createQuestionContainer(question, templateData) {
  const container = document.createElement('div');
  container.className = 'survey-question';
  container.id = `question-${question.id}`;
  container.dataset.questionId = question.id;
  container.dataset.questionType = question.type;
  
  // Store template data if provided
  if (templateData) {
    container.dataset.templateData = JSON.stringify(templateData);
  }
  
  // Add required marker if needed
  if (question.required) {
    container.classList.add('required');
  }
  
  return container;
}

/**
 * Create comment field for a question
 * @param {Object} question - The question object
 * @param {string} questionId - The question ID
 * @returns {HTMLElement} - The comment field element
 */
function createCommentField(question, questionId) {
  if (!question.allowComment) {
    return null;
  }
  
  const commentContainer = document.createElement('div');
  commentContainer.className = 'question-comment-container';
  
  const commentLabel = document.createElement('label');
  commentLabel.htmlFor = `comment-${questionId}`;
  commentLabel.textContent = 'Additional comments:';
  
  const commentField = document.createElement('textarea');
  commentField.id = `comment-${questionId}`;
  commentField.className = 'question-comment';
  commentField.rows = 2;
  commentField.dataset.questionId = questionId;
  
  // Load existing comment if available
  const existingResponse = surveyData.getResponse(questionId);
  if (existingResponse && existingResponse.comment) {
    commentField.value = existingResponse.comment;
  }
  
  // Add event listener to save comment
  commentField.addEventListener('blur', () => {
    const currentResponse = surveyData.getResponse(questionId);
    const value = currentResponse ? currentResponse.value : null;
    surveyData.saveResponse(questionId, value, commentField.value);
  });
  
  commentContainer.appendChild(commentLabel);
  commentContainer.appendChild(commentField);
  
  return commentContainer;
}

/**
 * Render a short text question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
function renderShortText(question) {
  const container = createQuestionContainer(question);
  
  const inputContainer = document.createElement('div');
  inputContainer.className = 'question-input-container';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'short-text-input';
  input.id = `input-${question.id}`;
  input.dataset.questionId = question.id;
  
  // Set required attribute if needed
  if (question.required) {
    input.required = true;
  }
  
  // Load existing response if available
  const existingResponse = surveyData.getResponse(question.id);
  if (existingResponse && existingResponse.value) {
    input.value = existingResponse.value;
  }
  
  // Add event listener to save response
  input.addEventListener('blur', () => {
    surveyData.saveResponse(question.id, input.value, 
      question.allowComment ? document.getElementById(`comment-${question.id}`)?.value : null);
  });
  
  inputContainer.appendChild(input);
  container.appendChild(inputContainer);
  
  // Add comment field if enabled
  const commentField = createCommentField(question, question.id);
  if (commentField) {
    container.appendChild(commentField);
  }
  
  return container;
}

/**
 * Render a long text question with rich text editing
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
function renderLongText(question) {
  const container = createQuestionContainer(question);
  
  const inputContainer = document.createElement('div');
  inputContainer.className = 'question-input-container';
  
  // Create editor container
  const editorContainer = document.createElement('div');
  editorContainer.className = 'rich-text-editor-container';
  editorContainer.id = `editor-container-${question.id}`;
  
  // Create hidden textarea to hold the HTML content for form submission
  const hiddenInput = document.createElement('textarea');
  hiddenInput.style.display = 'none';
  hiddenInput.id = `input-${question.id}`;
  hiddenInput.dataset.questionId = question.id;
  
  // Set required attribute if needed
  if (question.required) {
    hiddenInput.required = true;
  }
  
  // Create the toolbar element
  const toolbarContainer = document.createElement('div');
  toolbarContainer.id = `toolbar-${question.id}`;
  toolbarContainer.className = 'quill-toolbar';
  toolbarContainer.innerHTML = `
    <span class="ql-formats">
      <button class="ql-bold"></button>
      <button class="ql-italic"></button>
      <button class="ql-underline"></button>
      <button class="ql-strike"></button>
    </span>
    <span class="ql-formats">
      <button class="ql-list" value="ordered"></button>
      <button class="ql-list" value="bullet"></button>
      <button class="ql-indent" value="-1"></button>
      <button class="ql-indent" value="+1"></button>
    </span>
    <span class="ql-formats">
      <button class="ql-link"></button>
    </span>
  `;
  
  // Create the editor element
  const editorElement = document.createElement('div');
  editorElement.id = `editor-${question.id}`;
  editorElement.className = 'rich-text-editor';
  
  // Append toolbar and editor to container
  editorContainer.appendChild(toolbarContainer);
  editorContainer.appendChild(editorElement);
  
  inputContainer.appendChild(editorContainer);
  inputContainer.appendChild(hiddenInput);
  container.appendChild(inputContainer);
  
  // Initialize Quill editor after the element is added to DOM
  setTimeout(() => {
    // First check if the editor element exists
    const editorElement = document.querySelector(`#editor-${question.id}`);
    let quill = null;
    
    if (editorElement) {
      try {
        quill = new Quill(`#editor-${question.id}`, {
          theme: 'snow',
          modules: {
            toolbar: `#toolbar-${question.id}`
          },
          placeholder: 'Type your response here...',
          bounds: editorContainer
        });
        
        // Load existing response if available
        const existingResponse = surveyData.getResponse(question.id);
        if (existingResponse && existingResponse.value) {
          try {
            // Check if the value is HTML content
            if (typeof existingResponse.value === 'string' && 
                (existingResponse.value.includes('<p>') || 
                 existingResponse.value.includes('<ol>') || 
                 existingResponse.value.includes('<ul>') || 
                 existingResponse.value.includes('<strong>'))) {
              quill.clipboard.dangerouslyPasteHTML(existingResponse.value);
            } else {
              hiddenInput.value = existingResponse.value;
              textarea.value = existingResponse.value;
            }
          } catch (e) {
            console.error('Error loading rich text content:', e);
          }
        }
      } catch (e) {
        console.error(`Error initializing Quill editor for ${question.id}:`, e);
      }
    } else {
      console.warn(`Editor element #editor-${question.id} not found`);
    }
    
    // Only add event listener if quill was successfully initialized
    if (quill) {
      quill.on('text-change', () => {
        const htmlContent = quill.root.innerHTML;
        hiddenInput.value = htmlContent;
        // Save response
        surveyData.saveResponse(question.id, htmlContent, question.allowComment ? document.getElementById(`comment-${question.id}`)?.value : null);
      });
    }
  }, 0);
  
  // Add comment field if enabled
  const commentField = createCommentField(question, question.id);
  if (commentField) {
    container.appendChild(commentField);
  }
  
  return container;
}

/**
 * Render a radio group question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
function renderRadio(question) {
  const container = createQuestionContainer(question);
  
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'radio-options-container';
  
  // Load existing response if available
  const existingResponse = surveyData.getResponse(question.id);
  let selectedValue = existingResponse ? existingResponse.value : null;
  let otherValue = '';
  
  // Check if we have an 'other' option value from previous response
  if (existingResponse && 
      typeof existingResponse.value === 'object' && 
      existingResponse.value.isOther) {
    selectedValue = 'other';
    otherValue = existingResponse.value.otherValue || '';
  }
  
  // Variable to keep track of whether an 'other' option exists
  let hasOtherOption = false;
  
  // Create radio options
  question.options.forEach((option) => {
    const optionContainer = document.createElement('div');
    optionContainer.className = 'radio-option';
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `radio-${question.id}`;
    radio.id = `radio-${question.id}-${option.value}`;
    radio.value = option.value;
    radio.dataset.questionId = question.id;
    
    // Check if this is the 'other' option
    if (option.value === 'other' || option.isOther) {
      hasOtherOption = true;
      radio.classList.add('other-option');
      radio.dataset.isOther = 'true';
    }
    
    // Check if this option is selected
    if (selectedValue === option.value) {
      radio.checked = true;
    }
    
    // Add event listener to save response
    radio.addEventListener('change', () => {
      if (radio.checked) {
        if (radio.dataset.isOther === 'true') {
          // Show the 'other' text input
          const otherInput = document.getElementById(`other-input-${question.id}`);
          if (otherInput) {
            otherInput.style.display = 'block';
            otherInput.focus();
            
            // Save both that 'other' was selected and the current value
            const otherValue = otherInput.value;
            surveyData.saveResponse(question.id, { 
              isOther: true, 
              otherValue: otherValue 
            }, question.allowComment ? document.getElementById(`comment-${question.id}`)?.value : null);
          }
        } else {
          // Hide the 'other' text input if it exists
          const otherInput = document.getElementById(`other-input-${question.id}`);
          if (otherInput) {
            otherInput.style.display = 'none';
          }
          
          // Save normal value
          surveyData.saveResponse(question.id, radio.value,
            question.allowComment ? document.getElementById(`comment-${question.id}`)?.value : null);
        }
      }
    });
    
    const label = document.createElement('label');
    label.htmlFor = `radio-${question.id}-${option.value}`;
    label.textContent = option.label;
    
    optionContainer.appendChild(radio);
    optionContainer.appendChild(label);
    
    // If this is the 'other' option, add an input field after it
    if (option.value === 'other' || option.isOther) {
      const otherInputContainer = document.createElement('div');
      otherInputContainer.className = 'other-input-container';
      
      const otherInput = document.createElement('input');
      otherInput.type = 'text';
      otherInput.id = `other-input-${question.id}`;
      otherInput.className = 'other-text-input';
      otherInput.placeholder = 'Please specify...';
      otherInput.value = otherValue;
      
      // Only show if 'other' is selected
      otherInput.style.display = selectedValue === 'other' ? 'block' : 'none';
      
      // Add event listener to save the 'other' value
      otherInput.addEventListener('input', () => {
        const otherRadio = document.getElementById(`radio-${question.id}-other`);
        if (otherRadio && otherRadio.checked) {
          surveyData.saveResponse(question.id, { 
            isOther: true, 
            otherValue: otherInput.value 
          }, question.allowComment ? document.getElementById(`comment-${question.id}`)?.value : null);
        }
      });
      
      otherInputContainer.appendChild(otherInput);
      optionContainer.appendChild(otherInputContainer);
    }
    
    optionsContainer.appendChild(optionContainer);
  });
  
  container.appendChild(optionsContainer);
  
  // Add comment field if enabled
  const commentField = createCommentField(question, question.id);
  if (commentField) {
    container.appendChild(commentField);
  }
  
  return container;
}

/**
 * Render a checkbox question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
function renderCheckbox(question) {
  const container = createQuestionContainer(question);
  
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'checkbox-options-container';
  
  // Store the option IDs to enable tracking state
  container.dataset.options = question.options.map(option => option.value).join(',');
  
  // Load existing response if available
  let selectedValues = [];
  let otherValue = '';
  let responseObj = {};
  
  const existingResponse = surveyData.getResponse(question.id);
  
  if (existingResponse && existingResponse.value) {
    // Handle object-based response (new format)
    if (typeof existingResponse.value === 'object' && !Array.isArray(existingResponse.value)) {
      responseObj = existingResponse.value;
      // Create array of selected values for backward compatibility
      selectedValues = Object.entries(responseObj)
        .filter(([key, value]) => value === true && key !== 'other')
        .map(([key]) => key);
      
      // Extract other value if present
      if (responseObj.other && typeof responseObj.other === 'string') {
        selectedValues.push('other');
        otherValue = responseObj.other;
      }
    }
    // Handle array-based response (legacy format)
    else if (Array.isArray(existingResponse.value)) {
      selectedValues = existingResponse.value
        .filter(val => typeof val !== 'object')
        .map(val => String(val));
      
      // Extract other value if present
      const otherValueObj = existingResponse.value
        .find(val => typeof val === 'object' && val.isOther);
      
      if (otherValueObj) {
        // Mark 'other' as selected
        selectedValues.push('other');
        
        // Store the other value
        otherValue = otherValueObj.otherValue || '';
      }
      
      // Convert to new object format
      responseObj = {};
      selectedValues.forEach(value => {
        responseObj[value] = true;
      });
      if (otherValue) {
        responseObj.other = otherValue;
      }
    }
  }
  
  // Create checkbox options
  question.options.forEach((option) => {
    const optionContainer = document.createElement('div');
    optionContainer.className = 'checkbox-option';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = `checkbox-${question.id}`;
    checkbox.id = `checkbox-${question.id}-${option.value}`;
    checkbox.value = option.value;
    checkbox.dataset.questionId = question.id;
    checkbox.dataset.optionId = option.value;
    checkbox.dataset.optionLabel = option.label;
    
    // Check if this is the 'other' option
    const isOtherOption = option.value === 'other' || option.isOther;
    if (isOtherOption) {
      checkbox.classList.add('other-option');
      checkbox.dataset.isOther = 'true';
    }
    
    // Check if this option is selected
    if (responseObj[option.value] === true || (Array.isArray(selectedValues) && selectedValues.includes(option.value))) {
      checkbox.checked = true;
    }
    
    const label = document.createElement('label');
    label.htmlFor = `checkbox-${question.id}-${option.value}`;
    label.textContent = option.label;
    
    optionContainer.appendChild(checkbox);
    optionContainer.appendChild(label);
    
    // If this is the 'other' option, add an input field after it
    if (isOtherOption) {
      const otherInputContainer = document.createElement('div');
      otherInputContainer.className = 'other-input-container';
      
      const otherInput = document.createElement('input');
      otherInput.type = 'text';
      otherInput.id = `checkbox-other-input-${question.id}`;
      otherInput.className = 'other-text-input';
      otherInput.placeholder = 'Please specify';
      otherInput.value = otherValue || '';
      
      // Initially hide the other input if not checked
      if (!checkbox.checked) {
        otherInput.style.display = 'none';
      }
      
      // Add event listener for the other input
      otherInput.addEventListener('input', () => {
        const isChecked = document.getElementById(`checkbox-${question.id}-other`).checked;
        if (isChecked) {
          // Update response object
          responseObj.other = otherInput.value;
          
          // Save the response
          surveyData.saveResponse(question.id, { value: responseObj });
        }
      });
      
      otherInputContainer.appendChild(otherInput);
      optionContainer.appendChild(otherInputContainer);
    }
    
    optionsContainer.appendChild(optionContainer);
  });
  
  // Handle checkbox input change
  optionsContainer.addEventListener('change', function(e) {
    if (e.target.matches('input[type="checkbox"]')) {
      // Get all checkboxes
      const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
      
      // Build response value (object with option IDs as keys and boolean values)
      const newResponseObj = {};
      checkboxes.forEach(checkbox => {
        const optionId = checkbox.dataset.optionId;
        if (optionId) {
          newResponseObj[optionId] = checkbox.checked;
        }
      });
      
      // Handle "other" input if present and checked
      const otherCheckbox = optionsContainer.querySelector('input[type="checkbox"].other-option');
      const otherInput = optionsContainer.querySelector('input[type="text"].other-text-input');
      
      if (otherCheckbox && otherCheckbox.checked && otherInput) {
        newResponseObj.other = otherInput.value || true;
        // Show the other input
        otherInput.style.display = 'block';
        if (e.target === otherCheckbox) {
          otherInput.focus();
        }
      } else if (otherInput) {
        // Hide the other input if unchecked
        otherInput.style.display = 'none';
      }
      
      // Update the response object
      responseObj = newResponseObj;
      
      // Save the response
      surveyData.saveResponse(question.id, { value: responseObj });
      
      // Get the changed option (the one that was just clicked)
      const changedOption = e.target;
      const optionId = changedOption.dataset.optionId;
      const optionLabel = changedOption.dataset.optionLabel;
      
      if (optionId) {
        // Create and dispatch a custom event for checkbox option change
        // This event allows parent components to react to option changes
        const customEvent = new CustomEvent('checkbox-option-change', {
          bubbles: true,
          detail: {
            questionId: question.id,
            optionId: optionId,
            optionLabel: optionLabel,
            checked: changedOption.checked
          }
        });
        container.dispatchEvent(customEvent);
      }
    }
  });
  
  container.appendChild(optionsContainer);
  
  // Add comment field if enabled
  const commentField = createCommentField(question, question.id);
  if (commentField) {
    container.appendChild(commentField);
  }
  
  return container;
}

/**
 * Render a Likert scale question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
function _renderLikert(question) {
  // Use the imported renderLikert from questionRenderersExtended.js
  return renderLikert(question);
}

/**
 * Render a range slider question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
function _renderRangeSlider(question) {
  // Use the imported renderRangeSlider from questionRenderersExtended.js
  return renderRangeSlider(question);
}

/**
 * Render a 2D matrix question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
function _renderMatrix2D(question) {
  // Use the imported renderMatrix2D from questionRenderersExtended.js
  return renderMatrix2D(question);
}

/**
 * Render a question based on its type
 * @param {Object} question - The question object
 * @param {Object} templateData - Optional data for template processing
 * @returns {HTMLElement} - The rendered question element
 */
export function renderQuestion(question, templateData) {
  if (!question) return null;
  
  // Create base container with template processing if needed
  const container = createQuestionContainer(question, templateData);
  
  // Store reference to original question for event handling
  container.dataset.originalQuestionId = question.forOptionId ? 
    `${question.linkedQuestionId}-${question.forOptionId}` : question.id;
  
  // Create question input based on type
  let inputElement;
  
  switch (question.type) {
    case QUESTION_TYPES.SHORT_TEXT:
      inputElement = renderShortText(question);
      break;
    case QUESTION_TYPES.LONG_TEXT:
      inputElement = renderLongText(question);
      break;
    case QUESTION_TYPES.RADIO:
      inputElement = renderRadio(question);
      break;
    case QUESTION_TYPES.CHECKBOX:
      inputElement = renderCheckbox(question);
      break;
    case QUESTION_TYPES.LIKERT:
      // Use the directly imported renderLikert function
      inputElement = renderLikert(question);
      break;
    case QUESTION_TYPES.RANGE_SLIDER:
      // Use the directly imported renderRangeSlider function
      inputElement = renderRangeSlider(question);
      break;
    case QUESTION_TYPES.MATRIX_2D:
      // Use the directly imported renderMatrix2D function
      inputElement = renderMatrix2D(question);
      break;
    case QUESTION_TYPES.RANK_OPTIONS:
      // Access the renderRankOptions function from the imported module
      inputElement = questionRenderersRank.default.renderRankOptions(question);
      break;
    case QUESTION_TYPES.TAGS:
      // Render tags questions (select multiple tags or add custom tags)
      inputElement = questionRenderersTags.default.renderTagsQuestion(question);
      break;
    case QUESTION_TYPES.MULTI_VALUE_SLIDER:
      // Use the imported renderMultiValueSlider function
      inputElement = renderMultiValueSlider(question);
      break;
    default:
      console.error(`Unknown question type: ${question.type}`);
      return null;
  }
  
  // Add input to container
  if (inputElement) {
    container.appendChild(inputElement);
  }
  
  // Add comment field if enabled
  const commentField = createCommentField(question, question.id);
  if (commentField) {
    container.appendChild(commentField);
  }
  
  return container;
}

/**
 * Render all questions for a specific step
 * @param {Object} step - The step object
 * @param {HTMLElement} container - The container to append questions to
 */
export function renderQuestionsForStep(step, container) {
  console.log('renderQuestionsForStep called with:', { 
    stepId: step?.id,
    hasQuestions: step?.questions?.length > 0, 
    containerExists: !!container,
    containerType: container?.tagName,
    containerClasses: container?.className
  });
  
  if (!step || !step.questions || !container) {
    console.error('Invalid step or container:', { step, container });
    return;
  }
  
  console.log('Questions to render:', step.questions.length);
  
  // We don't clear the container here or add step title/description
  // because that's now handled by surveyNavigation.js
  
  // First render all standard questions (not option-specific)
  const standardQuestions = step.questions.filter(question => !question.forOptionId);
  
  // Render standard questions that should be visible initially
  standardQuestions.forEach((question, index) => {
    console.log(`Processing standard question ${index + 1}/${standardQuestions.length}:`, question.id, question.type);
    
    // Skip questions with conditions that aren't met
    if (question.conditions && !shouldShowQuestion(question)) {
      return;
    }
    
    const questionElement = renderQuestion(question);
    if (questionElement) {
      container.appendChild(questionElement);
    }
  });
  
  // Then find and render any option-specific questions that should be visible
  const optionSpecificQuestions = step.questions.filter(question => 
    question.forOptionId && question.linkedQuestionId);
  
  optionSpecificQuestions.forEach(question => {
    // Find the linked question (the checkbox question)
    const linkedQuestion = step.questions.find(q => q.id === question.linkedQuestionId);
    if (!linkedQuestion) return;
    
    // Get the response to check if the option is checked
    const linkedResponse = surveyData.getResponse(question.linkedQuestionId);
    if (!linkedResponse || !linkedResponse.value) return;
    
    // Check if the specific option is checked
    const isOptionChecked = linkedResponse.value[question.forOptionId] === true;
    
    // Only render the question if the option is checked
    if (isOptionChecked) {
      // Find the option label to use for templating
      let optionLabel = question.forOptionId; // Default to option ID if label not found
      
      // Try to find the label in the linked question's options
      if (linkedQuestion.options) {
        const option = linkedQuestion.options.find(opt => opt.value === question.forOptionId);
        if (option && option.label) {
          optionLabel = option.label;
        }
      }
      
      // Create template data with option info
      const templateData = {
        option: optionLabel
      };
      
      // Render the question with template data
      const questionElement = renderQuestion(question, templateData);
      if (questionElement) {
        // Add attributes to identify this as an option-specific question
        questionElement.dataset.forOptionId = question.forOptionId;
        questionElement.dataset.linkedQuestionId = question.linkedQuestionId;
        container.appendChild(questionElement);
      }
    }
  });
  
  // Set up listeners for conditional questions
  setupConditionalQuestionListeners(step, container);
}

/**
 * Set up listeners to handle dynamic updates of conditional questions
 * @param {Object} step - The step object containing questions
 * @param {HTMLElement} container - The container holding the questions
 */
function setupConditionalQuestionListeners(step, container) {
  if (!step || !step.questions) return;
  
  // Get questions with conditions
  const questionsWithConditions = step.questions.filter(q => q.conditions);
  // Get option-specific questions
  const optionSpecificQuestions = step.questions.filter(q => q.forOptionId && q.linkedQuestionId);
  
  if (questionsWithConditions.length === 0 && optionSpecificQuestions.length === 0) return; // No dynamic questions
  
  // Get unique question IDs that are referenced in conditions
  const dependencyIds = new Set();
  questionsWithConditions.forEach(question => {
    if (question.conditions && question.conditions.rules) {
      question.conditions.rules.forEach(rule => {
        if (rule.questionId) {
          dependencyIds.add(rule.questionId);
        }
      });
    }
  });
  
  // Add checkbox questions with option-specific follow-ups to dependencies
  optionSpecificQuestions.forEach(question => {
    if (question.linkedQuestionId) {
      dependencyIds.add(question.linkedQuestionId);
    }
  });
  
  // Add change event listeners to all form elements that might affect conditional questions
  dependencyIds.forEach(questionId => {
    // Find the elements for this question
    const questionElements = container.querySelectorAll(
      `[data-question-id="${questionId}"], #comment-${questionId}`
    );
    
    questionElements.forEach(element => {
      // Use different event depending on element type
      let eventName = 'change'; // Default for most inputs
      
      if (element.tagName === 'INPUT') {
        if (['text', 'number', 'email', 'tel', 'url'].includes(element.type)) {
          eventName = 'input'; // For text inputs, use input event for immediate feedback
        }
      } else if (element.tagName === 'TEXTAREA') {
        eventName = 'input';
      }
      
      // Debounce the event handler for input events to avoid excessive updates
      const handler = eventName === 'input' ? 
        debounce(() => refreshConditionalQuestions(step, container), 300) : 
        () => refreshConditionalQuestions(step, container);
      
      // Add the event listener
      element.addEventListener(eventName, handler);
    });
    
    // Find checkbox question container for handling option-specific questions
    const checkboxContainer = container.querySelector(`.survey-question[data-question-id="${questionId}"]`);
    if (checkboxContainer) {
      // Listen for the custom checkbox-option-change event
      checkboxContainer.addEventListener('checkbox-option-change', (event) => {
        // Find any option-specific questions for this checkbox question
        const relatedOptionQuestions = optionSpecificQuestions.filter(q => 
          q.linkedQuestionId === questionId && q.forOptionId === event.detail.optionId);
        
        if (relatedOptionQuestions.length > 0) {
          // Handle the option-specific questions
          handleOptionSpecificQuestions(
            relatedOptionQuestions, 
            event.detail, 
            step, 
            container
          );
        }
      });
    }
  });
  
  // This event bubbles up from the components to the document
  document.addEventListener('survey:response-changed', (event) => {
    console.log('Caught survey:response-changed event:', event.detail);
    if (event.detail && event.detail.questionId) {
      refreshConditionalQuestions(step, container);
    }
  });
}

/**
 * Refresh conditional questions when dependencies change
 * @param {Object} step - The step object containing questions
 * @param {HTMLElement} container - The container holding the questions
 */
function refreshConditionalQuestions(step, container) {
  if (!step || !step.questions) return;
  
  // Find the actual container for questions (accounts for background image wrapper)
  // If there's a survey-step-content wrapper inside the container, use that instead
  const actualContainer = container.querySelector('.survey-step-content') || container;
  
  // For each question with conditions, check if it should be shown or hidden
  step.questions.forEach(question => {
    if (!question.conditions) return; // Skip questions without conditions
    
    const questionId = question.id;
    const shouldShow = shouldShowQuestion(question);
    const questionElement = document.getElementById(`question-${questionId}`);
    
    if (shouldShow && !questionElement) {
      // Question should be shown but isn't - render it
      const newQuestionElement = renderQuestion(question);
      if (newQuestionElement) {
        // Find the right position to insert
        let inserted = false;
        
        // Find where this question should be in the DOM based on its order in the step.questions array
        const questionIndex = step.questions.findIndex(q => q.id === question.id);
        
        for (let i = questionIndex + 1; i < step.questions.length; i++) {
          const nextQuestion = document.getElementById(`question-${step.questions[i].id}`);
          if (nextQuestion && nextQuestion.parentElement === actualContainer) {
            actualContainer.insertBefore(newQuestionElement, nextQuestion);
            inserted = true;
            break;
          }
        }
        
        if (!inserted) {
          // If we didn't find a place to insert it, append it at the end
          actualContainer.appendChild(newQuestionElement);
        }
      }
    } else if (!shouldShow && questionElement) {
      // Question is shown but shouldn't be - remove it
      questionElement.remove();
    }
  });
}

/**
 * Handle option-specific questions when checkbox options are checked/unchecked
 * @param {Array} optionQuestions - Array of option-specific question objects
 * @param {Object} optionDetails - Details of the checkbox option that changed
 * @param {Object} step - The current step object
 * @param {HTMLElement} container - The container for questions
 */
function handleOptionSpecificQuestions(optionQuestions, optionDetails, step, container) {
  const { questionId, optionId, optionLabel, checked } = optionDetails;
  
  optionQuestions.forEach(question => {
    // Look for existing question element
    const selector = `.survey-question[data-question-id="${question.id}"][data-for-option-id="${optionId}"]`;
    const existingElement = container.querySelector(selector);
    
    if (checked && !existingElement) {
      // Option was checked and question doesn't exist yet - create it
      console.log(`Creating option-specific question for ${optionId}: ${question.title}`);
      
      // Create template data with option label
      const templateData = {
        option: optionLabel
      };
      
      // Render the question with template substitution
      const questionElement = renderQuestion(question, templateData);
      if (questionElement) {
        // Mark this as an option-specific question
        questionElement.dataset.forOptionId = optionId;
        questionElement.dataset.linkedQuestionId = questionId;
        
        // Find where to insert this question
        // Ideally after the checkbox question or other option-specific questions
        let inserted = false;
        const checkboxQuestionElement = container.querySelector(`.survey-question[data-question-id="${questionId}"]`);
        
        if (checkboxQuestionElement) {
          // First try to find the last option-specific question for this checkbox
          const existingOptionQuestions = Array.from(
            container.querySelectorAll(`.survey-question[data-linked-question-id="${questionId}"]`)
          );
          
          if (existingOptionQuestions.length > 0) {
            // Insert after the last option-specific question
            const lastOptionQuestion = existingOptionQuestions[existingOptionQuestions.length - 1];
            const nextSibling = lastOptionQuestion.nextSibling;
            
            if (nextSibling) {
              container.insertBefore(questionElement, nextSibling);
            } else {
              container.appendChild(questionElement);
            }
            inserted = true;
          } else {
            // Insert after the checkbox question itself
            const nextSibling = checkboxQuestionElement.nextSibling;
            
            if (nextSibling) {
              container.insertBefore(questionElement, nextSibling);
            } else {
              container.appendChild(questionElement);
            }
            inserted = true;
          }
        }
        
        if (!inserted) {
          // Fallback: just append to the container
          container.appendChild(questionElement);
        }
        
        // Apply a subtle entrance animation
        questionElement.style.opacity = '0';
        questionElement.style.maxHeight = '0';
        questionElement.style.overflow = 'hidden';
        questionElement.style.transition = 'opacity 0.3s ease, max-height 0.5s ease';
        
        // Trigger layout/reflow
        questionElement.offsetHeight;
        
        // Animate in
        setTimeout(() => {
          questionElement.style.opacity = '1';
          questionElement.style.maxHeight = '1000px'; // Large enough to accommodate content
        }, 10);
      }
    } else if (!checked && existingElement) {
      // Option was unchecked and question exists - remove it
      console.log(`Removing option-specific question for ${optionId}`);
      
      // Apply exit animation
      existingElement.style.opacity = '0';
      existingElement.style.maxHeight = '0';
      
      // Remove after animation completes
      setTimeout(() => {
        existingElement.remove();
      }, 300);
    }
  });
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Time to wait in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
