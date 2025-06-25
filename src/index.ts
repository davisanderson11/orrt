import { JsPsych } from "jspsych";

// Declare global plugin variables that will be available when loaded via script tags
declare const jsPsychHtmlKeyboardResponse: any;
declare const jsPsychHtmlButtonResponse: any;

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
    body {
        overflow: hidden;
        margin: 0;
        padding: 0;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .jspsych-content {
        overflow: hidden;
        max-height: 100vh;
    }
    .jspsych-content-wrapper {
        overflow: hidden;
    }
    .word-display {
        font-size: 60px;
        font-weight: bold;
        text-align: center;
        margin: 20px 0;
        font-family: Arial, sans-serif;
    }
    .instructions {
        font-size: 18px;
        text-align: center;
        max-width: 600px;
        margin: 0 auto;
        line-height: 1.4;
        font-family: Arial, sans-serif;
        padding: 10px;
    }
    .instructions h1 {
        font-size: 28px;
        margin: 10px 0;
    }
    .instructions h2 {
        font-size: 24px;
        margin: 10px 0;
    }
    .instructions p {
        margin: 8px 0;
    }
    .recording-indicator {
        color: #dc3545;
        font-size: 16px;
        text-align: center;
        margin-top: 20px;
        font-family: Arial, sans-serif;
    }
    .progress {
        text-align: center;
        color: #666;
        font-size: 14px;
        margin-bottom: 10px;
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
    .jspsych-btn {
        margin: 5px;
        padding: 8px 16px;
        font-size: 16px;
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

// Create welcome screens
function createWelcomeScreens() {
    return [
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div class="instructions">
                    <h1>Word Reading Test</h1>
                    <p>You will see 40 words, one at a time.</p>
                    <p>Read each word out loud as clearly as you can.</p>
                </div>
            `,
            choices: ['Continue']
        },
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div class="instructions">
                    <h2>Instructions</h2>
                    <p>Your voice will be recorded.</p>
                    <p>Press SPACE after reading each word to continue.</p>
                    <p><strong>Important:</strong> Speak clearly and at a normal pace.</p>
                </div>
            `,
            choices: ['Begin Test']
        }
    ];
}

// Create microphone permission screens
function createMicPermissionScreens(jsPsych: JsPsych) {
    return [
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div class="instructions">
                    <h2>Microphone Required</h2>
                    <p>This test needs to record your voice.</p>
                </div>
            `,
            choices: ['Continue']
        },
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div class="instructions">
                    <h2>Grant Permission</h2>
                    <p>Click below to allow microphone access.</p>
                    <p>A browser popup will appear.</p>
                </div>
            `,
            choices: ['Grant Access'],
            on_finish: async function() {
                const success = await initializeRecording();
                if (!success) {
                    alert('Microphone access is required. Please reload the page and grant permission.');
                    jsPsych.endExperiment('Microphone access denied.');
                }
            }
        }
    ];
}

// Create ready screens
function createReadyScreens() {
    return [
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div class="instructions">
                    <h2>Microphone Ready!</h2>
                    <p>Your microphone has been successfully set up.</p>
                    <p>When you click below, the test will begin.</p>
                </div>
            `,
            choices: ['Continue']
        },
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div class="instructions">
                    <h2>Remember</h2>
                    <p>Read each word clearly.</p>
                    <p>Press SPACE after each word.</p>
                </div>
            `,
            choices: ['Start Test']
        }
    ];
}

// Create word trial
function createWordTrial(word: string, index: number) {
    return {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
            <div class="progress">Word ${index + 1} of 40</div>
            <div class="word-display">${word}</div>
            <div class="recording-indicator recording">
                🔴 Recording
            </div>
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 16px;">
                Press SPACE when done
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


// Create end screens
function createEndScreens() {
    return [
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div class="instructions">
                    <h1>Test Complete!</h1>
                    <p>Thank you for participating.</p>
                    <p>Your responses have been recorded.</p>
                </div>
            `,
            choices: ['Continue']
        },
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div class="instructions">
                    <h2>Download Your Recording</h2>
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
        }
    ];
}

// Main function to create timeline
export async function createTimeline(jsPsych: JsPsych): Promise<any[]> {
    const timeline: any[] = [];
    
    // Welcome screens
    timeline.push(...createWelcomeScreens());
    
    // Microphone permission screens
    timeline.push(...createMicPermissionScreens(jsPsych));
    
    // Ready screens
    timeline.push(...createReadyScreens());
    
    // Add all word trials
    WORD_LIST.forEach((word, index) => {
        timeline.push(createWordTrial(word, index));
    });
    
    // End screens
    timeline.push(...createEndScreens());
    
    return timeline;
}

// Export word list for reference
export { WORD_LIST };