// ==========================================
// THEME.JS
// Theme switching functionality (light/dark mode)
// ==========================================

// Load theme from localStorage or default to light
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    // Set toggle switch state
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = (savedTheme === 'dark');
        
        // Add event listener for theme toggle
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            applyTheme(newTheme);
        });
    }
}

// Apply theme to document
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update body class for additional styling if needed
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(theme + '-theme');
}

// Toggle theme programmatically
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    
    // Update toggle switch if it exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = (newTheme === 'dark');
    }
}

// Initialize theme when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTheme);
} else {
    loadTheme();
}
