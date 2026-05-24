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
        return ''
    }
};
