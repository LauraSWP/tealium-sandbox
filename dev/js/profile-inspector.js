/**
 * Enhanced Profile Inspector for Tealium Sandbox
 * Comprehensive profile analysis based on advanced debugging techniques
 * Focuses on INFORMATION about the profile, not triggering actions
 */

// Early declaration: Ensure critical functions are available immediately for onclick handlers
// These will be properly defined below but are exposed to window right away
console.log('🔧 Profile Inspector JS loading... v2.1');
console.log('📍 Script start - functions will be defined');

/**
 * Safe evaluation function for accessing page context variables
 * @param {string} code - JavaScript code to evaluate
 * @returns {Promise} - Promise that resolves with the evaluation result
 */
function safeEval(code) {
    return new Promise((resolve, reject) => {
        try {
            const result = eval(code);
            resolve(result);
        } catch (error) {
            console.warn('safeEval error:', error);
            resolve(null);
        }
    });
}

/**
 * Main function to inspect the currently loaded Tealium profile
 */
async function inspectCurrentProfile() {
    if (!window.utag) {
        showNotification('No Tealium profile loaded', 'warning');
        updateProfileStats(null);
        clearAllDisplays();
        return;
    }
    
    try {
        showNotification('Analyzing profile...', 'info');
        
        // Get comprehensive profile analysis
        const profileData = await analyzeLoadedProfile();
        
        // Store analysis globally for modal access
        window.profileAnalysis = profileData;
        
        // Update all displays with the analysis
        updateProfileOverview(profileData.overview);
        updateProfileStats(profileData.stats);
        updateTagsAnalysis(profileData.tags);
        updateExtensionsAnalysis(profileData.extensions);
        updateLoadRulesAnalysis(profileData.loadRules);
        updateCurrentDataLayer();
        updateEnvironmentStatus();
        
        // Also automatically analyze cookies and utag.cfg settings (comprehensive analysis)
        setTimeout(() => {
            
            if (typeof analyzeTealiumCookies === 'function') {
                analyzeTealiumCookies();
            } else {
            }
            
            if (typeof analyzeUtagCfgSettings === 'function') {
                analyzeUtagCfgSettings();
            } else {
            }
        }, 500);
        
        showNotification(
            `Profile analyzed: ${profileData.stats.totalTags} tags (${profileData.stats.activeTags} active), ` +
            `${profileData.stats.totalExtensions} extensions (${profileData.stats.activeExtensions} active), ` +
            `${profileData.stats.totalLoadRules} load rules (${profileData.stats.trueLoadRules} true)`, 
            'success'
        );
    } catch (error) {
        console.error('Error inspecting profile:', error);
        showNotification('Error analyzing profile: ' + error.message, 'error');
    }
}
// Expose immediately for onclick handlers
window.inspectCurrentProfile = inspectCurrentProfile;
console.log('✅ inspectCurrentProfile exported to window:', typeof window.inspectCurrentProfile);

/**
 * Comprehensive analysis of the loaded Tealium profile
 * Based on the advanced debugging techniques from the provided example
 */
async function analyzeLoadedProfile() {
    if (!window.utag || !window.utag.loader || !window.utag.loader.cfg) {
        throw new Error('Tealium objects not available for analysis');
    }
    
    const analysis = {
        overview: extractProfileOverview(),
        stats: {
            totalTags: 0,
            activeTags: 0,
            bundledTags: 0,
            totalExtensions: 0,
            activeExtensions: 0,
            totalLoadRules: 0,
            trueLoadRules: 0,
            falseLoadRules: 0
        },
        tags: await analyzeTags(),
        extensions: analyzeExtensions(),
        loadRules: await analyzeLoadRules(),
        config: extractCurrentConfig()
    };
    
    // Calculate summary statistics
    analysis.stats.totalTags = analysis.tags.length;
    analysis.stats.activeTags = analysis.tags.filter(tag => tag.status === 'OK' || tag.status === 'Loaded').length;
    analysis.stats.bundledTags = analysis.tags.filter(tag => tag.isBundled).length;
    analysis.stats.totalExtensions = analysis.extensions.length;
    analysis.stats.activeExtensions = analysis.extensions.filter(ext => ext.status === 'OK').length;
    analysis.stats.totalLoadRules = analysis.loadRules.length;
    analysis.stats.trueLoadRules = analysis.loadRules.filter(rule => rule.status === 'True').length;
    analysis.stats.falseLoadRules = analysis.loadRules.filter(rule => rule.status === 'False').length;
    
    return analysis;
}

/**
 * Parses utag.loader.initcfg.toString() to extract load/send rule IDs for each tag.
 * @returns {Promise<Object>} A map of tag UIDs to their load/send rule IDs from initcfg.
 */
async function getLoadRuleMappingsFromInitCfgString() {
    const mappings = {};
    try {
        const initCfgStr = await safeEval('window.utag.loader.initcfg.toString()');
        if (!initCfgStr || typeof initCfgStr !== 'string') {
            console.warn("getLoadRuleMappingsFromInitCfgString: utag.loader.initcfg.toString() did not return a string.");
            return mappings;
        }

        // Regex to find the utag.loader.cfg = { ... }; part.
        const cfgObjMatch = initCfgStr.match(/utag\.loader\.cfg\s*=\s*(\{[\s\S]*?\});/);
        if (!cfgObjMatch || !cfgObjMatch[1]) {
            console.warn("getLoadRuleMappingsFromInitCfgString: Could not find utag.loader.cfg object in initcfg string.");
            return mappings;
        }

        let cfgObjStr = cfgObjMatch[1];

        // Regex to extract individual tag configurations: "UID": { ...config... }
        const tagConfigRegex = /"(\d+)"\s*:\s*\{([\s\S]*?)\}(?=,\s*"\d+"\s*:|\s*\})/g;
        let match;

        while ((match = tagConfigRegex.exec(cfgObjStr)) !== null) {
            const uid = match[1];
            const configStr = match[2];
            mappings[uid] = { loadRules: [], sendRules: [] };

            // Extract 'load' property string
            const loadMatch = configStr.match(/load\s*:\s*([^,}]+(?:\([^)]*\))?[\s\S]*?)(?:,\s*\w+\s*:|\s*\})/s);
            if (loadMatch && loadMatch[1]) {
                const loadValueStr = loadMatch[1].trim();
                const ruleIdRegex = /utag\.cond\[(\d+)\]/g;
                let ruleMatch;
                while ((ruleMatch = ruleIdRegex.exec(loadValueStr)) !== null) {
                    if (!mappings[uid].loadRules.includes(ruleMatch[1])) {
                        mappings[uid].loadRules.push(ruleMatch[1]);
                    }
                }
            }

            // Extract 'send' property string
            const sendMatch = configStr.match(/send\s*:\s*([^,}]+(?:\([^)]*\))?[\s\S]*?)(?:,\s*\w+\s*:|\s*\})/s);
            if (sendMatch && sendMatch[1]) {
                const sendValueStr = sendMatch[1].trim();
                const ruleIdRegex = /utag\.cond\[(\d+)\]/g;
                let ruleMatch;
                while ((ruleMatch = ruleIdRegex.exec(sendValueStr)) !== null) {
                    if (!mappings[uid].sendRules.includes(ruleMatch[1])) {
                        mappings[uid].sendRules.push(ruleMatch[1]);
                    }
                }
            }
        }
        
        // Fallback for the last tag in the object which might not be followed by a comma
        const lastTagMatch = cfgObjStr.match(/"(\d+)"\s*:\s*\{([\s\S]*?)\}\s*\}\s*$/);
        if (lastTagMatch) {
             const uid = lastTagMatch[1];
             const configStr = lastTagMatch[2];
             if (!mappings[uid]) { // Process only if not already processed by the global regex
                mappings[uid] = { loadRules: [], sendRules: [] };
                const loadMatch = configStr.match(/load\s*:\s*([^,}]+(?:\([^)]*\))?[\s\S]*?)(?:,\s*\w+\s*:|\s*\})/s);
                if (loadMatch && loadMatch[1]) {
                    const loadValueStr = loadMatch[1].trim();
                    const ruleIdRegex = /utag\.cond\[(\d+)\]/g;
                    let ruleMatch;
                    while ((ruleMatch = ruleIdRegex.exec(loadValueStr)) !== null) {
                        if (!mappings[uid].loadRules.includes(ruleMatch[1])) {
                             mappings[uid].loadRules.push(ruleMatch[1]);
                        }
                    }
                }
                const sendMatch = configStr.match(/send\s*:\s*([^,}]+(?:\([^)]*\))?[\s\S]*?)(?:,\s*\w+\s*:|\s*\})/s);
                if (sendMatch && sendMatch[1]) {
                    const sendValueStr = sendMatch[1].trim();
                    const ruleIdRegex = /utag\.cond\[(\d+)\]/g;
                    let ruleMatch;
                    while ((ruleMatch = ruleIdRegex.exec(sendValueStr)) !== null) {
                        if (!mappings[uid].sendRules.includes(ruleMatch[1])) {
                            mappings[uid].sendRules.push(ruleMatch[1]);
                        }
                    }
                }
            }
        }

    } catch (error) {
        console.error("Error in getLoadRuleMappingsFromInitCfgString:", error);
    }
    return mappings;
}

/**
 * Analyze all tags in the current profile
 * Based on the comprehensive tag analysis from the example
 */
async function analyzeTags() {
    const tags = [];
    const loaderCfg = window.utag.loader.cfg;
    const rpt = window.utag.rpt || {};
    const utagCond = window.utag.cond || {};
    
    // Get comprehensive load rule mappings from initcfg
    const tagRuleMappings = await getLoadRuleMappingsFromInitCfgString();
    
    // Get all configuration keys that look like tag UIDs
    const tagUIDs = Object.keys(loaderCfg)
        .filter(key => !isNaN(parseInt(key)) && key.length < 5);
    
    tagUIDs.forEach(uid => {
        const tagCfg = loaderCfg[uid];
        if (!tagCfg) return;
        
        const loadFlag = tagCfg.load;
        const sendFlag = tagCfg.send === 1;
        const isBundled = loadFlag === 4;
        const inRpt = rpt && rpt['l_' + uid] !== undefined;
        
        let status = 'Unknown';
        let statusClass = 'text-gray-500';
        let icon = 'fa-question-circle';
        let sortOrder = 99;
        
        // Determine status based on load/send flags and reporting
        if (loadFlag === 0 || loadFlag === false) {
            status = 'Not Loaded';
            statusClass = 'text-gray-400';
            icon = 'fa-times-circle';
            sortOrder = 50;
        } else if (inRpt && sendFlag) {
            status = 'OK';
            statusClass = 'text-green-600';
            icon = 'fa-check-circle';
            sortOrder = 10;
        } else if (inRpt && !sendFlag) {
            status = 'Not Sent';
            statusClass = 'text-yellow-600';
            icon = 'fa-ban';
            sortOrder = 20;
        } else if (!inRpt) {
            if (typeof loadFlag === 'number' && loadFlag > 4) {
                // Load rule based
                const ruleId = String(loadFlag);
                const ruleCond = utagCond[ruleId];
                if (ruleCond === false || ruleCond === 0) {
                    status = 'Condition False';
                    statusClass = 'text-blue-600';
                    icon = 'fa-minus-circle';
                    sortOrder = 40;
                } else {
                    status = 'Not Reported';
                    statusClass = 'text-gray-500';
                    icon = 'fa-question-circle';
                    sortOrder = 35;
                }
            } else if (loadFlag === 1 || loadFlag === 4 || loadFlag === true) {
                status = 'Not Reported';
                statusClass = 'text-gray-500';
                icon = 'fa-question-circle';
                sortOrder = 35;
            } else {
                status = 'Not Executed';
                statusClass = 'text-gray-500';
                icon = 'fa-hourglass-half';
                sortOrder = 30;
            }
        }
        
        // Get tag URL for external tags
        let tagUrl = null;
        let location = null;
        
        if (isBundled) {
            location = 'utag.js (Bundled)';
        } else if (rpt && rpt['l_' + uid]) {
            tagUrl = rpt['l_' + uid];
            if (tagUrl && typeof tagUrl === 'string' && tagUrl.startsWith('//')) {
                tagUrl = window.location.protocol + tagUrl;
            }
        }
        
        // Get comprehensive load rule details from initcfg mappings
        const cfgRules = tagRuleMappings[uid] || { loadRules: [], sendRules: [] };
        
        // Get basic load rule info from load flag
        let basicLoadRuleInfo = null;
        if (![0,1,2,3,4].includes(loadFlag) && typeof loadFlag === 'number') {
            const ruleId = String(loadFlag);
            const ruleCondition = utagCond[ruleId];
            const ruleDetails = parseLoadRuleFromUtag ? parseLoadRuleFromUtag(ruleId) : null;
            
            basicLoadRuleInfo = {
                id: ruleId,
                result: ruleCondition,
                condition: ruleDetails?.condition || 'Unknown'
            };
        }
        
        // Build comprehensive load rule information
        const allLoadRuleIds = [...new Set([...cfgRules.loadRules, ...cfgRules.sendRules])];
        const loadRuleDetails = allLoadRuleIds.map(ruleId => {
            const ruleCondition = utagCond[ruleId];
            const ruleDetails = parseLoadRuleFromUtag ? parseLoadRuleFromUtag(ruleId) : null;
            return {
                id: ruleId,
                result: ruleCondition,
                condition: ruleDetails?.condition || 'Unknown',
                type: cfgRules.loadRules.includes(ruleId) ? 'load' : 'send'
            };
        });

        tags.push({
            uid: uid,
            name: tagCfg.name || tagCfg.title || `Tag ${uid}`,
            status: status,
            statusClass: statusClass,
            icon: icon,
            version: tagCfg.v || 'N/A',
            url: tagUrl,
            location: location,
            isBundled: isBundled,
            loadRuleId: ![0,1,2,3,4].includes(loadFlag) && typeof loadFlag === 'number' ? String(loadFlag) : 'Always',
            loadRuleInfo: basicLoadRuleInfo,
            // Add comprehensive load rule information
            loadRuleIdsFromCfg: cfgRules.loadRules,
            sendRuleIdsFromCfg: cfgRules.sendRules,
            loadRuleDetails: loadRuleDetails,
            consentCategory: tagCfg.tcat || 'N/A',
            configLoad: loadFlag,
            configSend: sendFlag,
            templateId: tagCfg.tid || 'N/A',
            sortOrder: sortOrder
        });
    });
    
    // Sort tags by status (OK first, then by UID)
    tags.sort((a, b) => a.sortOrder - b.sortOrder || parseInt(a.uid) - parseInt(b.uid));
    
    return tags;
}

