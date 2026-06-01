// Claude mod - makes backgrounds transparent
module.exports = {
    id: 'claude',
    css: `
        /* Universal Claude transparency - makes all backgrounds transparent */
        html, body {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }

        /* All major containers and divs */
        div, main, aside, section, nav, header, footer, article {
            background-color: transparent !important;
            background-image: none !important;
        }

        /* Target common Claude class patterns */
        [class*="bg-"], [class*="background"], [class*="container"],
        [class*="wrapper"], [class*="main"], [class*="sidebar"],
        [class*="chat"], [class*="conversation"], [class*="thread"],
        [class*="app"], [class*="layout"] {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }

        /* Remove all box shadows for cleaner look */
        * {
            box-shadow: none !important;
        }

        /* Keep modals and popups semi-transparent for readability */
        [role="dialog"], [role="alertdialog"], [class*="modal"],
        [class*="Modal"], [class*="popover"], [class*="menu"],
        [class*="dropdown"] {
            background: rgba(30, 30, 30, 0.90) !important;
            backdrop-filter: blur(10px) !important;
        }

        /* Keep message bubbles slightly visible for better readability */
        [class*="message"], [class*="Message"] {
            background: rgba(0, 0, 0, 0.15) !important;
        }

        /* Remove pseudo-element backgrounds */
        *::before, *::after {
            background: transparent !important;
            background-color: transparent !important;
            background-image: none !important;
        }
    `,
};
