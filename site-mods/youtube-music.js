// YouTube Music mod - makes backgrounds transparent
module.exports = {
    id: 'youtube-music',

    css: `
        /* ULTRA AGGRESSIVE YouTube Music transparency */
        * {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
        }

        /* Album/playlist cards - keep slightly visible */
        ytmusic-responsive-list-item-renderer,
        ytmusic-two-row-item-renderer,
        ytmusic-player-bar {
            background: rgba(0, 0, 0, 0.3) !important;
        }

        /* Player controls - keep visible */
        .middle-controls, .player-bar,
        ytmusic-player-bar, .time-info {
            background: rgba(0, 0, 0, 0.4) !important;
        }

        /* Album art and thumbnails */
        ytmusic-thumbnail, yt-img-shadow {
            background: rgba(0, 0, 0, 0.2) !important;
        }

        /* Keep modals and dialogs visible */
        tp-yt-paper-dialog, ytmusic-popup-container,
        [role="dialog"], [role="alertdialog"] {
            background: rgba(20, 20, 20, 0.95) !important;
            backdrop-filter: blur(15px) !important;
        }

        /* Remove all pseudo-elements */
        *::before, *::after {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }
    `,

    getScriptString: function (css) {
        return `(function() {
            const TRANSPARENT_CSS = ${JSON.stringify(css)};
            
            // Create adoptable stylesheet
            let transparentSheet;
            try {
                transparentSheet = new CSSStyleSheet();
                transparentSheet.replaceSync(TRANSPARENT_CSS);
            } catch (e) {
                console.log('YouTube Music Transparency: Adoptable stylesheets not supported, using fallback');
            }
            
            // Track processed shadow roots
            const processedShadowRoots = new WeakSet();
            
            // Inject stylesheet into a shadow root
            function injectIntoShadowRoot(shadowRoot) {
                if (!shadowRoot || processedShadowRoots.has(shadowRoot)) return;
                
                try {
                    if (transparentSheet && shadowRoot.adoptedStyleSheets) {
                        shadowRoot.adoptedStyleSheets = [transparentSheet, ...shadowRoot.adoptedStyleSheets];
                    } else {
                        if (!shadowRoot.querySelector('#ytmusic-transparent')) {
                            const style = document.createElement('style');
                            style.id = 'ytmusic-transparent';
                            style.textContent = TRANSPARENT_CSS;
                            shadowRoot.appendChild(style);
                        }
                    }
                    processedShadowRoots.add(shadowRoot);
                } catch (e) {
                    // Ignore errors from closed shadow roots
                }
            }
            
            // Recursively find and process all shadow roots
            function processShadowRoots(root = document) {
                try {
                    root.querySelectorAll('*').forEach(el => {
                        if (el.shadowRoot) {
                            injectIntoShadowRoot(el.shadowRoot);
                            processShadowRoots(el.shadowRoot);
                        }
                    });
                } catch (e) {
                    // Ignore errors
                }
            }
            
            // Initial processing
            processShadowRoots();
            
            // Watch for new shadow roots
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            if (node.shadowRoot) {
                                injectIntoShadowRoot(node.shadowRoot);
                            }
                            if (node.querySelectorAll) {
                                node.querySelectorAll('*').forEach(el => {
                                    if (el.shadowRoot) {
                                        injectIntoShadowRoot(el.shadowRoot);
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
            
            // Periodic check as fallback
            setInterval(() => {
                processShadowRoots();
            }, 3000);
            
            console.log('YouTube Music transparency mod loaded');
            
        })();`;
    }
};
