// Preload for render JS to expose a susbet of IPC handlers functionality
// Preload is used by renderer.js and is the highest level of privilege the app will provide
// Other sites should use the preloadFullscreen hook which does not provide this level of privilege access

const { contextBridge, ipcRenderer } = require('electron');

// Create the functions by which context bridge can be accessed in the renderer process, and expose them under the "browserAPI" namespace
contextBridge.exposeInMainWorld('browserAPI', {
    getSites: () => ipcRenderer.invoke('get-sites'),
    getOpenApps: () => ipcRenderer.invoke('get-open-apps'),
    openApp: (appId, url) => ipcRenderer.invoke('webview-show', appId, url),
    closeApp: (appId) => ipcRenderer.invoke('webview-close', appId),
    updateUIHeight: (height) => ipcRenderer.invoke('ui-height', height),
    minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
    maximizeWindow: () => ipcRenderer.invoke('window-toggle-maximize'),
    toggleMaximizeWindow: () => ipcRenderer.invoke('window-toggle-maximize'),
    closeWindow: () => ipcRenderer.invoke('window-close'),
    minimizeWebviewWindow: () => ipcRenderer.invoke('window-minimize'),
    toggleMaximizeWebviewWindow: () => ipcRenderer.invoke('window-toggle-maximize'),
    onWebviewVisibilityChanged: (callback) => ipcRenderer.on('webview-visibility-changed', (event, isVisible, appId) => callback(isVisible, appId)),
    onSiteChanged: (callback) => ipcRenderer.on('site-changed', (event, siteId) => callback(siteId)),
    onAppLoading: (callback) => ipcRenderer.on('app-loading', (event, appId, isLoading) => callback(appId, isLoading)),
    onAppFullscreenChange: (callback) => ipcRenderer.on('app-fullscreen-change', (event, isFullscreen) => callback(isFullscreen)),
});

contextBridge.exposeInMainWorld('electronAPI', {
    setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('set-ignore-mouse-events', ignore, options)
});
