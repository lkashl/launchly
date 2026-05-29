const sites = require('../sites');
const path = require('path');
const { BrowserView, Menu } = require('electron');

// Create the site view
function createView(url, siteId) {
    const thisSite = sites.find(site => site.id === siteId);

    const webPreferences = {
        contextIsolation: true,
        nodeIntegration: false,
        partition: `persist:${siteId}`,
        preload: path.join(__dirname, 'sitePreload.js')
    };

    if (!thisSite) throw new Error('Site is not permitted')

    const view = new BrowserView({
        webPreferences: webPreferences,
    });

    view.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    const injectMods = () => {
        if (view.webContents.isDestroyed()) return;
        const { mods } = thisSite

        // Inject CSS if present
        if (mods.css) view.webContents.insertCSS(mods.css);

        // Inject script if present
        if (mods.getScriptString) {
            let script = mods.getScriptString.toString();
            if (!script.startsWith('(css) =>')) return console.error('script signature incorrect ' + mods.id)
            script = `(${script})(${JSON.stringify(mods.css)})`;

            view.webContents.executeJavaScript(script, true);
        }
    };

    view.webContents.loadURL(url);
    view.webContents.on('did-finish-load', injectMods);
    view.webContents.on('did-frame-finish-load', injectMods);
    view.webContents.on('dom-ready', injectMods);
    view.webContents.on('did-navigate', injectMods);

    view.webContents.on('context-menu', (event, params) => {
        const menu = Menu.buildFromTemplate([
            {
                label: 'Inspect Element',
                click: () => view.webContents.inspectElement(params.x, params.y),
            },
            {
                label: 'Reload',
                click: () => view.webContents.reload(),
            }
        ]);
        menu.popup({ window: mainWindow });
    });

    // Return both view and intervalId
    return { view };
}

async function showWebview(appId, url, context) {
    const { mainWindow, webviews, webviewIntervals, createView, animateAppSwitch, isFullscreen } = context;

    if (!mainWindow) return;

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
    const needsLoading = false // isNewView || view.webContents.isLoading();

    if (needsLoading && mainWindow?.webContents) mainWindow.webContents.send('app-loading', appId, true);

    const previousView = context.currentWebviewId ? webviews.get(context.currentWebviewId) : null;
    context.currentWebviewId = appId;

    // Hide the view initially to prevent flash
    if (needsLoading) await view.webContents.executeJavaScript(`document.documentElement.style.opacity = '0';`);

    // Set the browser view
    mainWindow.setBrowserView(view);

    // Wait for the view to be ready if it's a new view or currently loading
    if (needsLoading) await waitForViewReady(view);

    // Animate the transition
    await animateAppSwitch(previousView, view)

    // Notify that app is done loading (after animation completes)
    if (needsLoading && mainWindow?.webContents) mainWindow.webContents.send('app-loading', appId, false);


    // Notify main window about visibility change
    if (mainWindow?.webContents) {
        mainWindow.webContents.send('webview-visibility-changed', true, appId);
        mainWindow.webContents.send('site-changed', appId);
    }
}

async function switchToWebview(appId, context) {
    const { mainWindow, webviews, animateAppSwitch, isFullscreen } = context;

    if (!mainWindow || !webviews.has(appId)) return;

    const view = webviews.get(appId);
    const previousView = context.currentWebviewId ? webviews.get(context.currentWebviewId) : null;
    context.currentWebviewId = appId;

    // Track if we need to dismiss loading indicator
    const wasLoading = view.webContents.isLoading();

    // Notify that app is loading if it's still loading
    if (wasLoading && mainWindow?.webContents) mainWindow.webContents.send('app-loading', appId, true);


    // Switch to this browser view
    mainWindow.setBrowserView(view);

    // Wait for the view to be ready if it's currently loading
    if (wasLoading) await waitForViewReady(view);

    // Animate the transition
    await animateAppSwitch(previousView, view)

    // Notify that app is done loading (after animation completes)
    if (wasLoading && mainWindow?.webContents) mainWindow.webContents.send('app-loading', appId, false);


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

    if (!mainWindow) return;

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
    if (mainWindow?.webContents) mainWindow.webContents.send('webview-visibility-changed', false, appId);
}

// Wait for a view to be fully loaded and ready
async function waitForViewReady(view, timeoutMs = 10000) {
    if (!view || view.webContents.isDestroyed()) return;

    // If already loaded, return immediately
    if (!view.webContents.isLoading()) {
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
    showWebview,
    switchToWebview,
    closeWebview,
    toggleCurrentWebviewDevTools,
    waitForViewReady,
    createView
}