/**
 * Analyze all extensions in the current profile
 * Based on the comprehensive extension analysis from the example
 */
function analyzeExtensions() {
    const extensions = [];
    const cfgExtend = window.utag?.handler?.cfg_extend || window.utag?.loader?.cfg_extend || [];
    const rpt = window.utag?.rpt || {};
    
    if (!Array.isArray(cfgExtend)) {
        return extensions;
    }
    
    cfgExtend.forEach((cfg, index) => {
        if (!cfg || !cfg.id) return;
        
        // Determine scope
        let scope = 'Unknown';
        if (cfg.blr === 1) scope = 'Before Load Rules';
        else if (cfg.alr === 1) scope = 'After Load Rules';
        else if (cfg.end === 1) scope = 'After Tags';
        else scope = 'DOM Ready';
        
        // Check if extension ran using the rpt object
        let status = 'Not Run';
        let statusClass = 'text-gray-500';
        let icon = 'fa-pause-circle';
        let sortOrder = 30;
        
        const rptKey = 'ex_' + index;
        if (rptKey in rpt) {
            if (rpt[rptKey] === 1 || rpt[rptKey] === true) {
                status = 'Error';
                statusClass = 'text-red-600';
                icon = 'fa-exclamation-triangle';
                sortOrder = 60;
            } else {
                status = 'OK';
                statusClass = 'text-green-600';
                icon = 'fa-check-circle';
                sortOrder = 10;
            }
        }
        
        extensions.push({
            id: cfg.id,
            name: cfg.name || cfg.title || `Extension ${cfg.id}`,
            scope: scope,
            status: status,
            statusClass: statusClass,
            icon: icon,
            index: index,
            order: cfg.order || parseInt(cfg.id),
            sortOrder: sortOrder
        });
    });
    
    // Sort extensions by status (OK first, then by scope, then by order)
    extensions.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        const scopeOrder = { 'Before Load Rules': 1, 'After Load Rules': 2, 'DOM Ready': 3, 'After Tags': 4 };
        const aScopeOrder = scopeOrder[a.scope] || 99;
        const bScopeOrder = scopeOrder[b.scope] || 99;
        if (aScopeOrder !== bScopeOrder) return aScopeOrder - bScopeOrder;
        return a.order - b.order;
    });
    
    return extensions;
}

/**
 * Analyze all load rules in the current profile
 * Based on the comprehensive load rule analysis from the example
 */
async function analyzeLoadRules() {
    const rules = [];
    const cond = window.utag?.cond || {};
    const rpt = window.utag?.rpt || {};
    const cfg = window.utag?.loader?.cfg || {};
    const ruleTitles = cfg.rule || {};
    
    // Get tag rule mappings to find which tags use each load rule
    const tagRuleMappings = await getLoadRuleMappingsFromInitCfgString();
    
    // Create reverse mapping: load rule ID -> tag UIDs that use it
    const ruleToTagsMap = {};
    Object.entries(tagRuleMappings).forEach(([tagUid, rules]) => {
        // Add tags for load rules
        rules.loadRules.forEach(ruleId => {
            if (!ruleToTagsMap[ruleId]) ruleToTagsMap[ruleId] = [];
            ruleToTagsMap[ruleId].push({ uid: tagUid, type: 'load' });
        });
        
        // Add tags for send rules
        rules.sendRules.forEach(ruleId => {
            if (!ruleToTagsMap[ruleId]) ruleToTagsMap[ruleId] = [];
            ruleToTagsMap[ruleId].push({ uid: tagUid, type: 'send' });
        });
    });
    
    // First try utag.cond (preferred source)
    const condKeys = Object.keys(cond);
    if (condKeys.length > 0) {
        condKeys.forEach(id => {
            if (!isNaN(parseInt(id))) {
                const result = cond[id];
                const isTrue = result === 1 || result === true;
                
                // Get associated tags for this rule
                const associatedTags = ruleToTagsMap[id] || [];
                
                rules.push({
                    id: id,
                    title: ruleTitles[id]?.title || `Load Rule ${id}`,
                    status: isTrue ? 'True' : 'False',
                    statusClass: isTrue ? 'text-green-600' : 'text-red-600',
                    icon: isTrue ? 'fa-check-circle' : 'fa-times-circle',
                    result: result,
                    sortOrder: isTrue ? 1 : 2,
                    associatedTags: associatedTags
                });
            }
        });
    } else {
        // Fall back to utag.rpt
        Object.keys(rpt).forEach(key => {
            if (key.startsWith('r_')) {
                const id = key.substring(2);
                if (!isNaN(parseInt(id))) {
                    const result = rpt[key];
                    const isTrue = result === 1 || result === true;
                    
                    // Get associated tags for this rule
                    const associatedTags = ruleToTagsMap[id] || [];
                    
                    rules.push({
                        id: id,
                        title: ruleTitles[id]?.title || `Load Rule ${id}`,
                        status: isTrue ? 'True' : 'False',
                        statusClass: isTrue ? 'text-green-600' : 'text-red-600',
                        icon: isTrue ? 'fa-check-circle' : 'fa-times-circle',
                        result: result,
                        sortOrder: isTrue ? 1 : 2,
                        associatedTags: associatedTags
                    });
                }
            }
        });
    }
    
    // If still no rules, scan for load rules referenced by tags
    if (rules.length === 0 && cfg) {
        const loadRuleIds = new Set();
        Object.values(cfg).forEach(tagCfg => {
            if (tagCfg && typeof tagCfg === 'object' && tagCfg.load !== undefined) {
                const loadVal = tagCfg.load;
                if (typeof loadVal === 'number' && ![0,1,2,3,4].includes(loadVal)) {
                    loadRuleIds.add(loadVal);
                }
            }
        });
        
        loadRuleIds.forEach(id => {
            // Get associated tags for this rule
            const associatedTags = ruleToTagsMap[id] || [];
            
            rules.push({
                id: String(id),
                title: ruleTitles[id]?.title || `Load Rule ${id}`,
                status: 'Unknown',
                statusClass: 'text-gray-500',
                icon: 'fa-question-circle',
                result: undefined,
                sortOrder: 3,
                associatedTags: associatedTags
            });
        });
    }
    
    // Sort rules by status (True first, then False, then Unknown)
    rules.sort((a, b) => a.sortOrder - b.sortOrder || parseInt(a.id) - parseInt(b.id));
    
    return rules;
}

/**
 * Extract profile overview information
 */
