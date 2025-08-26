/**
 * resultsDashboard.js
 * Main controller for the survey results dashboard
 */

import { getResults, getQuestionDefinitions } from './resultsDataService.js';
import { createRadioVisualization } from './visualizations/radioVisualizer.js';
import { createCheckboxVisualization } from './visualizations/checkboxVisualizer.js';
import { createTextSummary } from './visualizations/textVisualizer.js';
import { createMatrixVisualization } from './visualizations/matrixVisualizer.js';
import { createSliderVisualization } from './visualizations/sliderVisualizer.js';
import { createRankVisualization } from './visualizations/rankVisualizer.js';
import { createLikertVisualization } from './visualizations/likertVisualizer.js';
import rangeSliderVisualizer from './visualizations/rangeSliderVisualizer.js';
import { createTagsVisualization } from './visualizations/tagsVisualizer.js';
import { getVisualizationPreferences, saveVisualizationPreference } from './admin/visualizationSettings.js';

// Question type constants
const QUESTION_TYPES = {
    RADIO: 'radio',
    CHECKBOX: 'checkbox',
    SHORT_TEXT: 'shortText',
    LONG_TEXT: 'longText',
    MATRIX_2D: 'matrix2d',
    LIKERT: 'likert',
    MULTI_VALUE_SLIDER: 'multiValueSlider',
    RANK_OPTIONS: 'rankOptions',
    RANGE_SLIDER: 'rangeSlider',
    TAGS: 'tags'
};

// Visualization type options by question type
const VISUALIZATION_TYPES = {
    [QUESTION_TYPES.RADIO]: ['pie', 'doughnut', 'horizontalBar', 'verticalBar'],
    [QUESTION_TYPES.CHECKBOX]: ['horizontalBar', 'verticalBar', 'stackedBar', 'radar'],
    [QUESTION_TYPES.MATRIX_2D]: ['heatmap', 'groupedBar', 'radar', 'bubble'],
    [QUESTION_TYPES.LIKERT]: ['heatmap', 'stackedBar'],
    [QUESTION_TYPES.RANGE_SLIDER]: ['histogram'],
    [QUESTION_TYPES.TAGS]: ['wordcloud'],
    [QUESTION_TYPES.MULTI_VALUE_SLIDER]: ['histogram', 'boxplot', 'stackedPositions'],
    [QUESTION_TYPES.RANK_OPTIONS]: ['rankedOrder', 'stackedPositions', 'irv'],
    [QUESTION_TYPES.SHORT_TEXT]: ['wordcloud'],
    [QUESTION_TYPES.LONG_TEXT]: ['wordcloud']
};

// Default visualization types
const DEFAULT_VISUALIZATION = {
    [QUESTION_TYPES.RADIO]: 'pie',
    [QUESTION_TYPES.CHECKBOX]: 'horizontalBar',
    [QUESTION_TYPES.MATRIX_2D]: 'heatmap',
    [QUESTION_TYPES.LIKERT]: 'heatmap',
    [QUESTION_TYPES.RANGE_SLIDER]: 'histogram',
    [QUESTION_TYPES.TAGS]: 'wordcloud',
    [QUESTION_TYPES.MULTI_VALUE_SLIDER]: 'histogram',
    [QUESTION_TYPES.RANK_OPTIONS]: 'rankedOrder',
    [QUESTION_TYPES.SHORT_TEXT]: 'wordcloud',
    [QUESTION_TYPES.LONG_TEXT]: 'wordcloud'
};

// State management
let questionDefinitions = [];
let surveyResults = [];
let filterableQuestions = []; // Store questions that can be used as filters
let currentFilters = {
    dateRange: 'all'
    // Other filters will be added dynamically
};

// Wizard navigation state
let currentStepIndex = 0;
let stepIds = [];
let questionsByStep = {};

