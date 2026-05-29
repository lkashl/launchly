const sites = require('../sites');

/**
 * Extract domains from site URLs
 */
function extractDomains() {
    const domains = new Set();

    sites.forEach(site => {
        try {
            const url = new URL(site.url);
            // Add the domain with protocol
            domains.add(`${url.protocol}//${url.host}`);
            // Also add wildcard for subdomains if it's https
            if (url.protocol === 'https:') {
                domains.add(`https://*.${url.hostname}`);
            }
        } catch (e) {
            console.error(`Error parsing URL for site ${site.id}:`, e);
        }
    });

    // Add additional required domains for functionality
    // CDN for icons
    domains.add('https://cdn.jsdelivr.net');
    domains.add('https://*.jsdelivr.net');

    return Array.from(domains);
}

/**
 * Get allowed domains as a space-separated string for CSP
 */
function getAllowedDomainsString() {
    return extractDomains().join(' ');
}

/**
 * Check if a URL is allowed based on sites.js
 */
function isUrlAllowed(url) {
    if (!url) return false;

    try {
        const urlObj = new URL(url);
        const urlOrigin = `${urlObj.protocol}//${urlObj.host}`;

        // Check if URL matches any site in sites.js
        return sites.some(site => {
            try {
                const siteUrl = new URL(site.url);
                const siteOrigin = `${siteUrl.protocol}//${siteUrl.host}`;

                // Allow same origin or subdomains
                return urlOrigin === siteOrigin ||
                    urlObj.hostname === siteUrl.hostname ||
                    urlObj.hostname.endsWith(`.${siteUrl.hostname}`);
            } catch (e) {
                return false;
            }
        });
    } catch (e) {
        return false;
    }
}


/**
 * Set up navigation guards for a webContents
 */
function setupNavigationGuard(webContents, allowedUrl) {
    // Block navigation to non-allowed sites
    webContents.on('will-navigate', (event, navigationUrl) => {
        if (!isUrlAllowed(navigationUrl)) {
            console.warn(`Blocked navigation to unauthorized URL: ${navigationUrl}`);
            event.preventDefault();
        }
    });

    // Block new window attempts to non-allowed sites
    webContents.setWindowOpenHandler(({ url }) => {
        if (!isUrlAllowed(url)) {
            console.warn(`Blocked window.open to unauthorized URL: ${url}`);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
}

module.exports = {
    extractDomains,
    getAllowedDomainsString,
    isUrlAllowed,
    setupNavigationGuard
};
