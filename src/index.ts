import { JsPsych } from "jspsych";
import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';
import jsPsychHtmlButtonResponse from '@jspsych/plugin-html-button-response';

/* Constants */
const DEFAULT_MIN_ITEMS = 20;
const DEFAULT_MAX_ITEMS = 40;
const DEFAULT_TARGET_SE = 0.3;
const PROMPT_DELAY = 5000;

/* Types */
interface WordItem {
    id: string;
    content: string | string[];
    type: 'letter' | 'word' | 'letter_array';
    difficulty: number;
    target?: string;
    properties?: {
        source?: string;
        frequency_rank?: number;
        length?: number;
        difficulty_level?: string;
    };
}

interface Response {
    itemId: string;
    correct: boolean;
    rt: number;
}

interface ParticipantData {
    age: number;
    education: string;
    startPointOverride: number | null;
}

interface CATConfig {
    items: WordItem[];
    startPoints: {
        age: Record<number, number>;
        education: Record<string, number>;
    };
    maxItems: number;
    minItems: number;
    targetSE: number;
}

interface GameState {
    participantData: ParticipantData;
    responses: Response[];
    abilityEstimate: number;
    itemsAdministered: string[];
    currentItem: WordItem | null;
    isLoading: boolean;
}

/* Default CAT Configuration */
const CAT_CONFIG: CATConfig = {
    items: [],
    startPoints: {
        age: {
            7: 0.5,   // Start with letter arrays
            8: 1.0,   // Start with simple letters
            9: 2.0,   // Start with complex letters
            10: 3.0,  // Start with simple CVC words
            11: 3.5,  // Start with easy words
            12: 4.0,  // Start with common words
            13: 4.5,  // Start with grade-level words
            14: 5.0,  // Start with intermediate words
            15: 5.5,  // Start with more complex words
            16: 6.0,  // Start with advanced vocabulary
            17: 6.5,  // Start with challenging words
            18: 7.0   // Start with difficult words
        },
        education: {
            'less_than_high_school': 4.0,
            'high_school': 5.0,
            'some_college': 6.0,
            'college': 7.0,
            'graduate': 8.0
        }
    },
    maxItems: DEFAULT_MAX_ITEMS,
    minItems: DEFAULT_MIN_ITEMS,
    targetSE: DEFAULT_TARGET_SE,
};

/* Internal state */
let state: GameState = {
    participantData: {
        age: 10,
        education: 'high_school',
        startPointOverride: null
    },
    responses: [],
    abilityEstimate: 3.0,
    itemsAdministered: [],
    currentItem: null,
    isLoading: false
};

/* Word Bank Loader Class */
class ORRWordBankLoader {
    private items: WordItem[] = [];

    generateLetters(): WordItem[] {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        const difficultyMap: Record<string, number> = {
            'A': 0.5, 'E': 0.5, 'I': 0.6, 'O': 0.7,
            'B': 0.6, 'C': 0.7, 'D': 0.8, 'F': 0.9,
            'G': 1.0, 'H': 1.2, 'J': 1.3, 'K': 1.5,
            'L': 0.9, 'M': 1.0, 'N': 1.0, 'P': 1.1,
            'Q': 2.3, 'R': 1.2, 'S': 1.0, 'T': 0.9,
            'U': 1.4, 'V': 1.8, 'W': 1.7, 'X': 2.5,
            'Y': 2.0, 'Z': 2.7
        };

        return letters.map((letter, index) => ({
            id: `L${index + 1}`,
            content: letter,
            type: 'letter' as const,
            difficulty: difficultyMap[letter] || 1.5
        }));
    }

