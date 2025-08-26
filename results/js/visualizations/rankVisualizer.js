/**
 * rankVisualizer.js
 * Specialized visualization component for rank option questions
 * 
 * This module creates visualizations for rank-type questions with two main views:
 * 1. Ordered list using ranked voting algorithm (Borda count)
 * 2. Stacked bar chart showing distribution of rank positions (1st, 2nd, 3rd, etc.)
 */

/**
 * Create visualizations for rank question responses
 * @param {HTMLElement} container - The DOM element to render the visualizations in
 * @param {Array} responses - Array of question responses
 * @param {Object} question - The question definition
 * @param {string} [type='rankedOrder'] - Type of visualization ('rankedOrder', 'stackedPositions', 'irv')
 */
export function createRankVisualization(container, responses, question, type = 'rankedOrder') {
    if (!container || !Array.isArray(responses) || responses.length === 0) {
        container.innerHTML = '<p class="no-data">No data available for this question.</p>';
        return;
    }
    
    // Process responses to extract ranking data
    const rankingData = processRankResponses(responses, question);
    
    // Don't render if no valid data
    if (!rankingData || rankingData.totalResponses === 0) {
        container.innerHTML = '<p class="no-data">No valid responses for this question yet.</p>';
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Create visualization based on type
    switch (type) {
        case 'rankedOrder':
            renderRankedOrderVisualization(container, rankingData, question);
            break;
        case 'stackedPositions':
            renderStackedPositionsVisualization(container, rankingData, question);
            break;
        case 'irv':
            const irvResult = runInstantRunoffVoting(responses, question);
            renderIRVVisualization(container, irvResult, question);
            break;
        default:
            // If unknown type, show both visualizations
            const orderContainer = document.createElement('div');
            orderContainer.className = 'rank-visualization-section';
            orderContainer.innerHTML = '<h4>Final Ranking (Borda Count Method)</h4>';
            container.appendChild(orderContainer);
            
            renderRankedOrderVisualization(orderContainer, rankingData, question);
            
            const separator = document.createElement('hr');
            separator.className = 'visualization-separator';
            container.appendChild(separator);
            
            const stackedContainer = document.createElement('div');
            stackedContainer.className = 'rank-visualization-section';
            stackedContainer.innerHTML = '<h4>Rank Position Distribution</h4>';
            container.appendChild(stackedContainer);
            
            renderStackedPositionsVisualization(stackedContainer, rankingData, question);
    }
}

/**
 * Run the Instant-Runoff Voting (IRV) algorithm
 * @param {Array} responses - Array of question responses
 * @param {Object} question - The question definition
 * @returns {Object} - The winner and the history of rounds
 */
function runInstantRunoffVoting(responses, question) {
    const options = question.rankOptions.options.map(opt => opt.value);
    let ballots = responses.filter(r => Array.isArray(r));

    const rounds = [];
    let activeCandidates = [...options];

    while (activeCandidates.length > 1) {
        const voteCounts = {};
        activeCandidates.forEach(c => voteCounts[c] = 0);

        ballots.forEach(ballot => {
            for (const candidate of ballot) {
                if (activeCandidates.includes(candidate.id)) {
                    voteCounts[candidate.id]++;
                    break;
                }
            }
        });

        const totalVotes = ballots.length;
        const roundResult = {
            counts: { ...voteCounts },
            totalVotes: totalVotes,
            eliminated: null
        };



        let minVotes = Infinity;
        activeCandidates.forEach(c => {
            if (voteCounts[c] < minVotes) {
                minVotes = voteCounts[c];
            }
        });

        const toEliminate = activeCandidates.filter(c => voteCounts[c] === minVotes);
        
        if (toEliminate.length === activeCandidates.length) {
            return { winner: null, rounds: rounds };
        }

        roundResult.eliminated = toEliminate;
        rounds.push(roundResult);

        activeCandidates = activeCandidates.filter(c => !toEliminate.includes(c));
        
        if (activeCandidates.length === 0) {
            return { winner: null, rounds: rounds };
        }
    }

    return { winner: activeCandidates.length > 0 ? activeCandidates[0] : null, rounds: rounds };
}

/**
 * Render the Instant-Runoff Voting (IRV) visualization
 * @param {HTMLElement} container - Container element
 * @param {Object} irvResult - The result from runInstantRunoffVoting
 * @param {Object} question - Question definition
 */
function renderIRVVisualization(container, irvResult, question) {
    container.innerHTML = '';

    const { winner, rounds } = irvResult;
    const options = question.rankOptions.options;

    const getOptionLabel = (id) => {
        const option = options.find(o => o.value === id);
        return option ? option.label : id;
    };

    const finalRankingContainer = document.createElement('div');
    finalRankingContainer.className = 'irv-final-ranking';

    if (winner) {
        const finalRankingIds = [winner];
        const eliminatedInOrder = rounds.flatMap(r => r.eliminated || []);
        const rankedEliminated = [...eliminatedInOrder].reverse();
        finalRankingIds.push(...rankedEliminated);

        finalRankingContainer.innerHTML = `<h4>Final Ranking (IRV)</h4>`;
        const rankingList = document.createElement('ol');
        rankingList.className = 'irv-ranking-list';
        finalRankingIds.forEach(candidateId => {
            const li = document.createElement('li');
            li.textContent = getOptionLabel(candidateId);
            rankingList.appendChild(li);
        });
        finalRankingContainer.appendChild(rankingList);
    } else {
        finalRankingContainer.innerHTML = '<h3>No clear winner (tie)</h3>';
    }
    container.appendChild(finalRankingContainer);

    const roundsContainer = document.createElement('div');
    roundsContainer.className = 'irv-rounds';
    roundsContainer.innerHTML = '<h4>Voting Rounds</h4>';

    rounds.forEach((round, index) => {
        const roundDiv = document.createElement('div');
        roundDiv.className = 'irv-round';
        roundDiv.innerHTML = `<h5>Round ${index + 1}</h5>`;

        const countsList = document.createElement('ul');
        Object.entries(round.counts).sort((a, b) => b[1] - a[1]).forEach(([candidate, count]) => {
            const li = document.createElement('li');
            const percentage = round.totalVotes > 0 ? ((count / round.totalVotes) * 100).toFixed(1) : 0;
            li.textContent = `${getOptionLabel(candidate)}: ${count} votes (${percentage}%)`;
            countsList.appendChild(li);
        });
        roundDiv.appendChild(countsList);

        if (round.eliminated && round.eliminated.length > 0) {
            const eliminatedP = document.createElement('p');
            eliminatedP.className = 'eliminated-candidate';
            eliminatedP.textContent = `Eliminated: ${round.eliminated.map(getOptionLabel).join(', ')}`;
            roundDiv.appendChild(eliminatedP);
        }
        
        roundsContainer.appendChild(roundDiv);
    });

    container.appendChild(roundsContainer);
}

/**
 * Process rank responses to extract ranking data
 * @param {Array} responses - Array of question responses
 * @param {Object} question - The question definition
 * @returns {Object} - Processed ranking data
 */
function processRankResponses(responses, question) {
    // Extract valid responses
    const validResponses = responses.filter(response => {
        // Responses can be arrays of ordered options or objects with rank positions
        return Array.isArray(response) || (typeof response === 'object' && response !== null);
    });
    
    if (validResponses.length === 0) {
        return null;
    }
    
    // Extract options from question definition
    const options = question.rankOptions && question.rankOptions.options ?
        question.rankOptions.options.map(opt => ({ id: opt.value, label: opt.label || opt.value })) :
        [];
    
    // Count how many options we have
    const optionCount = options.length;
    
    // Initialize position counts
    const positionCounts = {};
    options.forEach(option => {
        positionCounts[option.id] = new Array(optionCount).fill(0);
    });
    
    // Initialize total points (Borda count)
    const points = {};
    options.forEach(option => {
        points[option.id] = 0;
    });
    
    // Process each response
    validResponses.forEach(response => {
        if (Array.isArray(response)) {
            // Array format:[{id: 'portfolio', rank: 0}] 
            response.forEach((optionId, index) => {
                if (positionCounts[optionId.id]) {
                    // Record the position count (0-based index)
                    positionCounts[optionId.id][optionId.rank]++;
                    
                    // Add Borda points (higher ranks get more points)
                    // Points are inverse of position (1st = n points, 2nd = n-1 points, etc.)
                    points[optionId.id] += optionCount - optionId.rank;
                }
            });
        } else if (typeof response === 'object' && response !== null) {
            // Object format: { option1: 2, option2: 3, option3: 1 } (rank positions)
            // We need to convert this to array format first
            const ranks = [];
            
            // Create an array of [optionId, rank] pairs
            Object.entries(response).forEach(([optionId, rank]) => {
                if (typeof rank === 'number' && rank > 0 && rank <= optionCount) {
                    ranks.push([optionId, rank]);
                }
            });
            
            // Sort by rank
            ranks.sort((a, b) => a[1] - b[1]);
            
            // Process in rank order
            ranks.forEach(([optionId, rank], index) => {
                if (positionCounts[optionId]) {
                    // Record the position count (rank is 1-based, convert to 0-based)
                    positionCounts[optionId][rank - 1]++;
                    
                    // Add Borda points
                    points[optionId] += optionCount - (rank - 1);
                }
            });
        }
    });
    
    // Calculate final rankings based on Borda count
    const rankings = options.map(option => ({
        id: option.id,
        label: option.label,
        points: points[option.id],
        positionCounts: positionCounts[option.id]
    }));
    
    // Sort by points (descending)
    rankings.sort((a, b) => b.points - a.points);
    
    return {
        rankings,
        totalResponses: validResponses.length,
        optionCount
    };
}

/**
 * Render ranked order visualization using Borda count
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Processed ranking data
 * @param {Object} question - Question definition
 */
function renderRankedOrderVisualization(container, data, question) {
    // Create a horizontal bar chart showing the points for each option
    const canvas = document.createElement('canvas');
    canvas.id = `rank-order-chart-${question.id}`;
    canvas.width = 600;
    canvas.height = Math.max(300, data.rankings.length * 40 + 100);
    
    container.appendChild(canvas);
    
    // Prepare data for the chart
    const labels = data.rankings.map(item => item.label);
    const chartData = data.rankings.map(item => item.points);
    
    // Generate colors with decreasing opacity to show rank
    const colors = data.rankings.map((_, index) => {
        const opacity = 1 - (index * 0.7 / data.rankings.length);
        return `rgba(74, 134, 232, ${Math.max(0.3, opacity)})`;
    });
    
    // Create chart configuration
    const config = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ranking Points',
                data: chartData,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.5)', '1)')),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Points (Borda Count)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Options (Ranked)'
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
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const ranking = data.rankings[context.dataIndex];
                            
                            return [
                                `${label}: ${value} points`,
                                `Rank: #${context.dataIndex + 1} of ${data.rankings.length}`
                            ];
                        }
                    }
                },
                datalabels: {
                    formatter: (value, context) => {
                        // Show ranking number and points
                        return `#${context.dataIndex + 1} (${value} pts)`;
                    },
                    color: '#fff',
                    font: {
                        weight: 'bold'
                    },
                    anchor: 'center',
                    align: 'center'
                }
            }
        }
    };
    
    // Create chart
    new Chart(canvas, config);
    
    // Add a text explanation
    const explanation = document.createElement('div');
    explanation.className = 'rank-explanation';
    explanation.innerHTML = `
        <p class="explanation-text">
            This visualization shows the final ranking of options using the Borda count method.
            Each time an option is ranked 1st, it receives ${data.optionCount} points, 
            2nd place receives ${data.optionCount - 1} points, and so on. 
            The bars show the total points each option received across ${data.totalResponses} responses.
        </p>
    `;
    container.appendChild(explanation);
}