// DOM elements
const resultsContainer = document.getElementById('results-container');
const totalResponsesElement = document.getElementById('total-responses');
const lastResponseDateElement = document.getElementById('last-response-date');
const applyFiltersButton = document.getElementById('apply-filters');
const resetFiltersButton = document.getElementById('reset-filters');
const adminPanelElement = document.getElementById('admin-panel');
const industryFilterContainer = document.getElementById('industry-filter-container');
const orgSizeFilterContainer = document.getElementById('org-size-filter-container');

// Modal elements
const responseDetailsModal = document.getElementById('response-details-modal');
const closeModalButton = responseDetailsModal ? responseDetailsModal.querySelector('.close-button') : null;
const responseListElement = document.getElementById('response-list');
const openResultDetailsButton = document.getElementById('open-result-details');
/**
 * Opens the response details modal.
 */
function openResponseDetailsModal() {
    if (responseDetailsModal) {
        responseDetailsModal.style.display = 'block';
    }
}

/**
 * Closes the response details modal.
 */
function closeResponseDetailsModal() {
    if (responseDetailsModal) {
        responseDetailsModal.style.display = 'none';
    }
}

/**
 * Populates the response details modal with all survey responses.
 */
function populateResponseDetailsModal() {
    if (!responseListElement) return;

    responseListElement.innerHTML = ''; // Clear previous content
    surveyResults.sort((a, b) => {
        const dateA = new Date(a.completedAt || 0);
        const dateB = new Date(b.completedAt || 0);
        return dateB - dateA;
    });
    surveyResults.forEach(response => {
        const listItem = document.createElement('li');
        listItem.className = 'response-item';

        // Extract relevant properties for display
        const responseId = response.id || 'N/A';
        const username = response.username || response.email || 'Anonymous';
        const bedrijf = response.bedrijf ||response.label || 'Unknown';
        const completedAt = response.completedAt ? new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long' }).format(new Date(response.completedAt)) : 'N/A';
        const lastModified = response.lastModified ? new Date(response.lastModified).toLocaleString() : 'N/A';

        let responseDetailsHtml = `
            <div class="response-meta">
                <span><strong>Bedrijf:</strong> ${bedrijf}</span>
                <span><strong>User:</strong> ${username}</span>
                <span><strong>Completed:</strong> ${completedAt}</span>
            </div>
        `;
        responseDetailsHtml += `            
            </div>
        `;
        listItem.innerHTML = responseDetailsHtml;
        responseListElement.appendChild(listItem);
    });
}


/**
 * Initialize the dashboard
 */
async function initDashboard() {
    try {
        // Show loading state
        resultsContainer.innerHTML = '<div class="loading-indicator"><p>Loading survey results...</p></div>';
        
        // Fetch question definitions and results
        [questionDefinitions, surveyResults] = await Promise.all([
            getQuestionDefinitions(),
            getResults()
        ]);
        
        // Identify questions that can be used as filters
        filterableQuestions = identifyFilterableQuestions(questionDefinitions);
        
        // Update overview statistics
        updateOverviewStats();
        
        // Setup filters
        setupFilters();
        
        // Render results
        renderResults();
        
        // Setup event listeners
        setupEventListeners();
        
        // Check if admin and show admin controls
        checkAndSetupAdmin();
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        resultsContainer.innerHTML = `<div class="error-message">
            <p>Failed to load survey results. Please try again later.</p>
            <p>Error: ${error.message}</p>
        </div>`;
    }
}

/**
 * Update overview statistics
 */
function updateOverviewStats() {

    openResultDetailsButton.addEventListener('click', () => {
         populateResponseDetailsModal();
        openResponseDetailsModal();
    });
    // Update response count
    totalResponsesElement.textContent = surveyResults.length;
    
    // Find the most recent response
    if (surveyResults.length > 0) {
        const dates = surveyResults.map(r => new Date(r.completedAt || r.lastModified));
        const mostRecent = new Date(Math.max(...dates));
        lastResponseDateElement.textContent = mostRecent.toLocaleDateString();
    }
    
    // Update overview stats section
    const overviewStats = document.querySelector('.overview-stats');
    
    // Calculate some high-level statistics
    const stats = calculateOverviewStats();
    
    overviewStats.innerHTML = Object.entries(stats).map(([key, value]) => `
        <div class="stat-card clickable-stat">
            <h3>${key}</h3>
            <div class="stat-value">${value.value}</div>
            ${value.subtext ? `<div class="stat-subtext">${value.subtext}</div>` : ''}
        </div>
        <button class="view-details-button" onclick="populateResponseDetailsModal(); openResponseDetailsModal();">View Details</button>
    `).join('');


    // Add click listener to the overview stats container
    overviewStats.addEventListener('click', () => {
        populateResponseDetailsModal();
        openResponseDetailsModal();
    });
}

