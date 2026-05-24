// Plex mod - removes background for transparency
module.exports = {
    id: 'plex',

    css: `
        /* Remove Plex background elements */
        [class*="FullPageBackground-backgroundContainer"] {
            display: none !important;
        }
    `,

    getScriptString: function (css) {
        return `(function() {
            // Remove Plex background elements
            function removePlexBackground() {
                const elements = document.querySelectorAll('[class*="FullPageBackground-backgroundContainer"]');
                elements.forEach((el) => {
                    el.remove();
                });
            }
            
            // Apply on load
            removePlexBackground();
            
            // Watch for new background elements
            const observer = new MutationObserver(() => {
                removePlexBackground();
            });
            
            observer.observe(document.body, { 
                childList: true, 
                subtree: true 
            });
        })();`;
    }
};
