/**
 * Tealium Sandbox - Modern Dashboard Version
 * Enhanced with Tailwind CSS styling and improved functionality
 */

console.log('🚀 sandbox.js loading...');

// Global state
let settingsOpen = false;

// Initialize when DOM is loaded - but don't automatically show section (handled by index.html)
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize sandbox functionality, not navigation
    setTimeout(() => {
    initializeSandbox();
        // Only update Tealium status if the element exists
        if (document.getElementById('tealiumStatus')) {
    updateTealiumStatus();
        }
    loadSavedSettings();
    }, 500); // Delay to let index.html load first
});

/**
 * Initialize sandbox
 */
function initializeSandbox() {
    console.log('🚀 Tealium Sandbox Initialized');
    
    // Set up environment selector change handler for quick settings
    const envSelect = document.getElementById('quickEnvironment');
    if (envSelect) {
        envSelect.addEventListener('change', function() {
            const customDiv = document.getElementById('quickCustomEnvDiv');
            // Only manipulate customDiv if it exists
            if (customDiv) {
                if (this.value === 'custom') {
                    customDiv.classList.remove('hidden');
                } else {
                    customDiv.classList.add('hidden');
                }
            }
            // Sync to main form when changed
            if (typeof syncToMainForm === 'function') {
                syncToMainForm();
            }
        });
    }
    
    // Set up main environment selector
    const mainEnvSelect = document.getElementById('environment');
    if (mainEnvSelect) {
        mainEnvSelect.addEventListener('change', function() {
            toggleCustomEnvironment();
            // Sync to quick settings when changed
            syncToQuickSettings();
        });
    }
    
    // Set up input sync between forms
    const mainInputs = ['account', 'profile', 'customEnvironment'];
    const quickInputs = ['quickAccount', 'quickProfile', 'quickCustomEnv'];
    
    mainInputs.forEach((id, index) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', syncToQuickSettings);
        }
    });
    
    quickInputs.forEach((id, index) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', syncToMainForm);
        }
    });
    
    // Set up keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+S to save current settings
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            saveCurrentSettings();
        }
        
        // Ctrl+L to load Tealium
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            loadTealium();
        }
        
        // Ctrl+` (backtick) to toggle settings panel
        if (e.ctrlKey && e.key === '`') {
            e.preventDefault();
            if (typeof toggleSettingsPanel === 'function') {
                toggleSettingsPanel();
            }
        }
    });
}

// Note: toggleSettings renamed to avoid conflict with index.html
// Settings panel toggle is now handled by toggleSettingsPanel() in index.html

// Note: showSection function is now handled by index.html
// This file focuses on sandbox functionality only

// Note: updateSectionHeader function is now handled by index.html
// Section navigation is managed by the main layout

/**
 * Load Tealium with modern error handling
 */
function loadTealium() {
    const account = document.getElementById('account').value.trim();
    const profile = document.getElementById('profile').value.trim();
    const environment = document.getElementById('environment').value;
    const customEnv = document.getElementById('customEnvironment').value.trim();
    
    if (!account || !profile) {
        showToast('Please enter account and profile', 'error');
        return;
    }
    
    const env = environment === 'custom' ? customEnv : environment;
    if (!env) {
        showToast('Please select or enter an environment', 'error');
        return;
    }
    
    // Check if we're changing profile/environment and warn about session changes
    console.log('🔍 Checking for session changes...');
    if (typeof window.sessionManager !== 'undefined' && window.sessionManager.isSessionActive) {
        console.log('🔍 Session manager available and active');
        const currentProfile = window.sessionManager.getCurrentProfile();
        console.log('🔍 Current profile:', currentProfile);
        console.log('🔍 New profile:', { account, profile, env });
        
        const isProfileChange = currentProfile && (
            currentProfile.account !== account || 
            currentProfile.profile !== profile ||
            (currentProfile.environment === 'custom' ? currentProfile.customEnvironment : currentProfile.environment) !== env
        );
        
        console.log('🔍 Is profile change:', isProfileChange);
        
        if (isProfileChange) {
            const hasChanges = window.sessionManager.hasSessionChanges();
            console.log('🔍 Has session changes:', hasChanges);
            
            if (hasChanges) {
                const confirmMessage = `⚠️ PROFILE/ENVIRONMENT CHANGE DETECTED\n\n` +
                    `You're about to change from:\n` +
                    `${currentProfile.account}/${currentProfile.profile}/${currentProfile.environment === 'custom' ? currentProfile.customEnvironment : currentProfile.environment}\n\n` +
                    `To:\n${account}/${profile}/${env}\n\n` +
                    `This will CLEAR all your current session changes including:\n` +
                    `• Data layer modifications\n` +
                    `• Profile analysis data\n` +
                    `• Any debugging state\n\n` +
                    `Do you want to continue and load fresh with the new profile?`;
                
                console.log('🔍 Showing confirmation dialog');
                if (!confirm(confirmMessage)) {
                    console.log('🔍 User cancelled profile change');
                    return; // User cancelled
                }
                
                // Clear session before loading new profile
                console.log('🔍 User confirmed, clearing session changes');
                showToast('Clearing session changes...', 'info');
                window.sessionManager.clearSessionChanges();
            }
        }
    } else {
        console.log('🔍 Session manager not available or not active');
    }
    
    // Sync forms before loading
    syncToQuickSettings();
    
    // Remove existing utag script if present
    const existingScript = document.querySelector('script[src*="tags.tiqcdn.com"]');
    if (existingScript) {
        existingScript.remove();
        // Clear utag object
        if (window.utag) {
            window.utag = undefined;
        }
    }
    
    const tealiumUrl = `https://tags.tiqcdn.com/utag/${account}/${profile}/${env}/utag.js`;
    
    showToast('Loading Tealium...', 'info');
    
    // ✨ Start session immediately when user clicks Load Tealium
    if (typeof window.sessionManager !== 'undefined' && !window.sessionManager.isSessionActive) {
        window.sessionManager.startNewSession();
        console.log('🚀 Started session on Load Tealium click');
    }
    
    // Fix protocol issue when opening HTML file directly (file:// protocol)
    // Configure Tealium to always use HTTPS
    if (typeof window.utag_cfg === 'undefined') {
        window.utag_cfg = {};
    }
    
    // Force HTTPS protocol for all Tealium requests
    window.utag_cfg.domain_override = 'https://tags.tiqcdn.com';
    window.utag_cfg.noload = false;
    
    // Create and load script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = tealiumUrl;
    
    script.onload = function() {
        // Comprehensive fix for Tealium tag loading after main utag.js loads
        if (window.utag && window.utag.loader && window.location.protocol === 'file:') {
            console.log('🔧 Applying Tealium post-load fixes for file:// protocol');
            
            // Fix Tealium's internal URL building functions
            const originalAS = window.utag.loader.AS;
            if (originalAS) {
                window.utag.loader.AS = function(a, b, c, d) {
                    const result = originalAS.call(this, a, b, c, d);
                    if (typeof result === 'string' && result.includes('file://tags.tiqcdn.com')) {
                        console.log('🔧 Fixed AS function URL:', result);
                        return result.replace('file://tags.tiqcdn.com', 'https://tags.tiqcdn.com');
                    }
                    return result;
                };
            }
            
            // Fix the main loader function
            const originalLoader = window.utag.loader.loader;
            if (originalLoader) {
                window.utag.loader.loader = function(o) {
                    if (o && o.src && typeof o.src === 'string' && o.src.includes('file://tags.tiqcdn.com')) {
                        console.log('🔧 Fixed loader src:', o.src);
                        o.src = o.src.replace('file://tags.tiqcdn.com', 'https://tags.tiqcdn.com');
                    }
                    return originalLoader.call(this, o);
                };
            }
            
            // Fix the END function that loads tracking pixels and other resources
            const originalEND = window.utag.loader.END;
            if (originalEND) {
                window.utag.loader.END = function(a, b, c) {
                    // Patch any arguments that contain file:// URLs
                    if (typeof a === 'string' && a.includes('file://tags.tiqcdn.com')) {
                        console.log('🔧 Fixed END function URL:', a);
                        a = a.replace('file://tags.tiqcdn.com', 'https://tags.tiqcdn.com');
                    }
                    return originalEND.call(this, a, b, c);
                };
            }
            
            // Fix image loading for tracking pixels
            const originalImage = window.Image;
            if (originalImage) {
                window.Image = function() {
                    const img = new originalImage();
                    const originalSetSrc = Object.getOwnPropertyDescriptor(img.constructor.prototype, 'src')?.set;
                    if (originalSetSrc) {
                        Object.defineProperty(img, 'src', {
                            set: function(value) {
                                if (typeof value === 'string' && value.includes('file://tags.tiqcdn.com')) {
                                    console.log('🔧 Fixed Image src:', value);
                                    value = value.replace('file://tags.tiqcdn.com', 'https://tags.tiqcdn.com');
                                }
                                originalSetSrc.call(this, value);
                            },
                            get: function() {
                                return this.getAttribute('src');
                            }
                        });
                    }
                    return img;
                };
            }
        }
        
        showToast('Tealium loaded successfully!', 'success');
        updateTealiumStatus(true, account, profile, env, tealiumUrl);
        saveCurrentSettings(); // Use enhanced save function
        logEvent('TEALIUM_LOADED', 'Tealium script loaded', { account, profile, env });
        
        // ✨ Trigger custom event for session manager
        window.dispatchEvent(new Event('tealiumLoaded'));
        
        // ✨ Session Management Integration
        if (typeof window.sessionManager !== 'undefined') {
            if (!window.sessionManager.isSessionActive) {
                window.sessionManager.startNewSession();
                console.log('🚀 Started new session after Tealium loaded');
                
                // Force immediate UI update
                setTimeout(() => {
                    if (typeof window.updateSessionStatusDisplay === 'function') {
                        window.updateSessionStatusDisplay();
                        console.log('🔄 Updated session UI after Tealium load');
                    }
                }, 200);
            } else {
                // Save current state since Tealium just loaded
                setTimeout(() => {
                    window.sessionManager.saveSession();
                    console.log('💾 Saved session state after Tealium reload');
                    
                    // Update UI for existing session
                    if (typeof window.updateSessionStatusDisplay === 'function') {
                        window.updateSessionStatusDisplay();
                    }
                }, 1000);
            }
        }
    };
    
    script.onerror = function() {
        showToast('Failed to load Tealium. Check account/profile/environment.', 'error');
        updateTealiumStatus(false);
        logEvent('TEALIUM_ERROR', 'Failed to load Tealium', { account, profile, env, url: tealiumUrl });
    };
    
    document.head.appendChild(script);
    
    logEvent('TEALIUM_LOAD_ATTEMPT', 'Attempting to load Tealium', { account, profile, env, url: tealiumUrl });
}

