/**
 * questionRenderersMultiValueSliderD3.js
 * D3.js-based implementation of the multi-value slider question renderer
 */

import * as surveyData from './surveyData.js';
import { fixSvgRectDimensions } from './svgRectValidator.js';
// We already have D3.js imported in the main HTML file

// Constants
const SLIDER_MARGIN = { top: 40, right: 20, bottom: 40, left: 20 };
const BASE_SLIDER_HEIGHT = 300; // Base height for few options
const MIN_OPTION_SPACING = 60; // Minimum vertical space per option
const OPTION_RADIUS = 20;

/**
 * Render a multi-value slider question using D3.js and SVG
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
export function renderMultiValueSlider(question) {
  // Create the container for the question
  const container = document.createElement('div');
  container.className = 'question-container';
  container.id = `question-${question.id}`;
  
  // Add the question title and description
  const titleEl = document.createElement('h3');
  titleEl.className = 'question-title';
  titleEl.textContent = question.title;
  container.appendChild(titleEl);
  
  if (question.description) {
    const descEl = document.createElement('p');
    descEl.className = 'question-description';
    descEl.textContent = question.description;
    container.appendChild(descEl);
  }
  
  // Create the slider container
  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'multi-value-slider-container';
  container.appendChild(sliderContainer);
  
  // Get slider configuration
  const multiValueSlider = question.multiValueSlider || {};
  const mode = multiValueSlider.mode || 'discrete';
  const options = multiValueSlider.options || [];
  const showLabels = multiValueSlider.showLabels !== false;
  const showLegend = multiValueSlider.showLegend !== false;
  
  // Create D3 slider when the container is added to the DOM
  setTimeout(() => {
    createD3Slider(sliderContainer, multiValueSlider, question.id);
    
    // Fix any SVG rect elements with negative width or height
    fixSvgRectDimensions();
  }, 0);
  
  // Add comment field if allowed
  if (question.allowComment) {
    const commentField = createCommentField(question);
    container.appendChild(commentField);
  }
  
  return container;
}

/**
 * Create a comment field for the question
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The comment field element
 */
function createCommentField(question) {
  const commentContainer = document.createElement('div');
  commentContainer.className = 'question-comment-container';
  
  const commentLabel = document.createElement('label');
  commentLabel.setAttribute('for', `comment-${question.id}`);
  commentLabel.textContent = 'Additional comments:';
  commentContainer.appendChild(commentLabel);
  
  const commentInput = document.createElement('textarea');
  commentInput.id = `comment-${question.id}`;
  commentInput.className = 'question-comment';
  commentInput.rows = 2;
  commentContainer.appendChild(commentInput);
  
  // Load existing comment if available
  const existingResponse = surveyData.getResponse(question.id);
  if (existingResponse && existingResponse.comment) {
    commentInput.value = existingResponse.comment;
  }
  
  // Save comment when it changes
  commentInput.addEventListener('change', (e) => {
    const currentResponse = surveyData.getResponse(question.id) || {};
    surveyData.saveResponse(question.id, {
      value: currentResponse.value || {},
      comment: e.target.value
    });
  });
  
  return commentContainer;
}

/**
 * Create the D3.js-based multi-value slider
 * @param {HTMLElement} container - The container element
 * @param {Object} config - The slider configuration
 * @param {string} questionId - The question ID
 */
