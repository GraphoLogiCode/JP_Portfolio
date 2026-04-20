document.addEventListener('DOMContentLoaded', () => {
    // Initialize Window Manager
    const wm = new WindowManager('desktop', 'taskbar-apps');

    // Play startup sound
    setTimeout(() => soundManager.playStartup(), 500);

    // Desktop Icon Handling
    const icons = document.querySelectorAll('.desktop-icon');

    icons.forEach(icon => {
        icon.addEventListener('dblclick', () => {
            const target = icon.getAttribute('data-target');
            soundManager.play('open');
            openContent(target);
        });

        // Selection state
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            soundManager.play('click');
            icons.forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
        });
    });

    // Deselect icons when clicking desktop
    document.getElementById('desktop').addEventListener('click', () => {
        icons.forEach(i => i.classList.remove('selected'));
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

    // Start menu items
    document.querySelectorAll('.start-item[data-action]').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.getAttribute('data-action');
            startMenu.classList.add('hidden');
            startBtn.classList.remove('active');
            soundManager.play('open');
            openContent(action);
        });
    });

    // Sound toggle
    const toggleSoundEl = document.getElementById('toggle-sound');
    const volumeIcon = document.getElementById('volume-icon');

    if (toggleSoundEl) {
        toggleSoundEl.addEventListener('click', () => {
            soundManager.enabled = !soundManager.enabled;
            toggleSoundEl.textContent = soundManager.enabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
            volumeIcon.textContent = soundManager.enabled ? '🔊' : '🔇';
            volumeIcon.title = soundManager.enabled ? 'Sound On' : 'Sound Off';
        });
    }

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

    // Content Loader
    function openContent(key) {
        const contentMap = {
            'resume': `
                <div style="display: flex; flex-direction: column; height: 100%;">
                    <div style="padding: 10px; background: #f0f0f0; border-bottom: 1px solid #ccc; display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: bold;">📄 Benjamin Park - Resume</span>
                        <a href="assets/resume.pdf" target="_blank" rel="noopener noreferrer" class="xp-button" style="padding: 4px 12px; text-decoration: none; font-size: 11px; margin-left: auto;">
                            📥 Download PDF
                        </a>
                    </div>
                    <iframe src="assets/resume.pdf" style="flex: 1; width: 100%; border: none; min-height: 450px;"></iframe>
                </div>
            `,
            'projects': `
                <h2>📁 My Projects</h2>
                <hr>
                <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 3px;">
                    <strong>RepoComPass</strong>
                    <p style="margin: 8px 0 0 0; color: #555;">A Chrome extension that analyzes job postings and generates personalized portfolio project ideas tailored to your skills and target roles. Helps computer science students and developers build projects that directly align with real job requirements.</p>
                    <p style="margin: 8px 0 0 0; color: #777; font-size: 11px;"><strong>Tech Stack:</strong> HTML, CSS, JavaScript</p>
                    <p style="margin: 8px 0 0 0;"><a href="https://github.com/GraphoLogiCode/RepoComPass" target="_blank" rel="noopener noreferrer" style="color: #0066CC; text-decoration: none;">🔗 View on GitHub</a></p>
                </div>
                <div style="margin: 15px 0; padding: 15px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 3px;">
                    <strong>🖥️ Windows XP Portfolio</strong>
                    <p style="margin: 8px 0 0 0; color: #555;">This website! A retro-styled personal portfolio built with vanilla HTML, CSS, and JavaScript.</p>
                </div>
                <p style="color: #888; font-size: 11px; margin-top: 20px;">More projects coming soon...</p>
            `,
            'about': `
                <h2>📝 About Me</h2>
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
                        <td style="padding: 8px 0; color: #666;"><strong>Minor:</strong></td>
                        <td style="padding: 8px 0;">Mathematics</td>
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
                <h2>✉️ Contact Me</h2>
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
            `
        };

        const titleMap = {
            'resume': 'Resume',
            'projects': 'My Projects',
            'about': 'About Me.txt - Notepad',
            'contact': 'Contact'
        };

        if (contentMap[key]) {
            wm.openWindow(key, titleMap[key], contentMap[key]);
        }
    }

    // Shutdown button (easter egg)
    document.getElementById('btn-shutdown')?.addEventListener('click', () => {
        soundManager.play('close');
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #1E5799 0%, #207cca 50%, #2989d8 100%); color: #fff; font-family: Tahoma, sans-serif;">
                <div style="text-align: center;">
                    <h1 style="font-weight: normal; margin-bottom: 20px;">Windows is shutting down...</h1>
                    <p style="color: #cce5ff;">It is now safe to turn off your computer.</p>
                    <p style="color: #aaa; font-size: 12px; margin-top: 30px;">(Refresh to restart)</p>
                </div>
            </div>
        `;
    });
});
