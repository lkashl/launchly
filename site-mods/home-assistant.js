// Home Assistant mod - makes backgrounds transparent
module.exports = {
    id: 'home-assistant',

    css: `
        html, body, home-assistant, hui-root, hui-view, hui-view-background,
        ha-app-layout, ha-card, .view-background, .background, :host,
        hui-view-background *, .view-background *, .background * {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
        }
        hui-view-background::before, hui-view-background::after,
        .view-background::before, .view-background::after,
        .background::before, .background::after {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
        }
    `,

    getScriptString: function (css) {
        return `(function() {
            const TRANSPARENT_CSS = ${JSON.stringify(css)};
            
            // Create adoptable stylesheet (much more efficient than creating style elements)
            let transparentSheet;
            try {
                transparentSheet = new CSSStyleSheet();
                transparentSheet.replaceSync(TRANSPARENT_CSS);
            } catch (e) {
                console.log('Adoptable stylesheets not supported, falling back');
            }
            
            // Track which shadow roots we've already processed
            const processedShadowRoots = new WeakSet();
            
            // Adopt stylesheet into a shadow root
            function adoptStylesheet(shadowRoot) {
                if (!shadowRoot || processedShadowRoots.has(shadowRoot)) return;
                
                try {
                    if (transparentSheet && shadowRoot.adoptedStyleSheets) {
                        // Use adoptable stylesheets (most efficient)
                        shadowRoot.adoptedStyleSheets = [transparentSheet, ...shadowRoot.adoptedStyleSheets];
                    } else {
                        // Fallback: inject style element
                        if (!shadowRoot.querySelector('#ha-transparent')) {
                            const style = document.createElement('style');
                            style.id = 'ha-transparent';
                            style.textContent = TRANSPARENT_CSS;
                            shadowRoot.appendChild(style);
                        }
                    }
                    processedShadowRoots.add(shadowRoot);
                } catch (e) {
                    // Ignore errors from closed shadow roots
                }
            }
            
            // Find and process all shadow roots
            function processShadowRoots(root = document) {
                try {
                    root.querySelectorAll('*').forEach(el => {
                        if (el.shadowRoot) {
                            adoptStylesheet(el.shadowRoot);
                            processShadowRoots(el.shadowRoot);
                        }
                    });
                } catch (e) {
                    // Ignore errors
                }
            }
            
            // Initial processing
            processShadowRoots();
            
            // Watch for new shadow roots with lightweight observer
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            if (node.shadowRoot) {
                                adoptStylesheet(node.shadowRoot);
                            }
                            // Check children for shadow roots
                            if (node.querySelectorAll) {
                                node.querySelectorAll('*').forEach(el => {
                                    if (el.shadowRoot) {
                                        adoptStylesheet(el.shadowRoot);
                                    }
                                });
                            }
                        }
                    }
                }
            });
            
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
            
            // Periodic check as fallback (much less frequent)
            setInterval(() => {
                processShadowRoots();
            }, 3000);
            
        })();`;
    }
};
