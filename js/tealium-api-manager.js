/**
 * Tealium iQ Profiles API v3 Manager
 * Handles authentication, token management, and API interactions
 * 
 * Security: Stores credentials in sessionStorage only (cleared on tab close)
 */

class TealiumAPIManager {
    constructor() {
        this.sessionId = null;
        this.apiHostname = null;
        this.tokenExpiry = null;
        this.profileData = null;
        this.account = null;
        this.profile = null;
        this.environment = null;
        this.useExtension = false;
        this.pendingRequests = {};
        
        // Setup extension listener BEFORE checking
        this.setupExtensionListener();
        
        // Check for extension
        this.checkExtension();
        
        // Restore from sessionStorage if available
        this.restoreFromSession();
        
        // Clear credentials on window unload
        window.addEventListener('beforeunload', () => {
            this.clearSession();
        });
    }
    
    /**
     * Setup listener for extension messages
     */
    setupExtensionListener() {
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            
            if (event.data.type === 'TEALIUM_EXTENSION_AVAILABLE') {
                this.useExtension = true;
                console.log('✅ Tealium Sandbox API Connector detected');
                window.dispatchEvent(new CustomEvent('extensionDetected'));
            }
            
            if (event.data.type === 'TEALIUM_API_RESPONSE') {
                const callback = this.pendingRequests[event.data.requestId];
                if (callback) {
                    callback(event.data.response);
                    delete this.pendingRequests[event.data.requestId];
                }
            }
        });
    }
    
    /**
     * Check if extension is available
     * @returns {Promise<boolean>}
     */
    async checkExtension() {
        window.postMessage({ type: 'TEALIUM_EXTENSION_CHECK' }, '*');
        
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(this.useExtension);
            }, 1000);
        });
    }
    
    /**
     * Generate unique request ID
     * @returns {string}
     */
    generateRequestId() {
        return 'req_' + Math.random().toString(36).substring(2) + Date.now();
    }
    
    /**
     * Authenticate with API key to get bearer token
     * @param {string} apiKey - The Tealium API key
     * @returns {Promise<Object>} Authentication result
     */
    async authenticateWithApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
            return { success: false, error: 'Invalid API key' };
        }
        
        try {
            if (this.useExtension) {
                console.log('🔌 Authenticating via extension');
                return await this.authenticateViaExtension(apiKey);
            } else {
                console.log('⚠️ Extension not detected - API features unavailable');
                return {
                    success: false,
                    error: 'Extension not installed. Please install the Tealium Sandbox API Connector extension.'
                };
            }
        } catch (error) {
            console.error('❌ Authentication error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Authenticate via Chrome extension
     * @param {string} apiKey
     * @returns {Promise<Object>}
     */
    async authenticateViaExtension(apiKey) {
        const requestId = this.generateRequestId();
        
        return new Promise((resolve) => {
            this.pendingRequests[requestId] = (response) => {
                if (response.success) {
                    this.sessionId = response.sessionId;
                    this.apiHostname = response.hostname;
                    this.tokenExpiry = Date.now() + (response.expiresIn * 1000);
                    this.saveToSession();
                    console.log('✅ Authentication successful');
                    console.log('🌐 API Region:', this.apiHostname);
                }
                resolve(response);
            };
            
            window.postMessage({
                type: 'TEALIUM_API_AUTH',
                requestId: requestId,
                apiKey: apiKey
            }, '*');
            
            setTimeout(() => {
                if (this.pendingRequests[requestId]) {
                    delete this.pendingRequests[requestId];
                    resolve({
                        success: false,
                        error: 'Request timeout. Is the extension running?'
                    });
                }
            }, 30000);
        });
    }
    
    /**
     * Legacy authentication method (kept for reference)
     */
    async authenticateViaServer(apiKey) {
        // Server-side authentication (not implemented in extension-only version)
        return {
            success: false,
            error: 'Server-side authentication not available. Please use the Chrome extension.'
        };
    }
    
    /**
     * Check if currently authenticated with valid token
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        if (!this.sessionId || !this.tokenExpiry) {
            return false;
        }
        
        // Check if token is expired
        if (Date.now() >= this.tokenExpiry) {
            console.warn('⚠️ API token has expired');
            this.disconnect();
            return false;
        }
        
        return true;
    }
    
    /**
     * Get profile configuration from API
     * @param {string} account - Tealium account
     * @param {string} profile - Tealium profile
     * @param {string} version - Profile version (optional, defaults to latest)
     * @returns {Promise<Object>} Profile data
     */
    async getProfile(account, profile, version = null) {
        if (!this.isAuthenticated()) {
            return {
                success: false,
                error: 'Not authenticated. Please connect with your API key first.'
            };
        }

        try {
            this.account = account;
            this.profile = profile;
            
            if (this.useExtension) {
                console.log('🔌 Fetching profile via extension');
                return await this.fetchProfileViaExtension(account, profile, version);
            } else {
                return {
                    success: false,
                    error: 'Extension not available'
                };
            }
        } catch (error) {
            console.error('❌ Error fetching profile:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Fetch profile via Chrome extension
     * @param {string} account
     * @param {string} profile  
     * @param {string|null} version
     * @returns {Promise<Object>}
     */
    async fetchProfileViaExtension(account, profile, version) {
        const requestId = this.generateRequestId();
        
        return new Promise((resolve) => {
            this.pendingRequests[requestId] = (response) => {
                if (response.success) {
                    this.profileData = response.data;
                    this.saveToSession();
                    console.log('✅ Profile data fetched successfully');
                }
                resolve(response);
            };
            
            window.postMessage({
                type: 'TEALIUM_API_PROFILE',
                requestId: requestId,
                sessionId: this.sessionId,
                account: account,
                profile: profile,
                version: version
            }, '*');
            
            setTimeout(() => {
                if (this.pendingRequests[requestId]) {
                    delete this.pendingRequests[requestId];
                    resolve({ success: false, error: 'Request timeout' });
                }
            }, 30000);
        });
    }
    
    /**
     * Get tags from cached profile data
     * @returns {Array} Tags array
     */
    getTags() {
        if (!this.profileData || !this.profileData.tags) {
            return [];
        }
        return this.profileData.tags;
    }
    
    /**
     * Get extensions from cached profile data
     * @returns {Array} Extensions array
     */
    getExtensions() {
        if (!this.profileData || !this.profileData.extensions) {
            return [];
        }
        return this.profileData.extensions;
    }
    
    /**
     * Get variables from cached profile data
     * @returns {Array} Variables array
     */
    getVariables() {
        if (!this.profileData || !this.profileData.variables) {
            return [];
        }
        return this.profileData.variables;
    }
    
    /**
     * Get load rules from cached profile data
     * @returns {Array} Load rules array
     */
    getLoadRules() {
        if (!this.profileData || !this.profileData.loadRules) {
            return [];
        }
        return this.profileData.loadRules;
    }
    
    /**
     * Get events from cached profile data
     * @returns {Array} Events array
     */
    getEvents() {
        if (!this.profileData || !this.profileData.events) {
            return [];
        }
        return this.profileData.events;
    }
    
    /**
     * Get profile overview information
     * @returns {Object} Profile overview
     */
    getProfileOverview() {
        if (!this.profileData) {
            return null;
        }
        
        return {
            account: this.profileData.account || this.account,
            profile: this.profileData.profile || this.profile,
            version: this.profileData.version,
            versionTitle: this.profileData.versionTitle,
            minorVersion: this.profileData.minorVersion,
            creation: this.profileData.creation,
            libraryType: this.profileData.libraryType,
            linkedProfiles: this.profileData.linkedProfiles,
            linkedLibraries: this.profileData.linkedLibraries
        };
    }
    
    /**
     * Disconnect and clear all API credentials
     */
    disconnect() {
        console.log('🔌 Disconnecting from Tealium API');
        
        this.sessionId = null;
        this.apiHostname = null;
        this.tokenExpiry = null;
        this.profileData = null;
        this.account = null;
        this.profile = null;
        this.environment = null;
        
        // Clear sessionStorage
        this.clearSession();
    }
    
    /**
     * Save state to sessionStorage
     */
    saveToSession() {
        try {
            const state = {
                sessionId: this.sessionId,
                apiHostname: this.apiHostname,
                tokenExpiry: this.tokenExpiry,
                profileData: this.profileData,
                account: this.account,
                profile: this.profile,
                environment: this.environment
            };
            
            sessionStorage.setItem('tealium_api_state', JSON.stringify(state));
        } catch (error) {
            console.warn('⚠️ Could not save API state to session:', error);
        }
    }
    
    /**
     * Restore state from sessionStorage
     */
    restoreFromSession() {
        try {
            const stateStr = sessionStorage.getItem('tealium_api_state');
            if (!stateStr) {
                return;
            }
            
            const state = JSON.parse(stateStr);
            
            // Only restore if token hasn't expired
            if (state.tokenExpiry && Date.now() < state.tokenExpiry) {
                this.sessionId = state.sessionId;
                this.apiHostname = state.apiHostname;
                this.tokenExpiry = state.tokenExpiry;
                this.profileData = state.profileData;
                this.account = state.account;
                this.profile = state.profile;
                this.environment = state.environment;
                
                console.log('✅ Restored API session from storage');
            } else {
                // Token expired, clear session
                this.clearSession();
            }
        } catch (error) {
            console.warn('⚠️ Could not restore API state from session:', error);
            this.clearSession();
        }
    }
    
    /**
     * Clear sessionStorage
     */
    clearSession() {
        try {
            sessionStorage.removeItem('tealium_api_state');
        } catch (error) {
            console.warn('⚠️ Could not clear API session:', error);
        }
    }
    
    /**
     * Get connection status information
     * @returns {Object} Connection status
     */
    getConnectionStatus() {
        if (!this.isAuthenticated()) {
            return {
                connected: false,
                message: 'Not connected'
            };
        }
        
        const remainingMinutes = Math.floor((this.tokenExpiry - Date.now()) / 1000 / 60);
        
        return {
            connected: true,
            hostname: this.apiHostname,
            expiresIn: remainingMinutes,
            hasProfileData: !!this.profileData,
            account: this.account,
            profile: this.profile
        };
    }
}

// Create global singleton instance
window.tealiumAPI = new TealiumAPIManager();

// Expose for debugging (but never log credentials)
console.log('🔧 Tealium API Manager initialized');

