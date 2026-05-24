// WhatsApp mod - makes backgrounds transparent
module.exports = {
    id: 'whatsapp',

    css: `
        /* Universal WhatsApp transparency - uses broad selectors to catch all backgrounds */
        html, body {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }

        /* All divs and major containers */
        div, main, aside, section, nav, header, footer, span {
            background-color: transparent !important;
            background-image: none !important;
        }

        /* WhatsApp specific containers and wrappers */
        [class*="app"], [class*="wrapper"], [class*="container"],
        [class*="background"], [class*="drawer"], [class*="panel"],
        [class*="pane"], [class*="chat"], [class*="sidebar"],
        [class*="content"], [class*="layer"] {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }

        /* Theme backgrounds */
        [class*="theme-"], [class*="bg-"], [class*="Background"] {
            background: transparent !important;
            background-color: transparent !important;
        }

        /* Remove all box shadows */
        * {
            box-shadow: none !important;
        }

        /* Keep modals and popups semi-transparent for readability */
        [class*="modal"], [class*="Modal"], [class*="popup"], 
        [class*="menu"], [class*="dropdown"], [role="dialog"] {
            background: rgba(30, 30, 30, 0.85) !important;
            backdrop-filter: blur(10px) !important;
        }

        /* Make message bubbles transparent */
        [class*="message-out"], [class*="message-in"],
        [class*="message-"], [class*="bubble"] {
            background: transparent !important;
            background-color: transparent !important;
        }

        /* Remove pseudo-element backgrounds */
        *::before, *::after {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }
    `,

    getScriptString: function (css) {
        return `(function() {
            const TRANSPARENT_CSS = ${JSON.stringify(css)};
            
            // Create adoptable stylesheet (more efficient than style elements)
            let transparentSheet;
            try {
                transparentSheet = new CSSStyleSheet();
                transparentSheet.replaceSync(TRANSPARENT_CSS);
            } catch (e) {
                console.log('WhatsApp Transparency: Adoptable stylesheets not supported, using fallback');
            }
            
            // Track processed shadow roots to avoid duplicate processing
            const processedShadowRoots = new WeakSet();
            
            // Inject stylesheet into a shadow root
            function injectIntoShadowRoot(shadowRoot) {
                if (!shadowRoot || processedShadowRoots.has(shadowRoot)) return;
                
                try {
                    if (transparentSheet && shadowRoot.adoptedStyleSheets) {
                        // Use adoptable stylesheets (most efficient)
                        shadowRoot.adoptedStyleSheets = [transparentSheet, ...shadowRoot.adoptedStyleSheets];
                    } else {
                        // Fallback: inject style element
                        if (!shadowRoot.querySelector('#whatsapp-transparent')) {
                            const style = document.createElement('style');
                            style.id = 'whatsapp-transparent';
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
            
            // Watch for new shadow roots with MutationObserver
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) { // Element node
                            if (node.shadowRoot) {
                                injectIntoShadowRoot(node.shadowRoot);
                            }
                            // Check children for shadow roots
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
            
            // Periodic check as fallback (less frequent to reduce performance impact)
            setInterval(() => {
                processShadowRoots();
            }, 3000);
            
            console.log('WhatsApp transparency mod loaded');
            
        })();`;
    }
};