/**
 * Render stacked positions visualization
 * @param {HTMLElement} container - Container element
 * @param {Object} data - Processed ranking data
 * @param {Object} question - Question definition
 */
function renderStackedPositionsVisualization(container, data, question) {
    // Create canvas for the chart
    const canvas = document.createElement('canvas');
    canvas.id = `rank-positions-chart-${question.id}`;
    canvas.width = 600;
    canvas.height = Math.max(300, data.rankings.length * 40 + 100);
    
    container.appendChild(canvas);
    
    // Labels are the option names, ordered by the final ranking
    const labels = data.rankings.map(item => item.label);
    
    // Create datasets for each position (1st, 2nd, 3rd, etc.)
    const datasets = [];
    
    for (let i = 0; i < data.optionCount; i++) {
        // Define colors for each rank position
        const rankColors = [
            'rgba(255, 215, 0, 0.8)',    // Gold (1st)
            'rgba(192, 192, 192, 0.8)',  // Silver (2nd)
            'rgba(205, 127, 50, 0.8)',   // Bronze (3rd)
            'rgba(100, 149, 237, 0.8)',  // Cornflower Blue (4th)
            'rgba(106, 168, 79, 0.8)',   // Green (5th)
            'rgba(230, 145, 56, 0.8)',   // Orange (6th)
            'rgba(142, 99, 206, 0.8)',   // Purple (7th)
            'rgba(213, 87, 59, 0.8)',    // Red (8th)
            'rgba(69, 129, 142, 0.8)',   // Teal (9th)
            'rgba(102, 102, 102, 0.8)'   // Gray (10th+)
        ];
        
        const positionData = data.rankings.map(item => item.positionCounts[i]);
        
        datasets.push({
            label: `Ranked ${i + 1}${getOrdinalSuffix(i + 1)}`,
            data: positionData,
            backgroundColor: i < rankColors.length ? rankColors[i] : rankColors[rankColors.length - 1],
            borderColor: 'rgba(255, 255, 255, 0.8)',
            borderWidth: 1
        });
    }
    
    // Create chart configuration
    const config = {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Responses'
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Options'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 15,
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.dataset.label || '';
                            const value = context.raw || 0;
                            const percentage = Math.round((value / data.totalResponses) * 100);
                            
                            return `${label}: ${value} (${percentage}% of responses)`;
                        }
                    }
                },
                datalabels: {
                    formatter: (value) => {
                        return value > 0 ? value : '';
                    },
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    display: (context) => {
                        return context.raw > 1; // Only show label if value > 1
                    }
                }
            }
        }
    };
    
    // Create chart
    new Chart(canvas, config);
    
    // Add a text explanation
    const explanation = document.createElement('div');
    explanation.className = 'rank-explanation';
    explanation.innerHTML = `
        <p class="explanation-text">
            This visualization shows how many times each option was ranked in each position.
            Options are ordered by their final ranking (using Borda count).
            For example, the gold segments show how many times each option was ranked 1st.
            The visualization is based on ${data.totalResponses} responses.
        </p>
    `;
    container.appendChild(explanation);
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 * @param {number} n - Number
 * @returns {string} - Ordinal suffix
 */
function getOrdinalSuffix(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