/**
 * Calculate overview statistics
 */
function calculateOverviewStats() {
    
    return {
        'Total Responses': {
            value: surveyResults.length,
            subtext: 'responses collected'
        }
    };
}
/**
 * Identify which questions are suitable for use as filters
 * @param {Array} questions - Array of question definitions
 * @returns {Array} - Array of filterable questions
 */
function identifyFilterableQuestions(questions) {
    // Questions that make good filters are typically:
    // 1. Single-select or multi-select questions (radio, checkbox, etc.)
    // 2. Questions with a reasonable number of options
    // 3. Questions that categorize/segment the respondents
    
    return questions.filter(question => {
        // Only include questions with specific types that make good filters
        if (!question.id || !question.type) return false;
        
        const goodFilterTypes = [
            QUESTION_TYPES.RADIO,
            QUESTION_TYPES.CHECKBOX,
            QUESTION_TYPES.MATRIX_2D,
            QUESTION_TYPES.TAGS
        ];
        
        // Check if the question type is suitable for filtering
        if (!goodFilterTypes.includes(question.type)) return false;
        
        // For radio and checkbox questions, ensure they have options
        if ((question.type === QUESTION_TYPES.RADIO || question.type === QUESTION_TYPES.CHECKBOX) 
            && (!question.options || question.options.length === 0)) {
            return false;
        }
        
        // Exclude questions with too many options (would make filtering unwieldy)
        if (question.options && question.options.length > 20) return false;
        
        // Question is suitable for filtering
        return true;
    });
}

/**
 * Setup filter controls
 */
