/**
 * rangeSliderVisualizer.js
 * 
 * This module renders a visualization for 'rangeSlider' question types.
 * It displays a histogram of the responses.
 */

const rangeSliderVisualizer = {
  /**
   * Renders the visualization for a range slider question.
   * @param {HTMLElement} container - The container to render the visualization in.
   * @param {Object} question - The question object from the survey definition.
   * @param {Array} responses - An array of response objects for this question.
   */
  render: function(container, question, responses) {
    // Check for valid input data
    if (!question.rangeSlider) {
      container.innerHTML = '<p>Question is missing rangeSlider configuration.</p>';
      return;
    }

    if (!responses || responses.length === 0) {
      container.innerHTML = '<p class="no-data">No responses available for this question.</p>';
      return;
    }

    // Create canvas for chart
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Get range settings from question definition
    const min = question.rangeSlider.min || 0;
    const max = question.rangeSlider.max || 100;
    const step = question.rangeSlider.step || 1;
    
    // Calculate number of bins (each bin is one step value)
    const numBins = Math.floor((max - min) / step) + 1;
    
    // Create labels for each bin
    const labels = [];
    for (let i = 0; i < numBins; i++) {
      labels.push((min + i * step).toString());
    }
    
    // Initialize bin counts
    const data = new Array(numBins).fill(0);
    
    // Count responses into bins
    responses.forEach(response => {
      // Handle both direct value and object with value property
      const value = typeof response === 'object' && response !== null ? 
          parseInt(response.value, 10) : 
          parseInt(response, 10);
      
      if (!isNaN(value)) {
        const index = Math.floor((value - min) / step);
        if (index >= 0 && index < numBins) {
          data[index]++;
        }
      }
    });
    
    // Check if we have any valid data
    const hasData = data.some(count => count > 0);
    if (!hasData) {
      container.innerHTML = '<p class="no-data">No valid data available for this question.</p>';
      return;
    }

    // Create the chart
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Number of Responses',
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Frequency'
            }
          },
          x: {
            title: {
              display: true,
              text: question.title
            },
            ticks: {
              // Only show some of the labels to avoid overcrowding
              callback: function(val, index) {
                // Show approximately 5-8 labels depending on range size
                const interval = Math.ceil(labels.length / 6);
                return index % interval === 0 ? this.getLabelForValue(val) : '';
              }
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: `Distribution of Responses for "${question.title}"`
          },
          tooltip: {
            callbacks: {
              title: function(tooltipItems) {
                const item = tooltipItems[0];
                return `Value: ${labels[item.dataIndex]}`;
              },
              label: function(context) {
                return `Responses: ${context.raw}`;
              }
            }
          }
        }
      }
    });
    
    // Add statistics summary
    this.addStatisticsSummary(container, responses);
  },
  
  /**
   * Adds a statistics summary below the chart
   * @param {HTMLElement} container - The container to add the summary to
   * @param {Array} responses - The response data
   */
  addStatisticsSummary: function(container, responses) {
    // Extract numeric values
    const values = responses.map(response => {
      return typeof response === 'object' && response !== null ? 
        parseInt(response.value, 10) : 
        parseInt(response, 10);
    }).filter(val => !isNaN(val));
    
    if (values.length === 0) return;
    
    // Calculate statistics
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / values.length) * 10) / 10;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Create statistics summary element
    const statsElement = document.createElement('div');
    statsElement.className = 'statistics-summary';
    statsElement.innerHTML = `
      <table class="stats-table">
        <tr>
          <th>Responses</th>
          <th>Average</th>
          <th>Min</th>
          <th>Max</th>
          <th>Range</th>
        </tr>
        <tr>
          <td>${values.length}</td>
          <td>${avg}</td>
          <td>${min}</td>
          <td>${max}</td>
          <td>${max - min}</td>
        </tr>
      </table>
    `;
    
    container.appendChild(statsElement);
  }
};

export default rangeSliderVisualizer;
