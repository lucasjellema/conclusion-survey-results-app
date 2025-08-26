/**
 * questionRenderersTags.js
 * Tags question type renderer module
 * 
 * This module implements the tags question type that allows users to
 * select multiple predefined tags or add custom tags
 */

import * as surveyData from './surveyData.js';

/**
 * Create the main container for a question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The question container element
 */
function createQuestionContainer(question) {
  const container = document.createElement('div');
  container.className = 'question-container';
  container.id = `question-container-${question.id}`;
  
  // Add title
  const title = document.createElement('h3');
  title.className = 'question-title';
  title.textContent = question.title;
  
  // Add required marker if needed
  if (question.required) {
    const requiredMarker = document.createElement('span');
    requiredMarker.className = 'question-required';
    requiredMarker.textContent = ' ';
    title.appendChild(requiredMarker);
  }
  container.appendChild(title);
  
  // Add description if provided
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
 * @returns {HTMLElement} - The comment field element or null if comments not allowed
 */
function createCommentField(question, questionId) {
  if (!question.allowComment) {
    return null;
  }
  
  const container = document.createElement('div');
  container.className = 'question-comment-container';
  
  const label = document.createElement('label');
  label.htmlFor = `comment-${questionId}`;
  label.textContent = 'Additional comments (optional):';
  container.appendChild(label);
  
  const textarea = document.createElement('textarea');
  textarea.className = 'question-comment';
  textarea.id = `comment-${questionId}`;
  textarea.rows = 3;
  
  // Load existing comment if available
  const existingResponse = surveyData.getResponse(questionId);
  if (existingResponse && existingResponse.comment) {
    textarea.value = existingResponse.comment;
  }
  
  // Add event listener to save comment
  textarea.addEventListener('change', () => {
    // Save response including the comment
    surveyData.saveResponse(
      questionId, 
      document.getElementById(`input-${questionId}`)?.value, 
      textarea.value
    );
  });
  
  container.appendChild(textarea);
  return container;
}

/**
 * Render a tags question where users can select multiple tags or add custom ones
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
function renderTagsQuestion(question) {
  // Create question container
  const container = createQuestionContainer(question);
  
  // Create tags container
  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'tags-container';
  tagsContainer.id = `tags-container-${question.id}`;
  container.appendChild(tagsContainer);
  
  // Create input field and selected tags container
  const tagsInputContainer = document.createElement('div');
  tagsInputContainer.className = 'tags-input-container';
  tagsContainer.appendChild(tagsInputContainer);
  
  const selectedTagsContainer = document.createElement('div');
  selectedTagsContainer.className = 'selected-tags-container';
  tagsInputContainer.appendChild(selectedTagsContainer);
  
  const tagInput = document.createElement('input');
  tagInput.type = 'text';
  tagInput.className = 'tag-input';
  tagInput.id = `tag-input-${question.id}`;
  tagInput.placeholder = question.tagOptions?.allowCustom ? 'Type to add a new tag...' : 'Type to filter tags...';
  tagsInputContainer.appendChild(tagInput);
  
  // Create hidden input for storing selected tags
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.id = `input-${question.id}`;
  hiddenInput.dataset.questionId = question.id;
  container.appendChild(hiddenInput);
  
  // Create tags suggestions container
  const tagSuggestions = document.createElement('div');
  tagSuggestions.className = 'tag-suggestions';
  tagSuggestions.id = `tag-suggestions-${question.id}`;
  tagsContainer.appendChild(tagSuggestions);
  
  // Get tag configuration
  const tagConfig = question.tagOptions || {};
  const predefinedTags = tagConfig.tags || [];
  const allowCustomTags = tagConfig.allowCustom !== false;
  const maxTags = tagConfig.maxTags || 0; // 0 means unlimited
  
  // Track selected tags
  let selectedTags = [];
  
  // Load existing response if available
  const existingResponse = surveyData.getResponse(question.id);
  if (existingResponse && existingResponse.value && Array.isArray(existingResponse.value)) {
    selectedTags = [...existingResponse.value];
  }
  
  // Function to update the UI with selected tags
  function updateSelectedTags() {
    selectedTagsContainer.innerHTML = '';
    selectedTags.forEach(tag => {
      const tagElement = document.createElement('div');
      tagElement.className = 'selected-tag';
      
      const tagText = document.createElement('span');
      tagText.textContent = tag;
      tagElement.appendChild(tagText);
      
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'tag-remove';
      removeButton.textContent = '';
      removeButton.title = 'Remove tag';
      removeButton.addEventListener('click', () => {
        selectedTags = selectedTags.filter(t => t !== tag);
        updateSelectedTags();
        updateSuggestions(tagInput.value);
        saveTagsData();
      });
      
      tagElement.appendChild(removeButton);
      selectedTagsContainer.appendChild(tagElement);
    });
    
    // Update maxTags limit UI
    if (maxTags > 0) {
      const tagCount = document.createElement('div');
      tagCount.className = 'tag-count';
      tagCount.textContent = `${selectedTags.length}/${maxTags}`;
      selectedTagsContainer.appendChild(tagCount);
      
      // Disable input if max tags reached
      tagInput.disabled = selectedTags.length >= maxTags;
    }
  }
  
  // Function to save the tags data
  function saveTagsData() {
    hiddenInput.value = JSON.stringify(selectedTags);
    surveyData.saveResponse(
      question.id, 
      selectedTags, 
      document.getElementById(`comment-${question.id}`)?.value
    );
  }
  
  // Function to update tag suggestions based on input
  function updateSuggestions(query) {
    tagSuggestions.innerHTML = '';
    
    // Filter predefined tags that match the query and aren't already selected
    const filteredTags = predefinedTags.filter(tag => {
      const tagText = typeof tag === 'object' ? tag.label || tag.value : tag;
      return tagText.toLowerCase().includes(query.toLowerCase()) && 
             !selectedTags.includes(tagText);
    });
    
    // Add the filtered suggestions
    filteredTags.forEach(tag => {
      const tagText = typeof tag === 'object' ? tag.label || tag.value : tag;
      
      const suggestion = document.createElement('div');
      suggestion.className = 'tag-suggestion';
      suggestion.textContent = tagText;
      
      suggestion.addEventListener('click', () => {
        if (maxTags > 0 && selectedTags.length >= maxTags) return;
        
        selectedTags.push(tagText);
        updateSelectedTags();
        tagInput.value = '';
        updateSuggestions('');
        saveTagsData();
        tagInput.focus();
      });
      
      tagSuggestions.appendChild(suggestion);
    });
    
    // Show create option if custom tags are allowed and input isn't empty
    if (allowCustomTags && query.trim() !== '' && 
        !selectedTags.includes(query.trim()) && 
        !(maxTags > 0 && selectedTags.length >= maxTags)) {
      
      const createTag = document.createElement('div');
      createTag.className = 'tag-suggestion tag-create';
      createTag.textContent = `Create "${query.trim()}"`;
      
      createTag.addEventListener('click', () => {
        selectedTags.push(query.trim());
        updateSelectedTags();
        tagInput.value = '';
        updateSuggestions('');
        saveTagsData();
        tagInput.focus();
      });
      
      tagSuggestions.appendChild(createTag);
    }
    
    // Show/hide suggestions container
    if (filteredTags.length > 0 || (allowCustomTags && query.trim() !== '')) {
      tagSuggestions.style.display = 'block';
    } else {
      tagSuggestions.style.display = 'none';
    }
  }
  
  // Input event handlers
  tagInput.addEventListener('input', () => {
    updateSuggestions(tagInput.value);
  });
  
  tagInput.addEventListener('keydown', (e) => {
    // Enter key to add tag
    if (e.key === 'Enter' && tagInput.value.trim() !== '') {
      e.preventDefault();
      
      // Check if max tags limit is reached
      if (maxTags > 0 && selectedTags.length >= maxTags) return;
      
      // If custom tags are allowed, add the current input value
      if (allowCustomTags) {
        const newTag = tagInput.value.trim();
        if (!selectedTags.includes(newTag)) {
          selectedTags.push(newTag);
          updateSelectedTags();
          tagInput.value = '';
          updateSuggestions('');
          saveTagsData();
        }
      } else {
        // If custom tags are not allowed, select the first suggestion
        const firstSuggestion = tagSuggestions.querySelector('.tag-suggestion');
        if (firstSuggestion) {
          firstSuggestion.click();
        }
      }
    }
    // Backspace to remove last tag when input is empty
    else if (e.key === 'Backspace' && tagInput.value === '' && selectedTags.length > 0) {
      selectedTags.pop();
      updateSelectedTags();
      updateSuggestions('');
      saveTagsData();
    }
  });
  
  // Handle clicks outside to hide suggestions
  document.addEventListener('click', (e) => {
    if (!tagSuggestions.contains(e.target) && !tagInput.contains(e.target)) {
      tagSuggestions.style.display = 'none';
    }
  });
  
  // Focus input when clicking on the container
  tagsInputContainer.addEventListener('click', (e) => {
    if (e.target === tagsInputContainer || e.target === selectedTagsContainer) {
      tagInput.focus();
    }
  });
  
  // Initial UI setup
  updateSelectedTags();
  updateSuggestions('');
  
  // Add comment field if enabled
  const commentField = createCommentField(question, question.id);
  if (commentField) {
    container.appendChild(commentField);
  }
  
  return container;
}

// Export the renderer
export default {
  renderTagsQuestion
};