function createD3Slider(container, config, questionId) {
  // Ensure container has a minimum width
  if (container.clientWidth < 100) {
    container.style.minWidth = '300px';
  }
  
  // Extract configuration for sizing calculations
  const configOptions = config.options || [];
  
  // Calculate dimensions with safety checks
  const calculatedWidth = Math.max(container.clientWidth - SLIDER_MARGIN.left - SLIDER_MARGIN.right, 200);
  
  // Calculate dynamic height based on number of options
  // Use at least BASE_SLIDER_HEIGHT, but increase if we have many options
  const optionCount = configOptions.length;
  const recommendedHeight = Math.max(
    BASE_SLIDER_HEIGHT,
    optionCount * MIN_OPTION_SPACING
  );
  
  const calculatedHeight = Math.max(recommendedHeight - SLIDER_MARGIN.top - SLIDER_MARGIN.bottom, 200);
  
  // Store these safe dimensions for reuse
  const width = calculatedWidth;
  const height = calculatedHeight;
  console.log(`Creating slider with dimensions: ${width}x${height} for ${optionCount} options`);
  
  // Create SVG element with explicit positive dimensions
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + SLIDER_MARGIN.left + SLIDER_MARGIN.right)
    .attr('height', height + SLIDER_MARGIN.top + SLIDER_MARGIN.bottom)
    .append('g')
    .attr('transform', `translate(${SLIDER_MARGIN.left},${SLIDER_MARGIN.top})`);
  
  // Horizontal scale
  const x = d3.scaleLinear()
    .domain([0, 100])
    .range([0, width])
    .clamp(true);
  
  // Store scale on the node for future reference
  svg.node().__scale = x;
  
  // Extract configuration
  const mode = config.mode || 'discrete';
  const options = config.options || [];
  const showLabels = config.showLabels !== false;
  const showLegend = config.showLegend !== false;
  
  // Create slider track background with guaranteed positive dimensions
  svg.append('rect')
    .attr('class', 'slider-track-bg')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', width)
    .attr('height', height)
    .attr('rx', 10)
    .attr('ry', 10)
    .attr('fill', '#e9ecef');
  
  // Discrete mode: draw zones
  if (mode === 'discrete' && config.zones && config.zones.length > 0) {
    console.log('Creating zones:', config.zones.length);
    
    config.zones.forEach(zone => {
      // Ensure start and end values are valid
      const safeStart = Math.max(0, Math.min(zone.start, 100));
      const safeEnd = Math.max(safeStart + 1, Math.min(zone.end, 100));
      
      const zoneStart = x(safeStart);
      const zoneEnd = x(safeEnd);
      const zoneWidth = Math.max(zoneEnd - zoneStart, 1); // Ensure positive width
      
      console.log(`Zone ${zone.id}: start=${zoneStart}, width=${zoneWidth}`);
      
      // Create zone rectangle with guaranteed positive dimensions
      const zoneRect = svg.append('rect')
        .attr('class', 'slider-zone')
        .attr('data-zone-id', zone.id)
        .attr('x', zoneStart)
        .attr('y', 0)
        .attr('width', zoneWidth)
        .attr('height', height)
        .attr('fill', zone.color || '#ffffff')
        .attr('rx', 10)
        .attr('ry', 10)
        .attr('opacity', 0.8);
      
      // Add zone label if enabled
      if (showLabels && zone.label) {
        svg.append('text')
          .attr('class', 'zone-label')
          .attr('x', zoneStart + (zoneWidth / 2))
          .attr('y', 20)
          .attr('text-anchor', 'middle')
          .attr('fill', '#495057')
          .attr('font-size', '0.9rem')
          .attr('font-weight', 'bold')
          .text(zone.label);
      }
    });
  }
  
  // Continuous mode: create gradient
  if (mode === 'continuous' && config.colorStart && config.colorEnd) {
    // Create a linear gradient
    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', `gradient-${questionId}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
      
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', config.colorStart);
      
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', config.colorEnd);
    
    // Add a rectangle with the gradient
    svg.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', `url(#gradient-${questionId})`)
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('opacity', 0.8);
    
    // Add labels for min and max if enabled
    if (showLabels) {
      const min = config.min !== undefined ? config.min : 0;
      const max = config.max !== undefined ? config.max : 100;
      
      svg.append('text')
        .attr('class', 'min-label')
        .attr('x', 10)
        .attr('y', height + 25)
        .attr('text-anchor', 'start')
        .attr('fill', '#495057')
        .attr('font-size', '0.8rem')
        .text(min);
      
      svg.append('text')
        .attr('class', 'max-label')
        .attr('x', width - 10)
        .attr('y', height + 25)
        .attr('text-anchor', 'end')
        .attr('fill', '#495057')
        .attr('font-size', '0.8rem')
        .text(max);
    }
  }
  
  // Store current positions of all options
  const positions = {};
  
  // Create option markers with vertical distribution
  const createOptionsWithMarkers = () => {
    // Clear any existing option markers
    svg.selectAll('.option-group').remove();
    
    // Calculate vertical positions for the options with better spacing
    // Use the full height with padding at top and bottom
    const effectiveHeight = height - OPTION_RADIUS * 2; // Leave space at top and bottom edges
    const optionCount = configOptions.length;
    
    // Calculate lane height based on number of options
    // If we have few options, spread them out more evenly
    const laneHeight = effectiveHeight / (Math.max(optionCount, 1));
    
    // Create option groups
    const optionGroups = svg.selectAll('.option-group')
      .data(configOptions)
      .enter()
      .append('g')
      .attr('class', 'option-group')
      .attr('data-option-id', d => d.id)
      .attr('transform', (d, i) => {
        const xPos = x(d.defaultPosition || 0);
        // Distribute vertically with equal spacing
        // Add offset to center first and last options relative to edges
        const yPos = OPTION_RADIUS + (laneHeight * i) + (laneHeight / 2);
        positions[d.id] = d.defaultPosition || 0;
        return `translate(${xPos}, ${yPos})`;
      })
      .call(createDragBehavior(x, width, questionId, positions));
    
    // Create different shapes based on option.shape
    optionGroups.each(function(d) {
      const group = d3.select(this);
      const shape = d.shape || 'circle';
      
      if (shape === 'circle') {
        group.append('circle')
          .attr('class', 'option-shape')
          .attr('r', OPTION_RADIUS)
          .attr('fill', d.color || '#007bff');
      } else if (shape === 'rectangle') {
        group.append('rect')
          .attr('class', 'option-shape')
          .attr('x', -OPTION_RADIUS)
          .attr('y', -OPTION_RADIUS)
          .attr('width', Math.abs(OPTION_RADIUS * 2)) // Ensure positive width
          .attr('height', Math.abs(OPTION_RADIUS * 2)) // Ensure positive height
          .attr('fill', d.color || '#28a745');
      } else if (shape === 'triangle') {
        const triangleSize = OPTION_RADIUS * 1.5;
        const trianglePath = `M0,${-triangleSize} L${triangleSize},${triangleSize} L${-triangleSize},${triangleSize} Z`;
        
        // Create a group for the triangle to handle transformations better
        const triangleGroup = group.append('g')
          .attr('class', 'triangle-wrapper');
        
        triangleGroup.append('path')
          .attr('class', 'option-shape')
          .attr('d', trianglePath)
          .attr('fill', d.color || '#dc3545');
      }
      
      // Add letter with different positioning based on shape
      if (d.shape === 'triangle') {
        // For triangles, position the letter a bit higher to account for the triangle's center of mass
        group.append('text')
          .attr('class', 'option-letter')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('dy', '0.35em') // Move text down slightly for triangles
          .attr('fill', 'white')
          .attr('font-weight', 'bold')
          .attr('font-size', '14px')
          .text(d.letter || '');
      } else {
        // For circles and rectangles
        group.append('text')
          .attr('class', 'option-letter')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('dy', '0.1em') // Fine-tune vertical alignment
          .attr('fill', 'white')
          .attr('font-weight', 'bold')
          .attr('font-size', '14px')
          .text(d.letter || '');
      }
      
      // Add invisible rect for better drag handling
      group.append('rect')
        .attr('width', Math.max(OPTION_RADIUS * 2.5, 1)) // Ensure positive width
        .attr('height', Math.max(OPTION_RADIUS * 2.5, 1)) // Ensure positive height
        .attr('x', -OPTION_RADIUS * 1.25)
        .attr('y', -OPTION_RADIUS * 1.25)
        .attr('fill', 'transparent')
        .style('cursor', 'grab');
      
      // Add tooltip
      const tooltip = group.append('g')
        .attr('class', 'option-tooltip')
        .attr('opacity', 0);
      
      tooltip.append('rect')
        .attr('x', -60)
        .attr('y', -45)
        .attr('width', Math.max(120, 0)) // Ensure positive width
        .attr('height', Math.max(30, 0)) // Ensure positive height
        .attr('fill', '#343a40')
        .attr('rx', 5);
      
      tooltip.append('text')
        .attr('x', 0)
        .attr('y', -25)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .attr('font-size', '0.8rem')
        .text(d.label || '');
      
      // Show tooltip on hover
      group.on('mouseenter', function() {
        d3.select(this).select('.option-tooltip')
          .transition()
          .duration(200)
          .attr('opacity', 1);
      }).on('mouseleave', function() {
        d3.select(this).select('.option-tooltip')
          .transition()
          .duration(200)
          .attr('opacity', 0);
      });
    });
  };
  
  // Create option groups with vertical distribution
  createOptionsWithMarkers();
  
  // Create legend if enabled
  if (showLegend) {
    createLegend(container, configOptions);
  }
  
  // Load saved positions for the question
  loadSavedResponse(questionId, positions, svg, x);
  
  // Handle window resize to make the slider responsive
  const resizeObserver = new ResizeObserver(() => {
    const newWidth = container.clientWidth - SLIDER_MARGIN.left - SLIDER_MARGIN.right;
    
    // Update scale
    x.range([0, newWidth]);
    
    // Update SVG size
    d3.select(container).select('svg')
      .attr('width', newWidth + SLIDER_MARGIN.left + SLIDER_MARGIN.right);
    
    // Update track background
    svg.select('.slider-track-bg')
      .attr('width', newWidth);
    
    // Update zone widths
    if (mode === 'discrete' && config.zones) {
      config.zones.forEach(zone => {
        const zoneStart = x(zone.start);
        const zoneWidth = x(zone.end) - zoneStart;
        
        svg.select(`.slider-zone[data-zone-id="${zone.id}"]`)
          .attr('x', zoneStart)
          .attr('width', zoneWidth);
        
        svg.selectAll('.zone-label')
          .filter((d, i, nodes) => d3.select(nodes[i]).text() === zone.label)
          .attr('x', zoneStart + (zoneWidth / 2));
      });
    }
    
    // Update option positions
    svg.selectAll('.option-group')
      .attr('transform', function() {
        const optionId = d3.select(this).attr('data-option-id');
        const position = positions[optionId] || 0;
        const xPos = x(position);
        const currentTransform = d3.select(this).attr('transform');
        const yPos = parseFloat(currentTransform.split(',')[1]);
        return `translate(${xPos}, ${yPos})`;
      });
      
    // Update continuous mode gradient
    if (mode === 'continuous') {
      svg.select('rect[fill^="url(#gradient-"]')
        .attr('width', newWidth);
        
      svg.select('.max-label')
        .attr('x', newWidth - 10);
    }
  });
  
  resizeObserver.observe(container);
}

