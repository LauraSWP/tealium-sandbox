/**
 * Sections Configuration for Tealium Sandbox
 * This file automatically manages all sections and their metadata
 */

// Section definitions - add new sections here to automatically include them
const SECTIONS_CONFIG = {
    'configuration': {
        title: 'Configuration',
        subtitle: 'Configure your Tealium account settings',
        icon: 'fas fa-cog',
        file: null, // null means embedded in index.html
        order: 1,
        category: 'setup'
    },
    'profile-inspector': {
        title: 'Profile Inspector',
        subtitle: 'Analyze and debug Tealium profiles',
        icon: 'fas fa-search',
        file: 'sections/profile-inspector.html',
        order: 2,
        category: 'debug'
    },
    'data-layer': {
        title: 'Data Layer',
        subtitle: 'Debug and manage utag_data variables',
        icon: 'fas fa-database',
        file: 'sections/data-layer.html',
        order: 4,
        category: 'debug'
    },
    'events': {
        title: 'Events',
        subtitle: 'Test page views, links, and custom events',
        icon: 'fas fa-bolt',
        file: 'sections/events.html',
        order: 5,
        category: 'testing'
    },
    'help': {
        title: 'Help',
        subtitle: 'Documentation and troubleshooting guide',
        icon: 'fas fa-question-circle',
        file: 'sections/help.html',
        order: 6,
        category: 'docs'
    }
};

/**
 * Auto-discovery system for sections
 * This will try to detect sections that exist but aren't in config
 */
async function discoverSections() {
    const discoveredSections = { ...SECTIONS_CONFIG };
    
    // List of potential section files to check (files not already in SECTIONS_CONFIG)
    const potentialSections = [
        // No additional sections to auto-discover
    ];
    
    for (const file of potentialSections) {
        const sectionName = file.split('/')[1].replace('.html', '');
        
        // Skip if already configured
        if (discoveredSections[sectionName]) continue;
        
        try {
            const response = await fetch(file);
            if (response.ok) {
                const content = await response.text();
                const metadata = extractSectionMetadata(content);
                
                discoveredSections[sectionName] = {
                    title: metadata.title || titleCase(sectionName),
                    subtitle: metadata.subtitle || `${titleCase(sectionName)} section`,
                    icon: metadata.icon || 'fas fa-file',
                    file: file,
                    order: metadata.order || 99,
                    category: metadata.category || 'custom',
                    discovered: true
                };
                
            }
        } catch (error) {
            // File doesn't exist, skip
        }
    }
    
    return discoveredSections;
}

/**
 * Extract metadata from section HTML content
 */
