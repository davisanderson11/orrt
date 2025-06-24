import { JsPsych } from "jspsych";
import HtmlKeyboardResponsePlugin from '@jspsych/plugin-html-keyboard-response';
import HtmlButtonResponsePlugin from '@jspsych/plugin-html-button-response';

/* CSS Styles */
export const ORR_STYLES = `
    <style>
        .orr-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 40px;
            min-height: 80vh;
            justify-content: center;
        }
        
        .orr-item {
            font-size: 72px;
            font-weight: bold;
            color: #333;
            margin: 40px 0;
            font-family: 'Arial', sans-serif;
            letter-spacing: 2px;
        }
        
        .orr-letter-array {
            display: flex;
            gap: 50px;
            margin: 40px 0;
        }
        
        .orr-letter-choice {
            font-size: 60px;
            font-weight: bold;
            padding: 30px 40px;
            border: 3px solid #ddd;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: white;
        }
        
        .orr-letter-choice:hover {
            background: #f0f0f0;
            border-color: #0066cc;
            transform: scale(1.05);
        }
        
        .orr-letter-choice.selected {
            background: #e3f2fd;
            border-color: #0066cc;
        }
        
        .orr-instructions {
            font-size: 24px;
            color: #555;
            margin-bottom: 30px;
            text-align: center;
            font-style: italic;
        }
        
        .orr-admin-panel {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            display: flex;
            gap: 15px;
            align-items: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        .orr-score-indicator {
            font-size: 18px;
            font-weight: bold;
            padding: 8px 15px;
            border-radius: 5px;
            min-width: 80px;
            text-align: center;
        }
        
        .orr-score-correct {
            background: #22c55e;
            color: white;
        }
        
        .orr-score-incorrect {
            background: #ef4444;
            color: white;
        }
        
        .orr-score-pending {
            background: #fbbf24;
            color: #333;
        }
        
        .orr-admin-info {
            font-size: 14px;
            color: #666;
        }
        
        .demographics-form {
            max-width: 500px;
            margin: auto;
        }
        
        .demographics-form label {
            display: block;
            margin-top: 15px;
            font-weight: bold;
        }
        
        .demographics-form input, .demographics-form select {
            width: 100%;
            padding: 8px;
            margin-top: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }
        
        .setup-container {
            max-width: 700px;
            margin: auto;
            padding: 30px;
        }
        
        .setup-section {
            background: #f5f5f5;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 5px solid #0066cc;
        }
        
        .loading-screen {
            text-align: center;
            padding: 50px;
        }
        
        .loading-spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #0066cc;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
`;

/* Constants */
const DEFAULT_MIN_ITEMS = 40;
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
    ipa?: string;
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
    isPractice: boolean;
    practiceResponses: Response[];
}

interface TrialData extends Record<string, any> {
    response?: string;
    correct?: boolean;
    rt?: number;
    phase?: string;
    item_id?: string;
    item_content?: string | string[];
    item_type?: string;
    item_difficulty?: number;
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
    isLoading: false,
    isPractice: false,
    practiceResponses: []
};

/* IPA fetching functions */
async function fetchIPADictionary(): Promise<Map<string, string>> {
    const ipaMap = new Map<string, string>();
    
    try {
        // Using a public CMU dictionary converted to IPA format
        const response = await fetch('https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt');
        const text = await response.text();
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (line.trim()) {
                const [word, ipa] = line.split('\t');
                if (word && ipa) {
                    ipaMap.set(word.toLowerCase(), ipa);
                }
            }
        }
        
        console.log(`Loaded ${ipaMap.size} IPA pronunciations`);
    } catch (error) {
        console.error('Failed to load IPA dictionary:', error);
        // Try alternative source
        try {
            const backupResponse = await fetch('https://raw.githubusercontent.com/menelik3/cmudict-ipa/master/cmudict-ipa.txt');
            const backupText = await backupResponse.text();
            const backupLines = backupText.split('\n');
            
            for (const line of backupLines) {
                if (line.trim()) {
                    const parts = line.split(/\s+/);
                    if (parts.length >= 2) {
                        const word = parts[0].toLowerCase().replace(/\(\d+\)$/, ''); // Remove (1), (2) variants
                        const ipa = '/' + parts.slice(1).join(' ') + '/';
                        ipaMap.set(word, ipa);
                    }
                }
            }
            console.log(`Loaded ${ipaMap.size} IPA pronunciations from backup source`);
        } catch (backupError) {
            console.error('Failed to load backup IPA dictionary:', backupError);
        }
    }
    
    return ipaMap;
}

