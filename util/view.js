const sites = require('../sites');
const path = require('path');
const { WebContentsView, Menu } = require('electron');
const { setupNavigationGuard } = require('./csp');

function updateViewBounds(mainWindow, webviews, currentWebviewId, isFullscreen) {
    if (!mainWindow || !currentWebviewId) return;

    const view = webviews.get(currentWebviewId);
    if (!view || view.webContents.isDestroyed()) return;

    const bounds = mainWindow.getBounds();
    const sidebarWidth = 67; // Width of the sidebar

    // Calculate the bounds for the view
    const viewBounds = {
        x: isFullscreen ? 0 : sidebarWidth,
        y: isFullscreen ? 0 : 0,
        width: isFullscreen ? bounds.width : bounds.width - sidebarWidth,
        height: isFullscreen ? bounds.height : bounds.height
    };

    view.setBounds(viewBounds);
}

// Create the site view
function createView(url, siteId, mainWindow) {
    const thisSite = sites.find(site => site.id === siteId);

    const webPreferences = {
        contextIsolation: true,
        nodeIntegration: false,
        partition: `persist:${siteId}`,
        preload: path.join(__dirname, 'sitePreload.js'),
        offscreen: false
    };

    if (!thisSite) throw new Error('Site is not permitted')

    const view = new WebContentsView({
        webPreferences: webPreferences,
    });

    // Set transparent background color on the view itself
    view.setBackgroundColor('rgba(0, 0, 0, 0)');

    // Disable background throttling to ensure transparency works properly
    view.webContents.setBackgroundThrottling(false);

    view.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // Set up navigation guards to restrict to allowed sites only
    setupNavigationGuard(view.webContents, url);

    // Inject base transparent CSS immediately to prevent white flash
    const baseTransparentCSS = `
        html, body {
            background: transparent !important;
            background-color: transparent !important;
        }
    `;

    // Early injection as soon as DOM starts loading
    view.webContents.on('did-start-loading', () => {
        if (!view.webContents.isDestroyed()) {
            view.webContents.insertCSS(baseTransparentCSS);
        }
    });

    const injectMods = () => {
        if (view.webContents.isDestroyed()) return;
        const { mods } = thisSite

        // Inject base transparent CSS first
        view.webContents.insertCSS(baseTransparentCSS);

        // Inject CSS if present
        if (mods.css) view.webContents.insertCSS(mods.css);

        // Inject script if present
        if (mods.getScript) {
            let script = mods.getScript.toString();
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

    // Keyboard shortcuts for this site's DevTools (only active when this view has focus, not global)
    view.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;

        const isDevToolsKey = input.key === 'F12' ||
            ((input.control || input.meta) && input.shift && input.key === 'I');

        if (isDevToolsKey && !view.webContents.isDestroyed()) {
            view.webContents.toggleDevTools();
            event.preventDefault();
        }
    });

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

    return { view };
}

async function openApp(appId, url, context) {
    const { mainWindow, webviews, animateAppSwitch, isFullscreen } = context;

    if (!mainWindow) return;

    const isNew = !webviews.has(appId)

    // Create webview if it doesn't exist
    if (isNew) {
        const viewData = createView(url, appId, mainWindow);
        webviews.set(appId, viewData.view);
    }

    const view = webviews.get(appId);

    const previousView = context.currentWebviewId ? webviews.get(context.currentWebviewId) : null;
    context.currentWebviewId = appId;

    if (isNew && mainWindow?.webContents) {
        mainWindow.webContents.send('app-loading', appId, true);
    }

    updateViewBounds(mainWindow, webviews, appId, isFullscreen);

    await animateAppSwitch(previousView, null)

    // Set the web contents view
    // Remove previous view if exists
    if (previousView && mainWindow.contentView) {
        try {
            mainWindow.contentView.removeChildView(previousView);
        } catch (e) {
            // View might already be removed
        }
    }

    // Add the new view
    if (mainWindow.contentView) {
        mainWindow.contentView.addChildView(view);
    }

    if (isNew) await waitForViewReady(view);

    // Notify that app is done loading (after animation completes)
    if (isNew && mainWindow?.webContents) {
        mainWindow.webContents.send('app-loading', appId, false);
    }

    if (!isNew) await animateAppSwitch(null, view)

    // Notify main window about visibility change
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

function closeApp(appId, context) {
    const { mainWindow, webviews } = context;

    if (!mainWindow) return;

    const view = webviews.get(appId);
    if (!view) return;

    // If this is the currently displayed webview, remove it from display
    if (context.currentWebviewId === appId) {
        if (view && mainWindow.contentView) {
            try {
                mainWindow.contentView.removeChildView(view);
            } catch (e) {
                // View might already be removed
            }
        }
        context.currentWebviewId = null;
    }

    // Remove all event listeners before destroying
    if (view && !view.webContents.isDestroyed()) {
        try {
            view.webContents.removeAllListeners();
            view.webContents.destroy();
        } catch (e) {
            console.error(`Error destroying view ${appId}:`, e);
        }
    }

    webviews.delete(appId);

    if (mainWindow?.webContents && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send('webview-visibility-changed', false, appId);
    }
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
    openApp,
    closeApp,
    toggleCurrentWebviewDevTools,
    waitForViewReady,
    createView,
    updateViewBounds
}
