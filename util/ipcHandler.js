// The exposed context functions provided as an aggregate list
// This list is then refined down when exposed in preload hooks to provide narrower privilege levels depending on the context of the renderer (main UI vs site view)

const { ipcMain } = require('electron');
const { openApp, closeApp, updateViewBounds } = require('./view');
const sites = require('../sites');

const IPCSubscriptions = (context) => {
    const { mainWindow, webviews, createView, animateAppSwitch, currentWebviewId, isFullscreen } = context;

    // Expose site list to renderer (sanitized - no mods/functions)
    ipcMain.handle('get-sites', () => {
        // Return only safe data (no functions or module references)
        return sites.map(site => ({
            id: site.id,
            name: site.name,
            url: site.url,
            iconUrl: site.iconUrl
        }));
    });

    // Expose open apps state to renderer
    ipcMain.handle('get-open-apps', () => {
        return {
            openApps: Array.from(context.webviews.keys()),
            currentAppId: context.currentWebviewId
        };
    });

    ipcMain.handle('webview-show', (event, appId, url) => {
        openApp(appId, url, context);
    });

    ipcMain.handle('webview-close', (event, appId) => {
        closeApp(appId, context);
    });

    // Listen for fullscreen changes from BrowserViews and relay to main window
    ipcMain.on('browserview-fullscreen-change', (event, fullscreenState) => {
        context.isFullscreen = fullscreenState;

        // Update view bounds to expand when fullscreen
        updateViewBounds(context.mainWindow, context.webviews, context.currentWebviewId, context.isFullscreen);

        // Relay to main window for sidebar hiding
        if (context.mainWindow && context.mainWindow.webContents) context.mainWindow.webContents.send('app-fullscreen-change', fullscreenState);

    });

    ipcMain.handle('window-minimize', () => {
        if (context.mainWindow) context.mainWindow.minimize();
    });

    ipcMain.handle('window-toggle-maximize', () => {
        if (context.mainWindow) {
            if (context.mainWindow.isMaximized()) {
                context.mainWindow.unmaximize();
            } else {
                context.mainWindow.maximize();
            }
        }
    });

    ipcMain.handle('window-close', () => {
        if (context.mainWindow) context.mainWindow.close();
    });

    ipcMain.handle('ui-height', (event, height) => {
        updateViewBounds(context.mainWindow, context.webviews, context.currentWebviewId, context.isFullscreen);
    });

}

module.exports = {
    IPCSubscriptions
}