/**
 * questionRenderersRank.js
 * Rank question type renderer module
 * 
 * This module implements the drag-and-drop ranking question type using D3.js
 */

import * as surveyData from './surveyData.js';
// Only import functions that are actually exported
import { renderLikert, renderRangeSlider, renderMatrix2D } from './questionRenderersExtended.js';

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
  textarea.addEventListener('blur', () => {
    const questionResponse = surveyData.getResponse(questionId);
    if (questionResponse) {
      surveyData.saveResponse(questionId, questionResponse.value, textarea.value);
    }
  });
  
  container.appendChild(textarea);
  return container;
}

// Constants
const CONSTANTS = {
  RANK_SVG_HEIGHT: 400,
  RANK_SVG_MARGIN: { top: 40, right: 40, bottom: 40, left: 40 },
  OPTION_HEIGHT: 40,
  OPTION_MARGIN: 10,
  TRANSITION_DURATION: 300,
  COLORS: {
    OPTION_FILL: '#e9f2fb',
    OPTION_STROKE: '#007bff',
    OPTION_TEXT: '#333',
    DRAG_FILL: '#cce5ff',
    DRAG_STROKE: '#004085',
    AXIS_LINE: '#ccc',
    GRID_LINE: '#eee'
  }
};

/**
 * Render a ranking question where users can drag and drop options to rank them
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
export function renderRankOptions(question) {
  const container = createQuestionContainer(question);
  
  // Create container for the D3 visualization
  const rankContainer = document.createElement('div');
  rankContainer.className = 'rank-options-container';
  rankContainer.id = `rank-container-${question.id}`;
  
  // Add to main container
  container.appendChild(rankContainer);
  
  // Get rank configuration
  const rankConfig = question.rankOptions || {};
  
  // Access the options array correctly from the nested structure
  console.log('Question structure:', question);
  console.log('Rank config:', rankConfig);
  
  // IMPORTANT: Make sure we're using the original options from the question definition
  // NOT any previously saved response data
  const originalOptions = rankConfig.options || [];
  console.log('Original options from question definition:', originalOptions);
  const showScale = rankConfig.showScale !== false; // Default to true
  const scaleLabels = rankConfig.scaleLabels || { low: 'Low', high: 'High' };
  const orientation = rankConfig.orientation || 'vertical'; // vertical or horizontal
  
  // Create hidden input to store the ranking data
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.id = `input-${question.id}`;
  hiddenInput.dataset.questionId = question.id;
  container.appendChild(hiddenInput);
  
  // Ensure we have at least some options
  if (originalOptions.length === 0) {
    const message = document.createElement('p');
    message.textContent = 'No options provided for ranking';
    message.className = 'rank-error-message';
    rankContainer.appendChild(message);
    
    // Add comment field if enabled
    const commentField = createCommentField(question, question.id);
    if (commentField) {
      container.appendChild(commentField);
    }
    
    return container;
  }
  
  // Initialize visualization after DOM is loaded
  setTimeout(() => {
    // Load existing response if available
    const existingResponse = surveyData.getResponse(question.id);
  
    // We'll use the original options from the question definition as our base
    // This ensures we always have the correct labels and values
    let rankedOptions = [...originalOptions];
  
    if (existingResponse && existingResponse.value && Array.isArray(existingResponse.value)) {
      console.log('Found existing response:', existingResponse.value);
      
      // Try to reconstruct the order from saved data
      try {
        // Sort the saved responses by rank
        const sortedResponses = existingResponse.value.slice().sort((a, b) => a.rank - b.rank);
        
        // Use the original options but reorder them based on the saved ranks
        rankedOptions = sortedResponses.map(savedItem => {
          // Find the original option with matching value
          const originalOption = originalOptions.find(opt => opt.value === savedItem.id);
          return originalOption || { value: savedItem.id, label: `Option ${savedItem.rank + 1}` };
        });
        
        console.log('Reconstructed options with proper labels:', rankedOptions);
      } catch (e) {
        console.error('Error parsing existing rank data:', e);
        // Fall back to using original options if there's an error
        rankedOptions = [...originalOptions];
      }
    }
    
    // Set up the visualization with the properly processed options
    initializeRankingVisualization(
      `#rank-container-${question.id}`, 
      rankedOptions, 
      question.id,
      showScale,
      scaleLabels,
      orientation
    );
  }, 0);
  
  // Add comment field if enabled
  const commentField = createCommentField(question, question.id);
  if (commentField) {
    container.appendChild(commentField);
  }
  
  return container;
}

/**
 * Initialize the ranking visualization
 * @param {string} containerSelector - CSS selector for the container
 * @param {Array} optionsToRank - Array of options to rank
 * @param {string} questionId - The question ID
 * @param {boolean} showScale - Whether to show a scale
 * @param {Object} scaleLabels - Labels for the scale ends
 * @param {string} orientation - 'vertical' or 'horizontal'
 */
