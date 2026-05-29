const { ipcRenderer } = require('electron');

let lastFullscreenState = false;

function handleFullscreenChange() {
    const isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );

    // Only send IPC if state actually changed (avoid spam)
    if (isFullscreen !== lastFullscreenState) {
        lastFullscreenState = isFullscreen;
        ipcRenderer.send('browserview-fullscreen-change', isFullscreen);
    }
}

// Wait for DOM to be ready before attaching listeners
function init() {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    handleFullscreenChange();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
