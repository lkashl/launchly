// Provides the core UI logic and interactivity for the application including sidebar and window controls
let sites = [];
let userConfig = { apps: [] };

const sidebarContainer = document.getElementById('sidebar-container');

// Drag and drop state
let draggedItem = null;
let draggedOverItem = null;

function getSidebarDropItems() {
    return Array.from(sidebarContainer.querySelectorAll('.sidebar-item:not(.vacant)'));
}

function clearSidebarDragState() {
    const items = sidebarContainer.querySelectorAll('.sidebar-item');
    items.forEach(item => {
        item.classList.remove('drag-over', 'insert-before', 'insert-after', 'shift-up', 'shift-down');
    });
}

function updateDragTarget(targetItem) {
    if (!draggedItem || !targetItem || targetItem === draggedItem || targetItem.classList.contains('vacant')) {
        return;
    }

    clearSidebarDragState();
    targetItem.classList.add('drag-over', getInsertPositionClass(draggedItem, targetItem));
    draggedOverItem = targetItem;
    visuallyReorderItems(draggedItem, targetItem);
}

function getInsertPositionClass(sourceItem, targetItem) {
    const items = getSidebarDropItems();
    return items.indexOf(sourceItem) < items.indexOf(targetItem) ? 'insert-after' : 'insert-before';
}

function getDragInsertColor(item) {
    const icon = item?.querySelector('.sidebar-icon');
    const boxShadow = icon ? window.getComputedStyle(icon).boxShadow : '';
    const colorMatch = boxShadow.match(/rgba?\([^)]+\)/);

    return colorMatch ? colorMatch[0] : 'rgba(147, 51, 234, 0.95)';
}

function getNearestSidebarItem(clientY) {
    return getSidebarDropItems()
        .filter(item => item !== draggedItem)
        .reduce((nearest, item) => {
            const rect = item.getBoundingClientRect();
            const distance = Math.abs(clientY - (rect.top + rect.height / 2));

            if (!nearest || distance < nearest.distance) {
                return { item, distance };
            }

            return nearest;
        }, null)?.item || null;
}

async function swapSidebarItems(sourceItem, targetItem) {
    if (!sourceItem || !targetItem || sourceItem === targetItem || targetItem.classList.contains('vacant')) {
        return false;
    }

    const draggedId = sourceItem.dataset.id;
    const targetId = targetItem.dataset.id;

    if (!draggedId || !targetId) {
        return false;
    }

    const draggedAppConfig = userConfig.apps.find(a => a.id === draggedId);
    const targetAppConfig = userConfig.apps.find(a => a.id === targetId);

    if (!draggedAppConfig || !targetAppConfig) {
        return false;
    }

    // Swap slots
    const tempSlot = draggedAppConfig.slot;
    draggedAppConfig.slot = targetAppConfig.slot;
    targetAppConfig.slot = tempSlot;

    // Save the updated config
    await window.browserAPI.saveUserConfig(userConfig);

    // Re-render the sidebar
    renderSidebar();

    // Update UI state
    await updateSidebarUI();

    return true;
}

