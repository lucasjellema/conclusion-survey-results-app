/**
 * sliderVisualizer.js
 * Visualization component for multi-value slider questions
 * 
 * This module creates visualizations for multi-value slider questions using
 * various chart types such as histograms, box plots, and line charts.
 */

import { aggregateSliderResponses } from '../resultsDataService.js';

// Constants for visualization types
const VISUALIZATION_TYPES = {
    HISTOGRAM: 'histogram',
    BOXPLOT: 'boxplot',
    STACKED_POSITIONS: 'stackedPositions'
};

/**
 * Create slider visualizations for multi-value slider question responses
 * @param {HTMLElement} container - The DOM element to render the visualization in
 * @param {Array} responses - Array of question responses
 * @param {Object} question - The question definition
 * @param {string} [type='histogram'] - Type of visualization ('histogram', 'boxplot')
 */
export function createSliderVisualization(container, responses, question, type = 'histogram') {
    if (!container || !Array.isArray(responses) || responses.length === 0) {
        container.innerHTML = '<p class="no-data">No data available for this question.</p>';
        return;
    }
    
    // Aggregate responses
    const aggregatedData = aggregateSliderResponses(responses, question);
    
    // Don't render if no data
    if (aggregatedData.totalResponses === 0) {
        container.innerHTML = '<p class="no-data">No responses for this question yet.</p>';
        return;
    }
    
    // Create a completely isolated container for this visualization
    // Clear the main container first
    container.innerHTML = '';
    
    // Create a wrapper to ensure proper isolation
    const vizWrapper = document.createElement('div');
    vizWrapper.className = 'slider-viz-wrapper';
    vizWrapper.dataset.questionId = question.id;
    container.appendChild(vizWrapper);
    
    // Render appropriate visualization based on type
    switch (type) {
        case VISUALIZATION_TYPES.HISTOGRAM:
            renderHistogram(vizWrapper, aggregatedData, question);
            break;
        case VISUALIZATION_TYPES.BOXPLOT:
            renderBoxPlot(vizWrapper, aggregatedData, question);
            break;
        case VISUALIZATION_TYPES.STACKED_POSITIONS:
            renderStackedPositions(vizWrapper, aggregatedData, question);
            break;
        default:
            renderHistogram(vizWrapper, aggregatedData, question);
    }
    
    // Add summary statistics table
    addStatisticsTable(container, aggregatedData);
}

/**
 * Render a histogram visualization for slider responses
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 */
function renderHistogram(container, data, question) {
    // Clear container
    container.innerHTML = '';
    
    // Create canvas for chart
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${question.id}`;
    canvas.width = 600;
    canvas.height = 400;
    container.appendChild(canvas);
    
    // Generate colors for each option
    const colors = [
        '#4a86e8', '#6aa84f', '#e69138', '#8e63ce', '#d5573b',
        '#45818e', '#a64d79', '#674ea7', '#990000', '#0c343d'
    ];
    
    // Create datasets for each option
    const datasets = data.options.map((option, index) => {
        // Look up option label if available
        let optionLabel = option;
        
        if (question.options && Array.isArray(question.options)) {
            const optionObj = question.options.find(opt => opt.value === option);
            if (optionObj && optionObj.label) {
                optionLabel = optionObj.label;
            }
        }
        
        return {
            label: optionLabel,
            data: [data.statistics[option].average],
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length].replace('1)', '0.7)'),
            borderWidth: 1
        };
    });
    
    // Create chart configuration
    const config = {
        type: 'bar',
        data: {
            labels: ['Average Score'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: false,
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Average Rating'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'center'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            const option = data.options[context.datasetIndex];
                            const stats = data.statistics[option];
                            
                            return [
                                `${label}: ${value.toFixed(1)}`,
                                `Range: ${stats.min} - ${stats.max}`,
                                `Responses: ${stats.count}`
                            ];
                        }
                    }
                },
                datalabels: {
                    formatter: (value) => {
                        return value.toFixed(1);
                    },
                    color: '#fff',
                    font: {
                        weight: 'bold'
                    },
                    anchor: 'center',
                    align: 'center'
                }
            }
        }
    };
    
    // Create chart
    new Chart(canvas, config);
}

/**
 * Render a box plot visualization for slider responses
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 */
function renderBoxPlot(container, data, question) {
    // Box plots require more detailed statistics, but since we only have summary stats
    // in our aggregated data, we'll simulate a box plot with bars showing min, max, and average
    
    // Clear container
    container.innerHTML = '';
    
    // Create canvas for chart
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${question.id}-box`;
    canvas.width = 600;
    canvas.height = 400;
    container.appendChild(canvas);
    
    // Generate colors for each option
    const colors = [
        '#4a86e8', '#6aa84f', '#e69138', '#8e63ce', '#d5573b',
        '#45818e', '#a64d79', '#674ea7', '#990000', '#0c343d'
    ];
    
    // Create datasets - one for min values, one for averages, and one for max values
    const minData = [];
    const avgData = [];
    const maxData = [];
    const labels = [];
    
    data.options.forEach(option => {
        const stats = data.statistics[option];
        
        // Look up option label if available
        let optionLabel = option;
        
        if (question.options && Array.isArray(question.options)) {
            const optionObj = question.options.find(opt => opt.value === option);
            if (optionObj && optionObj.label) {
                optionLabel = optionObj.label;
            }
        }
        
        labels.push(optionLabel);
        minData.push(stats.min);
        avgData.push(stats.average);
        maxData.push(stats.max);
    });
    
    // Create chart configuration
    const config = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Minimum',
                    data: minData,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Average',
                    data: avgData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Maximum',
                    data: maxData,
                    backgroundColor: 'rgba(255, 205, 86, 0.5)',
                    borderColor: 'rgba(255, 205, 86, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: false,
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Rating Value'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const datasetLabel = context.dataset.label || '';
                            const value = context.raw || 0;
                            const option = labels[context.dataIndex];
                            
                            return `${option} - ${datasetLabel}: ${value}`;
                        }
                    }
                },
                datalabels: {
                    formatter: (value) => {
                        return value;
                    },
                    color: '#333',
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    anchor: 'center',
                    align: 'center'
                }
            }
        }
    };
    
    // Create chart
    new Chart(canvas, config);
}

