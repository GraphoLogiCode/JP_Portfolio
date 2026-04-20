/* ===== SOUND MANAGER ===== */
class SoundManager {
    constructor() {
        // Base64-encoded short retro sounds (tiny beeps/clicks)
        this.sounds = {
            click: this.createBeep(800, 0.05),
            open: this.createBeep(600, 0.1),
            close: this.createBeep(400, 0.08),
            error: this.createBeep(200, 0.15),
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

        // Resume context if suspended (common browser requirement for autoplay)
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        return this.audioCtx;
    }

    createBeep(frequency, duration) {
        // Create a simple beep using Web Audio API
        return { frequency, duration };
    }

    play(soundName) {
        if (!this.enabled) return;
        const sound = this.sounds[soundName];
        if (!sound) return;

        const audioCtx = this.initAudioContext();
        if (!audioCtx) return;

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
    }

    playStartup() {
        if (!this.enabled) return;

        const audioCtx = this.initAudioContext();
        if (!audioCtx) return;

        // Play a simple chord sequence for startup
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => {
                try {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                    osc.start(audioCtx.currentTime);
                    osc.stop(audioCtx.currentTime + 0.3);
                } catch (e) { }
            }, i * 150);
        });
    }
}

// Global instance
const soundManager = new SoundManager();
