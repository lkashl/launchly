// Apps configuration using Dashboard Icons (dark theme SVG)
const sites = [
    {
        id: 'home-assistant',
        name: 'Home Assistant',
        url: 'http://homeassistant.local:8123/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/home-assistant.svg',
        mods: require('./site-mods/home-assistant')
    },
    {
        id: 'discord',
        name: 'Discord',
        url: 'https://discord.com/app',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/discord.svg',
        mods: require('./site-mods/discord')
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        url: 'https://web.whatsapp.com/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/whatsapp.svg',
        mods: require('./site-mods/whatsapp')
    },
    {
        id: 'reddit',
        name: 'Reddit',
        url: 'https://www.reddit.com/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/reddit.svg',
        mods: require('./site-mods/reddit')
    },
    {
        id: 'plex',
        name: 'Plex',
        url: 'https://app.plex.tv/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/plex.svg',
        mods: require('./site-mods/plex')
    },
    {
        id: 'github',
        name: 'GitHub',
        url: 'https://github.com/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/github-light.svg',
        mods: require('./site-mods/github')
    },
    {
        id: 'youtube',
        name: 'YouTube',
        url: 'https://www.youtube.com/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/youtube.svg',
        mods: require('./site-mods/youtube')
    },
    {
        id: 'youtube-music',
        name: 'YouTube Music',
        url: 'https://music.youtube.com/',
        iconUrl: 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/svg/youtube-music.svg',
        mods: require('./site-mods/youtube-music')
    },
];

module.exports = sites