/**
 * Create drag behavior for option elements
 * @param {Function} x - D3 scale function
 * @param {number} width - Width of the slider
 * @param {string} questionId - Question ID for saving responses
 * @param {Object} positions - Object tracking option positions
 * @returns {Function} - D3 drag behavior function
 */
/**
 * Create drag behavior for option elements
 * Completely rewritten using simpler mouse event handlers instead of D3 drag
 * @param {Function} x - D3 scale function
 * @param {number} width - Width of the slider
 * @param {string} questionId - Question ID for saving responses
 * @param {Object} positions - Object tracking option positions
 * @returns {Function} - Function to apply to D3 selection
 */
/**
 * Create a very simple drag behavior for option elements
 * @param {Function} x - D3 scale function
 * @param {number} width - Width of the slider
 * @param {string} questionId - Question ID
 * @param {Object} positions - Object to track positions
 * @returns {Object} - D3 drag behavior
 */
function createDragBehavior(x, width, questionId, positions) {
  console.log('Creating drag behavior, slider width:', width);
  
  // Create a simple drag behavior with extensive logging
  return d3.drag()
    // On drag start
    .on('start', function(event, d) {
      // Debug info
      console.log('===============================');
      console.log('DRAG START:', d.id);
      console.log('Element before drag:', this);
      
      const currentTransform = d3.select(this).attr('transform');
      console.log('Initial transform:', currentTransform);
      
      // Extract current position
      let currentX = 0;
      let currentY = 0;
      
      if (currentTransform) {
        const match = currentTransform.match(/translate\(([^,]+),([^)]+)\)/);
        if (match) {
          currentX = parseFloat(match[1]);
          currentY = parseFloat(match[2]);
          console.log('Parsed position from transform:', currentX, currentY);
        }
      }
      
      // Store the position directly on the element
      this._dragOriginX = event.x;
      this._dragOriginY = event.y;
      this._elementY = currentY;

  
      // Show tooltip
      d3.select(this).select('.option-tooltip')
        .transition()
        .duration(200)
        .attr('opacity', 1);
    })
    
    // During drag
    .on('drag', function(event, d) {

      
      // Calculate the new X position
      const newX = Math.max(0, Math.min(width, event.x));
      
      // Use the stored Y position - this is the key to preventing vertical jumps
      const fixedY = this._elementY || 0;
      
      console.log('New position will be:', newX, fixedY);
      
      // Update transform with new X but original Y
      d3.select(this).attr('transform', `translate(${newX},${fixedY})`);
      
      // Log the new transform
      const newTransform = d3.select(this).attr('transform');
      console.log('New transform:', newTransform);
      
      // Update the data store
      const newPosition = Math.round(x.invert(newX));
      positions[d.id] = newPosition;
      
      // Update zone highlighting
      const svg = d3.select(this.ownerSVGElement);
      const root = svg.select('g');
      if (root.node()) {
        highlightZoneAtPosition(newPosition, root, x);
      }
    })
    
    // On drag end
    .on('end', function(event, d) {
      // Debug info

      // Get the current transform
      const currentTransform = d3.select(this).attr('transform');
      console.log('End transform:', currentTransform);
      
      // Use the stored Y position from drag start
      const fixedY = this._elementY || 0;
      
      // Remove dragging class
      d3.select(this).classed('dragging', false);
      
      // Hide tooltip
      d3.select(this).select('.option-tooltip')
        .transition()
        .duration(200)
        .attr('opacity', 0);
      
      // Handle snapping if we have zones
      const svg = d3.select(this.ownerSVGElement);
      const rootGroup = svg.select('g');
      const zoneElements = rootGroup.selectAll('.slider-zone');
      
      if (zoneElements.size() > 0) {
        console.log('Snapping to zone');
        snapToNearestZone(this, d, positions, x, zoneElements);
      } else {
        // For continuous mode, ensure position is valid
        const finalX = Math.max(0, Math.min(width, event.x));
        d3.select(this).attr('transform', `translate(${finalX},${fixedY})`);
        console.log('Final position set to:', finalX, fixedY);
      }
      
      // Save response
      saveResponse(questionId, positions);

    });
}