function extractProfileOverview() {
    const cfg = window.utag.cfg || {};
    
    // Try to extract account/profile/env from various sources
    let account = cfg.account || 'Unknown';
    let profile = cfg.profile || 'Unknown';
    let environment = cfg.env || 'Unknown';
    
    // Try to extract from utag.cfg.path if available
    if (cfg.path && typeof cfg.path === 'string') {
        const pathMatch = cfg.path.match(/\/utag\/([^\/]+)\/([^\/]+)\/([^\/]+)\//);
        if (pathMatch) {
            account = pathMatch[1] || account;
            profile = pathMatch[2] || profile;
            environment = pathMatch[3] || environment;
        }
    }
    
    // Try to extract from script src if utag.cfg doesn't have the info
    if ((account === 'Unknown' || profile === 'Unknown' || environment === 'Unknown')) {
        const scripts = document.querySelectorAll('script[src*="utag.js"]');
        for (const script of scripts) {
            const src = script.src;
            const srcMatch = src.match(/\/utag\/([^\/]+)\/([^\/]+)\/([^\/]+)\/utag\.js/);
            if (srcMatch) {
                if (account === 'Unknown') account = srcMatch[1];
                if (profile === 'Unknown') profile = srcMatch[2];
                if (environment === 'Unknown') environment = srcMatch[3];
                break;
            }
        }
    }
    
    return {
        account: account,
        profile: profile,
        environment: environment,
        version: cfg.v || cfg.template || 'Unknown',
        path: cfg.path || 'Unknown',
        domain: cfg.domain || window.location.hostname,
        loadTime: cfg.load_time || 'N/A',
        secure: cfg.secure || false
    };
}

/**
 * Extract current utag.cfg configuration
 */
function extractCurrentConfig() {
    if (!window.utag || !window.utag.cfg) {
        return {};
    }
    
    return {
        utagdb: window.utag.cfg.utagdb || false,
        nocache: window.utag.cfg.nocache || false,
        noview: window.utag.cfg.noview || false,
        noload: window.utag.cfg.noload || false,
        split_cookies: window.utag.cfg.split_cookies || false,
        domain_override: window.utag.cfg.domain_override || '',
        session_timeout: window.utag.cfg.session_timeout || 1800000,
        order: window.utag.cfg.order || 'asc'
    };
}

/**
 * Update profile overview display
 */
function updateProfileOverview(overview) {
    const container = document.getElementById('profileOverview');
    if (!container) return;
    
    if (!overview) {
        container.innerHTML = '<div class="text-gray-500">No profile information available</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Account:</span>
                <span class="font-mono font-semibold text-blue-600">${overview.account}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Profile:</span>
                <span class="font-mono font-semibold text-purple-600">${overview.profile}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Environment:</span>
                <span class="font-mono font-semibold text-green-600">${overview.environment}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-600">Version:</span>
                <span class="font-mono text-sm">${overview.version}</span>
            </div>
        </div>
    `;
}

/**
 * Update profile statistics display
 */
function updateProfileStats(stats) {
    const elements = {
        variableCount: document.getElementById('variableCount'),
        tagCount: document.getElementById('tagCount'),
        extensionCount: document.getElementById('extensionCount'),
        loadRuleCount: document.getElementById('loadRuleCount')
    };
    
    if (!stats) {
        Object.values(elements).forEach(el => {
            if (el) el.textContent = '0';
        });
        return;
    }
    
    if (elements.variableCount) {
        const dataLayerCount = window.utag_data ? Object.keys(window.utag_data).length : 0;
        elements.variableCount.textContent = dataLayerCount;
    }
    
    if (elements.tagCount) {
        elements.tagCount.textContent = `${stats.activeTags}/${stats.totalTags}`;
    }
    
    if (elements.extensionCount) {
        elements.extensionCount.textContent = `${stats.activeExtensions}/${stats.totalExtensions}`;
    }
    
    if (elements.loadRuleCount) {
        elements.loadRuleCount.textContent = `${stats.trueLoadRules}/${stats.totalLoadRules}`;
    }
}

// Global data storage for filtering and sorting
let currentTagsData = [];
let currentExtensionsData = [];
let currentLoadRulesData = [];

// Track if filters have been set up to prevent multiple initializations
let tagsFilterSetup = false;
let extensionsFilterSetup = false;
let loadRulesFilterSetup = false;

/**
 * Update tags analysis display with detailed information
 */
function updateTagsAnalysis(tags) {
    currentTagsData = tags || [];
    const container = document.getElementById('profileTagsList');
    const countBadge = document.getElementById('tagsCountBadge');
    
    if (!container) return;
    
    // Update count badge
    if (countBadge) {
        const apiEnhancedCount = currentTagsData.filter(t => t.apiEnhanced).length;
        if (apiEnhancedCount > 0) {
            countBadge.innerHTML = `${currentTagsData.length} <span class="text-xs ml-1">(${apiEnhancedCount} API enhanced)</span>`;
        } else {
            countBadge.textContent = currentTagsData.length;
        }
    }
    
    if (currentTagsData.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-sm p-4">No tags found in this profile</div>';
        return;
    }
    
    renderTagsList(currentTagsData);
    
    // Setup filter only once when data is first loaded
    if (currentTagsData.length > 0 && !tagsFilterSetup) {
        setupTagsFilter();
        tagsFilterSetup = true;
    }
}

/**
 * Render tags list
 */
function renderTagsList(tags) {
    const container = document.getElementById('profileTagsList');
    
    const html = `
        <div class="space-y-2">
            ${tags.map(tag => `
                <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors" data-tag-uid="${tag.uid}" data-tag-name="${tag.name.toLowerCase()}" data-tag-status="${tag.status.toLowerCase()}">
                    <div class="flex items-center space-x-3">
                        <i class="fas ${tag.icon} ${tag.statusClass} text-lg"></i>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium text-gray-900 truncate flex items-center">
                                ${tag.name}
                                ${tag.apiEnhanced ? '<span class="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">API</span>' : ''}
                            </div>
                            <div class="flex items-center space-x-2 text-xs text-gray-500">
                                <span>UID: ${tag.uid}</span>
                                ${tag.version !== 'N/A' ? `<span>• v${tag.version}</span>` : ''}
                                ${tag.templateId !== 'N/A' ? `<span>• TID: ${tag.templateId}</span>` : ''}
                                ${tag.consentCategory !== 'N/A' ? `<span>• Cat: ${tag.consentCategory}</span>` : ''}
                            </div>
                            ${tag.loadRuleDetails && tag.loadRuleDetails.length > 0 ? `
                                <div class="text-xs mt-1 p-2 bg-blue-50 rounded">
                                    <div class="text-blue-700 font-medium mb-1">Load Rules:</div>
                                    <div class="flex flex-wrap gap-1">
                                        ${tag.loadRuleDetails.map(rule => `
                                            <span class="inline-block px-2 py-1 rounded text-xs font-medium ${rule.result ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                                ${rule.id}
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : tag.loadRuleInfo ? `
                                <div class="text-xs mt-1 p-2 bg-blue-50 rounded">
                                    <div class="text-blue-700 font-medium mb-1">Load Rules:</div>
                                    <div class="flex flex-wrap gap-1">
                                        <span class="inline-block px-2 py-1 rounded text-xs font-medium ${tag.loadRuleInfo.result ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${tag.loadRuleInfo.id}
                                        </span>
                                    </div>
                                </div>
                            ` : tag.loadRuleId === 'Always' ? '<div class="text-xs text-green-600 mt-1 bg-green-50 px-2 py-1 rounded">All Pages</div>' : ''}
                        </div>
                    </div>
                    <div class="text-right flex items-center space-x-2">
                        <div class="text-sm ${tag.statusClass} font-medium">${tag.status}</div>
                        ${tag.isBundled ? '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Bundled</span>' : ''}
                        <button onclick="openTagFile('${tag.uid}')" 
                                class="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="Open utag.${tag.uid}.js in new tab">
                            <i class="fas fa-external-link-alt text-sm"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * View tag file (utag.X.js) in iframe modal
 */
function openTagFile(tagId) {
    const modal = document.getElementById('tagCodeModal');
    const title = document.getElementById('tagCodeTitle');
    const subtitle = document.getElementById('tagCodeSubtitle');
    const iframe = document.getElementById('tagCodeIframe');
    const newTabLink = document.getElementById('tagCodeNewTabLink');
    
    if (!modal || !title || !iframe) return;
    
    try {
        // Get profile information from the stored analysis
        if (!window.profileAnalysis || !window.profileAnalysis.overview) {
            showNotification('Profile information not available. Please inspect profile first.', 'warning');
            return;
        }
        
        const overview = window.profileAnalysis.overview;
        const account = overview.account;
        const profile = overview.profile;
        const environment = overview.environment;
        
        if (!account || !profile || !environment || account === 'Unknown' || profile === 'Unknown' || environment === 'Unknown') {
            showNotification('Cannot determine profile location. Please reload Tealium.', 'error');
            return;
        }
        
        // Construct the URL to the tag file
        const tagFileUrl = `https://tags.tiqcdn.com/utag/${account}/${profile}/${environment}/utag.${tagId}.js`;
        
        // Set title
        title.textContent = `Tag ${tagId} - utag.${tagId}.js`;
        if (subtitle) {
            subtitle.textContent = `${account}/${profile}/${environment}`;
        }
        
        // Set new tab link
        if (newTabLink) {
            newTabLink.href = tagFileUrl;
        }
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Load tag file in iframe
        iframe.src = tagFileUrl;
        
        console.log(`📂 Loading tag file in iframe: ${tagFileUrl}`);
        showNotification(`Loading utag.${tagId}.js...`, 'info');
        
        // Optional: Add load event listener to show success
        iframe.onload = function() {
            console.log(`✅ Tag file loaded in iframe`);
            showNotification(`Tag ${tagId} loaded successfully`, 'success');
        };
        
        iframe.onerror = function() {
            console.error(`❌ Failed to load tag file in iframe`);
            showNotification(`Failed to load tag ${tagId}`, 'error');
        };
        
    } catch (error) {
        console.error('Error opening tag file:', error);
        showNotification('Error opening tag file: ' + error.message, 'error');
    }
}
// Expose immediately for onclick handlers
window.openTagFile = openTagFile;

/**
 * Setup tags filter functionality
 */
function setupTagsFilter() {
    const filterInput = document.getElementById('tagsFilter');
    const filterType = document.getElementById('tagsFilterType');
    const statusFilter = document.getElementById('tagsStatusFilter');
    const sortType = document.getElementById('tagsSortType');
    const sortDirection = document.getElementById('tagsSortDirection');
    
    if (!filterType) return;
    
    // Show/hide filter inputs based on type
    function toggleFilterInputs() {
        const selectedType = filterType.value;
        
        if (filterInput) filterInput.style.display = 'none';
        if (statusFilter) statusFilter.style.display = 'none';
        
        if (selectedType === 'status') {
            if (statusFilter) statusFilter.style.display = 'block';
        } else if (selectedType !== 'all') {
            if (filterInput) {
                filterInput.style.display = 'block';
                
                // Update placeholder text based on filter type
                switch (selectedType) {
                    case 'uid':
                        filterInput.placeholder = 'Enter tag UID (e.g., 7, 10, 15)';
                        break;
                    case 'version':
                        filterInput.placeholder = 'Enter version (e.g., 202410171118)';
                        break;
                    default:
                        filterInput.placeholder = 'Type to filter...';
                        break;
                }
            }
        }
        
        filterAndSortTags();
    }
    
    function filterAndSortTags() {
        if (!currentTagsData) return;
        
        const filterValue = filterInput?.value.toLowerCase() || '';
        const selectedType = filterType.value;
        const selectedStatus = statusFilter?.value || 'all';
        const sortBy = sortType?.value || 'uid';
        const sortDir = sortDirection?.getAttribute('data-direction') || 'asc';
        
        let filteredTags = [...currentTagsData];
        
        // Apply filters
        if (selectedType !== 'all') {
            filteredTags = filteredTags.filter(tag => {
                switch (selectedType) {
                    case 'uid':
                        return filterValue === '' || tag.uid.toString().toLowerCase().includes(filterValue);
                    case 'status':
                        const match = selectedStatus === 'all' || tag.status.toLowerCase() === selectedStatus.toLowerCase();
                        return match;
                    case 'version':
                        return filterValue === '' || tag.version.toString().toLowerCase().includes(filterValue);
                    default:
                        return true;
                }
            });
        } else if (selectedStatus !== 'all') {
            // Handle status filtering when "All" filter type is selected but status is specified
            filteredTags = filteredTags.filter(tag => {
                const match = tag.status.toLowerCase() === selectedStatus.toLowerCase();
                return match;
            });
        }
        
        // Apply sorting
        filteredTags.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'uid':
                    valueA = parseInt(a.uid) || 0;
                    valueB = parseInt(b.uid) || 0;
                    break;
                case 'status':
                    valueA = a.status;
                    valueB = b.status;
                    break;
                case 'version':
                    valueA = a.version;
                    valueB = b.version;
                    break;
                default:
                    valueA = parseInt(a.uid) || 0;
                    valueB = parseInt(b.uid) || 0;
                    break;
            }
            
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return sortDir === 'asc' ? valueA - valueB : valueB - valueA;
            } else {
                valueA = valueA.toString().toLowerCase();
                valueB = valueB.toString().toLowerCase();
                if (sortDir === 'asc') {
                    return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
                } else {
                    return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
                }
            }
        });
        
        renderTagsList(filteredTags);
    }
    
    // Sort direction toggle
    if (sortDirection) {
        sortDirection.addEventListener('click', function() {
            const currentDir = this.getAttribute('data-direction') || 'asc';
            const newDir = currentDir === 'asc' ? 'desc' : 'asc';
            this.setAttribute('data-direction', newDir);
            
            // Update icon
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = newDir === 'asc' ? 'fas fa-sort-amount-down-alt' : 'fas fa-sort-amount-up';
            }
            
            filterAndSortTags();
        });
    }
    
    // Event listeners
    filterType.addEventListener('change', toggleFilterInputs);
    if (filterInput) filterInput.addEventListener('input', filterAndSortTags);
    if (statusFilter) statusFilter.addEventListener('change', filterAndSortTags);
    if (sortType) sortType.addEventListener('change', filterAndSortTags);
    
    // Initialize
    toggleFilterInputs();
}

/**
 * Update extensions analysis display with detailed information
 */
function updateExtensionsAnalysis(extensions) {
    currentExtensionsData = extensions || [];
    const container = document.getElementById('profileExtensionsList');
    const countBadge = document.getElementById('extensionsCountBadge');
    
    if (!container) return;
    
    // Update count badge
    if (countBadge) {
        countBadge.textContent = currentExtensionsData.length;
    }
    
    if (!extensions || extensions.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-sm p-4">No extensions found in this profile</div>';
        return;
    }
    
    const html = `
        <div class="space-y-2">
            ${extensions.map(ext => `
                <div class="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                    <div class="flex items-center space-x-3">
                        <i class="fas ${ext.icon} ${ext.statusClass} text-lg"></i>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium text-gray-900 truncate">${ext.name}</div>
                            <div class="flex items-center space-x-2 text-xs text-gray-500">
                                <span>ID: ${ext.id}</span>
                                <span>• Index: ${ext.index}</span>
                                <span>• Order: ${ext.order}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right flex items-center space-x-2">
                        <div>
                            <div class="text-sm ${ext.statusClass} font-medium">${ext.status}</div>
                            <div class="text-xs text-gray-500">${ext.scope}</div>
                        </div>
                        <button onclick="viewExtensionCode(${ext.index}, '${ext.id}', '${ext.name.replace(/'/g, "\\'")}')"
                                class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors">
                            <i class="fas fa-code mr-1"></i>View Code
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
    
    // Setup extensions filter only once
    if (!extensionsFilterSetup) {
        setupExtensionsFilter();
        extensionsFilterSetup = true;
    }
}

/**
 * Setup extensions filter functionality
 */
