/**
 * Session Management System for Tealium Sandbox
 * Maintains state across page reloads including profile, data layer, and analysis data
 */

class SessionManager {
    constructor() {
        this.SESSION_KEY = 'tealium-sandbox-session';
        this.isSessionActive = false;
        this.sessionStartTime = null;
        this.sessionId = null;
        this.isInitializing = true; // Flag to prevent saves during initialization
        
        // Initialize session management
        this.initializeSession();
    }

    /**
     * Initialize session management
     */
    initializeSession() {
        // Try to restore existing session
        const existingSession = this.getStoredSession();
        if (existingSession && this.isValidSession(existingSession)) {
            this.restoreSession(existingSession);
        } else {
            this.clearStoredSession();
        }
        
        // Set up auto-save
        this.setupAutoSave();
        
        // Mark initialization as complete after a delay to allow data layer to load
        setTimeout(() => {
            this.isInitializing = false;
        }, 5000); // 5 second delay
    }

    /**
     * Check if a session is valid (not expired, has required data)
     */
    isValidSession(session) {
        if (!session || !session.sessionId) {
            return false;
        }
        
        // Check if session is not older than 24 hours
        const sessionAge = Date.now() - new Date(session.timestamp).getTime();
        const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
        
        if (sessionAge >= MAX_SESSION_AGE) {
            return false;
        }
        
        // Session is valid if it has any useful data
        const hasProfileData = session.profile && session.profile.account && session.profile.profile;
        const hasDataLayer = session.dataLayer && Object.keys(session.dataLayer.currentDataLayer || {}).length > 0;
        const hasAnalysis = session.profileAnalysis;
        
        const isValid = hasProfileData || hasDataLayer || hasAnalysis;
        if (isValid) {
            console.log('✅ Session restored:', session.profile?.account + '/' + session.profile?.profile);
        }
        
        return isValid;
    }

