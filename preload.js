const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
    getSites: () => ipcRenderer.invoke('get-sites'),
    showWebview: (appId, url) => ipcRenderer.invoke('webview-show', appId, url),
    switchToWebview: (appId) => ipcRenderer.invoke('webview-switch', appId),
    closeWebview: (appId) => ipcRenderer.invoke('webview-close', appId),
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
