// =================================================================
// THEME.JS
// Wu Xing Theme System with Magic Orb Selector
// =================================================================

// Initialize theme system on page load
function initThemeSystem() {
    // Load saved theme preferences
    const savedMode = localStorage.getItem('theme-mode') || 'light';
    const savedElement = localStorage.getItem('theme-element') || 'metal';
    
    // Apply saved theme
    applyTheme(savedMode, savedElement);
    
    // Set initial UI states
    updateModeToggle(savedMode);
    updateElementSelection(savedMode, savedElement);
    updateThemeMenuButton(savedMode, savedElement);
    
    // Initialize event listeners
    initEventListeners();
}

// Initialize all event listeners
function initEventListeners() {
    // Mode toggle switch
    const modeToggle = document.getElementById('mode-toggle-input');
    if (modeToggle) {
        modeToggle.addEventListener('change', handleModeToggle);
    }
    
    // Theme menu button
    const themeMenuBtn = document.getElementById('theme-menu-btn');
    const themePanel = document.getElementById('theme-panel');
    const closePanelBtn = document.getElementById('close-theme-panel');
    
    if (themeMenuBtn && themePanel) {
        themeMenuBtn.addEventListener('click', () => {
            themePanel.classList.toggle('active');
        });
    }
    
    if (closePanelBtn && themePanel) {
        closePanelBtn.addEventListener('click', () => {
            themePanel.classList.remove('active');
        });
    }
    
    // Mode orbs in theme panel
    const lightOrb = document.querySelector('[data-mode="light"]');
    const darkOrb = document.querySelector('[data-mode="dark"]');
    
    if (lightOrb) {
        lightOrb.addEventListener('click', () => handleModeOrbClick('light'));
    }
    
    if (darkOrb) {
        darkOrb.addEventListener('click', () => handleModeOrbClick('dark'));
    }
    
    // Element orbs in theme panel
    const elementOrbs = document.querySelectorAll('[data-element]');
    elementOrbs.forEach(orb => {
        orb.addEventListener('click', () => {
            const element = orb.getAttribute('data-element');
            handleElementOrbClick(element);
        });
    });
    
    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (themePanel && themePanel.classList.contains('active')) {
            if (!themePanel.contains(e.target) && !themeMenuBtn.contains(e.target)) {
                themePanel.classList.remove('active');
            }
        }
    });
}

// Handle mode toggle switch
function handleModeToggle(e) {
    const newMode = e.target.checked ? 'dark' : 'light';
    const currentElement = localStorage.getItem('theme-element') || 'metal';
    applyTheme(newMode, currentElement);
    updateElementSelection(newMode, currentElement);
    updateThemeMenuButton(newMode, currentElement);
}

// Handle mode orb click in theme panel
function handleModeOrbClick(mode) {
    const currentElement = localStorage.getItem('theme-element') || 'metal';
    applyTheme(mode, currentElement);
    updateModeToggle(mode);
    updateElementSelection(mode, currentElement);
    updateThemeMenuButton(mode, currentElement);
}

// Handle element orb click in theme panel
function handleElementOrbClick(element) {
    const currentMode = localStorage.getItem('theme-mode') || 'light';
    applyTheme(currentMode, element);
    updateElementSelection(currentMode, element);
    updateThemeMenuButton(currentMode, element);
}

// Apply theme to document
function applyTheme(mode, element) {
    // Set data attributes
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.setAttribute('data-element', element);
    
    // Update body class
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${mode}-theme`);
    
    // Save to localStorage
    localStorage.setItem('theme-mode', mode);
    localStorage.setItem('theme-element', element);
}

// Update mode toggle switch state
function updateModeToggle(mode) {
    const modeToggle = document.getElementById('mode-toggle-input');
    if (modeToggle) {
        modeToggle.checked = (mode === 'dark');
    }
}

// Update element selection in theme panel
function updateElementSelection(mode, element) {
    // Update mode orbs
    document.querySelectorAll('[data-mode]').forEach(orb => {
        orb.classList.remove('active');
    });
    const activeMode = document.querySelector(`[data-mode="${mode}"]`);
    if (activeMode) {
        activeMode.classList.add('active');
    }
    
    // Update element orbs
    document.querySelectorAll('[data-element]').forEach(orb => {
        orb.classList.remove('active');
    });
    const activeElement = document.querySelector(`[data-element="${element}"]`);
    if (activeElement) {
        activeElement.classList.add('active');
    }
}

// Update theme menu button to show current selection
function updateThemeMenuButton(mode, element) {
    const button = document.getElementById('theme-menu-btn');
    if (!button) return;
    
    // Find the orb inside the button
    let orbElement = button.querySelector('.theme-orb');
    
    // If orb doesn't exist, create it
    if (!orbElement) {
        orbElement = document.createElement('span');
        orbElement.className = 'theme-orb';
        const glow = document.createElement('span');
        glow.className = 'orb-glow';
        orbElement.appendChild(glow);
        button.insertBefore(orbElement, button.firstChild);
    }
    
    // Remove all element classes
    orbElement.classList.remove('metal-orb', 'wood-orb', 'water-orb', 'fire-orb', 'earth-orb', 'light-orb', 'dark-orb');
    
    // Add the current element class
    orbElement.classList.add(`${element}-orb`);
    
    // Update button data attribute
    button.setAttribute('data-element', element);
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeSystem);
} else {
    initThemeSystem();
}
