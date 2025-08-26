/**
 * resultsDataService.js
 * Service for retrieving and processing survey results data
 * 
 * This module is designed to be generic and work with any survey structure,
 * retrieving both the survey definition and results data.
 */

import { getData, getSurveySummary } from '../../js/dataService.js';

// Cache for survey definition and results
let surveyDefinitionCache = null;
let surveyResultsCache = null;

// 'https://lucasjellema.github.io/conclusion-survey-webapp/results/index.html'
const surveyDefinitionFile = window.location.href.replace(/\/results\/index\.html$/, '') + '/js/data/conclusionCloudSurvey.json';
//const surveyDefinitionFile =  window.location.href '/js/data/conclusionCloudSurvey.json';
const sampleSurveyResultsFile = '../../js/data/sampleSurveyResponse.json';
/**
 * Get survey definition with questions and steps
 * @returns {Promise<Array>} Array of question definitions
 */
export async function getQuestionDefinitions() {
    if (surveyDefinitionCache) {
        return surveyDefinitionCache;
    }

    try {
        // Load survey definition from file/API
        // For demo purposes, we're loading from a static file path
        // In production, this would come from an API endpoint
        const response = await fetch(surveyDefinitionFile);
        const surveyData = await response.json();

        if (!surveyData || !surveyData.steps) {
            console.error('Invalid survey definition format');
            return [];
        }

        // Extract all questions from all steps and add step information to each question
        const questions = [];

        surveyData.steps.forEach(step => {
            if (step.questions && Array.isArray(step.questions)) {
                step.questions.forEach(question => {
                    // Add step info to the question for context
                    questions.push({
                        ...question,
                        stepId: step.id,
                        stepTitle: step.title,
                        stepDescription: step.description
                    });
                });
            }
        });

        // Cache results
        surveyDefinitionCache = questions;
        return questions;
    } catch (error) {
        console.error('Error loading survey definition:', error);
        return [];
    }
}

/**
 * Get survey results
 * @param {boolean} [forceRefresh=false] Force refresh from source
 * @returns {Promise<Array>} Array of survey responses
 */
export async function getResults(forceRefresh = false) {
    if (surveyResultsCache && !forceRefresh) {
        return surveyResultsCache;
    }

    try {
        // For demo purposes, we're loading from a static file
        // In production, this would come from getData() from dataService.js
        // which fetches from an API endpoint

        // Try to get data from the actual API first
        try {
            let apiData = await getSurveySummary(forceRefresh);
            if (apiData) {
                if (Array.isArray(apiData)) {
                    // If already an array, just return it
                    console.log('Using responses as is:', apiData);
                } else if (typeof apiData === 'object') {
                    // If it's an object, convert to array
                    apiData = Object.values(apiData);

                } else {
                    console.error('Unexpected format for responses:', apiData);
                    return [];
                }
                // for all objects in apiData that contain a property bedrijf but not a property label, derive label from bedrijf
                apiData.forEach(item => {
                    if (item.bedrijf && !item.label) {
                        item.label = item.bedrijf;
                    }
                });

                surveyResultsCache = apiData;
                return surveyResultsCache;
            }
        } catch (apiError) {
            console.log('API data not available, falling back to sample data:', apiError);


            // Fall back to sample data
            const response = await fetch(sampleSurveyResultsFile);
            let data = await response.json();

            if (!data) {
                console.error('Invalid survey results format');
                return [];
            }
            // create array out of object ; each property value in the responses object becomes an element in the array
            if (Array.isArray(data)) {
                // If already an array, just return it
                console.log('Using responses as is:', data);
            } else if (typeof data === 'object') {
                // If it's an object, convert to array
                data = Object.values(data);
            } else {
                console.error('Unexpected format for responses:', data);
                return [];
            }


            // Cache results
            surveyResultsCache = data;
            return data
        }
    } catch (error) {
        console.error('Error loading survey results:', error);
        return [];
    }
}

/**
 * Get aggregated data for a radio question
 * @param {Array} responses - Question responses
 * @param {Object} question - Question definition
 * @returns {Object} Aggregated data ready for visualization
 */
