/**
 * Custom Functions Library for Tealium Sandbox
 * 
 * This file allows Tealium agents to add their own custom functions, test scenarios,
 * and troubleshooting utilities to extend the sandbox capabilities.
 * 
 * INSTRUCTIONS FOR AGENTS:
 * 1. Add your custom functions below the examples
 * 2. Use descriptive function names with prefixes like: agent_, custom_, test_, debug_
 * 3. Add comments explaining what each function does
 * 4. Functions have access to all sandbox globals: utag_data, utag, logEvent, showToast
 * 
 * EXAMPLES PROVIDED:
 * - Custom data layer scenarios
 * - Advanced debugging utilities
 * - Client-specific test functions
 * - Troubleshooting helpers
 */

// ============================================================================
// EXAMPLE CUSTOM FUNCTIONS (You can modify or remove these)
// ============================================================================

/**
 * Example: Custom E-commerce Journey Test
 * Simulates a complete e-commerce flow with realistic data
 */
function agent_ecommerceJourney() {
    logEvent('CUSTOM_FUNCTION', 'Starting e-commerce journey test');
    
    // Step 1: Homepage Visit
    utag_data = {
        page_type: 'homepage',
        site_section: 'home',
        customer_type: 'returning',
        customer_id: 'CUST_12345',
        session_id: 'SESSION_' + Date.now()
    };
    
    if (typeof utag !== 'undefined' && utag.view) {
        utag.view(utag_data);
        showToast('Step 1: Homepage visit tracked', 'info');
    }
    
    // Step 2: Product View (after 2 seconds)
    setTimeout(() => {
        utag_data = {
            ...utag_data,
            page_type: 'product',
            product_id: 'PROD_001',
            product_name: 'Premium Widget',
            product_category: 'Widgets',
            product_price: '99.99',
            product_brand: 'WidgetCorp'
        };
        
        if (typeof utag !== 'undefined' && utag.view) {
            utag.view(utag_data);
            showToast('Step 2: Product view tracked', 'info');
        }
    }, 2000);
    
    // Step 3: Add to Cart (after 4 seconds)
    setTimeout(() => {
        const cartData = {
            ...utag_data,
            tealium_event: 'cart_add',
            event_category: 'ecommerce',
            event_action: 'add_to_cart',
            cart_total: '99.99',
            cart_quantity: '1'
        };
        
        if (typeof utag !== 'undefined' && utag.link) {
            utag.link(cartData);
            showToast('Step 3: Add to cart tracked', 'success');
        }
    }, 4000);
    
    // Step 4: Purchase (after 6 seconds)
    setTimeout(() => {
        utag_data = {
            ...utag_data,
            page_type: 'purchase_complete',
            order_id: 'ORDER_' + Date.now(),
            order_total: '99.99',
            order_currency: 'USD',
            tealium_event: 'purchase'
        };
        
        if (typeof utag !== 'undefined' && utag.view) {
            utag.view(utag_data);
            showToast('Step 4: Purchase complete tracked', 'success');
        }
    }, 6000);
    
    showToast('E-commerce journey started - watch for 4 steps over 6 seconds', 'info');
}

/**
 * Example: Debug All Current Variables
 * Shows all available variables in a formatted way
 */
function debug_showAllVariables() {
    const allVars = {
        utag_data: window.utag_data || {},
        utag_cfg: window.utag?.cfg || {},
        utag_sender: window.utag?.sender || {},
        dom_variables: {
            url: window.location.href,
            pathname: window.location.pathname,
            search: window.location.search,
            hash: window.location.hash,
            referrer: document.referrer
        }
    };
    
    console.group('🔍 Tealium Debug - All Variables');
    console.log('Data Layer (utag_data):', allVars.utag_data);
    console.log('Tealium Config (utag.cfg):', allVars.utag_cfg);
    console.log('Tag Senders (utag.sender):', allVars.utag_sender);
    console.log('DOM Variables:', allVars.dom_variables);
    console.groupEnd();
    
    logEvent('DEBUG_VARIABLES', 'All variables logged to console', allVars);
    showToast('All variables logged to console (F12)', 'info');
    
    return allVars;
}

/**
 * Example: Test Specific Client Scenario
 * Template for testing client-specific scenarios
 */
