/**
 * radioVisualizer.js
 * Visualization component for radio button questions
 * 
 * This module creates visualizations for radio-type questions (single selection)
 * using various chart types such as pie, doughnut, and bar charts.
 */

import { aggregateRadioResponses } from '../resultsDataService.js';

/**
 * Create a visualization for radio question responses
 * @param {HTMLElement} container - The DOM element to render the chart in
 * @param {Array} responses - Array of question responses
 * @param {Object} question - The question definition
 * @param {string} [type='pie'] - Type of visualization ('pie', 'doughnut', 'horizontalBar', 'verticalBar')
 */
export function createRadioVisualization(container, responses, question,  responseLabels,type = 'pie') {
    if (!container || !Array.isArray(responses) || responses.length === 0) {
        container.innerHTML = '<p class="no-data">No data available for this question.</p>';
        return;
    }
    
    // Aggregate responses
    const aggregatedData = aggregateRadioResponses(responses, question,responseLabels);
    
    // Don't render if no data
    if (aggregatedData.total === 0) {
        container.innerHTML = '<p class="no-data">No responses for this question yet.</p>';
        return;
    }
    
    // Render appropriate chart based on type
    switch (type) {
        case 'pie':
            renderPieChart(container, aggregatedData, question);
            break;
        case 'doughnut':
            renderDoughnutChart(container, aggregatedData, question);
            break;
        case 'horizontalBar':
            renderBarChart(container, aggregatedData, question, true);
            break;
        case 'verticalBar':
            renderBarChart(container, aggregatedData, question, false);
            break;
        default:
            renderPieChart(container, aggregatedData, question);
    }
    
    // Add a legend for accessibility
    addLegend(container, aggregatedData);
}

/**
 * Render a pie chart
 * @param {HTMLElement} container - Chart container
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 */
function renderPieChart(container, data, question) {
    // Create canvas for chart
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${question.id}`;
    canvas.width = 400;
    canvas.height = 400;
    
    // Clear container and add canvas
    container.innerHTML = '';
    container.appendChild(canvas);
    
    // Create chart configuration
    const config = {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        boxWidth: 15,
                        padding: 15,
                        usePointStyle: true
                    },
                    display: true,
                    maxWidth: 350
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = data.percentages[context.dataIndex];
                            const associatedLabels = data.tooltipLabels[context.dataIndex] || [];
                            return `${label}: ${value} (${percentage}%)${associatedLabels}`;
                        }
                    }
                },
                datalabels: {
                    formatter: (value, context) => {
                        return data.percentages[context.dataIndex] + '%';
                    },
                    color: '#fff',
                    font: {
                        weight: 'bold'
                    }
                }
            }
        }
    };
    
    // Create chart
    new Chart(canvas, config);
}

/**
 * Render a doughnut chart
 * @param {HTMLElement} container - Chart container
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 */
function renderDoughnutChart(container, data, question) {
    // Create canvas for chart
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${question.id}`;
    canvas.width = 400;
    canvas.height = 400;
    
    // Clear container and add canvas
    container.innerHTML = '';
    container.appendChild(canvas);
    
    // Create chart configuration
    const config = {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '50%',
            plugins: {
                legend: {
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        boxWidth: 15,
                        padding: 15,
                        usePointStyle: true
                    },
                    display: true,
                    maxWidth: 350
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = data.percentages[context.dataIndex];
                           const associatedLabels = data.tooltipLabels[context.dataIndex] || [];

                            return `${label}: ${value} (${percentage}%)${associatedLabels}`;
                        }
                    }
                },
                datalabels: {
                    formatter: (value, context) => {
                        return data.percentages[context.dataIndex] + '%';
                    },
                    color: '#fff',
                    font: {
                        weight: 'bold'
                    }
                }
            }
        }
    };
    
    // Create chart
    new Chart(canvas, config);
}

/**
 * Render a bar chart
 * @param {HTMLElement} container - Chart container
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 * @param {boolean} horizontal - Whether to render a horizontal bar chart
 */
function renderBarChart(container, data, question, horizontal = false) {
    // Create canvas for chart
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${question.id}`;
    canvas.width = 600;
    canvas.height = 400;
    
    // Clear container and add canvas
    container.innerHTML = '';
    container.appendChild(canvas);
    
    // Create chart configuration
    const config = {
        type: horizontal ? 'bar' : 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: horizontal ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const percentage = data.percentages[context.dataIndex];
                            const associatedLabels = data.tooltipLabels[context.dataIndex] || [];
                            return `${label}: ${value} (${percentage}%)${associatedLabels}`;
                        }
                    }
                },
                datalabels: {
                    formatter: (value, context) => {
                        return value; // Show raw value on the bar
                    },
                    color: function(context) {
                        const value = context.dataset.data[context.dataIndex];
                        return value > 5 ? '#fff' : '#333'; // Change text color based on bar height
                    },
                    font: {
                        weight: 'bold'
                    },
                    anchor: horizontal ? 'end' : 'end',
                    align: horizontal ? 'right' : 'top',
                    offset: 4
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        display: !horizontal,
                    },
                    title: {
                        display: !horizontal,
                        text: 'Number of Responses',
                        padding: {
                            top: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        display: horizontal,
                    },
                    title: {
                        display: horizontal,
                        text: 'Number of Responses',
                        padding: {
                            bottom: 10
                        }
                    }
                }
            },
            layout: {
                padding: {
                    left: 10,
                    right: 30,
                    top: 20,
                    bottom: 10
                }
            }
        }
    };
    
    // Create chart
    new Chart(canvas, config);
}

/**
 * Add accessible text legend below chart
 * @param {HTMLElement} container - Chart container
 * @param {Object} data - Aggregated data
 */
function addLegend(container, data) {
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    
    // Create a list of items with color indicators
    const list = document.createElement('ul');
    
    data.labels.forEach((label, index) => {
        const item = document.createElement('li');
        
        const colorBox = document.createElement('span');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = data.colors[index];
        
        item.appendChild(colorBox);
        item.appendChild(document.createTextNode(
            `${label}: ${data.data[index]} (${data.percentages[index]}%)`
        ));
        
        list.appendChild(item);
    });
    
    legend.appendChild(list);
   // container.appendChild(legend);
}