function setupFilters() {
    const filtersContainer = document.querySelector('.filters-section');
    if (!filtersContainer) return;
    
    // Clear any existing filter containers except date range
    const existingContainers = filtersContainer.querySelectorAll('.filter-container:not(#date-range-container)');
    existingContainers.forEach(container => container.remove());
    
    // Add "Today" option to date range filter
    const dateRangeSelect = document.getElementById('date-range');
    if (dateRangeSelect && !dateRangeSelect.querySelector('option[value="today"]')) {
        const todayOption = document.createElement('option');
        todayOption.value = 'today';
        todayOption.textContent = 'Today';
        dateRangeSelect.add(todayOption, 1); // Add as second option, after "All Time"
    }
    
    // Initialize the dynamic filters structure
    currentFilters = {
        dateRange: 'all'
    };
    
    // For each filterable question, create a filter UI
    filterableQuestions.forEach(question => {
        // Create filter container
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-container';
        filterContainer.id = `${question.id}-filter-container`;
        
        // Initialize filter in currentFilters
        currentFilters[question.id] = [];
        
        switch(question.type) {
            case QUESTION_TYPES.RADIO:
            case QUESTION_TYPES.CHECKBOX:
                // Create a multi-select dropdown for options
                if (question.options && question.options.length > 0) {
                    filterContainer.innerHTML = `
                        <label for="${question.id}-filter">${question.title}</label>
                        <select id="${question.id}-filter" multiple>
                            ${question.options.map(option => `
                                <option value="${option.value}">${option.label}</option>
                            `).join('')}
                        </select>
                    `;
                }
                break;
                
            case QUESTION_TYPES.TAGS:
                // Create a multi-select dropdown for tag options
                if (question.tagOptions && question.tagOptions.tags && question.tagOptions.tags.length > 0) {
                    filterContainer.innerHTML = `
                        <label for="${question.id}-filter">${question.title}</label>
                        <select id="${question.id}-filter" multiple>
                            ${question.tagOptions.tags.map(tag => `
                                <option value="${tag}">${tag}</option>
                            `).join('')}
                        </select>
                    `;
                }
                break;
                
            case QUESTION_TYPES.MATRIX_2D:
                // Create a multi-select dropdown for matrix rows
                if (question.matrix && question.matrix.rows && question.matrix.rows.length > 0) {
                    filterContainer.innerHTML = `
                        <label for="${question.id}-filter">${question.title}</label>
                        <select id="${question.id}-filter" multiple>
                            ${question.matrix.rows.map(row => `
                                <option value="${row.id}">${row.label}</option>
                            `).join('')}
                        </select>
                    `;
                }
                break;
        }
        
        // Only add the filter if content was generated
        if (filterContainer.innerHTML) {
            filtersContainer.appendChild(filterContainer);
        }
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Apply filters
    applyFiltersButton.addEventListener('click', () => {
        // Get date range filter value
        const dateRangeFilter = document.getElementById('date-range').value;
        
        // Start with the date range filter
        const newFilters = {
            dateRange: dateRangeFilter
        };
        
        // For each filterable question, get its filter value
        filterableQuestions.forEach(question => {
            const filterId = `${question.id}-filter`;
            const filterElement = document.getElementById(filterId);
            
            if (filterElement) {
                // Get selected values if it's a select element
                if (filterElement.tagName === 'SELECT') {
                    const selectedValues = Array.from(filterElement.selectedOptions || [])
                        .map(option => option.value);
                    newFilters[question.id] = selectedValues;
                }
                // Add support for other filter types here if needed
            }
        });
        
        // Update current filters
        currentFilters = newFilters;
        
        // Re-render with filters applied
        renderResults();
    });
    
    // Reset filters
    resetFiltersButton.addEventListener('click', () => {
        // Reset filter controls
        document.getElementById('date-range').value = 'all';
        
        const industryFilterElement = document.getElementById('industry-filter');
        if (industryFilterElement) {
            Array.from(industryFilterElement.options).forEach(option => {
                option.selected = false;
            });
        }
        
        const orgSizeFilterElement = document.getElementById('org-size-filter');
        if (orgSizeFilterElement) {
            Array.from(orgSizeFilterElement.options).forEach(option => {
                option.selected = false;
            });
        }
        
        // Reset current filters
        currentFilters = {
            dateRange: 'all',
            industry: [],
            orgSize: []
        };
        
        // Re-render results
        renderResults();
    });

    // Close modal button
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeResponseDetailsModal);
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === responseDetailsModal) {
            closeResponseDetailsModal();
        }
    });
}

/**
 * Apply filters to results data
 * @param {Array} results - Survey results
 * @returns {Array} - Filtered results
 */
function applyFilters(results) {
    return results.filter(response => {
        // Date range filter
        if (currentFilters.dateRange !== 'all') {
            const responseDate = new Date(response.completedAt || response.lastModified);
            const now = new Date();
            let cutoffDate;
            
            switch (currentFilters.dateRange) {
                case 'today':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                    break;
                case 'month':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    break;
                case 'quarter':
                    cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                    break;
            }
            
            if (responseDate < cutoffDate) {
                return false;
            }
        }
        
   
        
        return true;
    });
}

/**
 * Render survey results in wizard format
 */