function test_clientScenario(clientName = 'TestClient') {
    const scenarios = {
        'retail': {
            page_type: 'product',
            product_category: 'electronics',
            customer_segment: 'premium',
            site_region: 'US'
        },
        'b2b': {
            page_type: 'demo',
            lead_score: '85',
            company_size: 'enterprise',
            industry: 'technology'
        },
        'media': {
            page_type: 'article',
            content_category: 'news',
            author_id: 'AUTH_001',
            reading_time: '5'
        }
    };
    
    const scenario = scenarios[clientName.toLowerCase()] || scenarios['retail'];
    
    utag_data = {
        ...utag_data,
        ...scenario,
        client_name: clientName,
        test_scenario: true,
        timestamp: new Date().toISOString()
    };
    
    if (typeof utag !== 'undefined' && utag.view) {
        utag.view(utag_data);
    }
    
    logEvent('CLIENT_SCENARIO', `Testing ${clientName} scenario`, scenario);
    showToast(`${clientName} scenario applied`, 'success');
    
    return scenario;
}

/**
 * Example: Advanced Load Rule Testing
 * Tests multiple load rule combinations quickly
 */
function test_loadRuleCombinations() {
    const testCases = [
        { page_type: 'homepage', customer_type: 'new' },
        { page_type: 'product', customer_type: 'returning' },
        { page_type: 'checkout', order_total: '150.00' },
        { page_type: 'purchase_complete', customer_type: 'premium' }
    ];
    
    console.group('🧪 Load Rule Testing');
    
    testCases.forEach((testCase, index) => {
        setTimeout(() => {
            utag_data = { ...utag_data, ...testCase };
            
            // Test common load rule conditions
            const results = {
                homepage_only: utag_data.page_type === 'homepage',
                returning_customers: utag_data.customer_type === 'returning',
                high_value_orders: parseFloat(utag_data.order_total || 0) > 100,
                premium_customers: utag_data.customer_type === 'premium'
            };
            
            console.log(`Test ${index + 1}:`, testCase, '→ Results:', results);
            
            if (typeof utag !== 'undefined' && utag.view) {
                utag.view(utag_data);
            }
            
            if (index === testCases.length - 1) {
                console.groupEnd();
                showToast('Load rule testing complete - check console', 'success');
            }
            
        }, index * 1000);
    });
    
    showToast('Running load rule tests...', 'info');
}

/**
 * Example: Consent Scenario Testing
 * Tests different consent states
 */
function test_consentScenarios() {
    const consentStates = [
        { analytics: true, marketing: true, functional: true },
        { analytics: true, marketing: false, functional: true },
        { analytics: false, marketing: false, functional: true },
        { analytics: true, marketing: true, functional: false }
    ];
    
    consentStates.forEach((state, index) => {
        setTimeout(() => {
            // Apply consent state
            if (window.utag && window.utag.gdpr) {
                window.utag.gdpr.consent = state;
            }
            
            utag_data = {
                ...utag_data,
                consent_analytics: state.analytics,
                consent_marketing: state.marketing,
                consent_functional: state.functional,
                consent_test: true
            };
            
            if (typeof utag !== 'undefined' && utag.view) {
                utag.view(utag_data);
            }
            
            logEvent('CONSENT_TEST', `Consent scenario ${index + 1}`, state);
            showToast(`Consent scenario ${index + 1}: A=${state.analytics}, M=${state.marketing}, F=${state.functional}`, 'info');
            
        }, index * 2000);
    });
    
    showToast('Testing 4 consent scenarios over 8 seconds', 'info');
}

// ============================================================================
// UTILITY FUNCTIONS FOR AGENTS
// ============================================================================

/**
 * Quick function to set common B2B data layer
 */
function agent_setB2BData() {
    utag_data = {
        ...utag_data,
        page_type: 'demo',
        lead_source: 'website',
        company_size: 'enterprise',
        industry: 'technology',
        lead_score: '75',
        form_name: 'demo_request',
        sales_region: 'north_america'
    };
    
    updateDataLayerDisplay?.();
    showToast('B2B data layer applied', 'success');
}

/**
 * Quick function to set common retail/e-commerce data
 */
function agent_setRetailData() {
    utag_data = {
        ...utag_data,
        page_type: 'product',
        product_id: 'PROD_12345',
        product_name: 'Sample Product',
        product_category: 'Electronics',
        product_price: '199.99',
        product_brand: 'SampleBrand',
        inventory_status: 'in_stock',
        customer_segment: 'vip'
    };
    
    updateDataLayerDisplay?.();
    showToast('Retail data layer applied', 'success');
}

/**
 * Quick function to clear all custom data and reset to defaults
 */
function agent_resetToDefaults() {
    utag_data = {
        page_type: 'homepage',
        site_section: 'home',
        environment: 'sandbox'
    };
    
    updateDataLayerDisplay?.();
    showToast('Data layer reset to defaults', 'info');
}

/**
 * Function to simulate network delays/issues for testing
 */
