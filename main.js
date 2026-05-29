const { app, BrowserWindow, BrowserView, ipcMain, Menu, globalShortcut } = require('electron');
const { fadeSwitch } = require('./util/animate');
const { IPCSubscriptions } = require('./util/ipcHandler');
const { toggleCurrentWebviewDevTools, createView } = require('./util/view');

const path = require('path');
const fs = require('fs');

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
    createView: createView,
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

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

IPCSubscriptions(context)

app.whenReady()
    .then(() => {
        createWindow();

        // Bind to developer tools
        globalShortcut.register('F12', () => toggleCurrentWebviewDevTools(mainWindow, currentWebviewId, webviews))

        const devToolsShortcut = process.platform === 'darwin' ? 'Cmd+Option+I' : 'Ctrl+Shift+I';
        globalShortcut.register(devToolsShortcut, () => toggleCurrentWebviewDevTools(mainWindow, currentWebviewId, webviews));
    });

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => globalShortcut.unregisterAll);

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
