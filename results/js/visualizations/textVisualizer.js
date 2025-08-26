/**
 * textVisualizer.js
 * Visualization component for text questions (short and long)
 * 
 * This module creates visualizations and summaries for text-based responses
 * including word clouds, response lists, and basic statistics.
 */

import { aggregateTextResponses } from '../resultsDataService.js';

/**
 * Create a visualization/summary for text question responses
 * @param {HTMLElement} container - The DOM element to render the visualization in
 * @param {Array} responses - Array of question responses
 * @param {Object} question - The question definition
 * @param {string} [type='wordcloud'] - Type of visualization ('wordcloud')
 */
export function createTextSummary(container, responses, question, type = 'wordcloud ') {
    if (!container || !Array.isArray(responses) || responses.length === 0) {
        container.innerHTML = '<p class="no-data">No data available for this question.</p>';
        return;
    }
    
    // Aggregate responses
    const aggregatedData = aggregateTextResponses(responses);
    
    // Don't render if no data
    if (aggregatedData.totalResponses === 0) {
        container.innerHTML = '<p class="no-data">No responses for this question yet.</p>';
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    
    // Add a dedicated button to view all responses in modal
    const viewAllButton = document.createElement('button');
    viewAllButton.className = 'btn primary view-all-responses';
    viewAllButton.textContent = `View All ${aggregatedData.totalResponses} Responses`;
    viewAllButton.style.marginBottom = '20px';
    
    viewAllButton.addEventListener('click', () => {
        // Create and show the responses modal
        showResponsesModal(question, responses);
    });
    
    container.appendChild(viewAllButton);
    
    // Render appropriate visualization based on type
    switch (type) {
        case 'wordcloud':
            renderWordCloud(container, aggregatedData, question);
            break;
        default:
            renderWordCloud(container, aggregatedData, question);
    }
}

/**
 * Render a word cloud visualization
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 */
function renderWordCloud(container, data, question) {
    const wordcloudContainer = document.createElement('div');
    wordcloudContainer.className = 'wordcloud-container';
    wordcloudContainer.style.height = '300px';
    wordcloudContainer.style.position = 'relative';
    
    // Add placeholder for wordcloud libraries
    // In a production environment, you would use a dedicated word cloud library
    // like d3-cloud or wordcloud2.js
    
    // Since we don't want to add external dependencies for this example,
    // we'll create a simple visual representation
    
    // Sort words by frequency
    const words = [...data.topWords].sort((a, b) => b.weight - a.weight);
    
    // Calculate maximum weight for scaling
    const maxWeight = Math.max(...words.map(w => w.weight));
    
    // Create simple word cloud visualization
    const simpleCloud = document.createElement('div');
    simpleCloud.className = 'simple-wordcloud';
    simpleCloud.style.display = 'flex';
    simpleCloud.style.flexWrap = 'wrap';
    simpleCloud.style.justifyContent = 'center';
    simpleCloud.style.alignItems = 'center';
    simpleCloud.style.padding = '20px';
    
    words.forEach(word => {
        const wordElement = document.createElement('span');
        const fontSize = Math.max(14, Math.min(48, 14 + (word.weight / maxWeight) * 34));
        const opacity = 0.5 + (word.weight / maxWeight) * 0.5;
        
        wordElement.textContent = word.text;
        wordElement.style.fontSize = `${fontSize}px`;
        wordElement.style.padding = '5px 8px';
        wordElement.style.margin = '5px';
        wordElement.style.color = `rgba(74, 134, 232, ${opacity})`;
        wordElement.style.fontWeight = fontSize > 25 ? 'bold' : 'normal';
        wordElement.title = `${word.text}: ${word.weight} occurrences`;
        
        simpleCloud.appendChild(wordElement);
    });
    
    wordcloudContainer.appendChild(simpleCloud);
    container.appendChild(wordcloudContainer);
    
    // Add note about word cloud
    const note = document.createElement('p');
    note.className = 'wordcloud-note';
    note.textContent = 'Word cloud shows the most frequent words from all responses, with larger words appearing more frequently.';
    note.style.fontSize = '12px';
    note.style.color = '#666';
    note.style.textAlign = 'center';
    note.style.marginTop = '10px';
    container.appendChild(note);
}


/**
 * Create and show a modal with all responses and filtering capability
 * @param {Object} question - The question definition
 * @param {Array} responses - Array of all responses to display
 */
function showResponsesModal(question, responses) {
    // Create modal container
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content responses-modal';
    
    // Add modal header with title and close button
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    modalHeader.innerHTML = `
        <h3>All Responses: ${question.title}</h3>
        <button class="modal-close" aria-label="Close modal">&times;</button>
    `;
    modalContent.appendChild(modalHeader);
    
    // Add filter section
    const filterSection = document.createElement('div');
    filterSection.className = 'filter-section';
    filterSection.innerHTML = `
        <div class="filter-input-container">
            <input type="text" id="response-filter" class="filter-input" placeholder="Filter responses..." />
            <span class="filter-icon">🔍</span>
        </div>
        <div class="filter-stats">
            <span id="filter-count">${responses.length}</span> responses
        </div>
    `;
    modalContent.appendChild(filterSection);
    
    // Add responses container
    const responsesContainer = document.createElement('div');
    responsesContainer.className = 'responses-container';
    modalContent.appendChild(responsesContainer);
    
    // Add pagination if necessary
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    modalContent.appendChild(paginationContainer);
    
    // Add modal to DOM
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Add event listener to close modal
    const closeButton = modalHeader.querySelector('.modal-close');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });
    
    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
    
    // Add escape key listener
    const escListener = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(modalOverlay);
            document.removeEventListener('keydown', escListener);
        }
    };
    document.addEventListener('keydown', escListener);
    
    // Initialize the response list with pagination
    const itemsPerPage = 10;
    let currentPage = 1;
    let filteredResponses = [...responses];
    
    // Filter listener
    const filterInput = filterSection.querySelector('#response-filter');
    filterInput.addEventListener('input', () => {
        const filterValue = filterInput.value.toLowerCase().trim();
        
        // Filter responses
        if (filterValue) {
            filteredResponses = responses.filter(response => {
                // Handle different response formats (string or object)
                const text = typeof response === 'object' ? 
                    (response.value || '').toString().toLowerCase() : 
                    (response || '').toString().toLowerCase();
                
                return text.includes(filterValue);
            });
        } else {
            filteredResponses = [...responses];
        }
        
        // Update filter count
        const filterCount = filterSection.querySelector('#filter-count');
        filterCount.textContent = filteredResponses.length;
        
        // Reset pagination to first page
        currentPage = 1;
        
        // Re-render responses
        renderResponsePage(filteredResponses, responsesContainer, paginationContainer, currentPage, itemsPerPage);
    });
    
    // Initial render
    renderResponsePage(filteredResponses, responsesContainer, paginationContainer, currentPage, itemsPerPage);
    
    // Set focus on filter input
    setTimeout(() => filterInput.focus(), 100);
}