function debug_simulateNetworkDelay(delayMs = 3000) {
    const originalFetch = window.fetch;
    let requestCount = 0;
    
    window.fetch = function(...args) {
        requestCount++;
        showToast(`Request ${requestCount} delayed by ${delayMs}ms`, 'warning');
        
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(originalFetch.apply(this, args));
            }, delayMs);
        });
    };
    
    // Restore after 30 seconds
    setTimeout(() => {
        window.fetch = originalFetch;
        showToast('Network delay simulation ended', 'info');
    }, 30000);
    
    showToast(`Network delay simulation started: ${delayMs}ms for 30 seconds`, 'warning');
}

/**
 * Function to batch test multiple events quickly
 */
function test_rapidFireEvents(count = 5) {
    const events = [
        { tealium_event: 'page_view', event_category: 'navigation' },
        { tealium_event: 'click', event_category: 'engagement', element_type: 'button' },
        { tealium_event: 'scroll', event_category: 'engagement', scroll_depth: '50' },
        { tealium_event: 'form_start', event_category: 'conversion', form_name: 'contact' },
        { tealium_event: 'form_submit', event_category: 'conversion', form_name: 'contact' }
    ];
    
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const event = events[i % events.length];
            const eventData = {
                ...utag_data,
                ...event,
                event_sequence: i + 1,
                batch_test: true
            };
            
            if (typeof utag !== 'undefined' && utag.link) {
                utag.link(eventData);
            }
            
            logEvent('RAPID_FIRE_TEST', `Event ${i + 1}`, eventData);
            
        }, i * 500); // 500ms between events
    }
    
    showToast(`Firing ${count} events rapidly (500ms intervals)`, 'info');
}

// ============================================================================
// ADD YOUR CUSTOM FUNCTIONS BELOW THIS LINE
// ============================================================================

/**
 * Template for your custom function
 * 
 * function agent_yourFunctionName() {
 *     // Your code here
 *     // Access to: utag_data, utag, logEvent, showToast, updateDataLayerDisplay
 *     
 *     showToast('Your function executed', 'success');
 * }
 */

// Example: Custom function for specific client testing
function agent_customClientTest() {
    // Add your specific client test logic here
    showToast('Add your custom client test logic here', 'info');
}

// Example: Custom debugging function
function debug_customDebug() {
    // Add your custom debugging logic here
    console.log('Custom debug function - add your logic here');
    showToast('Check console for custom debug output', 'info');
}

// ============================================================================
// FUNCTION REGISTRY (for UI integration)
// ============================================================================

/**
 * Registry of available custom functions for the UI
 * Add your functions here to make them available in the sandbox UI
 */
window.customFunctionRegistry = {
    // Example Functions
    'E-commerce Journey Test': {
        func: agent_ecommerceJourney,
        description: 'Simulates complete e-commerce flow (homepage → product → cart → purchase)',
        category: 'Testing'
    },
    'Debug All Variables': {
        func: debug_showAllVariables,
        description: 'Logs all Tealium variables to console for debugging',
        category: 'Debugging'
    },
    'Client Scenario Test': {
        func: () => test_clientScenario('retail'),
        description: 'Tests retail client scenario with sample data',
        category: 'Testing'
    },
    'Load Rule Testing': {
        func: test_loadRuleCombinations,
        description: 'Tests multiple load rule combinations with different data',
        category: 'Testing'
    },
    'Consent Scenarios': {
        func: test_consentScenarios,
        description: 'Tests different consent states over time',
        category: 'Consent'
    },
    
    // Quick Data Setup
    'Set B2B Data': {
        func: agent_setB2BData,
        description: 'Applies common B2B/lead generation data layer',
        category: 'Quick Setup'
    },
    'Set Retail Data': {
        func: agent_setRetailData,
        description: 'Applies common retail/e-commerce data layer',
        category: 'Quick Setup'
    },
    'Reset to Defaults': {
        func: agent_resetToDefaults,
        description: 'Clears custom data and resets to sandbox defaults',
        category: 'Quick Setup'
    },
    
    // Advanced Testing
    'Rapid Fire Events': {
        func: () => test_rapidFireEvents(5),
        description: 'Fires 5 events rapidly to test event handling',
        category: 'Advanced'
    },
    'Simulate Network Delay': {
        func: () => debug_simulateNetworkDelay(2000),
        description: 'Simulates 2s network delays for 30 seconds',
        category: 'Debugging'
    }
    
    // Add your custom functions to this registry:
    // 'Your Function Name': {
    //     func: agent_yourFunctionName,
    //     description: 'Description of what your function does',
    //     category: 'Your Category'
    // }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// Make functions available globally for console access
Object.keys(window.customFunctionRegistry).forEach(name => {
    const funcName = window.customFunctionRegistry[name].func.name;
    if (funcName) {
        window[funcName] = window.customFunctionRegistry[name].func;
    }
});

/**
 * Initialize custom functions UI (called when DOM is ready)
 */
function initializeCustomFunctionsUI() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCustomFunctionsUI);
        return;
    }
    
    populateFunctionButtons();
}

