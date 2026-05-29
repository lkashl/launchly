// Discord mod - makes backgrounds transparent
module.exports = {
    id: 'discord',
    css: `
        /* Universal Discord transparency - uses broad selectors to catch all backgrounds */
        html, body {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }

        /* All divs and major containers */
        div, main, aside, section, nav, header, footer {
            background-color: transparent !important;
            background-image: none !important;
        }

        /* All layers, wrappers, and containers */
        [class*="layer"], [class*="layers"], [class*="app"],
        [class*="base"], [class*="wrapper"], [class*="container"],
        [class*="content"], [class*="sidebar"], [class*="chat"],
        [class*="scroller"], [class*="panels"], [class*="guild"],
        [class*="channel"], [class*="members"], [class*="background"] {
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

        /* Keep modals semi-transparent for readability */
        [class*="modal"], [class*="Modal"], [class*="popout"], [class*="menu-"] {
            background: rgba(30, 30, 30, 0.85) !important;
            backdrop-filter: blur(10px) !important;
        }

        /* Remove pseudo-element backgrounds */
        *::before, *::after {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }
    `,

};
