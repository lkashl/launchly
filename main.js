const { app, BrowserWindow, BrowserView, ipcMain, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable hardware acceleration and video codecs for YouTube
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,VaapiVideoEncoder,CanvasOopRasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let overlayWindow = null;
let webviews = new Map(); // Store persistent webviews by favoriteId
let webviewIntervals = new Map(); // Store interval IDs for cleanup
let currentWebviewId = null;
let uiTopMargin = 18; // Border offset
let isFullscreen = false; // Track fullscreen state

// Load site mods dynamically
const siteMods = new Map();
function loadSiteMods() {
    const modsDir = path.join(__dirname, 'site-mods');
    try {
        const files = fs.readdirSync(modsDir);
        files.forEach(file => {
            if (file.endsWith('.js')) {
                const modPath = path.join(modsDir, file);
                try {
                    // Clear require cache to allow hot reloading
                    delete require.cache[require.resolve(modPath)];
                    const mod = require(modPath);
                    if (mod.id) {
                        siteMods.set(mod.id, mod);
                        console.log(`Loaded mod: ${mod.id}`);
                    }
                } catch (err) {
                    console.error(`Failed to load mod ${file}:`, err);
                }
            }
        });
    } catch (err) {
        console.error('Failed to read site-mods directory:', err);
    }
}

// Load mods on startup
loadSiteMods();

function updateViewBounds() {
    if (!mainWindow || !currentWebviewId) {
        return;
    }

    const view = webviews.get(currentWebviewId);
    if (!view) {
        return;
    }

    const bounds = mainWindow.getContentBounds();
    const sidebarWidth = isFullscreen ? 0 : 65; // No sidebar in fullscreen

    view.setBounds({
        x: sidebarWidth,
        y: 0,
        width: Math.max(0, bounds.width - sidebarWidth),
        height: bounds.height,
    });
}

function createView(url, appId) {
    // Get mod for this app to check if preload is needed
    const mod = siteMods.get(appId);

    // YouTube-specific configuration to fix loading issues
    const isYouTube = appId === 'youtube' || appId === 'youtube-music';

    const webPreferences = {
        contextIsolation: true, // Use true for better compatibility
        sandbox: false, // Changed to false to allow persistent storage
        nodeIntegration: false,
        partition: `persist:${appId}`, // Each app gets its own persistent partition
        webgl: true, // Enable WebGL for YouTube and other sites
        plugins: true, // Enable plugins
        webSecurity: true, // Keep web security enabled
        allowRunningInsecureContent: false,
        experimentalFeatures: true, // Enable experimental web platform features
        enableRemoteModule: false,
        backgroundThrottling: false, // Don't throttle background pages
    };

    // Only add preload if not YouTube (YouTube seems to have issues with the preload)
    if (!isYouTube) {
        webPreferences.preload = path.join(__dirname, 'fullscreen-preload.js');
        webPreferences.contextIsolation = false; // Keep false for other sites that need it
    }

    // Add additional preload if the mod specifies it needs one
    if (mod && mod.preload) {
        // Note: Can't have multiple preloads, so mod preloads should also include fullscreen detection
        webPreferences.preload = path.join(__dirname, mod.preload);
    }

    const view = new BrowserView({
        webPreferences: webPreferences,
    });


    // Set user agent to Chrome to avoid compatibility issues
    view.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    const injectMods = () => {
        if (!mod) return;

        // Inject CSS if present
        if (mod.css) {
            view.webContents.insertCSS(mod.css).catch(() => { });
        }

        // Inject script if present
        if (mod.getScriptString) {
            const script = mod.getScriptString(mod.css);
            view.webContents.executeJavaScript(script, true).catch(() => { });
        }
    };

    view.webContents.loadURL(url);
    view.webContents.on('did-finish-load', () => {
        injectMods();
    });

    // Store interval ID for cleanup - only run if mod exists
    // Reduced frequency for better performance
    let intervalId = null;
    if (mod) {
        view.webContents.on('did-frame-finish-load', () => {
            if (!view.webContents.isDestroyed()) {
                injectMods();
            }
        });
        view.webContents.on('dom-ready', () => {
            if (!view.webContents.isDestroyed()) {
                injectMods();
            }
        });
        view.webContents.on('did-navigate', () => {
            if (!view.webContents.isDestroyed()) {
                injectMods();
            }
        });

        // Optional: Less frequent interval as fallback (every 5 seconds instead of 1)
        // Comment out if not needed
        intervalId = setInterval(() => {
            if (!view.webContents.isDestroyed()) {
                injectMods();
            }
        }, 5000);
    }

    view.webContents.on('context-menu', (event, params) => {
        const menu = Menu.buildFromTemplate([
            {
                label: 'Inspect Element',
                click: () => view.webContents.inspectElement(params.x, params.y),
            },
            {
                label: 'Toggle DevTools',
                click: () => view.webContents.toggleDevTools(),
            },
            {
                label: 'Reload',
                click: () => view.webContents.reload(),
            }
        ]);
        menu.popup({ window: mainWindow });
    });

    view.webContents.setWindowOpenHandler((details) => {
        try {
            const features = details.features || '';
            const getFeature = (name) => {
                const m = new RegExp(name + "=([0-9-]+)").exec(features);
                return m ? Number(m[1]) : undefined;
            };

            const left = getFeature('left') ?? getFeature('screenX');
            const top = getFeature('top') ?? getFeature('screenY');

            const contentBounds = mainWindow.getContentBounds();

            const override = {};
            if (typeof left === 'number') {
                override.x = Math.round(contentBounds.x + left);
            }
            if (typeof top === 'number') {
                override.y = Math.round(contentBounds.y + uiTopMargin + top);
            }

            if (Object.keys(override).length > 0) {
                return { action: 'allow', overrideBrowserWindowOptions: override };
            }
        } catch (err) {
            // Fall through to default behavior on error
        }
        return { action: 'allow' };
    });

    // Return both view and intervalId
    return { view, intervalId };
}

// Wait for a view to be fully loaded and ready
async function waitForViewReady(view, timeoutMs = 10000) {
    if (!view || view.webContents.isDestroyed()) {
        return;
    }

    // If already loaded, return immediately
    if (!view.webContents.isLoading()) {
        // Give it a small delay to ensure rendering is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        return;
    }

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve();
        }, timeoutMs);

        const onLoad = () => {
            clearTimeout(timeout);
            // Give it a small delay to ensure rendering is complete
            setTimeout(() => resolve(), 100);
        };

        view.webContents.once('did-finish-load', onLoad);
    });
}

