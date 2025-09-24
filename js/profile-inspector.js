/**
 * Enhanced Profile Inspector for Tealium Sandbox
 * Advanced troubleshooting and analysis capabilities
 */

// Global state for monitoring
let profileInspectorState = {
    isMonitoring: false,
    monitoringInterval: null,
    networkRequests: [],
    tagExecutions: [],
    dataLayerHistory: [],
    performanceMetrics: {
        startTime: null,
        loadTime: null,
        tagCount: 0,
        eventCount: 0
    }
};

/**
 * Initialize Profile Inspector
 */
function initializeProfileInspector() {
    console.log('🔍 Initializing Profile Inspector');
    
    // Set up monitoring capabilities
    setupNetworkMonitoring();
    setupDataLayerMonitoring();
    setupPerformanceMonitoring();
    
    // Initialize UI
    updateMonitoringStatus();
}

/**
 * Inspect the currently loaded profile
 */
function inspectCurrentProfile() {
    const account = getCurrentAccount();
    const profile = getCurrentProfile();
    const environment = getCurrentEnvironment();
    
    if (!account || !profile || !environment) {
        showNotification('Please load a Tealium profile first', 'warning');
        return;
    }
    
    showNotification('Inspecting current profile...', 'info');
    
    // Analyze current utag configuration
    analyzeCurrentUtag();
    
    // Update profile overview
    updateProfileOverview({
        account,
        profile,
        environment,
        timestamp: new Date().toISOString()
    });
}

/**
 * Inspect a profile by URL or path
 */
async function inspectProfile() {
    const input = document.getElementById('profileInspectorInput').value.trim();
    
    if (!input) {
        showNotification('Please enter a profile URL or path', 'warning');
        return;
    }
    
    showNotification('Analyzing profile...', 'info');
    
    try {
        // Parse input to determine if it's a URL or path
        let profileUrl;
        if (input.startsWith('http')) {
            profileUrl = input;
        } else {
            // Assume it's account/profile/env format
            const parts = input.split('/');
            if (parts.length >= 3) {
                profileUrl = `https://tags.tiqcdn.com/utag/${parts[0]}/${parts[1]}/${parts[2]}/utag.js`;
            } else {
                throw new Error('Invalid format. Use: account/profile/env or full URL');
            }
        }
        
        // Attempt to fetch and analyze
        await fetchAndAnalyzeProfile(profileUrl);
        
    } catch (error) {
        console.error('Profile inspection error:', error);
        showNotification(`Inspection failed: ${error.message}`, 'error');
        
        // Suggest workarounds
        showCORSHelp();
    }
}

/**
 * Inspect with proxy (for CORS issues)
 */
async function inspectWithProxy() {
    const input = document.getElementById('profileInspectorInput').value.trim();
    
    if (!input) {
        showNotification('Please enter a profile URL or path', 'warning');
        return;
    }
    
    showNotification('Using proxy for analysis...', 'info');
    
    try {
        // Use a CORS proxy service
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        let targetUrl;
        
        if (input.startsWith('http')) {
            targetUrl = input;
        } else {
            const parts = input.split('/');
            if (parts.length >= 3) {
                targetUrl = `https://tags.tiqcdn.com/utag/${parts[0]}/${parts[1]}/${parts[2]}/utag.js`;
            } else {
                throw new Error('Invalid format. Use: account/profile/env or full URL');
            }
        }
        
        const response = await fetch(proxyUrl + targetUrl);
        const content = await response.text();
        
        analyzeUtagContent(content, targetUrl);
        
    } catch (error) {
        console.error('Proxy inspection error:', error);
        showNotification(`Proxy inspection failed: ${error.message}`, 'error');
    }
}

/**
 * Analyze manual utag content
 */
function analyzeManualContent() {
    const content = document.getElementById('manualUtagContent').value.trim();
    
    if (!content) {
        showNotification('Please paste utag.js content', 'warning');
        return;
    }
    
    showNotification('Analyzing content...', 'info');
    
    try {
        analyzeUtagContent(content, 'manual');
        showNotification('Analysis complete!', 'success');
    } catch (error) {
        console.error('Manual analysis error:', error);
        showNotification(`Analysis failed: ${error.message}`, 'error');
    }
}

/**
 * Fetch and analyze profile from URL
 */