    generateLetterArrays(): WordItem[] {
        return [
            { id: 'LA1', content: ['A', '◯', '△'], type: 'letter_array', target: 'A', difficulty: 0.3 },
            { id: 'LA2', content: ['◯', 'B', '□'], type: 'letter_array', target: 'B', difficulty: 0.4 },
            { id: 'LA3', content: ['E', 'F', 'P', 'T'], type: 'letter_array', target: 'T', difficulty: 0.8 },
            { id: 'LA4', content: ['C', 'O', 'Q', 'G'], type: 'letter_array', target: 'C', difficulty: 1.0 },
            { id: 'LA5', content: ['M', 'N', 'W', 'V'], type: 'letter_array', target: 'N', difficulty: 1.2 },
            { id: 'LA6', content: ['B', 'D', 'P', 'R'], type: 'letter_array', target: 'B', difficulty: 1.5 }
        ];
    }

    async loadWords(): Promise<WordItem[]> {
        const greUrl = 'https://raw.githubusercontent.com/Isomorpheuss/advanced-english-vocabulary/master/vocab/GRE%20Master%20Wordlist%205349.csv';
        const basicUrl = 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt';
        
        try {
            // Load GRE words for advanced vocabulary
            const greResponse = await fetch(greUrl);
            const greText = await greResponse.text();
            
            const greLines = greText.split('\n').slice(1);
            const greWords: string[] = [];
            
            greLines.forEach(line => {
                if (line.trim()) {
                    const match = line.match(/^([^,\t]+)/);
                    if (match) {
                        const word = match[1].trim().toLowerCase();
                        if (!word.includes(' ') && /[aeiouAEIOU]/.test(word) && word.length > 2) {
                            greWords.push(word);
                        }
                    }
                }
            });
            
            console.log(`Loaded ${greWords.length} GRE words`);
            
            // Load basic words
            const basicResponse = await fetch(basicUrl);
            const basicText = await basicResponse.text();
            const basicWords = basicText.split('\n')
                .filter(w => w.length > 0 && /[aeiouAEIOU]/.test(w))
                .slice(0, 2000);
            
            const allWords: WordItem[] = [];
            let wordId = 1;
            
            // Add basic words
            basicWords.forEach((word, index) => {
                const difficulty = 3.0 + (index / 2000) * 3.0;
                allWords.push({
                    id: `W${wordId++}`,
                    content: word,
                    type: 'word',
                    difficulty: difficulty,
                    properties: {
                        source: 'common',
                        frequency_rank: index + 1
                    }
                });
            });
            
            // Add GRE words
            const sampledGREWords = this.randomSample(greWords, 150);
            sampledGREWords.forEach((word, index) => {
                const difficulty = 6.0 + (index / sampledGREWords.length) * 4.0;
                allWords.push({
                    id: `W${wordId++}`,
                    content: word,
                    type: 'word',
                    difficulty: difficulty,
                    properties: {
                        source: 'GRE',
                        difficulty_level: difficulty > 8 ? 'advanced' : 'intermediate'
                    }
                });
            });
            
            return allWords.sort(() => 0.5 - Math.random());
            
        } catch (error) {
            console.error('Error loading vocabulary:', error);
            
            try {
                const response = await fetch(basicUrl);
                const text = await response.text();
                const words = text.split('\n')
                    .filter(w => w.length > 0 && /[aeiouAEIOU]/.test(w));
                
                return this.processBasicWords(words);
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                return [];
            }
        }
    }

