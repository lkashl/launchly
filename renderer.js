// Provides the core UI logic and interactivity for the application including sidebar and window controls
let sites = [];

const sidebarContainer = document.getElementById('sidebar-container');

function renderSidebar() {
    sidebarContainer.innerHTML = '';

    sites.forEach((site) => {
        const item = document.createElement('div');
        item.className = 'sidebar-item';
        item.dataset.id = site.id;
        item.title = site.name;

        item.innerHTML = `
            <div class="sidebar-icon ${site.id}">
                <img src="${site.iconUrl}" alt="${site.name}" onerror="console.error('Failed to load icon for ${site.name}:', this.src); this.style.display='none'; this.parentElement.textContent='${site.icon || '•'}'" />
            </div>
            <button class="close-button" title="Close ${site.name}">×</button>
        `;

        const icon = item.querySelector('.sidebar-icon');
        const closeBtn = item.querySelector('.close-button');

        // Click on icon to open app
        icon.addEventListener('click', () => {
            openApp(site.id, site.url);
        });

        // Click on close button to close app
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeApp(site.id);
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

    minimizeBtn.addEventListener('click', window.browserAPI.minimizeWindow);
    maximizeBtn.addEventListener('click', window.browserAPI.maximizeWindow);
    closeBtn.addEventListener('click', window.browserAPI.closeWindow);

    sidebarContainer.appendChild(windowControls);
}

// Open or switch to an app
function openApp(appId, url) {
    window.browserAPI.openApp(appId, url);
    updateSidebarUI();
}

// Close a specific app
async function closeApp(appId) {
    window.browserAPI.closeApp(appId);

    // Get current state from main process
    const { openApps, currentAppId } = await window.browserAPI.getOpenApps();

    // Default to another open app if there is anything available 
    if (currentAppId === appId) {
        if (openApps.length > 0) {
            const lastApp = openApps[openApps.length - 1];
            openApp(lastApp);
        }
    }

    updateSidebarUI();
}

// Update sidebar UI to show which apps are open and which is active
async function updateSidebarUI() {
    // Fetch current state from main process
    const { openApps, currentAppId } = await window.browserAPI.getOpenApps();
    const openAppsSet = new Set(openApps);

    const items = sidebarContainer.querySelectorAll('.sidebar-item');
    items.forEach(item => {
        const appId = item.dataset.id;
        item.classList.toggle('open', openAppsSet.has(appId));
        item.classList.toggle('active', appId === currentAppId);
    });
}

// Listen for webview visibility changes from main process
window.browserAPI.onWebviewVisibilityChanged((isVisible, appId) => {
    updateSidebarUI();
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

// Initialize - Load sites from main process then render
async function initialize() {
    // Fetch sites from main process via secure IPC
    sites = await window.browserAPI.getSites();
    renderSidebar();
}

// Start initialization when DOM is ready
initialize();

window.addEventListener('load', window.browserAPI.updateUIHeight);

// Listen for fullscreen changes from apps (BrowserViews)
window.browserAPI.onAppFullscreenChange((isFullscreen) => {
    if (isFullscreen) {
        document.body.classList.add('fullscreen');
    } else {
        document.body.classList.remove('fullscreen');
    }
});
