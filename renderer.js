// Apps configuration using Dashboard Icons (dark theme SVG)
const apps = [
    {
        id: 'home-assistant',
        name: 'Home Assistant',
        url: 'http://homeassistant.local:8123/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/home-assistant.svg'
    },
    {
        id: 'discord',
        name: 'Discord',
        url: 'https://discord.com/app',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/discord.svg'
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        url: 'https://web.whatsapp.com/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/whatsapp.svg'
    },
    {
        id: 'reddit',
        name: 'Reddit',
        url: 'https://www.reddit.com/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/reddit.svg'
    },
    {
        id: 'plex',
        name: 'Plex',
        url: 'https://app.plex.tv/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/plex.svg'
    },
    {
        id: 'github',
        name: 'GitHub',
        url: 'https://github.com/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/github-light.svg'
    },
    {
        id: 'youtube',
        name: 'YouTube',
        url: 'https://www.youtube.com/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/youtube.svg'
    },
    {
        id: 'youtube-music',
        name: 'YouTube Music',
        url: 'https://music.youtube.com/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/youtube-music.svg'
    },
];

const sidebarContainer = document.getElementById('sidebar-container');

// Track open apps and current active app
let openApps = new Set();
let currentAppId = null;

// Render sidebar items
function renderSidebar() {
    sidebarContainer.innerHTML = '';

    apps.forEach((app) => {
        const item = document.createElement('div');
        item.className = 'sidebar-item';
        item.dataset.id = app.id;
        item.title = app.name;

        item.innerHTML = `
            <div class="sidebar-icon ${app.id}">
                <img src="${app.iconUrl}" alt="${app.name}" onerror="console.error('Failed to load icon for ${app.name}:', this.src); this.style.display='none'; this.parentElement.textContent='${app.icon || '•'}'" />
            </div>
            <button class="close-button" title="Close ${app.name}">×</button>
        `;


        const icon = item.querySelector('.sidebar-icon');
        const closeBtn = item.querySelector('.close-button');

        // Click on icon to open/switch app
        icon.addEventListener('click', () => {
            openApp(app.id, app.url);
        });

        // Click on close button to close app
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeApp(app.id);
        });

        sidebarContainer.appendChild(item);
    });

    // Add spacer
    const spacer = document.createElement('div');
    spacer.className = 'sidebar-spacer';
    sidebarContainer.appendChild(spacer);

    // Add window controls
    const windowControls = document.createElement('div');
    windowControls.className = 'window-controls';
    windowControls.innerHTML = `
        <button class="window-control-btn minimize" title="Minimize">−</button>
        <button class="window-control-btn maximize" title="Maximize">□</button>
        <button class="window-control-btn close" title="Close">×</button>
    `;

    // Add event listeners for window controls
    const minimizeBtn = windowControls.querySelector('.minimize');
    const maximizeBtn = windowControls.querySelector('.maximize');
    const closeBtn = windowControls.querySelector('.close');

    minimizeBtn.addEventListener('click', () => {
        window.browserAPI.minimizeWindow();
    });

    maximizeBtn.addEventListener('click', () => {
        window.browserAPI.maximizeWindow();
    });

    closeBtn.addEventListener('click', () => {
        window.browserAPI.closeWindow();
    });

    sidebarContainer.appendChild(windowControls);
}

// Open or switch to an app
function openApp(appId, url) {
    // If this app is already open, just switch to it
    if (openApps.has(appId)) {
        switchToApp(appId);
    } else {
        // Open new app
        openApps.add(appId);
        window.browserAPI.showWebview(appId, url);
        updateSidebarUI();
    }
}

// Switch to an already-open app
function switchToApp(appId) {
    if (openApps.has(appId)) {
        currentAppId = appId;
        window.browserAPI.switchToWebview(appId);
        updateSidebarUI();
    }
}

// Close a specific app
function closeApp(appId) {
    if (openApps.has(appId)) {
        openApps.delete(appId);
        window.browserAPI.closeWebview(appId);

        // If this was the current app, switch to another open app or set to null
        if (currentAppId === appId) {
            if (openApps.size > 0) {
                const lastApp = Array.from(openApps).pop();
                switchToApp(lastApp);
            } else {
                currentAppId = null;
            }
        }

        updateSidebarUI();
    }
}

// Close the current app (kept for backwards compatibility)
function closeCurrentApp() {
    if (currentAppId) {
        closeApp(currentAppId);
    }
}

// Update sidebar UI to show which apps are open and which is active
function updateSidebarUI() {
    const items = sidebarContainer.querySelectorAll('.sidebar-item');
    items.forEach(item => {
        const appId = item.dataset.id;
        item.classList.toggle('open', openApps.has(appId));
        item.classList.toggle('active', appId === currentAppId);
    });
}

// Listen for webview visibility changes from main process
window.browserAPI.onWebviewVisibilityChanged((isVisible, appId) => {
    if (isVisible) {
        currentAppId = appId;
        updateSidebarUI();
    } else {
        if (openApps.size === 0) {
            currentAppId = null;
        }
        updateSidebarUI();
    }
});

// Listen for app loading state changes
const loadingIndicator = document.getElementById('loading-indicator');
window.browserAPI.onAppLoading((appId, isLoading) => {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
});

// Initialize
renderSidebar();

// Update UI height (border offset)
function updateUIHeight() {
    const borderOffset = 18;
    window.browserAPI.updateUIHeight(borderOffset);
}

window.addEventListener('load', updateUIHeight);

// Listen for fullscreen changes from apps (BrowserViews)
window.browserAPI.onAppFullscreenChange((isFullscreen) => {
    if (isFullscreen) {
        document.body.classList.add('fullscreen');
    } else {
        document.body.classList.remove('fullscreen');
    }
});