function setupExtensionsFilter() {
    const filterInput = document.getElementById('extensionsFilter');
    const filterType = document.getElementById('extensionsFilterType');
    const scopeFilter = document.getElementById('extensionsScopeFilter');
    const sortType = document.getElementById('extensionsSortType');
    const sortDirection = document.getElementById('extensionsSortDirection');
    
    if (!filterType) return;
    
    // Show/hide filter inputs based on type
    function toggleFilterInputs() {
        const selectedType = filterType.value;
        
        if (filterInput) filterInput.style.display = 'none';
        if (scopeFilter) scopeFilter.style.display = 'none';
        
        if (selectedType === 'scope') {
            if (scopeFilter) scopeFilter.style.display = 'block';
        } else if (selectedType !== 'all') {
            if (filterInput) {
                filterInput.style.display = 'block';
                
                // Update placeholder text based on filter type
                switch (selectedType) {
                    case 'id':
                        filterInput.placeholder = 'Enter extension ID (e.g., 1, 5, 10)';
                        break;
                    case 'code':
                        filterInput.placeholder = 'Search in extension code (e.g., function, variable name)';
                        break;
                    default:
                        filterInput.placeholder = 'Type to filter...';
                        break;
                }
            }
        }
        
        filterAndSortExtensions();
    }
    
    function filterAndSortExtensions() {
        if (!currentExtensionsData) return;
        
        const filterValue = filterInput?.value.toLowerCase() || '';
        const selectedType = filterType.value;
        const selectedScope = scopeFilter?.value || 'all';
        const sortBy = sortType?.value || 'order';
        const sortDir = sortDirection?.getAttribute('data-direction') || 'asc';
        
        let filteredExtensions = [...currentExtensionsData];
        
        // Apply filters
        if (selectedType !== 'all') {
            filteredExtensions = filteredExtensions.filter(ext => {
                switch (selectedType) {
                    case 'id':
                        return filterValue === '' || ext.id.toString().toLowerCase().includes(filterValue);
                    case 'scope':
                        return selectedScope === 'all' || ext.scope.toLowerCase().replace(/\s+/g, '_') === selectedScope;
                    case 'code':
                        if (filterValue === '') return true;
                        const extensionFunction = window.utag?.handler?.extend?.[ext.index];
                        if (typeof extensionFunction === 'function') {
                            return extensionFunction.toString().toLowerCase().includes(filterValue);
                        }
                        return false;
                    default:
                        return true;
                }
            });
        }
        
        // Apply sorting
        filteredExtensions.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'status':
                    valueA = a.status;
                    valueB = b.status;
                    break;
                case 'id':
                    valueA = parseInt(a.id) || 0;
                    valueB = parseInt(b.id) || 0;
                    break;
                case 'order':
                default:
                    valueA = a.order;
                    valueB = b.order;
                    break;
            }
            
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return sortDir === 'asc' ? valueA - valueB : valueB - valueA;
            } else {
                valueA = valueA.toString().toLowerCase();
                valueB = valueB.toString().toLowerCase();
                if (sortDir === 'asc') {
                    return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
                } else {
                    return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
                }
            }
        });
        
        renderExtensionsList(filteredExtensions);
    }
    
    // Event listeners
    filterType.addEventListener('change', toggleFilterInputs);
    if (filterInput) filterInput.addEventListener('input', filterAndSortExtensions);
    if (scopeFilter) scopeFilter.addEventListener('change', filterAndSortExtensions);
    if (sortType) sortType.addEventListener('change', filterAndSortExtensions);
    if (sortDirection) {
        sortDirection.addEventListener('click', function() {
            const currentDir = this.getAttribute('data-direction');
            const newDir = currentDir === 'asc' ? 'desc' : 'asc';
            this.setAttribute('data-direction', newDir);
            
            // Update icon
            const icon = this.querySelector('i');
            if (newDir === 'asc') {
                icon.className = 'fas fa-sort-amount-down-alt';
                this.title = 'Sort ascending';
            } else {
                icon.className = 'fas fa-sort-amount-up';
                this.title = 'Sort descending';
            }
            
            filterAndSortExtensions();
        });
    }
    
    // Initialize
    toggleFilterInputs();
}

/**
 * Render extensions list
 */
function renderExtensionsList(extensions) {
    const container = document.getElementById('profileExtensionsList');
    if (!container) return;
    
    if (!extensions || extensions.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-sm p-4">No extensions match the current filter</div>';
        return;
    }
    
    const html = `
        <div class="space-y-2">
            ${extensions.map(ext => `
                <div class="flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                    <div class="flex items-center space-x-3">
                        <i class="fas ${ext.icon} ${ext.statusClass} text-lg"></i>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium text-gray-900 truncate flex items-center">
                                ${ext.name}
                                ${ext.apiEnhanced ? '<span class="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">API</span>' : ''}
                            </div>
                            <div class="flex items-center space-x-2 text-xs text-gray-500">
                                <span>ID: ${ext.id}</span>
                                <span>• Index: ${ext.index}</span>
                                <span>• Order: ${ext.order}</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right flex items-center space-x-2">
                        <div>
                            <div class="text-sm ${ext.statusClass} font-medium">${ext.status}</div>
                            <div class="text-xs text-gray-500">${ext.scope}</div>
                        </div>
                        <button onclick="viewExtensionCode(${ext.index}, '${ext.id}', '${ext.name.replace(/'/g, "\\'")}')"
                                class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors">
                            <i class="fas fa-code mr-1"></i>View Code
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Update load rules analysis display with detailed information
 */
function updateLoadRulesAnalysis(loadRules) {
    currentLoadRulesData = loadRules || [];
    const container = document.getElementById('profileLoadRulesList');
    const countBadge = document.getElementById('loadRulesCountBadge');
    
    if (!container) return;
    
    // Update count badge
    if (countBadge) {
        countBadge.textContent = currentLoadRulesData.length;
    }
    
    if (currentLoadRulesData.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-sm p-4">No load rules found or evaluated</div>';
        return;
    }
    
    renderLoadRulesList(currentLoadRulesData);
    
    // Setup filter only once when data is first loaded
    if (currentLoadRulesData.length > 0 && !loadRulesFilterSetup) {
        setupLoadRulesFilter();
        loadRulesFilterSetup = true;
    }
}

/**
 * Render load rules list
 */
function renderLoadRulesList(loadRules) {
    const container = document.getElementById('profileLoadRulesList');
    
    const html = `
        <div class="space-y-2">
            ${loadRules.map(rule => `
                <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors" data-rule-id="${rule.id}" data-rule-title="${rule.title.toLowerCase()}" data-rule-status="${rule.status.toLowerCase()}">
                    <div class="flex items-center space-x-3">
                        <i class="fas ${rule.icon} ${rule.statusClass} text-lg"></i>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium text-gray-900 truncate flex items-center">
                                ${rule.title}
                                ${rule.apiEnhanced ? '<span class="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">API</span>' : ''}
                            </div>
                            <div class="text-xs text-gray-500">Rule ID: ${rule.id}</div>
                            ${rule.associatedTags && rule.associatedTags.length > 0 ? `
                                <div class="text-xs mt-1 p-2 bg-blue-50 rounded">
                                    <div class="text-blue-700 font-medium mb-1">Used by Tags:</div>
                                    <div class="flex flex-wrap gap-1">
                                        ${rule.associatedTags.map(tag => `
                                            <span class="inline-block px-2 py-1 ${rule.result ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} rounded text-xs">
                                                ${tag.uid}
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="text-right flex items-center space-x-2">
                        <div class="text-sm ${rule.statusClass} font-medium">${rule.status}</div>
                        <button onclick="viewLoadRuleDetails('${rule.id}', '${rule.title.replace(/'/g, "\\'")}')"
                                class="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200 transition-colors">
                            <i class="fas fa-search mr-1"></i>Details
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Setup load rules filter functionality
 */
function setupLoadRulesFilter() {
    const filterInput = document.getElementById('loadRulesFilter');
    const filterType = document.getElementById('loadRulesFilterType');
    const statusFilter = document.getElementById('loadRulesStatusFilter');
    const sortType = document.getElementById('loadRulesSortType');
    const sortDirection = document.getElementById('loadRulesSortDirection');
    
    if (!filterType) return;
    
    // Show/hide filter inputs based on type
    function toggleFilterInputs() {
        const selectedType = filterType.value;
        
        if (filterInput) filterInput.style.display = 'none';
        if (statusFilter) statusFilter.style.display = 'none';
        
        if (selectedType === 'status') {
            if (statusFilter) statusFilter.style.display = 'block';
        } else if (selectedType !== 'all') {
            if (filterInput) {
                filterInput.style.display = 'block';
                
                // Update placeholder text based on filter type
                switch (selectedType) {
                    case 'id':
                        filterInput.placeholder = 'Enter rule ID (e.g., 5, 12)';
                        break;
                    case 'condition':
                        filterInput.placeholder = 'Try typing a variable name (e.g., page_type, customer_type)';
                        break;
                    default:
                        filterInput.placeholder = 'Type to filter...';
                        break;
                }
            }
        }
        
        filterAndSortLoadRules();
    }
    
    function filterAndSortLoadRules() {
        if (!currentLoadRulesData) return;
        
        const filterValue = filterInput?.value.toLowerCase() || '';
        const selectedType = filterType.value;
        const selectedStatus = statusFilter?.value || 'all';
        const sortBy = sortType?.value || 'id';
        const sortDir = sortDirection?.getAttribute('data-direction') || 'asc';
        
        let filteredRules = [...currentLoadRulesData];
        
        // Apply filters
        if (selectedType !== 'all') {
            filteredRules = filteredRules.filter(rule => {
                switch (selectedType) {
                    case 'id':
                        return filterValue === '' || rule.id.toString().toLowerCase().includes(filterValue);
                    case 'status':
                        return selectedStatus === 'all' || rule.status.toLowerCase() === selectedStatus.toLowerCase();
                    case 'condition':
                        if (filterValue === '') return true;
                        const ruleDetails = parseLoadRuleFromUtag(rule.id);
                        return ruleDetails.condition && 
                               ruleDetails.condition.toLowerCase().includes(filterValue);
                    default:
                        return true;
                }
            });
        } else if (selectedStatus !== 'all') {
            // Handle status filtering when "All" filter type is selected but status is specified
            filteredRules = filteredRules.filter(rule => {
                return rule.status.toLowerCase() === selectedStatus.toLowerCase();
            });
        }
        
        // Apply sorting
        filteredRules.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'id':
                    valueA = parseInt(a.id) || 0;
                    valueB = parseInt(b.id) || 0;
                    break;
                case 'title':
                    valueA = a.title;
                    valueB = b.title;
                    break;
                case 'status':
                    valueA = a.status;
                    valueB = b.status;
                    break;
                default:
                    valueA = parseInt(a.id) || 0;
                    valueB = parseInt(b.id) || 0;
                    break;
            }
            
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return sortDir === 'asc' ? valueA - valueB : valueB - valueA;
            } else {
                valueA = valueA.toString().toLowerCase();
                valueB = valueB.toString().toLowerCase();
                if (sortDir === 'asc') {
                    return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
                } else {
                    return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
                }
            }
        });
        
        renderLoadRulesList(filteredRules);
    }
    
    // Sort direction toggle
    if (sortDirection) {
        sortDirection.addEventListener('click', function() {
            const currentDir = this.getAttribute('data-direction') || 'asc';
            const newDir = currentDir === 'asc' ? 'desc' : 'asc';
            this.setAttribute('data-direction', newDir);
            
            // Update icon
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = newDir === 'asc' ? 'fas fa-sort-amount-down-alt' : 'fas fa-sort-amount-up';
            }
            
            filterAndSortLoadRules();
        });
    }
    
    // Event listeners
    filterType.addEventListener('change', toggleFilterInputs);
    if (filterInput) filterInput.addEventListener('input', filterAndSortLoadRules);
    if (statusFilter) statusFilter.addEventListener('change', filterAndSortLoadRules);
    if (sortType) sortType.addEventListener('change', filterAndSortLoadRules);
    
    // Initialize
    toggleFilterInputs();
}

/**
 * Update utag.cfg settings display
 */