    private randomSample<T>(arr: T[], n: number): T[] {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(n, shuffled.length));
    }

    private processBasicWords(words: string[]): WordItem[] {
        const wordPools: Record<string, { word: string; index: number }[]> = {
            easy: [],
            mediumEasy: [],
            medium: [],
            mediumHard: [],
            hard: [],
            veryHard: []
        };
        
        words.forEach((word, index) => {
            if (index < 100) wordPools.easy.push({ word, index });
            else if (index < 500) wordPools.mediumEasy.push({ word, index });
            else if (index < 2000) wordPools.medium.push({ word, index });
            else if (index < 5000) wordPools.mediumHard.push({ word, index });
            else if (index < 8000) wordPools.hard.push({ word, index });
            else wordPools.veryHard.push({ word, index });
        });
        
        const selectedWords: WordItem[] = [];
        let wordId = 1;
        
        const samples = {
            easy: this.randomSample(wordPools.easy, 15),
            mediumEasy: this.randomSample(wordPools.mediumEasy, 20),
            medium: this.randomSample(wordPools.medium, 25),
            mediumHard: this.randomSample(wordPools.mediumHard, 20),
            hard: this.randomSample(wordPools.hard, 15),
            veryHard: this.randomSample(wordPools.veryHard, 10)
        };
        
        Object.values(samples).flat().forEach(({ word, index }) => {
            const difficulty = this.calculateDifficulty(index, word);
            selectedWords.push({
                id: `W${wordId++}`,
                content: word,
                type: 'word',
                difficulty: difficulty,
                properties: {
                    frequency_rank: index + 1,
                    length: word.length
                }
            });
        });
        
        return selectedWords.sort(() => 0.5 - Math.random());
    }

    private calculateDifficulty(rank: number, word: string): number {
        let difficulty = 3.0 + (rank / 10000) * 7.0;
        
        if (word.length > 12) difficulty += 1.5;
        else if (word.length > 8) difficulty += 0.7;
        else if (word.length > 6) difficulty += 0.3;
        else if (word.length < 4) difficulty -= 0.5;
        
        if (word.includes('ph') || word.includes('gh')) difficulty += 0.3;
        if (word.includes('tion') || word.includes('sion')) difficulty += 0.4;
        if (word.includes('ough') || word.includes('augh')) difficulty += 0.5;
        
        return Math.min(10.0, Math.max(3.0, difficulty));
    }

    async loadAllItems(): Promise<WordItem[]> {
        console.log('Loading word bank from external sources...');
        
        const letters = this.generateLetters();
        const letterArrays = this.generateLetterArrays();
        const words = await this.loadWords();
        
        this.items = [...letterArrays, ...letters, ...words];
        
        console.log(`Loaded ${this.items.length} items total`);
        return this.items;
    }
}

/* Internal functions */
function resetState() {
    state = {
        participantData: {
            age: 10,
            education: 'high_school',
            startPointOverride: null
        },
        responses: [],
        abilityEstimate: 3.0,
        itemsAdministered: [],
        currentItem: null,
        isLoading: false
    };
}

function playAudio(text: string) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
    }
}

function getStartPoint(age: number, education: string): number {
    if (age < 19) {
        return CAT_CONFIG.startPoints.age[age] || 3;
    } else {
        return CAT_CONFIG.startPoints.education[education] || 5;
    }
}

function selectNextItem(currentAbility: number, administeredItems: string[]): WordItem | null {
    const availableItems = CAT_CONFIG.items.filter(item => 
        !administeredItems.includes(item.id)
    );
    
    if (availableItems.length === 0) return null;
    
    const isEarlyInTest = administeredItems.length < 3;
    const difficultyTolerance = isEarlyInTest ? 1.5 : 0.5;
    const targetDifficulty = currentAbility;
    
    let candidateItems = availableItems.filter(item => 
        Math.abs(item.difficulty - targetDifficulty) <= difficultyTolerance
    );
    
    if (candidateItems.length === 0) {
        candidateItems = availableItems;
    }
    
    if (administeredItems.length === 0) {
        if (currentAbility < 2.0) {
            candidateItems = candidateItems.filter(item => 
                item.type === 'letter_array' || item.type === 'letter'
            );
        } else if (currentAbility < 3.5) {
            candidateItems = candidateItems.filter(item => 
                item.type === 'letter' || (item.type === 'word' && item.difficulty < 4.0)
            );
        }
    }
    
    candidateItems.sort((a, b) => 
        Math.abs(a.difficulty - targetDifficulty) - Math.abs(b.difficulty - targetDifficulty)
    );
    
    const tolerance = isEarlyInTest ? 0.2 : 0.1;
    const bestDiff = Math.abs(candidateItems[0].difficulty - targetDifficulty);
    const topCandidates = candidateItems.filter(item => 
        Math.abs(item.difficulty - targetDifficulty) <= bestDiff + tolerance
    );
    
    return topCandidates[Math.floor(Math.random() * topCandidates.length)];
}