/**
 * Load Tealium with specific parameters (bypasses form reading)
 */
function loadTealiumWithParams(account, profile, env) {
    if (!account || !profile || !env) {
        showToast('Invalid parameters for Tealium loading', 'error');
        return;
    }
    
    // Sync forms before loading
    syncToQuickSettings();
    
    // Remove existing utag script if present
    const existingScript = document.querySelector('script[src*="tags.tiqcdn.com"]');
    if (existingScript) {
        existingScript.remove();
        // Clear utag object
        if (window.utag) {
            window.utag = undefined;
        }
    }
    
    const tealiumUrl = `https://tags.tiqcdn.com/utag/${account}/${profile}/${env}/utag.js`;
    
    showToast(`Loading Tealium: ${account}/${profile}/${env}`, 'info');
    
    // Start session immediately
    if (typeof window.sessionManager !== 'undefined' && !window.sessionManager.isSessionActive) {
        window.sessionManager.startNewSession();
    }
    
    // Configure Tealium settings
    if (typeof window.utag_cfg === 'undefined') {
        window.utag_cfg = {};
    }
    
    window.utag_cfg.domain_override = 'https://tags.tiqcdn.com';
    window.utag_cfg.noload = false;
    
    // Enable Tealium debugging (utagdb) for detailed tag firing info
    document.cookie = "utagdb=true; path=/";
    window.utag_cfg.debug = true;
    
    // Create and load script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = tealiumUrl;
    
    script.onload = function() {
        // Apply same fixes as main loadTealium function
        if (window.utag && window.utag.loader && window.location.protocol === 'file:') {
            // Fix Tealium's internal URL building functions
            const originalAS = window.utag.loader.AS;
            if (originalAS) {
                window.utag.loader.AS = function(a, b, c, d) {
                    const result = originalAS.call(this, a, b, c, d);
                    if (typeof result === 'string' && result.includes('file://tags.tiqcdn.com')) {
                        return result.replace('file://tags.tiqcdn.com', 'https://tags.tiqcdn.com');
                    }
                    return result;
                };
            }
        }
        
        showToast('Tealium loaded successfully!', 'success');
        updateTealiumStatus(true, account, profile, env, tealiumUrl);
        
        // Trigger session save and UI update
        window.dispatchEvent(new Event('tealiumLoaded'));
        
        if (typeof window.sessionManager !== 'undefined') {
            if (!window.sessionManager.isSessionActive) {
                window.sessionManager.startNewSession();
            } else {
                setTimeout(() => {
                    window.sessionManager.saveSession();
                    if (typeof window.updateSessionStatusDisplay === 'function') {
                        window.updateSessionStatusDisplay();
                    }
                }, 1000);
            }
        }
    };
    
    script.onerror = function() {
        showToast('Failed to load Tealium', 'error');
    };
    
    document.head.appendChild(script);
    
    logEvent('TEALIUM_LOAD_ATTEMPT', 'Attempting to load Tealium with params', { account, profile, env, url: tealiumUrl });
}

/**
 * Quick load from settings panel
 */
