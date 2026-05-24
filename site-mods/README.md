# Site Mods

This directory contains site-specific modifications for each app in the browser.

## Structure

Each app has its own JavaScript file that exports a mod object with the following structure:

```javascript
module.exports = {
    id: 'app-id',  // Must match the app ID in renderer.js
    
    css: `
        // Your CSS modifications here
    `,
    
    getScriptString: function(css) {
        return `(function() {
            // Your JavaScript modifications here
            // You can use the css parameter if needed
        })();`;
    }
};
```

## How It Works

1. When the app starts, `main.js` automatically loads all `.js` files from this directory
2. Each mod is stored by its `id` field
3. When an app is opened, the corresponding mod (if exists) is applied:
   - CSS is injected via `insertCSS()`
   - JavaScript is injected via `executeJavaScript()`
4. Mods are re-applied every second and on page navigation to handle dynamic content

## Creating a New Mod

1. Create a new file matching your app ID (e.g., `youtube.js`)
2. Export a module with `id`, `css`, and `getScriptString` properties
3. Add your modifications to the `css` and `getScriptString` function
4. Restart the app to load the new mod

## Example: Home Assistant

See `home-assistant.js` for a complete example that makes backgrounds transparent.

## Notes

- If an app doesn't have a mod file, it will run normally without modifications
- The `id` must exactly match the app ID defined in `renderer.js`
- Mods support hot-reloading (planned feature - currently requires restart)
