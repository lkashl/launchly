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
    `
};
