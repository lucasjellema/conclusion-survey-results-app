/**
 * svgRectValidator.js
 * Utility to fix SVG rect elements with negative width or height values
 */

/**
 * Fix all rect elements in the document to ensure positive width and height
 * This runs after the DOM is loaded to fix any SVG rect elements with negative dimensions
 */
export function fixSvgRectDimensions() {
  // Wait a moment to ensure all SVG elements are loaded
  setTimeout(() => {
    console.log('SVG Rect Validator running...');
    // Get all rect elements in the document
    const rectElements = document.querySelectorAll('rect');
    console.log(`Found ${rectElements.length} rect elements to validate`);
    
    // Process each rect element
    rectElements.forEach(rect => {
      // Get all attributes for debugging
      const attrs = {};
      for (const attr of rect.attributes) {
        attrs[attr.name] = attr.value;
      }
      
      // Specifically check for the problematic values we're seeing
      if (attrs.width === '-40' || attrs.width === '-10') {
        console.error('Found problematic width value:', attrs.width, 'Full attributes:', attrs);
        rect.setAttribute('width', '40'); // Use absolute value of the negative
      }
      
      // Fix width if negative or zero
      const currentWidth = parseFloat(rect.getAttribute('width') || 0);
      if (currentWidth <= 0) {
        console.warn('Fixed negative rect width:', currentWidth);
        rect.setAttribute('width', Math.max(Math.abs(currentWidth), 1)); // Use absolute value or minimum 1
      }
      
      // Fix height if negative or zero
      const currentHeight = parseFloat(rect.getAttribute('height') || 0);
      if (currentHeight <= 0) {
        console.warn('Fixed negative rect height:', currentHeight);
        rect.setAttribute('height', Math.max(Math.abs(currentHeight), 1)); // Use absolute value or minimum 1
      }
    });
    
    // Add a mutation observer to catch dynamically added rect elements
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        // Check for added nodes
        mutation.addedNodes.forEach(node => {
          // If it's an element node
          if (node.nodeType === 1) {
            // Check if it's a rect element
            if (node.tagName && node.tagName.toLowerCase() === 'rect') {
              validateRectElement(node);
            }
            
            // Check for rect elements within the added node
            const rectElements = node.querySelectorAll('rect');
            rectElements.forEach(validateRectElement);
          }
        });
      });
    });
    
    // Start observing the document
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
  }, 100);
}

/**
 * Validate and fix a single rect element
 * @param {Element} rect - The rect element to validate
 */
function validateRectElement(rect) {
  // Fix width if negative or zero
  const currentWidth = parseFloat(rect.getAttribute('width') || 0);
  if (currentWidth <= 0) {
    console.warn('Fixed negative rect width in new element:', currentWidth);
    rect.setAttribute('width', '1'); // Set a minimum width
  }
  
  // Fix height if negative or zero
  const currentHeight = parseFloat(rect.getAttribute('height') || 0);
  if (currentHeight <= 0) {
    console.warn('Fixed negative rect height in new element:', currentHeight);
    rect.setAttribute('height', '1'); // Set a minimum height
  }
}

export default {
  fixSvgRectDimensions
};
