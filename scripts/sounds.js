/* ===== SOUND MANAGER =====
   Every sound the site makes is defined in one table below. A sound is a
   small melody: a list of notes, where each note says
     t = when it starts (seconds after the sound begins)
     f = pitch (frequency in Hz)
     d = how long it lasts (seconds)
     g = how loud it is (0..1, before the master volume)
     w = wave shape ('sine' is soft, 'triangle' is brighter, 'square' is harsh)
   One scheduler plays them all, so adding or tuning a sound only means
   editing this table — no new audio code. */
class SoundManager {
    constructor() {
        this.sounds = {
            // Short soft tick for selecting things
            click: [
                { t: 0, f: 1300, d: 0.035, g: 0.5, w: 'triangle' }
            ],
            // Two rising notes: something appeared
            open: [
                { t: 0.00, f: 440, d: 0.10, g: 0.6, w: 'sine' },
                { t: 0.07, f: 660, d: 0.14, g: 0.6, w: 'sine' }
            ],
            // Two falling notes: something went away
            close: [
                { t: 0.00, f: 660, d: 0.10, g: 0.6, w: 'sine' },
                { t: 0.07, f: 440, d: 0.14, g: 0.6, w: 'sine' }
            ],
            // Quick slide down: window tucked into the taskbar
            minimize: [
                { t: 0.00, f: 520, d: 0.08, g: 0.5, w: 'sine' },
                { t: 0.06, f: 330, d: 0.10, g: 0.5, w: 'sine' }
            ],
            // Quick slide up: window came back
            restore: [
                { t: 0.00, f: 330, d: 0.08, g: 0.5, w: 'sine' },
                { t: 0.06, f: 520, d: 0.10, g: 0.5, w: 'sine' }
            ],
            // Low double-buzz, like the classic Windows error ding
            error: [
                { t: 0.00, f: 220, d: 0.12, g: 0.45, w: 'square' },
                { t: 0.13, f: 175, d: 0.16, g: 0.40, w: 'square' }
            ],
            // Rising chord (C5 E5 G5 C6): the machine waking up
            startup: [
                { t: 0.00, f: 523, d: 0.30, g: 0.55, w: 'sine' },
                { t: 0.15, f: 659, d: 0.30, g: 0.55, w: 'sine' },
                { t: 0.30, f: 784, d: 0.30, g: 0.55, w: 'sine' },
                { t: 0.45, f: 1047, d: 0.40, g: 0.55, w: 'sine' }
            ],
            // The same chord falling: the machine going to sleep
            shutdown: [
                { t: 0.00, f: 1047, d: 0.30, g: 0.55, w: 'sine' },
                { t: 0.15, f: 784, d: 0.30, g: 0.55, w: 'sine' },
                { t: 0.30, f: 659, d: 0.30, g: 0.55, w: 'sine' },
                { t: 0.45, f: 523, d: 0.45, g: 0.55, w: 'sine' }
            ]
        };

        // The mute choice is remembered between visits
        this.enabled = localStorage.getItem('soundEnabled') !== '0';
        // Master volume: one knob that scales every sound together
        this.volume = 0.15;
        this.audioCtx = null;
        this.masterGain = null;
    }

    setEnabled(on) {
        this.enabled = on;
        localStorage.setItem('soundEnabled', on ? '1' : '0');
    }

    initAudioContext() {
        if (!this.audioCtx) {
            try {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {
                    this.audioCtx = new AudioContextClass();
                    // All notes flow through this one gain node,
                    // so overall volume is controlled in a single place
                    this.masterGain = this.audioCtx.createGain();
                    this.masterGain.gain.value = this.volume;
                    this.masterGain.connect(this.audioCtx.destination);
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

    // Plays one note at an exact moment on the audio clock.
    // The volume ramps up over 10ms and fades out smoothly, instead of
    // starting at full blast — that ramp is what prevents popping noises.
    scheduleNote(audioCtx, note, baseTime) {
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);

            const start = baseTime + note.t;
            osc.frequency.value = note.f;
            osc.type = note.w;

            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.linearRampToValueAtTime(note.g, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + note.d);

            osc.start(start);
            osc.stop(start + note.d + 0.02);
        } catch (e) {
            // Audio error, fail silently
        }
    }

    play(soundName) {
        if (!this.enabled) return;
        const notes = this.sounds[soundName];
        if (!notes) return;

        this.whenAudioReady((audioCtx) => {
            const baseTime = audioCtx.currentTime;
            notes.forEach(note => this.scheduleNote(audioCtx, note, baseTime));
        });
    }

    // Kept so existing callers don't break; startup is a normal sound now
    playStartup() {
        this.play('startup');
    }
}

// Global instance
const soundManager = new SoundManager();