    /**
     * Save current session state
     */
    saveSession() {
        if (!this.isSessionActive) {
            return;
        }
        
        if (this.isInitializing) {
            return;
        }

        const profileData = this.getCurrentProfile();
        const tealiumState = this.getTealiumState();
        
        // Mark profile as loaded if Tealium is currently loaded
        if (profileData && tealiumState.isLoaded) {
            profileData.isLoaded = true;
        }
        
        const dataLayerChanges = this.getUserDataLayerChanges();
        
        const sessionData = {
            sessionId: this.sessionId || this.generateSessionId(),
            timestamp: new Date().toISOString(),
            profile: profileData,
            dataLayer: dataLayerChanges, // Only user-added variables
            tealiumState: tealiumState
        };

        try {
            const sessionDataString = JSON.stringify(sessionData);
            localStorage.setItem(this.SESSION_KEY, sessionDataString);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.warn('⚠️ LocalStorage quota exceeded, attempting to save minimal session data...');
                
                try {
                    // Try saving only profile and user data layer changes
                    const minimalSessionData = {
                        sessionId: sessionData.sessionId,
                        timestamp: sessionData.timestamp,
                        profile: sessionData.profile,
                        dataLayer: sessionData.dataLayer
                    };
                    
                    localStorage.setItem(this.SESSION_KEY, JSON.stringify(minimalSessionData));
                    this.showSessionNotification('Session saved (minimal data)', 'warning');
                } catch (minimalError) {
                    console.error('❌ Failed to save even minimal session data:', minimalError);
                    this.showSessionNotification('Session save failed - storage full', 'error');
                }
            } else {
                console.error('❌ Failed to save session:', error);
                this.showSessionNotification('Session save failed', 'error');
            }
        }
    }

    /**
     * Restore session from stored data
     */
    async restoreSession(sessionData) {
        try {
            this.isSessionActive = true;
            this.sessionStartTime = new Date(sessionData.timestamp);
            this.sessionId = sessionData.sessionId;
            
            // Restore profile configuration
            if (sessionData.profile) {
                await this.restoreProfile(sessionData.profile);
            }
            
                // Restore user data layer changes
                const hasUserVariables = sessionData.dataLayer?.userDataLayer && Object.keys(sessionData.dataLayer.userDataLayer).length > 0;
                
                if (hasUserVariables) {
                    this.restoreUserDataLayerChanges(sessionData.dataLayer.userDataLayer);
                }
            
            // Show session restored notification
            this.showSessionNotification('Session restored! 🔄', 'success');
            
            // Update session display
            setTimeout(() => {
                if (typeof window.updateSessionStatusDisplay === 'function') {
                    window.updateSessionStatusDisplay();
                }
            }, 500);
            
            setTimeout(() => {
                if (typeof window.updateSessionStatusDisplay === 'function') {
                    window.updateSessionStatusDisplay();
                }
            }, 2000);
            
        } catch (error) {
            console.error('❌ Failed to restore session:', error);
            this.clearStoredSession();
        }
    }

    /**
     * Get current profile configuration
     */
    getCurrentProfile() {
        const accountEl = document.getElementById('account');
        const profileEl = document.getElementById('profile');
        const environmentEl = document.getElementById('environment');
        const customEnvEl = document.getElementById('customEnvironment');
        
        if (!accountEl || !profileEl || !environmentEl) {
            // Try fallback elements
            const quickAccountEl = document.getElementById('quickAccount');
            const quickProfileEl = document.getElementById('quickProfile');
            const quickEnvironmentEl = document.getElementById('quickEnvironment');
            
            if (quickAccountEl && quickProfileEl && quickEnvironmentEl) {
                return {
                    account: quickAccountEl.value.trim(),
                    profile: quickProfileEl.value.trim(),
                    environment: quickEnvironmentEl.value,
                    customEnvironment: '',
                    isLoaded: typeof window.utag !== 'undefined' && window.utag.loader
                };
            }
            
            return null;
        }
        
        const env = environmentEl.value === 'custom' ? (customEnvEl?.value.trim() || '') : environmentEl.value;
        
        return {
            account: accountEl.value.trim(),
            profile: profileEl.value.trim(),
            environment: environmentEl.value,
            customEnvironment: customEnvEl?.value.trim() || '',
            actualEnvironment: env,
            isLoaded: typeof window.utag !== 'undefined' && window.utag.loader
        };
    }

    /**
     * Get current data layer state
     */
    getCurrentDataLayer() {
        const dataLayer = typeof window.currentDataLayer !== 'undefined' ? window.currentDataLayer : {};
        const utag_data = typeof window.utag_data !== 'undefined' ? window.utag_data : {};
        
        return {
            currentDataLayer: dataLayer,
            utag_data: utag_data,
            hasChanges: Object.keys(dataLayer).length > 0
        };
    }

    /**
     * Get only user-added data layer changes (exclude defaults)
     */
    getUserDataLayerChanges() {
        // Access the internal object to avoid proxy issues
        const currentDataLayer = typeof window._currentDataLayer !== 'undefined' ? window._currentDataLayer : 
                                 (typeof window.currentDataLayer !== 'undefined' ? window.currentDataLayer : {});
        
        // If currentDataLayer is an array, return empty result to prevent corruption
        if (Array.isArray(currentDataLayer)) {
            return {
                userDataLayer: {},
                hasChanges: false
            };
        }
        
        // Default variables that are typically set by the system/sandbox - don't save these
        const defaultVariables = [
            'page_name', 'page_type', 'page_url', 'site_section', 'environment',
            'dom.referrer', 'dom.pathname', 'dom.query_string', 'dom.hash', 'dom.title', 'dom.url',
            'meta.charset', 'meta.title', 'meta.description', 'meta.keywords',
            'js_page.js_page_name', 'js_page.js_page_title',
            'session_id', 'visitor_id', 'profile_timestamp', 'tealium_profile', 'tealium_account',
            'tealium_environment',
            // Numeric GTM dataLayer event keys (from corrupted processing)
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
        ];
        
        // Get the initial utag_data state to compare against
        const initialUtagData = {
            "page_name": "Tealium Sandbox Home",
            "page_type": "sandbox", 
            "page_url": window.location.href,
            "site_section": "sandbox",
            "environment": "dev"
        };
        
        // Filter function to determine if a variable is user-added
        const isDefaultVariable = (key, value) => {
            // Always filter out these system variables
            if (key.startsWith('cp.utag_main')) return true;
            if (key.startsWith('cp.')) return true; // All cookie/page variables from Tealium
            if (key.startsWith('dom.')) return true;
            if (key.startsWith('meta.')) return true;
            if (key.startsWith('js_page.')) return true;
            if (key.startsWith('ut.')) return true; // Tealium system variables
            if (key.startsWith('tealium_')) return true; // All tealium system variables
            if (key.startsWith('va.')) return true; // Visitor attributes - all system generated
            if (key.startsWith('ls.')) return true; // localStorage variables
            if (key.startsWith('ss.')) return true; // sessionStorage variables
            if (key.startsWith('_c')) return true; // Commerce variables (usually system defaults)
            if (key.startsWith('is_xandr')) return true; // Xandr system variables
            if (key.startsWith('xandr_')) return true; // Xandr system variables
            if (key === 'event') return true; // GTM event variable
            if (key === 'eventTimeout') return true; // GTM variable
            if (key === 'eventCallback') return true; // GTM variable
            if (/^\d+$/.test(key)) return true; // Numeric keys
            if (key.startsWith('gtm.')) return true; // GTM variables
            
            // For standard variables, check if they differ from initial values
            if (key in initialUtagData) {
                // If the value is different from the initial value, it's a user change
                return value === initialUtagData[key];
            }
            
            // Other variables in the default list are considered system variables
            if (defaultVariables.includes(key)) return true;
            
            return false;
        };
        
        // Filter out default variables and only keep user-added ones
        const userChanges = Object.fromEntries(
            Object.entries(currentDataLayer).filter(([key, value]) => {
                // Skip if it's a default variable
                if (isDefaultVariable(key, value)) {
                    return false;
                }
                
                // Skip if it's an empty/null value
                if (value === null || value === undefined || value === '') {
                    return false;
                }
                
                // Keep this variable as it's a user addition
                return true;
            })
        );
        
        return {
            userDataLayer: userChanges,
            hasChanges: Object.keys(userChanges).length > 0
        };
    }

    /**
     * Get profile analysis data
     */
    getProfileAnalysis() {
        return typeof window.profileAnalysis !== 'undefined' ? window.profileAnalysis : null;
    }

    /**
     * Get UI state (current section, settings, etc.)
     */
    getUIState() {
        return {
            currentSection: document.querySelector('.section-content.active')?.id || null,
            debugSettings: {
                debugMode: document.getElementById('quickDebugMode')?.checked || false,
                verboseLogging: document.getElementById('quickVerboseLogging')?.checked || false,
                networkLogging: document.getElementById('quickNetworkLogging')?.checked || false
            }
        };
    }

    /**
     * Get Tealium state information
     */
    getTealiumState() {
        return {
            isLoaded: typeof window.utag !== 'undefined' && window.utag.loader,
            version: window.utag?.loader?.cfg?.v || null,
            loadTime: window.utag?.loader?.cfg?.load_time || null
        };
    }

    /**
     * Restore profile configuration and load Tealium
     */
    async restoreProfile(profileData) {
        // Fill form fields
        const accountEl = document.getElementById('account');
        const profileEl = document.getElementById('profile');
        const environmentEl = document.getElementById('environment');
        const customEnvEl = document.getElementById('customEnvironment');
        
        if (accountEl) accountEl.value = profileData.account || '';
        if (profileEl) profileEl.value = profileData.profile || '';
        if (environmentEl) environmentEl.value = profileData.environment || 'prod';
        if (customEnvEl) customEnvEl.value = profileData.customEnvironment || '';
        
        // Load Tealium if we have valid profile data
        if (profileData.account && profileData.profile) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                if (typeof window.loadTealium === 'function') {
                    window.loadTealium();
                } else {
                    console.error('❌ loadTealium function not available');
                }
            }, 1500);
        }
    }

    /**
     * Restore data layer state
     */
    restoreDataLayer(dataLayerData) {
        if (dataLayerData.currentDataLayer) {
            window.currentDataLayer = { ...dataLayerData.currentDataLayer };
        }
        
        if (dataLayerData.utag_data) {
            window.utag_data = { ...dataLayerData.utag_data };
        }
        
        // Refresh data layer displays if they exist
        setTimeout(() => {
            if (typeof window.updateDataLayerTable === 'function') {
                window.updateDataLayerTable();
            }
            if (typeof window.updateDataLayerEditor === 'function') {
                window.updateDataLayerEditor();
            }
        }, 500);
    }

    /**
     * Restore user data layer changes (only user-added variables)
     */
    restoreUserDataLayerChanges(userDataLayer) {
        console.log('🔄 restoreUserDataLayerChanges called with:', userDataLayer);
        
        if (userDataLayer && Object.keys(userDataLayer).length > 0) {
            console.log(`🔄 Attempting to restore ${Object.keys(userDataLayer).length} user data layer variables:`, userDataLayer);
            
            // Initialize currentDataLayer if it doesn't exist
            if (typeof window.currentDataLayer === 'undefined') {
                console.log('🔄 Initializing window.currentDataLayer');
                window.currentDataLayer = {};
            } else {
                console.log('🔄 window.currentDataLayer already exists:', window.currentDataLayer);
            }
            
            // Restore user-added variables
            Object.assign(window.currentDataLayer, userDataLayer);
            console.log('🔄 After assign to currentDataLayer:', window.currentDataLayer);
            
            // Also update utag_data if it exists
            if (typeof window.utag_data !== 'undefined') {
                console.log('🔄 Updating existing utag_data');
                Object.assign(window.utag_data, userDataLayer);
            } else {
                console.log('🔄 Creating new utag_data');
                // Create utag_data with the default data plus user changes
                window.utag_data = {
                    "page_name": "Tealium Sandbox Home",
                    "page_type": "sandbox", 
                    "page_url": window.location.href,
                    "site_section": "sandbox",
                    "environment": "dev",
                    ...userDataLayer
                };
            }
            console.log('🔄 Final utag_data:', window.utag_data);
            
            // Update live Tealium data if available
            if (typeof window.updateLiveTealiumDataLayer === 'function') {
                console.log('🔄 Calling updateLiveTealiumDataLayer');
                window.updateLiveTealiumDataLayer();
            }

            // Refresh data layer displays multiple times to ensure they update
            const refreshDisplays = () => {
                console.log('🔄 Refreshing displays...');
                if (typeof window.updateDataLayerTable === 'function') {
                    console.log('🔄 Calling updateDataLayerTable');
                    window.updateDataLayerTable();
                }
                if (typeof window.updateDataLayerEditor === 'function') {
                    console.log('🔄 Calling updateDataLayerEditor');
                    window.updateDataLayerEditor();
                }
                if (typeof window.loadCurrentDataLayer === 'function') {
                    console.log('🔄 Calling loadCurrentDataLayer');
                    window.loadCurrentDataLayer();
                }
            };
            
            // Try multiple times with different delays to ensure data layer system is ready
            setTimeout(refreshDisplays, 100);
            setTimeout(refreshDisplays, 500);
            setTimeout(refreshDisplays, 1000);
            setTimeout(refreshDisplays, 2000);

            console.log(`✅ Restored user data layer variables:`, Object.keys(userDataLayer));
            console.log('🔍 Final window.currentDataLayer:', window.currentDataLayer);
            console.log('🔍 Final window.utag_data:', window.utag_data);
        } else {
            console.log('🔄 No user data layer changes to restore');
        }
    }

    /**
     * Restore profile analysis data
     */
    restoreProfileAnalysis(analysisData) {
        window.profileAnalysis = analysisData;
    }

    /**
     * Restore UI state
     */
    restoreUIState(uiState) {
        // Restore debug settings
        if (uiState.debugSettings) {
            const debugMode = document.getElementById('quickDebugMode');
            const verboseLogging = document.getElementById('quickVerboseLogging');
            const networkLogging = document.getElementById('quickNetworkLogging');
            
            if (debugMode) debugMode.checked = uiState.debugSettings.debugMode;
            if (verboseLogging) verboseLogging.checked = uiState.debugSettings.verboseLogging;
            if (networkLogging) networkLogging.checked = uiState.debugSettings.networkLogging;
        }
        
        // Restore section if specified and different from current
        if (uiState.currentSection && typeof window.showSection === 'function') {
            setTimeout(() => {
                window.showSection(uiState.currentSection.replace('section-', ''));
            }, 1500);
        }
    }

    /**
     * Start a new session
     */
    startNewSession() {
        this.isSessionActive = true;
        this.sessionStartTime = new Date();
        this.sessionId = this.generateSessionId();
        this.saveSession();
        
        this.showSessionNotification('Session started! 🚀', 'success');
        
        // Update session display
        setTimeout(() => {
            if (typeof window.updateSessionStatusDisplay === 'function') {
                window.updateSessionStatusDisplay();
            }
        }, 50);
        
        setTimeout(() => {
            if (typeof window.updateSessionStatusDisplay === 'function') {
                window.updateSessionStatusDisplay();
            }
        }, 500);
    }

    /**
     * Restart session (clear all data and start fresh)
     */
    restartSession() {
        console.log('🔄 Restarting session...');
        
        if (confirm('Are you sure you want to restart the session? This will clear all current data and reload the page.')) {
            this.clearStoredSession();
            this.clearCurrentSession();
            
            // Reload page for fresh start
            window.location.reload();
        }
    }

    /**
     * Clear stored session data
     */
    clearStoredSession() {
        try {
            localStorage.removeItem(this.SESSION_KEY);
            console.log('🗑️ Stored session cleared');
        } catch (error) {
            console.error('❌ Failed to clear stored session:', error);
        }
    }

    /**
     * Clean up localStorage by removing old or large items
     */
    cleanupLocalStorage() {
        try {
            const keys = Object.keys(localStorage);
            let totalSize = 0;
            
            // Calculate total localStorage usage
            keys.forEach(key => {
                totalSize += localStorage.getItem(key).length;
            });
            
            console.log(`📊 LocalStorage usage: ${Math.round(totalSize / 1024)}KB`);
            
            // If usage is high, remove non-essential items
            if (totalSize > 3000000) { // > 3MB
                console.log('🧹 Cleaning up localStorage...');
                
                keys.forEach(key => {
                    // Remove old session data or non-essential items
                    if (key.includes('session') && key !== this.SESSION_KEY) {
                        localStorage.removeItem(key);
                        console.log(`🗑️ Removed old session: ${key}`);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Failed to cleanup localStorage:', error);
        }
    }

    /**
     * Clear current session data
     */
    clearCurrentSession() {
        this.isSessionActive = false;
        this.sessionStartTime = null;
        
        // Clear global variables
        if (typeof window.currentDataLayer !== 'undefined') {
            window.currentDataLayer = {};
        }
        if (typeof window.utag_data !== 'undefined') {
            window.utag_data = {};
        }
        if (typeof window.profileAnalysis !== 'undefined') {
            window.profileAnalysis = null;
        }
    }

    /**
     * Get stored session data
     */
    getStoredSession() {
        try {
            const sessionData = localStorage.getItem(this.SESSION_KEY);
            return sessionData ? JSON.parse(sessionData) : null;
        } catch (error) {
            console.error('❌ Failed to get stored session:', error);
            return null;
        }
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Set up automatic session saving
     */
    setupAutoSave() {
        // Save session on page unload
        window.addEventListener('beforeunload', () => {
            if (this.isSessionActive) {
                this.saveSession();
            }
        });

        // Auto-save every 30 seconds if session is active
        setInterval(() => {
            if (this.isSessionActive) {
                // Check if data layer is in a valid state before auto-saving
                const currentDataLayer = typeof window._currentDataLayer !== 'undefined' ? window._currentDataLayer : 
                                         (typeof window.currentDataLayer !== 'undefined' ? window.currentDataLayer : {});
                
                if (Array.isArray(currentDataLayer)) {
                    return; // Skip auto-save if data layer is corrupted
                }
                
                this.saveSession();
            }
        }, 30000);

        // Save session when Tealium loads and detect existing sessions
        window.addEventListener('load', () => {
            // Check for existing Tealium and start session if needed
            setTimeout(() => {
                if (typeof window.utag !== 'undefined' && window.utag.loader && !this.isSessionActive) {
                    this.startNewSession();
                    console.log('🔄 Auto-started session - Tealium already loaded');
                }
            }, 1000);
        });
        
        // Listen for custom events when Tealium loads
        window.addEventListener('tealiumLoaded', () => {
            if (!this.isSessionActive) {
                this.startNewSession();
                console.log('🚀 Started session on Tealium load event');
            }
        });
    }

    /**
     * Show session notification
     */
    showSessionNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type, 3000);
        } else if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log(`SESSION: ${message}`);
        }
    }

    /**
     * Get session info for display
     */
    getSessionInfo() {
        if (!this.isSessionActive) {
            return null;
        }
        
        const startTime = this.sessionStartTime || new Date();
        const duration = Date.now() - startTime.getTime();
        const durationMinutes = Math.floor(duration / 60000);
        
        const profile = this.getCurrentProfile();
        const dataLayer = this.getCurrentDataLayer();
        
        return {
            isActive: this.isSessionActive,
            startTime: startTime.toLocaleTimeString(),
            duration: durationMinutes,
            hasProfile: profile?.account && profile?.profile,
            hasDataLayer: Object.keys(dataLayer.currentDataLayer || {}).length > 0
        };
    }

    /**
     * Check if session has any changes that would be lost
     */
    hasSessionChanges() {
        if (!this.isSessionActive) {
            return false;
        }

        const userDataLayerChanges = this.getUserDataLayerChanges();
        
        // Also check if session has been running for more than 30 seconds (indicating user activity)
        const sessionDuration = Date.now() - (this.sessionStartTime ? this.sessionStartTime.getTime() : Date.now());
        const hasBeenActive = sessionDuration > 30000; // 30 seconds
        
        // Return true if there are data layer changes OR if session has been active for a while
        const hasChanges = userDataLayerChanges.hasChanges || hasBeenActive;
        
        return hasChanges;
    }

    /**
     * Clear all session data completely (for profile changes)
     */
    clearAllSessionData() {
        // Clear data layer completely
        if (typeof window._currentDataLayer !== 'undefined') {
            Object.keys(window._currentDataLayer).forEach(key => delete window._currentDataLayer[key]);
        }
        
        // Clear utag_data
        if (typeof window.utag_data !== 'undefined') {
            Object.keys(window.utag_data).forEach(key => delete window.utag_data[key]);
        }
        
        // Clear localStorage session
        this.clearStoredSession();
        
        // Reset session state
        this.isSessionActive = false;
        this.sessionStartTime = null;
        this.sessionId = null;
        
        // Update UI displays
        setTimeout(() => {
            if (typeof window.updateDataLayerTable === 'function') {
                window.updateDataLayerTable();
            }
            if (typeof window.updateDataLayerEditor === 'function') {
                window.updateDataLayerEditor();
            }
            if (typeof window.updateSessionStatusDisplay === 'function') {
                window.updateSessionStatusDisplay();
            }
        }, 100);
    }

    /**
     * Clear all session changes and reset to fresh state
     */
    clearSessionChanges() {
        // Get current user changes to know what to clear
        const userChanges = this.getUserDataLayerChanges();
        
        if (userChanges.hasChanges) {
            // Remove only user-added variables, keep defaults
            Object.keys(userChanges.userDataLayer).forEach(key => {
                if (typeof window.currentDataLayer !== 'undefined' && key in window.currentDataLayer) {
                    delete window.currentDataLayer[key];
                }
                if (typeof window.utag_data !== 'undefined' && key in window.utag_data) {
                    delete window.utag_data[key];
                }
            });

            // Update live Tealium data
            if (typeof window.updateLiveTealiumDataLayer === 'function') {
                window.updateLiveTealiumDataLayer();
            }

            // Reset data layer displays
            setTimeout(() => {
                if (typeof window.updateDataLayerTable === 'function') {
                    window.updateDataLayerTable();
                }
                if (typeof window.updateDataLayerEditor === 'function') {
                    window.updateDataLayerEditor();
                }
            }, 100);

            console.log(`🧹 Cleared ${Object.keys(userChanges.userDataLayer).length} user data layer variables:`, Object.keys(userChanges.userDataLayer));
        }
        
        // Save the cleared state
        this.saveSession();
        
        this.showSessionNotification('User changes cleared - keeping defaults', 'info');
    }
}

// Create global session manager instance
window.sessionManager = new SessionManager();

// Expose key functions globally
window.restartSession = () => window.sessionManager.restartSession();
window.getSessionInfo = () => window.sessionManager.getSessionInfo();

console.log('✅ Session Manager initialized');