export function aggregateRadioResponses(responses, question, responseLabels = []) {
    // Count occurrences of each option
    const counts = {};
    const tooltips = {}; // To store tooltip labels for each value

    let total = 0;

    // Initialize counts for all options
    if (question.options && Array.isArray(question.options)) {
        question.options.forEach(option => {
            counts[option.value] = 0;
            tooltips[option.value] = '';
        });
    }

    // Count responses
    responses.forEach((response, index) => {
        const value = response;
        if (value) {
            counts[value] = (counts[value] || 0) + 1;
            tooltips[value] = tooltips[value] + ', ' + responseLabels[index]; // Use responseLabels if provided
            total++;
        }
    });

    // Convert to arrays for visualization
    const labels = [];
    const data = [];
    const colors = [];
    const tooltipLabels = [];

    // Default color palette
    const defaultColors = [
        '#4a86e8', '#6aa84f', '#e69138', '#8e63ce', '#d5573b',
        '#45818e', '#a64d79', '#674ea7', '#990000', '#0c343d'
    ];

    Object.entries(counts).forEach(([value, count], index) => {
        // Find label for this value
        let label = value;
        if (question.options && Array.isArray(question.options)) {
            const option = question.options.find(opt => opt.value === value);
            if (option && option.label) {
                label = option.label;
            }
        }

        labels.push(label);
        data.push(count);
        tooltipLabels.push(tooltips[value] || ''); // Use tooltip labels if available
        colors.push(defaultColors[index % defaultColors.length]);
    });

    return {
        labels,
        data,
        colors,
        total,
        percentages: data.map(value => total > 0 ? Math.round((value / total) * 100) : 0),
        tooltipLabels
    };
}

/**
 * Get aggregated data for a checkbox question
 * @param {Array} responses - Question responses
 * @param {Object} question - Question definition
 * @returns {Object} Aggregated data ready for visualization
 */
export function aggregateCheckboxResponses(responses, question, responseLabels = []) {
    // Count occurrences of each option
    const counts = {};
    const tooltips = {}; // To store tooltip labels for each value

    let totalResponses = responses.length;

    // Initialize counts for all options
    if (question.options && Array.isArray(question.options)) {
        question.options.forEach(option => {
            counts[option.value] = 0;
            tooltips[option.value] = '';

        });
    }

    // Process responses - these can be arrays or objects depending on format
    responses.forEach((response, index) => {
        if (Array.isArray(response)) {
            // Array format: ['option1', 'option2']
            response.forEach(value => {
                if (typeof value === 'string') {
                    counts[value] = (counts[value] || 0) + 1;
                    tooltips[value] = tooltips[value] + ', ' + responseLabels[index]; // Use responseLabels if provided

                } else if (value && value.isOther && value.otherValue) {
                    counts['other'] = (counts['other'] || 0) + 1;
                    tooltips['other'] = tooltips['other'] + ', ' + responseLabels[index]; // Use responseLabels if provided

                }
            });
        } else if (typeof response === 'object' && response !== null) {
            // Object format: { option1: true, option2: true }
            Object.entries(response).forEach(([key, value]) => {
                if (value === true && key !== 'other') {
                    counts[key] = (counts[key] || 0) + 1;
                    tooltips[key] = tooltips[key] + ', ' + responseLabels[index]; //
                } else if (key === 'other' && (value === true || typeof value === 'string')) {
                    counts['other'] = (counts['other'] || 0) + 1;
                    tooltips['other'] = tooltips['other'] + ', ' + responseLabels[index];
                }
            });
        }
    });

    // Convert to arrays for visualization
    const labels = [];
    const data = [];
    const percentages = [];
    const tooltipLabels = [];


    Object.entries(counts).forEach(([value, count]) => {
        // Find label for this value
        let label = value;
        if (question.options && Array.isArray(question.options)) {
            const option = question.options.find(opt => opt.value === value);
            if (option && option.label) {
                label = option.label;
            }
        }

        labels.push(label);
        data.push(count);
        tooltipLabels.push(tooltips[value] || ''); // Use tooltip labels if available

        percentages.push(totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0);
    });

    return {
        labels,
        data,
        percentages,
        totalResponses, tooltipLabels

    };
}

/**
 * Get aggregated data for a text question
 * @param {Array} responses - Question responses
 * @returns {Object} Aggregated data ready for visualization
 */
