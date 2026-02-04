class WindowManager {
    constructor(desktopId, taskbarId) {
        this.desktop = document.getElementById(desktopId);
        this.taskbarAppArea = document.getElementById(taskbarId);
        this.windows = [];
        this.zIndexCounter = 100;
        this.activeWindowId = null;

        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.currentDragWindow = null;

        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', () => this.onMouseUp());

        // Touch events for mobile
        document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        document.addEventListener('touchend', () => this.onTouchEnd());
    }

    openWindow(id, title, contentHtml) {
        const existing = this.windows.find(w => w.id === id);
        if (existing) {
            this.focusWindow(id);
            return;
        }

        const winEl = this.createWindowDOM(id, title, contentHtml);
        this.desktop.appendChild(winEl);

        const taskbarItem = this.createTaskbarItem(id, title);
        this.taskbarAppArea.appendChild(taskbarItem);

        const winObj = {
            id: id,
            element: winEl,
            taskbarElement: taskbarItem,
            minimized: false,
            maximized: false,
            prevPosition: null
        };

        this.windows.push(winObj);
        this.focusWindow(id);

        // Position window with cascade effect
        const offset = (this.windows.length - 1) * 25;
        const startX = 80 + offset;
        const startY = 50 + offset;
        winEl.style.top = `${startY}px`;
        winEl.style.left = `${startX}px`;

        // Play open sound
        if (typeof soundManager !== 'undefined') {
            soundManager.play('open');
        }
    }

    createWindowDOM(id, title, contentHtml) {
        const win = document.createElement('div');
        win.classList.add('window');
        win.id = `win-${id}`;
        win.style.zIndex = this.zIndexCounter;

        win.innerHTML = `
            <div class="title-bar" id="title-${id}">
                <div class="title-bar-text">
                    📁 ${title}
                </div>
                <div class="title-bar-controls">
                    <div class="control-box control-min" title="Minimize">_</div>
                    <div class="control-box control-max" title="Maximize">□</div>
                    <div class="control-box control-close" title="Close">✕</div>
                </div>
            </div>
            <div class="window-body">
                <div class="window-content">
                    ${contentHtml}
                </div>
            </div>
        `;

        // Bind events
        win.addEventListener('mousedown', (e) => {
            // Don't interfere with inputs/textareas
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
                return;
            }
            this.focusWindow(id);
        });

        const titleBar = win.querySelector('.title-bar');
        titleBar.addEventListener('mousedown', (e) => this.startDrag(e, win, id));
        titleBar.addEventListener('touchstart', (e) => this.startDragTouch(e, win, id), { passive: false });

        // Close button
        win.querySelector('.control-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeWindow(id);
        });

        // Minimize button
        win.querySelector('.control-min').addEventListener('click', (e) => {
            e.stopPropagation();
            this.minimizeWindow(id);
        });

        // Maximize button
        win.querySelector('.control-max').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMaximize(id);
        });

        // Double-click title bar to maximize
        titleBar.addEventListener('dblclick', (e) => {
            if (!e.target.closest('.title-bar-controls')) {
                this.toggleMaximize(id);
            }
        });

        return win;
    }

    createTaskbarItem(id, title) {
        const item = document.createElement('div');
        item.classList.add('taskbar-item');
        item.innerText = title;
        item.addEventListener('click', () => {
            if (typeof soundManager !== 'undefined') soundManager.play('click');
            this.toggleWindowFromTaskbar(id);
        });
        return item;
    }

    closeWindow(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (!winObj) return;

        if (typeof soundManager !== 'undefined') soundManager.play('close');

        winObj.element.remove();
        winObj.taskbarElement.remove();

        this.windows = this.windows.filter(w => w.id !== id);

        // Focus next window if any
        if (this.windows.length > 0) {
            const lastWin = this.windows[this.windows.length - 1];
            if (!lastWin.minimized) {
                this.focusWindow(lastWin.id);
            }
        }
    }

    focusWindow(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (!winObj) return;

        // Restore if minimized
        if (winObj.minimized) {
            winObj.element.style.display = 'flex';
            winObj.minimized = false;
        }

        this.zIndexCounter++;
        winObj.element.style.zIndex = this.zIndexCounter;

        // Update all windows
        this.windows.forEach(w => {
            w.taskbarElement.classList.remove('active');
            w.element.classList.add('inactive');
        });

        winObj.element.classList.remove('inactive');
        winObj.taskbarElement.classList.add('active');
        this.activeWindowId = id;
    }

    minimizeWindow(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (!winObj) return;

        if (typeof soundManager !== 'undefined') soundManager.play('click');

        winObj.minimized = true;
        winObj.element.style.display = 'none';
        winObj.taskbarElement.classList.remove('active');
        this.activeWindowId = null;

        // Focus previous window
        const visibleWindows = this.windows.filter(w => !w.minimized);
        if (visibleWindows.length > 0) {
            this.focusWindow(visibleWindows[visibleWindows.length - 1].id);
        }
    }

    toggleMaximize(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (!winObj) return;

        const win = winObj.element;

        if (winObj.maximized) {
            // Restore
            win.style.top = winObj.prevPosition.top;
            win.style.left = winObj.prevPosition.left;
            win.style.width = winObj.prevPosition.width;
            win.style.height = winObj.prevPosition.height;
            winObj.maximized = false;
        } else {
            // Maximize
            winObj.prevPosition = {
                top: win.style.top,
                left: win.style.left,
                width: win.style.width || '450px',
                height: win.style.height || '350px'
            };
            win.style.top = '0';
            win.style.left = '0';
            win.style.width = '100%';
            win.style.height = 'calc(100% - 30px)'; // Leave room for taskbar
            winObj.maximized = true;
        }

        if (typeof soundManager !== 'undefined') soundManager.play('click');
    }

    toggleWindowFromTaskbar(id) {
        const winObj = this.windows.find(w => w.id === id);
        if (!winObj) return;

        if (winObj.id === this.activeWindowId && !winObj.minimized) {
            this.minimizeWindow(id);
        } else {
            this.focusWindow(id);
        }
    }

    // --- Dragging ---
    startDrag(e, winEl, id) {
        if (e.target.closest('.title-bar-controls')) return;

        const winObj = this.windows.find(w => w.id === id);
        if (winObj && winObj.maximized) return; // Don't drag maximized windows

        this.isDragging = true;
        this.currentDragWindow = winEl;

        const rect = winEl.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        // Brief visual feedback
        winEl.style.opacity = '0.95';
    }

    onMouseMove(e) {
        if (!this.isDragging || !this.currentDragWindow) return;

        e.preventDefault();

        let x = e.clientX - this.dragOffset.x;
        let y = e.clientY - this.dragOffset.y;

        // Keep window on screen
        x = Math.max(-50, Math.min(x, window.innerWidth - 100));
        y = Math.max(0, Math.min(y, window.innerHeight - 60));

        this.currentDragWindow.style.left = `${x}px`;
        this.currentDragWindow.style.top = `${y}px`;
    }

    onMouseUp() {
        if (this.currentDragWindow) {
            this.currentDragWindow.style.opacity = '1';
        }
        this.isDragging = false;
        this.currentDragWindow = null;
    }

    // --- Touch Events for Mobile ---
    startDragTouch(e, winEl, id) {
        if (e.target.closest('.title-bar-controls')) return;

        const winObj = this.windows.find(w => w.id === id);
        if (winObj && winObj.maximized) return; // Don't drag maximized windows

        this.isDragging = true;
        this.currentDragWindow = winEl;

        const touch = e.touches[0];
        const rect = winEl.getBoundingClientRect();
        this.dragOffset.x = touch.clientX - rect.left;
        this.dragOffset.y = touch.clientY - rect.top;

        // Brief visual feedback
        winEl.style.opacity = '0.95';

        // Prevent scrolling while dragging
        e.preventDefault();
    }

    onTouchMove(e) {
        if (!this.isDragging || !this.currentDragWindow) return;

        e.preventDefault();

        const touch = e.touches[0];
        let x = touch.clientX - this.dragOffset.x;
        let y = touch.clientY - this.dragOffset.y;

        // Keep window on screen
        x = Math.max(-50, Math.min(x, window.innerWidth - 100));
        y = Math.max(0, Math.min(y, window.innerHeight - 60));

        this.currentDragWindow.style.left = `${x}px`;
        this.currentDragWindow.style.top = `${y}px`;
    }

    onTouchEnd() {
        if (this.currentDragWindow) {
            this.currentDragWindow.style.opacity = '1';
        }
        this.isDragging = false;
        this.currentDragWindow = null;
    }
}