function renderSidebar() {
    sidebarContainer.innerHTML = '';

    // Get ordered sites list based on config
    const orderedSites = getOrderedSites();

    orderedSites.forEach((site, index) => {
        const item = document.createElement('div');
        item.className = site ? 'sidebar-item' : 'sidebar-item vacant';
        item.dataset.id = site ? site.id : '';
        item.dataset.slot = site ? getSlotForApp(site.id) : '';
        item.title = site ? site.name : 'Add app';

        // Add drag and drop attributes for non-vacant items
        if (site) {
            item.draggable = true;
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
        }

        // Add drop zone listeners to all items
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);

        if (!site) {
            // Render vacant slot with plus icon
            item.innerHTML = `
                <div class="sidebar-icon vacant-icon">
                    <span class="plus-icon">+</span>
                </div>
            `;

            const icon = item.querySelector('.sidebar-icon');
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                showRestoreMenu(e, item);
            });
        } else {
            // Render normal app item
            item.innerHTML = `
                <div class="sidebar-icon ${site.id}">
                    <img src="${site.iconUrl}" alt="${site.name}" onerror="console.error('Failed to load icon for ${site.name}:', this.src); this.style.display='none'; this.parentElement.textContent='${site.icon || '•'}'" />
                </div>
                <button class="close-button" title="Close ${site.name}">×</button>
                <button class="remove-button" title="Remove ${site.name} from sidebar">−</button>
            `;

            const icon = item.querySelector('.sidebar-icon');
            const closeBtn = item.querySelector('.close-button');
            const removeBtn = item.querySelector('.remove-button');

            // Click on icon to open app
            icon.addEventListener('click', () => {
                openApp(site.id, site.url);
            });

            // Click on close button to close app
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeApp(site.id);
            });

            // Click on remove button to remove app from sidebar
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeAppFromSidebar(site.id);
            });
        }

        sidebarContainer.appendChild(item);
    });

    // Add spacer with drag handlers to prevent red stop icon
    const spacer = document.createElement('div');
    spacer.className = 'sidebar-spacer';
    spacer.addEventListener('dragover', (e) => {
        if (draggedItem) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            updateDragTarget(getNearestSidebarItem(e.clientY));
        }
    });
    spacer.addEventListener('drop', async (e) => {
        e.preventDefault();
        updateDragTarget(getNearestSidebarItem(e.clientY));
        await swapSidebarItems(draggedItem, draggedOverItem);

        return false;
    });
    sidebarContainer.appendChild(spacer);

    // Add window controls
    const windowControls = document.createElement('div');
    windowControls.className = 'window-controls';
    windowControls.innerHTML = `
        <button class="window-control-btn minimize" title="Minimize">−</button>
        <button class="window-control-btn maximize" title="Maximize">□</button>
        <button class="window-control-btn close" title="Close">×</button>
    `;

    // Add drag handlers to window controls to prevent no-drag cursor
    windowControls.addEventListener('dragover', (e) => {
        if (draggedItem) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            updateDragTarget(getNearestSidebarItem(e.clientY));
        }
    });
    windowControls.addEventListener('drop', async (e) => {
        e.preventDefault();
        updateDragTarget(getNearestSidebarItem(e.clientY));
        await swapSidebarItems(draggedItem, draggedOverItem);

        return false;
    });

    // Add event listeners for window controls
    const minimizeBtn = windowControls.querySelector('.minimize');
    const maximizeBtn = windowControls.querySelector('.maximize');
    const closeBtn = windowControls.querySelector('.close');

    minimizeBtn.addEventListener('click', window.browserAPI.minimizeWindow);
    maximizeBtn.addEventListener('click', window.browserAPI.maximizeWindow);
    closeBtn.addEventListener('click', window.browserAPI.closeWindow);

    sidebarContainer.appendChild(windowControls);
}

// Drag and Drop Event Handlers
function handleDragStart(e) {
    draggedItem = e.currentTarget;
    sidebarContainer.classList.add('reordering');
    sidebarContainer.style.setProperty('--drag-insert-color', getDragInsertColor(draggedItem));
    draggedItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedItem.innerHTML);

    // Create a custom drag image for better visual feedback
    const dragImage = draggedItem.cloneNode(true);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-9999px';
    dragImage.style.width = '45px';
    dragImage.style.height = '45px';
    dragImage.style.transform = 'rotate(5deg) scale(1.2)';
    dragImage.style.opacity = '0.9';
    dragImage.classList.remove('dragging');
    dragImage.classList.add('drag-preview');

    // Remove buttons from drag image
    const buttons = dragImage.querySelectorAll('.close-button, .remove-button');
    buttons.forEach(btn => btn.remove());

    document.body.appendChild(dragImage);

    // Set the custom drag image
    e.dataTransfer.setDragImage(dragImage, 22, 22);

    // Remove the temporary drag image after a short delay
    setTimeout(() => {
        if (dragImage && dragImage.parentNode) {
            dragImage.parentNode.removeChild(dragImage);
        }
    }, 0);
}

function handleDragEnd(e) {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
    }

    sidebarContainer.classList.remove('reordering');
    sidebarContainer.style.removeProperty('--drag-insert-color');

    // Remove drag-over and shift classes from all items
    clearSidebarDragState();

    draggedItem = null;
    draggedOverItem = null;
}

function handleDragOver(e) {
    if (draggedItem) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        updateDragTarget(e.currentTarget);
    }
    return false;
}

function handleDragEnter(e) {
    const item = e.currentTarget;
    updateDragTarget(item);
}

function handleDragLeave(e) {
    const item = e.currentTarget;
    const relatedTarget = e.relatedTarget;

    // Only remove if we're not entering a child element
    if (!item.contains(relatedTarget)) {
        item.classList.remove('drag-over');
    }
}

