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
    // Listen for all fullscreen events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Check immediately in case we're already in fullscreen
    handleFullscreenChange();

    // Also periodically check (fallback for cases where events might not fire)
    // Using 100ms for faster response while still being efficient
    setInterval(handleFullscreenChange, 100);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
