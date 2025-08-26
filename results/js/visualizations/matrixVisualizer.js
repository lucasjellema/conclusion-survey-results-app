/**
 * matrixVisualizer.js
 * Visualization component for matrix questions
 * 
 * This module creates visualizations for matrix-type questions using
 * various chart types such as heatmaps, grouped bars, and bubble charts.
 */

import { aggregateMatrixResponses } from '../resultsDataService.js';

/**
 * Create a visualization for matrix question responses
 * @param {HTMLElement} container - The DOM element to render the chart in
 * @param {Array} responses - Array of question responses
 * @param {Object} question - The question definition
 * @param {string} [type='heatmap'] - Type of visualization ('heatmap', 'groupedBar', 'bubble', 'radar')
 */
export function createMatrixVisualization(container, responses, question, responseLabels, type = 'heatmap') {
    if (!container || !Array.isArray(responses) || responses.length === 0) {
        container.innerHTML = '<p class="no-data">No data available for this question.</p>';
        return;
    }
    
    // Aggregate responses
    const aggregatedData = aggregateMatrixResponses(responses, question, responseLabels);
    
    // Don't render if no data
    if (aggregatedData.totalResponses === 0) {
        container.innerHTML = '<p class="no-data">No responses for this question yet.</p>';
        return;
    }
    
    // Render appropriate chart based on type
    switch (type) {
        case 'heatmap':
            renderHeatmap(container, aggregatedData, question);
            break;
        case 'groupedBar':
            renderGroupedBarChart(container, aggregatedData, question);
            break;
        case 'bubble':
            renderBubbleChart(container, aggregatedData, question);
            break;
        case 'radar':
            renderRadarChart(container, aggregatedData, question);
            break;
        default:
            renderHeatmap(container, aggregatedData, question);
    }
}