function updateUtagCfgSettings(config) {
    const container = document.getElementById('utagCfgSettings');
    if (!container) return;
    
    if (!config || Object.keys(config).length === 0) {
        container.innerHTML = '<div class="text-gray-500">No utag.cfg settings available</div>';
        return;
    }
    
    const html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${Object.entries(config).map(([key, value]) => {
                const displayValue = typeof value === 'boolean' 
                    ? (value ? '✅ Enabled' : '❌ Disabled')
                    : (value || 'Not set');
                const valueClass = typeof value === 'boolean'
                    ? (value ? 'text-green-600' : 'text-gray-500')
                    : 'text-gray-700';
                
                return `
                    <div class="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                        <span class="font-medium text-gray-800">${key}</span>
                        <span class="${valueClass} font-mono text-sm">${displayValue}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Update current data layer display
 */
function updateCurrentDataLayer() {
    const container = document.getElementById('dataLayerContent');
    if (!container) return;
    
    if (!window.utag_data || Object.keys(window.utag_data).length === 0) {
        container.innerHTML = '<div class="text-gray-500">No data layer variables found</div>';
        return;
    }
    
    try {
        // Filter out functions and complex objects for display
        const cleanData = {};
        Object.entries(window.utag_data).forEach(([key, value]) => {
            if (typeof value !== 'function' && !(value instanceof Element)) {
                cleanData[key] = value;
            }
        });
        
        const formattedJson = JSON.stringify(cleanData, null, 2);
        container.innerHTML = `<pre class="text-xs text-gray-700 whitespace-pre-wrap">${formattedJson}</pre>`;
    } catch (error) {
        container.innerHTML = '<div class="text-red-500">Error displaying data layer</div>';
    }
}

/**
 * Update Tealium cookies display
 */
function updateTealiumCookies() {
    const container = document.getElementById('tealiumCookies');
    if (!container) return;
    
    const cookies = extractTealiumCookies();
    
    if (cookies.length === 0) {
        container.innerHTML = '<div class="text-gray-500">No Tealium cookies found</div>';
        return;
    }
    
    const html = cookies.map(cookie => `
        <div class="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
            <div>
                <div class="font-medium text-gray-800">${cookie.name}</div>
                <div class="text-xs text-gray-500">${cookie.description}</div>
            </div>
            <div class="text-right">
                <div class="text-sm text-gray-700 font-mono max-w-xs truncate">${cookie.value}</div>
                <div class="text-xs text-gray-500">${cookie.expires || 'Session'}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

/**
 * Extract Tealium-related cookies
 */
function extractTealiumCookies() {
    const cookies = [];
    const allCookies = document.cookie.split(';');
    
    const tealiumCookiePatterns = [
        { pattern: /^utag_/, description: 'Tealium core cookie' },
        { pattern: /^_ta_/, description: 'Tealium AudienceStream' },
        { pattern: /^_cs_/, description: 'Tealium DataAccess' },
        { pattern: /^trace_/, description: 'Tealium trace cookie' }
    ];
    
    allCookies.forEach(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=');
        const value = valueParts.join('=');
        
        for (const { pattern, description } of tealiumCookiePatterns) {
            if (pattern.test(name)) {
                cookies.push({
                    name: name,
                    value: value || '(empty)',
                    description: description,
                    expires: 'Unknown' // Could be enhanced to parse expiry
                });
                break;
            }
        }
    });
    
    return cookies;
}

/**
 * Update environment status indicators
 */
function updateEnvironmentStatus() {
    const tealiumStatus = document.getElementById('tealiumLoadStatus');
    const dataLayerStatus = document.getElementById('dataLayerStatusDisplay');
    
    if (tealiumStatus) {
        if (window.utag) {
            tealiumStatus.textContent = 'Loaded';
            tealiumStatus.className = 'text-lg font-bold text-green-600';
        } else {
            tealiumStatus.textContent = 'Not Loaded';
            tealiumStatus.className = 'text-lg font-bold text-red-600';
        }
    }
    
    if (dataLayerStatus) {
        if (window.utag_data && Object.keys(window.utag_data).length > 0) {
            dataLayerStatus.textContent = `Active (${Object.keys(window.utag_data).length} vars)`;
            dataLayerStatus.className = 'text-lg font-bold text-green-600';
        } else {
            dataLayerStatus.textContent = 'Not Detected';
            dataLayerStatus.className = 'text-lg font-bold text-yellow-600';
        }
    }
}
// Expose immediately for onclick handlers
window.updateEnvironmentStatus = updateEnvironmentStatus;

/**
 * Clear all displays when no profile is loaded
 */
function clearAllDisplays() {
    const containers = [
        'profileOverview',
        'profileTagsList', 
        'profileExtensionsList',
        'profileLoadRulesList',
        'utagCfgSettings',
        'dataLayerContent',
        'tealiumCookies'
    ];
    
    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            container.innerHTML = '<div class="text-gray-500">No profile loaded</div>';
        }
    });
}

/**
 * Export data layer as JSON file
 */