function updateAbilityEstimate(responses: Response[]): number {
    if (responses.length === 0) return 0;
    
    let sumDifficulty = 0;
    let sumCorrect = 0;
    
    for (let response of responses) {
        const item = CAT_CONFIG.items.find(i => i.id === response.itemId);
        if (item) {
            sumDifficulty += item.difficulty;
            if (response.correct) {
                sumCorrect += item.difficulty;
            }
        }
    }
    
    const proportionCorrect = responses.filter(r => r.correct).length / responses.length;
    const weightedScore = sumDifficulty > 0 ? sumCorrect / responses.length : 0;
    
    return (weightedScore * 0.7) + (proportionCorrect * 10 * 0.3);
}

function calculateStandardError(responses: Response[]): number {
    if (responses.length < 3) return 1;
    
    const recentResponses = responses.slice(-10);
    const recentCorrect = recentResponses.map(r => r.correct ? 1 : 0);
    const mean = recentCorrect.reduce((a, b) => a + b, 0) / recentCorrect.length;
    const variance = recentCorrect.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentCorrect.length;
    
    return Math.sqrt(variance) / Math.sqrt(recentResponses.length);
}

function shouldStopTest(responses: Response[]): boolean {
    if (responses.length < CAT_CONFIG.minItems) return false;
    if (responses.length >= CAT_CONFIG.maxItems) return true;
    
    const se = calculateStandardError(responses);
    return se < CAT_CONFIG.targetSE;
}

function createItemStimulus(item: WordItem): string {
    if (item.type === 'letter_array' && item.target) {
        return `
            <div class="orr-container">
                <div class="orr-instructions">Point to the letter ${item.target}</div>
                <div class="orr-letter-array">
                    ${(item.content as string[]).map((letter, index) => `
                        <div class="orr-letter-choice" data-index="${index}" data-correct="${letter === item.target}">
                            ${letter}
                        </div>
                    `).join('')}
                </div>
                <div class="orr-admin-panel">
                    <div class="orr-score-indicator orr-score-pending" id="score-indicator">
                        Awaiting Score (1 or 0)
                    </div>
                    <div class="orr-admin-info">
                        Item ${state.responses.length + 1} | Press 1 for correct, 0 for incorrect
                    </div>
                </div>
            </div>
        `;
    } else {
        const itemType = item.type === 'letter' ? 'letter' : 'word';
        return `
            <div class="orr-container">
                <div class="orr-instructions">What is this ${itemType}?</div>
                <div class="orr-item">${item.content}</div>
                <div class="orr-admin-panel">
                    <div class="orr-score-indicator orr-score-pending" id="score-indicator">
                        Awaiting Score (1 or 0)
                    </div>
                    <div class="orr-admin-info">
                        Item ${state.responses.length + 1} | Press 1 for correct, 0 for incorrect
                    </div>
                </div>
            </div>
        `;
    }
}