function renderResults() {
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Filter results
    const filteredResults = applyFilters(surveyResults);
    
    // Update overview stats with filtered results
    updateOverviewStats();
    
    // Group questions by step
    questionsByStep = groupQuestionsByStep();
    
    // Get an array of step IDs to use for navigation
    stepIds = Object.keys(questionsByStep);
    
    // If no steps or steps is empty, show a message
    if (stepIds.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>No questions found or no responses match the current filters.</p>
            </div>
        `;
        return;
    }
    
    // Create wizard container
    const wizardContainer = document.createElement('div');
    wizardContainer.className = 'results-wizard';
    
    // Create progress indicator
    const progressContainer = document.createElement('div');
    progressContainer.className = 'wizard-progress';
    
    // Create progress dots
    const progressDots = document.createElement('div');
    progressDots.className = 'progress-dots';
    
    stepIds.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = 'progress-dot';
        dot.setAttribute('data-step', index);
        dot.title = `Step ${index + 1} ${questionsByStep[stepIds[index]].title}`;
        
        // Add click event to jump to step
        dot.addEventListener('click', () => navigateToStep(index));
        
        progressDots.appendChild(dot);
    });
    
    progressContainer.appendChild(progressDots);
    
    // Create step navigation
    const wizardNavigation = document.createElement('div');
    wizardNavigation.className = 'wizard-navigation';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.id = 'prev-step';
    prevButton.className = 'nav-button prev';
    prevButton.innerHTML = '<span class="nav-arrow">←</span> Previous Step';
    prevButton.addEventListener('click', navigateToPrevStep);
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.id = 'next-step';
    nextButton.className = 'nav-button next';
    nextButton.innerHTML = 'Next Step <span class="nav-arrow">→</span>';
    nextButton.addEventListener('click', navigateToNextStep);
    
    // Step counter
    const stepCounter = document.createElement('div');
    stepCounter.className = 'step-counter';
    stepCounter.id = 'step-counter';
    
    wizardNavigation.appendChild(prevButton);
    wizardNavigation.appendChild(stepCounter);
    wizardNavigation.appendChild(nextButton);
    
    // Create step content container
    const stepContentContainer = document.createElement('div');
    stepContentContainer.className = 'step-content-container';
    stepContentContainer.id = 'step-content';
    
    // Assemble the wizard
    wizardContainer.appendChild(progressContainer);
    wizardContainer.appendChild(stepContentContainer);
    wizardContainer.appendChild(wizardNavigation);
    
    resultsContainer.appendChild(wizardContainer);
    
    // Initialize the first step (or the current step if already set)
    currentStepIndex = Math.min(currentStepIndex, stepIds.length - 1);
    renderCurrentStep(filteredResults);
}

/**
 * Render the current step content
 * @param {Array} filteredResults - Filtered survey responses
 */
function renderCurrentStep(filteredResults) {
    // Get the current step ID and step data
    const stepId = stepIds[currentStepIndex];
    const step = questionsByStep[stepId];
    
    // Get the step content container
    const stepContentContainer = document.getElementById('step-content');
    stepContentContainer.innerHTML = '';
    
    // Create step header
    const stepHeader = document.createElement('div');
    stepHeader.className = 'wizard-step-header';
    stepHeader.innerHTML = `
        <h2 class="step-title">
            <span class="step-badge">${currentStepIndex + 1}</span>
            ${step.title}
        </h2>
    `;
    
    // Add step description if available
    if (step.description) {
        const stepDescription = document.createElement('p');
        stepDescription.className = 'step-description';
        stepDescription.textContent = step.description;
        stepHeader.appendChild(stepDescription);
    }
    
    stepContentContainer.appendChild(stepHeader);
    
    // Render each question in the step
    step.questions.forEach(question => {
        const questionResultElement = renderQuestionResult(question, filteredResults);
        if (questionResultElement) {
            stepContentContainer.appendChild(questionResultElement);
        }
    });
    
    // Update progress dots
    updateProgressDots();
    
    // Update step counter
    updateStepCounter();
    
    // Update navigation buttons
    updateNavigationButtons();
}

/**
 * Update the progress dots to reflect the current step
 */
function updateProgressDots() {
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentStepIndex);
        dot.classList.toggle('completed', index < currentStepIndex);
    });
}

/**
 * Update the step counter display
 */
function updateStepCounter() {
    const stepCounter = document.getElementById('step-counter');
    stepCounter.textContent = `Step ${currentStepIndex + 1} of ${stepIds.length}`;
}

/**
 * Update the navigation buttons based on current step
 */
function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-step');
    const nextButton = document.getElementById('next-step');
    
    // Disable/enable previous button
    prevButton.disabled = currentStepIndex === 0;
    
    // Update next button text and state
    if (currentStepIndex === stepIds.length - 1) {
        nextButton.innerHTML = 'Finish <span class="nav-arrow">→</span>';
        nextButton.classList.add('finish');
    } else {
        nextButton.innerHTML = 'Next Step <span class="nav-arrow">→</span>';
        nextButton.classList.remove('finish');
    }
}

/**
 * Navigate to a specific step by index
 * @param {number} stepIndex - The index of the step to navigate to
 */
function navigateToStep(stepIndex) {
    // Validate index
    if (stepIndex < 0 || stepIndex >= stepIds.length) return;
    
    // Update current step index
    currentStepIndex = stepIndex;
    
    // Render the new step
    renderCurrentStep(applyFilters(surveyResults));
}

/**
 * Navigate to the previous step
 */
function navigateToPrevStep() {
    if (currentStepIndex > 0) {
        navigateToStep(currentStepIndex - 1);
    }
}

/**
 * Navigate to the next step or finish
 */
function navigateToNextStep() {
    if (currentStepIndex < stepIds.length - 1) {
        navigateToStep(currentStepIndex + 1);
    } else {
        // Handle finish action (e.g., show summary or return to first step)
        currentStepIndex = 0;
        renderCurrentStep(applyFilters(surveyResults));
    }
}

/**
 * Group questions by their parent step
 * @returns {Object} - Questions grouped by step
 */
function groupQuestionsByStep() {
    const steps = {};
    
    questionDefinitions.forEach(question => {
        const stepId = question.stepId || 'unknown';
        
        if (!steps[stepId]) {
            // Find step info from the first question's metadata
            const stepInfo = {
                id: stepId,
                title: question.stepTitle || `Step ${stepId}`,
                description: question.stepDescription || '',
                questions: []
            };
            
            steps[stepId] = stepInfo;
        }
        
        steps[stepId].questions.push(question);
    });
    
    return steps;
}

/**
 * Render a single question's results
 * @param {Object} question - Question definition
 * @param {Array} results - Survey results
 * @returns {HTMLElement} - Question result element
 */
function renderQuestionResult(question, results) {
    // Skip questions without an ID or type
    if (!question.id || !question.type) return null;
    
    // Create container for question result
    const questionResult = document.createElement('div');
    questionResult.className = 'question-result';
    questionResult.id = `result-${question.id}`;
    
    // Add question title and description
    questionResult.innerHTML = `
        <div class="question-header">
            <h3>${question.title}</h3>
            ${question.description ? `<p class="description">${question.description}</p>` : ''}
        </div>
    `;
    
    // Get visualization preferences
    const visualizationPreferences = getVisualizationPreferences();
    const preferredType = visualizationPreferences[question.id]?.type || 
                         (question.visualization?.type || DEFAULT_VISUALIZATION[question.type]);
    
    // Create visualization container
    const visualizationContainer = document.createElement('div');
    visualizationContainer.className = 'visualization-container';
    visualizationContainer.id = `viz-${question.id}`;
    
    // Add visualization toolbar for admins
    const isAdmin = checkIfAdmin();
    if (isAdmin) {
        const toolbar = createVisualizationToolbar(question, preferredType);
        questionResult.appendChild(toolbar);
    }
    
    questionResult.appendChild(visualizationContainer);
    
    // Extract responses for this question
    const questionResponses = results.map(response => {
        return response.responses && response.responses[question.id] 
            ? response.responses[question.id].value 
            : null;
    }).filter(Boolean);
    const questionResponseLabels = results.map(response => {
        return response.label 
    }).filter(Boolean);
    
    // Generate visualization based on question type
    try {
        switch (question.type) {
            case QUESTION_TYPES.RADIO:
                createRadioVisualization(
                    visualizationContainer, 
                    questionResponses, 
                    question,
                    questionResponseLabels, 
                    preferredType
                );
                break;
                
            case QUESTION_TYPES.CHECKBOX:
                createCheckboxVisualization(
                    visualizationContainer, 
                    questionResponses, 
                    question, 
                    questionResponseLabels, 
                    preferredType
                );
                break;
                
            case QUESTION_TYPES.SHORT_TEXT:
            case QUESTION_TYPES.LONG_TEXT:
                createTextSummary(
                    visualizationContainer, 
                    questionResponses, 
                    question, 
                    preferredType
                );
                break;
                
            case QUESTION_TYPES.MATRIX_2D:
                createMatrixVisualization(
                    visualizationContainer, 
                    questionResponses, 
                    question, 
                    questionResponseLabels, 
                    preferredType
                );
                break;
                
            case QUESTION_TYPES.MULTI_VALUE_SLIDER:
                createSliderVisualization(
                    visualizationContainer, 
                    questionResponses, 
                    question, 
                    preferredType
                );
                break;
                
            case QUESTION_TYPES.RANK_OPTIONS:
                createRankVisualization(
                    visualizationContainer, 
                    questionResponses, 
                    question, 
                    preferredType
                );
                break;

            case QUESTION_TYPES.LIKERT:
                createLikertVisualization(
                    visualizationContainer, 
                    questionResponses, 
                    question, 
                    questionResponseLabels, 
                    preferredType
                );
                break;

            case QUESTION_TYPES.RANGE_SLIDER:
                rangeSliderVisualizer.render(
                    visualizationContainer,
                    question,
                    questionResponses
                );
                break;

            case QUESTION_TYPES.TAGS:
                createTagsVisualization(
                    visualizationContainer,
                    questionResponses,
                    question,
                    preferredType
                );
                break;
                
            default:
                visualizationContainer.innerHTML = `
                    <p class="no-visualization">No visualization available for question type: ${question.type}</p>
                `;
        }
    } catch (error) {
        console.error(`Error rendering visualization for question ${question.id}:`, error);
        visualizationContainer.innerHTML = `
            <p class="visualization-error">Error rendering visualization: ${error.message}</p>
        `;
    }
    
    return questionResult;
}

/**
 * Create the visualization toolbar
 * @param {Object} question - Question definition
 * @param {string} currentType - Current visualization type
 * @returns {HTMLElement} - Toolbar element
 */
function createVisualizationToolbar(question, currentType) {
    const toolbar = document.createElement('div');
    toolbar.className = 'visualization-toolbar';
    
    // Only show the type selector if there are options for this question type
    const availableTypes = VISUALIZATION_TYPES[question.type] || [];
    if (question.type === QUESTION_TYPES.RANK_OPTIONS) {
        // Add IRV as a special case for the toolbar
        if (!availableTypes.includes('irv')) {
            availableTypes.push('irv');
        }
    }
    if (availableTypes.length > 0) {
        const selector = document.createElement('div');
        selector.className = 'visualization-type-selector';
        
        selector.innerHTML = `
            <label for="viz-type-${question.id}">Chart Type:</label>
            <select id="viz-type-${question.id}">
                ${availableTypes.map(option => `
                    <option value="${option}" ${option === currentType ? 'selected' : ''}>
                        ${formatVisualizationType(option)}
                    </option>
                `).join('')}
            </select>
        `;
        
        // Add change event listener
        const selectElement = selector.querySelector(`#viz-type-${question.id}`);
        selectElement.addEventListener('change', (e) => {
            const newType = e.target.value;
            
            // Save preference
            saveVisualizationPreference(question.id, newType);
            
            // Re-render this question's visualization
            const container = document.getElementById(`viz-${question.id}`);
            container.innerHTML = ''; // Clear container
            
            // Re-create visualization with the new type
            switch (question.type) {
                case QUESTION_TYPES.RADIO:
                    createRadioVisualization(container, getResponsesForQuestion(question.id), question,getResponderLabels(), newType);
                    break;
                case QUESTION_TYPES.CHECKBOX:
                    createCheckboxVisualization(container, getResponsesForQuestion(question.id), question, getResponderLabels(), newType);
                    break;
                case QUESTION_TYPES.SHORT_TEXT:
                case QUESTION_TYPES.LONG_TEXT:
                    createTextSummary(container, getResponsesForQuestion(question.id), question, newType);
                    break;
                case QUESTION_TYPES.MATRIX_2D:
                    createMatrixVisualization(container, getResponsesForQuestion(question.id), question, getResponderLabels(), newType);
                    break;
                case QUESTION_TYPES.LIKERT:
                    createLikertVisualization(container, getResponsesForQuestion(question.id), question, getResponderLabels(), newType);
                    break;
                case QUESTION_TYPES.MULTI_VALUE_SLIDER:
                    createSliderVisualization(container, getResponsesForQuestion(question.id), question, newType);
                    break;
                case QUESTION_TYPES.RANK_OPTIONS:
                    createRankVisualization(container, getResponsesForQuestion(question.id), question, newType);
                    break;
            }
        });
        
        toolbar.appendChild(selector);
    }
    
    return toolbar;
}

