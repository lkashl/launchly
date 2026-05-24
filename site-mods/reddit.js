// Reddit mod - makes backgrounds transparent
module.exports = {
    id: 'reddit',

    css: `
        /* Universal Reddit transparency - uses broad selectors to catch all backgrounds */
        html, body {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }

        /* All divs and major containers */
        div, main, aside, section, nav, header, footer, span, article {
            background-color: transparent !important;
            background-image: none !important;
        }

        /* Reddit specific containers and wrappers */
        [class*="app"], [class*="wrapper"], [class*="container"],
        [class*="background"], [class*="layout"], [class*="frame"],
        [class*="content"], [class*="sidebar"], [class*="feed"],
        [class*="post"], [class*="listing"], [class*="Layer"] {
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
        [class*="overlay"], [class*="dropdown"], [role="dialog"],
        [class*="menu"], [class*="tooltip"] {
            background: rgba(30, 30, 30, 0.85) !important;
            backdrop-filter: blur(10px) !important;
        }

        /* Keep cards and posts slightly visible for readability */
        [class*="Post"], [class*="card"], [class*="Card"] {
            background: rgba(30, 30, 30, 0.3) !important;
            backdrop-filter: blur(5px) !important;
        }

        /* Remove pseudo-element backgrounds */
        *::before, *::after {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }
    `,

    getScriptString: function (css) {
        return ''
    }
};
