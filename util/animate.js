// Animation function for app switching - can be swapped with custom animations
async function fadeSwitch(fromView, toView) {
    // Default animation: Fade transition
    // This function can be replaced with custom animations like slide, zoom, etc.

    if (fromView && !fromView.webContents.isDestroyed()) {
        // Fade out current view
        const steps = 10;
        for (let i = steps; i >= 0; i--) {
            const opacity = i / steps;
            try {
                await fromView.webContents.executeJavaScript(`
                    document.documentElement.style.opacity = '${opacity}';
                `);
            } catch (err) {
                // View might be destroyed during animation
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 15));
        }
    }

    // Short pause between transitions
    await new Promise(resolve => setTimeout(resolve, 50));

    if (toView && !toView.webContents.isDestroyed()) {
        // Set starting opacity to 0 and make visible
        try {
            await toView.webContents.executeJavaScript(`
                document.documentElement.style.opacity = '0';
            `);
        } catch (err) { }

        // Fade in new view
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            const opacity = i / steps;
            try {
                await toView.webContents.executeJavaScript(`
                    document.documentElement.style.opacity = '${opacity}';
                `);
            } catch (err) {
                // View might be destroyed during animation
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 15));
        }
    }
}


module.exports = {
    fadeSwitch
}