/**
 * Render a page of responses with pagination
 * @param {Array} responses - Filtered responses to display
 * @param {HTMLElement} container - Container to render responses in
 * @param {HTMLElement} paginationContainer - Container for pagination controls
 * @param {Number} currentPage - Current page number
 * @param {Number} itemsPerPage - Number of items to show per page
 */
function renderResponsePage(responses, container, paginationContainer, currentPage, itemsPerPage) {
    // Clear container
    container.innerHTML = '';
    
    // Calculate pagination
    const totalPages = Math.ceil(responses.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, responses.length);
    
    // No responses
    if (responses.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No responses match your filter criteria.';
        container.appendChild(emptyState);
        
        // Clear pagination
        paginationContainer.innerHTML = '';
        return;
    }
    
    // Create response list
    const responseList = document.createElement('div');
    responseList.className = 'response-list';
    

    // created a randomly sorted array of responses
    const shuffledResponses = responses.sort(() => 0.5 - Math.random());

    // Add responses for current page
    for (let i = startIdx; i < endIdx; i++) {
        const response = shuffledResponses[i];
        const text = typeof response === 'object' ? 
            (response.value || '').toString() : 
            (response || '').toString();
        
        const responseItem = document.createElement('div');
        responseItem.className = 'response-item';
        
        responseItem.innerHTML = `
            <div class="response-number">#${i + 1}</div>
            <div class="response-text">${text}</div>
        `;
        
        responseList.appendChild(responseItem);
    }
    
    container.appendChild(responseList);
    
    // Render pagination controls if needed
    renderPagination(responses, paginationContainer, currentPage, totalPages, itemsPerPage, (newPage) => {
        // Update current page and re-render
        currentPage = newPage;
        renderResponsePage(responses, container, paginationContainer, currentPage, itemsPerPage);
    });
}

/**
 * Render pagination controls
 * @param {Array} responses - All filtered responses
 * @param {HTMLElement} container - Container for pagination controls
 * @param {Number} currentPage - Current page number
 * @param {Number} totalPages - Total number of pages
 * @param {Number} itemsPerPage - Items per page
 * @param {Function} onPageChange - Callback when page changes
 */
function renderPagination(responses, container, currentPage, totalPages, itemsPerPage, onPageChange) {
    // Clear container
    container.innerHTML = '';
    
    // Don't show pagination if not needed
    if (totalPages <= 1) {
        return;
    }
    
    // Create pagination controls
    const pagination = document.createElement('div');
    pagination.className = 'pagination';
    
    // Prev button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-button prev';
    prevButton.textContent = '←';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    });
    pagination.appendChild(prevButton);
    
    // Page number buttons
    const totalDisplayPages = 5; // Number of page buttons to show
    let startPage = Math.max(1, currentPage - Math.floor(totalDisplayPages / 2));
    let endPage = Math.min(totalPages, startPage + totalDisplayPages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < totalDisplayPages) {
        startPage = Math.max(1, endPage - totalDisplayPages + 1);
    }
    
    // First page button if needed
    if (startPage > 1) {
        const firstButton = document.createElement('button');
        firstButton.className = 'pagination-button';
        firstButton.textContent = '1';
        firstButton.addEventListener('click', () => onPageChange(1));
        pagination.appendChild(firstButton);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }
    }
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = 'pagination-button';
        if (i === currentPage) {
            pageButton.classList.add('active');
        }
        pageButton.textContent = i.toString();
        pageButton.addEventListener('click', () => onPageChange(i));
        pagination.appendChild(pageButton);
    }
    
    // Last page button if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            pagination.appendChild(ellipsis);
        }
        
        const lastButton = document.createElement('button');
        lastButton.className = 'pagination-button';
        lastButton.textContent = totalPages.toString();
        lastButton.addEventListener('click', () => onPageChange(totalPages));
        pagination.appendChild(lastButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-button next';
    nextButton.textContent = '→';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    });
    pagination.appendChild(nextButton);
    
    // Page info
    const pageInfo = document.createElement('div');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${responses.length} responses)`;
    pagination.appendChild(pageInfo);
    
    container.appendChild(pagination);
}