function quickLoadTealium() {
    const accountEl = document.getElementById('quickAccount');
    const profileEl = document.getElementById('quickProfile');
    const environmentEl = document.getElementById('quickEnvironment');
    const customEnvEl = document.getElementById('quickCustomEnv');
    
    if (!accountEl || !profileEl || !environmentEl) {
        showToast('Quick settings form not available', 'error');
        return;
    }
    
    const account = accountEl.value.trim();
    const profile = profileEl.value.trim();
    const environment = environmentEl.value;
    const customEnv = customEnvEl ? customEnvEl.value.trim() : '';
    
    if (!account || !profile) {
        showToast('Please enter account and profile in settings', 'error');
        return;
    }
    
    const env = environment === 'custom' ? customEnv : environment;
    if (!env) {
        showToast('Please select or enter an environment', 'error');
        return;
    }
    
    // Check if we're changing profile/environment and warn about session changes
    console.log('🔍 QuickLoad: Checking for session changes...');
    if (typeof window.sessionManager !== 'undefined' && window.sessionManager.isSessionActive) {
        console.log('🔍 QuickLoad: Session manager available and active');
        const currentProfile = window.sessionManager.getCurrentProfile();
        console.log('🔍 QuickLoad: Current profile:', currentProfile);
        console.log('🔍 QuickLoad: New profile:', { account, profile, env });
        
        const isProfileChange = currentProfile && (
            currentProfile.account !== account || 
            currentProfile.profile !== profile ||
            (currentProfile.environment === 'custom' ? currentProfile.customEnvironment : currentProfile.environment) !== env
        );
        
        console.log('🔍 QuickLoad: Is profile change:', isProfileChange);
        
        if (isProfileChange) {
            const hasChanges = window.sessionManager.hasSessionChanges();
            console.log('🔍 QuickLoad: Has session changes:', hasChanges);
            
            if (hasChanges) {
                const confirmMessage = `⚠️ PROFILE/ENVIRONMENT CHANGE DETECTED\n\n` +
                    `You're about to change from:\n` +
                    `${currentProfile.account}/${currentProfile.profile}/${currentProfile.environment === 'custom' ? currentProfile.customEnvironment : currentProfile.environment}\n\n` +
                    `To:\n${account}/${profile}/${env}\n\n` +
                    `This will CLEAR all your current session changes including:\n` +
                    `• Data layer modifications\n` +
                    `• Profile analysis data\n` +
                    `• Any debugging state\n\n` +
                    `Do you want to continue and load fresh with the new profile?`;
                
                console.log('🔍 QuickLoad: Showing confirmation dialog');
                if (!confirm(confirmMessage)) {
                    console.log('🔍 QuickLoad: User cancelled profile change');
                    return; // User cancelled
                }
                
                // Clear session before loading new profile
                console.log('🔍 QuickLoad: User confirmed, clearing session changes');
                showToast('Clearing session changes...', 'info');
                window.sessionManager.clearSessionChanges();
            }
        }
    } else {
        console.log('🔍 QuickLoad: Session manager not available or not active');
    }
    
    // Sync with main form first
    if (typeof syncToMainForm === 'function') {
        syncToMainForm();
    }
    
    // Load Tealium directly with the values from quick settings
    loadTealiumWithParams(account, profile, env);
    
    // Close settings panel  
    if (typeof toggleSettingsPanel === 'function') {
        toggleSettingsPanel();
    } else if (typeof toggleSettings === 'function') {
        toggleSettings();
    }
}

/**
 * Toggle quick custom environment input (for settings panel)
 */
function toggleQuickCustomEnvironment() {
    const select = document.getElementById('quickEnvironment');
    const customDiv = document.getElementById('quickCustomEnvDiv');
    
    if (select && customDiv) {
        if (select.value === 'custom') {
            customDiv.classList.remove('hidden');
        } else {
            customDiv.classList.add('hidden');
        }
    }
}

/**
 * Toggle custom environment input
 */
function toggleCustomEnvironment() {
    const environmentSelect = document.getElementById('environment');
    const customDiv = document.getElementById('customEnvironmentDiv');
    
    // Only proceed if both elements exist
    if (!environmentSelect || !customDiv) {
        console.log('Environment elements not found, skipping toggle');
        return;
    }
    
    if (environmentSelect.value === 'custom') {
        customDiv.classList.remove('hidden');
    } else {
        customDiv.classList.add('hidden');
    }
}

/**
 * Update Tealium status display
 */
function updateTealiumStatus(loaded = false, account = '', profile = '', env = '', url = '') {
    // Update sidebar status if element exists (new layout)
    const statusElement = document.getElementById('tealiumStatus');
    if (statusElement) {
    if (loaded) {
        statusElement.innerHTML = `
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            <span class="text-sm text-gray-600">Loaded & Ready</span>
        `;
    } else {
        statusElement.innerHTML = `
            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
            <span class="text-sm text-gray-600">Not Loaded</span>
        `;
        }
    }
    
    // Update status badge if element exists
    const statusBadge = document.getElementById('tealiumStatusBadge');
    if (statusBadge) {
        if (loaded) {
            statusBadge.className = 'px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full';
            statusBadge.textContent = 'Loaded & Ready';
        } else {
        statusBadge.className = 'px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full';
        statusBadge.textContent = 'Not Loaded';
        }
    }
    
    // Update profile info if elements exist
    const currentProfile = document.getElementById('currentProfile');
    const currentEnv = document.getElementById('currentEnv');
    const loadedUrl = document.getElementById('loadedUrl');
    
    if (currentProfile) {
        currentProfile.textContent = loaded ? `${account}/${profile}` : 'None';
    }
    if (currentEnv) {
        currentEnv.textContent = loaded ? env : 'None';
    }
    if (loadedUrl) {
        loadedUrl.textContent = loaded ? url : 'None';
        loadedUrl.title = loaded ? url : '';
    }
    
    console.log(`Tealium Status Updated: ${loaded ? 'Loaded' : 'Not Loaded'}`);
}

/**
 * Reset form to default values
 */
function resetToDefaults() {
    // Reset main form elements if they exist
    const accountEl = document.getElementById('account');
    const profileEl = document.getElementById('profile');
    const environmentEl = document.getElementById('environment');
    const customEnvEl = document.getElementById('customEnvironment');
    const debugModeEl = document.getElementById('quickDebugMode');
    const verboseEl = document.getElementById('quickVerboseLogging');
    const networkEl = document.getElementById('quickNetworkLogging');
    
    if (accountEl) accountEl.value = 'success-laura-solanes';
    if (profileEl) profileEl.value = 'main';
    if (environmentEl) environmentEl.value = 'prod';
    if (customEnvEl) customEnvEl.value = '';
    if (debugModeEl) debugModeEl.checked = false;
    if (verboseEl) verboseEl.checked = false;
    if (networkEl) networkEl.checked = false;
    
    // Hide custom environment if shown
    if (typeof toggleCustomEnvironment === 'function') {
        toggleCustomEnvironment();
    }
    
    // Sync to quick settings
    if (typeof syncToQuickSettings === 'function') {
        syncToQuickSettings();
    }
    
    showToast('Form reset to default values', 'info');
}

