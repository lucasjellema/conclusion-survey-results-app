/**
 * visualizationSettings.js
 * Module for managing admin visualization preferences
 * 
 * This module handles saving and retrieving visualization preferences
 * for each question, which are stored in localStorage and can be exported/imported.
 */

// Local storage key for visualization preferences
const STORAGE_KEY = 'survey-visualization-preferences';

/**
 * Get visualization preferences from local storage
 * @returns {Object} - Object with question IDs as keys and preference objects as values
 */
export function getVisualizationPreferences() {
    try {
        const storedPrefs = localStorage.getItem(STORAGE_KEY);
        
        if (storedPrefs) {
            return JSON.parse(storedPrefs);
        }
    } catch (error) {
        console.error('Error retrieving visualization preferences:', error);
    }
    
    return {}; // Return empty object if no preferences found or error
}

/**
 * Save visualization preference for a specific question
 * @param {string} questionId - Question ID
 * @param {string} visualizationType - Visualization type
 * @param {Object} [options={}] - Additional visualization options
 */
export function saveVisualizationPreference(questionId, visualizationType, options = {}) {
    try {
        // Get existing preferences
        const preferences = getVisualizationPreferences();
        
        // Update preference for this question
        preferences[questionId] = {
            type: visualizationType,
            options: options
        };
        
        // Save to local storage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        
        // Return success
        return true;
    } catch (error) {
        console.error('Error saving visualization preference:', error);
        return false;
    }
}

/**
 * Clear all visualization preferences
 * @returns {boolean} - Success status
 */
export function clearVisualizationPreferences() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;
    } catch (error) {
        console.error('Error clearing visualization preferences:', error);
        return false;
    }
}

/**
 * Export visualization preferences to JSON
 * @returns {string} - JSON string of preferences
 */
export function exportVisualizationPreferences() {
    const preferences = getVisualizationPreferences();
    
    // Transform to survey definition format
    const exportData = {};
    
    Object.entries(preferences).forEach(([questionId, pref]) => {
        exportData[questionId] = {
            visualization: {
                type: pref.type,
                options: pref.options || {}
            }
        };
    });
    
    return JSON.stringify(exportData, null, 2);
}

/**
 * Import visualization preferences from JSON
 * @param {string} jsonString - JSON string to import
 * @returns {boolean} - Success status
 */
export function importVisualizationPreferences(jsonString) {
    try {
        const importData = JSON.parse(jsonString);
        const preferences = {};
        
        // Transform from survey definition format
        Object.entries(importData).forEach(([questionId, data]) => {
            if (data.visualization && data.visualization.type) {
                preferences[questionId] = {
                    type: data.visualization.type,
                    options: data.visualization.options || {}
                };
            }
        });
        
        // Save all preferences
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        
        return true;
    } catch (error) {
        console.error('Error importing visualization preferences:', error);
        return false;
    }
}