function initializeRankingVisualization(containerSelector, optionsToRank, questionId, showScale, scaleLabels, orientation) {
  // First create a basic HTML-based ranking component instead of SVG to ensure text displays properly
  const container = document.querySelector(containerSelector);
  container.innerHTML = '';
  
  // Create a container for the rank items
  const rankList = document.createElement('div');
  rankList.className = 'rank-list';
  container.appendChild(rankList);
  
  // Create scale labels if needed
  if (showScale) {
    const scaleContainer = document.createElement('div');
    scaleContainer.className = 'rank-scale-container';
    
    const highLabel = document.createElement('div');
    highLabel.className = 'rank-scale-label rank-scale-high';
    highLabel.textContent = scaleLabels.high || 'Highest Priority';
    
    const lowLabel = document.createElement('div');
    lowLabel.className = 'rank-scale-label rank-scale-low';
    lowLabel.textContent = scaleLabels.low || 'Lowest Priority';
    
    scaleContainer.appendChild(highLabel);
    scaleContainer.appendChild(lowLabel);
    container.insertBefore(scaleContainer, rankList);
  }
  
  // Debug the options to see what we're getting
  console.log('Rank options array:', optionsToRank);
  
  // Create items for ranking
  optionsToRank.forEach((option, index) => {
    // Log each individual option to debug
    console.log(`Option ${index}:`, option);
    
    const rankItem = document.createElement('div');
    rankItem.className = 'rank-item';
    rankItem.setAttribute('data-rank', index);
    rankItem.setAttribute('data-value', option.value || `option-${index}`);
    rankItem.setAttribute('draggable', true);
    
    // Get the label text from the option object
    // This should match the structure in your JSON: { "value": "cost_optimization", "label": "Cost optimization" }
    const labelText = option.label || option.value || `Option ${index + 1}`;
    
    // Create the item's content with proper styling
    rankItem.innerHTML = `
      <div class="rank-item-content">
        <div class="rank-item-label">${labelText}</div>
        <div class="rank-item-number">#${index + 1}</div>
        <div class="rank-item-handle">
          <svg width="20" height="10" viewBox="0 0 20 10">
            <path d="M0 1h20M0 5h20M0 9h20" stroke="#666" stroke-width="2"/>
          </svg>
        </div>
      </div>
    `;
    
    rankList.appendChild(rankItem);
  });
  
  // Set up drag and drop functionality
  setupDragAndDrop(rankList, questionId);
}

/**
 * Set up the drag and drop functionality for the rank items
 * @param {HTMLElement} rankList - The container with rank items
 * @param {string} questionId - The question ID to save responses
 */
