// Apps configuration using Dashboard Icons (dark theme SVG)
const path = require('path');
const fs = require('fs');

// Load sites.json from the correct location (handles both asar packed and unpacked)
// When unpacked from asar, the file will be in app.asar.unpacked/sites.json
const sitesPath = path.join(__dirname, 'sites.json');
const sites = JSON.parse(fs.readFileSync(sitesPath, 'utf8'));

sites.forEach(site => {
    site.mods = require(`./site-mods/${site.id}.js`)
    site.themeColor = site.themeColor
})

module.exports = sites