/**
 * Get all responses for a specific question
 * @param {string} questionId - Question ID
 * @returns {Array} - Array of responses
 */
function getResponsesForQuestion(questionId) {
    // Apply current filters to the results
    const filteredResults = applyFilters(surveyResults);
    
    return filteredResults.map(response => {
        return response.responses && response.responses[questionId] 
            ? response.responses[questionId].value 
            : null;
    }).filter(Boolean);
}




/**
 * Get labels for filtered responders
 * @returns {Array} - Array of responders labels 
 */
function getResponderLabels() {
    // Apply current filters to the results
    const filteredResults = applyFilters(surveyResults);
    
    return filteredResults.map(response => {
        return response.label;
    }).filter(Boolean);
}


/**
 * Format visualization type for display
 * @param {string} type - Visualization type
 * @returns {string} - Formatted type
 */
function formatVisualizationType(type) {
    if (type === 'irv') {
        return 'Instant-Runoff Voting';
    }
    return type
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between words
}

/**
 * Check if the current user is an admin and set up admin panel
 */
function checkAndSetupAdmin() {
    if (checkIfAdmin()) {
        setupAdminPanel();
    } else {
        // Hide admin panel
        adminPanelElement.style.display = 'none';
    }
}

/**
 * Check if the current user has admin privileges
 * @returns {boolean} - True if the user is an admin
 */
