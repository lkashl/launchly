const { app, BrowserWindow, BrowserView, ipcMain, Menu, globalShortcut } = require('electron');
const { fadeSwitch } = require('./util/animate');
const { IPCSubscriptions } = require('./util/ipcHandler');
const { updateViewBounds, toggleCurrentWebviewDevTools } = require('./util/view');

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

// Create context object to pass to util functions
const context = {
    get mainWindow() { return mainWindow; },
    set mainWindow(value) { mainWindow = value; },
    get webviews() { return webviews; },
    get webviewIntervals() { return webviewIntervals; },
    get currentWebviewId() { return currentWebviewId; },
    set currentWebviewId(value) { currentWebviewId = value; },
    get uiTopMargin() { return uiTopMargin; },
    set uiTopMargin(value) { uiTopMargin = value; },
    get isFullscreen() { return isFullscreen; },
    set isFullscreen(value) { isFullscreen = value; },
    createView,
    animateAppSwitch: fadeSwitch
};

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
        plugins: false, // Enable plugins
        webSecurity: true, // Keep web security enabled
    };

    // Only add preload if not YouTube (YouTube seems to have issues with the preload)
    if (!isYouTube) {
        webPreferences.preload = path.join(__dirname, 'fullscreen-preload.js');
        webPreferences.contextIsolation = false; // Keep false for other sites that need it
    }

    // Add additional preload if the mod specifies it needs one
    if (mod && mod.preload) webPreferences.preload = path.join(__dirname, mod.preload);

    const view = new BrowserView({
        webPreferences: webPreferences,
    });


    // Set user agent to Chrome to avoid compatibility issues
    view.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    const injectMods = () => {
        if (!mod) return;
        if (view.webContents.isDestroyed()) return;
        // Inject CSS if present
        if (mod.css) view.webContents.insertCSS(mod.css).catch(() => { });

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
        view.webContents.on('did-frame-finish-load', () => injectMods());
        view.webContents.on('dom-ready', () => injectMods());
        view.webContents.on('did-navigate', () => injectMods());

        // Keep injecting afterwards - ideally this should not be necessary
        // intervalId = setInterval(injectMods, 5000);
    }

    view.webContents.on('context-menu', (event, params) => {
        const menu = Menu.buildFromTemplate([
            {
                label: 'Inspect Element',
                click: () => view.webContents.inspectElement(params.x, params.y),
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

const animateAppSwitch = fadeSwitch

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

    mainWindow.on('resize', () => updateViewBounds(mainWindow, currentWebviewId, webviews, isFullscreen));
    mainWindow.on('maximize', () => updateViewBounds(mainWindow, currentWebviewId, webviews, isFullscreen));
    mainWindow.on('unmaximize', () => updateViewBounds(mainWindow, currentWebviewId, webviews, isFullscreen));
    mainWindow.on('enter-full-screen', () => updateViewBounds(mainWindow, currentWebviewId, webviews, isFullscreen));
    mainWindow.on('leave-full-screen', () => updateViewBounds(mainWindow, currentWebviewId, webviews, isFullscreen));
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

IPCSubscriptions(context)

app.whenReady().then(() => {
    createWindow();

    // Register global keyboard shortcuts for developer tools
    // F12 key
    globalShortcut.register('F12', () => {
        toggleCurrentWebviewDevTools(mainWindow, currentWebviewId, webviews);
    });

    // Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
    const devToolsShortcut = process.platform === 'darwin' ? 'Cmd+Option+I' : 'Ctrl+Shift+I';
    globalShortcut.register(devToolsShortcut, () => {
        toggleCurrentWebviewDevTools(mainWindow, currentWebviewId, webviews);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
