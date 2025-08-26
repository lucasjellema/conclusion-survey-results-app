/**
 * likertVisualizer.js
 * Visualization component for Likert scale questions
 */

import { aggregateLikertResponses } from '../resultsDataService.js';

/**
 * Create a visualization for Likert scale question responses
 * @param {HTMLElement} container - The DOM element to render the chart in
 * @param {Array} responses - Array of question responses
 * @param {Object} question - The question definition
 * @param {string} [type='heatmap'] - Type of visualization ('heatmap', 'stackedBar')
 */
export function createLikertVisualization(container, responses, question, responseLabels, type = 'heatmap') {
    if (!container || !Array.isArray(responses) || responses.length === 0) {
        container.innerHTML = '<p class="no-data">No data available for this question.</p>';
        return;
    }

    const aggregatedData = aggregateLikertResponses(responses, question, responseLabels);

    if (aggregatedData.totalResponses === 0) {
        container.innerHTML = '<p class="no-data">No responses for this question yet.</p>';
        return;
    }

    switch (type) {
        case 'heatmap':
            renderHeatmap(container, aggregatedData, question);
            break;
        case 'stackedBar':
            renderStackedBarChart(container, aggregatedData, question);
            break;
        default:
            renderHeatmap(container, aggregatedData, question);
    }
}

/**
 * Render a heatmap for Likert responses
 * @param {HTMLElement} container
 * @param {Object} data
 * @param {Object} question
 */
function renderHeatmap(container, data, question) {
    container.innerHTML = '';
    const heatmapContainer = document.createElement('div');
    heatmapContainer.className = 'heatmap-container';

    const table = document.createElement('table');
    table.className = 'heatmap-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const cornerCell = document.createElement('th');
    cornerCell.className = 'heatmap-corner';
    headerRow.appendChild(cornerCell);

    data.likertScaleValues.forEach(value => {
        const th = document.createElement('th');
        th.className = 'heatmap-column-header';
        th.textContent = data.likertScaleLabels[value];
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.options.forEach(option => {
        const tr = document.createElement('tr');
        const rowHeader = document.createElement('th');
        rowHeader.className = 'heatmap-row-header';
        rowHeader.textContent = option.label;
        tr.appendChild(rowHeader);

        data.likertScaleValues.forEach(value => {
            const td = document.createElement('td');
            td.className = 'heatmap-cell';
            const count = data.counts[option.value][value] || 0;
            const percentage = data.percentages[option.value][value] || 0;
            const intensity = Math.min(0.9, percentage / 100 + 0.1);
            td.style.backgroundColor = `rgba(74, 134, 232, ${intensity})`;
            const companies = data.tooltips[option.value][value];
            td.title = `${option.label}  - ${data.likertScaleLabels[value]}: ${count} (${percentage}%)` + (companies ? ` - Companies: ${companies}` : '');
            td.innerHTML = `<span class="cell-value">${count}</span><span class="cell-percentage"> (${percentage}%) </span>`;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    heatmapContainer.appendChild(table);
    container.appendChild(heatmapContainer);
}

/**
 * Render a stacked bar chart for Likert responses
 * @param {HTMLElement} container
 * @param {Object} data
 * @param {Object} question
 */
function renderStackedBarChart(container, data, question) {
    const canvas = document.createElement('canvas');
    canvas.id = `chart-${question.id}`;
    canvas.width = 600;
    canvas.height = Math.max(400, data.options.length * 50);
    container.innerHTML = '';
    container.appendChild(canvas);

    const colors = ['#d5573b', '#e69138', '#f1c232', '#6aa84f', '#4a86e8'];

    const datasets = data.likertScaleValues.map((value, index) => {
        return {
            label: data.likertScaleLabels[value],
            data: data.options.map(option => data.percentages[option.value][value] || 0),
            tt: data.options.map(option => data.tooltips[option.value][value] || ''),
            backgroundColor: colors[index % colors.length],
            borderWidth: 1
        };
    });

    const config = {
        type: 'bar',
        data: {
            labels: data.options.map(option => option.label),
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    max: 100,
                    ticks: {
                        callback: value => value + '%'
                    }
                },
                y: {
                    stacked: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${value.toFixed(1)}% ${context.dataset.tt[context.dataIndex] ? `- Companies: ${context.dataset.tt[context.dataIndex]}` : ''   }`;
                        }
                    }
                }
            }
        }
    };

    new Chart(canvas, config);
}
