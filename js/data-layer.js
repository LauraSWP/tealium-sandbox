/**
 * Data Layer Management System for Tealium Sandbox
 * Provides comprehensive data layer debugging and management tools
 */

// Global data layer state with protection against corruption
let _currentDataLayer = {};

// Proxy to protect currentDataLayer from being corrupted to an array
const currentDataLayerHandler = {
    set(target, prop, value) {
        // Allow all normal property assignments
        // We've fixed the direct assignment issues, so this is just for safety
        target[prop] = value;
        return true;
    }
};

let currentDataLayer = new Proxy(_currentDataLayer, currentDataLayerHandler);

// Expose the internal object globally for session manager access
window._currentDataLayer = _currentDataLayer;

let dataLayerHistory = [];
let isMonitoring = false;
let monitorInterval = null;

/**
 * Initialize data layer functionality
 */
function initializeDataLayer() {
    console.log('🔧 Initializing Data Layer Management...');
    
    // Load current data layer state
    loadCurrentDataLayer();
    
    // Update displays
    updateDataLayerTable();
    updateDataLayerEditor();
    
    // Set up real-time monitoring if requested
    if (isMonitoring) {
        startDataLayerMonitoring();
    }
    
    // Mark session as active if we have data or Tealium loaded
    if (typeof window.sessionManager !== 'undefined') {
        if (Object.keys(currentDataLayer).length > 0 || (typeof window.utag !== 'undefined' && window.utag.loader)) {
            if (!window.sessionManager.isSessionActive) {
                window.sessionManager.startNewSession();
            }
        }
    }
}

/**
 * Load current data layer from various sources
 */
function loadCurrentDataLayer() {
    // Ensure currentDataLayer is always an object, never an array
    if (!_currentDataLayer || Array.isArray(_currentDataLayer) || typeof _currentDataLayer !== 'object' || Object.keys(_currentDataLayer).length === 0) {
        // Clear the internal object instead of reassigning
        Object.keys(_currentDataLayer).forEach(key => delete _currentDataLayer[key]);
    }
    
    // Priority order: utag_data > utag.data > window.dataLayer > custom
    if (typeof window.utag_data !== 'undefined') {
        Object.assign(currentDataLayer, window.utag_data);
    }
    
    if (typeof window.utag !== 'undefined' && window.utag.data) {
        Object.assign(currentDataLayer, window.utag.data);
    }
    
    if (typeof window.dataLayer !== 'undefined' && Array.isArray(window.dataLayer)) {
        // Extract latest state from GTM dataLayer array
        const latestData = {};
        window.dataLayer.forEach(item => {
            if (typeof item === 'object' && item !== null && !Array.isArray(item) && !('0' in item)) {
                // Only process objects that are not array-like (don't have numeric keys)
                Object.assign(latestData, item);
            }
        });
        Object.assign(currentDataLayer, latestData);
    }
    
    // Add browser/environment data
    currentDataLayer.dom = currentDataLayer.dom || {};
    currentDataLayer.dom.url = window.location.href;
    currentDataLayer.dom.pathname = window.location.pathname;
    currentDataLayer.dom.search = window.location.search;
    currentDataLayer.dom.hash = window.location.hash;
    currentDataLayer.dom.title = document.title;
    currentDataLayer.dom.referrer = document.referrer;
    
    // Data layer loaded successfully
}

/**
 * Update data layer table display
 */
