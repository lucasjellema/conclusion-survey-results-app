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
import { renderRadar } from './questionRenderersRadar.js';
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
  MULTI_VALUE_SLIDER: 'multiValueSlider',
  RADAR: 'radar'
};

/**
 * Create the main container for a question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The question container element
 */
function createQuestionContainer(question) {
  const container = document.createElement('div');
  container.className = 'survey-question';
  container.id = `question-${question.id}`;
  container.dataset.questionId = question.id;
  container.dataset.questionType = question.type;
  
  // Add required marker if needed
  if (question.required) {
    container.classList.add('required');
  }
  
  // Create question title
  const title = document.createElement('h3');
  title.className = 'question-title';
  title.textContent = question.title;
  if (question.required) {
    const requiredMarker = document.createElement('span');
    requiredMarker.className = 'required-marker';
    requiredMarker.textContent = ' ';
    title.appendChild(requiredMarker);
  }
  container.appendChild(title);
  
  // Create question description if provided
  if (question.description) {
    const description = document.createElement('p');
    description.className = 'question-description';
    description.textContent = question.description;
    container.appendChild(description);
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
  
  // Load existing response if available
  const existingResponse = surveyData.getResponse(question.id);
  let selectedValues = existingResponse ? existingResponse.value || [] : [];
  let otherValue = '';
  
  // Process the response to extract any 'other' value
  if (Array.isArray(selectedValues)) {
    // Check if there's an 'other' object in the array
    const otherValueObj = selectedValues.find(val => 
      typeof val === 'object' && val.isOther
    );
    
    if (otherValueObj) {
      // Remove the other object from the array
      selectedValues = selectedValues.filter(val => 
        !(typeof val === 'object' && val.isOther)
      );
      
      // Add 'other' to the selected values to check the box
      selectedValues.push('other');
      
      // Store the other value
      otherValue = otherValueObj.otherValue || '';
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
    
    // Check if this is the 'other' option
    const isOtherOption = option.value === 'other' || option.isOther;
    if (isOtherOption) {
      checkbox.classList.add('other-option');
      checkbox.dataset.isOther = 'true';
    }
    
    // Check if this option is selected
    if (Array.isArray(selectedValues) && selectedValues.includes(option.value)) {
      checkbox.checked = true;
    }
    
    // Add event listener to save response
    checkbox.addEventListener('change', () => {
      // Get reference to the other input if it exists
      const otherInput = document.getElementById(`checkbox-other-input-${question.id}`);
      
      // Get all selected checkboxes
      const checkedBoxes = Array.from(
        document.querySelectorAll(`input[name="checkbox-${question.id}"]:checked`)
      ).filter(input => input.dataset.isOther !== 'true')  // Filter out 'other' option
       .map(input => input.value); // Get their values
      
      // Check if the 'other' option is checked
      const otherCheckbox = document.getElementById(`checkbox-${question.id}-other`);
      let finalValues = [...checkedBoxes]; // Create a copy
      
      if (otherCheckbox && otherCheckbox.checked && otherInput) {
        // Show the other input
        otherInput.style.display = 'block';
        otherInput.focus();
        
        // Add the other value to the response
        finalValues.push({
          isOther: true,
          otherValue: otherInput.value
        });
      } else if (otherInput) {
        // Hide the other input if unchecked
        otherInput.style.display = 'none';
      }
      
      // Save the final values
      surveyData.saveResponse(question.id, finalValues,
        question.allowComment ? document.getElementById(`comment-${question.id}`)?.value : null);
    });
    
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
      otherInput.placeholder = 'Please specify...';
      otherInput.value = otherValue;
      
      // Only show if 'other' is checked
      otherInput.style.display = checkbox.checked ? 'block' : 'none';
      
      // Add event listener to save the 'other' value on input change
      otherInput.addEventListener('input', () => {
        // Get all checked values except 'other'
        const checkedBoxes = Array.from(
          document.querySelectorAll(`input[name="checkbox-${question.id}"]:checked`)
        ).filter(input => input.dataset.isOther !== 'true')
         .map(input => input.value);
        
        // Add the other value object
        if (checkbox.checked) {
          checkedBoxes.push({
            isOther: true,
            otherValue: otherInput.value
          });
        }
        
        // Save the updated values
        surveyData.saveResponse(question.id, checkedBoxes,
          question.allowComment ? document.getElementById(`comment-${question.id}`)?.value : null);
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
 * @returns {HTMLElement} - The rendered question element
 */
export function renderQuestion(question) {
  switch (question.type) {
    case QUESTION_TYPES.SHORT_TEXT:
      return renderShortText(question);
    case QUESTION_TYPES.LONG_TEXT:
      return renderLongText(question);
    case QUESTION_TYPES.RADIO:
      return renderRadio(question);
    case QUESTION_TYPES.CHECKBOX:
      return renderCheckbox(question);
    case QUESTION_TYPES.LIKERT:
      // Use the directly imported renderLikert function
      return renderLikert(question);
    case QUESTION_TYPES.RANGE_SLIDER:
      // Use the directly imported renderRangeSlider function
      return renderRangeSlider(question);
    case QUESTION_TYPES.MATRIX_2D:
      // Use the directly imported renderMatrix2D function
      return renderMatrix2D(question);
    case QUESTION_TYPES.RANK_OPTIONS:
      // Access the renderRankOptions function from the imported module
      return questionRenderersRank.default.renderRankOptions(question);
    case QUESTION_TYPES.TAGS:
      // Render tags questions (select multiple tags or add custom tags)
      return questionRenderersTags.default.renderTagsQuestion(question);
    case QUESTION_TYPES.MULTI_VALUE_SLIDER:
      // Use the imported renderMultiValueSlider function
      return renderMultiValueSlider(question);
    case QUESTION_TYPES.RADAR:
      // Use the imported renderRadar function
      return renderRadar(question);
    default:
      console.error(`Unknown question type: ${question.type}`);
      return null;
  }
}

/**
 * Render all questions for a specific step
 * @param {Object} step - The step object
 * @param {HTMLElement} container - The container to append questions to
 */
export function renderQuestionsForStep(step, container) {
  if (!step || !step.questions || !Array.isArray(step.questions)) {
    console.error('Invalid step object provided');
    return;
  }
  
  // Clear the container
  container.innerHTML = '';
  
  // Add step title and description
  const stepTitle = document.createElement('h2');
  stepTitle.className = 'step-title';
  stepTitle.textContent = step.title;
  container.appendChild(stepTitle);
  
  if (step.description) {
    const stepDescription = document.createElement('p');
    stepDescription.className = 'step-description';
    stepDescription.textContent = step.description;
    container.appendChild(stepDescription);
  }
  
  // Create questions container
  const questionsContainer = document.createElement('div');
  questionsContainer.className = 'questions-container';
  
  // Render each question (if conditions are met)
  step.questions.forEach(question => {
    // Check if question should be shown based on conditions
    if (shouldShowQuestion(question)) {
      const questionElement = renderQuestion(question);
      if (questionElement) {
        questionsContainer.appendChild(questionElement);
      }
    }
  });
  
  // Store questions that have conditions for dynamic updates
  setupConditionalQuestionListeners(step, questionsContainer);
  
  container.appendChild(questionsContainer);
}

/**
 * Set up listeners to handle dynamic updates of conditional questions
 * @param {Object} step - The step object containing questions
 * @param {HTMLElement} container - The container holding the questions
 */
function setupConditionalQuestionListeners(step, container) {
  if (!step || !step.questions) return;
  
  // Find questions that have conditions and the questions they depend on
  const conditionalQuestions = step.questions.filter(q => q.conditions && q.conditions.rules);
  if (conditionalQuestions.length === 0) return; // No conditional questions in this step
  
  // Create a map of dependent questions (questions whose answers might affect other questions)
  const dependentQuestionIds = new Set();
  conditionalQuestions.forEach(question => {
    question.conditions.rules.forEach(rule => {
      dependentQuestionIds.add(rule.questionId);
    });
  });
  
  // Add change event listeners to all form elements of dependent questions
  dependentQuestionIds.forEach(questionId => {
    // Find all form elements for this question
    const formElements = document.querySelectorAll(`[data-question-id="${questionId}"]`);
    
    formElements.forEach(element => {
      // Add event listener based on element type
      if (element.tagName === 'INPUT') {
        if (element.type === 'radio' || element.type === 'checkbox') {
          element.addEventListener('change', () => refreshConditionalQuestions(step, container));
        } else {
          element.addEventListener('blur', () => refreshConditionalQuestions(step, container));
          element.addEventListener('input', debounce(() => refreshConditionalQuestions(step, container), 500));
        }
      } else if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
        element.addEventListener('change', () => refreshConditionalQuestions(step, container));
        element.addEventListener('blur', () => refreshConditionalQuestions(step, container));
      }
    });
  });
  
  // Listen for the custom response change event from complex components like multiValueSlider
  // This event bubbles up from the components to the document
  document.addEventListener('survey:response-changed', (event) => {
    console.log('Caught survey:response-changed event:', event.detail);
    
    // Check if this is a dependent question that affects conditional questions
    if (dependentQuestionIds.has(event.detail.questionId)) {
      console.log('This affects conditional questions, refreshing...');
      // Refresh the conditional questions display
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