function checkIfAdmin() {
    // For now, always return true for demonstration purposes
    // In a real app, this would check user permissions
    return true;
}

/**
 * Set up the admin panel
 */
function setupAdminPanel() {
    adminPanelElement.innerHTML = `
        <h3>Admin Controls</h3>
        <div class="admin-actions">
            <button id="export-viz-settings" class="btn accent">Export Visualization Settings</button>
            <button id="import-viz-settings" class="btn secondary">Import Settings</button>
        </div>
    `;
    
    // Add event listeners
    document.getElementById('export-viz-settings').addEventListener('click', exportVisualizationSettings);
    document.getElementById('import-viz-settings').addEventListener('click', importVisualizationSettings);
}

/**
 * Export visualization settings
 */
function exportVisualizationSettings() {
    const preferences = getVisualizationPreferences();
    
    // Convert to survey definition format
    const visualizationSettings = {};
    
    Object.entries(preferences).forEach(([questionId, pref]) => {
        visualizationSettings[questionId] = {
            visualization: {
                type: pref.type,
                options: pref.options || {}
            }
        };
    });
    
    // Format as JSON
    const settingsJson = JSON.stringify(visualizationSettings, null, 2);
    
    // Create a download link
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visualization-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Visualization settings exported. You can now copy these settings into your survey definition file.');
}

/**
 * Import visualization settings
 */
function importVisualizationSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const settings = JSON.parse(event.target.result);
                
                // Process and save settings
                Object.entries(settings).forEach(([questionId, data]) => {
                    if (data.visualization && data.visualization.type) {
                        saveVisualizationPreference(questionId, data.visualization.type, data.visualization.options);
                    }
                });
                
                // Re-render results
                renderResults();
                
                alert('Visualization settings imported successfully.');
            } catch (error) {
                console.error('Error importing settings:', error);
                alert('Error importing settings: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    });
    
    input.click();
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initDashboard);
