// ==========================================
// MAIN APP.JS
// Core application initialization and setup
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initTheme();
    initNavigation();
    initSidebar();
    initProfileMenu();
    
    console.log('Trading Signals Studio initialized');
});

// Sidebar collapse/expand functionality
function initSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const navbar = document.querySelector('.navbar');
    const mainContent = document.querySelector('.main-content');
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            navbar.classList.toggle('sidebar-collapsed');
            mainContent.classList.toggle('sidebar-collapsed');
            
            // Save state to localStorage
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });
    }
    
    // Restore sidebar state from localStorage
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        navbar.classList.add('sidebar-collapsed');
        mainContent.classList.add('sidebar-collapsed');
    }
}

// Profile menu dropdown
function initProfileMenu() {
    const profileTrigger = document.querySelector('.profile-trigger');
    const profileDropdown = document.querySelector('.profile-dropdown');
    
    if (profileTrigger && profileDropdown) {
        profileTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            profileDropdown.classList.remove('active');
        });
    }
}

// Navigation active state management
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPage = window.location.hash || '#home';
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Get page from data attribute or href
            const page = this.getAttribute('data-page') || this.getAttribute('href').substring(1);
            
            // Show corresponding content
            showPage(page);
        });
        
        // Set active state based on current hash
        const linkPage = link.getAttribute('data-page') || link.getAttribute('href').substring(1);
        if ('#' + linkPage === currentPage) {
            link.classList.add('active');
            showPage(linkPage);
        }
    });
}

// Show/hide page content
function showPage(pageName) {
    const pages = document.querySelectorAll('.page');
    
    pages.forEach(page => {
        if (page.id === pageName || page.id === pageName + '-page') {
            page.style.display = 'block';
            page.classList.add('active');
        } else {
            page.style.display = 'none';
            page.classList.remove('active');
        }
    });
    
    // Update page title in navbar
    updatePageTitle(pageName);
    
    // Update URL hash
    window.location.hash = pageName;
}

// Update navbar page title
function updatePageTitle(pageName) {
    const navbarTitle = document.querySelector('.navbar-left h1');
    const titles = {
        'home': 'Dashboard',
        'live-signals': 'Live Signals',
        'trade-history': 'Trade History Analyzer',
        'market-news': 'Market News',
        'performance': 'Performance',
        'fx-tools': 'FX Tools',
        'ea-rules': 'EA Rules'
    };
    
    if (navbarTitle && titles[pageName]) {
        navbarTitle.textContent = titles[pageName];
    }
}

// Theme initialization (calls theme.js)
function initTheme() {
    // This will be handled by theme.js
    if (typeof loadTheme === 'function') {
        loadTheme();
    }
}
