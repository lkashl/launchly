const { ipcRenderer } = require('electron');

// Detect fullscreen changes in the BrowserView
function handleFullscreenChange() {
    const isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );

    // Send fullscreen state to main process
    ipcRenderer.send('browserview-fullscreen-change', isFullscreen);
}

// Listen for all fullscreen events
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

// Also check on load in case we're starting in fullscreen
window.addEventListener('load', handleFullscreenChange);