function setupDragAndDrop(rankList, questionId) {
  let draggedItem = null;
  let placeholder = null;
  const rankItems = rankList.querySelectorAll('.rank-item');
  
  // Helper function to get the rank of an element
  function getRank(element) {
    return parseInt(element.getAttribute('data-rank'));
  }
  
  // Helper function to set the rank of an element
  function setRank(element, rank) {
    element.setAttribute('data-rank', rank);
    const numberElement = element.querySelector('.rank-item-number');
    if (numberElement) {
      numberElement.textContent = `#${rank + 1}`;
    }
  }
  
  // Add event listeners to each rank item
  rankItems.forEach(item => {
    // When drag starts
    item.addEventListener('dragstart', (e) => {
      draggedItem = item;
      setTimeout(() => {
        item.classList.add('dragging');
      }, 0);
      
      // Create a placeholder that matches the item's dimensions
      placeholder = document.createElement('div');
      placeholder.className = 'rank-item placeholder';
      placeholder.style.height = `${item.offsetHeight}px`;
      
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.getAttribute('data-value'));
    });
    
    // When drag ends
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
      }
      draggedItem = null;
      placeholder = null;
      
      // Save the new ranking
      saveRanking(rankList, questionId);
    });
    
    // When dragging over an item
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const currentRank = getRank(item);
      const draggedRank = getRank(draggedItem);
      
      if (draggedItem !== item) {
        // Determine insertion point
        const rect = item.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        
        if (e.clientY < midpoint) {
          // Insert before
          if (placeholder && placeholder.nextSibling !== item) {
            rankList.insertBefore(placeholder, item);
          }
        } else {
          // Insert after
          if (placeholder && placeholder !== item.nextSibling) {
            rankList.insertBefore(placeholder, item.nextSibling);
          }
        }
      }
    });
    
    // When dropping
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      
      if (draggedItem) {
        const items = Array.from(rankList.querySelectorAll('.rank-item:not(.placeholder)'));
        const placeholderIndex = Array.from(rankList.children).indexOf(placeholder);
        
        // Remove the dragged item from its current position
        rankList.removeChild(draggedItem);
        
        // Insert at the placeholder position
        if (placeholder && placeholder.parentNode) {
          rankList.insertBefore(draggedItem, placeholder);
        } else {
          rankList.appendChild(draggedItem);
        }
        
        // Update ranks for all items
        items.forEach((item, index) => {
          setRank(item, index);
        });
      }
    });
  });
  
  // Allow dropping on the container itself
  rankList.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // If dragging below the last item
    const lastItem = rankList.querySelector('.rank-item:last-child');
    if (lastItem) {
      const rect = lastItem.getBoundingClientRect();
      if (e.clientY > rect.bottom) {
        if (placeholder && placeholder !== rankList.lastChild) {
          rankList.appendChild(placeholder);
        }
      }
    }
  });
  
  rankList.addEventListener('drop', (e) => {
    e.preventDefault();
    
    if (draggedItem && placeholder && placeholder.parentNode) {
      // Similar to the item drop handler
      rankList.insertBefore(draggedItem, placeholder);
      
      // Update ranks for all items
      const items = Array.from(rankList.querySelectorAll('.rank-item:not(.placeholder)'));
      items.forEach((item, index) => {
        setRank(item, index);
      });
      
      // Save the new ranking
      saveRanking(rankList, questionId);
    }
  });
}

/**
 * Save the current ranking to the survey data
 * @param {HTMLElement} rankList - The container with rank items
 * @param {string} questionId - The question ID to save responses
 */
function saveRanking(rankList, questionId) {
  const rankItems = rankList.querySelectorAll('.rank-item');
  const rankData = [];
  
  rankItems.forEach((item) => {
    rankData.push({
      id: item.getAttribute('data-value'),
      rank: parseInt(item.getAttribute('data-rank'))
    });
  });
  
  // Sort by rank
  const sortedData = rankData.slice().sort((a, b) => a.rank - b.rank);
  
  // Save to the survey data
  surveyData.saveResponse(
    questionId,
    sortedData,
    document.getElementById(`comment-${questionId}`)?.value
  );
}
  
  // All old D3.js-based functions removed
  // The new HTML-based implementation handles everything with the setupDragAndDrop function

// Export the renderer
export default {
  renderRankOptions
};
