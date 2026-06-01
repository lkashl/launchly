const { app, BrowserWindow, ipcMain } = require('electron');
const { fadeSwitch } = require('./util/animate');
const { IPCSubscriptions } = require('./util/ipcHandler');
const { createView, updateViewBounds } = require('./util/view');

const path = require('path');

// Stores to be shared between render and main process
let mainWindow = null;
let overlayWindow = null;
let webviews = new Map();
let currentWebviewId = null;
let isFullscreen = false;

// Create context object to share state and functions across modules, latest passed to IPC handler and view functions
const context = {
    get mainWindow() { return mainWindow; },
    set mainWindow(value) { mainWindow = value; },
    get webviews() { return webviews; },
    get currentWebviewId() { return currentWebviewId; },
    set currentWebviewId(value) { currentWebviewId = value; },
    get isFullscreen() { return isFullscreen; },
    set isFullscreen(value) { isFullscreen = value; },
    createView: (url, siteId) => createView(url, siteId, mainWindow),
    animateAppSwitch: fadeSwitch
};

// Create the main electron window
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
            nodeIntegration: false
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

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Log console messages from main window
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Main Window] ${message}`);
    });

    // Update view boundaries
    mainWindow.on('resize', () => updateViewBounds(mainWindow, webviews, currentWebviewId, isFullscreen));

    mainWindow.on('maximize', () => updateViewBounds(mainWindow, webviews, currentWebviewId, isFullscreen));

    mainWindow.on('unmaximize', () => updateViewBounds(mainWindow, webviews, currentWebviewId, isFullscreen));

    // Keyboard shortcuts for main window DevTools (only active when app window is focused)
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;

        const isDevToolsKey = input.key === 'F12' ||
            ((input.control || input.meta) && input.shift && input.key === 'I');

        if (isDevToolsKey) {
            mainWindow.webContents.toggleDevTools();
            event.preventDefault();
        }
    });

    // Clean up when window is closed
    mainWindow.on('closed', () => {
        // Remove all child views
        webviews.forEach((view, appId) => {
            try {
                if (mainWindow && mainWindow.contentView) {
                    mainWindow.contentView.removeChildView(view);
                }
                if (view && !view.webContents.isDestroyed()) {
                    view.webContents.destroy();
                }
            } catch (e) {
                console.error(`Error cleaning up view ${appId}:`, e);
            }
        });
        webviews.clear();
        mainWindow = null;
    });
}

IPCSubscriptions(context)

app.whenReady()
    .then(() => {
        createWindow();
    });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    // Clean up all webviews before quitting
    webviews.forEach((view, appId) => {
        try {
            if (view && !view.webContents.isDestroyed()) {
                view.webContents.destroy();
            }
        } catch (e) {
            console.error(`Error destroying view ${appId}:`, e);
        }
    });
    webviews.clear();

    // Remove all IPC handlers
    ipcMain.removeAllListeners();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