/**
 * Helper function to get the current position of an element from its transform
 * @param {Element} element - The DOM element
 * @returns {Object} - Object with x and y coordinates
 */
function getCurrentPosition(element) {
  const transform = d3.select(element).attr('transform');
  let x = 0;
  let y = 0;
  
  if (transform) {
    const translate = transform.match(/translate\(([^,]+),([^)]+)\)/);
    if (translate) {
      x = parseFloat(translate[1]);
      y = parseFloat(translate[2]);
    }
  }
  
  return { x, y };
}

// Removed unused coordinate transformation functions

/**
 * Snap option to the nearest zone
 * @param {Element} element - The DOM element to snap
 * @param {Object} d - The data associated with the element
 * @param {Object} positions - Object tracking option positions
 * @param {Function} x - D3 scale function
 * @param {Selection} zoneElements - D3 selection of zone elements
 */
function snapToNearestZone(element, d, positions, x, zoneElements) {
  const currentPosition = positions[d.id];
  let bestZone = null;
  let bestDistance = Infinity;
  
  // Find the closest zone
  zoneElements.each(function() {
    const zone = d3.select(this);
    const zoneStart = parseFloat(zone.attr('x'));
    const zoneWidth = parseFloat(zone.attr('width'));
    const zoneCenter = zoneStart + (zoneWidth / 2);
    
    // Calculate distance to zone center
    const zonePos = x.invert(zoneCenter);
    const distance = Math.abs(currentPosition - zonePos);
    
    if (distance < bestDistance) {
      bestDistance = distance;
      bestZone = { element: zone, center: zoneCenter, position: zonePos };
    }
  });
  
  if (bestZone) {
    // Get current vertical position from transform
    const currentTransform = d3.select(element).attr('transform');
    const yPos = parseFloat(currentTransform.split(',')[1]);
    
    // Update position to snap to zone center
    d3.select(element).attr('transform', `translate(${bestZone.center}, ${yPos})`);
    positions[d.id] = bestZone.position;
    
    // Highlight the zone
    zoneElements.classed('highlight', false);
    bestZone.element.classed('highlight', true);
  }
}