// Visually reorder items during drag to show where item will be placed
function visuallyReorderItems(draggedElement, targetElement) {
    if (!draggedElement || !targetElement || draggedElement === targetElement) {
        return;
    }

    const items = Array.from(sidebarContainer.querySelectorAll('.sidebar-item:not(.vacant)'));
    const draggedIndex = items.indexOf(draggedElement);
    const targetIndex = items.indexOf(targetElement);

    if (draggedIndex === -1 || targetIndex === -1) {
        return;
    }

    // Remove all shift classes first
    items.forEach(item => {
        item.classList.remove('shift-up', 'shift-down');
    });

    // Apply shift classes based on drag direction
    if (draggedIndex < targetIndex) {
        // Dragging down - shift items up
        for (let i = draggedIndex + 1; i <= targetIndex; i++) {
            items[i].classList.add('shift-up');
        }
    } else if (draggedIndex > targetIndex) {
        // Dragging up - shift items down
        for (let i = targetIndex; i < draggedIndex; i++) {
            items[i].classList.add('shift-down');
        }
    }
}

async function handleDrop(e) {
    e.preventDefault();

    const dropTarget = e.currentTarget;
    dropTarget.classList.remove('drag-over');

    // Don't process if dropping on self or if no valid drag/drop targets
    if (!draggedItem || draggedItem === dropTarget || dropTarget.classList.contains('vacant')) {
        // Don't stop propagation - let the global handler catch it
        return false;
    }

    const draggedId = draggedItem.dataset.id;
    const dropTargetId = dropTarget.dataset.id;

    if (!draggedId || !dropTargetId) {
        // Don't stop propagation - let the global handler catch it
        return false;
    }

    // Stop propagation only if we're actually processing this drop
    e.stopPropagation();
    await swapSidebarItems(draggedItem, dropTarget);

    return false;
}

// Helper function to get slot for an app
function getSlotForApp(appId) {
    const appConfig = userConfig.apps.find(a => a.id === appId);
    return appConfig ? appConfig.slot : null;
}

// Open or switch to an app
function openApp(appId, url) {
    window.browserAPI.openApp(appId, url);
    updateSidebarUI();
}

// Close a specific app
async function closeApp(appId) {
    window.browserAPI.closeApp(appId);

    // Get current state from main process
    const { openApps, currentAppId } = await window.browserAPI.getOpenApps();

    // Default to another open app if there is anything available 
    if (currentAppId === appId) {
        if (openApps.length > 0) {
            const lastApp = openApps[openApps.length - 1];
            openApp(lastApp);
        }
    }

    updateSidebarUI();
}

// Update sidebar UI to show which apps are open and which is active
async function updateSidebarUI() {
    // Fetch current state from main process
    const { openApps, currentAppId } = await window.browserAPI.getOpenApps();
    const openAppsSet = new Set(openApps);

    const items = sidebarContainer.querySelectorAll('.sidebar-item');
    items.forEach(item => {
        const appId = item.dataset.id;
        if (appId) {
            const isOpen = openAppsSet.has(appId);
            const isActive = appId === currentAppId;
            const site = sites.find(s => s.id === appId);
            const themeColor = site?.themeColor || 'rgba(147, 51, 234, 0.9)';

            item.classList.toggle('open', isOpen);
            item.classList.toggle('active', isActive);

            // Set the active color CSS custom property based on the app's theme
            if (isActive) {
                item.style.setProperty('--active-color', themeColor);
                item.style.removeProperty('--muted-color');
            } else if (isOpen) {
                // Open but not active: use a muted/transparent version of the theme color
                // Reduce alpha from 0.9 to ~0.35 for a subdued look
                const mutedColor = themeColor.replace(/[\d.]+\)$/, '0.35)');
                item.style.setProperty('--muted-color', mutedColor);
                item.style.removeProperty('--active-color');
            } else {
                item.style.removeProperty('--active-color');
                item.style.removeProperty('--muted-color');
            }
        }
    });
}

// Listen for webview visibility changes from main process
window.browserAPI.onWebviewVisibilityChanged((isVisible, appId) => {
    updateSidebarUI();
});

// Listen for app loading state changes
const loadingIndicator = document.getElementById('loading-indicator');
window.browserAPI.onAppLoading((appId, isLoading) => {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
});

// Remove app from sidebar
async function removeAppFromSidebar(appId) {
    // Close the app if it's currently open
    await closeApp(appId);

    // Find the app in config and set slot to null
    const appConfig = userConfig.apps.find(a => a.id === appId);
    if (appConfig) {
        appConfig.slot = null;
        await window.browserAPI.saveUserConfig(userConfig);

        // Force immediate re-render
        renderSidebar();

        // Also update UI state
        await updateSidebarUI();
    }
}