function updateDataLayerTable() {
    const container = document.getElementById('dataLayerTableContainer');
    if (!container) return;
    
    const variables = Object.keys(currentDataLayer);
    if (variables.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-database text-gray-300 text-3xl mb-3"></i>
                <p>No data layer variables found</p>
                <p class="text-sm mt-1">Load a Tealium profile or add variables manually</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variable Name</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    variables.forEach(key => {
        const value = currentDataLayer[key];
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        const displayValue = formatValueForDisplay(value);
        const isObject = typeof value === 'object' && value !== null;
        
        html += `
            <tr class="hover:bg-gray-50" data-variable="${key}">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-medium text-gray-900">${escapeHtml(key)}</div>
                    ${key.startsWith('dom.') ? '<div class="text-xs text-blue-600">Auto-generated</div>' : ''}
                </td>
                <td class="px-6 py-4">
                    <div class="inline-edit-container" style="max-width: 300px;">
                        <input type="text" 
                               id="edit-${key}" 
                               value="${escapeHtml(typeof value === 'string' ? value : JSON.stringify(value))}"
                               class="w-full px-2 py-1 text-sm border border-transparent rounded hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${isObject ? 'font-mono' : ''}"
                               style="background: transparent; word-break: break-word;"
                               onblur="autoApplyDataLayerEdit('${key}', this.value)"
                               onkeypress="if(event.key==='Enter') { this.blur(); }"
                               title="Click to edit, press Enter or click away to save"
                        />
                        <div class="text-xs text-gray-500 mt-1 hidden auto-apply-status" id="status-${key}">
                            <i class="fas fa-spinner fa-spin mr-1"></i>Applying changes...
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(valueType)}">
                        ${valueType}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onclick="copyDataLayerVariable('${key}')" class="text-green-600 hover:text-green-900" title="Copy value">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button onclick="deleteDataLayerVariable('${key}')" class="text-red-600 hover:text-red-900" title="Delete variable">
                        <i class="fas fa-trash"></i>
                    </button>
                    <div class="inline-block ml-2">
                        <span class="text-xs text-gray-400" title="Auto-save enabled">
                            <i class="fas fa-magic"></i>
                        </span>
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
        
        <!-- Summary Stats -->
        <div class="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div>Total variables: ${variables.length}</div>
            <div class="flex space-x-4">
                <span>Objects: ${variables.filter(k => typeof currentDataLayer[k] === 'object' && currentDataLayer[k] !== null).length}</span>
                <span>Strings: ${variables.filter(k => typeof currentDataLayer[k] === 'string').length}</span>
                <span>Numbers: ${variables.filter(k => typeof currentDataLayer[k] === 'number').length}</span>
                <span>Booleans: ${variables.filter(k => typeof currentDataLayer[k] === 'boolean').length}</span>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Update data layer JSON editor
 */
function updateDataLayerEditor() {
    const editor = document.getElementById('dataLayerEditor');
    if (!editor) return;
    
    try {
        editor.value = JSON.stringify(currentDataLayer, null, 2);
    } catch (error) {
        editor.value = '// Error displaying data layer: ' + error.message;
    }
}

/**
 * Search data layer variables
 */
function searchDataLayer() {
    const searchTerm = document.getElementById('dataLayerSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#dataLayerTableContainer tr[data-variable]');
    
    rows.forEach(row => {
        const variableName = row.getAttribute('data-variable').toLowerCase();
        const variableValue = JSON.stringify(currentDataLayer[row.getAttribute('data-variable')]).toLowerCase();
        
        if (variableName.includes(searchTerm) || variableValue.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
    
    // Update visible count
    const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
    const totalRows = rows.length;
    
    const statusElement = document.getElementById('searchStatus');
    if (statusElement) {
        statusElement.textContent = searchTerm ? 
            `Showing ${visibleRows.length} of ${totalRows} variables` : 
            `${totalRows} variables`;
    }
}

/**
 * Add data layer variable
 */
function addDataLayerVariable() {
    const nameSelect = document.getElementById('dataLayerVariable');
    const customName = document.getElementById('customVariableName');
    const value = document.getElementById('variableValue');
    
    const variableName = nameSelect?.value || customName?.value;
    const variableValue = value?.value;
    
    if (!variableName || !variableValue) {
        showNotification('Please enter both variable name and value', 'error');
        return;
    }
    
    // Try to parse value as JSON, fallback to string
    let parsedValue;
    try {
        parsedValue = JSON.parse(variableValue);
    } catch {
        parsedValue = variableValue;
    }
    
    // Add to current data layer
    currentDataLayer[variableName] = parsedValue;
    // Variable added successfully
    
    // ✨ IMMEDIATELY UPDATE LIVE TEALIUM DATA LAYER
    updateLiveTealiumDataLayer();
    
    // Save session after data layer change
    if (typeof window.sessionManager !== 'undefined' && window.sessionManager.isSessionActive) {
        window.sessionManager.saveSession();
    }
    
    // Update displays
    updateDataLayerTable();
    updateDataLayerEditor();
    
    // Clear inputs
    if (nameSelect) nameSelect.value = '';
    if (customName) customName.value = '';
    if (value) value.value = '';
    
    showNotification(`Variable "${variableName}" added and applied to Tealium`, 'success');
}

/**
 * Update variable input based on selection
 */
function updateVariableInput() {
    const select = document.getElementById('dataLayerVariable');
    const customInput = document.getElementById('customVariableName');
    
    if (select && customInput) {
        if (select.value) {
            customInput.style.display = 'none';
            customInput.value = '';
        } else {
            customInput.style.display = 'block';
            customInput.focus();
        }
    }
}

/**
 * Auto-apply data layer edits when user finishes editing inline
 */
function autoApplyDataLayerEdit(variableName, newValue) {
    const originalValue = currentDataLayer[variableName];
    const originalDisplayValue = typeof originalValue === 'string' ? originalValue : JSON.stringify(originalValue);
    
    // Only apply if value actually changed
    if (newValue === originalDisplayValue) {
        return;
    }
    
    // Show applying status
    const statusElement = document.getElementById(`status-${variableName}`);
    if (statusElement) {
        statusElement.classList.remove('hidden');
    }
    
    // Update the variable
    updateDataLayerVariable(variableName, newValue);
    
    // Hide status after a short delay
    setTimeout(() => {
        if (statusElement) {
            statusElement.classList.add('hidden');
        }
    }, 1000);
}

/**
 * Update a specific variable value directly (for table editing)
 */
function updateDataLayerVariable(variableName, newValue) {
    // Try to parse value as JSON, fallback to string
    let parsedValue;
    try {
        parsedValue = JSON.parse(newValue);
    } catch {
        parsedValue = newValue;
    }
    
    // Update internal data layer
    currentDataLayer[variableName] = parsedValue;
    
    // Update live Tealium data layers IMMEDIATELY
    if (typeof window.utag_data !== 'undefined') {
        window.utag_data[variableName] = parsedValue;
    } else {
        window.utag_data = window.utag_data || {};
        window.utag_data[variableName] = parsedValue;
    }
    
    // Update utag.data and trigger Tealium processing
    if (typeof window.utag !== 'undefined') {
        if (window.utag.data) {
            window.utag.data[variableName] = parsedValue;
        }
        
        // Trigger Tealium to process the change
        if (typeof window.utag.link === 'function') {
            const linkData = {};
            linkData[variableName] = parsedValue;
            window.utag.link(linkData);
        }
    }
    
    // Update JSON editor to reflect changes
    updateDataLayerEditor();
    
    // Save session after data layer change
    if (typeof window.sessionManager !== 'undefined' && window.sessionManager.isSessionActive) {
        window.sessionManager.saveSession();
    }
    
    showNotification(`"${variableName}" updated & applied to Tealium`, 'success', 2000);
}

/**
 * Load preset data layer
 */
function loadPresetDataLayer(presetType) {
    let preset = {};
    
    switch (presetType) {
        case 'ecommerce':
            preset = {
                page_name: 'Product Detail Page',
                page_type: 'product',
                page_url: window.location.href,
                site_section: 'catalog',
                product_id: 'PROD-12345',
                product_name: 'Sample Product',
                product_category: 'Electronics',
                product_subcategory: 'Smartphones',
                product_price: '599.99',
                product_quantity: '1',
                currency: 'USD',
                product_brand: 'SampleBrand',
                product_availability: 'in_stock',
                user_type: 'registered',
                customer_id: 'CUST-67890'
            };
            break;
            
        case 'content':
            preset = {
                page_name: 'Article Page',
                page_type: 'article',
                page_url: window.location.href,
                site_section: 'blog',
                content_type: 'article',
                content_category: 'technology',
                content_subcategory: 'web_development',
                article_id: 'ART-54321',
                author: 'John Doe',
                publish_date: '2024-01-15',
                word_count: '1250',
                read_time: '5 min',
                tags: ['tealium', 'analytics', 'javascript'],
                content_length: 'medium'
            };
            break;
            
        case 'user':
            preset = {
                page_name: 'User Dashboard',
                page_type: 'account',
                page_url: window.location.href,
                site_section: 'account',
                user_id: 'USER-98765',
                user_type: 'premium',
                user_status: 'active',
                customer_id: 'CUST-67890',
                login_status: 'logged_in',
                membership_level: 'gold',
                registration_date: '2023-06-15',
                last_login: new Date().toISOString(),
                account_age_days: '145',
                total_orders: '12',
                lifetime_value: '2450.00'
            };
            break;
    }
    
    // Merge with current data layer
    Object.assign(currentDataLayer, preset);
    
    // ✨ IMMEDIATELY UPDATE LIVE TEALIUM DATA LAYER
    updateLiveTealiumDataLayer();
    
    // Update displays
    updateDataLayerTable();
    updateDataLayerEditor();
    
    showNotification(`${presetType.charAt(0).toUpperCase() + presetType.slice(1)} preset loaded and applied to Tealium`, 'success');
}

/**
 * Data layer validation following Tealium best practices
 */
function validateDataLayer() {
    try {
        // Get data from both editor and live utag_data
        const editorContent = document.getElementById('dataLayerEditor').value.trim();
        const liveData = typeof window.utag_data !== 'undefined' ? window.utag_data : {};
        const utagProcessedData = typeof window.utag !== 'undefined' && window.utag.data ? window.utag.data : {};
        
        let dataToValidate = {};
        
        // Prioritize live data over editor content
        if (Object.keys(liveData).length > 0) {
            dataToValidate = { ...liveData };
        } else if (editorContent) {
            dataToValidate = JSON.parse(editorContent);
        } else {
            dataToValidate = { ...currentDataLayer };
        }
        
        const results = [];
    const warnings = [];
        const errors = [];
        
        // Tealium default/system variables to ignore in validation
        // Note: We include dom.*, meta.*, tealium_*, ut.*, cp.* variables as these are system-generated
        // but we KEEP page_name, page_type, etc. as these are user-customizable
        const defaultUtagVars = [
            'dom.referrer', 'dom.pathname', 'dom.query_string', 'dom.hash', 'dom.title', 'dom.url',
            'meta.charset', 'meta.title', 'meta.description', 'meta.keywords',
            'js_page.js_page_name', 'js_page.js_page_title',
            'session_id', 'visitor_id', 'profile_timestamp', 'tealium_profile', 'tealium_account',
            'tealium_environment', 'tealium_random', 'tealium_visitor_id', 'tealium_session_id',
            'tealium_session_number', 'tealium_session_event_number', 'tealium_library_name',
            'tealium_library_version', 'tealium_timestamp_epoch', 'tealium_timestamp_utc',
            'tealium_timestamp_local', 'tealium_event', 'ut.visitor_id', 'ut.session_id',
            'ut.domain', 'ut.version', 'ut.event', 'ut.account', 'ut.profile', 'ut.env',
            'cp.utag_main_v_id', 'cp.utag_main_ses_id', 'cp.CONSENTMGR'
        ];
        
        // Sandbox-specific variables to ignore (created by this sandbox application)
        const sandboxVars = [
            'ls.tealium-events-history', 'ls.tealium-session', 'ls.tealium-settings',
            'ls.tealium-profiles', 'ls.tealium-data-layer'
        ];
        
        // Filter out default utag variables and sandbox-created variables
        const customData = Object.fromEntries(
            Object.entries(dataToValidate).filter(([key]) => {
                // Check exact matches first
                if (defaultUtagVars.includes(key) || sandboxVars.includes(key)) {
                    return false;
                }
                
                // Check prefix patterns for system variables
                const systemPrefixes = ['dom.', 'meta.', 'js_page.', 'ut.', 'tealium_', 'va.', 'ls.', 'ss.', '_c', 'is_xandr', 'xandr_'];
                if (systemPrefixes.some(prefix => key.startsWith(prefix))) {
                    return false;
                }
                
                return true;
            })
        );
        
        if (Object.keys(customData).length === 0) {
            warnings.push('No custom data layer variables found (system variables are ignored)');
        }
        
        // Tealium Best Practices Validation
        
        // 1. Naming Convention Checks
        Object.keys(customData).forEach(key => {
            // Check for spaces in variable names
            if (key.includes(' ')) {
                errors.push(`Variable "${key}" contains spaces. Use underscores instead.`);
            }
            
            // Check for camelCase (should be snake_case)
            if (/[A-Z]/.test(key) && !key.includes('_')) {
                warnings.push(`Variable "${key}" uses camelCase. Consider snake_case for consistency.`);
            }
            
            // Check for very long variable names
            if (key.length > 50) {
                warnings.push(`Variable "${key}" is very long (${key.length} chars). Consider shorter names.`);
            }
            
            // Check for reserved JavaScript keywords
            const reservedWords = ['class', 'function', 'var', 'let', 'const', 'return', 'if', 'else', 'for', 'while'];
            if (reservedWords.includes(key.toLowerCase())) {
                errors.push(`Variable "${key}" is a reserved JavaScript keyword.`);
            }
        });
        
        // 2. Required/Recommended Variables Check
        const requiredVars = {
            'page_name': 'Identifies the specific page for analytics',
            'page_type': 'Categorizes the page type (e.g., home, product, checkout)',
            'site_section': 'Identifies the main section of the site'
        };
        
        Object.entries(requiredVars).forEach(([varName, description]) => {
            // Check in the original data to validate, not just customData
            if (!dataToValidate[varName]) {
                warnings.push(`Missing recommended variable "${varName}": ${description}`);
            }
            // Remove success message - only show warnings/errors
        });
        
        // 3. Data Type Validation
        Object.entries(customData).forEach(([key, value]) => {
            if (value === null || value === undefined) {
                warnings.push(`Variable "${key}" has null/undefined value`);
            } else if (typeof value === 'object' && !Array.isArray(value)) {
                warnings.push(`Variable "${key}" is an object. Consider flattening for better compatibility.`);
                } else if (Array.isArray(value)) {
                    if (value.length === 0) {
                        warnings.push(`Variable "${key}" is an empty array`);
                    }
                    // Remove success message for arrays - only show warnings/errors
            } else if (typeof value === 'string' && value.trim() === '') {
                warnings.push(`Variable "${key}" is an empty string`);
            }
        });
        
        // 4. E-commerce Specific Validation
        const ecommerceVars = ['product_id', 'product_name', 'product_category', 'product_price', 'order_id', 'order_total'];
        const hasEcommerce = ecommerceVars.some(varName => customData[varName]);
        
        if (hasEcommerce) {
            // E-commerce variables detected - only show warnings/errors
            
            // Check for currency when price is present
            if ((customData.product_price || customData.order_total) && !customData.currency) {
                warnings.push('Currency variable missing when price/total is present');
            }
            
            // Check for quantity when product is present
            if (customData.product_id && !customData.product_quantity) {
                warnings.push('Product quantity missing when product_id is present');
            }
        }
        
        // 5. User/Authentication Validation
        const userVars = ['user_id', 'customer_id', 'user_type', 'login_status'];
        const hasUserData = userVars.some(varName => customData[varName]);
        
        if (hasUserData) {
            // User/authentication variables detected - only show warnings/errors
            
            if (customData.user_id && !customData.user_type) {
                warnings.push('User type missing when user_id is present');
            }
        }
        
        // 6. Performance Checks
        const totalSize = JSON.stringify(customData).length;
        if (totalSize > 8192) { // 8KB limit
            warnings.push(`Data layer is large (${Math.round(totalSize/1024)}KB). Consider reducing size for performance.`);
        }
        
                // 7. Security Checks
                Object.entries(customData).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        // Check for potential PII
                        if (/\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/.test(value)) {
                            errors.push(`Variable "${key}" appears to contain an email address. Avoid PII in data layer.`);
                        }
                        
                        // Check for credit card patterns, but exclude Tealium system variables
                        if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(value)) {
                            // Exclude Tealium system variables that contain 16-digit numbers
                            const tealiumSystemVars = [
                                'tealium_random', 'tealium_visitor_id', 'ut.visitor_id', 
                                'visitor_id', 'session_id', 'tealium_session_id', 'ut.session_id'
                            ];
                            
                            if (!tealiumSystemVars.includes(key)) {
                                errors.push(`Variable "${key}" appears to contain credit card data. Remove immediately.`);
                            }
                        }
                        
                        // Check for phone numbers
                        if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(value)) {
                            warnings.push(`Variable "${key}" may contain a phone number. Consider if this is necessary.`);
                        }
                    }
                });
        
        // Compile results - only show warnings and errors (no success/info messages)
        const allResults = [
            ...warnings.map(msg => ({ type: 'warning', message: msg })),
            ...errors.map(msg => ({ type: 'error', message: msg }))
        ];
        
        // Add summary only if there are issues
        if (errors.length === 0 && warnings.length === 0) {
            allResults.push({ type: 'success', message: '✅ Data layer validation passed! No issues found.' });
        } else if (errors.length === 0) {
            allResults.unshift({ type: 'warning', message: `⚠️ ${warnings.length} warning(s) found. Consider addressing these for optimal implementation.` });
        } else {
            allResults.unshift({ type: 'error', message: `❌ ${errors.length} error(s) and ${warnings.length} warning(s) found. Please fix errors before deployment.` });
        }
        
        showValidationResults(allResults);
        
    } catch (error) {
        showValidationResults([
            { type: 'error', message: 'Validation failed: ' + error.message }
        ]);
    }
}

/**
 * Show validation results with enhanced styling
 */
function showValidationResults(results) {
    const container = document.getElementById('validationResults');
    if (!container) return;
    
    let html = '';
    
    results.forEach(result => {
        let bgColor, borderColor, textColor, icon;
        
        switch (result.type) {
            case 'success':
                bgColor = 'bg-green-50';
                borderColor = 'border-green-200';
                textColor = 'text-green-800';
                icon = 'fas fa-check-circle text-green-400';
                break;
            case 'warning':
                bgColor = 'bg-yellow-50';
                borderColor = 'border-yellow-200';
                textColor = 'text-yellow-800';
                icon = 'fas fa-exclamation-triangle text-yellow-400';
                break;
            case 'error':
                bgColor = 'bg-red-50';
                borderColor = 'border-red-200';
                textColor = 'text-red-800';
                icon = 'fas fa-times-circle text-red-400';
                break;
            case 'info':
                bgColor = 'bg-blue-50';
                borderColor = 'border-blue-200';
                textColor = 'text-blue-800';
                icon = 'fas fa-info-circle text-blue-400';
                break;
        }
        
        html += `
            <div class="${bgColor} ${borderColor} border rounded-lg p-3">
                <div class="flex items-start">
                    <i class="${icon} mt-0.5 mr-3"></i>
                    <div class="${textColor} text-sm">${result.message}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Format data layer
 */
function formatDataLayer() {
    const editor = document.getElementById('dataLayerEditor');
    if (!editor) return;
    
    try {
        const parsed = JSON.parse(editor.value);
        editor.value = JSON.stringify(parsed, null, 2);
        showNotification('Data layer formatted successfully', 'success');
    } catch (error) {
        showNotification('Invalid JSON format', 'error');
    }
}

/**
 * Clear data layer
 */
function clearDataLayer() {
    if (confirm('Are you sure you want to clear the entire data layer?')) {
        // Clear the object properties instead of reassigning
        Object.keys(_currentDataLayer).forEach(key => delete _currentDataLayer[key]);
        updateDataLayerTable();
        updateDataLayerEditor();
        showNotification('Data layer cleared', 'success');
    }
}

/**
 * Update data layer from editor
 */
/**
 * Update live Tealium data layer and trigger re-evaluation
 */
function updateLiveTealiumDataLayer() {
    // Update utag_data (primary Tealium data layer)
        if (typeof window.utag_data !== 'undefined') {
        Object.assign(window.utag_data, currentDataLayer);
        } else {
        window.utag_data = { ...currentDataLayer };
    }
    
    // Trigger Tealium re-evaluation
    if (typeof window.utag !== 'undefined' && typeof window.utag.view === 'function') {
        window.utag.view(window.utag_data);
        
        // Update utag.data after processing
        setTimeout(() => {
        if (typeof window.utag !== 'undefined' && window.utag.data) {
                Object.assign(window.utag.data, currentDataLayer);
                
                // Refresh the data layer table
                loadCurrentDataLayer();
                updateDataLayerTable();
            }
        }, 100);
        
        showNotification('Data layer updated and Tealium re-evaluated!', 'success');
    } else if (typeof window.utag_data !== 'undefined') {
        // If Tealium isn't loaded, just update utag.data if it exists
        if (typeof window.utag !== 'undefined' && window.utag.data) {
            Object.assign(window.utag.data, currentDataLayer);
        }
        showNotification('Data layer updated (Tealium will use on next load)', 'warning');
    } else {
        showNotification('Data layer updated locally only', 'info');
    }
}

function updateDataLayer() {
    const editor = document.getElementById('dataLayerEditor');
    if (!editor) return;
    
    try {
        const newDataLayer = JSON.parse(editor.value);
        
        // Update internal state - clear and repopulate instead of reassigning
        Object.keys(_currentDataLayer).forEach(key => delete _currentDataLayer[key]);
        Object.assign(_currentDataLayer, newDataLayer);
        
        // ✨ IMMEDIATELY UPDATE LIVE TEALIUM DATA LAYER
        updateLiveTealiumDataLayer();
        
        // Refresh displays
        updateDataLayerTable();
        
        // Log to console for debugging
        console.log('📊 Data layer updated from editor:', currentDataLayer);
        
    } catch (error) {
        showNotification('Invalid JSON format: ' + error.message, 'error');
    }
}

/**
 * Export data layer
 */
function exportDataLayer() {
    const dataStr = JSON.stringify(currentDataLayer, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-layer-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Data layer exported successfully', 'success');
}

/**
 * Import data layer
 */
function importDataLayer() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Merge with existing data layer
                Object.assign(currentDataLayer, importedData);
                
                // Update displays
                updateDataLayerTable();
                updateDataLayerEditor();
                
                showNotification('Data layer imported successfully', 'success');
            } catch (error) {
                showNotification('Invalid JSON file: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

/**
 * Toggle data layer monitoring
 */
function toggleDataLayerMonitor() {
    const button = document.getElementById('dataLayerMonitorBtn');
    if (!button) return;
    
    if (isMonitoring) {
        stopDataLayerMonitoring();
    } else {
        startDataLayerMonitoring();
    }
}

/**
 * Start data layer monitoring
 */
function startDataLayerMonitoring() {
    isMonitoring = true;
    const button = document.getElementById('dataLayerMonitorBtn');
    const output = document.getElementById('dataLayerMonitorOutput');
    
    if (button) {
        button.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Monitor';
        button.classList.remove('bg-teal-600', 'hover:bg-teal-700');
        button.classList.add('bg-red-600', 'hover:bg-red-700');
    }
    
    if (output) {
        output.innerHTML = '<div class="text-green-600 font-semibold mb-2">📡 Monitoring started...</div>';
    }
    
    // Store initial state
    let previousDataLayer = JSON.stringify(currentDataLayer);
    
    monitorInterval = setInterval(() => {
        loadCurrentDataLayer();
        const currentState = JSON.stringify(currentDataLayer);
        
        if (currentState !== previousDataLayer) {
            const timestamp = new Date().toLocaleTimeString();
            const changeLog = `<div class="text-xs text-gray-500 mb-1">[${timestamp}] Data layer changed</div>`;
            
            if (output) {
                output.innerHTML += changeLog;
                output.scrollTop = output.scrollHeight;
            }
            
            // Update table if visible
            updateDataLayerTable();
            
            previousDataLayer = currentState;
        }
    }, 1000);
    
    showNotification('Data layer monitoring started', 'success');
}

/**
 * Stop data layer monitoring
 */
function stopDataLayerMonitoring() {
    isMonitoring = false;
    const button = document.getElementById('dataLayerMonitorBtn');
    
    if (button) {
        button.innerHTML = '<i class="fas fa-play mr-2"></i>Start Monitor';
        button.classList.remove('bg-red-600', 'hover:bg-red-700');
        button.classList.add('bg-teal-600', 'hover:bg-teal-700');
    }
    
    if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
    }
    
    showNotification('Data layer monitoring stopped', 'info');
}

/**
 * Helper functions
 */
function formatValueForDisplay(value) {
    if (value === null) return '<span class="text-gray-400 italic">null</span>';
    if (value === undefined) return '<span class="text-gray-400 italic">undefined</span>';
    if (typeof value === 'string') return escapeHtml(value);
    if (typeof value === 'boolean') return value ? '<span class="text-green-600">true</span>' : '<span class="text-red-600">false</span>';
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) return `[${value.length} items]`;
    if (typeof value === 'object') return `{${Object.keys(value).length} properties}`;
    return escapeHtml(String(value));
}

function getTypeColor(type) {
    const colors = {
        'string': 'bg-blue-100 text-blue-800',
        'number': 'bg-green-100 text-green-800',
        'boolean': 'bg-purple-100 text-purple-800',
        'object': 'bg-orange-100 text-orange-800',
        'array': 'bg-red-100 text-red-800',
        'undefined': 'bg-gray-100 text-gray-800',
        'null': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
}

function editDataLayerVariable(key) {
    const currentValue = currentDataLayer[key];
    const displayValue = typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue);
    const newValue = prompt(`Edit value for "${key}":`, displayValue);
    
    if (newValue !== null && newValue !== displayValue) {
        // ✨ Use the new function that updates both utag_data and utag.data
        updateDataLayerVariable(key, newValue);
    }
}

function copyDataLayerVariable(key) {
    const value = JSON.stringify(currentDataLayer[key]);
    navigator.clipboard.writeText(value).then(() => {
        showNotification(`Variable "${key}" copied to clipboard`, 'success');
    }).catch(() => {
        showNotification('Failed to copy to clipboard', 'error');
    });
}

/**
 * Debug function to compare utag_data vs utag.data
 */
function debugTealiumDataLayers() {
    console.log('🐛 DEBUGGING TEALIUM DATA LAYERS');
    console.log('=====================================');
    
    // Check utag_data
    if (typeof window.utag_data !== 'undefined') {
        console.log('📊 window.utag_data (input data layer):', window.utag_data);
    } else {
        console.log('❌ window.utag_data is undefined');
    }
    
    // Check utag.data
    if (typeof window.utag !== 'undefined' && window.utag.data) {
        console.log('📊 window.utag.data (processed data layer):', window.utag.data);
    } else {
        console.log('❌ window.utag.data is undefined or Tealium not loaded');
    }
    
    // Check internal data layer
    console.log('📊 currentDataLayer (internal):', currentDataLayer);
    
    // Compare differences
    if (typeof window.utag_data !== 'undefined' && typeof window.utag !== 'undefined' && window.utag.data) {
        const utagDataKeys = Object.keys(window.utag_data);
        const utagProcessedKeys = Object.keys(window.utag.data);
        
        console.log('🔍 COMPARISON:');
        console.log('Keys in utag_data:', utagDataKeys.length);
        console.log('Keys in utag.data:', utagProcessedKeys.length);
        
        // Find differences
        const onlyInUtagData = utagDataKeys.filter(key => !(key in window.utag.data));
        const onlyInProcessed = utagProcessedKeys.filter(key => !(key in window.utag_data));
        const different = utagDataKeys.filter(key => 
            key in window.utag.data && window.utag_data[key] !== window.utag.data[key]
        );
        
        if (onlyInUtagData.length > 0) {
            console.log('⚠️ Variables only in utag_data:', onlyInUtagData);
        }
        if (onlyInProcessed.length > 0) {
            console.log('⚠️ Variables only in utag.data:', onlyInProcessed);
        }
        if (different.length > 0) {
            console.log('⚠️ Variables with different values:', different);
            different.forEach(key => {
                console.log(`  ${key}: utag_data="${window.utag_data[key]}" vs utag.data="${window.utag.data[key]}"`);
            });
        }
        
        if (onlyInUtagData.length === 0 && onlyInProcessed.length === 0 && different.length === 0) {
            console.log('✅ utag_data and utag.data are in sync!');
            showNotification('Data layers are in sync! ✅', 'success');
        } else {
            console.log('⚠️ Data layers have differences - see console for details');
            showNotification('Data layers have differences - check console', 'warning');
        }
    } else {
        showNotification('One or both data layers are missing', 'error');
    }
    
    console.log('=====================================');
}

function deleteDataLayerVariable(key) {
    if (confirm(`Are you sure you want to delete "${key}"?`)) {
        // Remove from internal data layer
        delete currentDataLayer[key];
        
        // Remove from Tealium data layers
        if (typeof window.utag_data !== 'undefined' && key in window.utag_data) {
            delete window.utag_data[key];
        }
        
        if (typeof window.utag !== 'undefined' && window.utag.data && key in window.utag.data) {
            delete window.utag.data[key];
        }
        
        // Trigger Tealium update to process the deletion
        if (typeof window.utag !== 'undefined' && typeof window.utag.view === 'function') {
            window.utag.view(window.utag_data);
        }
        
        updateDataLayerTable();
        updateDataLayerEditor();
        showNotification(`"${key}" deleted & removed from Tealium`, 'success');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Expose functions globally
window.initializeDataLayer = initializeDataLayer;
window.loadCurrentDataLayer = loadCurrentDataLayer;
window.updateDataLayerTable = updateDataLayerTable;
window.searchDataLayer = searchDataLayer;
window.addDataLayerVariable = addDataLayerVariable;
window.updateVariableInput = updateVariableInput;
window.loadPresetDataLayer = loadPresetDataLayer;
window.validateDataLayer = validateDataLayer;
window.formatDataLayer = formatDataLayer;
window.clearDataLayer = clearDataLayer;
window.updateDataLayer = updateDataLayer;
window.exportDataLayer = exportDataLayer;
window.importDataLayer = importDataLayer;
window.toggleDataLayerMonitor = toggleDataLayerMonitor;
window.editDataLayerVariable = editDataLayerVariable;
window.copyDataLayerVariable = copyDataLayerVariable;
window.deleteDataLayerVariable = deleteDataLayerVariable;

console.log('✅ Data Layer management system loaded');
