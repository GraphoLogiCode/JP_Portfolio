/* ===== SOUND MANAGER ===== */
class SoundManager {
    constructor() {
        // Base64-encoded short retro sounds (tiny beeps/clicks)
        this.sounds = {
            click: this.createBeep(800, 0.05),
            open: this.createBeep(600, 0.1),
            close: this.createBeep(400, 0.08),
            startup: null // Will be a chord
        };
        this.enabled = true;
        this.audioCtx = null;
    }

    initAudioContext() {
        if (!this.audioCtx) {
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {
                    this.audioCtx = new AudioContextClass();
                }
            } catch (e) {
                console.error("Failed to initialize AudioContext", e);
            }
        }

        return this.audioCtx;
    }

    // Browsers keep audio paused until the user has clicked or tapped once.
    // This runs the given function only when audio is truly ready, so sounds
    // stay in sync with what is on screen instead of piling up and playing late.
    whenAudioReady(run) {
        const audioCtx = this.initAudioContext();
        if (!audioCtx) return;

        if (audioCtx.state === 'running') {
            run(audioCtx);
        } else {
            audioCtx.resume().then(() => {
                if (audioCtx.state === 'running') {
                    run(audioCtx);
                }
            }).catch(() => { /* audio not allowed yet, skip this sound */ });
        }
    }

    createBeep(frequency, duration) {
        // Create a simple beep using Web Audio API
        return { frequency, duration };
    }

    play(soundName) {
        if (!this.enabled) return;
        const sound = this.sounds[soundName];
        if (!sound) return;

        this.whenAudioReady((audioCtx) => {
            try {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.frequency.value = sound.frequency;
                oscillator.type = 'square'; // Retro sound

                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + sound.duration);

                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + sound.duration);
            } catch (e) {
                // Audio error, fail silently
            }
        });
    }

    playStartup() {
        if (!this.enabled) return;

        this.whenAudioReady((audioCtx) => {
            // A rising chord: C5, E5, G5, C6.
            // Each note is scheduled on the audio clock (not setTimeout),
            // so the timing is exact and the notes never drift apart.
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                try {
                    const startAt = audioCtx.currentTime + i * 0.15;
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.08, startAt);
                    gain.gain.exponentialRampToValueAtTime(0.01, startAt + 0.3);
                    osc.start(startAt);
                    osc.stop(startAt + 0.3);
                } catch (e) { }
            });
        });
    }
}

// Global instance
const soundManager = new SoundManager();