function extractSectionMetadata(content) {
    const metadata = {};
    
    // Try to find metadata in comments
    const metaMatch = content.match(/<!--\s*SECTION_META:\s*({.*?})\s*-->/s);
    if (metaMatch) {
        try {
            return JSON.parse(metaMatch[1]);
        } catch (e) {
            console.warn('Invalid section metadata JSON');
        }
    }
    
    // Fallback: extract from HTML structure
    const titleMatch = content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (titleMatch) {
        metadata.title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
    }
    
    const iconMatch = content.match(/<i[^>]*class="[^"]*fa-([^"\s]+)/);
    if (iconMatch) {
        metadata.icon = `fas fa-${iconMatch[1]}`;
    }
    
    return metadata;
}

/**
 * Generate navigation menu from sections config
 */
function generateNavigationMenu(sections) {
    const sortedSections = Object.entries(sections)
        .filter(([sectionId]) => sectionId !== 'configuration') // Skip configuration since it's already in the main nav
        .sort(([,a], [,b]) => a.order - b.order);
    
    let menuHTML = '';
    
    for (const [sectionId, config] of sortedSections) {
        const isDiscovered = config.discovered ? ' opacity-75' : '';
        const discoveredBadge = config.discovered ? 
            '<span class="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">New</span>' : '';
        
        menuHTML += `
            <a href="#" onclick="showSection('${sectionId}')" class="sidebar-link group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900${isDiscovered}">
                <i class="${config.icon} w-4 h-4 mr-3 text-gray-500"></i>
                ${config.title}${discoveredBadge}
            </a>
        `;
    }
    
    return menuHTML;
}

/**
 * Initialize section management system
 */
async function initializeSections() {
    // Discover all available sections
    const allSections = await discoverSections();
    
    // Generate and update navigation menu
    const menuHTML = generateNavigationMenu(allSections);
    const navigationContainer = document.getElementById('sidebarNav');
    
    if (navigationContainer) {
        navigationContainer.innerHTML = menuHTML;
    } else {
        console.error('❌ Navigation container #sidebarNav not found');
    }
    
    // Store sections config globally
    window.SECTIONS_CONFIG = allSections;
    
    return allSections;
}

/**
 * Load section content from file or embedded content
 */
async function loadSectionContent(sectionName) {
    const config = window.SECTIONS_CONFIG?.[sectionName];
    
    if (!config) {
        console.warn(`Section ${sectionName} not found in config`);
        return null;
    }
    
    // If no file specified, use embedded content
    if (!config.file) {
        return getEmbeddedSectionContent(sectionName);
    }
    
    try {
        const response = await fetch(config.file);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const htmlContent = await response.text();
        
        // Extract content from section wrapper
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const sectionElement = doc.querySelector('.section-content, section, main, .container');
        
        if (sectionElement) {
            return sectionElement.innerHTML;
        } else {
            // Return body content if no wrapper found
            return doc.body.innerHTML;
        }
        
    } catch (error) {
        console.error(`Failed to load section ${sectionName}:`, error);
        
        // Fallback to embedded content
        const fallback = getEmbeddedSectionContent(sectionName);
        if (fallback) {
            return fallback;
        }
        
        // Return error message
        return `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Section Not Available</h3>
                <p class="text-gray-600">Could not load ${config.title} section</p>
                <p class="text-sm text-gray-500 mt-2">Error: ${error.message}</p>
            </div>
        `;
    }
}

/**
 * Initialize section-specific functionality
 */
function initializeSectionFunctionality(sectionName) {
    
    // Section-specific initialization
    const initFunctions = {
        'configuration': () => {
            if (typeof updateSavedProfilesList === 'function') {
                updateSavedProfilesList();
            }
            try {
                const savedSettings = JSON.parse(localStorage.getItem('tealiumSandboxSettings') || '{}');
                Object.keys(savedSettings).forEach(key => {
                    const element = document.getElementById(key);
                    if (element) {
                        element.value = savedSettings[key];
                    }
                });
            } catch (e) {
                console.warn('Could not load saved settings:', e);
            }
        },
        
        'profile-inspector': () => {
            if (typeof initializeProfileInspector === 'function') {
                initializeProfileInspector();
            }
        },
        
        'tags': () => {
            if (typeof initializeTagsSection === 'function') {
                initializeTagsSection();
            }
        },
        
        'data-layer': () => {
            if (typeof initializeDataLayer === 'function') {
                initializeDataLayer();
            }
        },
        
        'events': () => {
            if (typeof initializeEvents === 'function') {
                initializeEvents();
            }
        },
        
        'load-rules': () => {
            if (typeof initializeLoadRules === 'function') {
                initializeLoadRules();
            }
        }
    };
    
    // Call section-specific init function
    const initFunction = initFunctions[sectionName];
    if (initFunction) {
        try {
            initFunction();
        } catch (error) {
            console.error(`Error initializing ${sectionName}:`, error);
        }
    }
    
    // Generic initialization for all sections
    setTimeout(() => {
        // Re-attach event listeners that might have been lost
        attachGlobalEventListeners();
    }, 100);
}

/**
 * Helper functions
 */
function titleCase(str) {
    return str.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    ).replace(/-/g, ' ');
}

function attachGlobalEventListeners() {
    // Attach any global event listeners that need to be re-applied
    // This can be expanded as needed
}

/**
 * Get embedded section content (fallback)
 */
function getEmbeddedSectionContent(sectionName) {
    // This will be populated by the existing getSectionContent function
    if (typeof getSectionContent === 'function') {
        return getSectionContent(sectionName);
    }
    return null;
}

// Export for global access
window.initializeSections = initializeSections;
window.loadSectionContent = loadSectionContent;
window.initializeSectionFunctionality = initializeSectionFunctionality;
window.SECTIONS_CONFIG = SECTIONS_CONFIG;

