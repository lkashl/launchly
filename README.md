# Launchly

This is a very early release of an app launcher for PWA's featuring transparency and user submitted CSS mods

![screenshot](https://private-user-images.githubusercontent.com/13351116/600121868-1b35270c-c3e8-492b-b84e-4bfabd47c869.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3ODAwNjU5MTcsIm5iZiI6MTc4MDA2NTYxNywicGF0aCI6Ii8xMzM1MTExNi82MDAxMjE4NjgtMWIzNTI3MGMtYzNlOC00OTJiLWI4NGUtNGJmYWJkNDdjODY5LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNjA1MjklMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjYwNTI5VDE0NDAxN1omWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPTEwZmMxMzZlOGYyZmVhNzc4MTEwYjI5YTczYWZhYjQ5MjU3MTZhZDgxZTFjNWI1NzMzYWZhNmE2YTJkYjcwNTEmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0JnJlc3BvbnNlLWNvbnRlbnQtdHlwZT1pbWFnZSUyRnBuZyJ9.T2lz5G6Jqh_ZAlcHXqLKWBHbf7kcH02hV_09-dDJdqY)

*Please only use it to access sites that are defined in the launcher and trusted for the alpha phase of release*

## Security

This app uses electron and electron forge for packaging. Context isolation is enabled and node integration is disabled to prevent privileged access in supported sites


## FAQ

### How do I drag the window?

You can use the app bar (the bar which displays all apps) to drag the window around

### Which operating systems are supported?

Currently only windows is packaged as a release, however electron should support Mac OS (liquid glass) and Linux (distro dependent) without too many issues

## Why is site x or y broken?

In order to get transparency working on sites, CSS and the DOM for that site needs to be modified using the site mod logic

Different views or site updates can break this logic so these modules will need to be kept constantly up to date

## Contributing 

Feel free to submit PR adding additional sites or upgrades to core code

site-mods: 

```javascript
module.exports = {
    // Soon to be depracated - redundant
    id: 'id of the application - same as file name',
    // Static CSS that will be appended to the DOM
    css: `css defined as string`,
    // Return a function with flexibility to modify dom as javascript
    getScriptString: (css)=>{}
}
```

sites.js
```javascript
{
    id: 'same as file name',
    name: 'Human readible name',
    url: 'Fully qualified url',
    icon: 'Fully qualifiied icon destination',
    // Soon to be depracated:
    mods: require('relative file path;)
}

```