function exportDataLayer() {
    if (!window.utag_data) {
        showNotification('No data layer to export', 'warning');
        return;
    }
    
    try {
        const cleanData = {};
        Object.entries(window.utag_data).forEach(([key, value]) => {
            if (typeof value !== 'function' && !(value instanceof Element)) {
                cleanData[key] = value;
            }
        });
        
        const jsonString = JSON.stringify(cleanData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `utag_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Data layer exported successfully', 'success');
    } catch (error) {
        showNotification('Error exporting data layer: ' + error.message, 'error');
    }
}

/**
 * Show notification helper
 */
function showNotification(message, type = 'info') {
    
    // Try to use the global notification system if available
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else if (typeof showToast === 'function') {
        showToast(message, type);
    } else {
        // Fallback to console
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Auto-inspect if utag is already loaded
    if (window.utag) {
        setTimeout(() => {
            updateEnvironmentStatus();
        }, 500);
    }
});

/**
 * View extension code in modal with syntax highlighting and search
 */
function viewExtensionCode(index, id, name) {
    const modal = document.getElementById('extensionCodeModal');
    const title = document.getElementById('extensionCodeTitle');
    const content = document.getElementById('extensionCodeContent');
    const searchInput = document.getElementById('extensionCodeSearch');
    
    if (!modal || !title || !content) return;
    
    // Set title
    title.textContent = `Extension ${id} - ${name}`;
    
    // Show modal
    modal.classList.remove('hidden');
    
    try {
        // Get extension function from utag.handler.extend array
        const extensionFunction = window.utag?.handler?.extend?.[index];
        
        let codeText = '';
        if (typeof extensionFunction === 'function') {
            codeText = extensionFunction.toString();
        } else {
            codeText = 'Extension function not found or not accessible';
        }
        
        // Beautify code using JS Beautify
        try {
            if (typeof js_beautify !== 'undefined') {
                // Use JS Beautify for clean, consistent formatting
                const beautifiedCode = js_beautify(codeText, {
                    indent_size: 2,
                    indent_char: ' ',
                    max_preserve_newlines: 2,
                    preserve_newlines: true,
                    keep_array_indentation: false,
                    break_chained_methods: false,
                    indent_scripts: 'normal',
                    brace_style: 'collapse',
                    space_before_conditional: true,
                    unescape_strings: false,
                    jslint_happy: false,
                    end_with_newline: true,
                    wrap_line_length: 100,
                    indent_inner_html: false,
                    comma_first: false,
                    e4x: false,
                    indent_empty_lines: false
                });
                
                codeText = beautifiedCode;
            }
        } catch (beautifyError) {
            console.warn('Could not beautify code:', beautifyError);
            // Continue with original code if beautification fails
        }
        
        // Format and display code
        content.innerHTML = `<code class="language-javascript">${escapeHtml(codeText)}</code>`;
        
        // Apply syntax highlighting if available
        if (typeof hljs !== 'undefined') {
            hljs.highlightElement(content.querySelector('code'));
        }
        
        // Setup search functionality
        setupCodeSearch(searchInput, content, codeText);
        
    } catch (error) {
        content.innerHTML = `<code>Error loading extension code: ${error.message}</code>`;
    }
}
// Expose immediately for onclick handlers
window.viewExtensionCode = viewExtensionCode;

/**
 * View load rule details in modal
 */
function viewLoadRuleDetails(ruleId, ruleTitle) {
    const modal = document.getElementById('loadRuleModal');
    const title = document.getElementById('loadRuleTitle');
    const details = document.getElementById('loadRuleDetails');
    
    if (!modal || !title || !details) return;
    
    // Set title
    title.textContent = `Load Rule ${ruleId} - ${ruleTitle}`;
    
    // Show modal
    modal.classList.remove('hidden');
    
    try {
        // Extract load rule details from utag.loader.loadrules function
        const loadRuleDetails = extractLoadRuleFromUtag(ruleId);
        
        // Get related tags for this load rule
        const relatedTags = getRelatedTagsForLoadRule(ruleId);
        
        const html = `
            <div class="space-y-4">
                <!-- Loading Status -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-2">Loading Status</h4>
                    <div class="text-2xl font-bold ${loadRuleDetails.result ? 'text-green-600' : 'text-red-600'}">
                        ${loadRuleDetails.result ? 'TRUE' : 'FALSE'}
                    </div>
                    <div class="text-sm text-gray-600 mt-1">
                        Rule ${ruleId} is currently ${loadRuleDetails.result ? 'loading' : 'not loading'}
                    </div>
                </div>
                
                <!-- Load Rule Conditions -->
                ${loadRuleDetails.parsedConditions && loadRuleDetails.parsedConditions.length > 0 ? `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">Load Rule Conditions</h4>
                    <div class="space-y-2">
                        ${loadRuleDetails.parsedConditions.map(condition => `
                            <div class="bg-white p-3 rounded border-l-4 border-blue-400">
                                <div class="font-medium text-gray-900">${condition.readable}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : loadRuleDetails.condition ? `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-2">Load Rule Conditions</h4>
                    <div class="bg-white p-3 rounded border-l-4 border-blue-400">
                        <div class="font-medium text-gray-900">Custom condition: ${escapeHtml(loadRuleDetails.condition)}</div>
                    </div>
                </div>
                ` : `
                <div class="bg-blue-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-2">Load Rule Conditions</h4>
                    <div class="bg-white p-3 rounded border-l-4 border-gray-400">
                        <div class="font-medium text-gray-500">No conditions found for this rule</div>
                    </div>
                </div>
                `}
                
                <!-- Variables Used -->
                ${loadRuleDetails.variables && loadRuleDetails.variables.length > 0 ? `
                <div class="bg-purple-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">Data Layer Variables</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${loadRuleDetails.variables.map(variable => `
                            <div class="bg-white p-3 rounded border">
                                <div class="font-mono text-sm text-purple-700">${escapeHtml(variable)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <!-- Related Tags -->
                ${relatedTags.length > 0 ? `
                <div class="bg-green-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">Related Tags</h4>
                    <div class="space-y-2">
                        ${relatedTags.map(tag => `
                            <div class="bg-white p-3 rounded border">
                                <div class="font-medium ${loadRuleDetails.result ? 'text-green-600' : 'text-red-600'}">
                                    Tag ${tag.uid}: ${loadRuleDetails.result ? 'LOADING' : 'NOT LOADING'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : `
                <div class="bg-green-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-3">Related Tags</h4>
                    <div class="bg-white p-3 rounded border">
                        <div class="font-medium text-gray-500">No tags found using this load rule</div>
                    </div>
                </div>
                `}
            </div>
        `;
        
        details.innerHTML = html;
        
    } catch (error) {
        details.innerHTML = `<div class="text-red-600">Error loading rule details: ${error.message}</div>`;
    }
}
// Expose immediately for onclick handlers
window.viewLoadRuleDetails = viewLoadRuleDetails;

/**
 * Get related tags for a specific load rule
 */
function getRelatedTagsForLoadRule(ruleId) {
    const relatedTags = [];
    
    try {
        // Check if we have already analyzed load rules with associated tags
        if (window.profileAnalysis && window.profileAnalysis.loadRules) {
            const loadRule = window.profileAnalysis.loadRules.find(rule => 
                rule.id === ruleId || 
                rule.id === String(ruleId) || 
                String(rule.id) === String(ruleId)
            );
            if (loadRule && loadRule.associatedTags && loadRule.associatedTags.length > 0) {
                return loadRule.associatedTags.map(tag => ({
                    uid: tag.uid,
                    name: tag.name || `Tag ${tag.uid}`,
                    status: tag.status || 'active',
                    type: tag.type || 'tag'
                }));
            }
        }
        
        // Fallback: Check analyzed tags data
        if (window.profileAnalysis && window.profileAnalysis.tags) {
            window.profileAnalysis.tags.forEach(tag => {
                // Check if this tag uses the load rule
                const usesRuleFromCfg = tag.loadRuleIdsFromCfg?.includes(ruleId) || 
                                       tag.loadRuleIdsFromCfg?.includes(String(ruleId)) ||
                                       tag.sendRuleIdsFromCfg?.includes(ruleId) ||
                                       tag.sendRuleIdsFromCfg?.includes(String(ruleId));
                
                const usesRuleFromDetails = tag.loadRuleDetails?.some(rule => 
                    rule.id === ruleId || rule.id === String(ruleId) || String(rule.id) === String(ruleId)
                );
                
                if (usesRuleFromCfg || usesRuleFromDetails) {
                    relatedTags.push({
                        uid: tag.uid,
                        name: tag.name || `Tag ${tag.uid}`,
                        status: tag.status || 'active',
                        type: tag.type || 'tag'
                    });
                }
            });
        }
    } catch (error) {
        console.warn('Error finding related tags for load rule:', error);
    }
    
    return relatedTags;
}

/**
 * Extract load rule condition from utag.js
 */
function extractLoadRuleFromUtag(ruleId) {
    try {
        // Get current result from utag.cond
        const currentResult = window.utag?.cond?.[ruleId];
        
        // Extract load rule details from utag.js
        const loadRuleDetails = parseLoadRuleFromUtag(ruleId);
        
        return {
            result: currentResult,
            condition: loadRuleDetails.condition,
            type: loadRuleDetails.type,
            parsedConditions: loadRuleDetails.parsedConditions,
            tagFunction: loadRuleDetails.tagFunction,
            variables: loadRuleDetails.variables
        };
        
    } catch (error) {
        return {
            result: 'error',
            condition: `Error extracting rule: ${error.message}`,
            type: 'error',
            parsedConditions: [],
            tagFunction: '',
            variables: []
        };
    }
}

/**
 * Parse load rule from utag.js source code
 */
function parseLoadRuleFromUtag(ruleId) {
    try {
        if (!window.utag?.loader?.loadrules) {
            return {
                condition: 'utag.loader.loadrules function not available',
                type: 'no_function',
                parsedConditions: [],
                tagFunction: '',
                variables: []
            };
        }

        const loadRulesSource = window.utag.loader.loadrules.toString();
        
        // Extract from case 'ruleId': ... c[ruleId] |= (condition) ... break;
        
        let rawCondition = '';
        
        // Find the case block
        const caseStartPattern = new RegExp(`case\\s*['"]*${ruleId}['"]*\\s*:`, 'g');
        const caseStartMatch = caseStartPattern.exec(loadRulesSource);
        
        if (caseStartMatch) {
            // Find the condition assignment within this case
            const startPos = caseStartMatch.index;
            const caseEndPattern = /break\s*;/g;
            caseEndPattern.lastIndex = startPos;
            const caseEndMatch = caseEndPattern.exec(loadRulesSource);
            
            if (caseEndMatch) {
                const caseBlock = loadRulesSource.substring(startPos, caseEndMatch.index + caseEndMatch[0].length);
                
                // Extract the condition from c[ruleId] |= (condition)
                // Use a simple approach: find the opening parenthesis and manually count to find the closing one
                const assignmentPattern = new RegExp(`c\\[${ruleId}\\]\\s*\\|=\\s*\\(`, 'g');
                const assignmentMatch = assignmentPattern.exec(caseBlock);
                
                let conditionMatch = null;
                if (assignmentMatch) {
                    const startPos = assignmentMatch.index + assignmentMatch[0].length - 1; // Position of opening parenthesis
                    const condition = extractBalancedContent(caseBlock, startPos);
                    if (condition) {
                        conditionMatch = [null, condition]; // Fake match array format
                    }
                }
                
                if (conditionMatch) {
                    rawCondition = conditionMatch[1].trim();
                }
            }
        }
        
        // Fallback: simple pattern search
        if (!rawCondition) {
            const simplePattern = new RegExp(`c\\[${ruleId}\\]\\s*\\|=\\s*\\(([^\\)]+)\\)`, 'g');
            const simpleMatch = simplePattern.exec(loadRulesSource);
            if (simpleMatch) {
                rawCondition = simpleMatch[1].trim();
            } else {
            }
        }
        
        // Look for the tag function that uses this load rule
        const tagFunctionPattern = new RegExp(`if\\s*\\(\\s*\\(utag\\.cond\\[${ruleId}\\]\\)\\)\\s*\\{([\\s\\S]*?)\\}\\s*\\}\\s*catch`, 'g');
        const tagFunctionMatch = tagFunctionPattern.exec(loadRulesSource);
        
        let tagFunction = '';
        let variables = [];
        
        if (tagFunctionMatch) {
            tagFunction = tagFunctionMatch[1].trim();
            
            // Extract variables used in the tag function
            variables = extractVariablesFromTagFunction(tagFunction);
        }
        
        // Parse the condition into human-readable format
        const parsedConditions = parseConditionString(rawCondition);
        
        return {
            condition: rawCondition || `Rule c[${ruleId}] not found`,
            type: rawCondition ? 'condition' : 'not_found',
            parsedConditions: parsedConditions,
            tagFunction: tagFunction,
            variables: variables
        };
        
    } catch (error) {
        return {
            condition: `Error parsing rule: ${error.message}`,
            type: 'error',
            parsedConditions: [],
            tagFunction: '',
            variables: []
        };
    }
}

/**
 * Parse condition string into human-readable conditions
 */
function parseConditionString(conditionStr) {
    if (!conditionStr) return [];
    
    const conditions = [];
    
    try {
        // Common Tealium condition patterns
        const patterns = [
            // d['key'].toString().indexOf('value') > -1
            {
                regex: /d\['([^']+)'\]\.toString\(\)\.indexOf\('([^']+)'\)\s*>\s*-1/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" contains "${matches[2]}"`
            },
            // d["key"].toString().indexOf('value') > -1
            {
                regex: /d\["([^"]+)"\]\.toString\(\)\.indexOf\('([^']+)'\)\s*>\s*-1/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" contains "${matches[2]}"`
            },
            // d['key'].toString().indexOf("value") > -1
            {
                regex: /d\['([^']+)'\]\.toString\(\)\.indexOf\("([^"]+)"\)\s*>\s*-1/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" contains "${matches[2]}"`
            },
            // d["key"].toString().indexOf("value") > -1
            {
                regex: /d\["([^"]+)"\]\.toString\(\)\.indexOf\("([^"]+)"\)\s*>\s*-1/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" contains "${matches[2]}"`
            },
            // typeof d['key'] != 'undefined' && d['key'].toString().toLowerCase().indexOf('value'.toLowerCase()) > -1
            {
                regex: /typeof\s+d\['([^']+)'\]\s*!=\s*'undefined'\s*&&\s*d\['([^']+)'\]\.toString\(\)\.toLowerCase\(\)\.indexOf\('([^']+)'\.toLowerCase\(\)\)\s*>\s*-1/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" is defined AND contains "${matches[3]}" (case insensitive)`
            },
            // utag.data["key"] == "value"
            {
                regex: /utag\.data\["([^"]+)"\]\s*==\s*"([^"]+)"/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" equals "${matches[2]}"`
            },
            // utag.data["key"] != "value"
            {
                regex: /utag\.data\["([^"]+)"\]\s*!=\s*"([^"]+)"/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" does not equal "${matches[2]}"`
            },
            // d['key'] == 'value'
            {
                regex: /d\['([^']+)'\]\s*==\s*'([^']+)'/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" equals "${matches[2]}"`
            },
            // d["key"] == "value"
            {
                regex: /d\["([^"]+)"\]\s*==\s*"([^"]+)"/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" equals "${matches[2]}"`
            },
            // typeof d['key'] != 'undefined'
            {
                regex: /typeof\s+d\['([^']+)'\]\s*!=\s*'undefined'/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" is defined`
            },
            // typeof d["key"] != "undefined"
            {
                regex: /typeof\s+d\["([^"]+)"\]\s*!=\s*"undefined"/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" is defined`
            },
            // utag.data["key"]
            {
                regex: /utag\.data\["([^"]+)"\](?!\s*[!=]=)/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" exists and is truthy`
            },
            // !utag.data["key"]
            {
                regex: /!utag\.data\["([^"]+)"\]/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" does not exist or is falsy`
            },
            // typeof utag.data["key"] != "undefined"
            {
                regex: /typeof\s+utag\.data\["([^"]+)"\]\s*!=\s*"undefined"/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" is defined`
            },
            // typeof utag.data["key"] == "undefined"
            {
                regex: /typeof\s+utag\.data\["([^"]+)"\]\s*==\s*"undefined"/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" is undefined`
            },
            // b["key"] patterns (utag_data object)
            {
                regex: /b\["([^"]+)"\]\s*==\s*"([^"]+)"/g,
                format: (matches) => `Page Variable "${matches[1]}" equals "${matches[2]}"`
            },
            // window.location patterns
            {
                regex: /window\.location\.href\.indexOf\("([^"]+)"\)\s*>\s*-1/g,
                format: (matches) => `URL contains "${matches[1]}"`
            },
            {
                regex: /window\.location\.pathname\s*==\s*"([^"]+)"/g,
                format: (matches) => `Page path equals "${matches[1]}"`
            },
            // document.title patterns
            {
                regex: /document\.title\.indexOf\("([^"]+)"\)\s*>\s*-1/g,
                format: (matches) => `Page title contains "${matches[1]}"`
            },
            // Cookie patterns
            {
                regex: /document\.cookie\.indexOf\("([^"]+)"\)\s*>\s*-1/g,
                format: (matches) => `Cookie contains "${matches[1]}"`
            },
            // d['key'] - put at end so it doesn't interfere with more specific patterns
            {
                regex: /\bd\['([^']+)'\](?!\s*[!=\.]=|\.toString|\.toLowerCase)/g,
                format: (matches) => `Data Layer Variable "${matches[1]}" exists and is truthy`
            }
        ];
        
        // Apply each pattern, but avoid duplicates
        const usedText = new Set();
        
        patterns.forEach((pattern, index) => {
            let match;
            while ((match = pattern.regex.exec(conditionStr)) !== null) {
                const matchText = match[0];
                if (!usedText.has(matchText)) {
                    conditions.push({
                        original: matchText,
                        readable: pattern.format(match),
                        type: 'condition'
                    });
                    usedText.add(matchText);
                }
            }
        });
        
        // Handle complex AND/OR conditions
        if (conditions.length === 0) {
            // Try to break down complex conditions with && or ||
            if (conditionStr.includes('&&') || conditionStr.includes('||')) {
                const complexCondition = parseComplexCondition(conditionStr);
                if (complexCondition) {
                    conditions.push({
                        original: conditionStr,
                        readable: complexCondition,
                        type: 'complex'
                    });
                } else {
                    conditions.push({
                        original: conditionStr,
                        readable: `Complex condition: ${conditionStr}`,
                        type: 'custom'
                    });
                }
            } else {
                conditions.push({
                    original: conditionStr,
                    readable: `Custom condition: ${conditionStr}`,
                    type: 'custom'
                });
            }
        }
        
    } catch (error) {
        conditions.push({
            original: conditionStr,
            readable: `Error parsing condition: ${error.message}`,
            type: 'error'
        });
    }
    
    return conditions;
}

/**
 * Extract content between balanced parentheses
 */
function extractBalancedContent(text, startPos) {
    if (text[startPos] !== '(') return null;
    
    let depth = 0;
    let endPos = startPos;
    
    for (let i = startPos; i < text.length; i++) {
        if (text[i] === '(') {
            depth++;
        } else if (text[i] === ')') {
            depth--;
            if (depth === 0) {
                endPos = i;
                break;
            }
        }
    }
    
    if (depth === 0 && endPos > startPos) {
        return text.substring(startPos + 1, endPos); // Exclude the parentheses
    }
    
    return null;
}

/**
 * Parse complex conditions with AND/OR operators
 */
function parseComplexCondition(conditionStr) {
    try {
        // Split by && and || operators while preserving them
        const parts = conditionStr.split(/(\s*&&\s*|\s*\|\|\s*)/);
        
        let result = '';
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();
            
            if (part === '&&') {
                result += ' AND ';
            } else if (part === '||') {
                result += ' OR ';
            } else if (part.includes('&&') || part.includes('||')) {
                // Skip connector parts that weren't properly split
                continue;
            } else if (part) {
                // Try to parse individual condition parts
                const parsedParts = parseConditionString(part);
                if (parsedParts.length > 0 && parsedParts[0].readable && !parsedParts[0].readable.includes('Custom condition:')) {
                    result += parsedParts[0].readable;
                } else {
                    // Fallback to simplified parsing
                    result += simplifyConditionPart(part);
                }
            }
        }
        
        return result || null;
        
    } catch (error) {
        return null;
    }
}

/**
 * Simplify individual condition parts
 */
function simplifyConditionPart(part) {
    try {
        // Remove parentheses
        part = part.replace(/^\(+|\)+$/g, '');
        
        // Basic patterns for quick parsing
        if (part.includes("indexOf") && part.includes("> -1")) {
            const match = part.match(/d\[['"]([^'"]+)['"]\].*indexOf\(['"]([^'"]+)['"]\)/);
            if (match) {
                return `"${match[1]}" contains "${match[2]}"`;
            }
        }
        
        if (part.includes("typeof") && part.includes("!= 'undefined'")) {
            const match = part.match(/d\[['"]([^'"]+)['"]\]/);
            if (match) {
                return `"${match[1]}" is defined`;
            }
        }
        
        // Generic fallback
        return `(${part})`;
        
    } catch (error) {
        return `(${part})`;
    }
}

/**
 * Extract variables from tag function
 */
function extractVariablesFromTagFunction(tagFunction) {
    const variables = [];
    
    try {
        // Extract utag.data references
        const dataVarPattern = /utag\.data\["([^"]+)"\]/g;
        let match;
        
        while ((match = dataVarPattern.exec(tagFunction)) !== null) {
            const varName = match[1];
            if (!variables.find(v => v.name === varName)) {
                variables.push({
                    name: varName,
                    type: 'data_layer',
                    value: window.utag?.data?.[varName] || 'undefined'
                });
            }
        }
        
        // Extract event type if present
        const eventPattern = /"tealium_event":\s*"([^"]+)"/;
        const eventMatch = eventPattern.exec(tagFunction);
        if (eventMatch) {
            variables.push({
                name: 'tealium_event',
                type: 'event',
                value: eventMatch[1]
            });
        }
        
    } catch (error) {
        console.warn('Error extracting variables from tag function:', error);
    }
    
    return variables;
}

/**
 * Setup code search functionality with navigation
 */
function setupCodeSearch(searchInput, contentContainer, codeText) {
    if (!searchInput || !contentContainer) return;
    
    let currentMatches = [];
    let currentMatchIndex = -1;
    
    function updateSearchResults(searchTerm) {
        const codeElement = contentContainer.querySelector('code');
        if (!codeElement) return;
        
        if (searchTerm === '') {
            // Reset to original code
            codeElement.innerHTML = escapeHtml(codeText);
            if (typeof hljs !== 'undefined') {
                hljs.highlightElement(codeElement);
            }
            currentMatches = [];
            currentMatchIndex = -1;
            updateSearchStatus('');
            return;
        }
        
        // Find all matches
        const regex = new RegExp(escapeRegExp(searchTerm), 'gi');
        const matches = [...codeText.matchAll(regex)];
        currentMatches = matches;
        currentMatchIndex = matches.length > 0 ? 0 : -1;
        
        // Highlight all matches with different colors for current vs others
        let highlightedCode = codeText;
        let offset = 0;
        
        matches.forEach((match, index) => {
            const isCurrentMatch = index === currentMatchIndex;
            const className = isCurrentMatch ? 'bg-orange-400 text-black' : 'bg-yellow-300';
            const replacement = `<mark class="${className}" data-match-index="${index}">${match[0]}</mark>`;
            const startPos = match.index + offset;
            
            highlightedCode = highlightedCode.slice(0, startPos) + 
                            replacement + 
                            highlightedCode.slice(startPos + match[0].length);
            offset += replacement.length - match[0].length;
        });
        
        codeElement.innerHTML = escapeHtml(highlightedCode).replace(
            /&lt;mark class="([^"]+)" data-match-index="(\d+)"&gt;([^&]+)&lt;\/mark&gt;/g,
            '<mark class="$1" data-match-index="$2">$3</mark>'
        );
        
        updateSearchStatus(`${currentMatchIndex + 1} of ${matches.length}`);
        
        // Scroll to current match
        if (matches.length > 0) {
            scrollToCurrentMatch();
        }
    }
    
    function navigateToMatch(direction) {
        if (currentMatches.length === 0) return;
        
        if (direction === 'next') {
            currentMatchIndex = (currentMatchIndex + 1) % currentMatches.length;
        } else if (direction === 'prev') {
            currentMatchIndex = currentMatchIndex <= 0 ? currentMatches.length - 1 : currentMatchIndex - 1;
        }
        
        // Update highlighting
        const allMarks = contentContainer.querySelectorAll('mark');
        allMarks.forEach((mark, index) => {
            mark.className = index === currentMatchIndex ? 'bg-orange-400 text-black' : 'bg-yellow-300';
        });
        
        updateSearchStatus(`${currentMatchIndex + 1} of ${currentMatches.length}`);
        scrollToCurrentMatch();
    }
    
    function scrollToCurrentMatch() {
        const currentMark = contentContainer.querySelector(`mark[data-match-index="${currentMatchIndex}"]`);
        if (currentMark) {
            currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    function updateSearchStatus(status) {
        // Add or update search status display
        let statusElement = searchInput.parentNode.querySelector('.search-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.className = 'search-status text-xs text-gray-500 mt-1';
            searchInput.parentNode.appendChild(statusElement);
        }
        statusElement.textContent = status;
    }
    
    // Input event for search
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        updateSearchResults(searchTerm);
    });
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', function(e) {
        if (currentMatches.length === 0) return;
        
        switch(e.key) {
            case 'Enter':
                e.preventDefault();
                navigateToMatch(e.shiftKey ? 'prev' : 'next');
                break;
            case 'ArrowDown':
                e.preventDefault();
                navigateToMatch('next');
                break;
            case 'ArrowUp':
                e.preventDefault();
                navigateToMatch('prev');
                break;
            case 'Escape':
                this.value = '';
                updateSearchResults('');
                break;
        }
    });
}

/**
 * Close extension code modal
 */
function closeExtensionCodeModal() {
    const modal = document.getElementById('extensionCodeModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
// Expose immediately for onclick handlers
window.closeExtensionCodeModal = closeExtensionCodeModal;

/**
 * Close load rule modal
 */
function closeLoadRuleModal() {
    const modal = document.getElementById('loadRuleModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
// Expose immediately for onclick handlers
window.closeLoadRuleModal = closeLoadRuleModal;

/**
 * Close tag code modal
 */
function closeTagCodeModal() {
    const modal = document.getElementById('tagCodeModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
// Expose immediately for onclick handlers
window.closeTagCodeModal = closeTagCodeModal;

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Utility function to escape regex
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    const extensionModal = document.getElementById('extensionCodeModal');
    const loadRuleModal = document.getElementById('loadRuleModal');
    
    if (event.target === extensionModal) {
        closeExtensionCodeModal();
    }
    
    if (event.target === loadRuleModal) {
        closeLoadRuleModal();
    }
});

// Close modals with escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeExtensionCodeModal();
        closeLoadRuleModal();
    }
});

/**
 * Analyze Tealium cookies based on official documentation
 */
function analyzeTealiumCookies() {

    const allCookies = {};
    
    // Get all browser cookies
    const browserCookies = document.cookie.split(';');
    browserCookies.forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
            allCookies[name] = decodeURIComponent(value);
            if (name.includes('utag')) {
            }
        }
    });
    
    // Also check for cookies in the data layer (utag_data)
    if (window.utag_data) {
        Object.keys(window.utag_data).forEach(key => {
            if (key.includes('utag_main') || key.startsWith('cp.utag_main')) {
                // Extract cookie name from data layer key and normalize it
                const cookieName = key.replace('cp.', '');
                // Only add if we don't already have this cookie from browser cookies
                if (!allCookies[cookieName]) {
                    allCookies[cookieName] = window.utag_data[key];
                }
            }
        });
    } else {
    }
    
    // Check for cookies in Tealium's b object
    if (window.utag && window.utag.data) {
        Object.keys(window.utag.data).forEach(key => {
            if (key.includes('utag_main')) {
                // Only add if we don't already have this cookie
                if (!allCookies[key]) {
                    allCookies[key] = window.utag.data[key];
                }
            }
        });
    } else {
    }
    
    
    // Categorize Tealium cookies based on official documentation
    const tealiumCookies = {
        utagMain: {},
        consent: {},
        collect: {},
        extensions: {},
        webCompanion: {},
        thirdParty: {}
    };
    
    Object.keys(allCookies).forEach(key => {
        const value = allCookies[key];
        
        // Built-in utag_main cookies (v4.50+)
        if (key.startsWith('utag_main_')) {
            const subKey = key.replace('utag_main_', '');
            tealiumCookies.utagMain[subKey] = {
                name: key,
                value: value,
                parsedValue: parseUtagMainValue(subKey, value),
                description: getUtagMainDescription(subKey)
            };
        }
        // Single multi-value utag_main cookie (v4.49 and earlier)
        else if (key === 'utag_main') {
            tealiumCookies.utagMain['legacy'] = {
                name: key,
                value: value,
                parsedValue: parseUtagMainLegacy(value),
                description: 'Legacy multi-value utag_main cookie (v4.49 and earlier)'
            };
        }
        // Consent Manager cookies
        else if (key === 'CONSENTMGR') {
            tealiumCookies.consent[key] = {
                name: key,
                value: value,
                parsedValue: parseConsentManagerCookie(value),
                description: 'Tealium Consent Manager settings'
            };
        }
        // Privacy Manager cookies
        else if (key === 'OPTOUTMULTI') {
            tealiumCookies.consent[key] = {
                name: key,
                value: value,
                parsedValue: parseOptOutCookie(value),
                description: 'Privacy Manager opt-out settings'
            };
        }
        // CookieConsent integration
        else if (key === 'cc_cookie') {
            tealiumCookies.consent[key] = {
                name: key,
                value: value,
                parsedValue: value,
                description: 'CookieConsent integration cookie (182 days duration)'
            };
        }
        // Web Companion environment cookies
        else if (key.match(/utag_env_\w+_\w+/)) {
            tealiumCookies.webCompanion[key] = {
                name: key,
                value: value,
                parsedValue: value,
                description: 'Web Companion environment selection'
            };
        }
        // Other Tealium-related cookies (but skip duplicates that start with cp.)
        else if ((key.includes('utag_') || key.includes('tealium')) && !key.startsWith('cp.')) {
            tealiumCookies.thirdParty[key] = {
                name: key,
                value: value,
                parsedValue: value,
                description: 'Other Tealium-related cookie'
            };
        }
    });
    
    updateTealiumCookiesDisplay(tealiumCookies);
    return tealiumCookies;
}
// Expose immediately for onclick handlers
window.analyzeTealiumCookies = analyzeTealiumCookies;

/**
 * Get description for utag_main cookie variables
 */
function getUtagMainDescription(key) {
    const descriptions = {
        'ses_id': 'Unix/Epoch timestamp of session start (milliseconds)',
        'v_id': 'Unique visitor identifier for privacy compliance (set by Collect tag in v4.50+)',
        '_st': 'Unix/Epoch timestamp of session timeout (milliseconds)',
        '_se': 'Number of events during current session',
        '_ss': 'First page in session indicator (1=first page, 0=not first)',
        '_pn': 'Number of pages viewed in current session',
        '_sn': 'Number of sessions for this visitor',
        'dc_group': 'Random number for Collect tag sampling',
        'dc_visit': 'Number of sessions where Collect tag fired',
        'dc_event': 'Number of events where Collect tag fired',
        'dc_region': 'AudienceStream region for visit session storage'
    };
    return descriptions[key] || 'Custom or unknown utag_main variable';
}

/**
 * Parse utag_main cookie values for display
 */
function parseUtagMainValue(key, value) {
    switch (key) {
        case 'ses_id':
        case '_st':
            const timestamp = parseInt(value);
            return timestamp ? new Date(timestamp).toLocaleString() : value;
        case '_se':
        case '_pn':
        case '_sn':
        case 'dc_visit':
        case 'dc_event':
            return parseInt(value) || value;
        case '_ss':
            return value === '1' ? 'First page' : 'Not first page';
        case 'v_id':
            return value ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : 'Not set';
        default:
            return value;
    }
}

/**
 * Parse legacy utag_main multi-value cookie (v4.49 and earlier)
 */
function parseUtagMainLegacy(value) {
    const pairs = {};
    const parts = value.split('$');
    parts.forEach(part => {
        const [key, val] = part.split(':');
        if (key && val !== undefined) {
            pairs[key] = parseUtagMainValue(key, val);
        }
    });
    return pairs;
}

/**
 * Parse Consent Manager cookie
 */
function parseConsentManagerCookie(value) {
    try {
        const decoded = decodeURIComponent(value);
        const parsed = JSON.parse(decoded);
        return {
            consentCategories: parsed.consent || {},
            timestamp: parsed.ts ? new Date(parsed.ts).toLocaleString() : 'Unknown',
            version: parsed.v || 'Unknown'
        };
    } catch (e) {
        return { raw: value, error: 'Could not parse consent data' };
    }
}

/**
 * Parse Privacy Manager opt-out cookie
 */
function parseOptOutCookie(value) {
    const optOuts = value.split('|').filter(Boolean);
    return {
        optedOutCategories: optOuts,
        count: optOuts.length
    };
}

/**
 * Update Tealium cookies display
 */
function updateTealiumCookiesDisplay(tealiumCookies) {
    const container = document.getElementById('tealiumCookies');
    if (!container) {
        return;
    }
    
    
    const categories = [
        { key: 'utagMain', title: 'Built-in utag_main Cookies', icon: 'fas fa-cookie-bite', color: 'blue' },
        { key: 'consent', title: 'Consent Management', icon: 'fas fa-shield-alt', color: 'green' },
        { key: 'collect', title: 'Collect Tag Cookies', icon: 'fas fa-database', color: 'purple' },
        { key: 'webCompanion', title: 'Web Companion', icon: 'fas fa-tools', color: 'orange' },
        { key: 'extensions', title: 'Extension Cookies', icon: 'fas fa-puzzle-piece', color: 'indigo' },
        { key: 'thirdParty', title: 'Other Tealium Cookies', icon: 'fas fa-external-link-alt', color: 'gray' }
    ];
    
    let totalCookies = 0;
    Object.values(tealiumCookies).forEach(category => {
        totalCookies += Object.keys(category).length;
    });
    
    // Update count badge
    const countBadge = document.getElementById('tealiumCookiesCountBadge');
    if (countBadge) {
        countBadge.textContent = totalCookies;
    }
    
    if (totalCookies === 0) {
        container.innerHTML = `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div class="flex items-center">
                    <i class="fas fa-info-circle text-yellow-500 mr-3"></i>
                    <div>
                        <h5 class="text-yellow-800 font-medium">No Tealium Cookies Found</h5>
                        <div class="text-yellow-700 text-sm mt-1 space-y-1">
                            <p>• Make sure Tealium utag.js is loaded and has fired</p>
                            <p>• Check if cookies are being set in browser cookies or data layer</p>
                            <p>• Verify the profile has cookie-setting extensions or tags</p>
                            <p>• Try clicking the "Refresh" button after page activity</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    const html = categories.map(category => {
        const cookies = tealiumCookies[category.key];
        const cookieCount = Object.keys(cookies).length;
        
        if (cookieCount === 0) return '';
        
        return `
            <div class="mb-6">
                <h5 class="flex items-center text-sm font-semibold text-${category.color}-800 mb-3">
                    <i class="${category.icon} text-${category.color}-500 mr-2"></i>
                    ${category.title}
                    <span class="ml-2 bg-${category.color}-100 text-${category.color}-800 text-xs px-2 py-1 rounded-full">${cookieCount}</span>
                </h5>
                <div class="space-y-2">
                    ${Object.entries(cookies).map(([key, cookie]) => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-${category.color}-400">
                            <div class="flex items-center flex-1 min-w-0">
                                <div class="font-mono text-sm font-medium text-gray-900 mr-2">${escapeHtml(cookie.name)}</div>
                                <div class="relative inline-block">
                                    <i class="fas fa-info-circle text-gray-400 text-xs cursor-help hover:text-blue-500 peer inline-block" style="padding: 2px;"></i>
                                    <div class="absolute left-1/2 top-full mt-2 bg-gray-800 text-white text-sm rounded-lg px-6 py-4 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 shadow-xl max-w-lg break-words leading-relaxed pointer-events-none" style="z-index: 1000; white-space: normal; transform: translateX(-50%); min-width: 320px;">
                                        ${escapeHtml(cookie.description)}
                                        <div class="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-800 rotate-45"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="text-sm text-blue-600 font-medium truncate ml-4">
                                ${typeof cookie.parsedValue === 'object' ? JSON.stringify(cookie.parsedValue) : escapeHtml(String(cookie.parsedValue))}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).filter(Boolean).join('');
    
    container.innerHTML = html || '<div class="text-gray-500 text-sm p-4">No Tealium cookies found</div>';
}

/**
 * Analyze utag.cfg settings
 */
function analyzeUtagCfgSettings() {
    const container = document.getElementById('utagCfgSettings');
    if (!container) {
        return;
    }

    
    const settings = {};
    
    // Check if utag is loaded
    if (typeof window.utag === 'undefined') {
        container.innerHTML = '<div class="text-gray-500">Tealium not loaded</div>';
        return;
    }
    
    // Get utag.cfg settings
    if (window.utag.cfg) {
        Object.assign(settings, window.utag.cfg);
    }
    
    
    // Define setting descriptions for tooltips (based on official Tealium documentation)
    const settingDescriptions = {
        'always_set_v_id': 'Set the utag_main_v_id cookie or v_id component of utag_main. Default: false',
        'cmcookiens': 'Consent management cookie name.',
        'consentPeriod': 'Set the number of days to retain the user\'s consent preference.',
        'dom_complete': 'Delay tags until the DOM complete (load) event.',
        'domain': 'Override the domain used to set cookies.',
        'gdprDLRef': 'Specify the name of the data layer variable which stores the language setting to be used by the consent manager.',
        'ignoreLocalStorage': 'Do not add local storage variables to the data layer.',
        'ignoreSessionStorage': 'Do not add session storage variables to the data layer.',
        'load_rules_ajax': 'Disable load rules after page load (legacy).',
        'load_rules_at_wait': 'Run load rules after extensions (legacy).',
        'lowermeta': 'Lower-case meta tag names and values (legacy).',
        'lowerqp': 'Lower-case query string parameter names and values (legacy).',
        'noload': 'Disable all functionality.',
        'noview': 'Disable the automatic tracking call on initial page load.',
        'nocookie': 'Disable the utag_main cookie.',
        'nonblocking_tags': 'Make all tags nonblocking to improve performance and Interaction to Next Paint (INP) scores in extreme cases. Default: false.',
        'path': 'Specifies the publishing path.',
        'readywait': 'Halt operations until the DOM-ready browser event.',
        'secure_cookie': 'Set the attribute string to secure for all utag_main cookies set by the Persist Data Values extension and the utag.loader.SC method.',
        'session_timeout': 'Set the session expiration time (in milliseconds).',
        'split_cookie': 'Splits the utag_main cookie into standalone cookies. Default: true',
        'split_cookie_allowlist': 'An array of allowed utag_main subcookies or standalone cookies.',
        'suppress_before_load_rules_with_uids': 'Force legacy behavior that skips extensions scoped to Before Load Rules when tracking tags by UID. Default: false.',
        'waittimer': 'Set a time to delay (in milliseconds) before loading tags.',
        'utagdb': 'Debug mode - Shows detailed console logging for troubleshooting',
        'nocache': 'Disables browser caching of utag files',
        'order': 'Controls the order of tag execution (asc/desc)',
        'template': 'Template version being used for this profile',
        'custom_domain': 'Custom domain for utag files',
        'ut': 'Tealium collect endpoint settings',
        'datasource': 'Data source identifier for this profile',
        'utid': 'Unique Tealium profile identifier',
        'v': 'Version identifier for this profile configuration'
    };
    
    const settingNames = {
        'always_set_v_id': 'Always Set Visitor ID',
        'cmcookiens': 'Consent Management Cookie Name',
        'consentPeriod': 'Consent Period',
        'dom_complete': 'Delay Tags Until DOM Complete',
        'domain': 'Override Cookie Domain',
        'gdprDLRef': 'GDPR Data Layer Reference',
        'ignoreLocalStorage': 'Ignore Local Storage',
        'ignoreSessionStorage': 'Ignore Session Storage',
        'load_rules_ajax': 'Disable Load Rules After Page Load',
        'load_rules_at_wait': 'Run Load Rules After Extensions',
        'lowermeta': 'Lowercase Meta Tags',
        'lowerqp': 'Lowercase Query Parameters',
        'noload': 'Disable All Functionality',
        'noview': 'Disable Automatic Page View Tracking',
        'nocookie': 'Disable utag_main Cookie',
        'nonblocking_tags': 'Load Tags Asynchronously',
        'path': 'Publishing Path',
        'readywait': 'Wait for DOM Ready Event',
        'secure_cookie': 'Secure Cookie Attribute',
        'session_timeout': 'Session Timeout',
        'split_cookie': 'Split utag_main Cookie',
        'split_cookie_allowlist': 'Split Cookie Allowlist',
        'suppress_before_load_rules_with_uids': 'Skip Before Load Rules Extensions',
        'waittimer': 'Wait Timer',
        'utagdb': 'Debug Mode',
        'nocache': 'No Cache',
        'order': 'Tag Order',
        'template': 'Template',
        'custom_domain': 'Custom Domain',
        'ut': 'Collect Settings',
        'datasource': 'Data Source',
        'utid': 'Profile ID',
        'v': 'Version'
    };
    
    // Default settings to show even if not explicitly set
    const defaultSettings = {
        'always_set_v_id': false,
        'consentPeriod': 365,
        'dom_complete': false,
        'ignoreLocalStorage': false,
        'ignoreSessionStorage': false,
        'load_rules_ajax': true,
        'load_rules_at_wait': false,
        'lowermeta': false,
        'lowerqp': false,
        'noload': false,
        'noview': false,
        'nocookie': false,
        'nonblocking_tags': false,
        'readywait': false,
        'secure_cookie': false,
        'session_timeout': 1800000,
        'split_cookie': true,
        'suppress_before_load_rules_with_uids': false,
        'utagdb': false,
        'nocache': false,
        'order': 'asc'
    };
    
    // Merge with defaults
    const allSettings = { ...defaultSettings, ...settings };
    
    const html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${Object.entries(allSettings).map(([key, value]) => {
                const displayName = settingNames[key] || key;
                const description = settingDescriptions[key] || `Custom utag.cfg setting: ${key}. This setting may be profile-specific or a custom configuration added by your implementation.`;
                const isSet = settings.hasOwnProperty(key);
                const displayValue = formatSettingValue(key, value, isSet);
                const statusClass = getSettingStatusClass(key, value, isSet);
                
                return `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div class="flex items-center">
                            <span class="font-medium text-gray-900">
                                ${displayName} (<code class="text-sm text-blue-600">${key}</code>)
                            </span>
                            <div class="relative ml-2 inline-block">
                                <i class="fas fa-info-circle text-gray-400 text-xs cursor-help hover:text-blue-500 peer inline-block" style="padding: 2px;"></i>
                                <div class="absolute left-1/2 top-full mt-2 bg-gray-800 text-white text-sm rounded-lg px-6 py-4 opacity-0 peer-hover:opacity-100 transition-opacity duration-200 shadow-xl max-w-lg break-words leading-relaxed pointer-events-none" style="z-index: 1000; white-space: normal; transform: translateX(-50%); min-width: 320px;">
                                    ${escapeHtml(description)}
                                    <div class="absolute -top-2 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-800 rotate-45"></div>
                                </div>
                            </div>
                        </div>
                        <div class="${statusClass}">${displayValue}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}
// Expose immediately for onclick handlers
window.analyzeUtagCfgSettings = analyzeUtagCfgSettings;

/**
 * Format setting value for display
 */
function formatSettingValue(key, value, isSet) {
    if (!isSet) {
        if (key === 'domain_override') return 'Not set';
        if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
    }
    
    switch (key) {
        case 'session_timeout':
            const minutes = Math.round(value / 1000 / 60);
            return `${value} (${minutes} min)`;
        case 'utagdb':
        case 'noview':
        case 'split_cookies':
        case 'noload':
        case 'nocache':
            return value ? 'Enabled' : 'Disabled';
        case 'domain_override':
            return value || 'Not set';
        default:
            return value.toString();
    }
}

/**
 * Get CSS class for setting status
 */
function getSettingStatusClass(key, value, isSet) {
    if (!isSet && key === 'domain_override') {
        return 'text-gray-500 text-sm';
    }
    
    if (typeof value === 'boolean') {
        return value ? 'text-green-600 text-sm font-medium' : 'text-red-600 text-sm font-medium';
    }
    
    return 'text-blue-600 text-sm font-medium';
}

/**
 * Combined analysis function for debugging
 */
function runAllProfileAnalysis() {
    
    if (typeof window.analyzeTealiumCookies === 'function') {
        window.analyzeTealiumCookies();
    } else {
    }
    
    if (typeof window.analyzeUtagCfgSettings === 'function') {
        window.analyzeUtagCfgSettings();
    } else {
    }
    
}

/**
 * Initialize Profile Inspector section - restore data and auto-analyze if needed
 */
function initializeProfileInspector() {
    
    // Check if we have existing profile analysis data
    if (window.profileAnalysis) {
        
        // Restore all displays with the cached analysis
        updateProfileOverview(window.profileAnalysis.overview);
        updateProfileStats(window.profileAnalysis.stats);
        updateTagsAnalysis(window.profileAnalysis.tags);
        updateExtensionsAnalysis(window.profileAnalysis.extensions);
        updateLoadRulesAnalysis(window.profileAnalysis.loadRules);
        
        // Restore cookies and utag.cfg if available
        if (typeof window.analyzeTealiumCookies === 'function') {
            window.analyzeTealiumCookies();
        }
        if (typeof window.analyzeUtagCfgSettings === 'function') {
            window.analyzeUtagCfgSettings();
        }
        
        // Ensure session is active if we have analysis data
        if (typeof window.sessionManager !== 'undefined' && !window.sessionManager.isSessionActive) {
            window.sessionManager.startNewSession();
        }
    } else if (window.utag && window.utag.loader && window.utag.loader.cfg) {
        // Auto-analyze if Tealium is loaded but no cached data
        inspectCurrentProfile();
        
        // Mark session as active since Tealium is loaded
        if (typeof window.sessionManager !== 'undefined' && !window.sessionManager.isSessionActive) {
            window.sessionManager.startNewSession();
        }
    } else {
        // Show empty state
        updateProfileStats(null);
        updateProfileOverview({
            account: 'Unknown',
            profile: 'Unknown', 
            environment: 'Unknown',
            version: 'N/A'
        });
    }
}
// Expose immediately for section initialization
window.initializeProfileInspector = initializeProfileInspector;


// Expose functions globally for HTML event handlers (keep at end for reference)
// Main exports moved to immediate after function declarations
window.inspectCurrentProfile = inspectCurrentProfile;
window.initializeProfileInspector = initializeProfileInspector;
window.exportDataLayer = exportDataLayer;
window.updateEnvironmentStatus = updateEnvironmentStatus;
window.viewExtensionCode = viewExtensionCode;
window.viewLoadRuleDetails = viewLoadRuleDetails;
window.closeExtensionCodeModal = closeExtensionCodeModal;
window.closeLoadRuleModal = closeLoadRuleModal;
window.closeTagCodeModal = closeTagCodeModal;
window.analyzeTealiumCookies = analyzeTealiumCookies;
window.analyzeUtagCfgSettings = analyzeUtagCfgSettings;
window.runAllProfileAnalysis = runAllProfileAnalysis;
window.openTagFile = openTagFile;

console.log('✅ Profile Inspector functions exposed globally:', {
    inspectCurrentProfile: typeof window.inspectCurrentProfile,
    updateEnvironmentStatus: typeof window.updateEnvironmentStatus,
    analyzeTealiumCookies: typeof window.analyzeTealiumCookies,
    analyzeUtagCfgSettings: typeof window.analyzeUtagCfgSettings,
    openTagFile: typeof window.openTagFile,
    closeTagCodeModal: typeof window.closeTagCodeModal
});