/**
 * Populate function buttons in the UI
 */
function populateFunctionButtons() {
    const categories = {
        'Quick Setup': 'quickFunctions',
        'Testing': 'testingFunctions', 
        'Debugging': 'debuggingFunctions',
        'Advanced': 'advancedFunctions'
    };
    
    // Clear existing buttons
    Object.values(categories).forEach(containerId => {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '';
        }
    });
    
    // Populate function buttons
    Object.entries(window.customFunctionRegistry).forEach(([name, config]) => {
        const category = config.category || 'Advanced';
        const containerId = categories[category];
        const container = document.getElementById(containerId);
        
        if (container) {
            const button = document.createElement('button');
            button.className = 'w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group';
            button.onclick = () => executeCustomFunction(name, config.func);
            
            button.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="font-medium text-gray-900 text-sm">${name}</div>
                        <div class="text-xs text-gray-600 mt-1">${config.description}</div>
                    </div>
                    <i class="fas fa-play text-gray-400 group-hover:text-tealium-600 text-xs"></i>
                </div>
            `;
            
            container.appendChild(button);
        }
    });
    
    // Add empty state if no functions in category
    Object.entries(categories).forEach(([categoryName, containerId]) => {
        const container = document.getElementById(containerId);
        if (container && container.children.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-cube text-2xl mb-2"></i>
                    <p class="text-sm">No ${categoryName.toLowerCase()} functions available</p>
                </div>
            `;
        }
    });
}

/**
 * Execute custom function and show results
 */
function executeCustomFunction(name, func) {
    const resultsDiv = document.getElementById('customFunctionResults');
    
    try {
        // Show executing state
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="flex items-center space-x-3 text-blue-600">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Executing ${name}...</span>
                </div>
            `;
        }
        
        // Execute function
        const result = func();
        
        // Show success result
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center space-x-2 text-green-600">
                        <i class="fas fa-check-circle"></i>
                        <span class="font-medium">${name} executed successfully</span>
                    </div>
                    
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-sm text-gray-600">
                            <strong>Function:</strong> ${func.name || 'anonymous'}
                        </div>
                        <div class="text-sm text-gray-600">
                            <strong>Timestamp:</strong> ${new Date().toLocaleTimeString()}
                        </div>
                        ${result ? `
                            <div class="text-sm text-gray-600 mt-2">
                                <strong>Result:</strong> 
                                <pre class="mt-1 text-xs bg-white p-2 rounded border">${JSON.stringify(result, null, 2)}</pre>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="text-xs text-gray-500">
                        Check browser console (F12) for detailed output
                    </div>
                </div>
            `;
        }
        
        // Log the execution
        if (typeof logEvent === 'function') {
            logEvent('CUSTOM_FUNCTION_EXECUTED', `Custom function ${name} executed`, { 
                functionName: name,
                result: result 
            });
        }
        
        // Show success toast
        if (typeof showToast === 'function') {
            showToast(`${name} executed successfully`, 'success');
        }
        
    } catch (error) {
        // Show error result
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center space-x-2 text-red-600">
                        <i class="fas fa-exclamation-circle"></i>
                        <span class="font-medium">Error executing ${name}</span>
                    </div>
                    
                    <div class="bg-red-50 rounded-lg p-3">
                        <div class="text-sm text-red-800">
                            <strong>Error:</strong> ${error.message}
                        </div>
                        <div class="text-sm text-red-600 mt-2">
                            <strong>Function:</strong> ${func.name || 'anonymous'}
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Log the error
        if (typeof logEvent === 'function') {
            logEvent('CUSTOM_FUNCTION_ERROR', `Custom function ${name} failed`, { 
                functionName: name,
                error: error.message 
            });
        }
        
        // Show error toast
        if (typeof showToast === 'function') {
            showToast(`Error in ${name}: ${error.message}`, 'error');
        }
        
        console.error(`Custom function ${name} error:`, error);
    }
}

/**
 * Update data layer display (fallback for compatibility)
 */
function updateDataLayerDisplay() {
    // This will be handled by the main sandbox UI
    console.log('Data layer updated:', utag_data);
}

// Initialize when loaded
initializeCustomFunctionsUI();

console.log('🎯 Custom Functions Loaded!');
console.log('Available functions:', Object.keys(window.customFunctionRegistry));
console.log('Access functions via sandbox UI or type function names in console');
console.log('Example: agent_ecommerceJourney()');