/**
 * Highlight zone at a specific position
 * @param {number} position - The position to check (0-100)
 * @param {Selection} svg - D3 selection of SVG element
 * @param {Function} xScale - D3 scale function for x-axis
 */
function highlightZoneAtPosition(position, svg, xScale) {
  if (!xScale || typeof xScale.invert !== 'function') {
    // If no valid scale provided, just exit quietly
    return;
  }
  
  const zones = svg.selectAll('.slider-zone');
  
  zones.classed('highlight', false);
  
  zones.each(function() {
    const zone = d3.select(this);
    const zoneStart = parseFloat(zone.attr('x'));
    const zoneWidth = parseFloat(zone.attr('width'));
    
    // Calculate zone start and end positions using the provided scale
    const zoneStartPos = xScale.invert(zoneStart);
    const zoneEndPos = xScale.invert(zoneStart + zoneWidth);
    
    // Highlight zone if position is within its range
    if (position >= zoneStartPos && position <= zoneEndPos) {
      zone.classed('highlight', true);
    }
  });
}

/**
 * Create legend for option markers
 * @param {HTMLElement} container - Container element to append legend
 * @param {Array} options - Option data array
 */
function createLegend(container, options) {
  // Create legend container
  const legendContainer = document.createElement('div');
  legendContainer.className = 'slider-legend';
  
  // Add legend title
  const legendTitle = document.createElement('div');
  legendTitle.className = 'legend-title';
  legendTitle.textContent = 'Legend:';
  legendContainer.appendChild(legendTitle);
  
  // Create legend items list
  const legendItems = document.createElement('ul');
  legendItems.className = 'legend-items';
  legendContainer.appendChild(legendItems);
  
  // Add legend items for each option
  options.forEach(option => {
    const item = document.createElement('li');
    item.className = 'legend-item';
    
    // Create SVG for the letter badge
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.style.display = 'inline-block';
    svg.style.marginRight = '5px';
    
    // Add appropriate shape based on option.shape
    const shape = option.shape || 'circle';
    
    if (shape === 'circle') {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', '12');
      circle.setAttribute('r', '12');
      circle.setAttribute('fill', option.color || '#007bff');
      svg.appendChild(circle);
    } else if (shape === 'rectangle') {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', '24');
      rect.setAttribute('height', '24');
      rect.setAttribute('fill', option.color || '#28a745');
      svg.appendChild(rect);
    } else if (shape === 'triangle') {
      const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      triangle.setAttribute('points', '12,0 24,24 0,24');
      triangle.setAttribute('fill', option.color || '#dc3545');
      svg.appendChild(triangle);
    }
    
    // Add letter to shape
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '12');
    text.setAttribute('y', '13'); // Adjusted for better vertical centering
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle'); // Better baseline alignment
    text.setAttribute('fill', 'white');
    text.setAttribute('font-weight', 'bold');
    text.setAttribute('font-size', '12px');
    text.textContent = option.letter || '';
    svg.appendChild(text);
    
    item.appendChild(svg);
    
    // Add label
    const label = document.createElement('span');
    label.textContent = option.label || '';
    item.appendChild(label);
    
    legendItems.appendChild(item);
  });
  
  container.appendChild(legendContainer);
}

