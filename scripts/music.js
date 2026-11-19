// Background music: an Apple Music-style mini player that pops up above
// the system tray. Nothing plays until the visitor presses play (browsers
// block sound before a click anyway), and the song only downloads once
// someone opens the player, so the page stays light for everyone else.
class MusicPlayer {
    constructor() {
        this.button = document.getElementById('music-button');
        this.panel = document.getElementById('music-player');
        this.playBtn = document.getElementById('mp-play');
        this.seek = document.getElementById('mp-seek');
        this.volume = document.getElementById('mp-volume');
        this.elapsed = document.getElementById('mp-elapsed');
        this.remaining = document.getElementById('mp-remaining');

        this.audio = new Audio();
        this.audio.loop = true;
        this.audio.preload = 'none';
        this.src = 'assets/music/great-fairy-fountain-slowed.mp3';
        this.seeking = false;

        // The volume a visitor picks is remembered between visits
        let saved = 35;
        try {
            const v = localStorage.getItem('musicVolume');
            if (v !== null) saved = Number(v);
        } catch (e) { /* storage blocked: keep the default */ }
        this.volume.value = saved;
        this.audio.volume = saved / 100;

        this.bindEvents();
    }

    bindEvents() {
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePanel();
        });

        this.playBtn.addEventListener('click', () => this.togglePlay());
        document.getElementById('mp-back').addEventListener('click', () => this.skip(-15));
        document.getElementById('mp-forward').addEventListener('click', () => this.skip(15));

        // Dragging the progress bar previews the time, letting go jumps there
        this.seek.addEventListener('input', () => {
            this.seeking = true;
            if (this.audio.duration) this.showTime(this.seek.value / 1000 * this.audio.duration);
        });
        this.seek.addEventListener('change', () => {
            if (this.audio.duration) this.audio.currentTime = this.seek.value / 1000 * this.audio.duration;
            this.seeking = false;
        });

        this.volume.addEventListener('input', () => {
            this.audio.volume = this.volume.value / 100;
            this.paintRange(this.volume, this.volume.value / 100);
            try { localStorage.setItem('musicVolume', this.volume.value); } catch (e) { /* ignore */ }
        });

        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateProgress());
        this.audio.addEventListener('play', () => this.updatePlayState());
        this.audio.addEventListener('pause', () => this.updatePlayState());

        // Clicking anywhere else, or pressing Escape, closes the player
        document.addEventListener('click', (e) => {
            if (!this.panel.contains(e.target) && !this.button.contains(e.target)) this.closePanel();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closePanel();
        });

        this.paintRange(this.volume, this.volume.value / 100);
    }

    // Load the song the first time it is actually needed
    ensureLoaded() {
        if (!this.audio.src) {
            this.audio.src = this.src;
            this.audio.preload = 'metadata';
        }
    }

    togglePanel() {
        if (this.panel.classList.contains('hidden')) {
            this.ensureLoaded();
            this.panel.classList.remove('hidden');
            this.button.setAttribute('aria-expanded', 'true');
        } else {
            this.closePanel();
        }
    }

    closePanel() {
        this.panel.classList.add('hidden');
        this.button.setAttribute('aria-expanded', 'false');
    }

    togglePlay() {
        this.ensureLoaded();
        if (this.audio.paused) {
            // Pressing play is a clear request for sound, so it turns the
            // site's sound back on if it had been muted
            if (typeof soundManager !== 'undefined' && !soundManager.enabled) {
                soundManager.setEnabled(true);
                document.dispatchEvent(new Event('soundsettingchange'));
            }
            this.audio.play().catch(() => { /* the browser refused; the button stays on Play */ });
        } else {
            this.audio.pause();
        }
    }

    pause() {
        this.audio.pause();
    }

    skip(seconds) {
        if (!this.audio.duration) return;
        this.audio.currentTime = Math.max(0, Math.min(this.audio.duration - 0.5, this.audio.currentTime + seconds));
    }

    updatePlayState() {
        const playing = !this.audio.paused;
        this.playBtn.classList.toggle('is-playing', playing);
        this.playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        this.button.classList.toggle('is-playing', playing);
        this.button.title = playing ? 'Now playing: Great Fairy Fountain (Slowed)' : 'Music';
    }

    updateProgress() {
        if (this.seeking || !this.audio.duration) return;
        this.seek.value = Math.round(this.audio.currentTime / this.audio.duration * 1000);
        this.showTime(this.audio.currentTime);
    }

    showTime(t) {
        const d = this.audio.duration || 0;
        this.elapsed.textContent = this.format(t);
        this.remaining.textContent = '-' + this.format(Math.max(0, d - t));
        this.paintRange(this.seek, d ? t / d : 0);
    }

    // Fills the slider track up to the thumb, the way Apple's sliders look
    paintRange(input, fraction) {
        input.style.setProperty('--fill', `${Math.round(fraction * 1000) / 10}%`);
    }

    format(seconds) {
        const s = Math.floor(seconds);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }
}

let musicPlayer;
document.addEventListener('DOMContentLoaded', () => {
    musicPlayer = new MusicPlayer();
});