// Animation function for app switching - can be swapped with custom animations
async function fadeSwitch(fromView, toView) {
    // Default animation: Fade transition
    // This function can be replaced with custom animations like slide, zoom, etc.

    if (fromView && !fromView.webContents.isDestroyed()) {
        // Fade out current view
        const steps = 10;
        for (let i = steps; i >= 0; i--) {
            const opacity = i / steps;
            try {
                await fromView.webContents.executeJavaScript(`
                    document.documentElement.style.opacity = '${opacity}';
                `);
            } catch (err) {
                // View might be destroyed during animation
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 15));
        }
    }

    // Short pause between transitions
    await new Promise(resolve => setTimeout(resolve, 50));

    if (toView && !toView.webContents.isDestroyed()) {
        // Set starting opacity to 0 and make visible
        try {
            await toView.webContents.executeJavaScript(`
                document.documentElement.style.opacity = '0';
            `);
        } catch (err) { }

        // Fade in new view
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            const opacity = i / steps;
            try {
                await toView.webContents.executeJavaScript(`
                    document.documentElement.style.opacity = '${opacity}';
                `);
            } catch (err) {
                // View might be destroyed during animation
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 15));
        }
    }
}

// Alternative animation examples (commented out - swap with animateAppSwitch to use):

// Slide animation
async function slideSwitch(fromView, toView) {
    const bounds = mainWindow.getContentBounds();
    const sidebarWidth = 65;

    if (fromView && !fromView.webContents.isDestroyed()) {
        const steps = 15;
        for (let i = 0; i <= steps; i++) {
            const offset = (i / steps) * (bounds.width - sidebarWidth);
            try {
                await fromView.webContents.executeJavaScript(`
                    document.documentElement.style.transform = 'translateX(-${offset}px)';
                `);
            } catch (err) { break; }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    if (toView && !toView.webContents.isDestroyed()) {
        // Set starting position and make visible
        try {
            await toView.webContents.executeJavaScript(`
                document.documentElement.style.opacity = '1';
                document.documentElement.style.transform = 'translateX(${bounds.width - sidebarWidth}px)';
            `);
        } catch (err) { }

        // Animate slide in
        const steps = 15;
        for (let i = steps; i >= 0; i--) {
            const offset = (i / steps) * (bounds.width - sidebarWidth);
            try {
                await toView.webContents.executeJavaScript(`
                    document.documentElement.style.transform = 'translateX(${offset}px)';
                `);
            } catch (err) { break; }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
}

// Zoom animation
async function zoomSwitch(fromView, toView) {
    if (fromView && !fromView.webContents.isDestroyed()) {
        const steps = 12;
        for (let i = steps; i >= 0; i--) {
            const scale = 1 - (0.2 * (steps - i) / steps);
            const opacity = i / steps;
            try {
                await fromView.webContents.executeJavaScript(`
                    document.documentElement.style.transform = 'scale(${scale})';
                    document.documentElement.style.opacity = '${opacity}';
                `);
            } catch (err) { break; }
            await new Promise(resolve => setTimeout(resolve, 12));
        }
    }

    await new Promise(resolve => setTimeout(resolve, 30));

    if (toView && !toView.webContents.isDestroyed()) {
        // Set starting position and make visible
        try {
            await toView.webContents.executeJavaScript(`
                document.documentElement.style.opacity = '0';
                document.documentElement.style.transform = 'scale(0.8)';
            `);
        } catch (err) { }

        // Animate zoom in
        const steps = 12;
        for (let i = 0; i <= steps; i++) {
            const scale = 0.8 + (0.2 * i / steps);
            const opacity = i / steps;
            try {
                await toView.webContents.executeJavaScript(`
                    document.documentElement.style.transform = 'scale(${scale})';
                    document.documentElement.style.opacity = '${opacity}';
                `);
            } catch (err) { break; }
            await new Promise(resolve => setTimeout(resolve, 12));
        }
    }
}

const animateAppSwitch = fadeSwitch; // Change to slideSwitch or zoomSwitch for different animations


async function showWebview(appId, url) {
    if (!mainWindow) {
        return;
    }

    // Notify that app is loading
    if (mainWindow?.webContents) {
        mainWindow.webContents.send('app-loading', appId, true);
    }

    // Create webview if it doesn't exist
    const isNewView = !webviews.has(appId);
    if (isNewView) {
        const viewData = createView(url, appId);
        webviews.set(appId, viewData.view);
        if (viewData.intervalId) {
            webviewIntervals.set(appId, viewData.intervalId);
        }
    }

    const view = webviews.get(appId);
    const previousView = currentWebviewId ? webviews.get(currentWebviewId) : null;
    currentWebviewId = appId;

    // Hide the view initially to prevent flash
    if (isNewView || view.webContents.isLoading()) {
        try {
            await view.webContents.executeJavaScript(`
                document.documentElement.style.opacity = '0';
            `);
        } catch (err) { }
    }

    // Set the browser view
    mainWindow.setBrowserView(view);
    updateViewBounds();

    // Wait for the view to be ready if it's a new view or currently loading
    if (isNewView || view.webContents.isLoading()) {
        await waitForViewReady(view);
    }

    // Notify that app is done loading
    if (mainWindow?.webContents) {
        mainWindow.webContents.send('app-loading', appId, false);
    }

    // Animate the transition
    animateAppSwitch(previousView, view).catch(() => {
        // Animation failed, but app still switches
    });

    // Notify main window about visibility change
    if (mainWindow?.webContents) {
        mainWindow.webContents.send('webview-visibility-changed', true, appId);
        mainWindow.webContents.send('site-changed', appId);
    }
}

async function switchToWebview(appId) {
    if (!mainWindow || !webviews.has(appId)) {
        return;
    }

    const view = webviews.get(appId);
    const previousView = currentWebviewId ? webviews.get(currentWebviewId) : null;
    currentWebviewId = appId;

    // Notify that app is loading if it's still loading
    if (view.webContents.isLoading() && mainWindow?.webContents) {
        mainWindow.webContents.send('app-loading', appId, true);
    }

    // Switch to this browser view
    mainWindow.setBrowserView(view);
    updateViewBounds();

    // Wait for the view to be ready if it's currently loading
    if (view.webContents.isLoading()) {
        await waitForViewReady(view);

        // Notify that app is done loading
        if (mainWindow?.webContents) {
            mainWindow.webContents.send('app-loading', appId, false);
        }
    }

    // Animate the transition
    animateAppSwitch(previousView, view).catch(() => {
        // Animation failed, but app still switches
    });

    // Notify main window about the change
    if (mainWindow?.webContents) {
        mainWindow.webContents.send('webview-visibility-changed', true, appId);
        mainWindow.webContents.send('site-changed', appId);
    }
}

function toggleCurrentWebviewDevTools() {
    if (!mainWindow) {
        return;
    }

    // If no webview is open, toggle DevTools for the main window
    if (!currentWebviewId) {
        mainWindow.webContents.toggleDevTools();
        return;
    }

    const view = webviews.get(currentWebviewId);
    if (view && !view.webContents.isDestroyed()) {
        view.webContents.toggleDevTools();
    }
}

function closeWebview(appId) {
    if (!mainWindow) {
        return;
    }

    // If this is the currently displayed webview, remove it from display
    if (currentWebviewId === appId) {
        mainWindow.setBrowserView(null);
        currentWebviewId = null;
    }

    // Clear the interval to prevent memory leaks and errors
    const intervalId = webviewIntervals.get(appId);
    if (intervalId) {
        clearInterval(intervalId);
        webviewIntervals.delete(appId);
    }

    // Destroy the webview
    const view = webviews.get(appId);
    if (view && !view.webContents.isDestroyed()) {
        view.webContents.destroy();
    }
    webviews.delete(appId);

    // Notify main window
    if (mainWindow?.webContents) {
        mainWindow.webContents.send('webview-visibility-changed', false, appId);
    }
}

function createWindow() {
    const windowOptions = {
        width: 1768,
        height: 820,
        resizable: true,
        maximizable: true,
        fullscreenable: true,
        minimizable: true,
        movable: true,
        minWidth: 400,
        minHeight: 400,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    };

    // Add platform-specific vibrancy/blur effects
    if (process.platform === 'win32') {
        windowOptions.transparent = false;
        windowOptions.backgroundMaterial = 'acrylic';
        windowOptions.backgroundColor = '#00000000';
    } else if (process.platform === 'darwin') {
        windowOptions.transparent = true;
        windowOptions.vibrancy = 'under-window';
        windowOptions.backgroundColor = '#00000000';
    } else {
        windowOptions.transparent = true;
        windowOptions.backgroundColor = '#00000000';
    }

    mainWindow = new BrowserWindow(windowOptions);

    mainWindow.setResizable(true);
    mainWindow.setMinimumSize(800, 600);
    mainWindow.setMovable(true);
    mainWindow.setMaximizable(true);

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('resize', updateViewBounds);
    mainWindow.on('maximize', updateViewBounds);
    mainWindow.on('unmaximize', updateViewBounds);
    mainWindow.on('enter-full-screen', updateViewBounds);
    mainWindow.on('leave-full-screen', updateViewBounds);
    mainWindow.on('closed', () => {
        // Clean up all intervals
        webviewIntervals.forEach((intervalId) => {
            clearInterval(intervalId);
        });
        webviewIntervals.clear();

        // Clean up all webviews
        webviews.forEach((view) => {
            if (view && !view.webContents.isDestroyed()) {
                view.webContents.destroy();
            }
        });
        webviews.clear();
        mainWindow = null;
    });
}

// IPC Handlers
ipcMain.handle('webview-show', (event, appId, url) => {
    showWebview(appId, url);
});

ipcMain.handle('webview-switch', (event, appId) => {
    switchToWebview(appId);
});

ipcMain.handle('webview-close', (event, appId) => {
    closeWebview(appId);
});

// Listen for fullscreen changes from BrowserViews and relay to main window
ipcMain.on('browserview-fullscreen-change', (event, fullscreenState) => {
    isFullscreen = fullscreenState;

    // Update view bounds to expand when fullscreen
    updateViewBounds();

    // Relay to main window for sidebar hiding
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('app-fullscreen-change', fullscreenState);
    }
});

ipcMain.handle('window-minimize', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.handle('window-toggle-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.handle('window-close', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

ipcMain.handle('ui-height', (event, height) => {
    uiTopMargin = Math.max(0, Number(height) || 18);
    updateViewBounds();
});


app.whenReady().then(() => {
    createWindow();

    // Register global keyboard shortcuts for developer tools
    // F12 key
    globalShortcut.register('F12', () => {
        toggleCurrentWebviewDevTools();
    });

    // Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
    const devToolsShortcut = process.platform === 'darwin' ? 'Cmd+Option+I' : 'Ctrl+Shift+I';
    globalShortcut.register(devToolsShortcut, () => {
        toggleCurrentWebviewDevTools();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    // Unregister all shortcuts
    globalShortcut.unregisterAll();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