// Show restore menu with available removed apps (shows all apps with slot: null)
function showRestoreMenu(event, vacantItem) {
    // Remove any existing menu
    const existingMenu = document.querySelector('.restore-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    // Get all apps with slot: null (removed apps)
    const removedApps = userConfig.apps
        .filter(appConfig => appConfig.slot === null)
        .map(appConfig => sites.find(site => site.id === appConfig.id))
        .filter(site => site); // Filter out any undefined

    if (removedApps.length === 0) {
        return; // No apps to restore
    }

    // Create menu
    const menu = document.createElement('div');
    menu.className = 'restore-menu';

    // Position menu next to the vacant item
    const rect = vacantItem.getBoundingClientRect();
    menu.style.left = `${rect.right + 10}px`;
    menu.style.top = `${rect.top}px`;

    // Add menu items
    removedApps.forEach(app => {
        const menuItem = document.createElement('div');
        menuItem.className = 'restore-menu-item';
        menuItem.innerHTML = `
            <img src="${app.iconUrl}" alt="${app.name}" class="restore-menu-icon" />
            <span class="restore-menu-name">${app.name}</span>
        `;

        menuItem.addEventListener('click', (e) => {
            e.stopPropagation();
            restoreApp(app.id);
            menu.remove();
        });

        menu.appendChild(menuItem);
    });

    document.body.appendChild(menu);

    // Close menu when clicking outside
    const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    };

    // Use setTimeout to avoid immediate closure from the same click event
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 0);
}

// Get sites in slot order - returns array with sites or null for vacant slots
function getOrderedSites() {
    // Get all apps with assigned slots, sorted by slot number
    const appsWithSlots = userConfig.apps
        .filter(appConfig => appConfig.slot !== null)
        .sort((a, b) => a.slot - b.slot);

    // Map to site objects
    const orderedApps = appsWithSlots.map(appConfig => {
        return sites.find(site => site.id === appConfig.id);
    }).filter(site => site); // Filter out any undefined

    // Count apps with slot: null
    const nullSlotCount = Math.min(1, userConfig.apps.filter(appConfig => appConfig.slot === null).length);

    // Add null entries for each app with slot: null (these will render as vacant bubbles)
    for (let i = 0; i < nullSlotCount; i++) {
        orderedApps.push(null);
    }

    return orderedApps;
}

// Restore app to sidebar - assign it the next available slot
async function restoreApp(appId) {
    const appConfig = userConfig.apps.find(a => a.id === appId);
    if (appConfig) {
        // Find the highest slot number currently in use
        const maxSlot = Math.max(
            -1,
            ...userConfig.apps
                .filter(a => a.slot !== null)
                .map(a => a.slot)
        );

        // Assign the next slot
        appConfig.slot = maxSlot + 1;

        // Save config
        await window.browserAPI.saveUserConfig(userConfig);

        // Force immediate re-render
        renderSidebar();

        // Also update UI state
        await updateSidebarUI();
    }
}

// Initialize - Load sites from main process then render
async function initialize() {
    // Fetch sites from main process via secure IPC
    sites = await window.browserAPI.getSites();

    // Load user configuration
    userConfig = await window.browserAPI.getUserConfig();

    // Sync sites.json with config - ensure all apps are accounted for
    let configChanged = false;

    // Initialize apps array if it doesn't exist
    if (!userConfig.apps || !Array.isArray(userConfig.apps)) {
        userConfig.apps = [];
        configChanged = true;
    }

    // Check for new apps in sites.json that aren't in config
    sites.forEach(site => {
        const existingApp = userConfig.apps.find(a => a.id === site.id);
        if (!existingApp) {
            // New app detected - add with slot: null (hidden by default)
            userConfig.apps.push({
                id: site.id,
                slot: null
            });
            configChanged = true;
        }
    });

    // Save config if it was modified
    if (configChanged) {
        await window.browserAPI.saveUserConfig(userConfig);
    }

    renderSidebar();
}

// Start initialization when DOM is ready
initialize();

// Add global drag handlers to sidebar container to prevent red stop cursor
sidebarContainer.addEventListener('dragover', (e) => {
    if (draggedItem) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        updateDragTarget(getNearestSidebarItem(e.clientY));
    }
});

sidebarContainer.addEventListener('drop', async (e) => {
    if (draggedItem) {
        e.preventDefault();
        updateDragTarget(getNearestSidebarItem(e.clientY));
        await swapSidebarItems(draggedItem, draggedOverItem);
    }
});

window.addEventListener('load', window.browserAPI.updateUIHeight);

// Listen for fullscreen changes from apps (BrowserViews)
window.browserAPI.onAppFullscreenChange((isFullscreen) => {
    if (isFullscreen) {
        document.body.classList.add('fullscreen');
    } else {
        document.body.classList.remove('fullscreen');
    }
});
