/**
 * visualizerLoader.js
 * 
 * This module dynamically loads a visualizer based on the question type.
 */

const visualizerMap = {
  'checkbox': 'checkboxVisualizer.js',
  'matrix': 'matrixVisualizer.js',
  'radio': 'radioVisualizer.js',
  'rank': 'rankVisualizer.js',
  'rangeSlider': 'rangeSliderVisualizer.js',
  'slider': 'sliderVisualizer.js',
  'text': 'textVisualizer.js'
};

/**
 * Dynamically loads a visualizer module.
 * @param {string} questionType - The type of the question.
 * @returns {Promise<Object|null>} A promise that resolves to the visualizer module or null if not found.
 */
export async function loadVisualizer(questionType) {
  const fileName = visualizerMap[questionType];
  if (!fileName) {
    console.error(`No visualizer found for question type: ${questionType}`);
    return null;
  }

  try {
    const module = await import(`./visualizations/${fileName}`);
    return module.default;
  } catch (error) {
    console.error(`Failed to load visualizer for ${questionType}:`, error);
    return null;
  }
}