export function aggregateTextResponses(responses) {
    // Filter out empty responses
    const validResponses = responses.filter(response =>
        response && typeof response === 'string' && response.trim() !== '');

    // Calculate statistics
    const totalResponses = validResponses.length;
    const averageLength = totalResponses > 0
        ? Math.round(validResponses.reduce((sum, text) => sum + text.length, 0) / totalResponses)
        : 0;

    // Word frequency analysis
    const wordCounts = {};
    const commonWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of', 'is', 'are', 'was', 'were',
        'de', 'het', 'een', 'een', 'die', 'dat', 'dit', 'zijn', 'zich', 'niet', 'ook', 'als', 'meer', 'dan', 'over', 'uit', 'bij', 'tot', 'voor', 'wij', 'maar', 'van', 'wat', 'hoe', 'waar', 'wie', 'waarom', 'wanneer', 'welke', 'hoeveel', 'alleen', 'alleen maar', 'nog steeds', 'nog altijd', 'onze'
    ]);

    validResponses.forEach(text => {
        // Tokenize and count words (simple implementation)
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/);        // Split on whitespace

        words.forEach(word => {
            if (word && word.length > 2 && !commonWords.has(word)) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });
    });

    // Get top words
    const topWords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, count]) => ({ text: word, weight: count }));

    return {
        totalResponses,
        averageLength,
        topWords,
        responses: validResponses
    };
}

/**
 * Get aggregated data for a matrix question
 * @param {Array} responses - Question responses
 * @param {Object} question - Question definition
 * @returns {Object} Aggregated data ready for visualization
 */
export function aggregateMatrixResponses(responses, question, responseLabels = []) {
    // Initialize data structure
    const rows = question.matrix?.rows || [];
    const columns = question.matrix?.columns || [];
    const totals = {};

    // Initialize counts matrix
    const counts = {};
    const tooltips = {};

    rows.forEach(row => {
        counts[row.id] = {};
        tooltips[row.id] = {}; // Initialize tooltips for each row
        columns.forEach(col => {
            counts[row.id][col.id] = 0;
            tooltips[row.id][col.id] = '';
        });
    });

    // Count responses
    responses.forEach((response, index) => {
        if (typeof response !== 'object' || response === null) return;
        // response is array with values: "rowId:colId"
        if (!Array.isArray(response)) {
            console.error('Invalid response format for matrix question:', response);
            return;
        }
        for (const row of response) {
            const [rowId, colId] = row.split(':');
            if (counts[rowId] && counts[rowId][colId] !== undefined) {
                counts[rowId][colId]++;
                tooltips[rowId][colId] = tooltips[rowId][colId] + ', ' + responseLabels[index]; // Use responseLabels if provided

                // Track totals for percentages
                totals[rowId] = (totals[rowId] || 0) + 1;
            }
        }
    });

    // Calculate percentages
    const percentages = {};
    rows.forEach(row => {
        percentages[row.id] = {};
        columns.forEach(col => {
            const rowTotal = totals[row.id] || 0;
            percentages[row.id][col.id] = rowTotal > 0
                ? Math.round((counts[row.id][col.id] / rowTotal) * 100)
                : 0;
        });
    });

    return {
        rows,
        columns,
        counts,
        percentages,
        totalResponses: responses.length
        , tooltips
    };
}


/**
 * Get aggregated data for a Likert question
 * @param {Array} responses - Question responses
 * @param {Object} question - Question definition
 * @returns {Object} Aggregated data ready for visualization
 */
