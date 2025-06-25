import { JsPsych } from "jspsych";
import HtmlKeyboardResponsePlugin from '@jspsych/plugin-html-keyboard-response';
import HtmlButtonResponsePlugin from '@jspsych/plugin-html-button-response';

// Fixed list of 40 words from easy to hard
const WORD_LIST = [
    // Very Easy (1-10)
    "cat", "dog", "run", "big", "red", "box", "sun", "hat", "fun", "sit",
    // Easy (11-20)
    "jump", "tree", "blue", "help", "fast", "play", "book", "fish", "hand", "bird",
    // Medium (21-30)
    "happy", "school", "friend", "water", "apple", "house", "money", "today", "night", "smile",
    // Hard (31-35)
    "elephant", "butterfly", "computer", "important", "beautiful",
    // Very Hard (36-40)
    "photograph", "necessary", "environment", "achievement", "consciousness"
];

// Simple styles
const STYLES = `
<style>
    .word-display {
        font-size: 96px;
        font-weight: bold;
        text-align: center;
        margin: 120px 0;
        font-family: Arial, sans-serif;
    }
    .instructions {
        font-size: 24px;
        text-align: center;
        max-width: 800px;
        margin: 0 auto;
        line-height: 1.6;
        font-family: Arial, sans-serif;
    }
    .recording-indicator {
        color: #dc3545;
        font-size: 20px;
        text-align: center;
        margin-top: 60px;
        font-family: Arial, sans-serif;
    }
    .progress {
        text-align: center;
        color: #666;
        font-size: 18px;
        margin-bottom: 20px;
        font-family: Arial, sans-serif;
    }
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.4; }
        100% { opacity: 1; }
    }
    .recording {
        animation: pulse 1.5s infinite;
    }
    .fixation {
        font-size: 48px;
        text-align: center;
        color: #666;
    }
</style>
`;

// Audio recording variables
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let isRecording = false;

// Initialize audio recording
async function initializeRecording(): Promise<boolean> {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        
        // Try different mime types for better compatibility
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 
            'audio/webm;codecs=opus' : 'audio/webm';
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType
        });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                console.log('Audio chunk received, size:', event.data.size);
            }
        };

        mediaRecorder.onstop = () => {
            console.log('Recording stopped. Total chunks:', audioChunks.length);
            isRecording = false;
        };

        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
        };
        
        return true;
    } catch (err) {
        console.error('Failed to initialize recording:', err);
        return false;
    }
}

// Start continuous recording
function startContinuousRecording() {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
        audioChunks = []; // Clear any previous chunks
        mediaRecorder.start(1000); // Collect data every second
        isRecording = true;
        console.log('Continuous recording started');
    }
}

// Stop continuous recording
function stopContinuousRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        console.log('Continuous recording stopped');
    }
}

// Create welcome screen
function createWelcome() {
    return {
        type: HtmlButtonResponsePlugin,
        stimulus: `
            ${STYLES}
            <div class="instructions">
                <h1>Word Reading Test</h1>
                <p>You will see 40 words, one at a time.</p>
                <p>Read each word out loud as clearly as you can.</p>
                <p>Your voice will be recorded.</p>
                <p>Press SPACE after reading each word to continue.</p>
                <br>
                <p><strong>Important:</strong> Speak clearly and at a normal pace.</p>
            </div>
        `,
        choices: ['Begin Test']
    };
}

// Create microphone permission screen
function createMicPermission(jsPsych: JsPsych) {
    return {
        type: HtmlButtonResponsePlugin,
        stimulus: `
            ${STYLES}
            <div class="instructions">
                <h2>Microphone Permission Required</h2>
                <p>This test needs to record your voice.</p>
                <p>Click below to grant microphone access.</p>
                <p>A browser popup will appear asking for permission.</p>
            </div>
        `,
        choices: ['Grant Microphone Access'],
        on_finish: async function() {
            const success = await initializeRecording();
            if (!success) {
                alert('Microphone access is required. Please reload the page and grant permission.');
                jsPsych.endExperiment('Microphone access denied.');
            }
        }
    };
}

