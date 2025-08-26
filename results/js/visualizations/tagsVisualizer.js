/**
 * tagsVisualizer.js
 * Visualization component for tags questions
 */

/**
 * Create a word cloud visualization for tags question responses
 * @param {HTMLElement} container - The DOM element to render the visualization in
 * @param {Array} responses - Array of question responses, where each response is an array of tags
 * @param {Object} question - The question definition
 * @param {string} [type='wordcloud'] - Type of visualization
 */
export function createTagsVisualization(container, responses, question, type = 'wordcloud') {
    if (!container || !Array.isArray(responses) || responses.length === 0) {
        container.innerHTML = '<p class="no-data">No data available for this question.</p>';
        return;
    }

    const aggregatedData = aggregateTags(responses);

    if (aggregatedData.totalTags === 0) {
        container.innerHTML = '<p class="no-data">No tags for this question yet.</p>';
        return;
    }

    container.innerHTML = '';

    switch (type) {
        case 'wordcloud':
            renderWordCloud(container, aggregatedData, question);
            break;
        default:
            renderWordCloud(container, aggregatedData, question);
    }
}

/**
 * Aggregates tag responses to count frequencies.
 * @param {Array<Array<string>>} responses - Array of tag arrays.
 * @returns {Object} Aggregated data including tag counts.
 */
function aggregateTags(responses) {
    const tagCounts = {};
    let totalTags = 0;

    responses.forEach(response => {
        if (Array.isArray(response)) {
            response.forEach(tag => {
                const normalizedTag = tag.toLowerCase();
                tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                totalTags++;
            });
        }
    });

    const topTags = Object.entries(tagCounts).map(([text, weight]) => ({ text, weight }));

    return { totalTags, topTags };
}

/**
 * Render a word cloud visualization
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Aggregated data
 * @param {Object} question - Question definition
 */
function renderWordCloud(container, data, question) {
    const wordcloudContainer = document.createElement('div');
    wordcloudContainer.className = 'wordcloud-container';
    wordcloudContainer.style.height = '300px';
    wordcloudContainer.style.position = 'relative';

    const words = [...data.topTags].sort((a, b) => b.weight - a.weight);
    const maxWeight = Math.max(...words.map(w => w.weight), 1);

    const simpleCloud = document.createElement('div');
    simpleCloud.className = 'simple-wordcloud';
    simpleCloud.style.display = 'flex';
    simpleCloud.style.flexWrap = 'wrap';
    simpleCloud.style.justifyContent = 'center';
    simpleCloud.style.alignItems = 'center';
    simpleCloud.style.padding = '20px';

    words.forEach(word => {
        const wordElement = document.createElement('span');
                const fontSize = Math.max(12, Math.min(36, 12 + (word.weight / maxWeight) * 24));
        const opacity = 0.5 + (word.weight / maxWeight) * 0.5;

        wordElement.textContent = word.text;
        wordElement.style.fontSize = `${fontSize}px`;
        wordElement.style.padding = '5px 8px';
        wordElement.style.margin = '5px';
        wordElement.style.color = `rgba(74, 134, 232, ${opacity})`;
        wordElement.style.fontWeight = fontSize > 25 ? 'bold' : 'normal';
        wordElement.title = `${word.text}: ${word.weight} occurrences`;

        simpleCloud.appendChild(wordElement);
    });

    wordcloudContainer.appendChild(simpleCloud);
    container.appendChild(wordcloudContainer);
}