async function fetchAndAnalyzeProfile(url) {
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const content = await response.text();
        analyzeUtagContent(content, url);
        
        showNotification('Profile analysis complete!', 'success');
        
    } catch (error) {
        if (error.message.includes('CORS')) {
            throw new Error('CORS policy blocks this request. Try the proxy option or manual analysis.');
        }
        throw error;
    }
}

/**
 * Analyze utag.js content
 */
function analyzeUtagContent(content, source) {
    const analysis = {
        source,
        timestamp: new Date().toISOString(),
        variables: extractVariables(content),
        tags: extractTags(content),
        extensions: extractExtensions(content),
        loadRules: extractLoadRules(content),
        configuration: extractConfiguration(content)
    };
    
    // Update UI with analysis results
    updateConfigurationTab(analysis);
    updateTagsVariablesTab(analysis);
    updateLoadRulesTab(analysis);
    updateExtensionsTab(analysis);
    
    // Store analysis for export
    profileInspectorState.lastAnalysis = analysis;
    
    console.log('📊 Profile Analysis:', analysis);
}

/**
 * Extract variables from utag content
 */
function extractVariables(content) {
    const variables = [];
    
    try {
        // Look for utag_data assignments and variable definitions
        const dataLayerMatches = content.match(/utag_data\s*=\s*{[^}]*}/g) || [];
        const varMatches = content.match(/b\["[^"]+"\]/g) || [];
        const mapMatches = content.match(/utag\.data\.\w+/g) || [];
        
        // Extract from different patterns
        dataLayerMatches.forEach(match => {
            const keys = match.match(/"([^"]+)"/g) || [];
            keys.forEach(key => {
                const cleanKey = key.replace(/"/g, '');
                if (!variables.includes(cleanKey)) {
                    variables.push(cleanKey);
                }
            });
        });
        
        varMatches.forEach(match => {
            const key = match.match(/b\["([^"]+)"\]/);
            if (key && key[1] && !variables.includes(key[1])) {
                variables.push(key[1]);
            }
        });
        
        mapMatches.forEach(match => {
            const key = match.replace('utag.data.', '');
            if (!variables.includes(key)) {
                variables.push(key);
            }
        });
        
    } catch (error) {
        console.error('Variable extraction error:', error);
    }
    
    return variables.sort();
}

/**
 * Extract tags from utag content
 */