// Create ready screen
function createReadyScreen() {
    return {
        type: HtmlButtonResponsePlugin,
        stimulus: `
            ${STYLES}
            <div class="instructions">
                <h2>Microphone Ready!</h2>
                <p>Your microphone has been successfully set up.</p>
                <p>When you click below, the test will begin.</p>
                <p>Remember to read each word clearly and press SPACE after each one.</p>
            </div>
        `,
        choices: ['Start Test']
    };
}

// Create word trial
function createWordTrial(word: string, index: number) {
    return {
        type: HtmlKeyboardResponsePlugin,
        stimulus: `
            ${STYLES}
            <div class="progress">Word ${index + 1} of 40</div>
            <div class="word-display">${word}</div>
            <div class="recording-indicator recording">
                🔴 Recording - Read the word aloud
            </div>
            <div style="text-align: center; margin-top: 60px; color: #666; font-size: 18px;">
                Press SPACE when done reading
            </div>
        `,
        choices: [' '],
        data: {
            word: word,
            word_index: index + 1,
            task: 'word_reading'
        },
        on_start: function() {
            // Start recording on the first word
            if (index === 0) {
                console.log('Starting continuous recording for first word');
                startContinuousRecording();
            }
        },
        on_finish: function(data: any) {
            // Stop recording after the last word
            if (index === WORD_LIST.length - 1) {
                console.log('Stopping recording after last word');
                stopContinuousRecording();
            }
            // Add response time to data
            data.reading_time = data.rt;
        }
    };
}


// Create end screen
function createEndScreen() {
    return {
        type: HtmlButtonResponsePlugin,
        stimulus: `
            ${STYLES}
            <div class="instructions">
                <h1>Test Complete!</h1>
                <p>Thank you for participating.</p>
                <p>Your responses have been recorded.</p>
                <br>
                <p id="download-status">Preparing your audio file...</p>
            </div>
        `,
        choices: ['Download Recording'],
        on_load: function() {
            // Wait a bit for the recording to fully stop and process
            setTimeout(() => {
                console.log('Processing audio. Chunks available:', audioChunks.length);
                if (audioChunks.length > 0) {
                    const finalBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    console.log('Final blob size:', finalBlob.size);
                    const audioUrl = URL.createObjectURL(finalBlob);
                    
                    // Update status
                    const statusEl = document.getElementById('download-status');
                    if (statusEl) {
                        statusEl.innerHTML = '<strong style="color: green;">✓ Recording ready! Click below to download.</strong>';
                    }
                    
                    // Store URL for download
                    (window as any).recordingUrl = audioUrl;
                } else {
                    document.getElementById('download-status')!.innerHTML = 
                        '<strong style="color: red;">No recording available. There may have been an error.</strong>';
                }
            }, 2000);
        },
        on_finish: function() {
            // Download the audio file
            if ((window as any).recordingUrl) {
                const a = document.createElement('a');
                a.href = (window as any).recordingUrl;
                a.download = `word_reading_${new Date().toISOString().split('T')[0]}.webm`;
                a.click();
            }
        }
    };
}

// Main function to create timeline
export async function createTimeline(jsPsych: JsPsych): Promise<any[]> {
    const timeline: any[] = [];
    
    // Welcome
    timeline.push(createWelcome());
    
    // Microphone permission
    timeline.push(createMicPermission(jsPsych));
    
    // Ready screen
    timeline.push(createReadyScreen());
    
    // Add all word trials
    WORD_LIST.forEach((word, index) => {
        timeline.push(createWordTrial(word, index));
    });
    
    // End screen
    timeline.push(createEndScreen());
    
    return timeline;
}

// Export word list for reference
export { WORD_LIST };