/**
 * Unload Tealium
 */
function unloadTealium() {
    // Remove utag scripts
    const scripts = document.querySelectorAll('script[src*="tiqcdn.com"]');
    scripts.forEach(script => script.remove());
    
    // Clear utag global objects
    if (window.utag) {
        delete window.utag;
    }
    if (window.utag_data) {
        window.utag_data = {
            "page_name": "Tealium Sandbox Home",
            "page_type": "sandbox",
            "page_url": window.location.href,
            "site_section": "sandbox",
            "environment": "dev"
        };
    }
    
    updateTealiumStatus(false);
    showToast('Tealium unloaded successfully', 'success');
}

/**
 * Add load rule
 */
function addLoadRule() {
    const variable = document.getElementById('ruleVariable')?.value;
    const condition = document.getElementById('ruleCondition')?.value;
    const value = document.getElementById('ruleValue')?.value;
    
    if (!variable || !condition || !value) {
        showToast('Please fill in all rule fields', 'warning');
        return;
    }
    
    const rulesContainer = document.getElementById('activeLoadRules');
    if (!rulesContainer) {
        showToast('Load rules container not found', 'error');
        return;
    }
    
    const ruleElement = document.createElement('div');
    ruleElement.className = 'bg-gray-50 rounded p-3 flex items-center justify-between';
    ruleElement.innerHTML = `
        <span class="text-sm">
            <span class="font-medium">${variable}</span> 
            <span class="text-gray-500">${condition}</span> 
            <span class="font-medium">${value}</span>
        </span>
        <button onclick="this.parentElement.remove()" class="text-red-600 hover:text-red-800">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    rulesContainer.appendChild(ruleElement);
    
    // Clear form
    document.getElementById('ruleVariable').value = '';
    document.getElementById('ruleCondition').value = 'equals';
    document.getElementById('ruleValue').value = '';
    
    showToast('Load rule added', 'success');
}

/**
 * Test load rules
 */
function testLoadRules() {
    const rulesContainer = document.getElementById('activeLoadRules');
    if (!rulesContainer || rulesContainer.children.length === 0) {
        showToast('No load rules to test', 'warning');
        return;
    }
    
    showToast('Testing load rules against current data layer...', 'info');
    
    // This would typically test rules against utag_data
    console.log('Testing load rules:', rulesContainer.children.length, 'rules');
    console.log('Current utag_data:', window.utag_data);
    
    setTimeout(() => {
        showToast('Load rules test completed - check console for details', 'success');
    }, 1000);
}

/**
 * Generate TiQ syntax from current rules
 */
function generateTiQSyntax() {
    const rulesContainer = document.getElementById('activeLoadRules');
    if (!rulesContainer || rulesContainer.children.length === 0) {
        showToast('No load rules to generate syntax for', 'warning');
        return;
    }
    
    let syntax = '// Tealium iQ Load Rule Syntax\n';
    syntax += '// Copy this into your Tealium iQ Load Rule conditions\n\n';
    
    Array.from(rulesContainer.children).forEach((rule, index) => {
        const text = rule.querySelector('span').textContent.trim();
        syntax += `// Rule ${index + 1}: ${text}\n`;
    });
    
    // Copy to clipboard if possible
    if (navigator.clipboard) {
        navigator.clipboard.writeText(syntax).then(() => {
            showToast('TiQ syntax copied to clipboard', 'success');
        }).catch(() => {
            console.log('Generated TiQ Syntax:');
            console.log(syntax);
            showToast('TiQ syntax generated - check console', 'info');
        });
    } else {
        console.log('Generated TiQ Syntax:');
        console.log(syntax);
        showToast('TiQ syntax generated - check console', 'info');
    }
}


/**
 * Test utag availability
 */
function testUtag() {
    if (typeof utag !== 'undefined') {
        showToast('✅ utag is available', 'success');
        console.log('utag object:', utag);
        logEvent('UTAG_TEST', 'utag object is available', { utag: typeof utag });
    } else {
        showToast('❌ utag is not available', 'error');
        logEvent('UTAG_TEST', 'utag object is not available');
    }
}

/**
 * Clear/unload Tealium
 */
function clearTealium() {
    const existingScript = document.querySelector('script[src*="tags.tiqcdn.com"]');
    if (existingScript) {
        existingScript.remove();
    }
    
    if (window.utag) {
        window.utag = undefined;
    }
    
    updateTealiumStatus(false);
    showToast('Tealium unloaded', 'info');
    logEvent('TEALIUM_CLEARED', 'Tealium script removed');
}

/**
 * Profile Inspector with CORS workaround
 */
