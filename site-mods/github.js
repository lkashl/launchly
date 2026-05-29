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

};
