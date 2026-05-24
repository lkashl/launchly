// YouTube mod - makes backgrounds transparent
module.exports = {
    id: 'youtube',

    css: `
        /* ULTRA AGGRESSIVE YouTube transparency */
        * {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
            box-shadow: none !important;
        }

        /* Video cards - keep slightly visible for UI */
        ytd-rich-item-renderer, ytd-video-renderer, 
        ytd-grid-video-renderer, ytd-compact-video-renderer,
        ytd-playlist-video-renderer, ytd-playlist-renderer {
            background: rgba(0, 0, 0, 0.25) !important;
        }

        /* Thumbnails background */
        ytd-thumbnail, yt-img-shadow {
            background: rgba(0, 0, 0, 0.2) !important;
        }

        /* Keep modals visible */
        tp-yt-paper-dialog, ytd-popup-container,
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
            console.log('🎥 YouTube Transparency Mod Starting...');
            
            const TRANSPARENT_CSS = ${JSON.stringify(css)};
            
            // Function to aggressively remove backgrounds from elements
            function makeTransparent(element) {
                if (!element || !element.style) return;
                
                // Directly set inline styles to override everything
                element.style.setProperty('background', 'transparent', 'important');
                element.style.setProperty('background-color', 'transparent', 'important');
                element.style.setProperty('background-image', 'none', 'important');
                element.style.setProperty('box-shadow', 'none', 'important');
            }
            
            // Process all elements
            function processAllElements(root = document) {
                try {
                    const elements = root.querySelectorAll('*');
                    elements.forEach(el => {
                        makeTransparent(el);
                        
                        // Process shadow roots
                        if (el.shadowRoot) {
                            processAllElements(el.shadowRoot);
                        }
                    });
                } catch (e) {
                    console.error('Error processing elements:', e);
                }
            }
            
            // Initial processing
            console.log('🎥 Initial YouTube transparency processing...');
            makeTransparent(document.documentElement);
            makeTransparent(document.body);
            processAllElements();
            
            // Create adoptable stylesheet
            let transparentSheet;
            try {
                transparentSheet = new CSSStyleSheet();
                transparentSheet.replaceSync(TRANSPARENT_CSS);
                document.adoptedStyleSheets = [transparentSheet, ...document.adoptedStyleSheets];
                console.log('🎥 Stylesheet adopted successfully');
            } catch (e) {
                console.log('🎥 Adoptable stylesheets not supported, using fallback');
                // Fallback: inject style element
                const style = document.createElement('style');
                style.id = 'youtube-transparent';
                style.textContent = TRANSPARENT_CSS;
                document.head.appendChild(style);
            }
            
            // Mutation Observer to handle dynamic content
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            makeTransparent(node);
                            
                            if (node.shadowRoot) {
                                processAllElements(node.shadowRoot);
                            }
                            
                            if (node.querySelectorAll) {
                                const children = node.querySelectorAll('*');
                                children.forEach(child => {
                                    makeTransparent(child);
                                    if (child.shadowRoot) {
                                        processAllElements(child.shadowRoot);
                                    }
                                });
                            }
                        }
                    }
                }
            });
            
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true,
                attributes: false
            });
            
            // Aggressive periodic processing
            setInterval(() => {
                makeTransparent(document.documentElement);
                makeTransparent(document.body);
                processAllElements();
            }, 1000);
            
            console.log('🎥 YouTube transparency mod fully loaded and active');
            
        })();`;
    }
};
