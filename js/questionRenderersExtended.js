/**
 * questionRenderersExtended.js
 * Extended question rendering module
 * 
 * This module provides renderers for more complex question types:
 * - Likert scales
 * - Range sliders
 * - 2D matrix selectors
 */

import * as surveyData from './surveyData.js';

/**
 * Create the main container for a question (simplified version)
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The question container element
 */
function createQuestionContainer(question) {
  const container = document.createElement('div');
  container.className = 'survey-question';
  container.id = `question-${question.id}`;
  container.dataset.questionId = question.id;
  container.dataset.questionType = question.type;
  
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
 * @returns {HTMLElement} - The comment field element or null if comments not allowed
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
  
  commentContainer.appendChild(commentLabel);
  commentContainer.appendChild(commentField);
  
  return commentContainer;
}

/**
 * Render a Likert scale question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
export function renderLikert(question) {
  const container = createQuestionContainer(question);
  
  const tableContainer = document.createElement('div');
  tableContainer.className = 'likert-container';
  
  const table = document.createElement('table');
  table.className = 'likert-table';
  
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Empty first cell for the statements column
  const emptyHeader = document.createElement('th');
  emptyHeader.className = 'likert-empty-header';
  headerRow.appendChild(emptyHeader);
  
  // Add scale headers (1 to max)
  const scaleMax = question.likertScale?.max || 5;
  const scaleMin = question.likertScale?.min || 1;
  const labels = question.likertScale?.labels || {};
  
  for (let i = scaleMin; i <= scaleMax; i++) {
    const th = document.createElement('th');
    th.className = 'likert-scale-header';
    th.textContent = labels[i] || i.toString();
    headerRow.appendChild(th);
  }
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create the table body
  const tbody = document.createElement('tbody');
  
  // Load existing responses if available
  const existingResponse = surveyData.getResponse(question.id);
  const responses = existingResponse ? existingResponse.value || {} : {};
  
  // Add a row for each option
  question.options.forEach((option) => {
    const row = document.createElement('tr');
    
    // Statement cell
    const statementCell = document.createElement('td');
    statementCell.className = 'likert-statement';
    statementCell.textContent = option.label;
    row.appendChild(statementCell);
    
    // Scale option cells
    for (let i = scaleMin; i <= scaleMax; i++) {
      const cell = document.createElement('td');
      cell.className = 'likert-scale-cell';
      
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `likert-${question.id}-${option.value}`;
      radio.id = `likert-${question.id}-${option.value}-${i}`;
      radio.value = i;
      radio.dataset.questionId = question.id;
      radio.dataset.optionValue = option.value;
      
      // Check if this option is selected
      if (responses[option.value] === i) {
        radio.checked = true;
      }
      
      // Add event listener to save response
      radio.addEventListener('change', () => {
        if (radio.checked) {
          // Get all responses for this question
          const allResponses = { ...responses };
          allResponses[option.value] = parseInt(radio.value, 10);
          
          surveyData.saveResponse(question.id, allResponses,
            question.allowComment ? document.getElementById(`comment-${question.id}`)?.value : null);
        }
      });
      
      cell.appendChild(radio);
      row.appendChild(cell);
    }
    
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  container.appendChild(tableContainer);
  
  // Add comment field if enabled
  const commentField = createCommentField(question, question.id);
  if (commentField) {
    container.appendChild(commentField);
  }
  
  return container;
}

/**
 * Render a range slider question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
export function renderRangeSlider(question) {
  const container = createQuestionContainer(question);
  
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'range-slider-container';
  
  // Get slider configuration
  const sliderConfig = question.rangeSlider || {};
  const min = sliderConfig.min || 0;
  const max = sliderConfig.max || 100;
  const step = sliderConfig.step || 1;
  const labels = sliderConfig.labels || {};
  
  // Create slider
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'range-slider';
  slider.id = `slider-${question.id}`;
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.dataset.questionId = question.id;
  
  // Load existing response if available
  const existingResponse = surveyData.getResponse(question.id);
  if (existingResponse && existingResponse.value !== undefined) {
    slider.value = existingResponse.value;
  } else {
    // Default to middle value
    slider.value = min + (max - min) / 2;
  }
  
  // Create value display
  const valueDisplay = document.createElement('div');
  valueDisplay.className = 'range-value-display';
  valueDisplay.id = `value-${question.id}`;
  valueDisplay.textContent = slider.value;
  
  // Update value display when slider changes
  slider.addEventListener('input', () => {
    valueDisplay.textContent = slider.value;
  });
  
  // Save response when slider value changes
  slider.addEventListener('change', () => {
    surveyData.saveResponse(question.id, parseFloat(slider.value),
      question.allowComment ? document.getElementById(`comment-${question.id}`)?.value : null);
  });
  
  // Add slider labels if provided
  const labelsContainer = document.createElement('div');
  labelsContainer.className = 'slider-labels-container';
  
  // Create labels for the slider
  Object.entries(labels).forEach(([value, label]) => {
    const labelEl = document.createElement('span');
    labelEl.className = 'slider-label';
    labelEl.textContent = label;
    labelEl.style.left = `${((value - min) / (max - min)) * 100}%`;
    labelsContainer.appendChild(labelEl);
  });
  
  sliderContainer.appendChild(slider);
  sliderContainer.appendChild(valueDisplay);
  sliderContainer.appendChild(labelsContainer);
  container.appendChild(sliderContainer);
  
  // Add comment field if enabled
  const commentField = createCommentField(question, question.id);
  if (commentField) {
    container.appendChild(commentField);
  }
  
  return container;
}

/**
 * Render a 2D matrix question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
export function renderMatrix2D(question) {
  const container = createQuestionContainer(question);
  
  const matrixContainer = document.createElement('div');
  matrixContainer.className = 'matrix-2d-container';
  
  // Get matrix configuration
  const matrixConfig = question.matrix || {};
  const rows = matrixConfig.rows || [];
  const columns = matrixConfig.columns || [];
  const allowMultiple = matrixConfig.allowMultiple || false;
  
  // Load existing responses if available
  const existingResponse = surveyData.getResponse(question.id);
  const selectedCells = existingResponse ? existingResponse.value || [] : [];
  
  // Create the matrix table
  const table = document.createElement('table');
  table.className = 'matrix-2d-table';
  
  // Create header row with column labels
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Empty corner cell
  const cornerCell = document.createElement('th');
  cornerCell.className = 'matrix-corner-cell';
  headerRow.appendChild(cornerCell);
  
  // Column headers
  columns.forEach((column) => {
    const th = document.createElement('th');
    th.className = 'matrix-column-header';
    th.textContent = column.label;
    th.dataset.columnId = column.id;
    if (column.description) {
      th.title = column.description; // Set tooltip
    }
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Create table body with rows
  const tbody = document.createElement('tbody');
  
  rows.forEach((row, index) => {
    const tr = document.createElement('tr');
    if (index % 2 !== 0) { // Apply striped pattern to odd-indexed rows (which are even rows visually, as index is 0-based)
      tr.classList.add('striped-row');
    }
    
    // Row header
    const rowHeader = document.createElement('th');
    rowHeader.className = 'matrix-row-header';
    rowHeader.textContent = row.label;
    rowHeader.dataset.rowId = row.id;
    if (row.description) {
      rowHeader.title = row.description; // Set tooltip
    }
    tr.appendChild(rowHeader);
    
    // Cells for each column
    columns.forEach((column) => {
      const td = document.createElement('td');
      td.className = 'matrix-cell';
      
      const cellId = `${row.id}:${column.id}`;
      
      // Create cell selection element
      const cellInput = document.createElement('input');
      cellInput.type = allowMultiple ? 'checkbox' : 'radio';
      cellInput.name = allowMultiple ? `matrix-${question.id}-${cellId}` : `matrix-${question.id}`;
      cellInput.id = `matrix-${question.id}-${cellId}`;
      cellInput.value = cellId;
      cellInput.dataset.questionId = question.id;
      cellInput.dataset.rowId = row.id;
      cellInput.dataset.columnId = column.id;
      
      // Check if this cell is selected
      if (allowMultiple) {
        if (Array.isArray(selectedCells) && selectedCells.some(cell => cell === cellId)) {
          cellInput.checked = true;
        }
      } else {
        if (selectedCells === cellId) {
          cellInput.checked = true;
        }
      }
      
      // Add event listener to save response
      cellInput.addEventListener('change', () => {
        if (allowMultiple) {
          // Get all checked cells
          const checkedCells = Array.from(
            document.querySelectorAll(`input[name^="matrix-${question.id}-"]:checked`)
          ).map(input => input.value);
          
          surveyData.saveResponse(question.id, checkedCells,
            question.allowComment ? document.getElementById(`comment-${question.id}`)?.value : null);
        } else if (cellInput.checked) {
          surveyData.saveResponse(question.id, cellInput.value,
            question.allowComment ? document.getElementById(`comment-${question.id}`)?.value : null);
        }
      });
      
      // Create label to make the entire cell clickable
      const cellLabel = document.createElement('label');
      cellLabel.htmlFor = cellInput.id;
      cellLabel.className = 'matrix-cell-label';
      
      td.appendChild(cellInput);
      td.appendChild(cellLabel);
      tr.appendChild(td);
    });
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  matrixContainer.appendChild(table);
  container.appendChild(matrixContainer);
  
  // Add comment field if enabled
  const commentField = createCommentField(question, question.id);
  if (commentField) {
    container.appendChild(commentField);
  }
  
  return container;
}
