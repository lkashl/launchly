// Plex mod - removes background for transparency
module.exports = {
    id: 'plex',

    css: `
        /* Remove Plex background elements */
        [class*="FullPageBackground-backgroundContainer"] {
            display: none !important;
        }
    `,

    getScriptString: (css) => {
        // Remove Plex background elements
        function removePlexBackground() {
            const elements = document.querySelectorAll('[class*="FullPageBackground-backgroundContainer"]');
            elements.forEach((el) => {
                el.remove();
            });
        }

        // Apply on load
        removePlexBackground();

        // Watch for new background elements
        const observer = new MutationObserver(() => {
            removePlexBackground();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Zoom control functionality
        let currentZoom = 1;

        function setZoom(scale, xPct = 50, yPct = 50) {
            const v = document.querySelector('video');
            if (!v) return;

            // Set base styles
            Object.assign(v.style, {
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'center center',
                transformOrigin: 'center center'
            });

            v.style.transform = `scale(${scale})`;
            v.style.objectPosition = `${xPct}% ${yPct}%`;
        }

        function addZoomControl() {
            // Check if already added (only DOM check - no flag!)
            if (document.getElementById('plex-zoom-control')) return;

            // Target the right button group (matches PlayerControls-buttonGroupRight-GUID pattern)
            let buttonGroupRight = document.querySelector('[class*="PlayerControls-buttonGroupRight"]');

            // Fallback: try finding by the second class pattern
            if (!buttonGroupRight) {
                const allButtonGroups = document.querySelectorAll('[class*="PlayerControls-buttonGroup"]');
                console.log('🔍 Searching through button groups, found:', allButtonGroups.length);
                // The right group is typically the last one or contains 'Right' in class
                for (const group of allButtonGroups) {
                    if (group.className.includes('Right')) {
                        buttonGroupRight = group;
                        break;
                    }
                }
            }

            if (!buttonGroupRight) {
                console.log('🔍 Button group right not found');
                return;
            }

            console.log('✅ Found button group right:', buttonGroupRight.className, 'adding zoom control at start');

            // Create zoom control wrapper
            const zoomWrapper = document.createElement('span');
            zoomWrapper.id = 'plex-zoom-control';
            zoomWrapper.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    margin-right: 4px;
                `;

            // Create zoom control container
            const zoomContainer = document.createElement('div');
            zoomContainer.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: rgba(255, 255, 255, 0.9);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 11px;
                `;

            // Create label
            const label = document.createElement('label');
            label.textContent = 'Zoom:';
            label.style.cssText = `
                    font-weight: 400;
                    opacity: 0.8;
                `;

            // Create slider
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0.5';
            slider.max = '3';
            slider.step = '0.01';
            slider.value = '1';
            slider.style.cssText = `
                    width: 80px;
                    height: 3px;
                    cursor: pointer;
                    accent-color: #e5a00d;
                `;

            // Create value display
            const valueDisplay = document.createElement('span');
            valueDisplay.textContent = '1.00x';
            valueDisplay.style.cssText = `
                    min-width: 35px;
                    font-size: 10px;
                    opacity: 0.7;
                    font-variant-numeric: tabular-nums;
                `;

            // Update zoom on slider change
            slider.oninput = (e) => {
                currentZoom = parseFloat(e.target.value);
                valueDisplay.textContent = currentZoom.toFixed(2) + 'x';
                setZoom(currentZoom);
            };

            // Assemble the control
            zoomContainer.appendChild(label);
            zoomContainer.appendChild(slider);
            zoomContainer.appendChild(valueDisplay);

            // Add container to wrapper
            zoomWrapper.appendChild(zoomContainer);

            // Insert at the start of button group right
            buttonGroupRight.insertBefore(zoomWrapper, buttonGroupRight.firstChild);

            console.log('✅ Zoom control added successfully!');
        }

        // Continuously check and re-add zoom control when needed
        setInterval(() => {
            addZoomControl();
        }, 500);

        // Also watch for mutations to quickly respond to DOM changes
        const controlObserver = new MutationObserver(() => {
            addZoomControl();
        });

        controlObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Try immediately
        setTimeout(addZoomControl, 100)
    }
};