async function inspectProfile() {
    const input = document.getElementById('profileInspectorInput').value.trim();
    if (!input) {
        showToast('Please enter a profile URL or account/profile/environment', 'error');
        return;
    }
    
    let utagUrl;
    if (input.startsWith('http')) {
        utagUrl = input;
    } else {
        const parts = input.split('/');
        if (parts.length !== 3) {
            showToast('Please use format: account/profile/environment', 'error');
            return;
        }
        utagUrl = `https://tags.tiqcdn.com/utag/${parts[0]}/${parts[1]}/${parts[2]}/utag.js`;
    }
    
    const resultsDiv = document.getElementById('profileInspectorResults');
    resultsDiv.innerHTML = `
        <div class="flex items-center space-x-3 text-blue-600">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span>Analyzing profile...</span>
        </div>
    `;
    
    try {
        // Try direct fetch first
        const response = await fetch(utagUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const utagContent = await response.text();
        const analysis = analyzeUtagContent(utagContent);
        
        // Store analysis for potential use by profile inspector
        window.currentProfileAnalysis = analysis;
        displayProfileAnalysis(analysis, utagUrl);
        updateDetectedConfig(analysis);
        
        showToast('Profile analysis complete', 'success');
        
    } catch (error) {
        // CORS error - provide alternative instructions
        if (error.message.includes('CORS') || error.message.includes('blocked')) {
            resultsDiv.innerHTML = `
                <div class="space-y-4">
                    <div class="flex items-start space-x-3 text-amber-600">
                        <i class="fas fa-exclamation-triangle mt-1"></i>
                        <div>
                            <p class="font-medium">CORS Policy Blocked Direct Access</p>
                            <p class="text-sm text-gray-600 mt-1">Browser security prevents direct analysis. Try these alternatives:</p>
                        </div>
                    </div>
                    
                    <div class="bg-blue-50 rounded-lg p-4">
                        <h5 class="font-medium text-blue-900 mb-2">Alternative Methods:</h5>
                        <ol class="text-sm text-blue-800 space-y-2">
                            <li class="flex items-start space-x-2">
                                <span class="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                                <div>
                                    <strong>Manual Copy:</strong> Open 
                                    <a href="${utagUrl}" target="_blank" class="underline hover:text-blue-600">${utagUrl}</a>
                                    in a new tab, copy the content, and paste it in the Manual Analysis section.
                                </div>
                            </li>
                            <li class="flex items-start space-x-2">
                                <span class="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                                <div>
                                    <strong>DevTools:</strong> Load the profile in your site, then inspect the Network tab to view the utag.js content.
                                </div>
                            </li>
                            <li class="flex items-start space-x-2">
                                <span class="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                                <div>
                                    <strong>CORS Proxy:</strong> Use a CORS proxy service (for advanced users) or browser extension to bypass restrictions.
                                </div>
                            </li>
                        </ol>
                    </div>
                    
                    <button onclick="window.open('${utagUrl}', '_blank')" 
                            class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                        <i class="fas fa-external-link-alt mr-2"></i>Open utag.js in New Tab
                    </button>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = `
                <div class="text-red-600">
                    <i class="fas fa-exclamation-circle mr-2"></i>
                    Error analyzing profile: ${error.message}
                </div>
            `;
        }
        
        showToast('Profile inspection blocked by CORS - see alternatives', 'warning');
        logEvent('PROFILE_INSPECTOR_ERROR', 'CORS blocked profile inspection', { url: utagUrl, error: error.message });
    }
}

// inspectCurrentProfile function removed - now handled by dedicated profile-inspector.js

/**
 * Analyze manual utag content
 */
function analyzeManualContent() {
    const content = document.getElementById('manualUtagContent').value.trim();
    if (!content) {
        showToast('Please paste utag.js content first', 'warning');
        return;
    }
    
    try {
        const analysis = analyzeUtagContent(content);
        // Store analysis for potential use by profile inspector
        window.currentProfileAnalysis = analysis;
        displayProfileAnalysis(analysis, 'Manual Analysis');
        updateDetectedConfig(analysis);
        
        showToast('Manual analysis complete', 'success');
        logEvent('MANUAL_ANALYSIS', 'Manual utag content analyzed', { 
            contentLength: content.length,
            variables: analysis.variables.length,
            tags: analysis.tags.length
        });
        
    } catch (error) {
        showToast('Error analyzing content: ' + error.message, 'error');
        logEvent('MANUAL_ANALYSIS_ERROR', 'Manual analysis failed', { error: error.message });
    }
}

/**
 * Analyze utag.js content
 */
function analyzeUtagContent(content) {
    const analysis = {
        variables: [],
        loadRules: [],
        tags: [],
        extensions: [],
        settings: {}
    };
    
    // Extract data layer variables
    const variablePatterns = [
        /utag_data\[["']([^"']+)["']\]/g,
        /b\[["']([^"']+)["']\]/g,
        /data\.([a-zA-Z_][a-zA-Z0-9_]*)/g
    ];
    
    variablePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const variable = match[1];
            if (variable && !analysis.variables.includes(variable)) {
                analysis.variables.push(variable);
            }
        }
    });
    
    // Extract tag information
    const tagRegex = /utag\.sender\[["'](\d+)["']\]/g;
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
        analysis.tags.push(`Tag ${match[1]}`);
    }
    
    // Look for common tag vendors
    const vendors = ['google', 'facebook', 'adobe', 'linkedin', 'twitter', 'pinterest', 'snapchat', 'doubleclick', 'analytics'];
    vendors.forEach(vendor => {
        if (content.toLowerCase().includes(vendor)) {
            const tagName = `${vendor.charAt(0).toUpperCase() + vendor.slice(1)} Tag`;
            if (!analysis.tags.includes(tagName)) {
                analysis.tags.push(tagName);
            }
        }
    });
    
    // Extract extensions
    const extensionRegex = /utag\.cfg\.extend\[(\d+)\]/g;
    while ((match = extensionRegex.exec(content)) !== null) {
        analysis.extensions.push(`Extension ${match[1]}`);
    }
    
    // Extract settings
    analysis.settings.asyncLoad = content.includes('async') || content.includes('defer');
    analysis.settings.bundled = content.includes('utag.cfg.bundle_tags');
    
    const versionMatch = content.match(/utag\.cfg\.v\s*=\s*["']([^"']+)["']/);
    analysis.settings.version = versionMatch ? versionMatch[1] : 'Unknown';
    
    return analysis;
}

/**
 * Display profile analysis results
 */
function displayProfileAnalysis(analysis, source) {
    // Check if we're in the profile inspector section and use the dedicated function
    if (typeof window.inspectCurrentProfile === 'function') {
        // Use the dedicated profile inspector functionality
        console.log('Profile analysis completed:', source, analysis);
        window.inspectCurrentProfile();
        return;
    }
    
    // Fallback: try to find a suitable container or just log the results
    const resultsDiv = document.getElementById('profileInspectorResults') || 
                      document.getElementById('debugOutput') ||
                      document.querySelector('.debug-output');
    
    if (!resultsDiv) {
        console.log('Profile analysis results:', { source, analysis });
        return;
    }
    
    resultsDiv.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center space-x-3 text-green-600">
                <i class="fas fa-check-circle"></i>
                <span class="font-medium">Analysis Complete</span>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4">
                <h5 class="font-medium text-gray-900 mb-3">Profile Summary</h5>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Source:</span>
                        <span class="font-medium">${source}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Variables:</span>
                        <span class="font-medium">${analysis.variables.length}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Tags:</span>
                        <span class="font-medium">${analysis.tags.length}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Extensions:</span>
                        <span class="font-medium">${analysis.extensions.length}</span>
                    </div>
                </div>
            </div>
            
            ${analysis.variables.length > 0 ? `
                <div>
                    <h6 class="font-medium text-gray-900 mb-2">Key Variables Found:</h6>
                    <div class="flex flex-wrap gap-1">
                        ${analysis.variables.slice(0, 10).map(v => 
                            `<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">${v}</span>`
                        ).join('')}
                        ${analysis.variables.length > 10 ? `<span class="text-xs text-gray-500">+${analysis.variables.length - 10} more</span>` : ''}
                    </div>
                </div>
            ` : ''}
            
            ${analysis.tags.length > 0 ? `
                <div>
                    <h6 class="font-medium text-gray-900 mb-2">Detected Tags:</h6>
                    <div class="flex flex-wrap gap-1">
                        ${analysis.tags.map(t => 
                            `<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">${t}</span>`
                        ).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    // Store analysis for import
    window.lastProfileAnalysis = analysis;
}

/**
 * Update detected configuration display
 */
function updateDetectedConfig(analysis) {
    document.getElementById('detectedVariables').innerHTML = 
        analysis.variables.length > 0 ? 
        analysis.variables.map(v => `<code class="bg-blue-100 text-blue-800 px-1 rounded text-xs">${v}</code>`).join(' ') : 
        '<span class="text-gray-500">None detected</span>';
        
    document.getElementById('detectedTags').innerHTML = 
        analysis.tags.length > 0 ? 
        analysis.tags.map(t => `<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">${t}</span>`).join(' ') : 
        '<span class="text-gray-500">None detected</span>';
        
    document.getElementById('detectedLoadRules').innerHTML = 
        '<span class="text-purple-600">Inferred from variable usage patterns</span>';
}

/**
 * Import profile configuration
 */
function importProfileConfig() {
    const analysis = window.lastProfileAnalysis;
    if (!analysis) {
        showToast('Please analyze a profile first', 'warning');
        return;
    }
    
    // Add detected variables to utag_data
    if (analysis.variables.length > 0) {
        analysis.variables.forEach(variable => {
            // Set sample values based on variable name patterns
            if (variable.includes('page')) {
                utag_data[variable] = 'imported_page';
            } else if (variable.includes('customer') || variable.includes('user')) {
                utag_data[variable] = 'imported_user';
            } else if (variable.includes('product')) {
                utag_data[variable] = 'imported_product';
            } else if (variable.includes('order')) {
                utag_data[variable] = 'imported_order';
            } else {
                utag_data[variable] = 'imported_value';
            }
        });
        
        showToast(`Imported ${analysis.variables.length} variables from profile`, 'success');
        logEvent('PROFILE_IMPORT', 'Configuration imported', { 
            variables: analysis.variables.length,
            tags: analysis.tags.length
        });
    } else {
        showToast('No variables found to import', 'info');
    }
}

/**
 * Save settings to localStorage
 */
function saveSettings(account, profile, env) {
    const settings = { account, profile, env };
    localStorage.setItem('tealium-sandbox-settings', JSON.stringify(settings));
}

/**
 * Load saved settings from localStorage
 */
function loadSavedSettings() {
    const saved = localStorage.getItem('tealium-sandbox-settings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            
            // Update main form
            if (settings.account) document.getElementById('account').value = settings.account;
            if (settings.profile) document.getElementById('profile').value = settings.profile;
            if (settings.env) {
                const envSelect = document.getElementById('environment');
                if (['dev', 'qa', 'prod'].includes(settings.env)) {
                    envSelect.value = settings.env;
                } else {
                    envSelect.value = 'custom';
                    document.getElementById('customEnvironment').value = settings.env;
                    toggleCustomEnvironment();
                }
            }
            
            // Update quick settings panel (sync both forms)
            syncToQuickSettings();
            
            // Load debug options
            if (settings.debug) {
                if (settings.debug.debugMode) document.getElementById('quickDebugMode').checked = true;
                if (settings.debug.verboseLogging) document.getElementById('quickVerboseLogging').checked = true;
                if (settings.debug.networkLogging) document.getElementById('quickNetworkLogging').checked = true;
            }
            
        } catch (e) {
            console.log('Failed to load saved settings:', e);
        }
    }
    
    // Load saved profiles list
    loadSavedProfiles();
}

/**
 * Load saved profiles list
 */
function loadSavedProfiles() {
    const savedProfiles = JSON.parse(localStorage.getItem('tealium-sandbox-profiles') || '[]');
    updateSavedProfilesList(savedProfiles);
}

/**
 * Save current settings including debug options
 */
function saveCurrentSettings() {
    const accountEl = document.getElementById('account');
    const profileEl = document.getElementById('profile');
    const environmentEl = document.getElementById('environment');
    const customEnvEl = document.getElementById('customEnvironment');
    
    if (!accountEl || !profileEl || !environmentEl) {
        showToast('Configuration form not available', 'error');
        return;
    }
    
    const account = accountEl.value.trim();
    const profile = profileEl.value.trim();
    const environment = environmentEl.value;
    const customEnv = customEnvEl?.value.trim() || '';
    
    const env = environment === 'custom' ? customEnv : environment;
    
    if (!account || !profile || !env) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    const settings = {
        account,
        profile,
        env,
        debug: {
            debugMode: document.getElementById('quickDebugMode')?.checked || false,
            verboseLogging: document.getElementById('quickVerboseLogging')?.checked || false,
            networkLogging: document.getElementById('quickNetworkLogging')?.checked || false
        },
        timestamp: new Date().toISOString()
    };
    
    // Save current settings
    localStorage.setItem('tealium-sandbox-settings', JSON.stringify(settings));
    
    // Add to saved profiles list (avoid duplicates)
    const savedProfiles = JSON.parse(localStorage.getItem('tealium-sandbox-profiles') || '[]');
    const profileKey = `${account}/${profile}/${env}`;
    
    // Remove if exists and add to beginning
    const filtered = savedProfiles.filter(p => `${p.account}/${p.profile}/${p.env}` !== profileKey);
    filtered.unshift(settings);
    
    // Keep only last 10 profiles
    const limited = filtered.slice(0, 10);
    localStorage.setItem('tealium-sandbox-profiles', JSON.stringify(limited));
    
    updateSavedProfilesList(limited);
    showToast('Settings saved', 'success');
}

/**
 * Sync main form to quick settings panel
 */
function syncToQuickSettings() {
    // Get main form elements
    const accountEl = document.getElementById('account');
    const profileEl = document.getElementById('profile');
    const environmentEl = document.getElementById('environment');
    const customEnvEl = document.getElementById('customEnvironment');
    
    // Get quick settings elements
    const quickAccountEl = document.getElementById('quickAccount');
    const quickProfileEl = document.getElementById('quickProfile');
    const quickEnvironmentEl = document.getElementById('quickEnvironment');
    const quickCustomEnvEl = document.getElementById('quickCustomEnv');
    const customEnvDivEl = document.getElementById('customEnvDiv');
    
    // Only sync if main form elements exist
    if (!accountEl || !profileEl || !environmentEl) {
        console.log('Main form elements not found, skipping sync to quick settings');
        return;
    }
    
    const account = accountEl.value;
    const profile = profileEl.value;
    const environment = environmentEl.value;
    const customEnv = customEnvEl?.value || '';
    
    // Update quick settings if they exist
    if (quickAccountEl) quickAccountEl.value = account;
    if (quickProfileEl) quickProfileEl.value = profile;
    if (quickEnvironmentEl) quickEnvironmentEl.value = environment;
    
    if (environment === 'custom') {
        if (quickCustomEnvEl) quickCustomEnvEl.value = customEnv;
        if (customEnvDivEl) customEnvDivEl.classList.remove('hidden');
    } else {
        if (customEnvDivEl) customEnvDivEl.classList.add('hidden');
    }
}

/**
 * Sync quick settings to main form
 */
function syncToMainForm() {
    const quickAccount = document.getElementById('quickAccount');
    const quickProfile = document.getElementById('quickProfile');
    const quickEnvironment = document.getElementById('quickEnvironment');
    const quickCustomEnv = document.getElementById('quickCustomEnv');
    
    // Check if quick settings elements exist
    if (!quickAccount || !quickProfile || !quickEnvironment) {
        return;
    }
    
    const account = quickAccount.value;
    const profile = quickProfile.value;
    const environment = quickEnvironment.value;
    const customEnv = quickCustomEnv ? quickCustomEnv.value : '';
    
    // Check if main form elements exist before setting values
    const mainAccount = document.getElementById('account');
    const mainProfile = document.getElementById('profile');
    const mainEnvironment = document.getElementById('environment');
    const mainCustomEnv = document.getElementById('customEnvironment');
    
    if (mainAccount) mainAccount.value = account;
    if (mainProfile) mainProfile.value = profile;
    if (mainEnvironment) mainEnvironment.value = environment;
    
    if (environment === 'custom' && mainCustomEnv) {
        mainCustomEnv.value = customEnv;
        if (typeof toggleCustomEnvironment === 'function') {
            toggleCustomEnvironment();
        }
    }
}

/**
 * Clear all data
 */
function clearAllData() {
    if (confirm('Clear all sandbox data including settings and custom functions?')) {
        localStorage.removeItem('tealium-sandbox-settings');
        utag_data = {
            "page_name": "Tealium Sandbox Home",
            "page_type": "sandbox",
            "page_url": window.location.href,
            "site_section": "sandbox",
            "environment": "dev"
        };
        
        // Clear form inputs
        ['account', 'profile', 'customEnvironment'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        
        document.getElementById('environment').value = 'dev';
        toggleCustomEnvironment();
        
        clearTealium();
        showToast('All data cleared', 'info');
        logEvent('DATA_CLEARED', 'All sandbox data cleared');
    }
}

/**
 * Export configuration
 */
function exportConfig() {
    const config = {
        timestamp: new Date().toISOString(),
        utag_data: utag_data,
        settings: JSON.parse(localStorage.getItem('tealium-sandbox-settings') || '{}'),
        profile_analysis: window.lastProfileAnalysis || null
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tealium-sandbox-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Configuration exported', 'success');
    logEvent('CONFIG_EXPORTED', 'Configuration exported to file');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Use the new notification system from index.html if available
    if (typeof showNotification === 'function') {
        showNotification(message, type);
        return;
    }
    
    // Fallback to console if no notification system
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Try to find toast container, but don't error if missing
    const container = document.getElementById('toastContainer');
    if (!container) {
        return;
    }
    
    const toast = document.createElement('div');
    const bgColors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.className = `${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-64 transform translate-x-full transition-transform duration-300`;
    toast.innerHTML = `
        <i class="${icons[type]}"></i>
        <span class="flex-1">${message}</span>
        <button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }
    }, 5000);
}

/**
 * Log events for debugging
 */
function logEvent(type, message, data = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: type,
        message: message,
        data: data
    };
    
    console.log(`[TEALIUM SANDBOX] ${type}:`, message, data);
    
    // Store in session for debug purposes
    const logs = JSON.parse(sessionStorage.getItem('tealium-sandbox-logs') || '[]');
    logs.push(logEntry);
    
    // Keep only last 100 logs
    if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
    }
    
    sessionStorage.setItem('tealium-sandbox-logs', JSON.stringify(logs));
}

/**
 * Update saved profiles list in the UI
 */
function updateSavedProfilesList(profiles) {
    updateProfileContainer('savedProfilesList', profiles, 5); // Quick settings (5 profiles)
    updateProfileContainer('mainSavedProfilesList', profiles, 10); // Main view (10 profiles)
    
    // Log for console access
    console.log('Saved profiles available:', profiles.length);
    profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.account}/${profile.profile}/${profile.env} (${new Date(profile.timestamp).toLocaleDateString()})`);
    });
}

/**
 * Update a specific profile container
 */
function updateProfileContainer(containerId, profiles, maxProfiles) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (profiles.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">No saved profiles yet</p>';
        return;
    }
    
    const isMainContainer = containerId === 'mainSavedProfilesList';
    const profilesToShow = profiles.slice(0, maxProfiles);
    
    const profilesHTML = profilesToShow.map((profile, index) => {
        const date = new Date(profile.timestamp).toLocaleDateString();
        const time = new Date(profile.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const profileName = `${profile.account}/${profile.profile}/${profile.env}`;
        
        return `
            <div class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 cursor-pointer transition-colors group border border-transparent hover:border-gray-200"
                 onclick="loadSavedProfileByIndex(${index})">
                <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-gray-900 truncate">${profileName}</div>
                        <div class="text-xs text-gray-500">${date} ${isMainContainer ? 'at ' + time : ''}</div>
                        ${isMainContainer && profile.debug && (profile.debug.debugMode || profile.debug.verboseLogging || profile.debug.networkLogging) ? 
                            `<div class="flex items-center mt-1">
                                <i class="fas fa-bug text-xs text-blue-500 mr-1"></i>
                                <span class="text-xs text-blue-600">Debug enabled</span>
                            </div>` : ''}
                    </div>
                    <div class="flex items-center space-x-2">
                        ${isMainContainer ? `
                            <button onclick="event.stopPropagation(); deleteSavedProfile(${index})" 
                                    class="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all">
                                <i class="fas fa-trash text-xs"></i>
                            </button>
                        ` : ''}
                        <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                            <i class="fas fa-chevron-right text-gray-400 text-xs"></i>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = profilesHTML;
}

/**
 * Load saved profile by index (for UI clicks)
 */
function loadSavedProfileByIndex(index) {
    const savedProfiles = JSON.parse(localStorage.getItem('tealium-sandbox-profiles') || '[]');
    const profile = savedProfiles[index];
    if (profile) {
        loadSavedProfile(profile);
    }
}

/**
 * Load saved profile
 */
function loadSavedProfile(profile) {
    // Load into main form if elements exist
    const accountEl = document.getElementById('account');
    const profileEl = document.getElementById('profile');
    const environmentEl = document.getElementById('environment');
    const customEnvEl = document.getElementById('customEnvironment');
    
    if (accountEl) accountEl.value = profile.account;
    if (profileEl) profileEl.value = profile.profile;
    
    if (environmentEl) {
    if (['dev', 'qa', 'prod'].includes(profile.env)) {
            environmentEl.value = profile.env;
            if (typeof toggleCustomEnvironment === 'function') {
        toggleCustomEnvironment();
            }
    } else {
            environmentEl.value = 'custom';
            if (customEnvEl) customEnvEl.value = profile.env;
            if (typeof toggleCustomEnvironment === 'function') {
        toggleCustomEnvironment();
            }
        }
    }
    
    // Load debug options if elements exist
    if (profile.debug) {
        const debugModeEl = document.getElementById('quickDebugMode');
        const verboseEl = document.getElementById('quickVerboseLogging');
        const networkEl = document.getElementById('quickNetworkLogging');
        
        if (debugModeEl) debugModeEl.checked = profile.debug.debugMode || false;
        if (verboseEl) verboseEl.checked = profile.debug.verboseLogging || false;
        if (networkEl) networkEl.checked = profile.debug.networkLogging || false;
    }
    
    // Sync to quick settings if function exists
    if (typeof syncToQuickSettings === 'function') {
    syncToQuickSettings();
    }
    
    showToast(`Loaded profile: ${profile.account}/${profile.profile}/${profile.env}`, 'success');
}

/**
 * Delete a specific saved profile
 */
function deleteSavedProfile(index) {
    const savedProfiles = JSON.parse(localStorage.getItem('tealium-sandbox-profiles') || '[]');
    const profile = savedProfiles[index];
    
    if (!profile) return;
    
    if (confirm(`Delete saved profile "${profile.account}/${profile.profile}/${profile.env}"?`)) {
        savedProfiles.splice(index, 1);
        localStorage.setItem('tealium-sandbox-profiles', JSON.stringify(savedProfiles));
        updateSavedProfilesList(savedProfiles);
        showToast('Profile deleted', 'info');
    }
}

/**
 * Clear all saved profiles
 */
function clearSavedProfiles() {
    const savedProfiles = JSON.parse(localStorage.getItem('tealium-sandbox-profiles') || '[]');
    
    if (savedProfiles.length === 0) {
        showToast('No profiles to clear', 'info');
        return;
    }
    
    if (confirm(`Delete all ${savedProfiles.length} saved profiles? This cannot be undone.`)) {
        localStorage.removeItem('tealium-sandbox-profiles');
        updateSavedProfilesList([]);
        showToast('All profiles cleared', 'info');
    }
}

/**
 * Export saved profiles to JSON file
 */
function exportSavedProfiles() {
    const savedProfiles = JSON.parse(localStorage.getItem('tealium-sandbox-profiles') || '[]');
    
    if (savedProfiles.length === 0) {
        showToast('No profiles to export', 'warning');
        return;
    }
    
    const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        profiles: savedProfiles
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tealium-sandbox-profiles-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`Exported ${savedProfiles.length} profiles`, 'success');
    logEvent('PROFILES_EXPORTED', 'Saved profiles exported', { count: savedProfiles.length });
}

/**
 * Import saved profiles from JSON file
 */
function importSavedProfiles(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Validate import data structure
            if (!importData.profiles || !Array.isArray(importData.profiles)) {
                throw new Error('Invalid file format: missing profiles array');
            }
            
            // Validate each profile has required fields
            const validProfiles = importData.profiles.filter(profile => {
                return profile.account && profile.profile && profile.env;
            });
            
            if (validProfiles.length === 0) {
                throw new Error('No valid profiles found in file');
            }
            
            // Get existing profiles
            const existingProfiles = JSON.parse(localStorage.getItem('tealium-sandbox-profiles') || '[]');
            
            // Merge profiles (avoid duplicates)
            const mergedProfiles = [...existingProfiles];
            let addedCount = 0;
            
            validProfiles.forEach(newProfile => {
                const profileKey = `${newProfile.account}/${newProfile.profile}/${newProfile.env}`;
                const exists = mergedProfiles.some(existing => 
                    `${existing.account}/${existing.profile}/${existing.env}` === profileKey
                );
                
                if (!exists) {
                    // Add timestamp if missing
                    if (!newProfile.timestamp) {
                        newProfile.timestamp = new Date().toISOString();
                    }
                    mergedProfiles.unshift(newProfile);
                    addedCount++;
                }
            });
            
            // Keep only last 20 profiles
            const limitedProfiles = mergedProfiles.slice(0, 20);
            
            // Save merged profiles
            localStorage.setItem('tealium-sandbox-profiles', JSON.stringify(limitedProfiles));
            updateSavedProfilesList(limitedProfiles);
            
            if (addedCount > 0) {
                showToast(`Imported ${addedCount} new profiles (${validProfiles.length - addedCount} duplicates skipped)`, 'success');
            } else {
                showToast('All profiles already exist - no new profiles imported', 'info');
            }
            
            logEvent('PROFILES_IMPORTED', 'Saved profiles imported', { 
                added: addedCount, 
                total: validProfiles.length,
                duplicatesSkipped: validProfiles.length - addedCount
            });
            
        } catch (error) {
            showToast('Import failed: ' + error.message, 'error');
            logEvent('PROFILES_IMPORT_ERROR', 'Profile import failed', { error: error.message });
        }
        
        // Clear the file input
        event.target.value = '';
    };
    
    reader.readAsText(file);
}

// Make functions available globally for inline event handlers
window.toggleCustomEnvironment = toggleCustomEnvironment;
window.toggleQuickCustomEnvironment = toggleQuickCustomEnvironment;
window.saveCurrentSettings = saveCurrentSettings;
window.loadTealium = loadTealium;
window.quickLoadTealium = quickLoadTealium;
window.loadSavedProfile = loadSavedProfile;
window.loadSavedProfileByIndex = loadSavedProfileByIndex;
// toggleSettings is now toggleSettingsPanel and defined in index.html
window.testUtag = testUtag;
window.clearTealium = clearTealium;
window.inspectProfile = inspectProfile;
// window.inspectCurrentProfile now handled by profile-inspector.js
window.analyzeManualContent = analyzeManualContent;
window.importProfileConfig = importProfileConfig;
window.clearAllData = clearAllData;
window.exportConfig = exportConfig;
window.deleteSavedProfile = deleteSavedProfile;
window.clearSavedProfiles = clearSavedProfiles;
window.exportSavedProfiles = exportSavedProfiles;
window.importSavedProfiles = importSavedProfiles;

// Also available as tealiumSandbox object
window.tealiumSandbox = {
    loadTealium,
    quickLoadTealium,
    toggleCustomEnvironment,
    testUtag,
    clearTealium,
    inspectProfile,
    // inspectCurrentProfile now in profile-inspector.js
    analyzeManualContent,
    importProfileConfig,
    clearAllData,
    exportConfig,
    showToast,
    logEvent,
    saveCurrentSettings,
    loadSavedProfile,
    syncToQuickSettings,
    syncToMainForm
};

// ========================================
// GLOBAL FUNCTION EXPOSURE
// ========================================
// Expose all functions globally when sandbox.js loads
if (typeof window !== 'undefined') {
    // Core Tealium functions
    window.loadTealium = loadTealium;
    window.loadTealiumWithParams = loadTealiumWithParams;
    window.quickLoadTealium = quickLoadTealium;
    window.unloadTealium = unloadTealium;
    window.testUtag = testUtag;
    
    // Settings and profile management
    window.saveCurrentSettings = saveCurrentSettings;
    window.resetToDefaults = resetToDefaults;
    window.loadSavedProfile = loadSavedProfile;
    window.loadSavedProfileByIndex = loadSavedProfileByIndex;
    window.updateSavedProfilesList = updateSavedProfilesList;
    
    // Profile import/export
    window.exportSavedProfiles = exportSavedProfiles;
    window.importSavedProfiles = importSavedProfiles;
    window.clearSavedProfiles = clearSavedProfiles;
    
    // Form synchronization
    window.syncToQuickSettings = syncToQuickSettings;
    window.syncToMainForm = syncToMainForm;
    window.toggleCustomEnvironment = toggleCustomEnvironment;
    
    // Load rules
    window.addLoadRule = addLoadRule;
    window.testLoadRules = testLoadRules;
    window.generateTiQSyntax = generateTiQSyntax;
    
    // UI utilities
    window.updateTealiumStatus = updateTealiumStatus;
    window.showToast = showToast;
    
}

// Expose critical functions immediately so they're available
window.initializeSandbox = initializeSandbox;
window.quickLoadTealium = quickLoadTealium;
window.loadTealium = loadTealium;
window.loadTealiumWithParams = loadTealiumWithParams;
window.syncToMainForm = syncToMainForm;
