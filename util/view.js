function updateViewBounds(mainWindow, currentWebviewId, webviews, isFullscreen) {
    if (!mainWindow || !currentWebviewId) return;
    const view = webviews.get(currentWebviewId);
    if (!view) return;


    const bounds = mainWindow.getContentBounds();
    const sidebarWidth = isFullscreen ? 0 : 65; // No sidebar in fullscreen

    view.setBounds({
        x: sidebarWidth,
        y: 0,
        width: Math.max(0, bounds.width - sidebarWidth),
        height: bounds.height,
    });
}

async function showWebview(appId, url, context) {
    const { mainWindow, webviews, webviewIntervals, createView, animateAppSwitch, isFullscreen } = context;

    if (!mainWindow) {
        return;
    }

    // Notify that app is loading
    if (mainWindow?.webContents) {
        mainWindow.webContents.send('app-loading', appId, true);
    }

    // Create webview if it doesn't exist
    const isNewView = !webviews.has(appId);
    if (isNewView) {
        const viewData = createView(url, appId);
        webviews.set(appId, viewData.view);
        if (viewData.intervalId) {
            webviewIntervals.set(appId, viewData.intervalId);
        }
    }

    const view = webviews.get(appId);
    const previousView = context.currentWebviewId ? webviews.get(context.currentWebviewId) : null;
    context.currentWebviewId = appId;

    // Hide the view initially to prevent flash
    if (isNewView || view.webContents.isLoading()) {
        try {
            await view.webContents.executeJavaScript(`
                document.documentElement.style.opacity = '0';
            `);
        } catch (err) { }
    }

    // Set the browser view
    mainWindow.setBrowserView(view);
    updateViewBounds(mainWindow, context.currentWebviewId, webviews, isFullscreen);

    // Wait for the view to be ready if it's a new view or currently loading
    if (isNewView || view.webContents.isLoading()) {
        await waitForViewReady(view);
    }

    // Notify that app is done loading
    if (mainWindow?.webContents) {
        mainWindow.webContents.send('app-loading', appId, false);
    }

    // Animate the transition
    animateAppSwitch(previousView, view).catch(() => {
        // Animation failed, but app still switches
    });

    // Notify main window about visibility change
    if (mainWindow?.webContents) {
        mainWindow.webContents.send('webview-visibility-changed', true, appId);
        mainWindow.webContents.send('site-changed', appId);
    }
}

async function switchToWebview(appId, context) {
    const { mainWindow, webviews, animateAppSwitch, isFullscreen } = context;

    if (!mainWindow || !webviews.has(appId)) {
        return;
    }

    const view = webviews.get(appId);
    const previousView = context.currentWebviewId ? webviews.get(context.currentWebviewId) : null;
    context.currentWebviewId = appId;

    // Notify that app is loading if it's still loading
    if (view.webContents.isLoading() && mainWindow?.webContents) {
        mainWindow.webContents.send('app-loading', appId, true);
    }

    // Switch to this browser view
    mainWindow.setBrowserView(view);
    updateViewBounds(mainWindow, context.currentWebviewId, webviews, isFullscreen);

    // Wait for the view to be ready if it's currently loading
    if (view.webContents.isLoading()) {
        await waitForViewReady(view);

        // Notify that app is done loading
        if (mainWindow?.webContents) {
            mainWindow.webContents.send('app-loading', appId, false);
        }
    }

    // Animate the transition
    animateAppSwitch(previousView, view).catch(() => {
        // Animation failed, but app still switches
    });

    // Notify main window about the change
    if (mainWindow?.webContents) {
        mainWindow.webContents.send('webview-visibility-changed', true, appId);
        mainWindow.webContents.send('site-changed', appId);
    }
}


function toggleCurrentWebviewDevTools(mainWindow, currentWebviewId, webviews) {
    if (!mainWindow) {
        return;
    }

    // If no webview is open, toggle DevTools for the main window
    if (!currentWebviewId) {
        mainWindow.webContents.toggleDevTools();
        return;
    }

    const view = webviews.get(currentWebviewId);
    if (view && !view.webContents.isDestroyed()) {
        view.webContents.toggleDevTools();
    }
}

function closeWebview(appId, context) {
    const { mainWindow, webviews, webviewIntervals } = context;

    if (!mainWindow) {
        return;
    }

    // If this is the currently displayed webview, remove it from display
    if (context.currentWebviewId === appId) {
        mainWindow.setBrowserView(null);
        context.currentWebviewId = null;
    }

    // Clear the interval to prevent memory leaks and errors
    const intervalId = webviewIntervals.get(appId);
    if (intervalId) {
        clearInterval(intervalId);
        webviewIntervals.delete(appId);
    }

    // Destroy the webview
    const view = webviews.get(appId);
    if (view && !view.webContents.isDestroyed()) {
        view.webContents.destroy();
    }
    webviews.delete(appId);

    // Notify main window
    if (mainWindow?.webContents) {
        mainWindow.webContents.send('webview-visibility-changed', false, appId);
    }
}

// Wait for a view to be fully loaded and ready
async function waitForViewReady(view, timeoutMs = 10000) {
    if (!view || view.webContents.isDestroyed()) return;

    // If already loaded, return immediately
    if (!view.webContents.isLoading()) {
        // Give it a small delay to ensure rendering is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        return;
    }

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve();
        }, timeoutMs);

        const onLoad = () => {
            clearTimeout(timeout);
            // Give it a small delay to ensure rendering is complete
            setTimeout(() => resolve(), 100);
        };

        view.webContents.once('did-finish-load', onLoad);
    });
}

module.exports = {
    updateViewBounds,
    showWebview,
    switchToWebview,
    closeWebview,
    toggleCurrentWebviewDevTools,
    waitForViewReady
}