// Global IPA dictionary
let ipaDict: Map<string, string> | null = null;

async function getIPA(word: string): Promise<string | undefined> {
    if (!ipaDict) {
        ipaDict = await fetchIPADictionary();
    }
    return ipaDict.get(word.toLowerCase());
}

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
        
        // Pre-load IPA dictionary
        await fetchIPADictionary();
        
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
                        if (typeof word === 'string' && word.indexOf(' ') === -1 && /[aeiouAEIOU]/.test(word) && word.length > 2) {
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
                .filter((w: string) => w.length > 0 && /[aeiouAEIOU]/.test(w))
                .slice(0, 2000);
            
            const allWords: WordItem[] = [];
            let wordId = 1;
            
            // Add basic words
            for (let index = 0; index < basicWords.length; index++) {
                const word = basicWords[index];
                const difficulty = 3.0 + (index / 2000) * 3.0;
                const ipa = await getIPA(word);
                allWords.push({
                    id: `W${wordId++}`,
                    content: word,
                    type: 'word',
                    difficulty: difficulty,
                    ipa: ipa,
                    properties: {
                        source: 'common',
                        frequency_rank: index + 1
                    }
                });
            }
            
            // Add GRE words
            const sampledGREWords = this.randomSample(greWords, 150);
            for (let index = 0; index < sampledGREWords.length; index++) {
                const word = sampledGREWords[index];
                const difficulty = 6.0 + (index / sampledGREWords.length) * 4.0;
                const ipa = await getIPA(word);
                allWords.push({
                    id: `W${wordId++}`,
                    content: word,
                    type: 'word',
                    difficulty: difficulty,
                    ipa: ipa,
                    properties: {
                        source: 'GRE',
                        difficulty_level: difficulty > 8 ? 'advanced' : 'intermediate'
                    }
                });
            }
            
            return allWords.sort(() => 0.5 - Math.random());
            
        } catch (error) {
            console.error('Error loading vocabulary:', error);
            
            try {
                const response = await fetch(basicUrl);
                const text = await response.text();
                const words = text.split('\n')
                    .filter((w: string) => w.length > 0 && /[aeiouAEIOU]/.test(w));
                
                return await this.processBasicWords(words);
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

    private async processBasicWords(words: string[]): Promise<WordItem[]> {
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
        
        const flatSamples: { word: string; index: number }[] = [];
        Object.values(samples).forEach(sampleArray => {
            sampleArray.forEach(item => flatSamples.push(item));
        });
        
        for (const { word, index } of flatSamples) {
            const difficulty = this.calculateDifficulty(index, word);
            const ipa = await getIPA(word);
            selectedWords.push({
                id: `W${wordId++}`,
                content: word,
                type: 'word',
                difficulty: difficulty,
                ipa: ipa,
                properties: {
                    frequency_rank: index + 1,
                    length: word.length
                }
            });
        }
        
        return selectedWords.sort(() => 0.5 - Math.random());
    }

    private calculateDifficulty(rank: number, word: string): number {
        let difficulty = 3.0 + (rank / 10000) * 7.0;
        
        if (word.length > 12) difficulty += 1.5;
        else if (word.length > 8) difficulty += 0.7;
        else if (word.length > 6) difficulty += 0.3;
        else if (word.length < 4) difficulty -= 0.5;
        
        if (word.indexOf('ph') !== -1 || word.indexOf('gh') !== -1) difficulty += 0.3;
        if (word.indexOf('tion') !== -1 || word.indexOf('sion') !== -1) difficulty += 0.4;
        if (word.indexOf('ough') !== -1 || word.indexOf('augh') !== -1) difficulty += 0.5;
        
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
        isLoading: false,
        isPractice: false,
        practiceResponses: []
    };
}

// Convert IPA to approximate pronunciation for TTS
function ipaToSpeechApproximation(ipa: string): string {
    // For now, just return the original word - IPA conversion is too unreliable
    // The TTS engine does better with the actual word than with our approximations
    return '';
}

function playAudio(text: string, ipa?: string) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        
        // Just use the original text - most TTS engines don't support IPA well
        // and do better with the actual word
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to find an English voice that might better support phonetics
        const voices = speechSynthesis.getVoices();
        const englishVoice = voices.find(voice => 
            voice.lang.startsWith('en-') && 
            (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Enhanced'))
        ) || voices.find(voice => voice.lang.startsWith('en-'));
        
        if (englishVoice) {
            utterance.voice = englishVoice;
        }
        
        // Adjust settings based on content type
        if (text.length === 1 && /^[A-Z]$/.test(text)) {
            // For single letters, slow down and emphasize
            utterance.rate = 0.7;
            utterance.pitch = 1.1;
            utterance.volume = 1.0;
        } else if (text.split(' ').length === 1 && text.length < 20) {
            // For single words
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
        } else {
            // For sentences and instructions
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.9;
        }
        
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
    
    // Ensure we have at least one item
    if (candidateItems.length === 0) {
        return availableItems[0];
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
    
    for (const response of responses) {
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
    const mean = recentCorrect.reduce((a: number, b: number) => a + b, 0) / recentCorrect.length;
    const variance = recentCorrect.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / recentCorrect.length;
    
    return Math.sqrt(variance) / Math.sqrt(recentResponses.length);
}

function shouldStopTest(responses: Response[]): boolean {
    if (responses.length < CAT_CONFIG.minItems) return false;
    if (responses.length >= CAT_CONFIG.maxItems) return true;
    
    const se = calculateStandardError(responses);
    return se < CAT_CONFIG.targetSE;
}

function createItemStimulus(item: WordItem): string {
    const currentCount = state.isPractice ? state.practiceResponses.length + 1 : state.responses.length + 1;
    const totalCount = state.isPractice ? 3 : CAT_CONFIG.maxItems;
    const progressText = state.isPractice ? `Practice ${currentCount} of 3` : `Item ${currentCount} of ${totalCount}`;
    
    const audioRepeatButton = item.type !== 'letter_array' ? `
        <button class="orr-audio-repeat" onclick="window.repeatAudio()" title="Repeat audio (R)">
            🔊 Repeat
        </button>
    ` : '';
    
    if (item.type === 'letter_array' && item.target) {
        return `
            ${ORR_STYLES}
            <style>
                .orr-progress {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    font-size: 18px;
                    color: #666;
                    font-weight: bold;
                }
                .orr-audio-repeat {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    padding: 8px 16px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                }
                .orr-audio-repeat:hover {
                    background: #45a049;
                }
                .orr-pause-button {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    padding: 8px 16px;
                    background: #ff9800;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .orr-pause-button:hover {
                    background: #e68900;
                }
            </style>
            <div class="orr-container">
                <div class="orr-progress">${progressText}</div>
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
                        1/↑ = correct | 0/↓ = incorrect | R = repeat | P = pause
                    </div>
                </div>
            </div>
        `;
    } else {
        const itemType = item.type === 'letter' ? 'letter' : 'word';
        return `
            ${ORR_STYLES}
            <style>
                .orr-progress {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    font-size: 18px;
                    color: #666;
                    font-weight: bold;
                }
                .orr-audio-repeat {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    padding: 8px 16px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                }
                .orr-audio-repeat:hover {
                    background: #45a049;
                }
                .orr-pause-button {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    padding: 8px 16px;
                    background: #ff9800;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .orr-pause-button:hover {
                    background: #e68900;
                }
            </style>
            <div class="orr-container">
                <div class="orr-progress">${progressText}</div>
                ${audioRepeatButton}
                <div class="orr-instructions">What is this ${itemType}?</div>
                <div class="orr-item">${item.content}</div>
                ${item.ipa ? `<div style="font-size: 24px; color: #666; margin-top: 10px; font-style: italic;">${item.ipa}</div>` : ''}
                <div class="orr-admin-panel">
                    <div class="orr-score-indicator orr-score-pending" id="score-indicator">
                        Awaiting Score (1 or 0)
                    </div>
                    <div class="orr-admin-info">
                        1/↑ = correct | 0/↓ = incorrect | R = repeat | P = pause
                    </div>
                </div>
            </div>
        `;
    }
}

function createPauseScreen() {
    return {
        type: HtmlButtonResponsePlugin,
        stimulus: `
            ${ORR_STYLES}
            <div style="max-width: 700px; margin: auto; text-align: center;">
                <h1>Test Paused</h1>
                <div style="font-size: 20px; line-height: 1.6; margin: 40px 0;">
                    <p>The test has been paused.</p>
                    <p>Take a break if needed.</p>
                    <p style="margin-top: 30px;"><strong>When you're ready, click Continue to resume.</strong></p>
                </div>
            </div>
        `,
        choices: ['Continue']
    };
}

/* Practice items */
function getPracticeItems(): WordItem[] {
    return [
        { id: 'P1', content: 'CAT', type: 'word', difficulty: 3.0 },
        { id: 'P2', content: 'B', type: 'letter', difficulty: 0.6 },
        { id: 'P3', content: ['A', 'B', 'C', 'D'], type: 'letter_array', target: 'C', difficulty: 0.8 }
    ];
}

function createPracticeInstructions() {
    return {
        type: HtmlButtonResponsePlugin,
        stimulus: `
            ${ORR_STYLES}
            <div style="max-width: 700px; margin: auto; text-align: center;">
                <h1>Practice Trials</h1>
                <div style="font-size: 20px; line-height: 1.6; margin: 40px 0;">
                    <p>Let's practice with a few examples first.</p>
                    <p>Remember:</p>
                    <ul style="text-align: left; max-width: 500px; margin: 20px auto;">
                        <li>Read each word or letter out loud</li>
                        <li>The administrator will press 1 for correct or 0 for incorrect</li>
                        <li>Press the spacebar to continue to the next item</li>
                    </ul>
                    <p style="margin-top: 30px;"><strong>Ready to practice?</strong></p>
                </div>
            </div>
        `,
        choices: ['Start Practice']
    };
}

function createPracticeComplete() {
    return {
        type: HtmlButtonResponsePlugin,
        stimulus: `
            ${ORR_STYLES}
            <div style="max-width: 700px; margin: auto; text-align: center;">
                <h1>Practice Complete!</h1>
                <div style="font-size: 20px; line-height: 1.6; margin: 40px 0;">
                    <p>Great job! You've completed the practice trials.</p>
                    <p>Now we'll begin the actual test.</p>
                    <p style="margin-top: 30px;"><strong>Ready to start?</strong></p>
                </div>
            </div>
        `,
        choices: ['Begin Test']
    };
}

/* Timeline component generating functions */
function createDemographics() {
    return {
        type: HtmlButtonResponsePlugin,
        stimulus: `
            ${ORR_STYLES}
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
        on_finish: function(data: TrialData) {
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
        type: HtmlButtonResponsePlugin,
        stimulus: `
            ${ORR_STYLES}
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
        type: HtmlButtonResponsePlugin,
        stimulus: `
            ${ORR_STYLES}
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
        choices: ['Ready']
    };
}

function createTestTrial(jsPsych: JsPsych, isPractice: boolean = false) {
    return {
        type: HtmlKeyboardResponsePlugin,
        stimulus: function() {
            if (isPractice) {
                const practiceItems = getPracticeItems();
                const practiceIndex = state.practiceResponses.length;
                if (practiceIndex >= practiceItems.length) {
                    return '<div style="display:none;">Practice Complete</div>';
                }
                state.currentItem = practiceItems[practiceIndex];
            } else {
                state.currentItem = selectNextItem(state.abilityEstimate, state.itemsAdministered);
                
                if (!state.currentItem || shouldStopTest(state.responses)) {
                    return '<div style="display:none;">Test Complete</div>';
                }
            }
            
            return createItemStimulus(state.currentItem);
        },
        choices: ['1', '0', 'ArrowUp', 'ArrowDown'],
        data: {
            phase: 'scoring',
            isPractice: isPractice
        },
        on_load: function() {
            if (!state.currentItem) return;
            
            // Store current audio for repeat functionality
            (window as any).currentAudioText = '';
            (window as any).repeatAudio = function() {
                if ((window as any).currentAudioText) {
                    playAudio((window as any).currentAudioText, (window as any).currentAudioIPA);
                }
            };
            
            // Add keyboard listener for 'R' key and 'P' for pause
            const handleKeyPress = (e: KeyboardEvent) => {
                if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    (window as any).repeatAudio();
                } else if (e.key === 'p' || e.key === 'P') {
                    e.preventDefault();
                    // Set pause flag
                    (window as any).pauseRequested = true;
                    // Force end the current trial with a special response
                    jsPsych.finishTrial({
                        response: 'PAUSE',
                        rt: null
                    });
                }
            };
            document.addEventListener('keydown', handleKeyPress);
            
            // Store handler for cleanup
            (window as any).currentKeyHandler = handleKeyPress;
            
            if (state.currentItem.type === 'letter_array' && state.currentItem.target) {
                // Don't read instructions, only setup click handlers
                const choices = document.querySelectorAll('.orr-letter-choice');
                choices.forEach(choice => {
                    choice.addEventListener('click', function(this: HTMLElement) {
                        choices.forEach(c => c.classList.remove('selected'));
                        this.classList.add('selected');
                    });
                });
            } else {
                // Read only the word or letter aloud after a short delay
                setTimeout(() => {
                    if (state.currentItem && typeof state.currentItem.content === 'string') {
                        (window as any).currentAudioText = state.currentItem.content;
                        (window as any).currentAudioIPA = state.currentItem.ipa;
                        playAudio(state.currentItem.content, state.currentItem.ipa);
                    }
                }, 500);
            }
        },
        on_finish: function(data: TrialData) {
            // Clean up event handler
            if ((window as any).currentKeyHandler) {
                document.removeEventListener('keydown', (window as any).currentKeyHandler);
                (window as any).currentKeyHandler = null;
            }
            
            if (state.currentItem) {
                // Handle pause
                if (data.response === 'PAUSE' || (window as any).pauseRequested) {
                    data.pause_requested = true;
                    (window as any).pauseRequested = false;
                    // Don't record this as a response
                    return;
                }
                
                // Map arrow keys to scores
                let scoreResponse = data.response;
                if (data.response === 'ArrowUp') scoreResponse = '1';
                else if (data.response === 'ArrowDown') scoreResponse = '0';
                
                if (scoreResponse === '1' || scoreResponse === '0') {
                    data.item_id = state.currentItem.id;
                    data.item_content = state.currentItem.content;
                    data.item_type = state.currentItem.type;
                    data.item_difficulty = state.currentItem.difficulty;
                    data.correct = scoreResponse === '1';
                    data.isPractice = isPractice;
                }
            }
        }
    };
}

function createSpacebarTrial(jsPsych: JsPsych, isPractice: boolean = false) {
    return {
        type: HtmlKeyboardResponsePlugin,
        stimulus: function() {
            if (isPractice) {
                const practiceItems = getPracticeItems();
                if (state.practiceResponses.length >= practiceItems.length) {
                    return '<div style="display:none;">Practice Complete</div>';
                }
            } else {
                if (!state.currentItem || shouldStopTest(state.responses)) {
                    return '<div style="display:none;">Test Complete</div>';
                }
            }
            
            const prevData = jsPsych.data.get().filter({phase: 'scoring'}).last(1).values()[0] as TrialData;
            const correct = prevData.correct || false;
            
            let html = `${ORR_STYLES}<div class="orr-container">`;
            
            if (state.currentItem && state.currentItem.type === 'letter_array' && state.currentItem.target) {
                html += `<div class="orr-instructions">Point to the letter ${state.currentItem.target}</div>`;
                html += '<div class="orr-letter-array">';
                (state.currentItem.content as string[]).forEach((letter) => {
                    html += `<div class="orr-letter-choice">
                        ${letter}
                    </div>`;
                });
                html += '</div>';
            } else if (state.currentItem) {
                const itemType = state.currentItem.type === 'letter' ? 'letter' : 'word';
                html += `<div class="orr-instructions">What is this ${itemType}?</div>`;
                html += `<div class="orr-item">${state.currentItem.content}</div>`;
                if (state.currentItem.ipa) {
                    html += `<div style="font-size: 24px; color: #666; margin-top: 10px; font-style: italic;">${state.currentItem.ipa}</div>`;
                }
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
            phase: 'spacebar',
            isPractice: isPractice
        },
        on_finish: function(data: TrialData) {
            if (!state.currentItem) return;
            
            const prevData = jsPsych.data.get().filter({phase: 'scoring'}).last(1).values()[0] as TrialData;
            
            // Don't record anything if pause was requested
            if (prevData.pause_requested || prevData.response === 'PAUSE') {
                return;
            }
            
            if (isPractice) {
                if (data.response === 'ArrowLeft' && state.practiceResponses.length > 0) {
                    // Go back functionality for practice
                    state.practiceResponses.pop();
                } else {
                    // Record practice response
                    state.practiceResponses.push({
                        itemId: state.currentItem.id,
                        correct: prevData.correct || false,
                        rt: prevData.rt || 0
                    });
                }
            } else {
                if (data.response === 'ArrowLeft' && state.responses.length > 0) {
                    // Go back functionality
                    state.responses.pop();
                    state.itemsAdministered.pop();
                    state.abilityEstimate = updateAbilityEstimate(state.responses);
                } else {
                    // Record response
                    state.responses.push({
                        itemId: state.currentItem.id,
                        correct: prevData.correct || false,
                        rt: prevData.rt || 0
                    });
                    state.itemsAdministered.push(state.currentItem.id);
                    
                    // Update ability estimate
                    state.abilityEstimate = updateAbilityEstimate(state.responses);
                }
            }
        }
    };
}

function createResults(jsPsych: JsPsych) {
    return {
        type: HtmlButtonResponsePlugin,
        stimulus: function() {
            const totalCorrect = state.responses.filter(r => r.correct).length;
            const accuracy = state.responses.length > 0 ? 
                (totalCorrect / state.responses.length * 100).toFixed(1) : 0;
            const finalAbility = updateAbilityEstimate(state.responses);
            const finalSE = calculateStandardError(state.responses);
            
            // Prepare export data
            const exportData = {
                participant: state.participantData,
                summary: {
                    totalItems: state.responses.length,
                    correctResponses: totalCorrect,
                    accuracy: parseFloat(accuracy as string),
                    finalAbility: finalAbility,
                    standardError: finalSE,
                    testDate: new Date().toISOString()
                },
                responses: state.responses.map(resp => {
                    const item = CAT_CONFIG.items.find(i => i.id === resp.itemId);
                    return {
                        itemId: resp.itemId,
                        itemContent: item?.content,
                        itemType: item?.type,
                        itemDifficulty: item?.difficulty,
                        correct: resp.correct,
                        responseTime: resp.rt
                    };
                })
            };
            
            // Store export data in window for download functions
            (window as any).orrExportData = exportData;
            
            return `
                ${ORR_STYLES}
                <style>
                    .export-buttons {
                        margin: 20px auto;
                        display: flex;
                        gap: 10px;
                        justify-content: center;
                    }
                    .export-button {
                        padding: 10px 20px;
                        background: #0066cc;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 16px;
                    }
                    .export-button:hover {
                        background: #0052a3;
                    }
                </style>
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
                    <div class="export-buttons">
                        <button class="export-button" onclick="downloadCSV()">Download CSV</button>
                        <button class="export-button" onclick="downloadJSON()">Download JSON</button>
                    </div>
                </div>
            `;
        },
        choices: ['View Data'],
        on_load: function() {
            // Add download functions to window
            (window as any).downloadCSV = function() {
                const data = (window as any).orrExportData;
                let csv = 'Item ID,Item Content,Item Type,Difficulty,Correct,Response Time\n';
                data.responses.forEach((resp: any) => {
                    csv += `${resp.itemId},"${resp.itemContent}",${resp.itemType},${resp.itemDifficulty},${resp.correct},${resp.responseTime}\n`;
                });
                csv += `\nSummary\n`;
                csv += `Total Items,${data.summary.totalItems}\n`;
                csv += `Correct Responses,${data.summary.correctResponses}\n`;
                csv += `Accuracy,${data.summary.accuracy}%\n`;
                csv += `Final Ability,${data.summary.finalAbility}\n`;
                csv += `Standard Error,${data.summary.standardError}\n`;
                csv += `Age,${data.participant.age}\n`;
                csv += `Education,${data.participant.education}\n`;
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `orr_results_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
            };
            
            (window as any).downloadJSON = function() {
                const data = (window as any).orrExportData;
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `orr_results_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
            };
        }
    };
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
): Promise<Record<string, any>[]> {
    // Reset state for new timeline
    resetState();
    
    // Load voices
    if ('speechSynthesis' in window) {
        // Load voices (some browsers need this)
        speechSynthesis.getVoices();
        // Wait a bit for voices to load
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Update CAT config with parameters
    CAT_CONFIG.minItems = minItems;
    CAT_CONFIG.maxItems = maxItems;
    CAT_CONFIG.targetSE = targetSE;
    
    const timeline: Record<string, any>[] = [];
    
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
        
        // Practice trials
        timeline.push(createPracticeInstructions());
        
        // Practice loop with pause handling
        const practiceLoop = {
            timeline: [
                // Conditional pause screen
                {
                    timeline: [createPauseScreen()],
                    conditional_function: function() {
                        const lastTrial = jsPsych.data.get().last(1).values()[0];
                        return lastTrial && lastTrial.pause_requested === true;
                    }
                },
                createTestTrial(jsPsych, true),
                // Only show spacebar trial if not paused
                {
                    timeline: [createSpacebarTrial(jsPsych, true)],
                    conditional_function: function() {
                        const lastTrial = jsPsych.data.get().last(1).values()[0];
                        return !lastTrial.pause_requested;
                    }
                }
            ],
            loop_function: function() {
                state.isPractice = true;
                return state.practiceResponses.length < getPracticeItems().length;
            }
        };
        
        timeline.push(practiceLoop);
        timeline.push(createPracticeComplete());
        
        // Reset isPractice flag before main test
        timeline.push({
            type: HtmlButtonResponsePlugin,
            stimulus: '',
            choices: [],
            trial_duration: 0,
            on_finish: function() {
                state.isPractice = false;
            }
        });
        
        timeline.push(createMainInstructions());
    }
    
    // Main test loop with pause handling
    const testLoop = {
        timeline: [
            // Conditional pause screen
            {
                timeline: [createPauseScreen()],
                conditional_function: function() {
                    const lastTrial = jsPsych.data.get().last(1).values()[0];
                    return lastTrial && lastTrial.pause_requested === true;
                }
            },
            createTestTrial(jsPsych, false),
            // Only show spacebar trial if not paused
            {
                timeline: [createSpacebarTrial(jsPsych, false)],
                conditional_function: function() {
                    const lastTrial = jsPsych.data.get().last(1).values()[0];
                    return !lastTrial.pause_requested;
                }
            }
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
export type { WordItem, Response, ParticipantData, CATConfig, GameState, TrialData };