/**
 * Render a stacked positions visualization for slider responses
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 */
function renderStackedPositions(container, data, question) {
    // Clear container
    container.innerHTML = '';
    
    // Create canvas for chart
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${question.id}-stacked`;
    canvas.style.width = '100%';
    canvas.style.maxHeight = '500px';
    container.appendChild(canvas);
    
    // Define position ranges - divide the slider range (0-100) into segments
    const ranges = [
        { min: 0, max: 20, label: '0-20' },
        { min: 21, max: 40, label: '21-40' },
        { min: 41, max: 60, label: '41-60' },
        { min: 61, max: 80, label: '61-80' },
        { min: 81, max: 100, label: '81-100' }
    ];
    
    // Count values in each range for each option
    const positionCounts = {};
    data.options.forEach(option => {
        positionCounts[option] = ranges.map(range => {
            // If we have raw values, count them directly, otherwise estimate from statistics
            if (data.rawValues && data.rawValues[option]) {
                return data.rawValues[option].filter(
                    val => val >= range.min && val <= range.max
                ).length;
            } else {
                // Estimate distribution based on min/max/avg
                const stats = data.statistics[option];
                // Simple estimation - this could be improved with more sophisticated distribution modeling
                if (range.min <= stats.average && range.max >= stats.average) {
                    return stats.count * 0.6; // Majority near the average
                } else if (
                    (range.min <= stats.min && range.max >= stats.min) ||
                    (range.min <= stats.max && range.max >= stats.max)
                ) {
                    return stats.count * 0.2; // Some at the edges
                } else {
                    return 0;
                }
            }
        });
    });
    
    // Generate colors for each option
    const colors = [
        '#4a86e8', '#6aa84f', '#e69138', '#8e63ce', '#d5573b',
        '#45818e', '#a64d79', '#674ea7', '#990000', '#0c343d'
    ];
    
    // Create datasets for the chart
    const datasets = data.options.map((option, index) => {
        // Look up option label if available
        let optionLabel = option;
        
        if (data.optionLabels && data.optionLabels[option]) {
            optionLabel = data.optionLabels[option];
        }
        
        return {
            label: optionLabel,
            data: positionCounts[option],
            backgroundColor: colors[index % colors.length],
            borderColor: colors[index % colors.length].replace('1)', '0.7)'),
            borderWidth: 1
        };
    });
    
    // Create chart configuration
    const config = {
        type: 'bar',
        data: {
            labels: ranges.map(range => range.label),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Value Range'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Count'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Distribution of Values by Position Range',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    position: 'top',
                    align: 'center'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${Math.round(value)} responses`;
                        }
                    }
                }
            }
        }
    };
    
    // Create chart
    new Chart(canvas, config);
}

/**
 * Add a statistics table below the chart
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Aggregated data
 */
function addStatisticsTable(container, data) {
    const statsContainer = document.createElement('div');
    statsContainer.className = 'statistics-table-container';
    
    // Create table
    const table = document.createElement('table');
    table.className = 'statistics-table';
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    headerRow.innerHTML = `
        <th>Option</th>
        <th>Average</th>
        <th>Min</th>
        <th>Max</th>
        <th>Responses</th>
    `;
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    data.options.forEach(option => {
        const stats = data.statistics[option];
        const row = document.createElement('tr');
        
        // Look up option label if available
        let optionLabel = option;
        
        if (data.optionLabels && data.optionLabels[option]) {
            optionLabel = data.optionLabels[option];
        }
        
        row.innerHTML = `
            <td>${optionLabel}</td>
            <td>${stats.average.toFixed(1)}</td>
            <td>${stats.min}</td>
            <td>${stats.max}</td>
            <td>${stats.count}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    statsContainer.appendChild(table);
    container.appendChild(statsContainer);
    
    // Apply specific classes instead of adding inline styles
    statsContainer.classList.add('slider-stats-container');
    table.classList.add('slider-stats-table');
}
