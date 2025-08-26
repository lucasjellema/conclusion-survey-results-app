/**
 * D3.js-based implementation of a radar style question renderer:
 * multiple concentric circles (rings) - each signifying a different option.
 * multiple segments - each signifying a different value.
 * 
 * User can position all options in a ring and a segment and by doing so determine two values
 */

import * as surveyData from './surveyData.js';
// We already have D3.js imported in the main HTML file

// Constants

/**
 * Render a multi-value radar question using D3.js and SVG
 * @param {Object} question - The question object
 * @returns {HTMLElement} - The rendered question element
 */
export function renderRadar(question) {
  const container = document.createElement('div');
  container.className = 'question-container';
  container.id = `question-${question.id}`;

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

  const radarContainer = document.createElement('div');
  radarContainer.className = 'radar-chart-container';
  container.appendChild(radarContainer);

  const radarConfig = question.radar || {};
  const options = radarConfig.options || [];
  const variable1Labels = radarConfig.variable1?.labels || [];
  const variable2Labels = radarConfig.variable2?.labels || [];
  const showLabels = radarConfig.showLabels !== false;
  const showLegend = radarConfig.showLegend !== false;

  const width = 500;
  const height = 500;
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const radius = Math.min(chartWidth, chartHeight) / 2;

  const svg = d3.select(radarContainer)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width / 2},${height / 2})`);

  // Draw concentric circles (rings) for variable2
  const numRings = variable2Labels.length; // This is the number of bands/labels
  const ringStep = radius / numRings; // The width of each band

  for (let i = 0; i < numRings; i++) {
    const currentRingRadius = (i + 1) * ringStep; // Radius of the outer circle for this band
    svg.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', currentRingRadius)
      .attr('class', 'radar-ring');
    
    if (showLabels) {
      const midRadius = (i * ringStep + currentRingRadius) / 2; // Midpoint of the band
      svg.append('text')
        .attr('x', 0)
        .attr('y', -midRadius)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('class', 'radar-ring-label')
        .text(variable2Labels[i]);
    }
  }

  // Draw radial lines for variable1 segments
  const numSegments = variable1Labels.length;
  const angleSlice = (2 * Math.PI) / numSegments;

  const radialLine = d3.lineRadial()
    .curve(d3.curveLinearClosed)
    .radius(radius)
    .angle((d, i) => i * angleSlice);

  for (let i = 0; i < numSegments; i++) {
    const angle = i * angleSlice;
    svg.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', radius * Math.sin(angle))
      .attr('y2', -radius * Math.cos(angle))
      .attr('class', 'radar-axis');
    if (showLabels) {
      const labelAngle = angle + (angleSlice / 2); // Center the label in the segment
      svg.append('text')
        .attr('x', (radius + 25) * Math.sin(labelAngle)) // Position along the outer ring
        .attr('y', -(radius + 25) * Math.cos(labelAngle)) // Position along the outer ring
        .attr('text-anchor', 'middle')
        .attr('class', 'radar-axis-label')
        .text(variable1Labels[i]);
    }
  }

  // Load existing responses
  const existingResponse = surveyData.getResponse(question.id) || { value: {} };
  const currentPositions = existingResponse.value;

  // Draggable markers for options
  const drag = d3.drag()
    .on('start', function (event, d) {
      d3.select(this).raise().attr('stroke', 'black');
    })
    .on('drag', function (event, d) {
      const newX = event.x;
      const newY = event.y;
      const newRadius = Math.sqrt(newX * newX + newY * newY);
      let newAngle = Math.atan2(newX, -newY) * (180 / Math.PI);
      if (newAngle < 0) newAngle += 360;

      d.currentAngle = newAngle;
      d.currentRadius = (newRadius / radius) * 100; // Normalize to 0-100

      d3.select(this)
        .attr('transform', `translate(${newX},${newY})`);
    })
    .on('end', function (event, d) {
      d3.select(this).attr('stroke', null);

      // Calculate segment (variable1)
      const segmentIndex = Math.floor(d.currentAngle / (360 / numSegments));
      const segmentValue = variable1Labels[segmentIndex];

      // Calculate ring (variable2)
      const ringIndex = Math.min(numRings - 1, Math.floor(d.currentRadius / (100 / numRings)));
      const ringValue = variable2Labels[ringIndex];

      currentPositions[d.id] = {
        segment: segmentValue,
        ring: ringValue
      };
      surveyData.saveResponse(question.id,  currentPositions, existingResponse.comment);
    ;
  });

  options.forEach(option => {
    // Get stored values or defaults
    const storedSegment = currentPositions[option.id]?.segment;
    const storedRing = currentPositions[option.id]?.ring;

    let initialAngle;
    let initialRadius;

    if (storedSegment && storedRing) {
      // Convert stored segment back to angle
      const segmentIndex = variable1Labels.indexOf(storedSegment);
      initialAngle = (segmentIndex + 0.5) * (360 / numSegments); // Center of the segment

      // Convert stored ring back to radius
      const ringIndex = variable2Labels.indexOf(storedRing);
      const ringStep = radius / numRings; // Recalculate ringStep for this scope
      const ringMidRadius = ((ringIndex * ringStep) + ((ringIndex + 1) * ringStep)) / 2;
      initialRadius = ringMidRadius;

    } else {
      // Use default positions if no stored values
      initialAngle = option.defaultPosition?.angle || 0;
      initialRadius = (option.defaultPosition?.radius || 0) / 100 * radius;
    }

    const x = initialRadius * Math.sin(initialAngle * Math.PI / 180);
    const y = -initialRadius * Math.cos(initialAngle * Math.PI / 180);

    // Update option's currentAngle and currentRadius for drag events
    option.currentAngle = initialAngle;
    option.currentRadius = (initialRadius / radius) * 100;

    const marker = svg.append('g')
      .attr('transform', `translate(${x},${y})`)
      .datum(option)
      .call(drag);

    if (option.shape === 'circle') {
      marker.append('circle')
        .attr('r', 10)
        .attr('class', 'radar-marker circle')
        .append('title') /* Add title element for tooltip */
        .text(option.label);
    } else if (option.shape === 'rectangle') {
      marker.append('rect')
        .attr('x', -10)
        .attr('y', -10)
        .attr('width', 20)
        .attr('height', 20)
        .attr('class', 'radar-marker rectangle')
        .append('title') /* Add title element for tooltip */
        .text(option.label);
    } else if (option.shape === 'triangle') {
      marker.append('polygon')
        .attr('points', '0,-10 10,10 -10,10')
        .attr('class', 'radar-marker triangle')
        .append('title') /* Add title element for tooltip */
        .text(option.label);
    }

    marker.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('class', 'radar-marker-letter')
      .text(option.letter);
  });

  // Add legend
  if (showLegend) {
    const legend = d3.select(radarContainer)
      .append('div')
      .attr('class', 'radar-legend');

    options.forEach(option => {
      const legendItem = legend.append('div')
        .attr('class', 'radar-legend-item');

      const markerSvg = legendItem.append('svg')
        .attr('width', 20)
        .attr('height', 20);

      if (option.shape === 'circle') {
        markerSvg.append('circle')
          .attr('cx', 10)
          .attr('cy', 10)
          .attr('r', 8)
          .attr('class', 'radar-marker circle');
      } else if (option.shape === 'rectangle') {
        markerSvg.append('rect')
          .attr('x', 2)
          .attr('y', 2)
          .attr('width', 16)
          .attr('height', 16)
          .attr('class', 'radar-marker rectangle');
      } else if (option.shape === 'triangle') {
        markerSvg.append('polygon')
          .attr('points', '10,2 18,18 2,18')
          .attr('class', 'radar-marker triangle');
      }

      markerSvg.append('text')
        .attr('x', 10)
        .attr('y', 10)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('class', 'radar-marker-letter')
        .text(option.letter);

      legendItem.append('span')
        .text(option.label);
    });
  }

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
        surveyData.saveResponse(question.id,  currentResponse.value || {}, e.target.value);

  });
  
  return commentContainer;
}

export default {
  renderRadar
};
