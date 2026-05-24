// GitHub mod - makes backgrounds transparent
module.exports = {
    id: 'github',

    css: `
        /* Universal GitHub transparency */
        html, body {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }

        /* All containers and major elements */
        div, main, aside, section, nav, header, footer, article {
            background-color: transparent !important;
            background-image: none !important;
        }

        /* All color-bg classes (GitHub's design system) */
        [class*="color-bg"], [class*="bg-"], [class*="Background"] {
            background: transparent !important;
            background-color: transparent !important;
        }

        /* Common containers */
        [class*="container"], [class*="Layout"], [class*="Box"],
        [class*="Header"], [class*="header"], [class*="wrapper"] {
            background: transparent !important;
            background-color: transparent !important;
        }

        /* Code blocks - keep slightly visible */
        pre, code, .highlight, [class*="blob-"],
        .CodeMirror, [class*="code"] {
            background: rgba(0, 0, 0, 0.3) !important;
            background-color: rgba(0, 0, 0, 0.3) !important;
        }

        /* Remove all box shadows and borders */
        * {
            box-shadow: none !important;
        }

        /* Modals and overlays - keep semi-transparent */
        [class*="Overlay"], [class*="modal"], [class*="Modal"],
        [class*="dialog"], [class*="Popover"], dialog {
            background: rgba(20, 20, 20, 0.9) !important;
            backdrop-filter: blur(10px) !important;
        }

        /* Remove pseudo-elements */
        *::before, *::after {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }

        /* Contribution calendar - keep visible */
        [class*="ontribution"], [class*="calendar"], svg {
            background: rgba(0, 0, 0, 0.4) !important;
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
                console.log('GitHub Transparency: Adoptable stylesheets not supported, using fallback');
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
                        if (!shadowRoot.querySelector('#github-transparent')) {
                            const style = document.createElement('style');
                            style.id = 'github-transparent';
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
            
            console.log('GitHub transparency mod loaded');
            
        })();`;
    }
};
