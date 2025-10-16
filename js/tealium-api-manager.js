/**
 * Tealium iQ Profiles API v3 Manager
 * Handles authentication, token management, and API interactions
 * 
 * Security: Stores credentials in sessionStorage only (cleared on tab close)
 */

class TealiumAPIManager {
    constructor() {
        this.bearerToken = null;
        this.apiHostname = null;
        this.tokenExpiry = null;
        this.profileData = null;
        this.account = null;
        this.profile = null;
        this.environment = null;
        
        // Restore from sessionStorage if available
        this.restoreFromSession();
        
        // Clear credentials on window unload
        window.addEventListener('beforeunload', () => {
            this.clearSession();
        });
    }
    
    /**
     * Authenticate with API key to get bearer token
     * @param {string} apiKey - The Tealium API key
     * @returns {Promise<Object>} Authentication result
     */
    async authenticateWithApiKey(apiKey) {
        if (!apiKey || apiKey.trim() === '') {
            return {
                success: false,
                error: 'API key is required'
            };
        }
        
        try {
            console.log('🔐 Authenticating with Tealium API...');
            
            // Call Tealium authentication endpoint directly
            // Note: This will work in development but may have CORS issues in production
            const response = await fetch('https://api.tealiumiq.com/v3/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: apiKey
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Authentication failed:', response.status, errorText);
                
                if (response.status === 401) {
                    return {
                        success: false,
                        error: 'Invalid API key. Please check your credentials.'
                    };
                } else if (response.status === 429) {
                    return {
                        success: false,
                        error: 'Too many authentication attempts. Please try again later.'
                    };
                } else {
                    return {
                        success: false,
                        error: `Authentication failed: ${response.status} ${response.statusText}`
                    };
                }
            }
            
            const authData = await response.json();
            
            // Extract bearer token and hostname from response
            this.bearerToken = authData.token || authData.access_token || authData.bearer_token;
            this.apiHostname = authData.hostname || authData.region || 'api.tealiumiq.com';
            
            // Set token expiry (typically 1 hour, default to 55 minutes for safety)
            const expiryMinutes = authData.expires_in ? Math.floor(authData.expires_in / 60) - 5 : 55;
            this.tokenExpiry = Date.now() + (expiryMinutes * 60 * 1000);
            
            // Save to sessionStorage
            this.saveToSession();
            
            console.log('✅ Authentication successful');
            console.log('🌐 API Region:', this.apiHostname);
            
            return {
                success: true,
                hostname: this.apiHostname,
                expiresIn: expiryMinutes
            };
            
        } catch (error) {
            console.error('❌ Authentication error:', error);
            return {
                success: false,
                error: `Network error: ${error.message}`
            };
        }
    }
    
    /**
     * Check if currently authenticated with valid token
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        if (!this.bearerToken || !this.tokenExpiry) {
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
            // Store account/profile for future reference
            this.account = account;
            this.profile = profile;
            
            // Build API URL
            let apiUrl = `https://${this.apiHostname}/v3/${account}/${profile}`;
            
            if (version) {
                apiUrl += `/version/${version}`;
            }
            
            console.log('📡 Fetching profile from API:', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.bearerToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    this.disconnect();
                    return {
                        success: false,
                        error: 'Authentication expired. Please reconnect with your API key.',
                        needsReauth: true
                    };
                } else if (response.status === 404) {
                    return {
                        success: false,
                        error: `Profile not found: ${account}/${profile}`
                    };
                } else if (response.status === 423) {
                    return {
                        success: false,
                        error: 'Profile is currently being edited by another user. Please try again in 15 seconds.'
                    };
                } else if (response.status === 429) {
                    return {
                        success: false,
                        error: 'API rate limit exceeded. Please wait before trying again.'
                    };
                }
                
                return {
                    success: false,
                    error: `API error: ${response.status} ${response.statusText}`
                };
            }
            
            const profileData = await response.json();
            
            // Cache the profile data
            this.profileData = profileData;
            this.saveToSession();
            
            console.log('✅ Profile data fetched successfully');
            
            return {
                success: true,
                data: profileData
            };
            
        } catch (error) {
            console.error('❌ Error fetching profile:', error);
            return {
                success: false,
                error: `Network error: ${error.message}`
            };
        }
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
        
        this.bearerToken = null;
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
                bearerToken: this.bearerToken,
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
                this.bearerToken = state.bearerToken;
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