/* Timeline component generating functions */
function createDemographics() {
    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="demographics-form">
                <h2>Participant Information</h2>
                <label>Age:
                    <input type="number" id="participant-age" min="7" max="100" value="10" required>
                </label>
                <label>Education Level (for participants 19+):
                    <select id="participant-education">
                        <option value="high_school" selected>High School Graduate</option>
                        <option value="less_than_high_school">Less than High School</option>
                        <option value="some_college">Some College</option>
                        <option value="college">College Graduate</option>
                        <option value="graduate">Graduate Degree</option>
                    </select>
                </label>
                <label>Start Point Override (optional):
                    <input type="number" id="start-override" min="0" max="10" step="0.5" 
                           placeholder="Leave blank for automatic">
                </label>
            </div>
        `,
        choices: ['Continue'],
        on_finish: function(data: any) {
            try {
                const ageEl = document.getElementById('participant-age') as HTMLInputElement;
                const educationEl = document.getElementById('participant-education') as HTMLSelectElement;
                const overrideEl = document.getElementById('start-override') as HTMLInputElement;
                
                const age = ageEl ? parseInt(ageEl.value) || 10 : 10;
                const education = educationEl ? educationEl.value || 'high_school' : 'high_school';
                const override = overrideEl ? parseFloat(overrideEl.value) : NaN;
                
                state.participantData = {
                    age: age,
                    education: education,
                    startPointOverride: isNaN(override) ? null : override
                };
                
                if (state.participantData.startPointOverride !== null) {
                    state.abilityEstimate = state.participantData.startPointOverride;
                } else {
                    state.abilityEstimate = getStartPoint(age, education);
                }
                
                console.log('Demographics collected:', state.participantData);
                console.log('Initial ability estimate:', state.abilityEstimate);
            } catch (error) {
                console.error('Error collecting demographics:', error);
                state.abilityEstimate = 3.0;
            }
        }
    };
}

function createSetupInstructions() {
    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="setup-container">
                <h1>Setup Instructions</h1>
                
                <div class="setup-section">
                    <h3>Keyboard Controls</h3>
                    <ul>
                        <li><strong>1</strong> - Mark response as correct</li>
                        <li><strong>0</strong> - Mark response as incorrect</li>
                        <li><strong>Spacebar</strong> - Move to next item (after scoring)</li>
                        <li><strong>Left Arrow</strong> - Go back one item (when available)</li>
                    </ul>
                </div>
                
                <p style="margin-top: 30px; color: #666;">
                    <em>Note: Words are loaded from external databases including common English words and GRE vocabulary.</em>
                </p>
            </div>
        `,
        choices: ['Begin Test']
    };
}