function extractTags(content) {
    const tags = [];
    
    try {
        // Look for tag configurations
        const tagMatches = content.match(/utag\.sender\[\d+\]/g) || [];
        const idMatches = content.match(/id:\s*["'](\d+)["']/g) || [];
        const nameMatches = content.match(/name:\s*["']([^"']+)["']/g) || [];
        
        // Extract tag IDs
        const tagIds = new Set();
        idMatches.forEach(match => {
            const id = match.match(/id:\s*["'](\d+)["']/);
            if (id && id[1]) {
                tagIds.add(id[1]);
            }
        });
        
        // Extract tag names
        const tagNames = new Set();
        nameMatches.forEach(match => {
            const name = match.match(/name:\s*["']([^"']+)["']/);
            if (name && name[1]) {
                tagNames.add(name[1]);
            }
        });
        
        // Combine information
        Array.from(tagIds).forEach((id, index) => {
            const name = Array.from(tagNames)[index] || `Tag ${id}`;
            tags.push({
                id,
                name,
                type: detectTagType(content, id)
            });
        });
        
    } catch (error) {
        console.error('Tag extraction error:', error);
    }
    
    return tags;
}

/**
 * Detect tag type based on content patterns
 */
function detectTagType(content, tagId) {
    const patterns = {
        'Google Analytics': /google.*analytics|gtag|ga\(/i,
        'Google Tag Manager': /googletagmanager|gtm/i,
        'Facebook Pixel': /facebook|fbevents|fbq/i,
        'Adobe Analytics': /adobe|omniture|s\.t\(/i,
        'Custom HTML': /script.*type.*text\/javascript/i,
        'Image Pixel': /img.*src.*1x1|pixel/i
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(content)) {
            return type;
        }
    }
    
    return 'Unknown';
}

/**
 * Extract extensions from utag content
 */
function extractExtensions(content) {
    const extensions = [];
    
    try {
        // Look for extension patterns
        const extMatches = content.match(/utag\.handler\.extend\([^}]*}/g) || [];
        const preMatches = content.match(/utag\.handler\.cfg\.load_rules\[["']\d+["']\]\.pre/g) || [];
        const postMatches = content.match(/utag\.handler\.cfg\.load_rules\[["']\d+["']\]\.post/g) || [];
        
        // Process extension matches
        extMatches.forEach((match, index) => {
            extensions.push({
                id: `ext_${index + 1}`,
                type: 'Extension',
                scope: 'Global',
                code: match.substring(0, 100) + '...'
            });
        });
        
        preMatches.forEach((match, index) => {
            extensions.push({
                id: `pre_${index + 1}`,
                type: 'Pre Loader',
                scope: 'Tag Specific',
                trigger: 'Before Tag Load'
            });
        });
        
        postMatches.forEach((match, index) => {
            extensions.push({
                id: `post_${index + 1}`,
                type: 'Post Loader',
                scope: 'Tag Specific',
                trigger: 'After Tag Load'
            });
        });
        
    } catch (error) {
        console.error('Extension extraction error:', error);
    }
    
    return extensions;
}

/**
 * Extract load rules from utag content
 */
function extractLoadRules(content) {
    const loadRules = [];
    
    try {
        // Look for load rule patterns
        const ruleMatches = content.match(/load_rules:\s*{[^}]*}/g) || [];
        const conditionMatches = content.match(/\w+:\s*\[[^\]]*\]/g) || [];
        
        ruleMatches.forEach((match, index) => {
            loadRules.push({
                id: `rule_${index + 1}`,
                type: 'Load Rule',
                conditions: extractConditionsFromRule(match),
                status: 'Active'
            });
        });
        
    } catch (error) {
        console.error('Load rule extraction error:', error);
    }
    
    return loadRules;
}

/**
 * Extract conditions from a load rule
 */
function extractConditionsFromRule(ruleText) {
    const conditions = [];
    
    try {
        // Look for condition patterns
        const matches = ruleText.match(/(\w+):\s*\[([^\]]*)\]/g) || [];
        
        matches.forEach(match => {
            const parts = match.match(/(\w+):\s*\[([^\]]*)\]/);
            if (parts && parts[1] && parts[2]) {
                conditions.push({
                    variable: parts[1],
                    values: parts[2].split(',').map(v => v.trim().replace(/['"]/g, ''))
                });
            }
        });
        
    } catch (error) {
        console.error('Condition extraction error:', error);
    }
    
    return conditions;
}

/**
 * Extract configuration from utag content
 */
function extractConfiguration(content) {
    const config = {};
    
    try {
        // Extract basic configuration
        const versionMatch = content.match(/version:\s*["']([^"']+)["']/);
        const profileMatch = content.match(/profile:\s*["']([^"']+)["']/);
        const accountMatch = content.match(/account:\s*["']([^"']+)["']/);
        const envMatch = content.match(/env:\s*["']([^"']+)["']/);
        
        if (versionMatch) config.version = versionMatch[1];
        if (profileMatch) config.profile = profileMatch[1];
        if (accountMatch) config.account = accountMatch[1];
        if (envMatch) config.environment = envMatch[1];
        
        // Extract other settings
        config.loadTime = content.includes('async') ? 'Asynchronous' : 'Synchronous';
        config.domReady = content.includes('DOMContentLoaded') ? 'Yes' : 'No';
        config.dataLayer = content.includes('utag_data') ? 'Enabled' : 'Disabled';
        
    } catch (error) {
        console.error('Configuration extraction error:', error);
    }
    
    return config;
}

/**
 * Toggle real-time monitoring
 */
function toggleRealTimeMonitoring() {
    if (profileInspectorState.isMonitoring) {
        stopMonitoring();
    } else {
        startMonitoring();
    }
}

/**
 * Start real-time monitoring
 */
function startMonitoring() {
    profileInspectorState.isMonitoring = true;
    profileInspectorState.performanceMetrics.startTime = Date.now();
    
    // Start monitoring intervals
    profileInspectorState.monitoringInterval = setInterval(() => {
        updateDataLayerMonitor();
        updateTagExecutionMonitor();
        updatePerformanceMetrics();
    }, 1000);
    
    updateMonitoringStatus();
    showNotification('Real-time monitoring started', 'success');
}

/**
 * Stop real-time monitoring
 */
function stopMonitoring() {
    profileInspectorState.isMonitoring = false;
    
    if (profileInspectorState.monitoringInterval) {
        clearInterval(profileInspectorState.monitoringInterval);
        profileInspectorState.monitoringInterval = null;
    }
    
    updateMonitoringStatus();
    showNotification('Real-time monitoring stopped', 'info');
}

/**
 * Setup network monitoring
 */
function setupNetworkMonitoring() {
    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._startTime = Date.now();
        this._method = method;
        this._url = url;
        
        this.addEventListener('loadend', function() {
            if (profileInspectorState.isMonitoring && this._url.includes('tiqcdn.com')) {
                profileInspectorState.networkRequests.push({
                    timestamp: new Date().toISOString(),
                    method: this._method,
                    url: this._url,
                    status: this.status,
                    duration: Date.now() - this._startTime,
                    type: 'XHR'
                });
                updateNetworkAnalysis();
            }
        });
        
        return originalXHROpen.call(this, method, url, ...args);
    };
    
    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(input, ...args) {
        const url = typeof input === 'string' ? input : input.url;
        const startTime = Date.now();
        
        return originalFetch.call(this, input, ...args).then(response => {
            if (profileInspectorState.isMonitoring && url.includes('tiqcdn.com')) {
                profileInspectorState.networkRequests.push({
                    timestamp: new Date().toISOString(),
                    method: 'GET',
                    url: url,
                    status: response.status,
                    duration: Date.now() - startTime,
                    type: 'Fetch'
                });
                updateNetworkAnalysis();
            }
            return response;
        });
    };
}

/**
 * Setup data layer monitoring
 */
function setupDataLayerMonitoring() {
    // Monitor utag_data changes
    if (typeof window.utag_data === 'object') {
        const originalData = JSON.stringify(window.utag_data);
        
        setInterval(() => {
            if (profileInspectorState.isMonitoring && window.utag_data) {
                const currentData = JSON.stringify(window.utag_data);
                if (currentData !== originalData) {
                    profileInspectorState.dataLayerHistory.push({
                        timestamp: new Date().toISOString(),
                        data: { ...window.utag_data },
                        changeType: 'Update'
                    });
                    profileInspectorState.performanceMetrics.eventCount++;
                }
            }
        }, 500);
    }
}

/**
 * Setup performance monitoring
 */
function setupPerformanceMonitoring() {
    // Monitor tag executions
    if (window.utag) {
        const originalSender = window.utag.sender;
        if (originalSender) {
            Object.keys(originalSender).forEach(key => {
                if (typeof originalSender[key] === 'function') {
                    const originalFunc = originalSender[key];
                    originalSender[key] = function(...args) {
                        if (profileInspectorState.isMonitoring) {
                            profileInspectorState.tagExecutions.push({
                                timestamp: new Date().toISOString(),
                                tagId: key,
                                args: args.length,
                                type: 'Tag Execution'
                            });
                            profileInspectorState.performanceMetrics.tagCount++;
                        }
                        return originalFunc.apply(this, args);
                    };
                }
            });
        }
    }
}

/**
 * Update monitoring status indicators
 */
function updateMonitoringStatus() {
    const dataLayerStatus = document.getElementById('dataLayerStatus');
    const tagMonitorStatus = document.getElementById('tagMonitorStatus');
    
    if (dataLayerStatus && tagMonitorStatus) {
        if (profileInspectorState.isMonitoring) {
            dataLayerStatus.textContent = 'Active';
            dataLayerStatus.className = 'ml-auto px-2 py-1 text-xs rounded-full bg-green-100 text-green-600';
            
            tagMonitorStatus.textContent = 'Active';
            tagMonitorStatus.className = 'ml-auto px-2 py-1 text-xs rounded-full bg-green-100 text-green-600';
        } else {
            dataLayerStatus.textContent = 'Inactive';
            dataLayerStatus.className = 'ml-auto px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600';
            
            tagMonitorStatus.textContent = 'Inactive';
            tagMonitorStatus.className = 'ml-auto px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600';
        }
    }
}

/**
 * Update data layer monitor display
 */
function updateDataLayerMonitor() {
    const monitor = document.getElementById('dataLayerMonitor');
    if (!monitor) return;
    
    const recentEvents = profileInspectorState.dataLayerHistory.slice(-10);
    
    if (recentEvents.length === 0) {
        monitor.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-database text-gray-300 text-3xl mb-3"></i>
                <p>No data layer changes detected</p>
            </div>
        `;
        return;
    }
    
    monitor.innerHTML = recentEvents.map(event => `
        <div class="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-500">
            <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-900">${event.changeType}</span>
                <span class="text-xs text-gray-500">${new Date(event.timestamp).toLocaleTimeString()}</span>
            </div>
            <pre class="text-xs text-gray-700 overflow-x-auto">${JSON.stringify(event.data, null, 2)}</pre>
        </div>
    `).join('');
}

/**
 * Update tag execution monitor display
 */
function updateTagExecutionMonitor() {
    const monitor = document.getElementById('tagExecutionMonitor');
    if (!monitor) return;
    
    const recentExecutions = profileInspectorState.tagExecutions.slice(-10);
    
    if (recentExecutions.length === 0) {
        monitor.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-tags text-gray-300 text-3xl mb-3"></i>
                <p>No tag executions detected</p>
            </div>
        `;
        return;
    }
    
    monitor.innerHTML = recentExecutions.map(execution => `
        <div class="bg-gray-50 rounded-lg p-3 border-l-4 border-green-500">
            <div class="flex justify-between items-center">
                <div>
                    <span class="text-sm font-medium text-gray-900">Tag ${execution.tagId}</span>
                    <span class="ml-2 text-xs text-gray-500">${execution.type}</span>
                </div>
                <span class="text-xs text-gray-500">${new Date(execution.timestamp).toLocaleTimeString()}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Update performance metrics display
 */
function updatePerformanceMetrics() {
    const loadTimeEl = document.getElementById('performanceLoadTime');
    const tagCountEl = document.getElementById('performanceTagCount');
    const eventCountEl = document.getElementById('performanceEventCount');
    
    if (loadTimeEl && profileInspectorState.performanceMetrics.startTime) {
        const elapsed = Date.now() - profileInspectorState.performanceMetrics.startTime;
        loadTimeEl.textContent = `${(elapsed / 1000).toFixed(1)}s`;
    }
    
    if (tagCountEl) {
        tagCountEl.textContent = profileInspectorState.performanceMetrics.tagCount;
    }
    
    if (eventCountEl) {
        eventCountEl.textContent = profileInspectorState.performanceMetrics.eventCount;
    }
}

/**
 * Update network analysis display
 */
function updateNetworkAnalysis() {
    const content = document.getElementById('networkRequests');
    if (!content) return;
    
    const recentRequests = profileInspectorState.networkRequests.slice(-20);
    
    if (recentRequests.length === 0) {
        content.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-network-wired text-gray-300 text-4xl mb-4"></i>
                <p>No network requests detected</p>
            </div>
        `;
        return;
    }
    
    content.innerHTML = recentRequests.map(request => `
        <div class="bg-white rounded-lg border border-gray-200 p-4">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <span class="inline-block px-2 py-1 text-xs rounded-full ${request.status < 400 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${request.method} ${request.status}
                    </span>
                    <span class="ml-2 text-xs text-gray-500">${request.type}</span>
                </div>
                <span class="text-xs text-gray-500">
                    ${new Date(request.timestamp).toLocaleTimeString()} (${request.duration}ms)
                </span>
            </div>
            <div class="text-sm text-gray-700 break-all">${request.url}</div>
        </div>
    `).join('');
}

/**
 * Switch inspector tabs
 */
function switchInspectorTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.inspector-tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.inspector-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`inspector-tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    // Activate selected tab button
    const selectedBtn = event.target;
    selectedBtn.classList.add('active', 'border-blue-500', 'text-blue-600');
    selectedBtn.classList.remove('border-transparent', 'text-gray-500');
}

/**
 * Update configuration tab with analysis results
 */
function updateConfigurationTab(analysis) {
    const variablesEl = document.getElementById('detectedVariables');
    const tagsEl = document.getElementById('detectedTags');
    const extensionsEl = document.getElementById('detectedExtensions');
    
    if (variablesEl) {
        variablesEl.innerHTML = analysis.variables.length > 0 
            ? analysis.variables.map(v => `<span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1">${v}</span>`).join('')
            : '<span class="text-gray-500">None detected</span>';
    }
    
    if (tagsEl) {
        tagsEl.innerHTML = analysis.tags.length > 0
            ? analysis.tags.map(t => `<div class="mb-1"><span class="font-medium">${t.name}</span> <span class="text-xs text-gray-500">(${t.type})</span></div>`).join('')
            : '<span class="text-gray-500">None detected</span>';
    }
    
    if (extensionsEl) {
        extensionsEl.innerHTML = analysis.extensions.length > 0
            ? analysis.extensions.map(e => `<div class="mb-1"><span class="font-medium">${e.type}</span> <span class="text-xs text-gray-500">${e.scope}</span></div>`).join('')
            : '<span class="text-gray-500">None detected</span>';
    }
}

/**
 * Update tags & variables tab
 */
function updateTagsVariablesTab(analysis) {
    const content = document.getElementById('tagsVariablesContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
                <h5 class="font-medium text-gray-900 mb-4">Tags (${analysis.tags.length})</h5>
                <div class="space-y-3">
                    ${analysis.tags.map(tag => `
                        <div class="bg-white border border-gray-200 rounded-lg p-4">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h6 class="font-medium text-gray-900">${tag.name}</h6>
                                    <p class="text-sm text-gray-600">ID: ${tag.id}</p>
                                </div>
                                <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">${tag.type}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div>
                <h5 class="font-medium text-gray-900 mb-4">Variables (${analysis.variables.length})</h5>
                <div class="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    ${analysis.variables.map(variable => `
                        <div class="py-1 text-sm font-mono text-gray-700">${variable}</div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Update load rules tab
 */
function updateLoadRulesTab(analysis) {
    const content = document.getElementById('loadRulesContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="space-y-4">
            <h5 class="font-medium text-gray-900">Load Rules (${analysis.loadRules.length})</h5>
            ${analysis.loadRules.map(rule => `
                <div class="bg-white border border-gray-200 rounded-lg p-4">
                    <div class="flex justify-between items-start mb-3">
                        <h6 class="font-medium text-gray-900">${rule.id}</h6>
                        <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">${rule.status}</span>
                    </div>
                    <div class="space-y-2">
                        <p class="text-sm text-gray-600">Conditions:</p>
                        ${rule.conditions.map(condition => `
                            <div class="bg-gray-50 rounded p-2 text-sm">
                                <span class="font-mono text-blue-600">${condition.variable}</span>: 
                                <span class="text-gray-700">${condition.values.join(', ')}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Update extensions tab
 */
function updateExtensionsTab(analysis) {
    const content = document.getElementById('extensionsContent');
    if (!content) return;
    
    content.innerHTML = `
        <div class="space-y-4">
            <h5 class="font-medium text-gray-900">Extensions (${analysis.extensions.length})</h5>
            ${analysis.extensions.map(extension => `
                <div class="bg-white border border-gray-200 rounded-lg p-4">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h6 class="font-medium text-gray-900">${extension.id}</h6>
                            <p class="text-sm text-gray-600">${extension.type}</p>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">${extension.scope}</span>
                    </div>
                    ${extension.code ? `
                        <div class="mt-3">
                            <p class="text-sm text-gray-600 mb-2">Code Preview:</p>
                            <pre class="bg-gray-50 rounded p-2 text-xs overflow-x-auto">${extension.code}</pre>
                        </div>
                    ` : ''}
                    ${extension.trigger ? `
                        <p class="text-sm text-gray-600 mt-2">Trigger: ${extension.trigger}</p>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Update profile overview
 */
function updateProfileOverview(profileInfo) {
    const overview = document.getElementById('profileOverview');
    if (!overview) return;
    
    overview.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div>
                <p class="text-sm font-medium text-gray-500">Account</p>
                <p class="text-lg font-semibold text-gray-900">${profileInfo.account}</p>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500">Profile</p>
                <p class="text-lg font-semibold text-gray-900">${profileInfo.profile}</p>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500">Environment</p>
                <p class="text-lg font-semibold text-gray-900">${profileInfo.environment}</p>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500">Last Analysis</p>
                <p class="text-lg font-semibold text-gray-900">${new Date(profileInfo.timestamp).toLocaleString()}</p>
            </div>
        </div>
    `;
}

/**
 * Import profile configuration
 */
function importProfileConfig() {
    if (!profileInspectorState.lastAnalysis) {
        showNotification('No analysis data available to import', 'warning');
        return;
    }
    
    const analysis = profileInspectorState.lastAnalysis;
    
    // Update current sandbox with detected variables
    if (analysis.variables.length > 0) {
        const dataLayerTextarea = document.getElementById('dataLayerEditor');
        if (dataLayerTextarea) {
            const existingData = JSON.parse(dataLayerTextarea.value || '{}');
            
            // Add detected variables with placeholder values
            analysis.variables.forEach(variable => {
                if (!existingData[variable]) {
                    existingData[variable] = `[detected from ${analysis.configuration.account}/${analysis.configuration.profile}]`;
                }
            });
            
            dataLayerTextarea.value = JSON.stringify(existingData, null, 2);
        }
    }
    
    showNotification('Profile configuration imported to sandbox', 'success');
}

/**
 * Clear inspector logs
 */
function clearInspectorLogs() {
    profileInspectorState.networkRequests = [];
    profileInspectorState.tagExecutions = [];
    profileInspectorState.dataLayerHistory = [];
    profileInspectorState.performanceMetrics = {
        startTime: null,
        loadTime: null,
        tagCount: 0,
        eventCount: 0
    };
    
    // Update displays
    updateDataLayerMonitor();
    updateTagExecutionMonitor();
    updatePerformanceMetrics();
    updateNetworkAnalysis();
    
    showNotification('Inspector logs cleared', 'info');
}

/**
 * Export inspector data
 */
function exportInspectorData() {
    const exportData = {
        timestamp: new Date().toISOString(),
        analysis: profileInspectorState.lastAnalysis,
        monitoring: {
            networkRequests: profileInspectorState.networkRequests,
            tagExecutions: profileInspectorState.tagExecutions,
            dataLayerHistory: profileInspectorState.dataLayerHistory,
            performanceMetrics: profileInspectorState.performanceMetrics
        }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tealium-inspector-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    showNotification('Inspector report exported', 'success');
}

/**
 * Show CORS help dialog
 */
function showCORSHelp() {
    const helpContent = `
        <div class="space-y-4">
            <h4 class="font-bold text-lg">CORS Workarounds</h4>
            
            <div class="bg-blue-50 rounded-lg p-4">
                <h5 class="font-medium text-blue-900 mb-2">1. Use Browser DevTools</h5>
                <p class="text-blue-800 text-sm">Open browser DevTools → Network tab → Reload the target site → Find utag.js → Copy content</p>
            </div>
            
            <div class="bg-green-50 rounded-lg p-4">
                <h5 class="font-medium text-green-900 mb-2">2. Manual Analysis</h5>
                <p class="text-green-800 text-sm">Paste utag.js content directly into the manual analysis textarea above</p>
            </div>
            
            <div class="bg-purple-50 rounded-lg p-4">
                <h5 class="font-medium text-purple-900 mb-2">3. Proxy Method</h5>
                <p class="text-purple-800 text-sm">Use the "Use Proxy" button (requires CORS proxy service)</p>
            </div>
            
            <div class="bg-orange-50 rounded-lg p-4">
                <h5 class="font-medium text-orange-900 mb-2">4. Browser Extension</h5>
                <p class="text-orange-800 text-sm">Install a CORS-disabling browser extension for development</p>
            </div>
        </div>
    `;
    
    // You can implement a modal dialog here or use the existing notification system
    showNotification('CORS workarounds available - check console for details', 'info');
    console.log('CORS Help:', helpContent);
}

/**
 * Helper functions for getting current settings
 */
function getCurrentAccount() {
    return document.getElementById('account')?.value || document.getElementById('quickAccount')?.value || '';
}

function getCurrentProfile() {
    return document.getElementById('profile')?.value || document.getElementById('quickProfile')?.value || '';
}

function getCurrentEnvironment() {
    return document.getElementById('environment')?.value || document.getElementById('quickEnvironment')?.value || '';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initializeProfileInspector === 'function') {
        initializeProfileInspector();
    }
});

// Expose functions globally for HTML event handlers
window.inspectCurrentProfile = inspectCurrentProfile;
window.inspectProfile = inspectProfile;
window.inspectWithProxy = inspectWithProxy;
window.analyzeManualContent = analyzeManualContent;
window.toggleRealTimeMonitoring = toggleRealTimeMonitoring;
window.clearInspectorLogs = clearInspectorLogs;
window.exportInspectorData = exportInspectorData;
window.switchInspectorTab = switchInspectorTab;
window.importProfileConfig = importProfileConfig;
window.showCORSHelp = showCORSHelp;
