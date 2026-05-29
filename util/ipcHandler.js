const { ipcMain } = require('electron');
const { showWebview, switchToWebview, closeWebview } = require('./view');
const sites = require('../sites');

const IPCSubscriptions = (context) => {
    const { mainWindow, webviews, webviewIntervals, createView, animateAppSwitch, currentWebviewId, isFullscreen, uiTopMargin } = context;

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

    ipcMain.handle('webview-show', (event, appId, url) => {
        showWebview(appId, url, context);
    });

    ipcMain.handle('webview-switch', (event, appId) => {
        switchToWebview(appId, context);
    });

    ipcMain.handle('webview-close', (event, appId) => {
        closeWebview(appId, context);
    });

    // Listen for fullscreen changes from BrowserViews and relay to main window
    ipcMain.on('browserview-fullscreen-change', (event, fullscreenState) => {
        context.isFullscreen = fullscreenState;

        // Update view bounds to expand when fullscreen
        // updateViewBounds(context.mainWindow, context.currentWebviewId, context.webviews, context.isFullscreen);

        // Relay to main window for sidebar hiding
        if (context.mainWindow && context.mainWindow.webContents) {
            context.mainWindow.webContents.send('app-fullscreen-change', fullscreenState);
        }
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
        context.uiTopMargin = Math.max(0, Number(height) || 18);
        // updateViewBounds(context.mainWindow, context.currentWebviewId, context.webviews, context.isFullscreen);
    });

}

module.exports = {
    IPCSubscriptions
}