function createMainInstructions() {
    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div style="max-width: 700px; margin: auto; text-align: center;">
                <h1>Oral Reading Recognition</h1>
                <div style="font-size: 22px; line-height: 1.6; margin: 40px 0;">
                    <p>Now, we're going to look at some letters and some words.</p>
                    <p>Read each letter or word out loud.</p>
                    <p>Some will be easy, and some will be hard.</p>
                    <p>Don't worry if you don't know the word or its meaning—just read it out loud the best you can.</p>
                    <p style="margin-top: 40px;"><strong>Are you ready?</strong></p>
                </div>
            </div>
        `,
        choices: ['Ready'],
        on_load: function() {
            playAudio("Now, we're going to look at some letters and some words. Read each letter or word out loud. Some will be easy, and some will be hard. Don't worry if you don't know the word or its meaning—just read it out loud the best you can. Are you ready?");
        }
    };
}

function createTestTrial(jsPsych: JsPsych) {
    return {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function() {
            state.currentItem = selectNextItem(state.abilityEstimate, state.itemsAdministered);
            
            if (!state.currentItem || shouldStopTest(state.responses)) {
                return '<div style="display:none;">Test Complete</div>';
            }
            
            return createItemStimulus(state.currentItem);
        },
        choices: ['1', '0'],
        data: {
            phase: 'scoring'
        },
        on_load: function() {
            if (!state.currentItem) return;
            
            if (state.currentItem.type === 'letter_array' && state.currentItem.target) {
                playAudio(`Point to the letter ${state.currentItem.target}`);
                
                const choices = document.querySelectorAll('.orr-letter-choice');
                choices.forEach(choice => {
                    choice.addEventListener('click', function() {
                        choices.forEach(c => c.classList.remove('selected'));
                        (this as HTMLElement).classList.add('selected');
                    });
                });
            } else {
                const itemType = state.currentItem.type === 'letter' ? 'letter' : 'word';
                playAudio(`What is this ${itemType}?`);
            }
            
            setTimeout(() => {
                if (jsPsych.getCurrentTrial() && state.currentItem) {
                    playAudio("It is OK if you don't know the word or what it means—just try to read it out loud the best you can.");
                }
            }, PROMPT_DELAY);
        },
        on_finish: function(data: any) {
            if (state.currentItem) {
                data.item_id = state.currentItem.id;
                data.item_content = state.currentItem.content;
                data.item_type = state.currentItem.type;
                data.item_difficulty = state.currentItem.difficulty;
                data.correct = data.response === '1';
            }
        }
    };
}

function createSpacebarTrial(jsPsych: JsPsych) {
    return {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function() {
            if (!state.currentItem || shouldStopTest(state.responses)) {
                return '<div style="display:none;">Test Complete</div>';
            }
            
            const prevData = jsPsych.data.get().filter({phase: 'scoring'}).last(1).values()[0];
            const correct = prevData.correct;
            
            let html = '<div class="orr-container">';
            
            if (state.currentItem.type === 'letter_array' && state.currentItem.target) {
                html += `<div class="orr-instructions">Point to the letter ${state.currentItem.target}</div>`;
                html += '<div class="orr-letter-array">';
                (state.currentItem.content as string[]).forEach((letter, index) => {
                    html += `<div class="orr-letter-choice" data-index="${index}">
                        ${letter}
                    </div>`;
                });
                html += '</div>';
            } else {
                const itemType = state.currentItem.type === 'letter' ? 'letter' : 'word';
                html += `<div class="orr-instructions">What is this ${itemType}?</div>`;
                html += `<div class="orr-item">${state.currentItem.content}</div>`;
            }
            
            const scoreClass = correct ? 'orr-score-correct' : 'orr-score-incorrect';
            const scoreText = correct ? 'Correct - Press Space' : 'Incorrect - Press Space';
            
            html += `
                <div class="orr-admin-panel">
                    <div class="orr-score-indicator ${scoreClass}">
                        ${scoreText}
                    </div>
                    <div class="orr-admin-info">
                        Item ${state.responses.length + 1} | ${state.responses.length > 0 ? 'Left arrow to change previous' : ''}
                    </div>
                </div>
            </div>`;
            
            return html;
        },
        choices: [' ', 'ArrowLeft'],
        data: {
            phase: 'spacebar'
        },
        on_finish: function(data: any) {
            if (!state.currentItem) return;
            
            const prevData = jsPsych.data.get().filter({phase: 'scoring'}).last(1).values()[0];
            
            if (data.response === 'ArrowLeft' && state.responses.length > 0) {
                // Go back functionality
                state.responses.pop();
                state.itemsAdministered.pop();
                state.abilityEstimate = updateAbilityEstimate(state.responses);
            } else {
                // Record response
                state.responses.push({
                    itemId: state.currentItem.id,
                    correct: prevData.correct,
                    rt: prevData.rt
                });
                state.itemsAdministered.push(state.currentItem.id);
                
                // Update ability estimate
                state.abilityEstimate = updateAbilityEstimate(state.responses);
            }
        }
    };
}

function createResults(jsPsych: JsPsych) {
    return {
        type: jsPsychHtmlButtonResponse,
        stimulus: function() {
            const totalCorrect = state.responses.filter(r => r.correct).length;
            const accuracy = state.responses.length > 0 ? 
                (totalCorrect / state.responses.length * 100).toFixed(1) : 0;
            const finalAbility = updateAbilityEstimate(state.responses);
            const finalSE = calculateStandardError(state.responses);
            
            return `
                <div style="max-width: 700px; margin: auto; text-align: center;">
                    <h1>Test Complete!</h1>
                    <h2>Summary Results</h2>
                    <table style="margin: 30px auto; font-size: 20px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 15px; text-align: left;"><strong>Items Administered:</strong></td>
                            <td style="padding: 15px;">${state.responses.length}</td>
                        </tr>
                        <tr>
                            <td style="padding: 15px; text-align: left;"><strong>Correct Responses:</strong></td>
                            <td style="padding: 15px;">${totalCorrect}</td>
                        </tr>
                        <tr>
                            <td style="padding: 15px; text-align: left;"><strong>Accuracy:</strong></td>
                            <td style="padding: 15px;">${accuracy}%</td>
                        </tr>
                        <tr>
                            <td style="padding: 15px; text-align: left;"><strong>Final Ability Estimate:</strong></td>
                            <td style="padding: 15px;">${finalAbility.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 15px; text-align: left;"><strong>Standard Error:</strong></td>
                            <td style="padding: 15px;">${finalSE.toFixed(3)}</td>
                        </tr>
                    </table>
                </div>
            `;
        },
        choices: ['View Data']
    };
}

function createLoadingScreen(): string {
    return `
        <div class="loading-screen" id="loading-screen">
            <h2>Loading Oral Reading Recognition Test</h2>
            <div class="loading-spinner"></div>
            <p>Loading word database...</p>
        </div>
    `;
}

function createErrorScreen(): string {
    return `
        <div style="text-align: center; padding: 50px;">
            <h2>Error Loading Test</h2>
            <p>Failed to load the word database. Please check your internet connection and refresh the page.</p>
            <button onclick="location.reload()">Refresh Page</button>
        </div>
    `;
}

/* Main timeline creation function */
export async function createTimeline(
    jsPsych: JsPsych,
    {
        minItems = DEFAULT_MIN_ITEMS,
        maxItems = DEFAULT_MAX_ITEMS,
        targetSE = DEFAULT_TARGET_SE,
        showInstructions = true,
        showResults = true,
        preloadWords = true
    }: {
        minItems?: number,
        maxItems?: number,
        targetSE?: number,
        showInstructions?: boolean,
        showResults?: boolean,
        preloadWords?: boolean
    } = {}
): Promise<any[]> {
    // Reset state for new timeline
    resetState();
    
    // Update CAT config with parameters
    CAT_CONFIG.minItems = minItems;
    CAT_CONFIG.maxItems = maxItems;
    CAT_CONFIG.targetSE = targetSE;
    
    const timeline: any[] = [];
    
    // Load words if preloading
    if (preloadWords && CAT_CONFIG.items.length === 0) {
        const loader = new ORRWordBankLoader();
        try {
            const items = await loader.loadAllItems();
            CAT_CONFIG.items = items;
        } catch (error) {
            console.error('Failed to load word bank:', error);
            throw new Error('Failed to load word bank');
        }
    }
    
    // Demographics
    timeline.push(createDemographics());
    
    // Setup instructions
    if (showInstructions) {
        timeline.push(createSetupInstructions());
        timeline.push(createMainInstructions());
    }
    
    // Main test loop
    const testLoop = {
        timeline: [
            createTestTrial(jsPsych),
            createSpacebarTrial(jsPsych)
        ],
        loop_function: function() {
            return !shouldStopTest(state.responses) && 
                   state.itemsAdministered.length < CAT_CONFIG.items.length;
        }
    };
    
    timeline.push(testLoop);
    
    // Results
    if (showResults) {
        timeline.push(createResults(jsPsych));
    }
    
    return timeline;
}

/* Export individual components for custom timeline building */
export const timelineComponents = {
    createDemographics,
    createSetupInstructions,
    createMainInstructions,
    createTestTrial,
    createSpacebarTrial,
    createResults
};

/* Export utility functions */
export const utils = {
    resetState,
    playAudio,
    createItemStimulus,
    selectNextItem,
    updateAbilityEstimate,
    calculateStandardError,
    shouldStopTest,
    getStartPoint,
    ORRWordBankLoader
};

/* Export types */
export type { WordItem, Response, ParticipantData, CATConfig, GameState };