/**
 * Load saved response for the question
 * @param {string} questionId - Question ID
 * @param {Object} positions - Object tracking option positions
 * @param {Selection} svg - D3 selection of SVG element
 * @param {Function} x - D3 scale function
 */
function loadSavedResponse(questionId, positions, svg, x) {
  console.log(`Loading saved response for question ${questionId}...`);
  const existingResponse = surveyData.getResponse(questionId);
  
  if (existingResponse && existingResponse.value) {
    try {
      const savedPositions = existingResponse.value;
      console.log('Found saved positions:', savedPositions);
      
      // Update positions object with saved values
      Object.keys(savedPositions.value).forEach(optionId => {
        if (positions.hasOwnProperty(optionId)) {
          positions[optionId] = savedPositions.value[optionId];
          console.log(`Updated position for ${optionId} to ${savedPositions.value[optionId]}`);
        }
      });
      
      // Ensure we have option groups to update
      const optionGroups = svg.selectAll('.option-group');
      console.log(`Found ${optionGroups.size()} option groups to update`);
      
      // Update option elements with saved positions
      optionGroups.each(function() {
        const optionId = d3.select(this).attr('data-option-id');
        if (savedPositions.value[optionId] !== undefined) {
          // Get current vertical position from transform
          const currentTransform = d3.select(this).attr('transform');
          if (!currentTransform) {
            console.warn(`Transform not found for option ${optionId}`);
            return;
          }
          
          // Parse the transform to get Y position
          const match = currentTransform.match(/translate\(([^,]+),([^)]+)\)/);
          if (!match) {
            console.warn(`Invalid transform format for option ${optionId}: ${currentTransform}`);
            return;
          }
          
          const yPos = parseFloat(match[2]);
          
          // Update position
          const xPos = x(savedPositions.value[optionId]);
          console.log(`Moving option ${optionId} to x=${xPos} (value=${savedPositions.value[optionId]})`);
          d3.select(this).attr('transform', `translate(${xPos}, ${yPos})`);
        } else {
          console.log(`No saved position for option ${optionId}`);
        }
      });
      
      // Highlight zones if applicable
      const questionElement = document.getElementById(`question-${questionId}`);
      if (questionElement) {
        // Trigger a small resize to ensure elements are properly positioned and rendered
        setTimeout(() => {
          const resizeEvent = new Event('resize');
          window.dispatchEvent(resizeEvent);
        }, 100);
      }
      
      return true; // Successfully loaded saved response
    } catch (e) {
      console.error('Error loading saved positions:', e);
    }
  } else {
    console.log('No existing response found for this question');
  }
  
  return false; // No saved response loaded
}

/**
 * Save response for the question
 * @param {string} questionId - Question ID
 * @param {Object} positions - Object tracking option positions
 */
function saveResponse(questionId, positions) {
  const currentResponse = surveyData.getResponse(questionId) || {};
  
  // Save the response data
  surveyData.saveResponse(questionId, {
    value: { ...positions },
    comment: currentResponse.comment || ''
  });
  
  // Dispatch a custom event to notify that a response has changed
  // This will trigger re-evaluation of conditional questions
  const responseChangeEvent = new CustomEvent('survey:response-changed', {
    detail: {
      questionId: questionId,
      value: { ...positions }
    },
    bubbles: true
  });
  
  // Find the question container and dispatch the event
  const questionContainer = document.getElementById(`question-${questionId}`);
  if (questionContainer) {
    console.log(`Dispatching response change event for ${questionId}`);
    questionContainer.dispatchEvent(responseChangeEvent);
  } else {
    // If container not found, dispatch from document body
    console.log(`Question container not found, dispatching from document body`);
    document.body.dispatchEvent(responseChangeEvent);
  }
}

export default {
  renderMultiValueSlider
};