/**
 * Render a heatmap visualization for matrix responses
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 */
function renderHeatmap(container, data, question) {
    // Clear container
    container.innerHTML = '';
    
    // Create heatmap container
    const heatmapContainer = document.createElement('div');
    heatmapContainer.className = 'heatmap-container';
    
    // Create table for heatmap
    const table = document.createElement('table');
    table.className = 'heatmap-table';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add empty cell for top-left corner
    const cornerCell = document.createElement('th');
    cornerCell.className = 'heatmap-corner';
    headerRow.appendChild(cornerCell);
    
    // Add column headers
    data.columns.forEach(column => {
        const th = document.createElement('th');
        th.className = 'heatmap-column-header';
        th.textContent = column.label;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create table body
    const tbody = document.createElement('tbody');
    
    // Add row data
    data.rows.forEach(row => {
        const tr = document.createElement('tr');
        
        // Add row header
        const rowHeader = document.createElement('th');
        rowHeader.className = 'heatmap-row-header';
        rowHeader.textContent = row.label;
        tr.appendChild(rowHeader);
        
        // Add cells with heat values
        data.columns.forEach(column => {
            const td = document.createElement('td');
            td.className = 'heatmap-cell';
            
            const count = data.counts[row.id][column.id] || 0;
            const percentage = data.percentages[row.id][column.id] || 0;
            const tooltip = data.tooltips[row.id][column.id] || '';
            
            // Calculate color intensity based on percentage
            const intensity = Math.min(0.9, percentage / 100 + 0.1);
            td.style.backgroundColor = `rgba(74, 134, 232, ${intensity})`;
            
            // Set tooltip data
            td.title = `${row.label} - ${column.label}: ${count} (${percentage}%) ${tooltip}`;
            
            // Add content
            td.innerHTML = `<span class="cell-value">${count}</span><span class="cell-percentage">${percentage}%</span>`;
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    heatmapContainer.appendChild(table);
    container.appendChild(heatmapContainer);
    
    // Add legend
    const legend = document.createElement('div');
    legend.className = 'heatmap-legend';
    legend.innerHTML = `
        <div class="legend-title">Color Intensity</div>
        <div class="legend-scale">
            <div class="legend-item" style="background-color: rgba(74, 134, 232, 0.1);"></div>
            <div class="legend-item" style="background-color: rgba(74, 134, 232, 0.3);"></div>
            <div class="legend-item" style="background-color: rgba(74, 134, 232, 0.5);"></div>
            <div class="legend-item" style="background-color: rgba(74, 134, 232, 0.7);"></div>
            <div class="legend-item" style="background-color: rgba(74, 134, 232, 0.9);"></div>
        </div>
        <div class="legend-labels">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
        </div>
    `;
    container.appendChild(legend);
    
    // Add some CSS for the heatmap
    const style = document.createElement('style');
    style.textContent = `
        .heatmap-container {
            margin: 20px 0;
            overflow-x: auto;
        }
        .heatmap-table {
            border-collapse: collapse;
            width: 100%;
        }
        .heatmap-table th, .heatmap-table td {
            text-align: center;
            padding: 10px;
            border: 1px solid #ddd;
        }
        .heatmap-corner {
            background-color: #f5f5f5;
        }
        .heatmap-row-header {
            text-align: left;
            background-color: #f5f5f5;
            font-weight: 500;
        }
        .heatmap-column-header {
            background-color: #f5f5f5;
            font-weight: 500;
        }
        .heatmap-cell {
            position: relative;
            width: 70px;
            height: 70px;
        }
        .cell-value {
            display: block;
            font-size: 18px;
            font-weight: bold;
        }
        .cell-percentage {
            display: block;
            font-size: 12px;
            opacity: 0.8;
        }
        .heatmap-legend {
            margin-top: 20px;
            text-align: center;
        }
        .legend-title {
            font-size: 12px;
            margin-bottom: 5px;
        }
        .legend-scale {
            display: flex;
            justify-content: center;
            margin: 0 auto;
            width: 200px;
        }
        .legend-item {
            flex-grow: 1;
            height: 15px;
        }
        .legend-labels {
            display: flex;
            justify-content: space-between;
            width: 200px;
            margin: 5px auto 0;
            font-size: 11px;
        }
    `;
    container.appendChild(style);
}

/**
 * Render a grouped bar chart for matrix responses
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 */
function renderGroupedBarChart(container, data, question) {
    // Create canvas for chart
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${question.id}`;
    canvas.width = 600;
    canvas.height = Math.max(400, data.rows.length * 50);
    
    // Clear container and add canvas
    container.innerHTML = '';
    container.appendChild(canvas);
    
    // Generate colors for each column
    const colors = [
        '#4a86e8', '#6aa84f', '#e69138', '#8e63ce', '#d5573b',
        '#45818e', '#a64d79', '#674ea7', '#990000', '#0c343d'
    ];
    
    // Create datasets for each column
    const datasets = data.columns.map((column, index) => {
        const columnData = data.rows.map(row => data.counts[row.id][column.id] || 0);
        
        return {
            label: column.label,
            data: columnData,
            backgroundColor: colors[index % colors.length],
            borderWidth: 1
        };
    });
    
    // Create chart configuration
    const config = {
        type: 'bar',
        data: {
            labels: data.rows.map(row => row.label),
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            const rowId = data.rows[context.dataIndex].id;
                            const colId = data.columns[context.datasetIndex].id;
                            const percentage = data.percentages[rowId][colId] || 0;
                            const tooltip = data.tooltips[rowId][colId] || '';

                            return `${label}: ${value} (${percentage}%) ${tooltip}`;
                        }
                    }
                },
                datalabels: {
                    display: false // Too cluttered for grouped bars
                }
            },
            scales: {
                x: {
                    stacked: false,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Responses'
                    }
                },
                y: {
                    stacked: false
                }
            }
        }
    };
    
    // Create chart
    new Chart(canvas, config);
}

/**
 * Render a bubble chart for matrix responses
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 */
function renderBubbleChart(container, data, question) {
    // Create canvas for chart
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${question.id}`;
    canvas.width = 600;
    canvas.height = 500;
    
    // Clear container and add canvas
    container.innerHTML = '';
    container.appendChild(canvas);
    
    // Generate bubble data
    const bubbleData = [];
    const maxCount = Math.max(...data.rows.flatMap(row => 
        data.columns.map(col => data.counts[row.id][col.id] || 0)
    ));
    
    data.rows.forEach((row, rowIndex) => {
        data.columns.forEach((col, colIndex) => {
            const count = data.counts[row.id][col.id] || 0;
            
            if (count > 0) {
                bubbleData.push({
                    x: colIndex,
                    y: rowIndex,
                    r: Math.max(5, Math.sqrt(count / maxCount) * 25), // Scale bubble size
                    count: count,
                    percentage: data.percentages[row.id][col.id] || 0,
                    rowLabel: row.label,
                    colLabel: col.label,
                    // Add tooltip data
                    tooltip: data.tooltips[row.id][col.id] || ''
                });
            }
        });
    });
    
    // Create chart configuration
    const config = {
        type: 'bubble',
        data: {
            datasets: [{
                data: bubbleData,
                backgroundColor: 'rgba(74, 134, 232, 0.7)',
                borderColor: 'rgba(74, 134, 232, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    min: -0.5,
                    max: data.columns.length - 0.5,
                    ticks: {
                        callback: function(value) {
                            return data.columns[value]?.label || '';
                        }
                    }
                },
                y: {
                    min: -0.5,
                    max: data.rows.length - 0.5,
                    ticks: {
                        callback: function(value) {
                            return data.rows[value]?.label || '';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const dataPoint = context.raw;
                            
                            return `${dataPoint.rowLabel} - ${dataPoint.colLabel}: ${dataPoint.count} (${dataPoint.percentage}%) ${dataPoint.tooltip}`;
                        }
                    }
                },
                datalabels: {
                    formatter: (value) => {
                        return value.count;
                    },
                    color: '#fff',
                    font: {
                        weight: 'bold'
                    },
                    display: (context) => {
                        return context.raw.r > 10;
                    }
                }
            }
        }
    };
    
    // Create chart
    new Chart(canvas, config);
}

/**
 * Render a radar chart for matrix responses
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 */
function renderRadarChart(container, data, question) {
    // Create canvas for chart
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${question.id}`;
    canvas.width = 600;
    canvas.height = 600;
    
    // Clear container and add canvas
    container.innerHTML = '';
    container.appendChild(canvas);
    
    // Generate colors for each row
    const colors = [
        'rgba(74, 134, 232, 0.7)', 'rgba(106, 168, 79, 0.7)', 'rgba(230, 145, 56, 0.7)', 
        'rgba(142, 99, 206, 0.7)', 'rgba(213, 87, 59, 0.7)', 'rgba(69, 129, 142, 0.7)',
        'rgba(166, 77, 121, 0.7)', 'rgba(103, 78, 167, 0.7)', 'rgba(153, 0, 0, 0.7)',
        'rgba(12, 52, 61, 0.7)'
    ];
    
    // Create datasets for each row
    const datasets = data.rows.map((row, index) => {
        const rowData = data.columns.map(col => data.counts[row.id][col.id] || 0);
        
        return {
            label: row.label,
            data: rowData,
            backgroundColor: colors[index % colors.length].replace('0.7', '0.2'),
            borderColor: colors[index % colors.length].replace('0.7', '1'),
            borderWidth: 1,
            pointBackgroundColor: colors[index % colors.length].replace('0.7', '1')
        };
    });
    
    // Create chart configuration
    const config = {
        type: 'radar',
        data: {
            labels: data.columns.map(col => col.label),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            const rowId = data.rows[context.datasetIndex].id;
                            const colId = data.columns[context.dataIndex].id;
                            const percentage = data.percentages[rowId][colId] || 0;
                            const tooltip = data.tooltips[rowId][colId] || '';
                            return `${label}: ${value} (${percentage}%) ${tooltip}`;
                        }
                    }
                },
                datalabels: {
                    display: false // Too cluttered for radar chart
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    angleLines: {
                        display: true
                    }
                }
            }
        }
    };
    
    // Create chart
    new Chart(canvas, config);
}
