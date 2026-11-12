document.addEventListener('DOMContentLoaded', () => {
    // Initialize Window Manager
    const wm = new WindowManager('desktop', 'taskbar-apps');

    // Play the startup chime on the visitor's first click or tap.
    // Browsers block all sound until the user interacts once, so playing
    // at page load would silently fail — this way it actually plays.
    document.addEventListener('pointerdown', () => soundManager.playStartup(), { once: true });

    // Desktop Icon Handling.
    // wireDesktopIcon is reused for icons added later (like the hidden
    // terminal below), so an unlocked icon behaves exactly like a built-in one.
    function wireDesktopIcon(icon) {
        icon.addEventListener('dblclick', () => {
            openContent(icon.getAttribute('data-target'));
        });

        // Selection state
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            soundManager.play('click');
            document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
        });
    }

    document.querySelectorAll('.desktop-icon').forEach(wireDesktopIcon);

    // Deselect icons when clicking desktop
    document.getElementById('desktop').addEventListener('click', () => {
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    });

    // Start Menu Handling
    const startBtn = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');

    startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        soundManager.play('click');
        startMenu.classList.toggle('hidden');
        startBtn.classList.toggle('active');
    });

    // Start menu items.
    // Note: the window manager plays the "open" sound itself when a window
    // opens, so nothing plays one here — that used to cause a double beep.
    document.querySelectorAll('.start-item[data-action]').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.getAttribute('data-action');
            startMenu.classList.add('hidden');
            startBtn.classList.remove('active');
            openContent(action);
        });
    });

    // Sound toggle. The speaker lives in two places (system tray and start
    // menu), so one function updates both and either one can be clicked.
    const toggleSoundEl = document.getElementById('toggle-sound');
    const volumeIcon = document.getElementById('volume-icon');

    function updateSoundUI() {
        const on = soundManager.enabled;
        const iconRef = on ? '#i-speaker' : '#i-speaker-off';
        document.getElementById('menu-sound-text').textContent = on ? 'Sound: ON' : 'Sound: OFF';
        document.getElementById('menu-sound-use').setAttribute('href', iconRef);
        document.getElementById('volume-icon-use').setAttribute('href', iconRef);
        volumeIcon.setAttribute('title', on ? 'Sound On' : 'Sound Off');
    }

    function toggleSound() {
        // setEnabled also saves the choice, so mute survives a refresh
        soundManager.setEnabled(!soundManager.enabled);
        updateSoundUI();
        // Small click so turning sound ON gives instant feedback
        soundManager.play('click');
    }

    if (toggleSoundEl) toggleSoundEl.addEventListener('click', toggleSound);
    if (volumeIcon) volumeIcon.addEventListener('click', toggleSound);
    updateSoundUI();

    // Close start menu when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!startMenu.contains(e.target) && e.target !== startBtn && !startBtn.contains(e.target)) {
            startMenu.classList.add('hidden');
            startBtn.classList.remove('active');
        }
    });

    // Clock
    setInterval(updateClock, 1000);
    updateClock();

    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        document.getElementById('clock').innerText = timeString;
    }

    // ---- Art folder ----
    // One entry per piece, shown in this order. To add artwork: put a
    // full-size image in assets/art/ and a small copy with the same name in
    // assets/art/thumbs/, then add a line here.
    const ART_PIECES = [
        { file: 'mirror-figure-front.jpg', title: 'Mirror Figure (front)', detail: 'Sculpture, mixed media' },
        { file: 'mirror-figure-side.jpg', title: 'Mirror Figure (side)', detail: 'Sculpture, mixed media' },
        { file: 'strap-figure.jpg', title: 'Untitled Figure', detail: 'Sculpture' },
        { file: 'self-portrait-2019.jpg', title: 'Self-Portrait', detail: 'Drawing, 2019' },
        { file: 'two-children-2019.jpg', title: 'Two Children', detail: 'Charcoal, 2019' },
        { file: 'skull-still-life-2019.jpg', title: 'Still Life with Skull', detail: 'Charcoal, 2019' }
    ];

    // Explorer-style "Thumbnails" view of the art folder
    function artFolderHtml() {
        const thumbs = ART_PIECES.map((piece, i) => `
            <button class="art-thumb" data-index="${i}" title="${piece.title}">
                <span class="art-thumb-frame"><img src="assets/art/thumbs/${piece.file}" alt="${piece.title}" loading="lazy"></span>
                <span class="art-thumb-label">${piece.title}</span>
            </button>
        `).join('');
        return `
            <div class="art-explorer">
                <div class="art-toolbar">
                    <svg viewBox="0 0 32 32"><use href="#i-art" /></svg>
                    <span>C:\\Users\\Benjamin\\My Art</span>
                </div>
                <div class="art-grid">${thumbs}</div>
                <div class="art-status">${ART_PIECES.length} objects — click a picture to view it</div>
            </div>
        `;
    }

    function setupArtFolder() {
        const folder = document.getElementById('win-art');
        if (folder.dataset.wired) return;
        folder.dataset.wired = '1';
        folder.querySelectorAll('.art-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => openArtViewer(Number(thumb.dataset.index)));
        });
    }

    // A small "Windows Picture and Fax Viewer": one window that steps
    // through the pieces. Opening another piece reuses the same window.
    let artIndex = 0;

    function openArtViewer(index) {
        wm.openWindow('artviewer', 'Picture Viewer', `
            <div class="art-viewer">
                <div class="art-viewer-stage"><img id="art-viewer-img" alt=""></div>
                <div class="art-viewer-bar">
                    <button class="xp-button" id="art-prev" aria-label="Previous picture">◀ Back</button>
                    <div class="art-viewer-caption">
                        <strong id="art-viewer-title"></strong>
                        <span id="art-viewer-detail"></span>
                    </div>
                    <button class="xp-button" id="art-next" aria-label="Next picture">Next ▶</button>
                </div>
            </div>
        `, { flush: true });

        const viewer = document.getElementById('win-artviewer');
        if (!viewer.dataset.wired) {
            viewer.dataset.wired = '1';
            document.getElementById('art-prev').addEventListener('click', () => stepArt(-1));
            document.getElementById('art-next').addEventListener('click', () => stepArt(1));
        }
        showArt(index);
    }

    function showArt(index) {
        artIndex = (index + ART_PIECES.length) % ART_PIECES.length;
        const piece = ART_PIECES[artIndex];
        const img = document.getElementById('art-viewer-img');
        img.src = `assets/art/${piece.file}`;
        img.alt = piece.title;
        document.getElementById('art-viewer-title').textContent = piece.title;
        document.getElementById('art-viewer-detail').textContent =
            `${piece.detail} · ${artIndex + 1} of ${ART_PIECES.length}`;
    }

    function stepArt(delta) {
        soundManager.play('click');
        showArt(artIndex + delta);
    }

    // Arrow keys flip pictures while the viewer is the front window
    document.addEventListener('keydown', (e) => {
        if (wm.activeWindowId !== 'artviewer' || e.target.tagName === 'INPUT') return;
        if (e.key === 'ArrowLeft') stepArt(-1);
        if (e.key === 'ArrowRight') stepArt(1);
    });

    // ---- Demo video ----
    // The Probability Lab demo plays in its own little media-player window.
    // assets/probability-lab/demo.mp4 is a 720p copy of the full-quality video
    // in the genesis-world repo, so the page stays light.
    function setupProjects() {
        const projects = document.getElementById('win-projects');
        if (projects.dataset.wired) return;
        projects.dataset.wired = '1';
        projects.querySelector('#watch-probability-demo').addEventListener('click', openDemoVideo);
    }

    function openDemoVideo() {
        wm.openWindow('mediaplayer', 'Media Player - Probability Lab Demo', `
            <div class="media-player">
                <video controls playsinline preload="metadata" poster="assets/probability-lab/poster.jpg"
                    src="assets/probability-lab/demo.mp4"></video>
                <div class="media-status">Genesis Probability Lab: a coin flip, a die roll, live forecasts, and 1,000 rolls (1:16, with captions)</div>
            </div>
        `, { flush: true });
        const video = document.querySelector('#win-mediaplayer video');
        if (video) video.play().catch(() => { /* browser wants a tap on the play button */ });
    }

    // Content Loader
    function openContent(key) {
        const contentMap = {
            'resume': `
                <div style="display: flex; flex-direction: column; height: 100%;">
                    <div style="padding: 10px 14px; background: #f0f0f0; border-bottom: 1px solid #ccc; display: flex; align-items: center; gap: 10px;">
                        <svg viewBox="0 0 32 32" style="width: 16px; height: 16px;"><use href="#i-resume" /></svg>
                        <span style="font-weight: bold;">Benjamin Park - Resume</span>
                        <a href="assets/resume.pdf" target="_blank" rel="noopener noreferrer" class="xp-button" style="padding: 5px 14px; text-decoration: none; font-size: 12px; margin-left: auto;">
                            Download PDF
                        </a>
                    </div>
                    <div id="pdf-pages" style="flex: 1; overflow: auto; background: #6B7A8C; padding: 12px 0;">
                        <p style="text-align: center; color: #FFF;">Loading resume…</p>
                    </div>
                </div>
            `,
            'projects': `
                <h2><svg viewBox="0 0 32 32"><use href="#i-projects" /></svg> My Projects</h2>
                <hr>
                <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 3px;">
                    <strong>Genesis Probability Lab</strong> <span style="color: #777;">— built on the Genesis World physics simulator</span>
                    <p style="margin: 8px 0 0 0; color: #555;">Flips a coin or rolls a die inside a physics simulation and shows how the odds of each outcome build up. Nothing picks the result at random: the face on top is read once the body comes to rest, and the only randomness is in the launch state. While a toss is still in the air, the lab forecasts the result by running 64 slightly perturbed futures, and a batch of 1,000 die rolls fills in the observed frequencies with 95% intervals.</p>
                    <p style="margin: 8px 0 0 0; color: #777; font-size: 12px;"><strong>Tech Stack:</strong> Python, Genesis World, PyTorch (CUDA), SciPy, imgui-bundle</p>
                    <p style="margin: 8px 0 0 0;">
                        <button type="button" class="xp-button" id="watch-probability-demo">▶ Watch demo (1:16)</button>
                        <a href="https://github.com/GraphoLogiCode/genesis-world/tree/main/examples/probability" target="_blank" rel="noopener noreferrer" style="color: #0066CC; text-decoration: none; margin-left: 12px;">🔗 View on GitHub</a>
                    </p>
                </div>
                <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 3px;">
                    <strong>PathFinder</strong> <span style="color: #777;">— Yale Hackathon 2026</span>
                    <p style="margin: 8px 0 0 0; color: #555;">A satellite-image disaster-response tool built in a two-person team. I engineered the AI/ML and backend: YOLO damage detection, a FastAPI routing engine, and a geo-referencing pipeline.</p>
                    <p style="margin: 8px 0 0 0; color: #777; font-size: 12px;"><strong>Tech Stack:</strong> Python, YOLO, FastAPI</p>
                    <p style="margin: 8px 0 0 0;"><a href="https://github.com/GraphoLogiCode/PathFinder" target="_blank" rel="noopener noreferrer" style="color: #0066CC; text-decoration: none;">🔗 View on GitHub</a></p>
                </div>
                <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 3px;">
                    <strong>RippleJourney</strong> <span style="color: #777;">— March 2026</span>
                    <p style="margin: 8px 0 0 0; color: #555;">A full-stack app built in 3 days that turns a raw research idea into a step-by-step roadmap, with AI-matched faculty mentors found through the Google Scholar API.</p>
                    <p style="margin: 8px 0 0 0; color: #777; font-size: 12px;"><strong>Tech Stack:</strong> Next.js, TypeScript, Prisma, PostgreSQL (pgvector)</p>
                    <p style="margin: 8px 0 0 0;"><a href="https://ripple-journey.vercel.app" target="_blank" rel="noopener noreferrer" style="color: #0066CC; text-decoration: none;">🔗 Live Demo</a></p>
                </div>
                <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 3px;">
                    <strong>RepoComPass</strong>
                    <p style="margin: 8px 0 0 0; color: #555;">A Chrome extension that analyzes job postings and generates personalized portfolio project ideas tailored to your skills and target roles. Helps computer science students and developers build projects that directly align with real job requirements.</p>
                    <p style="margin: 8px 0 0 0; color: #777; font-size: 12px;"><strong>Tech Stack:</strong> HTML, CSS, JavaScript</p>
                    <p style="margin: 8px 0 0 0;"><a href="https://github.com/GraphoLogiCode/RepoComPass" target="_blank" rel="noopener noreferrer" style="color: #0066CC; text-decoration: none;">🔗 View on GitHub</a></p>
                </div>
                <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 3px;">
                    <strong>Windows XP Portfolio</strong>
                    <p style="margin: 8px 0 0 0; color: #555;">This website! A retro-styled personal portfolio built with vanilla HTML, CSS, and JavaScript.</p>
                </div>
                <h3>Research</h3>
                <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 3px;">
                    <strong>Can an AI Understand a Minecraft Builder's Intentions?</strong> <span style="color: #777;">— MC REU 2026</span>
                    <p style="margin: 8px 0 0 0; color: #555;">A multimodal AI system that infers a Minecraft builder's goal from raw observation: frozen VPT, MineCLIP, and Uni3D encoders feed learned likelihood heads and a Bayesian belief over five goal categories. It reached 0.375 goal accuracy on 24 unseen real sessions, the best of five methods tested. I also trained a 17.5M-parameter Transformer decoder that predicts the builder's next action with 71% accuracy.</p>
                    <p style="margin: 8px 0 0 0; color: #777; font-size: 12px;"><strong>Tech Stack:</strong> Python, PyTorch, VPT, MineCLIP, Uni3D</p>
                </div>
                <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 3px;">
                    <strong>Fine-Tuning LLMs for C++ Code Smell Detection</strong> <span style="color: #777;">— MC REU 2025</span>
                    <p style="margin: 8px 0 0 0; color: #555;">Built a pipeline that runs clang-tidy over 10 open-source C++ game engines to create a 34,433-function dataset, then fine-tuned DeepSeek-Coder-1.3B LoRA adapters to detect findings and generate repairs. On two unseen engines it reached 0.766 micro-F1, and 53.9% of its repairs passed static re-analysis (vs. 14.1% untuned).</p>
                    <p style="margin: 8px 0 0 0; color: #777; font-size: 12px;"><strong>Tech Stack:</strong> Python, DeepSeek-Coder, LoRA, clang-tidy</p>
                    <p style="margin: 8px 0 0 0;"><a href="https://github.com/GraphoLogiCode/C-FineTuneDeepSeek" target="_blank" rel="noopener noreferrer" style="color: #0066CC; text-decoration: none;">🔗 View on GitHub</a></p>
                </div>
            `,
            'art': artFolderHtml(),
            'about': `
                <h2><svg viewBox="0 0 32 32"><use href="#i-about" /></svg> About Me</h2>
                <hr>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <tr>
                        <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Name:</strong></td>
                        <td style="padding: 8px 0;">Benjamin Park</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Korean Name:</strong></td>
                        <td style="padding: 8px 0;">Joosung Park (박주성)</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>University:</strong></td>
                        <td style="padding: 8px 0;">Penn State</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Graduation:</strong></td>
                        <td style="padding: 8px 0;">2027</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Major:</strong></td>
                        <td style="padding: 8px 0;">Computer Science</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Minors:</strong></td>
                        <td style="padding: 8px 0;">Mathematics &amp; Art</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Activities:</strong></td>
                        <td style="padding: 8px 0;">🚣 Rowing, 🎨 Drawing</td>
                    </tr>
                </table>
                <br>
                <p style="color: #555; line-height: 1.6;">
                    I am studying computer science and taking some extra math courses. My long-term goal is to build a house.
                </p>
                <p style="color: #555; line-height: 1.6;">
                    Building a house is not easy. Not only because of the technical challenges, but also it requires balancing engineering structure with artistic aesthetics. That perspective influences how I think about building something. Whether in building a house or in future technical work, the goal is to create things that are not only logically supported, but also meaningful and well-designed.
                </p>
            `,
            'contact': `
                <h2><svg viewBox="0 0 32 32"><use href="#i-contact" /></svg> Contact Me</h2>
                <hr>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                    <tr>
                        <td style="padding: 10px 0; color: #666; width: 120px;"><strong>Personal Email:</strong></td>
                        <td style="padding: 10px 0;">
                            <a href="mailto:pjs84833@gmail.com" style="color: #0066CC;">pjs84833@gmail.com</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #666;"><strong>School Email:</strong></td>
                        <td style="padding: 10px 0;">
                            <a href="mailto:jqp6076@psu.edu" style="color: #0066CC;">jqp6076@psu.edu</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #666;"><strong>GitHub:</strong></td>
                        <td style="padding: 10px 0;">
                            <a href="https://github.com/GraphoLogiCode" target="_blank" rel="noopener noreferrer" style="color: #0066CC;">github.com/GraphoLogiCode</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #666;"><strong>LinkedIn:</strong></td>
                        <td style="padding: 10px 0;">
                            <a href="https://www.linkedin.com/in/joosung-park-may2027/" target="_blank" rel="noopener noreferrer" style="color: #0066CC;">linkedin.com/in/joosung-park-may2027</a>
                        </td>
                    </tr>
                </table>
                <br>
                <p style="color: #555;">I am currently looking for internship opportunities. Feel free to reach out! 👋</p>
            `,
            'terminal': `
                <div class="terminal-app">
                    <div class="terminal-output" id="term-output">Benjamin Park's Portfolio [Command Line]
Type 'help' to see what's here.</div>
                    <div class="terminal-input-line">
                        <span class="term-prompt">C:\\Users\\Benjamin&gt;</span>
                        <input type="text" id="term-input" autocomplete="off" spellcheck="false" autocapitalize="off" />
                    </div>
                </div>
            `
        };

        const titleMap = {
            'resume': 'Resume',
            'projects': 'My Projects',
            'art': 'My Art',
            'about': 'About Me.txt - Notepad',
            'contact': 'Contact',
            'terminal': 'Command Prompt'
        };

        // The resume, art folder, and terminal windows hold full-bleed app
        // views, so they open without the usual text padding.
        const flushWindows = ['resume', 'art', 'terminal'];

        if (contentMap[key]) {
            wm.openWindow(key, titleMap[key], contentMap[key], flushWindows.includes(key) ? { flush: true } : {});
            if (key === 'resume') renderResumePdf();
            if (key === 'art') setupArtFolder();
            if (key === 'projects') setupProjects();
            if (key === 'terminal') setupTerminal();
            noteWindowOpened(key);
        }
    }

    // ---- Explorer achievement ----
    // A visitor who opens all five windows clearly cared enough to look at
    // everything, so they get a little XP tray balloon as a thank-you —
    // and it unlocks the hidden Command Prompt as a reward. This also gives
    // phone visitors a way in, since they can't type the Konami code.
    const CORE_WINDOWS = ['resume', 'projects', 'art', 'about', 'contact'];

    // Progress is saved between visits, so opening two windows today and
    // two tomorrow still counts — a refresh doesn't reset the hunt.
    let openedWindows;
    try {
        openedWindows = new Set(JSON.parse(localStorage.getItem('exploredWindows') || '[]'));
    } catch (e) {
        openedWindows = new Set();
    }

    function noteWindowOpened(key) {
        if (!CORE_WINDOWS.includes(key)) return;
        if (!openedWindows.has(key)) {
            openedWindows.add(key);
            localStorage.setItem('exploredWindows', JSON.stringify([...openedWindows]));
        }
        if (openedWindows.size === CORE_WINDOWS.length && !localStorage.getItem('explorerAchieved')) {
            localStorage.setItem('explorerAchieved', '1');
            // Small pause so the balloon lands after the last window opens
            setTimeout(showExplorerBalloon, 700);
        }
    }

    function showExplorerBalloon() {
        const balloon = document.createElement('div');
        balloon.className = 'xp-balloon';
        balloon.innerHTML = `
            <div class="xp-balloon-title">
                <span>🏆 Achievement unlocked: Explorer</span>
                <span class="xp-balloon-close" title="Close">✕</span>
            </div>
            <p>You opened everything on this desktop — thanks for looking around!</p>
        `;
        document.body.appendChild(balloon);
        soundManager.play('tada');

        // Quiet reward: the hidden terminal icon appears on the desktop
        // without being announced — sharp-eyed visitors will spot it
        localStorage.setItem('terminalUnlocked', '1');
        ensureTerminalIcon();

        const dismiss = () => balloon.remove();
        balloon.querySelector('.xp-balloon-close').addEventListener('click', dismiss);
        setTimeout(dismiss, 15000);
    }

    // Draws each page of the resume PDF onto a canvas inside the window.
    // Pages are rendered at the screen's pixel density so text stays sharp,
    // and redrawn whenever the window changes size (maximize, restore, resize).
    async function renderResumePdf() {
        const holder = document.getElementById('pdf-pages');
        if (!holder || holder.dataset.rendered) return;

        const fallback = `
            <div style="padding: 30px; text-align: center; color: #FFF;">
                <p>The resume preview could not load.</p>
                <p><a href="assets/resume.pdf" target="_blank" rel="noopener noreferrer" style="color: #CFE4FF;">Open the resume in a new tab</a> instead.</p>
            </div>
        `;

        if (!window.pdfjsLib) {
            holder.innerHTML = fallback;
            return;
        }

        try {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const pdf = await pdfjsLib.getDocument('assets/resume.pdf').promise;
            holder.dataset.rendered = '1';

            let lastWidth = 0;
            let busy = false;
            let again = false;

            // Draws all pages to fit the current window width.
            // If the window changes size mid-draw, it draws once more at the end.
            async function drawPages() {
                if (busy) { again = true; return; }
                busy = true;
                do {
                    again = false;
                    // Fill the window, but keep pages a readable size on huge screens
                    const cssWidth = Math.min(Math.max(200, holder.clientWidth - 28), 1000);
                    if (Math.abs(cssWidth - lastWidth) >= 4) {
                        lastWidth = cssWidth;
                        const dpr = window.devicePixelRatio || 1;
                        // Pages are drawn into a hidden fragment first, then swapped
                        // in all at once, so resizing never shows a blank flash
                        const fragment = document.createDocumentFragment();

                        for (let n = 1; n <= pdf.numPages; n++) {
                            const page = await pdf.getPage(n);
                            const baseSize = page.getViewport({ scale: 1 });
                            const viewport = page.getViewport({ scale: (cssWidth / baseSize.width) * dpr });

                            const canvas = document.createElement('canvas');
                            canvas.width = viewport.width;
                            canvas.height = viewport.height;
                            canvas.style.width = cssWidth + 'px';
                            canvas.style.display = 'block';
                            canvas.style.margin = '0 auto 12px';
                            canvas.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.45)';
                            fragment.appendChild(canvas);

                            await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
                        }

                        holder.replaceChildren(fragment);
                    }
                } while (again);
                busy = false;
            }

            await drawPages();

            // Redraw when the viewer area changes size for any reason
            let resizeTimer;
            const observer = new ResizeObserver(() => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(drawPages, 150);
            });
            observer.observe(holder);
        } catch (e) {
            holder.innerHTML = fallback;
        }
    }

    // Wires up the hidden terminal window: reads a typed line, decides what
    // it means, and prints a response. Runs once per window (dataset.wired
    // guards against re-wiring if the window is ever reopened).
    function setupTerminal() {
        const output = document.getElementById('term-output');
        const input = document.getElementById('term-input');
        if (!output || !input || input.dataset.wired) return;
        input.dataset.wired = '1';

        const history = [];
        let historyIndex = 0;

        function print(text) {
            output.textContent += '\n' + text;
            output.scrollTop = output.scrollHeight;
        }

        function openAndNote(target, label) {
            openContent(target);
            print(`(opening ${label}...)`);
        }

        function handleCat(fileArg) {
            const file = fileArg.trim().toLowerCase();
            const files = {
                'about_me.txt': 'CS + Math student at Penn State, rows, draws, and wants to build a house someday.',
                'contact.txt': 'pjs84833@gmail.com | jqp6076@psu.edu | github.com/GraphoLogiCode',
                'resume.pdf': 'Binary file. Try double-clicking the Resume icon instead.',
                'house_blueprint.dwg': 'Blueprint not found. Ask again after graduation.',
                'secrets.txt': 'You found the secret file. There is nothing here yet — check back later.'
            };
            if (!file) print('usage: cat <file>');
            else if (files[file]) print(files[file]);
            else print(`cat: ${fileArg}: No such file or directory`);
        }

        function runCommand(raw) {
            print('C:\\Users\\Benjamin> ' + raw);
            const line = raw.trim();
            if (!line) return;

            history.push(raw);
            historyIndex = history.length;

            const parts = line.split(/\s+/);
            const cmd = parts[0].toLowerCase();
            const rest = parts.slice(1).join(' ');
            const lower = line.toLowerCase();

            if (cmd === 'help') {
                print([
                    'Available commands:',
                    '  whoami        - who is running this session',
                    '  about         - quick bio',
                    '  resume        - open the resume window',
                    '  projects      - open the projects window',
                    '  art           - open the art folder',
                    '  contact       - open the contact window',
                    '  ls / dir      - list files here',
                    '  cat <file>    - view a file',
                    '  build house   - long-term goal status',
                    '  date          - today\'s date',
                    '  cls / clear   - clear the screen',
                    '  exit          - close this window'
                ].join('\n'));
            } else if (cmd === 'whoami') {
                print('BENJAMIN\\joosung_park\n(박주성 — preferred name: Benjamin Park)\nComputer Science + Math, Penn State \'27');
            } else if (lower === 'about --full' || lower === 'about -full') {
                openAndNote('about', 'About Me');
            } else if (cmd === 'about') {
                print("CS student at Penn State, minoring in math and art. Rows, draws, and wants to build a house someday — logically supported and well-designed. Type 'about --full' for the full window.");
            } else if (cmd === 'resume') {
                openAndNote('resume', 'Resume');
            } else if (cmd === 'projects') {
                openAndNote('projects', 'My Projects');
            } else if (cmd === 'art') {
                openAndNote('art', 'My Art');
            } else if (cmd === 'contact') {
                openAndNote('contact', 'Contact');
            } else if (cmd === 'ls' || cmd === 'dir') {
                print(' Directory of C:\\Users\\Benjamin\n\nresume.pdf\nprojects\\\nart\\\nabout_me.txt\ncontact.txt\nhouse_blueprint.dwg   [in progress]\nsecrets.txt');
            } else if (cmd === 'cat') {
                handleCat(rest);
            } else if (lower === 'sudo make me a sandwich') {
                print('Okay.');
            } else if (lower === 'make me a sandwich') {
                print('Permission denied. Try asking nicer... or use sudo.');
            } else if (cmd === 'sudo' && rest.toLowerCase() === 'rm -rf /') {
                print("Nice try. This portfolio doesn't have a root to delete.");
            } else if (lower === 'rm -rf /') {
                print('Permission denied.');
            } else if (cmd === 'sudo' && !rest) {
                print('usage: sudo <command>');
            } else if (cmd === 'sudo') {
                print(`Running "${rest}" as admin doesn't make it any more real. Nice try though.`);
            } else if (lower === 'build house' || lower === 'cd house') {
                print('Status: Foundation not yet started.\nETA: after I finish building a career first.');
            } else if (cmd === 'date') {
                print(new Date().toDateString());
            } else if (cmd === 'cls' || cmd === 'clear') {
                output.textContent = "Benjamin Park's Portfolio [Command Line]";
            } else if (cmd === 'exit' || cmd === 'close') {
                wm.closeWindow('terminal');
            } else {
                soundManager.play('error');
                print(`'${parts[0]}' is not recognized as an internal or external command,\noperable program or batch file.`);
            }
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = input.value;
                input.value = '';
                runCommand(val);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!history.length) return;
                historyIndex = Math.max(0, historyIndex - 1);
                input.value = history[historyIndex] || '';
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!history.length) return;
                historyIndex = Math.min(history.length, historyIndex + 1);
                input.value = history[historyIndex] || '';
            }
        });

        input.focus();
        document.getElementById('win-terminal')?.addEventListener('mousedown', () => input.focus());
    }

    // ---- Hidden terminal easter egg ----
    // Enter the classic Konami code (↑ ↑ ↓ ↓ ← → ← → B A) anywhere on the
    // desktop to unlock a Command Prompt icon. The unlock is remembered
    // (localStorage) so the icon doesn't disappear on refresh.
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiProgress = 0;

    document.addEventListener('keydown', (e) => {
        // Don't hijack typing inside the terminal or anywhere else
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (key === KONAMI[konamiProgress]) {
            konamiProgress++;
            if (konamiProgress === KONAMI.length) {
                konamiProgress = 0;
                unlockTerminal();
            }
        } else {
            konamiProgress = (key === KONAMI[0]) ? 1 : 0;
        }
    });

    function ensureTerminalIcon() {
        if (document.querySelector('.desktop-icon[data-target="terminal"]')) return;
        const icon = document.createElement('div');
        icon.className = 'desktop-icon';
        icon.setAttribute('data-target', 'terminal');
        icon.innerHTML = `
            <div class="icon-img"><svg viewBox="0 0 32 32"><use href="#i-terminal" /></svg></div>
            <div class="icon-label">Command Prompt</div>
        `;
        wireDesktopIcon(icon);
        document.getElementById('desktop').appendChild(icon);
    }

    function unlockTerminal() {
        localStorage.setItem('terminalUnlocked', '1');
        ensureTerminalIcon();
        soundManager.playStartup();
        openContent('terminal');
    }

    // Restore the icon on future visits, without reopening the window
    if (localStorage.getItem('terminalUnlocked')) {
        ensureTerminalIcon();
    }

    // Shutdown button (easter egg).
    // The falling shutdown chord starts first; the screen swap waits a
    // moment so the sound isn't cut off by the page change.
    document.getElementById('btn-shutdown')?.addEventListener('click', () => {
        soundManager.play('shutdown');
        setTimeout(showShutdownScreen, 600);
    });

    function showShutdownScreen() {
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #1E5799 0%, #207cca 50%, #2989d8 100%); color: #fff; font-family: Tahoma, sans-serif;">
                <div style="text-align: center;">
                    <h1 style="font-weight: normal; margin-bottom: 20px;">Windows is shutting down...</h1>
                    <p style="color: #cce5ff;">It is now safe to turn off your computer.</p>
                    <p style="color: #aaa; font-size: 12px; margin-top: 30px;">(Refresh to restart)</p>
                </div>
            </div>
        `;
    }
});