export function aggregateLikertResponses(responses, question, responseLabels = []) {
    const options = question.options || [];
    const likertScale = question.likertScale;

    if (!likertScale || typeof likertScale.min === 'undefined' || typeof likertScale.max === 'undefined') {
        console.error('Invalid Likert scale definition:', question);
        return {
            options: [],
            likertScaleLabels: {},
            likertScaleValues: [],
            counts: {},
            percentages: {},
            totalResponsesPerOption: {},
            tooltips: {},
            totalResponses: 0
        };
    }

    const likertScaleValues = [];
    for (let i = likertScale.min; i <= likertScale.max; i++) {
        likertScaleValues.push(i.toString()); // Ensure they are strings for consistency with object keys
    }

    const likertScaleLabels = likertScale.labels || {};

    const counts = {};
    const tooltips = {};
    const totalResponsesPerOption = {};

    // Initialize counts, tooltips, and totals for each option and scale value
    options.forEach(option => {
        counts[option.value] = {};
        tooltips[option.value] = {};
        totalResponsesPerOption[option.value] = 0;

        likertScaleValues.forEach(scaleValue => {
            counts[option.value][scaleValue] = 0;
            tooltips[option.value][scaleValue] = '';
        });
    });

    // Process responses
    responses.forEach((response, index) => {
        if (typeof response !== 'object' || response === null) return;

        options.forEach(option => {
            const optionValue = option.value;
            const selectedScaleValue = response[optionValue]; // e.g., response.cost_savings = 4

            // Ensure the selected scale value is within the defined Likert range
            if (typeof selectedScaleValue === 'number' &&
                selectedScaleValue >= likertScale.min &&
                selectedScaleValue <= likertScale.max) {

                const scaleValueStr = selectedScaleValue.toString(); // Convert to string for object key

                counts[optionValue][scaleValueStr]++;
                tooltips[optionValue][scaleValueStr] += (tooltips[optionValue][scaleValueStr] ? ', ' : '') + responseLabels[index];
                totalResponsesPerOption[optionValue]++;
            }
        });
    });

    // Calculate percentages
    const percentages = {};
    options.forEach(option => {
        const optionValue = option.value;
        percentages[optionValue] = {};
        const totalForOption = totalResponsesPerOption[optionValue];

        likertScaleValues.forEach(scaleValue => {
            const count = counts[optionValue][scaleValue];
            percentages[optionValue][scaleValue] = totalForOption > 0
                ? Math.round((count / totalForOption) * 100)
                : 0;
        });
    });

    return {
        options, // The items being rated (e.g., cost_savings, scalability)
        likertScaleLabels, // The labels for the scale (e.g., "1": "No benefit")
        likertScaleValues, // The numeric values of the scale (e.g., [1, 2, 3, 4, 5])
        counts,
        percentages,
        totalResponsesPerOption, // Total number of responses for each option (e.g., how many rated 'cost_savings')
        tooltips,
        totalResponses: responses.length // Total number of survey responses processed
    };
}


/**
 * Get aggregated data for a multi-value slider question
 * @param {Array} responses - Question responses
 * @param {Object} question - Question definition
 * @returns {Object} Aggregated data ready for visualization
 */
export function aggregateSliderResponses(responses, question) {
    // Get all possible options/sliders
    const options = [];

    // Try to extract options from responses
    const validResponses = responses.filter(r => r && typeof r === 'object' && r.value);

    // If we have values in the response, use those to determine options
    if (validResponses.length > 0) {
        // Collect all possible option keys from all responses
        validResponses.forEach(response => {
            if (typeof response.value === 'object' && response.value !== null) {
                const valueObj = response.value.value || response.value;
                Object.keys(valueObj).forEach(key => {
                    if (key !== 'comment' && !options.includes(key)) {
                        options.push(key);
                    }
                });
            }
        });
    }

    // If we couldn't extract options from responses, try from the question definition
    if (options.length === 0 && question.options && Array.isArray(question.options)) {
        question.options.forEach(option => {
            if (!options.includes(option.value)) {
                options.push(option.value);
            }
        });
    }

    // Calculate averages and ranges for each option
    const statistics = {};

    options.forEach(option => {
        // Collect all values for this option
        const values = [];

        validResponses.forEach(response => {
            // Check for both direct value and nested value object structure
            let value;
            if (response.value[option] !== undefined) {
                // Direct key-value structure
                value = response.value[option];
            } else if (response.value.value && response.value.value[option] !== undefined) {
                // Nested value object structure
                value = response.value.value[option];
            }

            if (typeof value === 'number') {
                values.push(value);
            }
        });

        // Calculate statistics
        if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = Math.round(sum / values.length);
            const min = Math.min(...values);
            const max = Math.max(...values);

            // Store statistics with the count equal to the number of surveys that rated this option
            statistics[option] = {
                average: avg,
                min,
                max,
                count: values.length // This will now be the actual number of responses for this option
            };
        } else {
            statistics[option] = {
                average: 0,
                min: 0,
                max: 0,
                count: 0
            };
        }
    });

    return {
        options,
        statistics,
        totalResponses: validResponses.length
    };
}

/**
 * Clear the data cache
 */
export function clearCache() {
    surveyDefinitionCache = null;
    surveyResultsCache = null;
}
