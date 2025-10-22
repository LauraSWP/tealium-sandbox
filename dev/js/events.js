/**
 * Events Management and Debugging System
 * Enhanced with real-time interceptors and analysis tools
 */

// Event debugging state
let eventDebugState = {
    isIntercepting: false,
    eventHistory: [],
    lastEventData: null,
    preEventDataLayer: null,
    networkRequests: [],
    originalFetch: null,
    originalXHR: null,
    tagAnalysisData: {},
    recentConsoleLogs: [],
    originalConsoleLog: null,
    networkAutoUpdate: true,
    lastNetworkUpdate: 0,
    networkUpdateThrottle: 500, // ms
    pendingNetworkUpdate: false
};

/**
 * Initialize Events System
 */
function initializeEvents() {
    console.log('🎯 Initializing Events Management System...');
    
    // Set up event interception
    setupEventInterception();
    
    // Set up network monitoring
    setupNetworkMonitoring();
    
    // Set up universal tag firing hooks
    setupUniversalTagHooks();
    
    // Initialize custom event variables
    initializeCustomEventVariables();
    
    // Set up journey event listening
    setupJourneyEventListener();
    
    // Load event history from session
    loadEventHistory();
    
    console.log('✅ Events system initialized');
}

/**
 * Setup comprehensive network monitoring
 */
function setupNetworkMonitoring() {
    // Prevent duplicate setup
    if (eventDebugState.originalFetch) {
        console.log('🌐 Network monitoring already set up');
        return;
    }
    
    console.log('🌐 Setting up network monitoring...');
    
    // Store original functions
    eventDebugState.originalFetch = window.fetch;
    eventDebugState.originalXHR = window.XMLHttpRequest;
    eventDebugState.originalConsoleLog = console.log;
    
    // Intercept console.log to capture utagdb output
    console.log = function(...args) {
        // Call original console.log
        eventDebugState.originalConsoleLog.apply(console, args);
        
        // Store recent console logs for tag detection with timestamp
        const logString = args.join(' ');
        const logEntry = {
            message: logString,
            timestamp: Date.now()
        };
        eventDebugState.recentConsoleLogs.unshift(logEntry);
        
        // Limit to last 50 console logs
        if (eventDebugState.recentConsoleLogs.length > 50) {
            eventDebugState.recentConsoleLogs = eventDebugState.recentConsoleLogs.slice(0, 50);
        }
        
        // Parse for SENDING patterns in real-time
        if (logString.includes('SENDING:')) {
            const match = logString.match(/SENDING:\s*(\d+)/);
            if (match) {
                const tagId = parseInt(match[1]);
                logToDebugConsole(`🏷️ Detected tag ${tagId} firing from utagdb`, 'success');
            }
        }
    };
    
    // Override fetch API
    window.fetch = function(...args) {
        const startTime = Date.now();
        const url = args[0];
        const options = args[1] || {};
        const method = options.method || 'GET';
        const headers = options.headers || {};
        const body = options.body;
        
        logNetworkRequest('fetch', url, startTime, method, headers, body);
        
        return eventDebugState.originalFetch.apply(this, args)
            .then(response => {
                // Clone response to read headers without affecting the original
                const clonedResponse = response.clone();
                const responseHeaders = {};
                
                // Convert headers to plain object
                if (response.headers) {
                    for (let [key, value] of response.headers.entries()) {
                        responseHeaders[key] = value;
                    }
                }
                
                // Try to get response size
                const contentLength = response.headers.get('content-length');
                const responseSize = contentLength ? parseInt(contentLength) : 0;
                
                logNetworkResponse('fetch', url, response.status, Date.now() - startTime, responseHeaders, responseSize);
                return response;
            })
            .catch(error => {
                logNetworkError('fetch', url, error, Date.now() - startTime);
                throw error;
            });
    };
    
    // Override XMLHttpRequest
    const OriginalXHR = eventDebugState.originalXHR;
    window.XMLHttpRequest = function() {
        const xhr = new OriginalXHR();
        const originalOpen = xhr.open;
        const originalSend = xhr.send;
        const originalSetRequestHeader = xhr.setRequestHeader;
        let requestData = {};
        
        xhr.open = function(method, url, ...args) {
            requestData = { 
                method, 
                url, 
                startTime: Date.now(), 
                headers: {},
                payload: null 
            };
            return originalOpen.apply(this, [method, url, ...args]);
        };
        
        xhr.setRequestHeader = function(name, value) {
            if (requestData.headers) {
                requestData.headers[name] = value;
            }
            return originalSetRequestHeader.apply(this, arguments);
        };
        
        xhr.send = function(data) {
            const startTime = requestData.startTime || Date.now();
            requestData.payload = data;
            
            logNetworkRequest('xhr', requestData.url, startTime, requestData.method, requestData.headers, requestData.payload);
            
            xhr.addEventListener('load', function() {
                // Get response headers
                const responseHeaders = {};
                try {
                    const headerString = xhr.getAllResponseHeaders();
                    if (headerString) {
                        headerString.split('\r\n').forEach(line => {
                            const parts = line.split(': ');
                            if (parts.length === 2) {
                                responseHeaders[parts[0]] = parts[1];
                            }
                        });
                    }
                } catch (e) {
                    // Headers might not be accessible
                }
                
                const responseSize = xhr.responseText ? xhr.responseText.length : 0;
                logNetworkResponse('xhr', requestData.url, xhr.status, Date.now() - startTime, responseHeaders, responseSize);
            });
            
            xhr.addEventListener('error', function() {
                logNetworkError('xhr', requestData.url, 'Network error', Date.now() - startTime);
            });
            
            return originalSend.apply(this, arguments);
        };
        
        return xhr;
    };
    
    // Copy static properties
    Object.setPrototypeOf(window.XMLHttpRequest, OriginalXHR);
    Object.defineProperty(window.XMLHttpRequest, 'prototype', {
        value: OriginalXHR.prototype,
        writable: false
    });
    
    // Override sendBeacon API to catch analytics beacons
    if (navigator.sendBeacon) {
        const originalSendBeacon = navigator.sendBeacon;
        navigator.sendBeacon = function(url, data) {
            const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            
            // Convert data to string format for parsing
            let payloadString = null;
            if (data) {
                if (typeof data === 'string') {
                    payloadString = data;
                } else if (data instanceof Blob) {
                    // For Blob, we'll convert it to text (async)
                    const reader = new FileReader();
                    reader.onload = function() {
                        // Update the payload after it's read
                        const requests = eventDebugState.networkRequests.filter(r => r.url === url && r.type === 'beacon');
                        if (requests.length > 0) {
                            requests[0].payload = reader.result;
                            console.log('📦 Beacon Blob converted to text:', reader.result.substring(0, 100) + '...');
                            // Refresh network panel to show updated parameters
                            if (typeof scheduleNetworkUpdate === 'function') {
                                scheduleNetworkUpdate();
                            }
                        }
                    };
                    reader.readAsText(data);
                    payloadString = '[Blob - converting...]';
                } else if (data instanceof FormData) {
                    // Convert FormData to URLSearchParams string
                    const params = new URLSearchParams();
                    for (const [key, value] of data.entries()) {
                        params.append(key, value);
                    }
                    payloadString = params.toString();
                } else if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
                    // Convert binary data to string
                    const decoder = new TextDecoder();
                    payloadString = decoder.decode(data);
                } else {
                    // Fallback: stringify the object
                    payloadString = JSON.stringify(data);
                }
            }
            
            logNetworkRequest('beacon', url, Date.now(), 'POST', headers, payloadString);
            
            // Minimal beacon logging for debug console
            const vendor = detectVendorFromUrl(url);
            const vendorInfo = vendor !== 'Unknown' ? ` (${vendor})` : '';
            logToDebugConsole(`📡 Beacon${vendorInfo} sent`, 'network');
            
            // Call original function
            const result = originalSendBeacon.call(this, url, data);
            
            // Log success/failure with typical beacon response
            setTimeout(() => {
                const responseHeaders = { 'Access-Control-Allow-Origin': '*' };
                const responseSize = 43; // Typical 1x1 pixel GIF size
                logNetworkResponse('beacon', url, result ? 200 : 0, 10, responseHeaders, responseSize);
            }, 10);
            
            return result;
        };
    }
    
    console.log('✅ Network monitoring active');
}

/**
 * Setup universal tag firing hooks to detect ANY vendor tag
 */
function setupUniversalTagHooks() {
    console.log('🔗 Setting up universal tag firing hooks...');
    
    // Hook into Tealium's tag loading mechanism
    if (typeof window.utag !== 'undefined' && window.utag.loader) {
        // Store original AS function (Attach Script)
        const originalAS = window.utag.loader.AS;
        if (originalAS) {
            window.utag.loader.AS = function(src, id, callback, timeout, attrs) {
                // Log any tag script being loaded
                if (id && id.match(/utag_(\d+)/)) {
                    const tagId = id.match(/utag_(\d+)/)[1];
                    logToDebugConsole(`📂 Tag ${tagId} script loading: ${src}`, 'info');
                    
                    // Store tag info for later correlation
                    eventDebugState.tagAnalysisData[tagId] = {
                        src: src,
                        loadTime: Date.now(),
                        type: 'script'
                    };
                }
                
                return originalAS.apply(this, arguments);
            };
        }
        
        // Hook into tag firing mechanism
        const originalSend = window.utag.sender;
        if (originalSend) {
            window.utag.sender = function() {
                // Capture any send operations
                logToDebugConsole(`📤 Tealium sender called with arguments:`, 'info');
                return originalSend.apply(this, arguments);
            };
        }
    }
    
    // Set up a periodic check for new tags
    setInterval(() => {
        checkForNewTags();
    }, 1000);
    
    console.log('✅ Universal tag hooks active');
}

/**
 * Check for any new tags that might have fired
 */
function checkForNewTags() {
    if (typeof window.utag !== 'undefined' && window.utag.loader && window.utag.loader.cfg) {
        const cfg = window.utag.loader.cfg;
        
        Object.keys(cfg).forEach(tagId => {
            const tagConfig = cfg[tagId];
            const tagKey = `tag_${tagId}`;
            
            // Check if this tag has fired recently and we haven't logged it yet
            if (tagConfig && (tagConfig.send === 1 || tagConfig.load === 1)) {
                if (!eventDebugState.tagAnalysisData[tagKey] || 
                    eventDebugState.tagAnalysisData[tagKey].lastSeen < Date.now() - 5000) {
                    
                    eventDebugState.tagAnalysisData[tagKey] = {
                        lastSeen: Date.now(),
                        send: tagConfig.send,
                        load: tagConfig.load,
                        vendor: detectVendorFromConfig(tagConfig)
                    };
                    
                    logToDebugConsole(`🎯 Universal detection: Tag ${tagId} (${eventDebugState.tagAnalysisData[tagKey].vendor}) active`, 'success');
                }
            }
        });
    }
}

/**
 * Detect vendor from tag configuration
 */
function detectVendorFromConfig(tagConfig) {
    if (!tagConfig) return 'Unknown';
    
    const configStr = JSON.stringify(tagConfig).toLowerCase();
    
    if (configStr.includes('google') || configStr.includes('gtag') || configStr.includes('gtm')) return 'Google';
    if (configStr.includes('facebook') || configStr.includes('fbevents')) return 'Facebook';
    if (configStr.includes('piano') || configStr.includes('at-o.net')) return 'Piano Analytics';
    if (configStr.includes('tiktok') || configStr.includes('bytedance')) return 'TikTok';
    if (configStr.includes('twitter') || configStr.includes('twimg')) return 'Twitter/X';
    if (configStr.includes('linkedin') || configStr.includes('licdn')) return 'LinkedIn';
    if (configStr.includes('pinterest') || configStr.includes('pinimg')) return 'Pinterest';
    if (configStr.includes('snapchat') || configStr.includes('sc-static')) return 'Snapchat';
    if (configStr.includes('adobe') || configStr.includes('omtrdc')) return 'Adobe';
    if (configStr.includes('criteo')) return 'Criteo';
    if (configStr.includes('contentsquare')) return 'ContentSquare';
    if (configStr.includes('amazon')) return 'Amazon';
    if (configStr.includes('microsoft') || configStr.includes('bing')) return 'Microsoft';
    if (configStr.includes('yahoo')) return 'Yahoo';
    if (configStr.includes('tealium')) return 'Tealium';
    
    return 'Custom/Other';
}

/**
 * Log network request initiation
 */
function logNetworkRequest(type, url, startTime, method = 'GET', headers = {}, payload = null) {
    const request = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        method,
        url,
        startTime,
        headers: headers || {},
        payload: payload,
        isTagRelated: isTagRelatedRequest(url),
        status: 'pending',
        vendor: detectVendorFromUrl(url),
        size: payload ? JSON.stringify(payload).length : 0
    };
    
    eventDebugState.networkRequests.unshift(request);
    
    // Limit stored requests to last 100
    if (eventDebugState.networkRequests.length > 100) {
        eventDebugState.networkRequests = eventDebugState.networkRequests.slice(0, 100);
    }
    
        // Log tag-related requests (minimal logging for debug console)
        if (request.isTagRelated) {
            // Only log simple request info to debug console, detailed info goes to Network Details panel
            const vendor = request.vendor !== 'Unknown' ? ` (${request.vendor})` : '';
            logToDebugConsole(`🌐 ${type.toUpperCase()}${vendor} request detected`, 'network');
            
            // Throttled update of network details panel to prevent freezing
            scheduleNetworkUpdate();
        }
}

/**
 * Log network response
 */
function logNetworkResponse(type, url, status, duration, responseHeaders = {}, responseSize = 0) {
    const request = eventDebugState.networkRequests.find(r => r.url === url && r.type === type);
    if (request) {
        request.status = status;
        request.duration = duration;
        request.completed = true;
        request.responseHeaders = responseHeaders || {};
        request.responseSize = responseSize;
        
            if (request.isTagRelated) {
                // Minimal logging for debug console - detailed info is in Network Details panel
                const statusIcon = status >= 200 && status < 300 ? '✅' : status >= 400 ? '❌' : '⚠️';
                logToDebugConsole(`${statusIcon} Response: ${status}`, 'success');
                
                // Throttled update of network details panel
                scheduleNetworkUpdate();
            }
    }
}

/**
 * Detect vendor from URL
 */
function detectVendorFromUrl(url) {
    if (!url) return 'Unknown';
    
    const urlLower = url.toLowerCase();
    
    // Google ecosystem (most common)
    if (urlLower.includes('google') || urlLower.includes('gtag') || urlLower.includes('gtm') || 
        urlLower.includes('doubleclick') || urlLower.includes('googleadservices') || 
        urlLower.includes('googlesyndication') || urlLower.includes('googletagmanager') ||
        urlLower.includes('gstatic') || urlLower.includes('googleapis')) return 'Google';
    
    // Facebook/Meta ecosystem  
    if (urlLower.includes('facebook') || urlLower.includes('fbcdn') || urlLower.includes('connect.facebook') || 
        urlLower.includes('instagram') || urlLower.includes('meta.com') || urlLower.includes('workplace.com')) return 'Facebook/Meta';
    
    // Adobe ecosystem (SiteCatalyst, Analytics Cloud, Target, etc.)
    if (urlLower.includes('adobe') || urlLower.includes('omtrdc') || urlLower.includes('demdex') || 
        urlLower.includes('adobedc') || urlLower.includes('analytics.adobe') || urlLower.includes('sitecatalyst') ||
        urlLower.includes('sc.omtrdc') || urlLower.includes('2o7') || urlLower.includes('adobe.com')) return 'Adobe Analytics';
    
    // Analytics platforms
    if (urlLower.includes('piano') || urlLower.includes('at-o.net') || urlLower.includes('xiti')) return 'Piano Analytics';
    if (urlLower.includes('amplitude') || urlLower.includes('amplitude.com')) return 'Amplitude';
    if (urlLower.includes('mixpanel') || urlLower.includes('mixpanel.com')) return 'Mixpanel';
    if (urlLower.includes('segment') || urlLower.includes('segmentapi') || urlLower.includes('segment.com')) return 'Segment';
    if (urlLower.includes('rudderstack') || urlLower.includes('rudderstack.com')) return 'RudderStack';
    if (urlLower.includes('mparticle') || urlLower.includes('mparticle.com')) return 'mParticle';
    if (urlLower.includes('comscore') || urlLower.includes('scorecardresearch')) return 'ComScore';
    if (urlLower.includes('chartbeat') || urlLower.includes('chartbeat.com')) return 'Chartbeat';
    if (urlLower.includes('parse.ly') || urlLower.includes('parsely')) return 'Parse.ly';
    
    // Social media platforms
    if (urlLower.includes('tiktok') || urlLower.includes('bytedance') || urlLower.includes('musical.ly')) return 'TikTok';
    if (urlLower.includes('twitter') || urlLower.includes('x.com') || urlLower.includes('twimg')) return 'Twitter/X';
    if (urlLower.includes('linkedin') || urlLower.includes('licdn')) return 'LinkedIn';
    if (urlLower.includes('pinterest') || urlLower.includes('pinimg')) return 'Pinterest';
    if (urlLower.includes('snapchat') || urlLower.includes('sc-static')) return 'Snapchat';
    if (urlLower.includes('youtube') || urlLower.includes('ytimg')) return 'YouTube';
    if (urlLower.includes('reddit') || urlLower.includes('redd.it')) return 'Reddit';
    
    // Advertising platforms
    if (urlLower.includes('criteo') || urlLower.includes('criteo.com')) return 'Criteo';
    if (urlLower.includes('amazon') || urlLower.includes('adsystem.amazon')) return 'Amazon Ads';
    if (urlLower.includes('microsoft') || urlLower.includes('bing') || urlLower.includes('clarity.ms')) return 'Microsoft';
    if (urlLower.includes('yahoo') || urlLower.includes('verizonmedia')) return 'Yahoo';
    if (urlLower.includes('outbrain') || urlLower.includes('outbrain.com')) return 'Outbrain';
    if (urlLower.includes('taboola') || urlLower.includes('taboola.com')) return 'Taboola';
    if (urlLower.includes('pubmatic') || urlLower.includes('pubmatic.com')) return 'PubMatic';
    if (urlLower.includes('appnexus') || urlLower.includes('adnxs.com')) return 'AppNexus';
    if (urlLower.includes('rubicon') || urlLower.includes('rubiconproject.com')) return 'Rubicon Project';
    
    // Affiliate networks (from Tealium's affiliate category)
    if (urlLower.includes('7search') || urlLower.includes('7search.com')) return '7Search';
    if (urlLower.includes('commission') && urlLower.includes('junction')) return 'Commission Junction';
    if (urlLower.includes('shareasale') || urlLower.includes('shareasale.com')) return 'ShareASale';
    if (urlLower.includes('rakuten') || urlLower.includes('linkshare')) return 'Rakuten Advertising';
    if (urlLower.includes('partnerize') || urlLower.includes('prf.hn')) return 'Partnerize';
    if (urlLower.includes('impact') || urlLower.includes('impactradius')) return 'Impact';
    
    // Experience platforms
    if (urlLower.includes('contentsquare') || urlLower.includes('contentsquare.com')) return 'ContentSquare';
    if (urlLower.includes('hotjar') || urlLower.includes('hotjar.com')) return 'Hotjar';
    if (urlLower.includes('fullstory') || urlLower.includes('fullstory.com')) return 'FullStory';
    if (urlLower.includes('logrocket') || urlLower.includes('logrocket.com')) return 'LogRocket';
    if (urlLower.includes('smartlook') || urlLower.includes('smartlook.com')) return 'Smartlook';
    if (urlLower.includes('mouseflow') || urlLower.includes('mouseflow.com')) return 'Mouseflow';
    if (urlLower.includes('lucky') && urlLower.includes('orange')) return 'Lucky Orange';
    if (urlLower.includes('quantum') && urlLower.includes('metric')) return 'Quantum Metric';
    
    // Tag management & Testing
    if (urlLower.includes('tealium') || urlLower.includes('tiqcdn')) return 'Tealium';
    if (urlLower.includes('ensighten') || urlLower.includes('ensighten.com')) return 'Ensighten';
    if (urlLower.includes('qubit') || urlLower.includes('qubit.com')) return 'Qubit';
    if (urlLower.includes('optimizely') || urlLower.includes('optimizely.com')) return 'Optimizely';
    if (urlLower.includes('vwo') || urlLower.includes('visualwebsiteoptimizer')) return 'VWO';
    if (urlLower.includes('unbounce') || urlLower.includes('unbounce.com')) return 'Unbounce';
    
    // Consent & Privacy (CMPs)
    if (urlLower.includes('onetrust') || urlLower.includes('onetrust.com')) return 'OneTrust';
    if (urlLower.includes('cookiebot') || urlLower.includes('cookiebot.com')) return 'Cookiebot';
    if (urlLower.includes('quantcast') || urlLower.includes('quantcast.com')) return 'Quantcast';
    if (urlLower.includes('trustarc') || urlLower.includes('trustarc.com')) return 'TrustArc';
    if (urlLower.includes('didomi') || urlLower.includes('didomi.io')) return 'Didomi';
    if (urlLower.includes('usercentrics') || urlLower.includes('usercentrics.eu')) return 'Usercentrics';
    
    // Marketing automation & CRM
    if (urlLower.includes('salesforce') || urlLower.includes('pardot') || urlLower.includes('exacttarget')) return 'Salesforce';
    if (urlLower.includes('hubspot') || urlLower.includes('hubspot.com')) return 'HubSpot';
    if (urlLower.includes('marketo') || urlLower.includes('marketo.com')) return 'Marketo';
    if (urlLower.includes('mailchimp') || urlLower.includes('mailchimp.com')) return 'Mailchimp';
    if (urlLower.includes('constant') && urlLower.includes('contact')) return 'Constant Contact';
    if (urlLower.includes('eloqua') || urlLower.includes('eloqua.com')) return 'Oracle Eloqua';
    
    // E-commerce & Product analytics
    if (urlLower.includes('heap') || urlLower.includes('heap.io')) return 'Heap';
    if (urlLower.includes('kissmetrics') || urlLower.includes('kissmetrics.com')) return 'KISSmetrics';
    if (urlLower.includes('intercom') || urlLower.includes('intercom.io')) return 'Intercom';
    if (urlLower.includes('zendesk') || urlLower.includes('zendesk.com')) return 'Zendesk';
    if (urlLower.includes('shopify') || urlLower.includes('shopifycloud')) return 'Shopify';
    if (urlLower.includes('bigcommerce') || urlLower.includes('bigcommerce.com')) return 'BigCommerce';
    
    // Customer Data Platforms
    if (urlLower.includes('treasure') && urlLower.includes('data')) return 'Treasure Data';
    if (urlLower.includes('lytics') || urlLower.includes('lytics.com')) return 'Lytics';
    if (urlLower.includes('bluekai') || urlLower.includes('bluekai.com')) return 'Oracle BlueKai';
    if (urlLower.includes('permutive') || urlLower.includes('permutive.com')) return 'Permutive';
    
    // Attribution & Analytics
    if (urlLower.includes('branch') || urlLower.includes('branch.io')) return 'Branch';
    if (urlLower.includes('appsflyer') || urlLower.includes('appsflyer.com')) return 'AppsFlyer';
    if (urlLower.includes('adjust') || urlLower.includes('adjust.com')) return 'Adjust';
    if (urlLower.includes('kochava') || urlLower.includes('kochava.com')) return 'Kochava';
    
    // Video & Media
    if (urlLower.includes('jwplayer') || urlLower.includes('jwplatform')) return 'JW Player';
    if (urlLower.includes('brightcove') || urlLower.includes('brightcove.com')) return 'Brightcove';
    if (urlLower.includes('vimeo') || urlLower.includes('vimeo.com')) return 'Vimeo';
    if (urlLower.includes('wistia') || urlLower.includes('wistia.com')) return 'Wistia';
    
    // Others commonly seen in Tealium
    if (urlLower.includes('newrelic') || urlLower.includes('newrelic.com')) return 'New Relic';
    if (urlLower.includes('pingdom') || urlLower.includes('pingdom.net')) return 'Pingdom';
    if (urlLower.includes('crazy') && urlLower.includes('egg')) return 'Crazy Egg';
    if (urlLower.includes('yandex') || urlLower.includes('yandex.ru')) return 'Yandex';
    if (urlLower.includes('baidu') || urlLower.includes('baidu.com')) return 'Baidu';
    
    return 'Unknown';
}

/**
 * Log network errors
 */
function logNetworkError(type, url, error, duration) {
    const request = eventDebugState.networkRequests.find(r => r.url === url && r.type === type);
    if (request) {
        request.status = 'error';
        request.error = error;
        request.duration = duration;
        request.completed = true;
        
        if (request.isTagRelated) {
            logToDebugConsole(`❌ ${type.toUpperCase()} error: ${error} (${duration}ms)`, 'error');
        }
    }
}

/**
 * Check if a URL is related to tag/analytics requests
 */
function isTagRelatedRequest(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    
    const tagDomains = [
        // Tealium
        'tags.tiqcdn.com', 'tiqcdn.com', 'collect.tealiumiq.com', 'tealiumiq.com',
        // Google
        'google-analytics.com', 'googletagmanager.com', 'doubleclick.net', 'googlesyndication.com', 'google.com',
        // Facebook/Meta
        'facebook.com', 'connect.facebook.net', 'fbcdn.net', 'facebook.net',
        // Adobe
        'adobe.com', 'demdex.net', 'everesttech.net', 'omtrdc.net', 'sc.omtrdc.net',
        // Piano Analytics
        'piano.io', 'at-o.net', 'xiti.com', 'atinternet-solutions.com',
        // TikTok
        'tiktok.com', 'bytedance.com', 'musical.ly', 'analytics.tiktok.com',
        // Twitter/X
        'twitter.com', 'x.com', 'twimg.com', 'ads-twitter.com',
        // LinkedIn
        'linkedin.com', 'licdn.com', 'bizographics.com',
        // Pinterest
        'pinterest.com', 'pinimg.com', 'analytics.pinterest.com',
        // Snapchat
        'snapchat.com', 'sc-static.net', 'tr.snapchat.com',
        // Amazon
        'amazon-adsystem.com', 'amazon.com', 'amazonadsi.com',
        // Microsoft/Bing
        'bing.com', 'clarity.ms', 'bat.bing.com',
        // Yahoo
        'ads.yahoo.com', 'yahoo.com', 'yimg.com',
        // Criteo
        'criteo.com', 'criteo.net',
        // ContentSquare
        'contentsquare.net', 't.contentsquare.net',
        // Other Analytics
        'quantserve.com', 'scorecardresearch.com', 'hotjar.com', 'fullstory.com',
        'mixpanel.com', 'segment.com', 'amplitude.com', 'heap.io',
        // CDNs and tracking services
        'jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com',
        // Generic tracking patterns
        'analytics', 'tracking', 'metrics', 'stats', 'tag', 'pixel', 'beacon'
    ];
    
    const tagPaths = [
        // Generic tracking paths
        '/collect', '/pixel', '/track', '/event', '/analytics', '/beacon', '/impression', '/conversion',
        '/ping', '/hit', '/fire', '/log', '/report', '/submit', '/send', '/capture',
        // File extensions commonly used for tracking
        '.gif', '.png', '.jpg', '.jpeg', '.js', '.json',
        // Specific vendor patterns
        '/gtag', '/gtm.js', '/ga.js', '/analytics.js', '/fbevents.js', '/tr.js',
        '/piano', '/tiktok', '/twitter', '/linkedin', '/pinterest', '/snapchat',
        // API endpoints
        '/api/', '/v1/', '/v2/', '/v3/', '/rest/', '/graphql/',
        // Common tracking parameters
        '?utm_', '?ga_', '?fb_', '?tt_', '?li_', '?pin_', '?tw_',
        // Tealium specific
        '/success-laura-solanes', '/i.gif', '/utag'
    ];
    
    // Check domains
    const isDomainMatch = tagDomains.some(domain => url.includes(domain));
    
    // Check paths
    const isPathMatch = tagPaths.some(path => url.includes(path));
    
    // Check for data/tracking parameters (expanded for all vendors)
    const hasTrackingParams = /[?&](utm_|ga_|fb_|_ga|tid=|cid=|ttclid|li_|pin_|tw_|sc_|adobe_|piano_|criteo_|doubleclick|gclid|fbclid|msclkid)/i.test(url);
    
    // Check for suspicious query parameters that suggest tracking
    const hasSuspiciousParams = /[?&](id=|uid=|user=|session=|visit=|timestamp=|event=|action=|category=|label=|value=|source=|medium=|campaign=)/i.test(url);
    
    // Check for base64 encoded data (common in tracking pixels)
    const hasEncodedData = /[?&][^=]*=[A-Za-z0-9+/=]{20,}/i.test(url);
    
    // Check for POST requests to external domains (often analytics)
    const isExternalDomain = !url.includes(window.location.hostname);
    
    // Check for requests that look like analytics based on URL structure
    const looksLikeAnalytics = /\/(track|collect|event|analytics|pixel|beacon|hit|fire|log|report|submit|send|capture)/i.test(url) ||
                              /\.(gif|png|jpg|jpeg)\?/i.test(url) ||
                              /\/[a-z0-9]{8,}/i.test(url); // Long random strings often used in tracking
    
    const isTagRelated = isDomainMatch || isPathMatch || hasTrackingParams || hasSuspiciousParams || hasEncodedData || (isExternalDomain && looksLikeAnalytics);
    
    // Log only when we detect a tag-related request
    if (isTagRelated) {
        console.log('🌐 Tag-related request detected:', url);
    }
    
    return isTagRelated;
}

/**
 * Set up event interception for debugging
 */
function setupEventInterception() {
    // Store original utag functions only if utag is loaded and functions exist
    if (typeof window.utag !== 'undefined' && typeof window.utag.view === 'function') {
        if (!window.utag._originalView) {
            window.utag._originalView = window.utag.view;
        }
        if (!window.utag._originalLink) {
            window.utag._originalLink = window.utag.link;
        }
    }
}

/**
 * Toggle event interceptor
 */
function toggleEventInterceptor() {
    // Try both button IDs (main header button and any legacy references)
    const btn = document.getElementById('mainInterceptorBtn') || document.getElementById('interceptorBtn');
    
    if (!eventDebugState.isIntercepting) {
        startEventInterception();
        btn.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Intercepting';
        
        // Update styling based on button type
        if (btn.id === 'mainInterceptorBtn') {
            btn.className = 'bg-red-500/90 backdrop-blur-sm text-white py-3 px-6 rounded-lg hover:bg-red-600/90 transition-colors font-medium text-lg border border-red-400/50';
        } else {
            btn.className = 'bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors text-sm';
        }
        
        eventDebugState.isIntercepting = true;
        logToDebugConsole('🚀 Event interception STARTED', 'info');
    } else {
        stopEventInterception();
        btn.innerHTML = '<i class="fas fa-play mr-2"></i>Start Intercepting';
        
        // Update styling based on button type
        if (btn.id === 'mainInterceptorBtn') {
            btn.className = 'bg-white/20 backdrop-blur-sm text-white py-3 px-6 rounded-lg hover:bg-white/30 transition-colors font-medium text-lg border border-white/30';
        } else {
            btn.className = 'bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors text-sm';
        }
        
        eventDebugState.isIntercepting = false;
        logToDebugConsole('🛑 Event interception STOPPED', 'info');
    }
}

/**
 * Start event interception
 */
function startEventInterception() {
    if (typeof window.utag === 'undefined') {
        logToDebugConsole('❌ ERROR: Tealium not loaded. Cannot intercept events.', 'error');
        return;
    }
    
    // Ensure original functions are stored before intercepting
    if (!window.utag._originalView && typeof window.utag.view === 'function') {
        window.utag._originalView = window.utag.view;
    }
    if (!window.utag._originalLink && typeof window.utag.link === 'function') {
        window.utag._originalLink = window.utag.link;
    }
    
    // Intercept utag.view
    window.utag.view = function(data, callback, uids) {
        const timestamp = new Date().toISOString();
        eventDebugState.preEventDataLayer = JSON.parse(JSON.stringify(window.utag_data || {}));
        
        logToDebugConsole(`📄 utag.view() fired at ${timestamp}`, 'event');
        logToDebugConsole(`   Data: ${JSON.stringify(data || {}, null, 2)}`, 'data');
        
        let result;
        
        // Call original function if it exists
        if (window.utag._originalView && typeof window.utag._originalView === 'function') {
            result = window.utag._originalView.call(this, data, callback, uids);
        } else {
            // Fallback: try to call original utag.view if _originalView is not available
            logToDebugConsole('⚠️ Original view function not found, attempting fallback', 'warning');
            // This shouldn't happen in normal circumstances
            result = undefined;
        }
        
        // Log post-event state
        setTimeout(() => {
            const postDataLayer = JSON.parse(JSON.stringify(window.utag_data || {}));
            const firedTags = getTagsFromLastEvent();
            
            eventDebugState.lastEventData = {
                type: 'view',
                data: data || {},
                timestamp: timestamp,
                preDataLayer: eventDebugState.preEventDataLayer,
                postDataLayer: postDataLayer,
                firedTags: firedTags
            };
            
            logTagFiring('view', data);
            addToEventHistory('view', data, timestamp, firedTags);
            showRealTimeDataLayerChanges(eventDebugState.preEventDataLayer, postDataLayer, 'view', data);
            validateEvent('view', data, timestamp);
        }, 100);
        
        return result;
    };
    
    // Intercept utag.link
    window.utag.link = function(data, callback, uids) {
        const timestamp = new Date().toISOString();
        eventDebugState.preEventDataLayer = JSON.parse(JSON.stringify(window.utag_data || {}));
        
        logToDebugConsole(`🔗 utag.link() fired at ${timestamp}`, 'event');
        logToDebugConsole(`   Data: ${JSON.stringify(data || {}, null, 2)}`, 'data');
        
        let result;
        
        // Call original function if it exists
        if (window.utag._originalLink && typeof window.utag._originalLink === 'function') {
            result = window.utag._originalLink.call(this, data, callback, uids);
        } else {
            // Fallback: try to call original utag.link if _originalLink is not available
            logToDebugConsole('⚠️ Original link function not found, attempting fallback', 'warning');
            // This shouldn't happen in normal circumstances
            result = undefined;
        }
        
        // Log post-event state
        setTimeout(() => {
            const postDataLayer = JSON.parse(JSON.stringify(window.utag_data || {}));
            const firedTags = getTagsFromLastEvent();
            
            eventDebugState.lastEventData = {
                type: 'link',
                data: data || {},
                timestamp: timestamp,
                preDataLayer: eventDebugState.preEventDataLayer,
                postDataLayer: postDataLayer,
                firedTags: firedTags
            };
            
            logTagFiring('link', data);
            addToEventHistory('link', data, timestamp, firedTags);
            showRealTimeDataLayerChanges(eventDebugState.preEventDataLayer, postDataLayer, 'link', data);
            validateEvent('link', data, timestamp);
        }, 100);
        
        return result;
    };
    
    logToDebugConsole('✅ Event interceptors installed', 'success');
}

/**
 * Stop event interception
 */
function stopEventInterception() {
    if (typeof window.utag !== 'undefined' && window.utag._originalView) {
        window.utag.view = window.utag._originalView;
        window.utag.link = window.utag._originalLink;
        logToDebugConsole('✅ Event interceptors removed', 'success');
    }
}

/**
 * Log to debug console
 */
function logToDebugConsole(message, type = 'info') {
    const console = document.getElementById('eventDebugConsole');
    if (!console) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
        'info': 'text-blue-400',
        'event': 'text-yellow-400',
        'data': 'text-gray-300',
        'success': 'text-green-400',
        'error': 'text-red-400',
        'warning': 'text-orange-400'
    };
    
    const colorClass = colors[type] || 'text-green-400';
    const logEntry = document.createElement('div');
    logEntry.className = `${colorClass} mb-1`;
    logEntry.innerHTML = `[${timestamp}] ${message}`;
    
    console.appendChild(logEntry);
    console.scrollTop = console.scrollHeight;
}

/**
 * Log tag firing information
 */
function logTagFiring(eventType, data) {
    if (typeof window.utag === 'undefined') return;
    
    const tags = window.utag.loader?.wq || [];
    const firedTags = tags.filter(tag => tag.uid).map(tag => tag.uid);
    
    if (firedTags.length > 0) {
        logToDebugConsole(`🏷️  Tags fired: ${firedTags.join(', ')}`, 'success');
    } else {
        logToDebugConsole('⚠️  No tags fired', 'warning');
    }
}

/**
 * Clear debug console
 */
function clearEventDebugConsole() {
    const console = document.getElementById('eventDebugConsole');
    if (console) {
        console.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-terminal text-gray-600 text-2xl mb-2"></i>
                <p class="text-gray-400">Console cleared - start intercepting to see events</p>
            </div>
        `;
    }
}

/**
 * Trigger Page View Events
 */
function triggerPageView(pageType) {
    if (typeof window.utag === 'undefined' || typeof window.utag.view !== 'function') {
        alert('Tealium not loaded or utag.view not available. Please load Tealium first.');
        return;
    }
    
    const pageData = {
        'home': {
            page_name: 'Home Page',
            page_type: 'home',
            page_category: 'main',
            site_section: 'home'
        },
        'product': {
            page_name: 'Product Detail Page',
            page_type: 'product',
            page_category: 'catalog',
            site_section: 'products',
            product_id: 'PROD-123',
            product_name: 'Sample Product',
            product_category: 'Electronics',
            product_price: '99.99'
        },
        'category': {
            page_name: 'Category Page',
            page_type: 'category',
            page_category: 'catalog',
            site_section: 'products',
            category_name: 'Electronics',
            category_id: 'CAT-ELEC'
        }
    };
    
    const data = pageData[pageType] || {};
    window.utag.view(data);
    
    if (!eventDebugState.isIntercepting) {
        addToEventHistory('view', data, new Date().toISOString());
    }
}

/**
 * Trigger SPA Page View
 */
function triggerSPAPageView() {
    if (typeof window.utag === 'undefined' || typeof window.utag.view !== 'function') {
        alert('Tealium not loaded or utag.view not available. Please load Tealium first.');
        return;
    }
    
    const data = {
        page_name: 'SPA Virtual Page',
        page_type: 'virtual',
        page_category: 'spa',
        site_section: 'app',
        spa_previous_page: window.location.pathname,
        spa_new_page: '/virtual-page'
    };
    
    window.utag.view(data);
    
    if (!eventDebugState.isIntercepting) {
        addToEventHistory('view', data, new Date().toISOString());
    }
}

/**
 * Trigger Link Events
 */
function triggerLinkEvent(linkType, location) {
    if (typeof window.utag === 'undefined' || typeof window.utag.link !== 'function') {
        alert('Tealium not loaded or utag.link not available. Please load Tealium first.');
        return;
    }
    
    const linkData = {
        'click': {
            'header': {
                event_type: 'link_click',
                link_location: 'header',
                link_text: 'Header Navigation Link',
                link_url: '/header-link'
            },
            'footer': {
                event_type: 'link_click',
                link_location: 'footer',
                link_text: 'Footer Link',
                link_url: '/footer-link'
            }
        },
        'download': {
            'pdf': {
                event_type: 'file_download',
                file_type: 'pdf',
                file_name: 'sample-document.pdf',
                file_size: '2.5MB'
            }
        },
        'external': {
            'social': {
                event_type: 'external_link',
                link_type: 'social_media',
                social_platform: 'twitter',
                link_url: 'https://twitter.com/share'
            }
        }
    };
    
    const data = linkData[linkType]?.[location] || {};
    window.utag.link(data);
    
    if (!eventDebugState.isIntercepting) {
        addToEventHistory('link', data, new Date().toISOString());
    }
}

/**
 * Trigger E-commerce Events
 */
function triggerEcommerceEvent(eventType) {
    if (typeof window.utag === 'undefined' || typeof window.utag.link !== 'function') {
        alert('Tealium not loaded or utag.link not available. Please load Tealium first.');
        return;
    }
    
    const ecommerceData = {
        'product_view': {
            event_type: 'product_view',
            product_id: 'PROD-456',
            product_name: 'Premium Headphones',
            product_category: 'Electronics',
            product_brand: 'AudioTech',
            product_price: '199.99',
            currency: 'USD'
        },
        'add_to_cart': {
            event_type: 'add_to_cart',
            product_id: 'PROD-456',
            product_name: 'Premium Headphones',
            product_category: 'Electronics',
            product_quantity: '1',
            product_price: '199.99',
            currency: 'USD',
            cart_total: '199.99'
        },
        'purchase': {
            event_type: 'purchase',
            order_id: 'ORDER-789',
            order_total: '199.99',
            order_tax: '16.00',
            order_shipping: '9.99',
            currency: 'USD',
            payment_method: 'credit_card'
        },
        'checkout_start': {
            event_type: 'checkout_start',
            cart_total: '199.99',
            cart_items: '1',
            currency: 'USD'
        }
    };
    
    const data = ecommerceData[eventType] || {};
    window.utag.link(data);
    
    if (!eventDebugState.isIntercepting) {
        addToEventHistory('link', data, new Date().toISOString());
    }
}

/**
 * Initialize custom event variables
 */
function initializeCustomEventVariables() {
    const container = document.getElementById('customEventVariables');
    if (!container) return;
    
    // Add one default variable input
    addCustomEventVariable();
}

/**
 * Add custom event variable input
 */
function addCustomEventVariable() {
    const container = document.getElementById('customEventVariables');
    if (!container) return;
    
    const variableDiv = document.createElement('div');
    variableDiv.className = 'flex space-x-2';
    variableDiv.innerHTML = `
        <input type="text" placeholder="variable_name" 
               class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500">
        <input type="text" placeholder="value" 
               class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500">
        <button onclick="this.parentElement.remove()" 
                class="text-red-600 hover:text-red-700 px-2">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(variableDiv);
}

/**
 * Trigger custom event
 */
function triggerCustomEvent() {
    if (typeof window.utag === 'undefined' || (typeof window.utag.view !== 'function' && typeof window.utag.link !== 'function')) {
        alert('Tealium not loaded or utag functions not available. Please load Tealium first.');
        return;
    }
    
    const eventType = document.getElementById('customEventType')?.value || 'link';
    const eventName = document.getElementById('customEventName')?.value || 'custom_event';
    const eventCategory = document.getElementById('customEventCategory')?.value || '';
    const eventAction = document.getElementById('customEventAction')?.value || '';
    
    // Collect custom variables
    const variableInputs = document.querySelectorAll('#customEventVariables > div');
    const customVars = {};
    
    variableInputs.forEach(div => {
        const inputs = div.querySelectorAll('input');
        if (inputs.length === 2 && inputs[0].value && inputs[1].value) {
            customVars[inputs[0].value] = inputs[1].value;
        }
    });
    
    // Build event data
    const eventData = {
        event_name: eventName,
        event_type: eventName,
        ...customVars
    };
    
    if (eventCategory) eventData.event_category = eventCategory;
    if (eventAction) eventData.event_action = eventAction;
    
    // Fire event based on type
    if (eventType === 'view') {
        window.utag.view(eventData);
    } else {
        window.utag.link(eventData);
    }
    
    if (!eventDebugState.isIntercepting) {
        addToEventHistory(eventType, eventData, new Date().toISOString());
    }
}

/**
 * Enhanced tag detection using utagdb and network analysis
 */
function getTagsFromLastEvent() {
    const detectedTags = [];
    
    // Priority 1: Parse intercepted console logs for SENDING patterns (most reliable for actual firing)
    const consoleTags = parseConsoleForSendingTags();
    detectedTags.push(...consoleTags);
    
    // Priority 2: Check network requests for tag initiators (actual network activity)
    const networkTags = getTagsFromNetworkRequests();
    detectedTags.push(...networkTags);
    
    // Priority 3: Check recent tag activity from our monitoring (only recent firings)
    const recentTagActivity = getRecentTagActivity();
    detectedTags.push(...recentTagActivity);
    
    // Priority 4: Check utag.loader.wq for queued/fired tags (if available)
    if (typeof window.utag !== 'undefined' && window.utag.loader && window.utag.loader.wq) {
        const tags = window.utag.loader.wq || [];
        const tagUIDs = tags.filter(tag => tag && tag.uid).map(tag => tag.uid);
        detectedTags.push(...tagUIDs);
    }
    
    // Only use utag.loader.cfg as a fallback if no other methods found tags
    // and only check for tags that have very recently changed state
    if (detectedTags.length === 0) {
        if (typeof window.utag !== 'undefined' && window.utag.loader && window.utag.loader.cfg) {
            const cfg = window.utag.loader.cfg;
            Object.keys(cfg).forEach(tagId => {
                // Only include if tag was sent (send=1) - more reliable than load=1
                if (cfg[tagId] && cfg[tagId].send === 1) {
                    detectedTags.push(parseInt(tagId));
                }
            });
        }
    }
    
    // Remove duplicates and return
    return [...new Set(detectedTags)];
}

/**
 * Get recent tag activity from our monitoring (only tags that fired in last 10 seconds)
 */
function getRecentTagActivity() {
    const tags = [];
    const tenSecondsAgo = Date.now() - 10000;
    
    // Check our tag analysis data for recent activity
    Object.keys(eventDebugState.tagAnalysisData).forEach(tagKey => {
        const tagData = eventDebugState.tagAnalysisData[tagKey];
        if (tagData && tagData.lastSeen && tagData.lastSeen > tenSecondsAgo) {
            const tagId = tagKey.replace('tag_', '');
            if (!isNaN(tagId)) {
                tags.push(parseInt(tagId));
            }
        }
    });
    
    return tags;
}

/**
 * Parse console logs for any tag firing patterns from utagdb
 */
function parseConsoleForSendingTags() {
    const tags = [];
    const fiveSecondsAgo = Date.now() - 5000; // Only look at very recent logs
    
    // Store recent console logs to check for various patterns
    if (eventDebugState.recentConsoleLogs) {
        // Only check the first 10 most recent logs to avoid old data
        const recentLogs = eventDebugState.recentConsoleLogs.slice(0, 10);
        
        recentLogs.forEach(logEntry => {
            // Handle both old string format and new object format
            let log, timestamp;
            
            if (typeof logEntry === 'string') {
                log = logEntry;
                timestamp = Date.now(); // Assume recent if no timestamp
            } else if (typeof logEntry === 'object') {
                log = logEntry.message || '';
                timestamp = logEntry.timestamp || Date.now();
            } else {
                return;
            }
            
            // Skip if this is an old log entry
            if (timestamp < fiveSecondsAgo) {
                return;
            }
            
            if (typeof log === 'string') {
                // Pattern 1: "SENDING: X" - direct tag firing
                let match = log.match(/SENDING:\s*(\d+)/);
                if (match) {
                    tags.push(parseInt(match[1]));
                    return;
                }
                
                // Pattern 2: "send:X" - tag send function
                match = log.match(/send:(\d+)(?:\s|:|$)/);
                if (match) {
                    tags.push(parseInt(match[1]));
                    return;
                }
                
                // Pattern 3: "utag.loader.LOAD X" - tag loaded
                match = log.match(/utag\.loader\.LOAD\s*(\d+)/);
                if (match) {
                    tags.push(parseInt(match[1]));
                    return;
                }
                
                // Pattern 4: "Attach to script" with tag reference
                match = log.match(/Attach to script.*utag[._](\d+)/);
                if (match) {
                    tags.push(parseInt(match[1]));
                    return;
                }
                
                // Pattern 5: "Data sent using sendBeacon" (indicates tag 4 fired)
                if (log.includes('Data sent using sendBeacon')) {
                    // This is typically from tag 4 (Tealium Collect)
                    tags.push(4);
                    return;
                }
            }
        });
    }
    
    return tags;
}

/**
 * Extract tag IDs from network requests using multiple methods
 */
function getTagsFromNetworkRequests() {
    const tags = [];
    
    // Method 1: Use intercepted network requests (most reliable)
    const recentInterceptedRequests = eventDebugState.networkRequests
        .filter(req => {
            const timeSinceRequest = Date.now() - req.startTime;
            return timeSinceRequest < 3000 && req.isTagRelated; // Last 3 seconds
        });
    
    recentInterceptedRequests.forEach(request => {
        // Extract tag ID from URL patterns
        if (request.url && request.url.includes('utag')) {
            const tagIdMatch = request.url.match(/utag[._](\d+)(?:[._]js)?/);
            if (tagIdMatch) {
                tags.push(parseInt(tagIdMatch[1]));
            }
        }
        
        // Look for referrer information that might indicate tag origin
        if (request.referrer) {
            const referrerMatch = request.referrer.match(/utag[._](\d+)/);
            if (referrerMatch) {
                tags.push(parseInt(referrerMatch[1]));
            }
        }
    });
    
    // Method 2: Fallback to Performance API (less reliable but broader coverage)
    try {
        if (window.performance && window.performance.getEntriesByType) {
            const recentEntries = window.performance.getEntriesByType('resource')
                .filter(entry => {
                    const timeSinceEvent = Date.now() - (window.performance.timing.navigationStart + entry.startTime);
                    return timeSinceEvent < 3000; // Last 3 seconds
                });
            
            recentEntries.forEach(entry => {
                // Extract tag ID from the URL itself (like utag.4.js)
                if (entry.name && entry.name.includes('utag')) {
                    const tagIdMatch = entry.name.match(/utag[._](\d+)(?:[._]js)?/);
                    if (tagIdMatch) {
                        tags.push(parseInt(tagIdMatch[1]));
                    }
                }
                
                // Check the initiator column for tag references (like "utag.4.js")
                // This is key for detecting which tag initiated network requests
                if (entry.initiator && typeof entry.initiator === 'string') {
                    const initiatorMatch = entry.initiator.match(/utag[._](\d+)/);
                    if (initiatorMatch) {
                        tags.push(parseInt(initiatorMatch[1]));
                    }
                }
            });
        }
    } catch (e) {
        console.warn('Could not analyze performance API for tag detection:', e);
    }
    
    return tags;
}

/**
 * Show real-time data layer changes
 */
function showRealTimeDataLayerChanges(preData, postData, eventType, eventData) {
    const container = document.getElementById('realTimeDataLayerChanges');
    if (!container) return;
    
    // Remove "no changes" message if present
    const noChangesMsg = container.querySelector('.text-center.py-8');
    if (noChangesMsg) {
        noChangesMsg.remove();
    }
    
    // Find meaningful changes (same logic as analyzeLastEventImpact but simplified)
    const changes = [];
    const allKeys = new Set([...Object.keys(preData), ...Object.keys(postData)]);
    
    allKeys.forEach(key => {
        const before = preData[key];
        const after = postData[key];
        
        // Only track meaningful changes
        if (typeof before !== 'object' && typeof after !== 'object') {
            if (before !== after) {
                changes.push({ key, before, after, type: 'modified' });
            }
        } else if (before === undefined && after !== undefined) {
            changes.push({ key, before, after, type: 'added' });
        } else if (before !== undefined && after === undefined) {
            changes.push({ key, before, after, type: 'removed' });
        }
    });
    
    // Create change entry
    const changeEntry = document.createElement('div');
    changeEntry.className = 'bg-gray-50 rounded-lg p-3 border-l-4 border-purple-400';
    
    const eventTypeColor = eventType === 'view' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    const timestamp = new Date().toLocaleTimeString();
    
    let html = `
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
                <span class="px-2 py-1 rounded text-xs font-medium ${eventTypeColor}">${eventType.toUpperCase()}</span>
                <span class="text-xs text-gray-500">${timestamp}</span>
            </div>
            <span class="text-xs text-purple-600">${changes.length} changes</span>
        </div>
    `;
    
    if (changes.length > 0) {
        html += `<div class="space-y-1">`;
        changes.slice(0, 3).forEach(change => { // Show only first 3 changes
            const icon = change.type === 'added' ? '➕' : change.type === 'removed' ? '➖' : '🔄';
            html += `<div class="text-xs">${icon} <strong>${change.key}</strong></div>`;
        });
        if (changes.length > 3) {
            html += `<div class="text-xs text-gray-500">... and ${changes.length - 3} more</div>`;
        }
        html += `</div>`;
    } else {
        html += `<div class="text-xs text-gray-500">No data layer changes detected</div>`;
    }
    
    changeEntry.innerHTML = html;
    container.insertBefore(changeEntry, container.firstChild);
    
    // Limit to 20 entries
    const entries = container.querySelectorAll('.bg-gray-50.rounded-lg');
    if (entries.length > 20) {
        for (let i = 20; i < entries.length; i++) {
            entries[i].remove();
        }
    }
}

/**
 * Add event to history
 */
function addToEventHistory(type, data, timestamp, firedTags = []) {
    const historyContainer = document.getElementById('eventHistory');
    if (!historyContainer) return;
    
    // Remove "no events" message if present
    const noEventsMsg = historyContainer.querySelector('.text-center.py-8');
    if (noEventsMsg) {
        noEventsMsg.remove();
    }
    
    const eventEntry = document.createElement('div');
    eventEntry.className = 'bg-gray-50 rounded-lg p-3 border border-gray-200';
    
    const typeColors = {
        'view': 'bg-blue-100 text-blue-800',
        'link': 'bg-green-100 text-green-800'
    };
    
    const colorClass = typeColors[type] || 'bg-gray-100 text-gray-800';
    
    let tagsHtml = '';
    if (firedTags && firedTags.length > 0) {
        tagsHtml = `<div class="mt-2 flex flex-wrap gap-1">
            ${firedTags.map(tagId => `<span class="px-1 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">Tag ${tagId}</span>`).join('')}
        </div>`;
    }
    
    eventEntry.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <span class="px-2 py-1 rounded text-xs font-medium ${colorClass}">${type.toUpperCase()}</span>
            <span class="text-xs text-gray-500">${new Date(timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="text-sm font-mono text-gray-700 bg-white rounded p-2 max-h-20 overflow-y-auto">
            ${JSON.stringify(data, null, 2)}
        </div>
        ${tagsHtml}
    `;
    
    historyContainer.insertBefore(eventEntry, historyContainer.firstChild);
    
    // Store in state
    eventDebugState.eventHistory.unshift({
        type,
        data,
        timestamp
    });
    
    // Limit history to 50 events
    if (eventDebugState.eventHistory.length > 50) {
        eventDebugState.eventHistory = eventDebugState.eventHistory.slice(0, 50);
        const historyEntries = historyContainer.querySelectorAll('.bg-gray-50.rounded-lg');
        if (historyEntries.length > 50) {
            for (let i = 50; i < historyEntries.length; i++) {
                historyEntries[i].remove();
            }
        }
    }
    
    // Save to session
    saveEventHistory();
}

/**
 * Clear event history
 */
function clearEventHistory() {
    const historyContainer = document.getElementById('eventHistory');
    if (!historyContainer) return;
    
    historyContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-history text-gray-300 text-3xl mb-3"></i>
            <p>No events fired yet</p>
        </div>
    `;
    
    eventDebugState.eventHistory = [];
    saveEventHistory();
}

/**
 * Export event history
 */
function exportEventHistory() {
    if (eventDebugState.eventHistory.length === 0) {
        alert('No events to export');
        return;
    }
    
    const data = {
        exported_at: new Date().toISOString(),
        event_count: eventDebugState.eventHistory.length,
        events: eventDebugState.eventHistory
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tealium-events-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Save event history to session
 */
function saveEventHistory() {
    // Skip saving if we're in journey mode and generating lots of events
    if (window.journeyState && eventDebugState.eventHistory.length > 10) {
        return; // Don't save when journey is generating many events
    }
    
    if (typeof window.sessionManager !== 'undefined' && window.sessionManager.isSessionActive) {
        // Save only essential data and reduce size
        try {
            const essentialEvents = eventDebugState.eventHistory.slice(-5).map(event => ({
                type: event.type,
                timestamp: event.timestamp,
                data: event.data ? { 
                    event: event.data.event, 
                    page_name: event.data.page_name,
                    journey_step: event.data.journey_step 
                } : null
            }));
            localStorage.setItem('tealium-events-history', JSON.stringify(essentialEvents));
        } catch (e) {
            console.log('Could not save event history - storage quota exceeded, clearing old data');
            // Clear old data if storage is full
            try {
                localStorage.removeItem('tealium-events-history');
                eventDebugState.eventHistory = eventDebugState.eventHistory.slice(-3); // Keep only last 3
            } catch (e2) {
                console.log('Could not clear localStorage');
            }
        }
    }
}

/**
 * Load event history from session
 */
function loadEventHistory() {
    try {
        const saved = localStorage.getItem('tealium-events-history');
        if (saved) {
            const events = JSON.parse(saved);
            events.forEach(event => {
                addToEventHistory(event.type, event.data, event.timestamp);
            });
        }
    } catch (e) {
        console.warn('Could not load event history from localStorage');
    }
}

/**
 * Analyze last event impact
 */
function analyzeLastEventImpact() {
    const resultsDiv = document.getElementById('dataLayerImpactResults');
    if (!resultsDiv) return;
    
    if (!eventDebugState.lastEventData) {
        resultsDiv.innerHTML = `
            <div class="text-orange-600">
                <i class="fas fa-exclamation-triangle mr-1"></i>No recent event data available. Fire an event first.
            </div>
        `;
        return;
    }
    
    const { preDataLayer, postDataLayer, type, timestamp, data } = eventDebugState.lastEventData;
    
    // Find meaningful differences (not objects/arrays that look the same)
    const changes = [];
    const allKeys = new Set([...Object.keys(preDataLayer), ...Object.keys(postDataLayer)]);
    
    allKeys.forEach(key => {
        const before = preDataLayer[key];
        const after = postDataLayer[key];
        
        // Skip if both are undefined/null
        if ((before === undefined || before === null) && (after === undefined || after === null)) {
            return;
        }
        
        // For primitive values, use simple comparison
        if (typeof before !== 'object' && typeof after !== 'object') {
            if (before !== after) {
                changes.push({
                    key,
                    before,
                    after,
                    type: 'modified'
                });
            }
        } 
        // For objects/arrays, use JSON comparison but only if actually different
        else {
            const beforeStr = JSON.stringify(before);
            const afterStr = JSON.stringify(after);
            if (beforeStr !== afterStr) {
                // Only show if it's a meaningful change (not just internal reordering)
                if (before === undefined || after === undefined) {
                    changes.push({
                        key,
                        before,
                        after,
                        type: before === undefined ? 'added' : 'removed'
                    });
                } else if (Array.isArray(before) && Array.isArray(after)) {
                    // For arrays, check if length changed or new items added
                    if (before.length !== after.length) {
                        changes.push({
                            key,
                            before: `Array[${before.length}]`,
                            after: `Array[${after.length}]`,
                            type: 'modified'
                        });
                    }
                }
            }
        }
    });
    
    // Add event data variables that were sent
    const eventDataVars = Object.keys(data || {});
    
    let html = `<div class="text-sm">`;
    html += `<div class="font-medium mb-2">Last Event: ${type.toUpperCase()} at ${new Date(timestamp).toLocaleTimeString()}</div>`;
    
    // Show event data that was sent
    if (eventDataVars.length > 0) {
        html += `<div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">`;
        html += `<div class="text-blue-800 font-medium mb-2 text-sm">📤 Event Data Sent</div>`;
        html += `<div class="space-y-1 max-h-48 overflow-y-auto overflow-x-hidden">`;
        eventDataVars.forEach(key => {
            const value = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key] || 'undefined');
            const truncatedValue = value && value.length > 50 ? value.substring(0, 47) + '...' : value;
            html += `<div class="text-xs text-blue-700 font-mono bg-white px-2 py-1 rounded border break-all">
                <span class="font-semibold text-blue-800">${key}:</span> 
                <span class="text-gray-700">${truncatedValue}</span>
            </div>`;
        });
        html += `</div></div>`;
    }
    
    // Show meaningful data layer changes
    if (changes.length === 0) {
        html += `<div class="text-green-700 bg-green-50 border border-green-200 rounded-md p-2 text-sm">
            <i class="fas fa-check mr-2"></i>No data layer changes detected
        </div>`;
    } else {
        html += `<div class="bg-orange-50 border border-orange-200 rounded-md p-3">`;
        html += `<div class="text-orange-800 font-medium mb-2 text-sm">🔄 ${changes.length} Data Layer Changes</div>`;
        html += `<div class="space-y-2">`;
        changes.slice(0, 5).forEach(change => { // Limit to 5 changes for cleaner display
            const icon = change.type === 'added' ? '➕' : change.type === 'removed' ? '➖' : '🔄';
            const beforeValue = typeof change.before === 'string' ? change.before : JSON.stringify(change.before);
            const afterValue = typeof change.after === 'string' ? change.after : JSON.stringify(change.after);
            const truncatedBefore = beforeValue && beforeValue.length > 30 ? beforeValue.substring(0, 27) + '...' : beforeValue;
            const truncatedAfter = afterValue && afterValue.length > 30 ? afterValue.substring(0, 27) + '...' : afterValue;
            
            html += `<div class="bg-white rounded border p-2">
                <div class="font-mono text-xs break-all">
                    <div class="font-semibold text-gray-800 mb-1">${icon} ${change.key}</div>
                    <div class="text-gray-600">
                        <span class="text-red-600">${truncatedBefore || 'undefined'}</span> 
                        <span class="mx-2">→</span> 
                        <span class="text-green-600">${truncatedAfter || 'undefined'}</span>
                    </div>
                </div>
            </div>`;
        });
        if (changes.length > 5) {
            html += `<div class="text-xs text-gray-500 text-center py-1">... and ${changes.length - 5} more changes</div>`;
        }
        html += `</div></div>`;
    }
    
    html += `</div>`;
    resultsDiv.innerHTML = html;
}

/**
 * Compare data layer states
 */
function compareDataLayerStates() {
    const resultsDiv = document.getElementById('dataLayerImpactResults');
    if (!resultsDiv) return;
    
    if (typeof window.utag_data === 'undefined') {
        resultsDiv.innerHTML = `
            <div class="text-red-600">
                <i class="fas fa-times mr-1"></i>utag_data not available. Load Tealium first.
            </div>
        `;
        return;
    }
    
    const currentData = window.utag_data;
    const processedData = typeof window.utag !== 'undefined' && window.utag.data ? window.utag.data : {};
    
    // Count differences
    const currentKeys = Object.keys(currentData).length;
    const processedKeys = Object.keys(processedData).length;
    
    let html = `<div class="text-sm">`;
    html += `<div class="mb-2"><strong>Data Layer Comparison:</strong></div>`;
    html += `<div class="ml-4 mb-1">utag_data variables: ${currentKeys}</div>`;
    html += `<div class="ml-4 mb-1">utag.data variables: ${processedKeys}</div>`;
    
    if (processedKeys > currentKeys) {
        const diff = processedKeys - currentKeys;
        html += `<div class="text-blue-600 ml-4"><i class="fas fa-plus mr-1"></i>${diff} variables added by Tealium processing</div>`;
    } else if (currentKeys > processedKeys) {
        const diff = currentKeys - processedKeys;
        html += `<div class="text-orange-600 ml-4"><i class="fas fa-minus mr-1"></i>${diff} variables not processed</div>`;
    } else {
        html += `<div class="text-green-600 ml-4"><i class="fas fa-check mr-1"></i>Variable counts match</div>`;
    }
    
    html += `</div>`;
    resultsDiv.innerHTML = html;
}

/**
 * Validate event data layer
 */
function validateEventDataLayer() {
    if (typeof window.validateDataLayer === 'function') {
        // Call the main data layer validator
        window.validateDataLayer();
        
        // Update results in events section
        const resultsDiv = document.getElementById('dataLayerImpactResults');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="text-blue-600">
                    <i class="fas fa-external-link-alt mr-1"></i>
                    Data layer validation triggered. Check Data Layer section for full results.
                </div>
            `;
        }
    } else {
        const resultsDiv = document.getElementById('dataLayerImpactResults');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="text-red-600">
                    <i class="fas fa-times mr-1"></i>Data layer validator not available. Load Data Layer section first.
                </div>
            `;
        }
    }
}

/**
 * Analyze tag performance
 */
function analyzeTagPerformance() {
    const resultsDiv = document.getElementById('tagAnalysisResults');
    if (!resultsDiv) return;
    
    if (typeof window.utag === 'undefined') {
        resultsDiv.innerHTML = `
            <div class="text-red-600">
                <i class="fas fa-times mr-1"></i>Tealium not loaded. Cannot analyze tags.
            </div>
        `;
        return;
    }
    
    const tags = window.utag.loader?.wq || [];
    const loadedTags = tags.filter(tag => tag.uid);
    const totalTags = Object.keys(window.utag.loader?.cfg || {}).length;
    
    let html = `<div class="text-sm">`;
    html += `<div class="mb-2"><strong>Tag Performance Analysis:</strong></div>`;
    html += `<div class="ml-4 mb-1">Total configured tags: ${totalTags}</div>`;
    html += `<div class="ml-4 mb-1">Loaded tags: ${loadedTags.length}</div>`;
    
    if (loadedTags.length > 0) {
        html += `<div class="text-green-600 ml-4 mb-2"><i class="fas fa-check mr-1"></i>Tags loading successfully</div>`;
        html += `<div class="ml-4"><strong>Loaded tag IDs:</strong> ${loadedTags.map(t => t.uid).join(', ')}</div>`;
    } else {
        html += `<div class="text-orange-600 ml-4"><i class="fas fa-exclamation-triangle mr-1"></i>No tags loaded yet</div>`;
    }
    
    html += `</div>`;
    resultsDiv.innerHTML = html;
}

/**
 * Check tag load rules
 */
function checkTagLoadRules() {
    const resultsDiv = document.getElementById('tagAnalysisResults');
    if (!resultsDiv) return;
    
    if (typeof window.utag === 'undefined') {
        resultsDiv.innerHTML = `
            <div class="text-red-600">
                <i class="fas fa-times mr-1"></i>Tealium not loaded. Cannot check load rules.
            </div>
        `;
        return;
    }
    
    // Check load rules evaluation
    const loadRules = window.utag.loader?.cfg || {};
    const ruleResults = window.utag.loader?.rd || {};
    
    let html = `<div class="text-sm">`;
    html += `<div class="mb-2"><strong>Load Rules Analysis:</strong></div>`;
    
    Object.keys(loadRules).forEach(tagId => {
        const ruleResult = ruleResults[tagId];
        const status = ruleResult === 1 ? 'PASS' : 'FAIL';
        const statusClass = ruleResult === 1 ? 'text-green-600' : 'text-red-600';
        html += `<div class="ml-4 mb-1">Tag ${tagId}: <span class="${statusClass}">${status}</span></div>`;
    });
    
    html += `</div>`;
    resultsDiv.innerHTML = html;
}

/**
 * Inspect tag mappings
 */
function inspectTagMappings() {
    const resultsDiv = document.getElementById('tagAnalysisResults');
    if (!resultsDiv) return;
    
    if (typeof window.utag === 'undefined') {
        resultsDiv.innerHTML = `
            <div class="text-red-600">
                <i class="fas fa-times mr-1"></i>Tealium not loaded. Cannot inspect mappings.
            </div>
        `;
        return;
    }
    
    // Get tag mappings
    const tags = window.utag.loader?.cfg || {};
    const mappedVars = [];
    
    Object.keys(tags).forEach(tagId => {
        const tagConfig = tags[tagId];
        if (tagConfig && tagConfig.map) {
            Object.keys(tagConfig.map).forEach(sourceVar => {
                const mapping = tagConfig.map[sourceVar];
                mappedVars.push({
                    tagId,
                    source: sourceVar,
                    destination: mapping
                });
            });
        }
    });
    
    let html = `<div class="text-sm">`;
    html += `<div class="mb-2"><strong>Tag Mappings:</strong></div>`;
    
    if (mappedVars.length === 0) {
        html += `<div class="text-gray-600 ml-4">No mappings found or mappings not accessible</div>`;
    } else {
        html += `<div class="ml-4 mb-2">Found ${mappedVars.length} variable mappings</div>`;
        mappedVars.slice(0, 5).forEach(mapping => {
            html += `<div class="ml-4 text-xs mb-1">Tag ${mapping.tagId}: ${mapping.source} → ${mapping.destination}</div>`;
        });
        if (mappedVars.length > 5) {
            html += `<div class="ml-4 text-xs text-gray-600">... and ${mappedVars.length - 5} more</div>`;
        }
    }
    
    html += `</div>`;
    resultsDiv.innerHTML = html;
}

// Initialize network monitoring immediately on script load (before DOM ready)
// This ensures we capture all network requests from the very beginning
setupNetworkMonitoring();

// Initialize full events system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('events')) {
        initializeEvents();
    }
});

/**
 * Update network statistics display
 */
function updateNetworkStatistics(requests) {
    const totalEl = document.getElementById('totalRequests');
    const successfulEl = document.getElementById('successfulRequests');
    const avgTimeEl = document.getElementById('avgResponseTime');
    const dataEl = document.getElementById('totalDataTransferred');
    
    if (!totalEl) return;
    
    const total = requests.length;
    const successful = requests.filter(r => r.status >= 200 && r.status < 300).length;
    const avgTime = total > 0 ? Math.round(requests.reduce((sum, r) => sum + (r.duration || 0), 0) / total) : 0;
    const totalData = requests.reduce((sum, r) => sum + (r.size || 0) + (r.responseSize || 0), 0);
    
    totalEl.textContent = total;
    successfulEl.textContent = successful;
    avgTimeEl.textContent = `${avgTime}ms`;
    dataEl.textContent = formatBytes(totalData);
}

/**
 * Toggle network auto-update
 */
function toggleNetworkAutoUpdate() {
    eventDebugState.networkAutoUpdate = !eventDebugState.networkAutoUpdate;
    const btn = document.getElementById('networkAutoUpdateBtn');
    if (btn) {
        if (eventDebugState.networkAutoUpdate) {
            btn.innerHTML = '<i class="fas fa-sync-alt mr-1"></i>Auto-Update: ON';
            btn.className = 'bg-green-600 text-white py-1 px-3 rounded text-xs font-medium hover:bg-green-700 transition-colors';
        } else {
            btn.innerHTML = '<i class="fas fa-pause mr-1"></i>Auto-Update: OFF';
            btn.className = 'bg-gray-600 text-white py-1 px-3 rounded text-xs font-medium hover:bg-gray-700 transition-colors';
        }
    }
}

/**
 * Export network details as JSON
 */
function exportNetworkDetails() {
    const data = {
        timestamp: new Date().toISOString(),
        requests: eventDebugState.networkRequests.filter(r => r.isTagRelated),
        statistics: {
            total: eventDebugState.networkRequests.filter(r => r.isTagRelated).length,
            vendors: [...new Set(eventDebugState.networkRequests.filter(r => r.isTagRelated).map(r => r.vendor))]
        }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-details-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Get vendor-specific gradient classes (kept for backward compatibility)
 */
function getVendorGradient(vendor) {
    const gradients = {
        'Google': 'from-blue-500 to-green-500',
        'Facebook': 'from-blue-600 to-indigo-700',
        'Piano Analytics': 'from-purple-500 to-pink-500',
        'TikTok': 'from-black to-red-500',
        'Twitter/X': 'from-blue-400 to-black',
        'LinkedIn': 'from-blue-700 to-blue-800',
        'Tealium': 'from-purple-600 to-blue-600',
        'Adobe': 'from-red-500 to-orange-500',
        'Criteo': 'from-orange-500 to-yellow-500',
        'ContentSquare': 'from-green-500 to-teal-500'
    };
    return gradients[vendor] || 'from-gray-500 to-gray-600';
}

/**
 * Get vendor-specific border colors (neutral styling)
 */
function getVendorBorderColor(vendor) {
    const borderColors = {
        'Google': 'border-blue-400',
        'Facebook': 'border-blue-500',
        'Piano Analytics': 'border-purple-400',
        'TikTok': 'border-gray-800',
        'Twitter/X': 'border-blue-400',
        'LinkedIn': 'border-blue-600',
        'Tealium': 'border-purple-500',
        'Adobe': 'border-red-400',
        'Criteo': 'border-orange-400',
        'ContentSquare': 'border-green-400'
    };
    return borderColors[vendor] || 'border-gray-400';
}

/**
 * Get vendor-specific text colors (neutral styling)
 */
function getVendorTextColor(vendor) {
    const textColors = {
        'Google': 'text-blue-600',
        'Facebook': 'text-blue-700',
        'Piano Analytics': 'text-purple-600',
        'TikTok': 'text-gray-800',
        'Twitter/X': 'text-blue-600',
        'LinkedIn': 'text-blue-700',
        'Tealium': 'text-purple-600',
        'Adobe': 'text-red-600',
        'Criteo': 'text-orange-600',
        'ContentSquare': 'text-green-600'
    };
    return textColors[vendor] || 'text-gray-600';
}

/**
 * Get status code badge colors (neutral styling)
 */
function getStatusBadgeColor(status) {
    if (!status) return 'bg-gray-100 text-gray-600';
    
    const code = parseInt(status);
    
    if (code >= 200 && code < 300) {
        return 'bg-green-100 text-green-700';
    }
    if (code >= 300 && code < 400) {
        return 'bg-blue-100 text-blue-700';
    }
    if (code >= 400 && code < 500) {
        return 'bg-orange-100 text-orange-700';
    }
    if (code >= 500) {
        return 'bg-red-100 text-red-700';
    }
    
    return 'bg-gray-100 text-gray-600';
}

/**
 * Prettify query string for better readability
 */
function prettifyQueryString(url) {
    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        if (params.toString() === '') return '';
        
        let html = '<div class="grid grid-cols-1 gap-2">';
        params.forEach((value, key) => {
            const decodedValue = decodeURIComponent(value);
            const truncatedValue = decodedValue.length > 80 ? decodedValue.substring(0, 80) + '...' : decodedValue;
            html += `
                <div class="flex border-b border-green-200 pb-1">
                    <div class="font-bold text-green-700 w-32 flex-shrink-0 text-xs">${key}:</div>
                    <div class="text-gray-700 text-xs break-all">${truncatedValue}</div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    } catch (e) {
        return '';
    }
}

/**
 * Format payload in compact table style
 */
function formatOmnibugStyle(request) {
    const params = extractAllParameters(request);
    if (params.length === 0) {
        return '<div class="text-gray-500 text-center py-4">No parameters detected</div>';
    }
    
    // Group parameters by category for better organization
    const grouped = {};
    params.forEach(param => {
        const category = categorizeParameter(param.key);
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(param);
    });
    
    let html = '<div class="overflow-auto max-h-[500px]">';
    html += '<table class="w-full text-sm border-collapse">';
    html += `
        <thead class="sticky top-0 bg-gray-100 z-10">
            <tr class="border-b-2 border-gray-300">
                <th class="text-left py-2 px-3 font-semibold text-gray-700 w-24">Category</th>
                <th class="text-left py-2 px-3 font-semibold text-gray-700 w-1/3">Parameter</th>
                <th class="text-left py-2 px-3 font-semibold text-gray-700">Value</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    // Sort categories by importance
    const categoryOrder = ['Loader Config', 'Event', 'Page', 'User', 'Product', 'Commerce', 
                          'DOM', 'Browser', 'Tealium', 'Cookie', 'Local Storage', 'Campaign', 
                          'Technical', 'Custom'];
    
    categoryOrder.forEach(category => {
        if (grouped[category] && grouped[category].length > 0) {
            const categoryColor = getCategoryColor(category);
            const params = grouped[category];
            
            params.forEach((param, index) => {
                html += `
                    <tr class="border-b border-gray-200 hover:bg-gray-50">
                        ${index === 0 ? `
                            <td rowspan="${params.length}" class="py-2 px-3 align-top border-r border-gray-200">
                                <span class="inline-block px-2 py-1 rounded text-xs font-bold ${categoryColor} whitespace-nowrap">
                                    ${category}
                                </span>
                            </td>
                        ` : ''}
                        <td class="py-2 px-3 font-mono text-xs text-gray-900 break-all">${escapeHtml(param.key)}</td>
                        <td class="py-2 px-3 text-xs text-gray-700 break-all max-w-md">${escapeHtml(param.value)}</td>
                    </tr>
                `;
            });
        }
    });
    
    html += '</tbody></table></div>';
    
    // Add summary at the bottom
    html += `
        <div class="mt-2 pt-2 border-t border-gray-300 text-xs text-gray-600">
            <span class="font-semibold">${params.length}</span> parameters across 
            <span class="font-semibold">${Object.keys(grouped).length}</span> categories
        </div>
    `;
    
    return html;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Extract all parameters from request (URL params, payload, etc.)
 */
function extractAllParameters(request) {
    const params = [];
    const isCollectBeacon = request.url.includes('/i.gif');
    
    // Extract URL parameters
    try {
        const urlObj = new URL(request.url);
        const urlParams = new URLSearchParams(urlObj.search);
        urlParams.forEach((value, key) => {
            params.push({ key, value: decodeURIComponent(value), source: 'url' });
        });
    } catch (e) {}
    
    // Extract payload parameters
    if (request.payload) {
        try {
            if (typeof request.payload === 'string') {
                if (request.payload.startsWith('{')) {
                    // JSON payload
                    const json = JSON.parse(request.payload);
                    Object.entries(json).forEach(([key, value]) => {
                        params.push({ key, value: String(value), source: 'json' });
                    });
                } else {
                    // Form data
                    const formParams = new URLSearchParams(request.payload);
                    
                    // Special handling for Tealium Collect beacons (i.gif)
                    if (isCollectBeacon && formParams.has('data')) {
                        try {
                            const dataValue = formParams.get('data');
                            const decodedData = JSON.parse(decodeURIComponent(dataValue));
                            
                            // Flatten the nested data structure
                            const flattenObject = (obj, prefix = '') => {
                                Object.entries(obj).forEach(([key, value]) => {
                                    const fullKey = prefix ? `${prefix}.${key}` : key;
                                    
                                    if (value === null || value === undefined) {
                                        params.push({ key: fullKey, value: String(value), source: 'beacon' });
                                    } else if (typeof value === 'object' && !Array.isArray(value)) {
                                        // Recursively flatten nested objects
                                        flattenObject(value, fullKey);
                                    } else if (Array.isArray(value)) {
                                        // Show array as JSON string
                                        params.push({ key: fullKey, value: JSON.stringify(value), source: 'beacon' });
                                    } else {
                                        params.push({ key: fullKey, value: String(value), source: 'beacon' });
                                    }
                                });
                            };
                            
                            flattenObject(decodedData);
                            console.log(`✅ Decoded i.gif beacon data: ${params.length} parameters extracted`);
                        } catch (parseError) {
                            console.warn('Failed to parse i.gif data parameter:', parseError);
                            // Fallback to showing the raw data parameter
                            formParams.forEach((value, key) => {
                                params.push({ key, value: decodeURIComponent(value), source: 'form' });
                            });
                        }
                    } else {
                        // Regular form data
                        formParams.forEach((value, key) => {
                            params.push({ key, value: decodeURIComponent(value), source: 'form' });
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('Error extracting parameters:', e);
        }
    }
    
    return params;
}

/**
 * Categorize parameters by type
 */
function categorizeParameter(key) {
    const lowerKey = key.toLowerCase();
    
    const categories = {
        'Loader Config': ['loader.cfg', 'loader_cfg'],
        'Page': ['page_name', 'page_type', 'page_url', 'page_title', 'page_category'],
        'User': ['user_id', 'customer_id', 'visitor_id', 'session_id', 'user_type', 'tealium_visitor', 'tealium_session'],
        'Product': ['product_id', 'product_name', 'product_category', 'product_price', 'sku'],
        'Event': ['event', 'tealium_event', 'event_type', 'event_category', 'event_action', 'event_label'],
        'Commerce': ['order_id', 'order_total', 'currency', 'quantity', 'revenue'],
        'Campaign': ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'],
        'DOM': ['dom.', 'dom_'],
        'Browser': ['browser.', 'browser_', 'timing.', 'timing_'],
        'Tealium': ['ut.', 'ut_', 'cp.utag', 'ls.tealium', 'tealium_'],
        'Local Storage': ['ls.', 'ls_'],
        'Cookie': ['cp.', 'cp_'],
        'Technical': ['timestamp', 'random', 'version', 'debug', 'test', 'post_time'],
        'Custom': []
    };
    
    // Check each category
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => lowerKey.includes(keyword.toLowerCase()))) {
            return category;
        }
    }
    
    return 'Custom';
}

/**
 * Get color for parameter category
 */
function getCategoryColor(category) {
    const colors = {
        'Loader Config': 'bg-red-100 text-red-800',
        'Page': 'bg-blue-100 text-blue-800',
        'User': 'bg-green-100 text-green-800',
        'Product': 'bg-orange-100 text-orange-800',
        'Event': 'bg-purple-100 text-purple-800',
        'Commerce': 'bg-yellow-100 text-yellow-800',
        'Campaign': 'bg-pink-100 text-pink-800',
        'DOM': 'bg-cyan-100 text-cyan-800',
        'Browser': 'bg-teal-100 text-teal-800',
        'Tealium': 'bg-blue-200 text-blue-900',
        'Local Storage': 'bg-amber-100 text-amber-800',
        'Cookie': 'bg-lime-100 text-lime-800',
        'Technical': 'bg-gray-100 text-gray-800',
        'Custom': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || colors['Custom'];
}

/**
 * Highlight URL with syntax coloring
 */
function highlightUrl(url) {
    try {
        const urlObj = new URL(url);
        const protocol = `<span class="text-yellow-400">${urlObj.protocol}</span>`;
        const host = `<span class="text-blue-400">${urlObj.host}</span>`;
        const pathname = `<span class="text-green-400">${urlObj.pathname}</span>`;
        const search = urlObj.search ? `<span class="text-purple-400">${urlObj.search}</span>` : '';
        const hash = urlObj.hash ? `<span class="text-red-400">${urlObj.hash}</span>` : '';
        
        return `${protocol}//${host}${pathname}${search}${hash}`;
    } catch (e) {
        return url;
    }
}

/**
 * Enhanced payload formatting
 */
function formatEnhancedPayload(payload) {
    if (!payload) return '';
    
    try {
        if (typeof payload === 'string') {
            if (payload.startsWith('{')) {
                // Pretty print JSON
                const json = JSON.parse(payload);
                return `<pre class="text-xs overflow-x-auto">${JSON.stringify(json, null, 2)}</pre>`;
            } else {
                // Format as key-value pairs
                const params = new URLSearchParams(payload);
                let html = '<div class="space-y-1">';
                params.forEach((value, key) => {
                    const decodedValue = decodeURIComponent(value);
                    html += `<div><span class="font-bold text-orange-700">${key}:</span> <span class="text-gray-700">${decodedValue}</span></div>`;
                });
                html += '</div>';
                return html;
            }
        }
        return String(payload);
    } catch (e) {
        return String(payload);
    }
}

/**
 * Switch between tabs in network request details
 */
function switchTab(requestId, tabName) {
    // Hide all tab panes for this request
    const tabPanes = document.querySelectorAll(`#details-${requestId} .tab-pane`);
    tabPanes.forEach(pane => pane.classList.add('hidden'));
    
    // Remove active styling from all tabs
    const tabButtons = document.querySelectorAll(`.tab-btn-${requestId}`);
    tabButtons.forEach(btn => {
        btn.className = btn.className.replace('border-blue-500 text-blue-600', 'border-transparent text-gray-500 hover:text-gray-700');
    });
    
    // Show selected tab pane
    const selectedPane = document.getElementById(`tab-${requestId}-${tabName}`);
    if (selectedPane) {
        selectedPane.classList.remove('hidden');
    }
    
    // Add active styling to selected tab
    const selectedTab = document.querySelector(`.tab-btn-${requestId}[data-tab="${tabName}"]`);
    if (selectedTab) {
        selectedTab.className = selectedTab.className.replace('border-transparent text-gray-500 hover:text-gray-700', 'border-blue-500 text-blue-600');
    }
}

/**
 * Get HTTP method explanation
 */
function getMethodExplanation(method) {
    const explanations = {
        'GET': 'GET: Requests data from server (most common for analytics)',
        'POST': 'POST: Sends data to server (common for form submissions)',
        'PUT': 'PUT: Updates existing data on server',
        'DELETE': 'DELETE: Removes data from server',
        'PATCH': 'PATCH: Partially updates data on server',
        'HEAD': 'HEAD: Like GET but only returns headers',
        'OPTIONS': 'OPTIONS: Requests allowed methods for a resource'
    };
    return explanations[method] || `${method}: HTTP request method`;
}

/**
 * Get HTTP status code explanation
 */
function getStatusExplanation(status) {
    if (!status) return 'Pending: Request is still in progress';
    
    const code = parseInt(status);
    
    if (code >= 200 && code < 300) {
        const explanations = {
            200: '200 OK: Request succeeded',
            201: '201 Created: Resource created successfully',
            202: '202 Accepted: Request accepted for processing',
            204: '204 No Content: Request succeeded, no content returned'
        };
        return explanations[code] || `${code}: Success - Request completed successfully`;
    }
    
    if (code >= 300 && code < 400) {
        const explanations = {
            301: '301 Moved Permanently: Resource moved to new URL',
            302: '302 Found: Resource temporarily moved',
            304: '304 Not Modified: Resource unchanged since last request'
        };
        return explanations[code] || `${code}: Redirection - Further action needed`;
    }
    
    if (code >= 400 && code < 500) {
        const explanations = {
            400: '400 Bad Request: Invalid request syntax',
            401: '401 Unauthorized: Authentication required',
            403: '403 Forbidden: Access denied',
            404: '404 Not Found: Resource not found',
            429: '429 Too Many Requests: Rate limit exceeded'
        };
        return explanations[code] || `${code}: Client Error - Problem with the request`;
    }
    
    if (code >= 500) {
        const explanations = {
            500: '500 Internal Server Error: Server encountered an error',
            502: '502 Bad Gateway: Invalid response from upstream server',
            503: '503 Service Unavailable: Server temporarily unavailable',
            504: '504 Gateway Timeout: Upstream server timeout'
        };
        return explanations[code] || `${code}: Server Error - Problem with the server`;
    }
    
    return `${code}: Unknown status code`;
}

/**
 * Journey Management System
 */
let currentJourney = null;

// Available journey files will be detected dynamically
const journeyDefinitions = {
    "ecommerce-journey.html": {
        title: "E-commerce Complete Site",
        description: "Comprehensive shopping experience with product browsing, cart management, checkout, user authentication, search, support forms, and advanced navigation.",
        file: "ecommerce-journey.html",
        features: ["Product Catalog", "Shopping Cart", "User Authentication", "Search", "Forms", "Support", "Navigation", "Mobile Menu"],
        steps: ["Homepage", "Product Browsing", "Search & Filter", "User Registration", "Shopping Cart", "Checkout", "Support Forms"],
        icon: "fas fa-shopping-cart",
        category: "E-commerce"
    },
    form: {
        title: "Form Interaction Flow",
        description: "Test form interactions, validations, and submission events.",
        steps: ["Form View", "Field Focus", "Input Validation", "Error Handling", "Successful Submit"],
        content: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <h5 class="font-semibold text-gray-900">Form Simulation</h5>
                    <div class="bg-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300">
                        <div class="bg-white p-4 rounded-lg shadow-sm">
                            <h6 class="font-medium mb-4">Sample Contact Form</h6>
                            <div class="space-y-3">
                                <input type="text" placeholder="Name" onfocus="simulateJourneyEvent('form', 'field_focus', {field: 'name'})" class="w-full px-3 py-2 border rounded text-sm">
                                <input type="email" placeholder="Email" onfocus="simulateJourneyEvent('form', 'field_focus', {field: 'email'})" class="w-full px-3 py-2 border rounded text-sm">
                                <textarea placeholder="Message" onfocus="simulateJourneyEvent('form', 'field_focus', {field: 'message'})" class="w-full px-3 py-2 border rounded text-sm h-20"></textarea>
                                <div class="flex space-x-2">
                                    <button onclick="simulateJourneyEvent('form', 'submit_attempt')" class="bg-blue-500 text-white py-2 px-4 rounded text-sm hover:bg-blue-600">Submit</button>
                                    <button onclick="simulateJourneyEvent('form', 'validation_error')" class="bg-red-500 text-white py-2 px-4 rounded text-sm hover:bg-red-600">Trigger Error</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h5 class="font-semibold text-gray-900 mb-4">Form Events</h5>
                    <div id="formEvents" class="space-y-2 max-h-64 overflow-y-auto">
                        <!-- Form events will be tracked here -->
                    </div>
                </div>
            </div>
        `
    },
    navigation: {
        title: "Site Navigation Flow",
        description: "Test navigation patterns and page transition events.",
        steps: ["Menu Interaction", "Page Transitions", "Search Usage", "Internal Links"],
        content: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <h5 class="font-semibold text-gray-900">Navigation Simulation</h5>
                    <div class="bg-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300">
                        <div class="bg-white rounded-lg overflow-hidden shadow-sm">
                            <div class="bg-blue-600 text-white p-3">
                                <div class="flex justify-between items-center">
                                    <h6 class="font-medium">Mock Website</h6>
                                    <button onclick="simulateJourneyEvent('navigation', 'menu_toggle')" class="text-white">☰</button>
                                </div>
                            </div>
                            <div class="p-4">
                                <div class="grid grid-cols-2 gap-2 mb-4">
                                    <button onclick="simulateJourneyEvent('navigation', 'page_visit', {page: 'about'})" class="bg-gray-200 py-2 px-3 rounded text-sm hover:bg-gray-300">About</button>
                                    <button onclick="simulateJourneyEvent('navigation', 'page_visit', {page: 'services'})" class="bg-gray-200 py-2 px-3 rounded text-sm hover:bg-gray-300">Services</button>
                                    <button onclick="simulateJourneyEvent('navigation', 'page_visit', {page: 'contact'})" class="bg-gray-200 py-2 px-3 rounded text-sm hover:bg-gray-300">Contact</button>
                                    <button onclick="simulateJourneyEvent('navigation', 'search')" class="bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600">Search</button>
                                </div>
                                <input type="text" placeholder="Search..." onfocus="simulateJourneyEvent('navigation', 'search_focus')" class="w-full px-3 py-2 border rounded text-sm mb-2">
                                <button onclick="simulateJourneyEvent('navigation', 'external_link')" class="w-full bg-green-500 text-white py-2 rounded text-sm hover:bg-green-600">External Link</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h5 class="font-semibold text-gray-900 mb-4">Navigation Events</h5>
                    <div id="navigationEvents" class="space-y-2 max-h-64 overflow-y-auto">
                        <!-- Navigation events will be tracked here -->
                    </div>
                </div>
            </div>
        `
    },
    video: {
        title: "Video Engagement Flow",
        description: "Test video player interactions and engagement events.",
        steps: ["Video Load", "Play", "Pause", "Seek", "Volume Change", "Completion"],
        content: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <h5 class="font-semibold text-gray-900">Video Player Simulation</h5>
                    <div class="bg-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300">
                        <div class="bg-black rounded-lg p-4 text-white text-center relative">
                            <div class="aspect-video bg-gray-800 rounded mb-4 flex items-center justify-center">
                                <i class="fas fa-play-circle text-6xl text-gray-400"></i>
                            </div>
                            <div class="flex justify-center space-x-2 mb-2">
                                <button onclick="simulateJourneyEvent('video', 'play')" class="bg-green-500 px-3 py-1 rounded text-sm">Play</button>
                                <button onclick="simulateJourneyEvent('video', 'pause')" class="bg-yellow-500 px-3 py-1 rounded text-sm">Pause</button>
                                <button onclick="simulateJourneyEvent('video', 'seek')" class="bg-blue-500 px-3 py-1 rounded text-sm">Seek</button>
                                <button onclick="simulateJourneyEvent('video', 'volume')" class="bg-purple-500 px-3 py-1 rounded text-sm">Volume</button>
                            </div>
                            <button onclick="simulateJourneyEvent('video', 'complete')" class="bg-red-500 px-3 py-1 rounded text-sm">Complete</button>
                        </div>
                    </div>
                </div>
                <div>
                    <h5 class="font-semibold text-gray-900 mb-4">Video Events</h5>
                    <div id="videoEvents" class="space-y-2 max-h-64 overflow-y-auto">
                        <!-- Video events will be tracked here -->
                    </div>
                </div>
            </div>
        `
    },
    login: {
        title: "User Authentication Flow",
        description: "Test login, registration, and authentication events.",
        steps: ["Login Form", "Validation", "Authentication", "Success/Error", "Session Management"],
        content: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <h5 class="font-semibold text-gray-900">Authentication Simulation</h5>
                    <div class="bg-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300">
                        <div class="bg-white p-4 rounded-lg shadow-sm">
                            <h6 class="font-medium mb-4 text-center">Login Form</h6>
                            <div class="space-y-3">
                                <input type="text" placeholder="Username" onfocus="simulateJourneyEvent('login', 'field_focus', {field: 'username'})" class="w-full px-3 py-2 border rounded text-sm">
                                <input type="password" placeholder="Password" onfocus="simulateJourneyEvent('login', 'field_focus', {field: 'password'})" class="w-full px-3 py-2 border rounded text-sm">
                                <div class="flex space-x-2">
                                    <button onclick="simulateJourneyEvent('login', 'login_success')" class="flex-1 bg-green-500 text-white py-2 rounded text-sm hover:bg-green-600">Login Success</button>
                                    <button onclick="simulateJourneyEvent('login', 'login_failed')" class="flex-1 bg-red-500 text-white py-2 rounded text-sm hover:bg-red-600">Login Failed</button>
                                </div>
                                <button onclick="simulateJourneyEvent('login', 'register')" class="w-full bg-blue-500 text-white py-2 rounded text-sm hover:bg-blue-600">Register New User</button>
                                <button onclick="simulateJourneyEvent('login', 'logout')" class="w-full bg-gray-500 text-white py-2 rounded text-sm hover:bg-gray-600">Logout</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h5 class="font-semibold text-gray-900 mb-4">Auth Events</h5>
                    <div id="authEvents" class="space-y-2 max-h-64 overflow-y-auto">
                        <!-- Auth events will be tracked here -->
                    </div>
                </div>
            </div>
        `
    },
    search: {
        title: "Search & Filter Flow",
        description: "Test search functionality and filtering interactions.",
        steps: ["Search Input", "Autocomplete", "Search Submit", "Filter Application", "Results Interaction"],
        content: `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <h5 class="font-semibold text-gray-900">Search & Filter Simulation</h5>
                    <div class="bg-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-300">
                        <div class="bg-white p-4 rounded-lg shadow-sm">
                            <div class="space-y-3">
                                <input type="text" placeholder="Search products..." oninput="simulateJourneyEvent('search', 'search_input', {query: this.value})" class="w-full px-3 py-2 border rounded text-sm">
                                <div class="grid grid-cols-2 gap-2">
                                    <button onclick="simulateJourneyEvent('search', 'search_submit')" class="bg-blue-500 text-white py-2 rounded text-sm hover:bg-blue-600">Search</button>
                                    <button onclick="simulateJourneyEvent('search', 'autocomplete')" class="bg-purple-500 text-white py-2 rounded text-sm hover:bg-purple-600">Autocomplete</button>
                                </div>
                                <div class="border-t pt-3">
                                    <h6 class="text-sm font-medium mb-2">Filters</h6>
                                    <div class="space-y-2">
                                        <button onclick="simulateJourneyEvent('search', 'filter_apply', {filter: 'category', value: 'electronics'})" class="w-full bg-gray-200 py-1 rounded text-sm hover:bg-gray-300">Category: Electronics</button>
                                        <button onclick="simulateJourneyEvent('search', 'filter_apply', {filter: 'price', value: '100-500'})" class="w-full bg-gray-200 py-1 rounded text-sm hover:bg-gray-300">Price: $100-$500</button>
                                        <button onclick="simulateJourneyEvent('search', 'filter_clear')" class="w-full bg-red-500 text-white py-1 rounded text-sm hover:bg-red-600">Clear Filters</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h5 class="font-semibold text-gray-900 mb-4">Search Events</h5>
                    <div id="searchEvents" class="space-y-2 max-h-64 overflow-y-auto">
                        <!-- Search events will be tracked here -->
                    </div>
                </div>
            </div>
        `
    }
};

/**
 * Load journey description
 */
function loadJourney(journeyType) {
    const descriptionEl = document.getElementById('journeyDescription');
    const titleEl = document.getElementById('journeyTitle');
    const detailsEl = document.getElementById('journeyDetails');
    const startBtn = document.getElementById('startJourneyBtn');
    
    if (!journeyType || !journeyDefinitions[journeyType]) {
        descriptionEl.classList.add('hidden');
        startBtn.disabled = true;
        currentJourney = null;
        return;
    }
    
    const journey = journeyDefinitions[journeyType];
    currentJourney = journeyType;
    
    titleEl.textContent = journey.title;
    detailsEl.innerHTML = `
        <div class="mb-2">${journey.description}</div>
        <div class="text-xs">
            <strong>Steps:</strong> ${journey.steps ? journey.steps.join(' → ') : 'Interactive exploration'}
        </div>
    `;
    
    descriptionEl.classList.remove('hidden');
    startBtn.disabled = false;
}

/**
 * Start selected journey
 */
function startJourney() {
    if (!currentJourney || !journeyDefinitions[currentJourney]) {
        alert('Please select a journey first');
        return;
    }
    
    const journey = journeyDefinitions[currentJourney];
    const envEl = document.getElementById('journeyTestingEnvironment');
    const titleEl = document.getElementById('currentJourneyTitle');
    const contentEl = document.getElementById('journeyContent');
    
    // Show the testing environment
    envEl.classList.remove('hidden');
    titleEl.textContent = journey.title;
    
    // Load journey as inline content instead of iframe
    if (currentJourney === 'ecommerce-journey.html') {
        loadInlineEcommerceJourney(contentEl, journey);
    } else {
        // Fallback for other journeys
        contentEl.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-construction text-4xl mb-4"></i>
                <h6 class="text-lg font-medium mb-2">Coming Soon</h6>
                <p>This journey is being developed and will be available soon.</p>
            </div>
        `;
    }
    
    // Scroll to the environment
    envEl.scrollIntoView({ behavior: 'smooth' });
    
    // Initialize journey event listener if not already done
    if (!window.journeyListenerInitialized) {
        setupJourneyEventListener();
        window.journeyListenerInitialized = true;
        logToDebugConsole('🎯 Journey event listener initialized');
    }
    
    logToDebugConsole(`🚀 Started inline journey: ${journey.title}`);
}

/**
 * Load E-commerce Journey as inline content
 */
function loadInlineEcommerceJourney(contentEl, journey) {
    contentEl.innerHTML = `
        <div class="bg-white rounded-lg overflow-hidden shadow-sm">
            <div class="bg-gray-50 border-b px-4 py-2 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-store text-blue-600"></i>
                    <span class="text-sm font-medium text-gray-700">E-commerce Journey (Inline)</span>
                </div>
                <div class="flex items-center space-x-2 text-xs text-gray-500">
                    <span>Direct Tealium Integration</span>
                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
            </div>
            
            <!-- E-commerce Journey Content -->
            <div id="ecommerceJourneyInline" class="bg-gray-50 min-h-screen">
                
                <!-- Header Navigation -->
                <header class="bg-white shadow-sm border-b">
                    <div class="px-6 py-4">
                        <div class="flex items-center justify-between">
                            <!-- Logo & Main Nav -->
                            <div class="flex items-center space-x-8">
                                <div class="text-2xl font-bold text-blue-600 cursor-pointer" onclick="showJourneyPage('home')">
                                    🛍️ ShopTech
                                </div>
                                <nav class="hidden md:flex space-x-6">
                                    <button onclick="showJourneyPage('home')" id="homeBtn" class="text-gray-700 hover:text-blue-600 font-medium">Home</button>
                                    <button onclick="showJourneyPage('catalog')" id="catalogBtn" class="text-gray-700 hover:text-blue-600 font-medium">Products</button>
                                    <button onclick="showJourneyPage('blog')" id="blogBtn" class="text-gray-700 hover:text-blue-600 font-medium">Blog</button>
                                    <button onclick="showJourneyPage('support')" id="supportBtn" class="text-gray-700 hover:text-blue-600 font-medium">Support</button>
                                </nav>
                            </div>
                            
                            <!-- Search & User Actions -->
                            <div class="flex items-center space-x-4">
                                <div class="relative hidden md:block">
                                    <input type="text" id="searchInput" placeholder="Search products..." 
                                           onkeypress="handleSearchKeypress(event)"
                                           class="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                    <button onclick="performSearch()" class="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                                        🔍
                                    </button>
                                </div>
                                
                                <button onclick="showJourneyPage('cart')" id="cartBtn" class="relative p-2 text-gray-700 hover:text-blue-600">
                                    🛒
                                    <span id="cartBadge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-2 py-1 hidden">0</span>
                                </button>
                                
                                <div id="userActions" class="flex items-center space-x-2">
                                    <!-- Will be populated based on login status -->
                                </div>
                            </div>
                        </div>
                    </div>
                </header>
                
                <!-- Main Content Area -->
                <main class="min-h-screen">
                    
                    <!-- Home Page -->
                    <div id="homePage" class="journey-page">
                        <!-- Hero Section -->
                        <section class="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
                            <div class="px-6 text-center">
                                <h1 class="text-5xl font-bold mb-6">Welcome to ShopTech</h1>
                                <p class="text-xl mb-8 max-w-2xl mx-auto">Discover amazing products with cutting-edge technology and unbeatable prices</p>
                                <div class="space-x-4">
                                    <button onclick="showJourneyPage('catalog')" class="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                                        Shop Now
                                    </button>
                                    <button onclick="showJourneyPage('blog')" class="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
                                        Learn More
                                    </button>
                                </div>
                            </div>
                        </section>
                        
                        <!-- Featured Products -->
                        <section class="py-16 px-6">
                            <div class="max-w-6xl mx-auto">
                                <h2 class="text-3xl font-bold text-center mb-12">Featured Products</h2>
                                <div id="featuredProducts" class="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <!-- Will be populated -->
                                </div>
                            </div>
                        </section>
                        
                        <!-- Newsletter Signup -->
                        <section class="bg-gray-100 py-16 px-6">
                            <div class="max-w-2xl mx-auto text-center">
                                <h3 class="text-2xl font-bold mb-4">Stay Updated</h3>
                                <p class="text-gray-600 mb-6">Get the latest updates on new products and exclusive offers</p>
                                <div class="flex gap-4 max-w-md mx-auto">
                                    <input type="email" id="newsletterEmail" placeholder="Enter your email" 
                                           class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <button onclick="subscribeNewsletter()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                                        Subscribe
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                    
                    <!-- Product Catalog -->
                    <div id="catalogPage" class="journey-page hidden py-8 px-6">
                        <div class="max-w-6xl mx-auto">
                            <div class="flex items-center justify-between mb-8">
                                <h1 class="text-3xl font-bold">Our Products</h1>
                                <div class="flex items-center space-x-4">
                                    <select id="categoryFilter" onchange="filterProducts()" class="px-4 py-2 border border-gray-300 rounded-lg">
                                        <option value="">All Categories</option>
                                        <option value="phones">Phones</option>
                                        <option value="computers">Computers</option>
                                        <option value="audio">Audio</option>
                                        <option value="wearables">Wearables</option>
                                        <option value="gaming">Gaming</option>
                                    </select>
                                    <select id="sortBy" onchange="sortProducts()" class="px-4 py-2 border border-gray-300 rounded-lg">
                                        <option value="featured">Featured</option>
                                        <option value="price-low">Price: Low to High</option>
                                        <option value="price-high">Price: High to Low</option>
                                        <option value="name">Name A-Z</option>
                                    </select>
                                </div>
                            </div>
                            <div id="productsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                <!-- Products will be loaded here -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Shopping Cart -->
                    <div id="cartPage" class="journey-page hidden py-8 px-6">
                        <div class="max-w-4xl mx-auto">
                            <h1 class="text-3xl font-bold mb-8">Shopping Cart</h1>
                            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div class="lg:col-span-2">
                                    <div id="cartItems" class="space-y-4">
                                        <div class="text-gray-500 text-center py-12">Your cart is empty</div>
                                    </div>
                                </div>
                                <div id="cartSummary" class="hidden">
                                    <div class="bg-gray-50 p-6 rounded-lg">
                                        <h3 class="text-lg font-semibold mb-4">Order Summary</h3>
                                        <div class="space-y-2 mb-4">
                                            <div class="flex justify-between">
                                                <span>Subtotal:</span>
                                                <span>$<span id="subtotalAmount">0</span></span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Shipping:</span>
                                                <span>$<span id="shippingAmount">9.99</span></span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Tax:</span>
                                                <span>$<span id="taxAmount">0</span></span>
                                            </div>
                                            <hr class="my-2">
                                            <div class="flex justify-between font-semibold text-lg">
                                                <span>Total:</span>
                                                <span>$<span id="totalAmount">0</span></span>
                                            </div>
                                        </div>
                                        <button onclick="initiateCheckout()" class="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors mb-3">
                                            Proceed to Checkout
                                        </button>
                                        <button onclick="showJourneyPage('catalog')" class="w-full border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                                            Continue Shopping
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Login Page -->
                    <div id="loginPage" class="journey-page hidden py-16 px-6">
                        <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
                            <h2 class="text-2xl font-bold text-center mb-6">Sign In</h2>
                            <form onsubmit="performLogin(event)" class="space-y-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" id="loginEmail" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input type="password" id="loginPassword" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div class="flex items-center justify-between">
                                    <label class="flex items-center">
                                        <input type="checkbox" id="rememberMe" class="mr-2">
                                        <span class="text-sm text-gray-600">Remember me</span>
                                    </label>
                                    <button type="button" onclick="showForgotPassword()" class="text-sm text-blue-600 hover:underline">
                                        Forgot password?
                                    </button>
                                </div>
                                <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                    Sign In
                                </button>
                            </form>
                            <div class="mt-6 text-center">
                                <p class="text-gray-600">Don't have an account? 
                                    <button onclick="showJourneyPage('register')" class="text-blue-600 hover:underline">Sign up</button>
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Registration Page -->
                    <div id="registerPage" class="journey-page hidden py-16 px-6">
                        <div class="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
                            <h2 class="text-2xl font-bold text-center mb-6">Create Account</h2>
                            <form onsubmit="performRegistration(event)" class="space-y-4">
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                        <input type="text" id="regFirstName" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <input type="text" id="regLastName" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" id="regEmail" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input type="password" id="regPassword" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input type="tel" id="regPhone" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                </div>
                                <div>
                                    <label class="flex items-center">
                                        <input type="checkbox" id="agreeTerms" required class="mr-2">
                                        <span class="text-sm text-gray-600">I agree to the Terms of Service and Privacy Policy</span>
                                    </label>
                                </div>
                                <div>
                                    <label class="flex items-center">
                                        <input type="checkbox" id="subscribeMarketing" class="mr-2">
                                        <span class="text-sm text-gray-600">Subscribe to marketing emails</span>
                                    </label>
                                </div>
                                <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                    Create Account
                                </button>
                            </form>
                            <div class="mt-6 text-center">
                                <p class="text-gray-600">Already have an account? 
                                    <button onclick="showJourneyPage('login')" class="text-blue-600 hover:underline">Sign in</button>
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Account Dashboard -->
                    <div id="accountPage" class="journey-page hidden py-8 px-6">
                        <div class="max-w-6xl mx-auto">
                            <h1 class="text-3xl font-bold mb-8">My Account</h1>
                            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                <div class="lg:col-span-1">
                                    <nav class="space-y-2">
                                        <button onclick="showAccountSection('profile')" id="profileTabBtn" class="w-full text-left px-4 py-2 rounded-lg bg-blue-50 text-blue-600 font-medium">
                                            Profile
                                        </button>
                                        <button onclick="showAccountSection('orders')" id="ordersTabBtn" class="w-full text-left px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                                            Order History
                                        </button>
                                        <button onclick="showAccountSection('addresses')" id="addressesTabBtn" class="w-full text-left px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                                            Addresses
                                        </button>
                                        <button onclick="showAccountSection('preferences')" id="preferencesTabBtn" class="w-full text-left px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                                            Preferences
                                        </button>
                                        <button onclick="performLogout()" class="w-full text-left px-4 py-2 rounded-lg text-red-600 hover:bg-red-50">
                                            Sign Out
                                        </button>
                                    </nav>
                                </div>
                                <div class="lg:col-span-3">
                                    <div id="accountContent">
                                        <!-- Account sections will be loaded here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Blog -->
                    <div id="blogPage" class="journey-page hidden py-8 px-6">
                        <div class="max-w-6xl mx-auto">
                            <h1 class="text-3xl font-bold mb-8">Tech Blog</h1>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" id="blogPosts">
                                <!-- Blog posts will be loaded here -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Support -->
                    <div id="supportPage" class="journey-page hidden py-8 px-6">
                        <div class="max-w-4xl mx-auto">
                            <h1 class="text-3xl font-bold mb-8">Customer Support</h1>
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <h2 class="text-xl font-semibold mb-4">Contact Us</h2>
                                    <form onsubmit="submitSupportTicket(event)" class="space-y-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input type="text" id="supportName" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input type="email" id="supportEmail" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                            <select id="supportCategory" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                                <option value="">Select a category</option>
                                                <option value="order">Order Issue</option>
                                                <option value="product">Product Question</option>
                                                <option value="technical">Technical Support</option>
                                                <option value="billing">Billing</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                            <textarea id="supportMessage" required rows="4" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                                        </div>
                                        <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                            Submit Ticket
                                        </button>
                                    </form>
                                </div>
                                <div>
                                    <h2 class="text-xl font-semibold mb-4">FAQ</h2>
                                    <div class="space-y-4" id="faqList">
                                        <!-- FAQ items will be loaded here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </main>
                
            </div>
        </div>
        
        <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h6 class="font-medium text-blue-900 mb-2">🎯 Journey Features</h6>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                ${journey.features?.map(feature => 
                    `<div class="flex items-center text-blue-700">
                        <i class="fas fa-check-circle mr-2 text-green-600"></i>${feature}
                    </div>`
                ).join('') || 'No features listed'}
            </div>
        </div>
    `;
    
    // Initialize the inline e-commerce journey
    setTimeout(() => {
        initializeInlineEcommerceJourney();
    }, 100);
}

/**
 * Initialize the comprehensive inline e-commerce journey
 */
function initializeInlineEcommerceJourney() {
    logToDebugConsole('🛒 Initializing Comprehensive E-commerce Journey...');
    
    // Check if Tealium is loaded in main sandbox
    if (!window.utag) {
        logToDebugConsole('⚠️ Tealium not loaded! Please load Tealium in Configuration section first.', 'warning');
        logToDebugConsole('💡 Journey will work but events won\'t fire to tags until Tealium is loaded.', 'info');
    } else {
        logToDebugConsole('✅ Using main sandbox Tealium instance for journey events', 'success');
        
        // Check if tags are actually ready
        if (window.utag.loader && window.utag.loader.INIT) {
            logToDebugConsole('⚠️ Tealium tags are still loading...', 'warning');
            logToDebugConsole('💡 Wait for "READY:utag.loader.wq" message before expecting tags to fire', 'info');
        }
    }
    
    // Define expanded product catalog
    window.journeyProducts = [
        // Phones
        { id: 'phone-ultra-5g', name: 'Phone Ultra 5G', price: 899, category: 'phones', brand: 'ShopTech', image: '📱', featured: true, description: 'Latest 5G technology with advanced camera' },
        { id: 'phone-basic', name: 'Phone Basic', price: 299, category: 'phones', brand: 'ShopTech', image: '📱', featured: false, description: 'Reliable everyday smartphone' },
        { id: 'phone-pro-max', name: 'Phone Pro Max', price: 1199, category: 'phones', brand: 'ShopTech', image: '📱', featured: true, description: 'Professional grade with premium features' },
        
        // Computers
        { id: 'laptop-pro-15', name: 'Laptop Pro 15', price: 1299, category: 'computers', brand: 'ShopTech', image: '💻', featured: true, description: 'High-performance laptop for professionals' },
        { id: 'laptop-student', name: 'Laptop Student', price: 599, category: 'computers', brand: 'ShopTech', image: '💻', featured: false, description: 'Perfect for students and basic tasks' },
        { id: 'desktop-gaming', name: 'Desktop Gaming Rig', price: 1899, category: 'computers', brand: 'ShopTech', image: '🖥️', featured: true, description: 'Ultimate gaming performance' },
        
        // Audio
        { id: 'wireless-headphones', name: 'Wireless Headphones', price: 199, category: 'audio', brand: 'ShopTech', image: '🎧', featured: true, description: 'Premium noise-canceling headphones' },
        { id: 'earbuds-sport', name: 'Sport Earbuds', price: 89, category: 'audio', brand: 'ShopTech', image: '🎧', featured: false, description: 'Waterproof earbuds for active lifestyle' },
        { id: 'speaker-bluetooth', name: 'Bluetooth Speaker', price: 149, category: 'audio', brand: 'ShopTech', image: '🔊', featured: false, description: 'Portable speaker with rich sound' },
        
        // Wearables
        { id: 'smart-watch', name: 'Smart Watch', price: 299, category: 'wearables', brand: 'ShopTech', image: '⌚', featured: true, description: 'Advanced health and fitness tracking' },
        { id: 'fitness-tracker', name: 'Fitness Tracker', price: 99, category: 'wearables', brand: 'ShopTech', image: '⌚', featured: false, description: 'Essential fitness monitoring' },
        
        // Gaming
        { id: 'gaming-console', name: 'Gaming Console', price: 499, category: 'gaming', brand: 'ShopTech', image: '🎮', featured: true, description: 'Next-gen gaming experience' },
        { id: 'gaming-controller', name: 'Wireless Controller', price: 69, category: 'gaming', brand: 'ShopTech', image: '🎮', featured: false, description: 'Precision gaming controller' },
        
        // Tablets
        { id: 'tablet-mini', name: 'Tablet Mini', price: 449, category: 'tablets', brand: 'ShopTech', image: '📟', featured: false, description: 'Compact tablet for reading and browsing' },
        { id: 'tablet-pro', name: 'Tablet Pro', price: 799, category: 'tablets', brand: 'ShopTech', image: '📟', featured: true, description: 'Professional tablet with stylus support' }
    ];
    
    // Initialize journey state
    window.journeyState = {
        cart: [],
        user: null,
        searchQuery: '',
        currentFilters: { category: '', sort: 'featured' },
        recentlyViewed: [],
        wishlist: []
    };
    
    // Initialize all sections
    setupUserInterface();
    loadFeaturedProducts();
    loadJourneyProducts();
    loadBlogPosts();
    loadFAQItems();
    
    // Initialize page but delay initial page view until Tealium is ready
    logToDebugConsole('✅ Comprehensive E-commerce Journey initialized with ' + window.journeyProducts.length + ' products');
    
    // Fire initial page view immediately (same as Quick Events)
    if (window.utag) {
        logToDebugConsole('🚀 Firing initial page view (bypassing readiness check)...', 'success');
        fireJourneyPageView('home');
    } else {
        logToDebugConsole('⚠️ Tealium not loaded - skipping initial page view', 'warning');
    }
    
    // Display event tracking guide
    displayEventTrackingGuide();
}

// ==============================================
// COMPREHENSIVE JOURNEY FUNCTIONS
// ==============================================

/**
 * Set up user interface based on login status
 */
function setupUserInterface() {
    const userActions = document.getElementById('userActions');
    if (!userActions) return;
    
    if (window.journeyState.user) {
        userActions.innerHTML = `
            <span class="text-sm text-gray-600">Hi, ${window.journeyState.user.firstName}!</span>
            <button onclick="showJourneyPage('account')" class="text-blue-600 hover:underline">Account</button>
            <button onclick="performLogout()" class="text-gray-600 hover:text-red-600">Logout</button>
        `;
    } else {
        userActions.innerHTML = `
            <button onclick="showJourneyPage('login')" class="text-blue-600 hover:underline">Sign In</button>
            <button onclick="showJourneyPage('register')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Sign Up</button>
        `;
    }
}

/**
 * Load featured products on homepage
 */
function loadFeaturedProducts() {
    const featuredProducts = document.getElementById('featuredProducts');
    if (!featuredProducts) return;
    
    const featured = window.journeyProducts.filter(p => p.featured).slice(0, 3);
    featuredProducts.innerHTML = featured.map(product => `
        <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" onclick="viewProduct('${product.id}')">
            <div class="p-6 text-center">
                <div class="text-6xl mb-4">${product.image}</div>
                <h3 class="text-xl font-bold text-gray-900 mb-2">${product.name}</h3>
                <p class="text-gray-600 mb-4">${product.description}</p>
                <p class="text-2xl font-bold text-blue-600">$${product.price}</p>
            </div>
        </div>
    `).join('');
}

/**
 * Load products into the catalog grid with filtering and sorting
 */
function loadJourneyProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    let filteredProducts = [...window.journeyProducts];
    
    // Apply category filter
    if (window.journeyState.currentFilters.category) {
        filteredProducts = filteredProducts.filter(p => p.category === window.journeyState.currentFilters.category);
    }
    
    // Apply search filter
    if (window.journeyState.searchQuery) {
        const query = window.journeyState.searchQuery.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.category.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query)
        );
    }
    
    // Apply sorting
    switch (window.journeyState.currentFilters.sort) {
        case 'price-low':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'name':
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'featured':
        default:
            filteredProducts.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
            break;
    }
    
    if (filteredProducts.length === 0) {
        productsGrid.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <div class="text-4xl mb-4">🔍</div>
                <h3 class="text-lg font-medium mb-2">No products found</h3>
                <p>Try adjusting your filters or search terms.</p>
                <button onclick="clearFilters()" class="mt-4 text-blue-600 hover:underline">Clear filters</button>
            </div>
        `;
        return;
    }
    
    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            <div class="aspect-square bg-gray-50 flex items-center justify-center cursor-pointer" onclick="viewProduct('${product.id}')">
                <div class="text-6xl">${product.image}</div>
            </div>
            <div class="p-4">
                <div class="flex items-start justify-between mb-2">
                    <h3 class="font-semibold text-gray-900">${product.name}</h3>
                    ${product.featured ? '<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Featured</span>' : ''}
                </div>
                <p class="text-sm text-gray-600 mb-3 line-clamp-2">${product.description}</p>
                <div class="flex items-center justify-between">
                    <span class="text-xl font-bold text-blue-600">$${product.price}</span>
                    <div class="flex space-x-2">
                        <button onclick="addToWishlist('${product.id}')" class="p-2 text-gray-400 hover:text-red-500" title="Add to wishlist">
                            ❤️
                        </button>
                        <button onclick="addToJourneyCart('${product.id}')" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Fire product list view event
    fireProductListViewEvent(filteredProducts.length, window.journeyState.currentFilters);
}

/**
 * Load blog posts with full content
 */
function loadBlogPosts() {
    const blogPosts = document.getElementById('blogPosts');
    if (!blogPosts) return;
    
    const posts = [
        {
            id: 'post-1',
            title: '5G Technology: The Future is Here',
            excerpt: 'Explore how 5G is revolutionizing mobile connectivity and what it means for consumers.',
            author: 'Tech Team',
            date: '2024-01-15',
            category: 'Technology',
            readTime: '5 min read',
            image: '📶',
            content: `
                <h3>The 5G Revolution</h3>
                <p>5G technology is not just an upgrade—it's a complete transformation of how we connect. With speeds up to 100 times faster than 4G, 5G is enabling everything from autonomous vehicles to smart cities.</p>
                
                <h4>Key Benefits of 5G</h4>
                <ul>
                    <li><strong>Ultra-fast speeds:</strong> Download full movies in seconds</li>
                    <li><strong>Low latency:</strong> Near-instantaneous response times</li>
                    <li><strong>Massive connectivity:</strong> Support for millions of devices per square kilometer</li>
                    <li><strong>Enhanced reliability:</strong> 99.999% uptime for critical applications</li>
                </ul>
                
                <h4>Real-World Applications</h4>
                <p>From telemedicine to augmented reality shopping experiences, 5G is powering innovations that seemed impossible just a few years ago. The technology is particularly transformative for:</p>
                <ul>
                    <li>IoT devices and smart home automation</li>
                    <li>Industrial automation and robotics</li>
                    <li>Enhanced mobile gaming and AR/VR experiences</li>
                    <li>Real-time video collaboration and streaming</li>
                </ul>
                
                <p>As 5G networks continue to expand globally, we're only beginning to see the possibilities. The future is indeed here, and it's faster than ever.</p>
            `,
            tags: ['5G', 'Technology', 'Mobile', 'Innovation'],
            views: 1247,
            likes: 89,
            comments: 23
        },
        {
            id: 'post-2',
            title: 'Best Laptops for Remote Work',
            excerpt: 'Our comprehensive guide to choosing the perfect laptop for your work-from-home setup.',
            author: 'Product Experts',
            date: '2024-01-10',
            category: 'Reviews',
            readTime: '8 min read',
            image: '💻',
            content: `
                <h3>The Remote Work Revolution</h3>
                <p>With remote work becoming the new normal, choosing the right laptop has never been more crucial. After testing dozens of models, we've identified the key features that matter most for productivity and reliability.</p>
                
                <h4>Top Picks for Different Needs</h4>
                
                <h5>Best Overall: ShopTech Laptop Pro 15</h5>
                <p>Our flagship model combines performance, portability, and battery life in one perfect package. Key features include:</p>
                <ul>
                    <li>14-hour battery life for all-day productivity</li>
                    <li>16GB RAM and 1TB SSD for smooth multitasking</li>
                    <li>Crystal-clear 4K display with blue light reduction</li>
                    <li>Military-grade durability testing</li>
                </ul>
                
                <h5>Best Budget Option: ShopTech Laptop Student</h5>
                <p>Proves you don't need to break the bank for reliable remote work. Features include:</p>
                <ul>
                    <li>8-hour battery life</li>
                    <li>8GB RAM and 512GB SSD</li>
                    <li>Full HD display with anti-glare coating</li>
                    <li>Lightweight design at just 2.8 lbs</li>
                </ul>
                
                <h4>Essential Features to Consider</h4>
                <ul>
                    <li><strong>Webcam Quality:</strong> Look for 1080p minimum with good low-light performance</li>
                    <li><strong>Microphone Array:</strong> Built-in noise cancellation is essential for calls</li>
                    <li><strong>Connectivity:</strong> Multiple USB ports, HDMI, and reliable Wi-Fi 6</li>
                    <li><strong>Ergonomics:</strong> Comfortable keyboard and responsive trackpad</li>
                </ul>
                
                <p>Remember, the best laptop for remote work is one that fits your specific workflow and budget. Consider your primary tasks, mobility needs, and long-term goals when making your decision.</p>
            `,
            tags: ['Laptops', 'Remote Work', 'Productivity', 'Reviews'],
            views: 2156,
            likes: 156,
            comments: 47
        },
        {
            id: 'post-3',
            title: 'Gaming Setup Essentials',
            excerpt: 'Everything you need to create the ultimate gaming experience at home.',
            author: 'Gaming Specialists',
            date: '2024-01-05',
            category: 'Gaming',
            readTime: '6 min read',
            image: '🎮',
            content: `
                <h3>Building Your Dream Gaming Setup</h3>
                <p>Whether you're a casual gamer or aspiring esports professional, having the right setup can make all the difference. Here's our guide to building the ultimate gaming experience without breaking the bank.</p>
                
                <h4>Core Components</h4>
                
                <h5>1. Gaming Console or PC</h5>
                <p>The heart of your setup. Our ShopTech Gaming Console offers:</p>
                <ul>
                    <li>4K gaming at 120fps</li>
                    <li>Ray tracing support for stunning visuals</li>
                    <li>Quick Resume for instant game switching</li>
                    <li>1TB storage with expansion options</li>
                </ul>
                
                <h5>2. Display Technology</h5>
                <p>Your monitor or TV can make or break your gaming experience. Look for:</p>
                <ul>
                    <li>Low input lag (under 20ms)</li>
                    <li>High refresh rate (120Hz minimum)</li>
                    <li>HDR support for better contrast</li>
                    <li>Appropriate size for your space (24-32" for desks, 55"+ for living rooms)</li>
                </ul>
                
                <h5>3. Audio Excellence</h5>
                <p>Don't underestimate the importance of good audio. Our ShopTech Wireless Headphones feature:</p>
                <ul>
                    <li>7.1 surround sound</li>
                    <li>Active noise cancellation</li>
                    <li>20+ hour battery life</li>
                    <li>Crystal-clear microphone with flip-to-mute</li>
                </ul>
                
                <h4>Pro Tips for Optimization</h4>
                <ul>
                    <li><strong>Lighting:</strong> Bias lighting behind your display reduces eye strain</li>
                    <li><strong>Ergonomics:</strong> Invest in a good gaming chair and adjustable desk</li>
                    <li><strong>Internet:</strong> Wired connection beats Wi-Fi for competitive gaming</li>
                    <li><strong>Organization:</strong> Cable management keeps your setup clean and functional</li>
                </ul>
                
                <p>Remember, the best gaming setup is one that grows with you. Start with the essentials and upgrade components over time as your needs and budget allow.</p>
            `,
            tags: ['Gaming', 'Setup', 'Hardware', 'Console'],
            views: 3421,
            likes: 234,
            comments: 78
        },
        {
            id: 'post-4',
            title: 'Smart Home Integration Guide',
            excerpt: 'Transform your living space with connected devices that work seamlessly together.',
            author: 'Smart Home Team',
            date: '2024-01-20',
            category: 'Smart Home',
            readTime: '7 min read',
            image: '🏠',
            content: `
                <h3>Welcome to the Connected Home</h3>
                <p>Smart homes are no longer a luxury—they're becoming essential for modern living. From voice assistants to automated security systems, here's how to build a connected home that actually improves your daily life.</p>
                
                <h4>Starting Your Smart Home Journey</h4>
                <p>The key to a successful smart home is choosing devices that work together. Our ShopTech Smart Watch serves as the perfect control center, allowing you to:</p>
                <ul>
                    <li>Control lights, temperature, and music with voice commands</li>
                    <li>Monitor security cameras and door locks</li>
                    <li>Set automation routines for daily activities</li>
                    <li>Track energy usage and optimize efficiency</li>
                </ul>
                
                <h4>Essential Smart Home Categories</h4>
                
                <h5>Security & Safety</h5>
                <ul>
                    <li>Smart door locks with keypad and app control</li>
                    <li>Security cameras with motion detection</li>
                    <li>Smart smoke and carbon monoxide detectors</li>
                    <li>Water leak sensors for early warning</li>
                </ul>
                
                <h5>Comfort & Convenience</h5>
                <ul>
                    <li>Smart thermostats that learn your schedule</li>
                    <li>Automated lighting with dimming and color control</li>
                    <li>Smart plugs for any device automation</li>
                    <li>Voice assistants for hands-free control</li>
                </ul>
                
                <h4>Integration Best Practices</h4>
                <p>To avoid a fragmented experience, follow these guidelines:</p>
                <ul>
                    <li>Choose a primary ecosystem (Google, Amazon, or Apple)</li>
                    <li>Prioritize devices with local processing capabilities</li>
                    <li>Invest in a robust mesh Wi-Fi network</li>
                    <li>Plan automation routines that actually save time</li>
                </ul>
                
                <p>Start small with one room or use case, then expand gradually. The goal is a home that anticipates your needs and simplifies your daily routines.</p>
            `,
            tags: ['Smart Home', 'IoT', 'Automation', 'Technology'],
            views: 1876,
            likes: 112,
            comments: 34
        },
        {
            id: 'post-5',
            title: 'Audio Technology Trends 2024',
            excerpt: 'From spatial audio to AI-powered noise cancellation, discover what\'s shaping the future of sound.',
            author: 'Audio Engineers',
            date: '2024-01-25',
            category: 'Audio',
            readTime: '6 min read',
            image: '🎧',
            content: `
                <h3>The Evolution of Audio Technology</h3>
                <p>2024 is shaping up to be a revolutionary year for audio technology. From breakthrough spatial audio implementations to AI-powered personalization, here's what's changing the way we experience sound.</p>
                
                <h4>Major Trends Defining 2024</h4>
                
                <h5>1. Spatial Audio Goes Mainstream</h5>
                <p>No longer limited to premium headphones, spatial audio is becoming standard. Our latest ShopTech Wireless Headphones feature:</p>
                <ul>
                    <li>Dynamic head tracking for immersive 3D sound</li>
                    <li>Personalized HRTF (Head-Related Transfer Function)</li>
                    <li>Seamless switching between stereo and spatial modes</li>
                    <li>Support for Dolby Atmos and Sony 360 Reality Audio</li>
                </ul>
                
                <h5>2. AI-Powered Personalization</h5>
                <p>Machine learning is revolutionizing how audio devices adapt to users:</p>
                <ul>
                    <li>Automatic EQ adjustment based on hearing profile</li>
                    <li>Intelligent noise cancellation that learns your environment</li>
                    <li>Adaptive transparency modes for situational awareness</li>
                    <li>Predictive battery management for optimal performance</li>
                </ul>
                
                <h5>3. Sustainability in Audio</h5>
                <p>The industry is embracing eco-friendly practices:</p>
                <ul>
                    <li>Recycled materials in construction</li>
                    <li>Modular designs for repairability</li>
                    <li>Extended battery life to reduce replacement frequency</li>
                    <li>Take-back programs for responsible disposal</li>
                </ul>
                
                <h4>What This Means for Consumers</h4>
                <p>These advances translate to tangible benefits:</p>
                <ul>
                    <li><strong>Better Sound Quality:</strong> More natural, immersive audio experiences</li>
                    <li><strong>Enhanced Comfort:</strong> Smarter fit detection and pressure distribution</li>
                    <li><strong>Longer Lifespan:</strong> Durable construction and software updates</li>
                    <li><strong>Universal Compatibility:</strong> Seamless switching between devices and platforms</li>
                </ul>
                
                <p>As these technologies mature, we're moving toward a future where audio devices truly understand and adapt to individual users, creating personalized soundscapes that enhance every aspect of digital life.</p>
            `,
            tags: ['Audio', 'Headphones', 'AI', 'Spatial Audio'],
            views: 987,
            likes: 67,
            comments: 19
        }
    ];
    
    blogPosts.innerHTML = posts.map(post => `
        <article class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer" onclick="openBlogPost('${post.id}')">
            <div class="p-6">
                <div class="text-6xl mb-4 text-center">${post.image}</div>
                <div class="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded">${post.category}</span>
                    <span>${post.readTime}</span>
                </div>
                <h2 class="text-xl font-bold text-gray-900 mb-3">${post.title}</h2>
                <p class="text-gray-600 mb-4">${post.excerpt}</p>
                <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>By ${post.author}</span>
                    <span>${post.date}</span>
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4 text-sm text-gray-500">
                        <span class="flex items-center">👁️ ${post.views}</span>
                        <span class="flex items-center">❤️ ${post.likes}</span>
                        <span class="flex items-center">💬 ${post.comments}</span>
                    </div>
                    <div class="flex flex-wrap gap-1">
                        ${post.tags.slice(0, 2).map(tag => `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        </article>
    `).join('');
}

/**
 * Load FAQ items
 */
function loadFAQItems() {
    const faqList = document.getElementById('faqList');
    if (!faqList) return;
    
    const faqs = [
        {
            question: 'What is your return policy?',
            answer: 'We offer a 30-day return policy for all items in original condition.'
        },
        {
            question: 'How long does shipping take?',
            answer: 'Standard shipping takes 3-5 business days. Express shipping is available for next-day delivery.'
        },
        {
            question: 'Do you offer warranty on products?',
            answer: 'Yes, all our products come with manufacturer warranty. Extended warranty options are available.'
        },
        {
            question: 'Can I track my order?',
            answer: 'Absolutely! You will receive a tracking number via email once your order ships.'
        }
    ];
    
    faqList.innerHTML = faqs.map((faq, index) => `
        <div class="border border-gray-200 rounded-lg">
            <button onclick="toggleFAQ(${index})" class="w-full text-left p-4 hover:bg-gray-50 flex items-center justify-between">
                <span class="font-medium">${faq.question}</span>
                <span id="faqIcon${index}" class="transform transition-transform">➤</span>
            </button>
            <div id="faqAnswer${index}" class="hidden p-4 pt-0 text-gray-600">
                ${faq.answer}
            </div>
        </div>
    `).join('');
}

// ==============================================
// EVENT TRACKING GUIDE & INTERACTIVE FUNCTIONS
// ==============================================

/**
 * Display comprehensive event tracking guide
 */
function displayEventTrackingGuide() {
    logToDebugConsole('📋 Event Tracking Guide Loaded', 'info');
    logToDebugConsole('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
    logToDebugConsole('🎯 AVAILABLE TRACKING EVENTS IN SHOPTECH JOURNEY:', 'info');
    logToDebugConsole('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
    
    // Add tag loading troubleshooting info
    logToDebugConsole('⚠️ JOURNEY INTEGRATION WITH MAIN SANDBOX:', 'warning');
    logToDebugConsole('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
    logToDebugConsole('✅ Journey now uses main sandbox Tealium instance & data layer', 'success');
    logToDebugConsole('✅ Events update both utag_data and currentDataLayer automatically', 'success');
    logToDebugConsole('📌 REQUIREMENTS: Load Tealium in Configuration section first!', 'warning');
    logToDebugConsole('📌 Common solutions for tag loading:', 'info');
    logToDebugConsole('   • Check load rules in Profile Inspector → Load Rules', 'info');
    logToDebugConsole('   • Set basic data layer variables in Data Layer section', 'info');
    logToDebugConsole('   • Verify page_name matches your load rule conditions', 'info');
    logToDebugConsole('   • Try simple load rules like "All Pages" for testing', 'info');
    logToDebugConsole('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
    
    logToDebugConsole('🏠 HOMEPAGE EVENTS:', 'success');
    logToDebugConsole('   • Newsletter Signup (subscribeNewsletter)', 'info');
    logToDebugConsole('   • Featured Product Click (viewProduct)', 'info');
    logToDebugConsole('   • Hero CTA Clicks (Shop Now, Learn More)', 'info');
    
    logToDebugConsole('🛍️ PRODUCT CATALOG EVENTS:', 'success');
    logToDebugConsole('   • Product Search (performSearch)', 'info');
    logToDebugConsole('   • Category Filter (filterProducts)', 'info');
    logToDebugConsole('   • Product Sort (sortProducts)', 'info');
    logToDebugConsole('   • Product View (viewProduct)', 'info');
    logToDebugConsole('   • Add to Cart (addToJourneyCart)', 'info');
    logToDebugConsole('   • Add to Wishlist (addToWishlist)', 'info');
    
    logToDebugConsole('🛒 CART & CHECKOUT EVENTS:', 'success');
    logToDebugConsole('   • Cart View (showJourneyPage cart)', 'info');
    logToDebugConsole('   • Remove from Cart (removeFromJourneyCart)', 'info');
    logToDebugConsole('   • Initiate Checkout (initiateCheckout)', 'info');
    logToDebugConsole('   • Purchase Complete (simulateCheckout)', 'info');
    
    logToDebugConsole('👤 USER ACCOUNT EVENTS:', 'success');
    logToDebugConsole('   • User Registration (performRegistration)', 'info');
    logToDebugConsole('   • User Login (performLogin)', 'info');
    logToDebugConsole('   • User Logout (performLogout)', 'info');
    logToDebugConsole('   • Profile Update (updateProfile)', 'info');
    logToDebugConsole('   • Password Reset (showForgotPassword)', 'info');
    
    logToDebugConsole('📝 BLOG & CONTENT EVENTS:', 'success');
    logToDebugConsole('   • Blog Post Read (readBlogPost)', 'info');
    logToDebugConsole('   • Content Engagement tracking', 'info');
    
    logToDebugConsole('🎧 SUPPORT EVENTS:', 'success');
    logToDebugConsole('   • Support Ticket Submit (submitSupportTicket)', 'info');
    logToDebugConsole('   • FAQ Interaction (toggleFAQ)', 'info');
    
    logToDebugConsole('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
    logToDebugConsole('💡 TIP: Each event includes rich data layer variables for comprehensive tracking!', 'warning');
    logToDebugConsole('🔥 Try: Search → Filter → View Product → Add to Cart → Checkout for full funnel!', 'warning');
    logToDebugConsole('🔧 MANUAL DIAGNOSTICS: Run diagnoseTagLoading() in console anytime', 'warning');
    logToDebugConsole('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
    
    // Make diagnoseTagLoading available globally for manual use
    window.diagnoseTagLoading = diagnoseTagLoading;
    
    // Add Tealium readiness checker
    window.checkTealiumReady = checkTealiumReady;
}

/**
 * Check if Tealium is ready to fire tags
 */
function checkTealiumReady() {
    if (typeof window.utag === 'undefined') {
        logToDebugConsole('❌ Tealium not loaded', 'error');
        return false;
    }
    
    // Check if tags are stuck in loading state
    if (window.utag.loader && window.utag.loader.INIT) {
        logToDebugConsole('⚠️ Tags stuck in loading state - this may indicate a configuration issue', 'warning');
        logToDebugConsole('💡 Tags may be waiting for load rules that will never be satisfied', 'info');
        logToDebugConsole('🔧 Returning true anyway to allow events to fire', 'info');
        return true; // Allow events to fire even if stuck in INIT
    }
    
    logToDebugConsole('✅ Tealium is ready to fire tags!', 'success');
    return true;
}

/**
 * Wait for Tealium to be ready, then execute callback
 */
function whenTealiumReady(callback, maxWait = 10000) {
    if (checkTealiumReady()) {
        callback();
        return;
    }
    
    let waited = 0;
    const interval = setInterval(() => {
        waited += 500;
        
        if (checkTealiumReady()) {
            clearInterval(interval);
            callback();
        } else if (waited >= maxWait) {
            clearInterval(interval);
            logToDebugConsole('⏰ Timeout waiting for Tealium to be ready', 'warning');
            logToDebugConsole('💡 Firing event anyway - tags may not load properly', 'info');
            callback();
        }
    }, 500);
}

// ==============================================
// NAVIGATION & PAGE MANAGEMENT
// ==============================================

/**
 * Show different pages in the journey with enhanced navigation
 */
function showJourneyPage(page) {
    // Hide all pages
    const pages = document.querySelectorAll('.journey-page');
    pages.forEach(p => p.classList.add('hidden'));
    
    // Show selected page
    const targetPage = document.getElementById(page + 'Page');
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }
    
    // Update navigation buttons
    const buttons = ['homeBtn', 'catalogBtn', 'cartBtn'];
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.className = btn.className.replace('bg-blue-600 text-white', 'bg-gray-200 text-gray-700');
        }
    });
    
    const activeBtn = document.getElementById(page + 'Btn');
    if (activeBtn) {
        activeBtn.className = activeBtn.className.replace('bg-gray-200 text-gray-700', 'bg-blue-600 text-white');
    }
    
    // Fire page view event
    fireJourneyPageView(page);
}

/**
 * Add product to cart
 */
function addToJourneyCart(productId) {
    const product = window.journeyProducts.find(p => p.id === productId);
    if (!product) return;
    
    // Add to cart (using correct state object)
    window.journeyState.cart.push({...product, quantity: 1, addedAt: Date.now()});
    
    // Update cart UI
    updateJourneyCartDisplay();
    
    // Fire add to cart event
    fireJourneyAddToCart(product);
    
    // Show notification
    logToDebugConsole(`🛒 Added ${product.name} to cart!`);
}

/**
 * Update cart display
 */
function updateJourneyCartDisplay() {
    const cartBadge = document.getElementById('cartBadge');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const totalAmount = document.getElementById('totalAmount');
    
    const cart = window.journeyState.cart;
    
    if (cart.length === 0) {
        if (cartBadge) cartBadge.classList.add('hidden');
        if (cartItems) cartItems.innerHTML = '<div class="text-gray-500 text-center py-8">Your cart is empty</div>';
        if (cartTotal) cartTotal.classList.add('hidden');
        return;
    }
    
    // Update badge
    if (cartBadge) {
        cartBadge.textContent = cart.length;
        cartBadge.classList.remove('hidden');
    }
    
    // Update cart items
    if (cartItems) {
        cartItems.innerHTML = cart.map(item => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-4">
                    <span class="text-2xl">${item.image}</span>
                    <div>
                        <h4 class="font-semibold">${item.name}</h4>
                        <p class="text-gray-600">$${item.price}</p>
                    </div>
                </div>
                <button onclick="removeFromJourneyCart('${item.id}')" class="text-red-600 hover:text-red-800">
                    Remove
                </button>
            </div>
        `).join('');
    }
    
    // Update total
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (totalAmount) totalAmount.textContent = total;
    if (cartTotal) cartTotal.classList.remove('hidden');
}

/**
 * Remove item from cart
 */
function removeFromJourneyCart(productId) {
    const index = window.journeyState.cart.findIndex(item => item.id === productId);
    if (index !== -1) {
        const removedItem = window.journeyState.cart.splice(index, 1)[0];
        updateJourneyCartDisplay();
        logToDebugConsole(`🗑️ Removed ${removedItem.name} from cart`);
        
        // Fire remove from cart event
        fireRemoveFromCartEvent(removedItem);
    }
}

/**
 * Simulate checkout
 */
function simulateCheckout() {
    const cart = window.journeyState.cart;
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    
    // Fire purchase event
    fireJourneyPurchase(cart, total);
    
    // Clear cart
    window.journeyState.cart = [];
    updateJourneyCartDisplay();
    
    // Show success message
    logToDebugConsole(`✅ Purchase completed! Total: $${total}`);
    showJourneyPage('home');
}

// ==============================================
// MISSING INTERACTIVE FUNCTIONS
// ==============================================

/**
 * View product details
 */
function viewProduct(productId) {
    const product = window.journeyProducts.find(p => p.id === productId);
    if (!product) return;
    
    // Add to recently viewed
    if (!window.journeyState.recentlyViewed.includes(productId)) {
        window.journeyState.recentlyViewed.unshift(productId);
        window.journeyState.recentlyViewed = window.journeyState.recentlyViewed.slice(0, 10); // Keep last 10
    }
    
    // Fire product view event
    fireProductViewEvent(product);
    
    logToDebugConsole(`👁️ Viewed product: ${product.name}`, 'info');
}

/**
 * Add to wishlist
 */
function addToWishlist(productId) {
    const product = window.journeyProducts.find(p => p.id === productId);
    if (!product) return;
    
    if (!window.journeyState.wishlist.includes(productId)) {
        window.journeyState.wishlist.push(productId);
        fireWishlistEvent(product, 'add');
        logToDebugConsole(`❤️ Added to wishlist: ${product.name}`, 'info');
    } else {
        logToDebugConsole(`⚠️ ${product.name} already in wishlist`, 'warning');
    }
}

/**
 * Subscribe to newsletter
 */
function subscribeNewsletter() {
    const emailInput = document.getElementById('newsletterEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    
    if (!email) {
        logToDebugConsole('⚠️ Please enter an email address', 'warning');
        return;
    }
    
    // Fire newsletter signup event
    fireNewsletterSignupEvent(email);
    
    // Clear input and show success
    if (emailInput) {
        emailInput.value = '';
        emailInput.placeholder = 'Thanks for subscribing!';
        setTimeout(() => {
            emailInput.placeholder = 'Enter your email';
        }, 3000);
    }
    
    logToDebugConsole(`📧 Newsletter signup: ${email}`, 'success');
}

/**
 * Initiate checkout process
 */
function initiateCheckout() {
    const cart = window.journeyState.cart;
    if (cart.length === 0) {
        logToDebugConsole('⚠️ Cart is empty', 'warning');
        return;
    }
    
    // Fire checkout initiation event
    fireCheckoutInitiationEvent(cart);
    
    // Simulate checkout process (in real app would redirect to checkout page)
    setTimeout(() => {
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        fireJourneyPurchase(cart, total);
        
        // Clear cart
        window.journeyState.cart = [];
        updateJourneyCartDisplay();
        
        logToDebugConsole(`✅ Purchase completed! Total: $${total.toFixed(2)}`, 'success');
        showJourneyPage('home');
    }, 1000);
}

/**
 * Perform user login
 */
function performLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail')?.value;
    const password = document.getElementById('loginPassword')?.value;
    const rememberMe = document.getElementById('rememberMe')?.checked;
    
    if (!email || !password) {
        logToDebugConsole('⚠️ Please fill in all fields', 'warning');
        return;
    }
    
    // Simulate login
    window.journeyState.user = {
        id: 'user_' + Date.now(),
        email: email,
        firstName: 'John',
        lastName: 'Doe',
        loginTime: Date.now()
    };
    
    // Fire login event
    fireLoginEvent(window.journeyState.user, rememberMe);
    
    // Update UI
    setupUserInterface();
    showJourneyPage('account');
    
    logToDebugConsole(`👤 User logged in: ${email}`, 'success');
}

/**
 * Perform user registration
 */
function performRegistration(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('regFirstName')?.value;
    const lastName = document.getElementById('regLastName')?.value;
    const email = document.getElementById('regEmail')?.value;
    const password = document.getElementById('regPassword')?.value;
    const phone = document.getElementById('regPhone')?.value;
    const agreeTerms = document.getElementById('agreeTerms')?.checked;
    const subscribeMarketing = document.getElementById('subscribeMarketing')?.checked;
    
    if (!firstName || !lastName || !email || !password || !agreeTerms) {
        logToDebugConsole('⚠️ Please fill in all required fields and agree to terms', 'warning');
        return;
    }
    
    // Create user
    window.journeyState.user = {
        id: 'user_' + Date.now(),
        firstName,
        lastName,
        email,
        phone,
        subscribeMarketing,
        registrationTime: Date.now()
    };
    
    // Fire registration event
    fireRegistrationEvent(window.journeyState.user);
    
    // Update UI
    setupUserInterface();
    showJourneyPage('account');
    
    logToDebugConsole(`👤 User registered: ${firstName} ${lastName}`, 'success');
}

/**
 * Perform user logout
 */
function performLogout() {
    if (window.journeyState.user) {
        fireLogoutEvent(window.journeyState.user);
        window.journeyState.user = null;
        setupUserInterface();
        showJourneyPage('home');
        logToDebugConsole('👋 User logged out', 'info');
    }
}

/**
 * Read blog post
 */
function openBlogPost(postId) {
    // Get the blog post data
    const blogData = getBlogPostData();
    const post = blogData.find(p => p.id === postId);
    
    if (!post) {
        logToDebugConsole(`⚠️ Blog post not found: ${postId}`, 'warning');
        return;
    }
    
    // Create blog post page HTML
    const blogPostHTML = `
        <div id="blogPostPage" class="journey-page">
            <header class="bg-white shadow-sm border-b mb-8">
                <div class="px-6 py-4">
                    <div class="flex items-center justify-between">
                        <button onclick="showJourneyPage('blog')" class="flex items-center text-blue-600 hover:text-blue-700">
                            <i class="fas fa-arrow-left mr-2"></i>Back to Blog
                        </button>
                        <div class="flex items-center space-x-4">
                            <button onclick="shareBlogPost('${post.id}')" class="flex items-center space-x-2 text-gray-600 hover:text-blue-500">
                                <i class="fas fa-share mr-1"></i>Share
                            </button>
                            <button onclick="likeBlogPost('${post.id}')" class="flex items-center space-x-2 text-gray-600 hover:text-red-500">
                                <i class="fas fa-heart mr-1"></i>${post.likes}
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            
            <article class="max-w-4xl mx-auto px-6">
                <header class="text-center mb-8">
                    <div class="text-6xl mb-4">${post.image}</div>
                    <div class="flex items-center justify-center space-x-4 text-sm text-gray-500 mb-4">
                        <span class="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">${post.category}</span>
                        <span>${post.readTime}</span>
                        <span>${post.date}</span>
                    </div>
                    <h1 class="text-4xl font-bold text-gray-900 mb-4">${post.title}</h1>
                    <div class="flex items-center justify-center space-x-6 text-sm text-gray-600">
                        <span>By ${post.author}</span>
                        <span class="flex items-center"><i class="fas fa-eye mr-1"></i>${post.views} views</span>
                        <span class="flex items-center"><i class="fas fa-comment mr-1"></i>${post.comments} comments</span>
                    </div>
                </header>
                
                <div class="prose prose-lg max-w-none mb-8">
                    ${post.content}
                </div>
                
                <footer class="border-t pt-8 mb-8">
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center space-x-6">
                            <button onclick="likeBlogPost('${post.id}')" class="flex items-center space-x-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg">
                                <i class="fas fa-heart"></i><span>Like (${post.likes})</span>
                            </button>
                            <button onclick="shareBlogPost('${post.id}')" class="flex items-center space-x-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg">
                                <i class="fas fa-share"></i><span>Share</span>
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            ${post.tags.map(tag => `<span class="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">${tag}</span>`).join('')}
                        </div>
                    </div>
                </footer>
            </article>
        </div>
    `;
    
    // Hide other pages and show blog post
    document.querySelectorAll('.journey-page').forEach(page => {
        page.classList.add('hidden');
    });
    
    // Find the main journey content and add the blog post
    const journeyContent = document.querySelector('#ecommerceJourneyInline');
    if (journeyContent) {
        const existingBlogPost = journeyContent.querySelector('#blogPostPage');
        if (existingBlogPost) existingBlogPost.remove();
        journeyContent.insertAdjacentHTML('beforeend', blogPostHTML);
    }
    
    // Fire blog read event
    fireBlogReadEvent(postId);
    logToDebugConsole(`📖 Reading blog post: ${post.title}`, 'info');
}

/**
 * Get blog post data
 */
function getBlogPostData() {
    return [
        {
            id: 'post-1',
            title: '5G Technology: The Future is Here',
            excerpt: 'Explore how 5G is revolutionizing mobile connectivity and what it means for consumers.',
            author: 'Tech Team',
            date: '2024-01-15',
            category: 'Technology',
            readTime: '5 min read',
            image: '📶',
            content: `
                <h3>The 5G Revolution</h3>
                <p>5G technology is not just an upgrade—it's a complete transformation of how we connect. With speeds up to 100 times faster than 4G, 5G is enabling everything from autonomous vehicles to smart cities.</p>
                
                <h4>Key Benefits of 5G</h4>
                <ul>
                    <li><strong>Ultra-fast speeds:</strong> Download full movies in seconds</li>
                    <li><strong>Low latency:</strong> Near-instantaneous response times</li>
                    <li><strong>Massive connectivity:</strong> Support for millions of devices per square kilometer</li>
                    <li><strong>Enhanced reliability:</strong> 99.999% uptime for critical applications</li>
                </ul>
                
                <h4>Real-World Applications</h4>
                <p>From telemedicine to augmented reality shopping experiences, 5G is powering innovations that seemed impossible just a few years ago. The technology is particularly transformative for:</p>
                <ul>
                    <li>IoT devices and smart home automation</li>
                    <li>Industrial automation and robotics</li>
                    <li>Enhanced mobile gaming and AR/VR experiences</li>
                    <li>Real-time video collaboration and streaming</li>
                </ul>
                
                <p>As 5G networks continue to expand globally, we're only beginning to see the possibilities. The future is indeed here, and it's faster than ever.</p>
            `,
            tags: ['5G', 'Technology', 'Mobile', 'Innovation'],
            views: 1247,
            likes: 89,
            comments: 23
        },
        {
            id: 'post-2',
            title: 'Best Laptops for Remote Work',
            excerpt: 'Our comprehensive guide to choosing the perfect laptop for your work-from-home setup.',
            author: 'Product Experts',
            date: '2024-01-10',
            category: 'Reviews',
            readTime: '8 min read',
            image: '💻',
            content: `
                <h3>The Remote Work Revolution</h3>
                <p>With remote work becoming the new normal, choosing the right laptop has never been more crucial. After testing dozens of models, we've identified the key features that matter most for productivity and reliability.</p>
                
                <h4>Top Picks for Different Needs</h4>
                <h5>Best Overall: ShopTech Laptop Pro 15</h5>
                <p>Our flagship model combines performance, portability, and battery life in one perfect package.</p>
                
                <h5>Best Budget Option: ShopTech Laptop Student</h5>
                <p>Proves you don't need to break the bank for reliable remote work capabilities.</p>
                
                <h4>Essential Features to Consider</h4>
                <ul>
                    <li><strong>Webcam Quality:</strong> Look for 1080p minimum with good low-light performance</li>
                    <li><strong>Microphone Array:</strong> Built-in noise cancellation is essential for calls</li>
                    <li><strong>Connectivity:</strong> Multiple USB ports, HDMI, and reliable Wi-Fi 6</li>
                    <li><strong>Ergonomics:</strong> Comfortable keyboard and responsive trackpad</li>
                </ul>
            `,
            tags: ['Laptops', 'Remote Work', 'Productivity', 'Reviews'],
            views: 2156,
            likes: 156,
            comments: 47
        },
        {
            id: 'post-3',
            title: 'Gaming Setup Essentials',
            excerpt: 'Everything you need to create the ultimate gaming experience at home.',
            author: 'Gaming Specialists',
            date: '2024-01-05',
            category: 'Gaming',
            readTime: '6 min read',
            image: '🎮',
            content: `
                <h3>Building Your Dream Gaming Setup</h3>
                <p>Whether you're a casual gamer or aspiring esports professional, having the right setup can make all the difference.</p>
                
                <h4>Core Components</h4>
                <p>Every great gaming setup starts with these essentials:</p>
                <ul>
                    <li>High-performance gaming console or PC</li>
                    <li>Low-latency display with high refresh rate</li>
                    <li>Quality audio solution for immersive sound</li>
                    <li>Comfortable gaming peripherals</li>
                </ul>
                
                <h4>Pro Tips for Optimization</h4>
                <ul>
                    <li><strong>Lighting:</strong> Bias lighting behind your display reduces eye strain</li>
                    <li><strong>Ergonomics:</strong> Invest in a good gaming chair and adjustable desk</li>
                    <li><strong>Internet:</strong> Wired connection beats Wi-Fi for competitive gaming</li>
                </ul>
            `,
            tags: ['Gaming', 'Setup', 'Hardware', 'Console'],
            views: 3421,
            likes: 234,
            comments: 78
        },
        {
            id: 'post-4',
            title: 'Smart Home Integration Guide',
            excerpt: 'Transform your living space with connected devices that work seamlessly together.',
            author: 'Smart Home Team',
            date: '2024-01-20',
            category: 'Smart Home',
            readTime: '7 min read',
            image: '🏠',
            content: `
                <h3>Welcome to the Connected Home</h3>
                <p>Smart homes are no longer a luxury—they're becoming essential for modern living.</p>
                
                <h4>Getting Started</h4>
                <p>The key to a successful smart home is choosing devices that work together seamlessly.</p>
                
                <h4>Essential Categories</h4>
                <ul>
                    <li>Security and safety devices</li>
                    <li>Climate control systems</li>
                    <li>Lighting automation</li>
                    <li>Entertainment integration</li>
                </ul>
            `,
            tags: ['Smart Home', 'IoT', 'Automation', 'Technology'],
            views: 1876,
            likes: 112,
            comments: 34
        },
        {
            id: 'post-5',
            title: 'Audio Technology Trends 2024',
            excerpt: 'From spatial audio to AI-powered noise cancellation, discover what\'s shaping the future of sound.',
            author: 'Audio Engineers',
            date: '2024-01-25',
            category: 'Audio',
            readTime: '6 min read',
            image: '🎧',
            content: `
                <h3>The Evolution of Audio Technology</h3>
                <p>2024 is shaping up to be a revolutionary year for audio technology.</p>
                
                <h4>Major Trends</h4>
                <ul>
                    <li>Spatial audio becomes mainstream</li>
                    <li>AI-powered personalization</li>
                    <li>Sustainability in audio manufacturing</li>
                    <li>Enhanced wireless capabilities</li>
                </ul>
                
                <h4>What This Means for Consumers</h4>
                <p>These advances translate to better sound quality, enhanced comfort, longer lifespan, and universal compatibility.</p>
            `,
            tags: ['Audio', 'Headphones', 'AI', 'Spatial Audio'],
            views: 987,
            likes: 67,
            comments: 19
        }
    ];
}

function likeBlogPost(postId) {
    fireBlogInteractionEvent(postId, 'like');
    logToDebugConsole(`❤️ Liked blog post: ${postId}`, 'info');
}

function shareBlogPost(postId) {
    fireBlogInteractionEvent(postId, 'share');
    logToDebugConsole(`📤 Shared blog post: ${postId}`, 'info');
}

/**
 * Submit support ticket
 */
function submitSupportTicket(event) {
    event.preventDefault();
    
    const name = document.getElementById('supportName')?.value;
    const email = document.getElementById('supportEmail')?.value;
    const category = document.getElementById('supportCategory')?.value;
    const message = document.getElementById('supportMessage')?.value;
    
    if (!name || !email || !category || !message) {
        logToDebugConsole('⚠️ Please fill in all fields', 'warning');
        return;
    }
    
    // Fire support ticket event
    fireSupportTicketEvent({ name, email, category, message });
    
    // Reset form
    event.target.reset();
    
    logToDebugConsole(`🎧 Support ticket submitted by ${name}`, 'success');
}

/**
 * Toggle FAQ item
 */
function toggleFAQ(index) {
    const answer = document.getElementById(`faqAnswer${index}`);
    const icon = document.getElementById(`faqIcon${index}`);
    
    if (answer && icon) {
        const isOpen = !answer.classList.contains('hidden');
        
        if (isOpen) {
            answer.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
        } else {
            answer.classList.remove('hidden');
            icon.style.transform = 'rotate(90deg)';
            
            // Fire FAQ interaction event
            fireFAQInteractionEvent(index);
        }
    }
}

/**
 * Show account section
 */
function showAccountSection(section) {
    // Update tab buttons
    const tabButtons = ['profileTabBtn', 'ordersTabBtn', 'addressesTabBtn', 'preferencesTabBtn'];
    tabButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.className = btn.className.replace('bg-blue-50 text-blue-600', 'text-gray-600 hover:bg-gray-50');
        }
    });
    
    const activeBtn = document.getElementById(section + 'TabBtn');
    if (activeBtn) {
        activeBtn.className = activeBtn.className.replace('text-gray-600 hover:bg-gray-50', 'bg-blue-50 text-blue-600');
    }
    
    // Load section content
    const accountContent = document.getElementById('accountContent');
    if (accountContent && window.journeyState.user) {
        const user = window.journeyState.user;
        
        switch(section) {
            case 'profile':
                accountContent.innerHTML = `
                    <div class="bg-white p-6 rounded-lg border">
                        <h3 class="text-lg font-semibold mb-4">Profile Information</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Name</label>
                                <p class="mt-1 text-gray-900">${user.firstName} ${user.lastName}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Email</label>
                                <p class="mt-1 text-gray-900">${user.email}</p>
                            </div>
                            ${user.phone ? `<div>
                                <label class="block text-sm font-medium text-gray-700">Phone</label>
                                <p class="mt-1 text-gray-900">${user.phone}</p>
                            </div>` : ''}
                        </div>
                    </div>
                `;
                break;
            case 'orders':
                accountContent.innerHTML = `
                    <div class="bg-white p-6 rounded-lg border">
                        <h3 class="text-lg font-semibold mb-4">Order History</h3>
                        <p class="text-gray-500">No orders found.</p>
                    </div>
                `;
                break;
            case 'addresses':
                accountContent.innerHTML = `
                    <div class="bg-white p-6 rounded-lg border">
                        <h3 class="text-lg font-semibold mb-4">Saved Addresses</h3>
                        <p class="text-gray-500">No addresses saved.</p>
                    </div>
                `;
                break;
            case 'preferences':
                accountContent.innerHTML = `
                    <div class="bg-white p-6 rounded-lg border">
                        <h3 class="text-lg font-semibold mb-4">Preferences</h3>
                        <div class="space-y-4">
                            <label class="flex items-center">
                                <input type="checkbox" ${user.subscribeMarketing ? 'checked' : ''} class="mr-2">
                                <span>Marketing emails</span>
                            </label>
                        </div>
                    </div>
                `;
                break;
        }
        
        fireAccountSectionViewEvent(section);
    }
}

// ==============================================
// EVENT FIRING FUNCTIONS
// ==============================================

/**
 * Fire product view event
 */
function fireProductViewEvent(product) {
    const eventData = {
        event: 'product_view',
        product_id: product.id,
        product_name: product.name,
        product_category: product.category,
        product_brand: product.brand,
        product_price: product.price,
        journey_step: 'product_view',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`👁️ Product View: ${product.name}`, 'success');
}

/**
 * Fire wishlist event
 */
function fireWishlistEvent(product, action) {
    const eventData = {
        event: 'wishlist_' + action,
        product_id: product.id,
        product_name: product.name,
        product_category: product.category,
        product_price: product.price,
        action: action,
        journey_step: 'wishlist_' + action,
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`❤️ Wishlist ${action}: ${product.name}`, 'success');
}

/**
 * Fire newsletter signup event
 */
function fireNewsletterSignupEvent(email) {
    const eventData = {
        event: 'newsletter_signup',
        email: email,
        journey_step: 'newsletter_signup',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`📧 Newsletter Signup: ${email}`, 'success');
}

/**
 * Fire checkout initiation event
 */
function fireCheckoutInitiationEvent(cart) {
    const eventData = {
        event: 'checkout_initiation',
        cart_value: cart.reduce((sum, item) => sum + item.price, 0),
        cart_items: cart.length,
        products: cart.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price
        })),
        journey_step: 'checkout_initiation',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`🛒 Checkout Initiated: $${eventData.cart_value}`, 'success');
}

/**
 * Fire remove from cart event
 */
function fireRemoveFromCartEvent(product) {
    const eventData = {
        event: 'remove_from_cart',
        product_id: product.id,
        product_name: product.name,
        product_category: product.category,
        product_price: product.price,
        journey_step: 'remove_from_cart',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`🗑️ Removed from Cart: ${product.name}`, 'success');
}

/**
 * Fire login event
 */
function fireLoginEvent(user, rememberMe) {
    const eventData = {
        event: 'user_login',
        user_id: user.id,
        user_email: user.email,
        remember_me: rememberMe,
        journey_step: 'user_login',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`👤 User Login: ${user.email}`, 'success');
}

/**
 * Fire registration event
 */
function fireRegistrationEvent(user) {
    const eventData = {
        event: 'user_registration',
        user_id: user.id,
        user_email: user.email,
        user_first_name: user.firstName,
        user_last_name: user.lastName,
        marketing_opt_in: user.subscribeMarketing,
        journey_step: 'user_registration',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`👤 User Registration: ${user.firstName} ${user.lastName}`, 'success');
}

/**
 * Fire logout event
 */
function fireLogoutEvent(user) {
    const eventData = {
        event: 'user_logout',
        user_id: user.id,
        user_email: user.email,
        journey_step: 'user_logout',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`👋 User Logout: ${user.email}`, 'success');
}

/**
 * Fire blog read event
 */
function fireBlogReadEvent(postId) {
    const eventData = {
        event: 'blog_read',
        blog_post_id: postId,
        journey_step: 'blog_read',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`📖 Blog Read: ${postId}`, 'success');
}

/**
 * Fire blog interaction event (like, share)
 */
function fireBlogInteractionEvent(postId, action) {
    const eventData = {
        event: 'blog_interaction',
        blog_post_id: postId,
        interaction_type: action,
        journey_step: `blog_${action}`,
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`📝 Blog ${action}: ${postId}`, 'success');
}

/**
 * Fire support ticket event
 */
function fireSupportTicketEvent(ticketData) {
    const eventData = {
        event: 'support_ticket_submitted',
        support_category: ticketData.category,
        support_name: ticketData.name,
        support_email: ticketData.email,
        journey_step: 'support_ticket',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`🎧 Support Ticket: ${ticketData.category}`, 'success');
}

/**
 * Fire FAQ interaction event
 */
function fireFAQInteractionEvent(index) {
    const eventData = {
        event: 'faq_interaction',
        faq_index: index,
        journey_step: 'faq_interaction',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`❓ FAQ Interaction: ${index}`, 'success');
}

/**
 * Fire account section view event
 */
function fireAccountSectionViewEvent(section) {
    const eventData = {
        event: 'account_section_view',
        account_section: section,
        journey_step: 'account_' + section,
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('view', eventData);
    logToDebugConsole(`👤 Account Section: ${section}`, 'success');
}

/**
 * Fire search event
 */
function fireSearchEvent(query) {
    const eventData = {
        event: 'search',
        search_query: query,
        journey_step: 'product_search',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`🔍 Search: ${query}`, 'success');
}

/**
 * Fire filter event
 */
function fireFilterEvent(filterType, filterValue) {
    const eventData = {
        event: 'filter_applied',
        filter_type: filterType,
        filter_value: filterValue,
        journey_step: 'product_filter',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`🏷️ Filter: ${filterType} = ${filterValue}`, 'success');
}

/**
 * Fire sort event
 */
function fireSortEvent(sortBy) {
    const eventData = {
        event: 'sort_applied',
        sort_by: sortBy,
        journey_step: 'product_sort',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole(`📊 Sort: ${sortBy}`, 'success');
}

/**
 * Fire clear filters event
 */
function fireClearFiltersEvent() {
    const eventData = {
        event: 'filters_cleared',
        journey_step: 'filters_cleared',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    logToDebugConsole('🧹 Filters Cleared', 'success');
}

/**
 * Fire product list view event
 */
function fireProductListViewEvent(productCount, filters) {
    const eventData = {
        event: 'product_list_view',
        product_count: productCount,
        category_filter: filters.category,
        sort_by: filters.sort,
        journey_step: 'product_list_view',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    updateDataLayer(eventData);
    fireUtag('view', eventData);
}

/**
 * Helper function to update data layer and fire Tealium events (FIXED FOR JOURNEY)
 */
function updateDataLayer(eventData) {
    // Update the main sandbox data layer
    if (window.utag_data) {
        Object.assign(window.utag_data, eventData);
    }
    
    // Also update currentDataLayer if it exists (from data-layer.js)
    if (window.currentDataLayer) {
        Object.assign(window.currentDataLayer, eventData);
    }
    
    // Update data layer preview if function exists
    if (typeof updateDataLayerPreview === 'function') {
        updateDataLayerPreview();
    }
}

/**
 * Helper function to fire Tealium events (IDENTICAL TO QUICK EVENTS)
 */
function fireUtag(type, data) {
    // Use the EXACT same check as Quick Events - NO readiness checks
    if (typeof window.utag === 'undefined' || typeof window.utag[type] !== 'function') {
        logToDebugConsole(`⚠️ Tealium not loaded or utag.${type} not available`, 'warning');
        return;
    }
    
    // Fire event exactly like Quick Events do - no additional checks
    window.utag[type](data);
    logToDebugConsole(`🚀 Fired ${type} event (same method as Quick Events)`, 'success');
}

/**
 * Diagnose why tags might not be loading
 */
function diagnoseTagLoading() {
    if (!window.utag || !window.utag.loader) {
        logToDebugConsole('⚠️ Tealium not fully loaded yet', 'warning');
        return;
    }
    
    logToDebugConsole('🔍 TAG LOADING DIAGNOSIS:', 'info');
    logToDebugConsole('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
    
    // Check current data layer
    if (window.utag_data) {
        logToDebugConsole('📊 Current Data Layer Variables:', 'success');
        const importantVars = ['page_name', 'page_type', 'event', 'journey_step', 'journey_type'];
        importantVars.forEach(varName => {
            if (window.utag_data[varName]) {
                logToDebugConsole(`   ✅ ${varName}: "${window.utag_data[varName]}"`, 'success');
            } else {
                logToDebugConsole(`   ❌ ${varName}: NOT SET`, 'error');
            }
        });
    } else {
        logToDebugConsole('❌ No utag_data found!', 'error');
    }
    
    // Check tag status from utag.loader
    if (window.utag.loader && window.utag.loader.cfg) {
        logToDebugConsole('🏷️ Tag Loading Status:', 'info');
        const tags = window.utag.loader.cfg;
        
        // Common tag IDs to check
        const commonTags = [1, 2, 4, 5, 6, 7, 8, 9];
        commonTags.forEach(tagId => {
            if (tags[tagId]) {
                const tag = tags[tagId];
                const status = tag.load ? '✅ LOADED' : '❌ NOT LOADED';
                logToDebugConsole(`   Tag ${tagId}: ${status}`, tag.load ? 'success' : 'error');
                
                if (!tag.load && tag.load_rules) {
                    logToDebugConsole(`     📋 Load Rules: ${JSON.stringify(tag.load_rules)}`, 'warning');
                }
            }
        });
    }
    
    logToDebugConsole('💡 QUICK FIXES TO TRY:', 'warning');
    logToDebugConsole('   1. Set page_name in Data Layer section: utag_data.page_name = "test"', 'info');
    logToDebugConsole('   2. Check Profile Inspector → Load Rules to see requirements', 'info');
    logToDebugConsole('   3. In Tealium IQ, set tags to "All Pages" for testing', 'info');
    logToDebugConsole('   4. Ensure required variables match your load rules exactly', 'info');
    logToDebugConsole('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
}

/**
 * Fire journey page view event (FIXED TO USE MAIN SANDBOX)
 */
function fireJourneyPageView(page) {
    const eventData = {
        page_name: `ShopTech - ${page.charAt(0).toUpperCase() + page.slice(1)}`,
        page_type: `ecommerce_${page}`,
        journey_step: page + '_page',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    // Use the main sandbox's data layer and Tealium instance
    updateDataLayer(eventData);
    fireUtag('view', eventData);
    
    logToDebugConsole(`📄 Journey Page View: ${page}`, 'success');
}

/**
 * Fire journey add to cart event (FIXED TO USE MAIN SANDBOX)
 */
function fireJourneyAddToCart(product) {
    const eventData = {
        event: 'add_to_cart',
        product_id: product.id,
        product_name: product.name,
        product_category: product.category,
        product_brand: product.brand,
        product_price: product.price,
        currency: 'USD',
        journey_step: 'add_to_cart',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    // Use the main sandbox's data layer and Tealium instance
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    
    logToDebugConsole(`🛒 Journey Add to Cart: ${product.name}`, 'success');
}

/**
 * Fire journey purchase event (FIXED TO USE MAIN SANDBOX)
 */
function fireJourneyPurchase(cartItems, total) {
    const eventData = {
        event: 'purchase',
        purchase_value: total,
        currency: 'USD',
        products: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price
        })),
        journey_step: 'purchase',
        journey_type: 'inline_ecommerce',
        timestamp: Date.now()
    };
    
    // Use the main sandbox's data layer and Tealium instance
    updateDataLayer(eventData);
    fireUtag('link', eventData);
    
    logToDebugConsole(`💰 Journey Purchase: $${total}`, 'success');
}

/**
 * Set up iframe communication for journey
 */
function setupJourneyIframeComm() {
    const iframe = document.getElementById('journeyIframe');
    if (!iframe) return;
    
    // Send current Tealium configuration to the iframe
    try {
        const config = {
            type: 'updateTealiumConfig',
            config: {
                utag_data: window.utag_data || {},
                tealiumLoaded: typeof window.utag !== 'undefined',
                tealiumInstance: typeof window.utag !== 'undefined' ? 'available' : 'not_loaded'
            }
        };
        
        iframe.contentWindow.postMessage(config, '*');
        logToDebugConsole('📡 Tealium config sent to journey iframe (shared instance mode)');
    } catch (e) {
        logToDebugConsole('⚠️ Could not communicate with journey iframe: ' + e.message);
    }
}

/**
 * Close journey testing environment
 */
function closeJourney() {
    const envEl = document.getElementById('journeyTestingEnvironment');
    envEl.classList.add('hidden');
    
    // Track journey close
    if (currentJourney) {
        if (window.utag && window.utag.link) {
            window.utag.link({
                event: 'journey_close',
                journey_type: currentJourney
            });
        }
        logToDebugConsole(`🔒 Journey closed: ${currentJourney}`);
    }
    
    currentJourney = null;
}

/**
 * Initialize journey-specific event tracking
 */
function initializeJourneyTracking(journeyType) {
    // Clear previous tracking containers
    const containers = ['journeyProgress', 'formEvents', 'navigationEvents', 'videoEvents', 'authEvents', 'searchEvents'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    
    logToDebugConsole(`🚀 Started journey: ${journeyDefinitions[journeyType].title}`, 'info');
}

/**
 * Simulate journey-specific events
 */
function simulateJourneyEvent(journeyType, eventType, customData = {}) {
    const timestamp = new Date().toISOString();
    
    // Base event data
    let eventData = {
        journey_type: journeyType,
        event_type: eventType,
        timestamp: timestamp,
        page_name: `Journey: ${journeyType}`,
        ...customData
    };
    
    // Journey-specific event data
    switch (journeyType) {
        case 'ecommerce':
            eventData = { ...eventData, ...getEcommerceEventData(eventType) };
            break;
        case 'form':
            eventData = { ...eventData, ...getFormEventData(eventType, customData) };
            break;
        case 'navigation':
            eventData = { ...eventData, ...getNavigationEventData(eventType, customData) };
            break;
        case 'video':
            eventData = { ...eventData, ...getVideoEventData(eventType) };
            break;
        case 'login':
            eventData = { ...eventData, ...getLoginEventData(eventType, customData) };
            break;
        case 'search':
            eventData = { ...eventData, ...getSearchEventData(eventType, customData) };
            break;
    }
    
    // Fire the event through Tealium
    if (typeof window.utag !== 'undefined' && window.utag.link) {
        window.utag.link(eventData);
    }
    
    // Log to debug console
    logToDebugConsole(`🎯 Journey Event: ${eventType} (${journeyType})`, 'info');
    
    // Update journey-specific tracking UI
    updateJourneyTracking(journeyType, eventType, eventData);
}

/**
 * Get e-commerce specific event data
 */
function getEcommerceEventData(eventType) {
    const products = {
        'laptop': { id: 'LAPTOP001', name: 'Gaming Laptop', category: 'Electronics', price: 1299.99 },
        'headphones': { id: 'AUDIO001', name: 'Wireless Headphones', category: 'Audio', price: 199.99 },
        'mouse': { id: 'ACC001', name: 'Gaming Mouse', category: 'Accessories', price: 79.99 }
    };
    
    const randomProduct = Object.values(products)[Math.floor(Math.random() * Object.values(products).length)];
    
    switch (eventType) {
        case 'homepage':
            return { page_type: 'home', site_section: 'homepage' };
        case 'category':
            return { page_type: 'category', site_section: 'products', category_name: 'Electronics' };
        case 'product_view':
            return { 
                page_type: 'product',
                product_id: randomProduct.id,
                product_name: randomProduct.name,
                product_category: randomProduct.category,
                product_price: randomProduct.price
            };
        case 'add_to_cart':
            return { 
                event_category: 'ecommerce',
                product_id: randomProduct.id,
                product_quantity: 1,
                cart_total: randomProduct.price
            };
        case 'checkout':
            return { 
                page_type: 'checkout',
                checkout_step: 1,
                order_total: randomProduct.price
            };
        case 'purchase':
            return { 
                event_category: 'ecommerce',
                order_id: 'ORD' + Date.now(),
                order_total: randomProduct.price,
                currency: 'USD'
            };
        default:
            return {};
    }
}

/**
 * Get form specific event data
 */
function getFormEventData(eventType, customData) {
    switch (eventType) {
        case 'field_focus':
            return { 
                event_category: 'form',
                form_name: 'contact_form',
                field_name: customData.field || 'unknown'
            };
        case 'submit_attempt':
            return { 
                event_category: 'form',
                form_name: 'contact_form',
                form_status: 'submitted'
            };
        case 'validation_error':
            return { 
                event_category: 'form',
                form_name: 'contact_form',
                error_type: 'validation',
                error_field: 'email'
            };
        default:
            return { event_category: 'form' };
    }
}

/**
 * Get navigation specific event data
 */
function getNavigationEventData(eventType, customData) {
    switch (eventType) {
        case 'page_visit':
            return { 
                page_type: customData.page || 'unknown',
                navigation_type: 'internal_link'
            };
        case 'menu_toggle':
            return { 
                event_category: 'navigation',
                ui_element: 'menu_toggle'
            };
        case 'search':
            return { 
                event_category: 'search',
                search_type: 'site_search'
            };
        case 'external_link':
            return { 
                event_category: 'navigation',
                link_type: 'external'
            };
        default:
            return { event_category: 'navigation' };
    }
}

/**
 * Get video specific event data
 */
function getVideoEventData(eventType) {
    const videoData = {
        video_id: 'VID001',
        video_title: 'Sample Video',
        video_duration: 120,
        video_position: Math.floor(Math.random() * 120)
    };
    
    switch (eventType) {
        case 'play':
            return { ...videoData, event_category: 'video', video_action: 'play' };
        case 'pause':
            return { ...videoData, event_category: 'video', video_action: 'pause' };
        case 'seek':
            return { ...videoData, event_category: 'video', video_action: 'seek' };
        case 'volume':
            return { ...videoData, event_category: 'video', video_action: 'volume_change' };
        case 'complete':
            return { ...videoData, event_category: 'video', video_action: 'complete' };
        default:
            return { ...videoData, event_category: 'video' };
    }
}

/**
 * Get login specific event data
 */
function getLoginEventData(eventType, customData) {
    switch (eventType) {
        case 'field_focus':
            return { 
                event_category: 'authentication',
                form_field: customData.field || 'unknown'
            };
        case 'login_success':
            return { 
                event_category: 'authentication',
                auth_status: 'success',
                user_id: 'USER' + Date.now()
            };
        case 'login_failed':
            return { 
                event_category: 'authentication',
                auth_status: 'failed',
                error_type: 'invalid_credentials'
            };
        case 'register':
            return { 
                event_category: 'authentication',
                auth_action: 'register'
            };
        case 'logout':
            return { 
                event_category: 'authentication',
                auth_action: 'logout'
            };
        default:
            return { event_category: 'authentication' };
    }
}

/**
 * Get search specific event data
 */
function getSearchEventData(eventType, customData) {
    switch (eventType) {
        case 'search_input':
            return { 
                event_category: 'search',
                search_query: customData.query || '',
                search_type: 'input'
            };
        case 'search_submit':
            return { 
                event_category: 'search',
                search_query: 'sample query',
                search_results: Math.floor(Math.random() * 100)
            };
        case 'autocomplete':
            return { 
                event_category: 'search',
                search_type: 'autocomplete',
                suggestions_shown: 5
            };
        case 'filter_apply':
            return { 
                event_category: 'search',
                filter_type: customData.filter || 'unknown',
                filter_value: customData.value || 'unknown'
            };
        case 'filter_clear':
            return { 
                event_category: 'search',
                filter_action: 'clear_all'
            };
        default:
            return { event_category: 'search' };
    }
}

/**
 * Update journey-specific tracking UI
 */
function updateJourneyTracking(journeyType, eventType, eventData) {
    const containerId = getTrackingContainerId(journeyType);
    const container = document.getElementById(containerId);
    
    if (container) {
        const eventEl = document.createElement('div');
        eventEl.className = 'bg-blue-50 border border-blue-200 rounded p-2 text-xs';
        eventEl.innerHTML = `
            <div class="font-medium text-blue-800">${eventType}</div>
            <div class="text-gray-600">${new Date().toLocaleTimeString()}</div>
        `;
        container.insertBefore(eventEl, container.firstChild);
        
        // Limit to last 10 events
        while (container.children.length > 10) {
            container.removeChild(container.lastChild);
        }
    }
}

/**
 * Get tracking container ID for journey type
 */
function getTrackingContainerId(journeyType) {
    const containerMap = {
        'ecommerce': 'journeyProgress',
        'form': 'formEvents',
        'navigation': 'navigationEvents', 
        'video': 'videoEvents',
        'login': 'authEvents',
        'search': 'searchEvents'
    };
    return containerMap[journeyType] || 'journeyProgress';
}

// Global exposure
window.initializeEvents = initializeEvents;
window.toggleEventInterceptor = toggleEventInterceptor;
window.clearEventDebugConsole = clearEventDebugConsole;
window.triggerPageView = triggerPageView;
window.triggerSPAPageView = triggerSPAPageView;
window.triggerLinkEvent = triggerLinkEvent;
window.triggerEcommerceEvent = triggerEcommerceEvent;
window.addCustomEventVariable = addCustomEventVariable;
window.triggerCustomEvent = triggerCustomEvent;
window.clearEventHistory = clearEventHistory;
window.exportEventHistory = exportEventHistory;
window.analyzeLastEventImpact = analyzeLastEventImpact;
window.compareDataLayerStates = compareDataLayerStates;
window.validateEventDataLayer = validateEventDataLayer;
window.analyzeTagPerformance = analyzeTagPerformance;
window.checkTagLoadRules = checkTagLoadRules;
window.inspectTagMappings = inspectTagMappings;
window.toggleNetworkAutoUpdate = toggleNetworkAutoUpdate;
window.exportNetworkDetails = exportNetworkDetails;
window.switchTab = switchTab;
window.loadJourney = loadJourney;
window.startJourney = startJourney;
window.closeJourney = closeJourney;
window.simulateJourneyEvent = simulateJourneyEvent;

/**
 * Validate Event against Tealium best practices
 */
function validateEvent(eventType, eventData, timestamp) {
    const validationContainer = document.getElementById('eventValidation');
    if (!validationContainer) return;
    
    // Remove "no events" message if present
    const noEventsMsg = validationContainer.querySelector('.text-center.py-8');
    if (noEventsMsg) {
        noEventsMsg.remove();
    }
    
    const validation = performEventValidation(eventType, eventData);
    const validationEntry = document.createElement('div');
    validationEntry.className = 'bg-gray-50 rounded-lg p-4 border-l-4 border-green-400 mb-3';
    
    // Determine overall status and border color
    const hasErrors = validation.some(v => v.type === 'error');
    const hasWarnings = validation.some(v => v.type === 'warning');
    
    if (hasErrors) {
        validationEntry.className = 'bg-gray-50 rounded-lg p-4 border-l-4 border-red-400 mb-3';
    } else if (hasWarnings) {
        validationEntry.className = 'bg-gray-50 rounded-lg p-4 border-l-4 border-yellow-400 mb-3';
    }
    
    const eventTypeColor = eventType === 'view' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
    const timeStr = new Date(timestamp).toLocaleTimeString();
    
    let html = `
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
                <span class="px-2 py-1 rounded text-xs font-medium ${eventTypeColor}">${eventType.toUpperCase()}</span>
                <span class="text-sm font-medium text-gray-900">Event Validation</span>
            </div>
            <span class="text-xs text-gray-500">${timeStr}</span>
        </div>
        
        <div class="space-y-2">
    `;
    
    validation.forEach(result => {
        const icons = {
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'info': 'ℹ️'
        };
        
        const colors = {
            'success': 'text-green-700',
            'warning': 'text-yellow-700',
            'error': 'text-red-700',
            'info': 'text-blue-700'
        };
        
        html += `<div class="text-sm ${colors[result.type]} flex items-start">
            <span class="mr-2 mt-0.5">${icons[result.type]}</span>
            <span>${result.message}</span>
        </div>`;
    });
    
    html += `</div>`;
    validationEntry.innerHTML = html;
    
    validationContainer.insertBefore(validationEntry, validationContainer.firstChild);
    
    // Limit to 10 validation entries
    const entries = validationContainer.querySelectorAll('.bg-gray-50.rounded-lg');
    if (entries.length > 10) {
        for (let i = 10; i < entries.length; i++) {
            entries[i].remove();
        }
    }
}

/**
 * Clear stale tag detection data
 */
function clearStaleTagData() {
    const thirtySecondsAgo = Date.now() - 30000;
    
    // Clear old console logs
    if (eventDebugState.recentConsoleLogs) {
        eventDebugState.recentConsoleLogs = eventDebugState.recentConsoleLogs.filter(logEntry => {
            if (typeof logEntry === 'object' && logEntry.timestamp) {
                return logEntry.timestamp > thirtySecondsAgo;
            }
            return true; // Keep string entries (might be recent)
        });
    }
    
    // Clear old network requests
    if (eventDebugState.networkRequests) {
        eventDebugState.networkRequests = eventDebugState.networkRequests.filter(request => {
            return request.startTime > thirtySecondsAgo;
        });
    }
    
    // Clear old tag analysis data
    Object.keys(eventDebugState.tagAnalysisData).forEach(tagKey => {
        const tagData = eventDebugState.tagAnalysisData[tagKey];
        if (tagData && tagData.lastSeen && tagData.lastSeen < thirtySecondsAgo) {
            delete eventDebugState.tagAnalysisData[tagKey];
        }
    });
}

/**
 * Perform event validation focused on tag execution and network activity
 */
function performEventValidation(eventType, data) {
    // Clear stale data before validation
    clearStaleTagData();
    
    const results = [];
    const firedTags = getTagsFromLastEvent();
    
    // 1. Event Execution Status
    results.push({
        type: 'info',
        message: `🔥 ${eventType.toUpperCase()} event fired at ${new Date().toLocaleTimeString()}`
    });
    
    // 2. Event Data Analysis
    const dataKeys = Object.keys(data || {});
    if (dataKeys.length > 0) {
        results.push({
            type: 'success',
            message: `📦 Event payload: ${dataKeys.length} variables sent`
        });
    } else {
        results.push({
            type: 'warning',
            message: `📦 Event payload: No data variables sent`
        });
    }
    
    // 3. Tags Fired Analysis
    if (firedTags && firedTags.length > 0) {
        results.push({
            type: 'success',
            message: `🏷️ Tags fired: ${firedTags.length} tag(s) triggered (${firedTags.join(', ')})`
        });
        
        // Check for tag execution delays
        setTimeout(() => {
            checkNetworkRequests(firedTags, eventType);
        }, 1000);
        
    } else {
        results.push({
            type: 'warning',
            message: `🏷️ Tags fired: No tags triggered by this event`
        });
    }
    
    // 4. Load Rules Evaluation
    if (typeof window.utag !== 'undefined' && window.utag.loader && window.utag.loader.cfg) {
        const loadRules = window.utag.loader.cfg;
        if (loadRules && Object.keys(loadRules).length > 0) {
            results.push({
                type: 'info',
                message: `⚙️ Load rules evaluated for event processing`
            });
        }
    }
    
    // 5. Data Layer State
    if (typeof window.utag_data !== 'undefined') {
        const totalVars = Object.keys(window.utag_data).length;
        results.push({
            type: 'info',
            message: `🗂️ Data layer state: ${totalVars} total variables available`
        });
    }
    
    // 6. Network Activity Check (will be updated asynchronously)
    results.push({
        type: 'info',
        message: `🌐 Network requests: Checking tag network activity...`
    });
    
    return results;
}

/**
 * Check network requests for fired tags with detailed analysis
 */
function checkNetworkRequests(firedTags, eventType) {
    // This function monitors network activity to see if tags actually sent data
    if (!firedTags || firedTags.length === 0) return;
    
    // Get the current validation entry to update
    const validationContainer = document.getElementById('eventValidation');
    if (!validationContainer) return;
    
    const latestEntry = validationContainer.querySelector('.bg-gray-50.rounded-lg');
    if (!latestEntry) return;
    
    const networkAnalysis = analyzeTagNetworkActivity(firedTags);
    
    // Update the validation entry with detailed network results
    const networkElement = latestEntry.querySelector('[class*="text-blue-700"]:last-child');
    if (networkElement) {
        let networkStatus = '';
        let className = '';
        let icon = '';
        
        if (networkAnalysis.totalRequests > 0) {
            networkStatus = `🌐 Network requests: ✅ ${networkAnalysis.totalRequests} request(s) detected`;
            
            // Add details about which tags sent data
            if (networkAnalysis.tagDetails.length > 0) {
                const tagList = networkAnalysis.tagDetails.map(tag => `Tag ${tag.tagId}(${tag.requests})`).join(', ');
                networkStatus += ` - ${tagList}`;
            }
            
            className = 'text-sm text-blue-700 flex items-start';
            icon = 'ℹ️';
        } else {
            networkStatus = `🌐 Network requests: ⚠️ No network activity detected for fired tags`;
            className = 'text-sm text-yellow-700 flex items-start';
            icon = '⚠️';
        }
        
        networkElement.innerHTML = `<span class="mr-2 mt-0.5">${icon}</span><span>${networkStatus}</span>`;
        networkElement.className = className;
    }
}

/**
 * Analyze network activity for specific tags
 */
function analyzeTagNetworkActivity(firedTags) {
    const analysis = {
        totalRequests: 0,
        tagDetails: [],
        domains: [],
        interceptedRequests: 0,
        performanceRequests: 0
    };
    
    // Method 1: Analyze intercepted network requests (most accurate)
    const recentInterceptedRequests = eventDebugState.networkRequests
        .filter(req => {
            const timeSinceRequest = Date.now() - req.startTime;
            return timeSinceRequest < 5000 && req.isTagRelated; // Last 5 seconds
        });
    
    analysis.interceptedRequests = recentInterceptedRequests.length;
    
    const tagRequestsIntercepted = {};
    recentInterceptedRequests.forEach(request => {
        analysis.totalRequests++;
        
        // Extract domain
        try {
            const url = new URL(request.url);
            if (!analysis.domains.includes(url.hostname)) {
                analysis.domains.push(url.hostname);
            }
        } catch (e) {
            // Invalid URL
        }
        
        // Try to associate with tag ID
        let tagId = null;
        if (request.url.includes('utag')) {
            const tagIdMatch = request.url.match(/utag[._](\d+)/);
            if (tagIdMatch) {
                tagId = parseInt(tagIdMatch[1]);
            }
        }
        
        if (tagId !== null) {
            if (!tagRequestsIntercepted[tagId]) {
                tagRequestsIntercepted[tagId] = 0;
            }
            tagRequestsIntercepted[tagId]++;
        }
    });
    
    // Method 2: Fallback to Performance API analysis
    const tagRequestsPerformance = {};
    try {
        if (window.performance && window.performance.getEntriesByType) {
            const recentEntries = window.performance.getEntriesByType('resource')
                .filter(entry => {
                    const timeSinceEvent = Date.now() - (window.performance.timing.navigationStart + entry.startTime);
                    return timeSinceEvent < 5000; // Last 5 seconds
                });
            
            analysis.performanceRequests = recentEntries.length;
            
            recentEntries.forEach(entry => {
                let tagId = null;
                
                // Check if initiated by a specific tag (like your example)
                if (entry.initiator && typeof entry.initiator === 'string') {
                    const initiatorMatch = entry.initiator.match(/utag[._](\d+)/);
                    if (initiatorMatch) {
                        tagId = parseInt(initiatorMatch[1]);
                    }
                }
                
                // Check if the request URL suggests it's analytics/tracking related
                const isAnalyticsRequest = isTagRelatedRequest(entry.name);
                
                if (isAnalyticsRequest && !recentInterceptedRequests.find(r => r.url === entry.name)) {
                    // Only count if not already counted in intercepted requests
                    analysis.totalRequests++;
                    
                    // Extract domain for reporting
                    try {
                        const url = new URL(entry.name);
                        if (!analysis.domains.includes(url.hostname)) {
                            analysis.domains.push(url.hostname);
                        }
                    } catch (e) {
                        // Invalid URL
                    }
                    
                    if (tagId !== null) {
                        if (!tagRequestsPerformance[tagId]) {
                            tagRequestsPerformance[tagId] = 0;
                        }
                        tagRequestsPerformance[tagId]++;
                    }
                }
            });
        }
    } catch (e) {
        console.warn('Could not analyze performance API:', e);
    }
    
    // Combine results from both methods
    const allTagRequests = { ...tagRequestsIntercepted };
    Object.entries(tagRequestsPerformance).forEach(([tagId, count]) => {
        if (allTagRequests[tagId]) {
            allTagRequests[tagId] += count;
        } else {
            allTagRequests[tagId] = count;
        }
    });
    
    // Build tag details
    Object.entries(allTagRequests).forEach(([tagId, requestCount]) => {
        analysis.tagDetails.push({
            tagId: parseInt(tagId),
            requests: requestCount
        });
    });
    
    // Sort by tag ID
    analysis.tagDetails.sort((a, b) => a.tagId - b.tagId);
    
    return analysis;
}

/**
 * Clear event validation results
 */
function clearEventValidation() {
    const validationContainer = document.getElementById('eventValidation');
    if (!validationContainer) return;
    
    validationContainer.innerHTML = `
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-clipboard-check text-gray-300 text-3xl mb-3"></i>
            <p>Fire an event to see validation results</p>
            <p class="text-xs mt-2">Enable event intercepting above and trigger any event</p>
        </div>
    `;
}

/**
 * Schedule throttled network update to prevent page freezing
 */
function scheduleNetworkUpdate() {
    if (!eventDebugState.networkAutoUpdate) {
        return;
    }
    
    const now = Date.now();
    if (eventDebugState.pendingNetworkUpdate) {
        return; // Already scheduled
    }
    
    if (now - eventDebugState.lastNetworkUpdate < eventDebugState.networkUpdateThrottle) {
        // Throttle updates
        eventDebugState.pendingNetworkUpdate = true;
        setTimeout(() => {
            eventDebugState.pendingNetworkUpdate = false;
            updateNetworkDetailsPanel();
            eventDebugState.lastNetworkUpdate = Date.now();
        }, eventDebugState.networkUpdateThrottle);
    } else {
        // Update immediately
        updateNetworkDetailsPanel();
        eventDebugState.lastNetworkUpdate = now;
    }
}

/**
 * Update the enhanced network details panel with Omnibug-style formatting
 */
function updateNetworkDetailsPanel() {
    const container = document.getElementById('networkDetails');
    if (!container) {
        return;
    }
    
    // Get recent tag-related network requests
    const recentRequests = eventDebugState.networkRequests
        .filter(req => req.isTagRelated)
        .slice(0, 15); // Show last 15 requests to optimize performance
    
    // Update network statistics
    updateNetworkStatistics(recentRequests);
    
    if (recentRequests.length === 0) {
        return; // Keep the "no requests" message
    }
    
    // Remove the "no requests" message
    const noRequestsMsg = container.querySelector('.text-center.py-8');
    if (noRequestsMsg) {
        noRequestsMsg.remove();
    }
    
    // Build the enhanced requests display with Omnibug-style formatting
    let html = '<div class="space-y-3">';
    
    recentRequests.forEach(request => {
        const statusColor = getStatusColor(request.status);
        const methodColor = getMethodColor(request.method);
        const timeAgo = formatTimeAgo(request.startTime);
        const domain = extractDomain(request.url);
        const path = extractPath(request.url);
        const prettifiedQuery = prettifyQueryString(request.url);
        const omnibugPayload = formatOmnibugStyle(request);
        
        html += `
            <div class="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <!-- Enhanced Request Summary with neutral styling -->
                <div class="bg-gray-50 hover:bg-gray-100 p-4 cursor-pointer border-l-4 ${getVendorBorderColor(request.vendor)}" 
                     onclick="toggleRequestDetails('${request.id}')">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="bg-white border border-gray-200 rounded px-2 py-1 shadow-sm">
                                <span class="text-xs font-bold ${getVendorTextColor(request.vendor)}">${request.vendor}</span>
                            </div>
                            <span class="px-2 py-1 rounded text-xs font-mono bg-blue-100 text-blue-800 cursor-help" 
                                  title="${getMethodExplanation(request.method)}">${request.method}</span>
                            <span class="px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(request.status)} cursor-help" 
                                  title="${getStatusExplanation(request.status)}">${request.status || 'pending'}</span>
                        </div>
                        <div class="flex items-center space-x-2 text-xs text-gray-600">
                            <span class="bg-gray-200 px-2 py-1 rounded font-medium">${request.duration || 0}ms</span>
                            <span class="bg-gray-200 px-2 py-1 rounded font-medium">${formatBytes(request.size + (request.responseSize || 0))}</span>
                            <i class="fas fa-chevron-down text-gray-400" id="chevron-${request.id}"></i>
                        </div>
                    </div>
                    <div class="mt-3">
                        <div class="text-sm font-semibold text-gray-900 truncate">${domain}</div>
                        <div class="text-xs text-gray-600 truncate">${path}</div>
                        ${timeAgo ? `<div class="text-xs text-gray-500 mt-1">${timeAgo}</div>` : ''}
                    </div>
                </div>
                
                <!-- Enhanced Request Details with Tabbed Interface -->
                <div id="details-${request.id}" class="hidden bg-white">
                    <div class="p-4">
                        
                        <!-- Tab Navigation -->
                        <div class="border-b border-gray-200 mb-4">
                            <nav class="-mb-px flex space-x-8" role="tablist">
                                <button onclick="switchTab('${request.id}', 'parameters')" 
                                        class="tab-btn-${request.id} py-2 px-1 border-b-2 border-blue-500 text-blue-600 text-sm font-medium" 
                                        data-tab="parameters">
                                    <i class="fas fa-list-ul mr-1"></i>Parameters
                                    <i class="fas fa-info-circle text-gray-400 ml-1 cursor-help" 
                                       title="All parameters sent with this request, categorized by type"></i>
                                </button>
                                ${prettifiedQuery ? `
                                <button onclick="switchTab('${request.id}', 'query')" 
                                        class="tab-btn-${request.id} py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 text-sm font-medium" 
                                        data-tab="query">
                                    <i class="fas fa-search mr-1"></i>Query Params
                                    <i class="fas fa-info-circle text-gray-400 ml-1 cursor-help" 
                                       title="URL query string parameters (everything after the ? in the URL)"></i>
                                </button>
                                ` : ''}
                                <button onclick="switchTab('${request.id}', 'url')" 
                                        class="tab-btn-${request.id} py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 text-sm font-medium" 
                                        data-tab="url">
                                    <i class="fas fa-link mr-1"></i>Full URL
                                    <i class="fas fa-info-circle text-gray-400 ml-1 cursor-help" 
                                       title="Complete URL with syntax highlighting showing protocol, domain, path, and parameters"></i>
                                </button>
                                ${Object.keys(request.headers || {}).length > 0 ? `
                                <button onclick="switchTab('${request.id}', 'reqheaders')" 
                                        class="tab-btn-${request.id} py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 text-sm font-medium" 
                                        data-tab="reqheaders">
                                    <i class="fas fa-arrow-up mr-1"></i>Request Headers
                                    <i class="fas fa-info-circle text-gray-400 ml-1 cursor-help" 
                                       title="HTTP headers sent by the browser with this request (Content-Type, User-Agent, etc.)"></i>
                                </button>
                                ` : ''}
                                ${Object.keys(request.responseHeaders || {}).length > 0 ? `
                                <button onclick="switchTab('${request.id}', 'respheaders')" 
                                        class="tab-btn-${request.id} py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 text-sm font-medium" 
                                        data-tab="respheaders">
                                    <i class="fas fa-arrow-down mr-1"></i>Response Headers
                                    <i class="fas fa-info-circle text-gray-400 ml-1 cursor-help" 
                                       title="HTTP headers returned by the server (Content-Type, Cache-Control, etc.)"></i>
                                </button>
                                ` : ''}
                                <button onclick="switchTab('${request.id}', 'performance')" 
                                        class="tab-btn-${request.id} py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 text-sm font-medium" 
                                        data-tab="performance">
                                    <i class="fas fa-tachometer-alt mr-1"></i>Performance
                                    <i class="fas fa-info-circle text-gray-400 ml-1 cursor-help" 
                                       title="Timing information and data transfer metrics for this request"></i>
                                </button>
                            </nav>
                        </div>
                        
                        <!-- Tab Content -->
                        <div class="tab-content">
                            
                            <!-- Parameters Tab -->
                            <div id="tab-${request.id}-parameters" class="tab-pane">
                                <div class="bg-gray-50 rounded-lg p-3">
                                    ${omnibugPayload}
                                </div>
                            </div>
                            
                            <!-- Query Parameters Tab -->
                            ${prettifiedQuery ? `
                            <div id="tab-${request.id}-query" class="tab-pane hidden">
                                <div class="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg">
                                    ${prettifiedQuery}
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- Full URL Tab -->
                            <div id="tab-${request.id}-url" class="tab-pane hidden">
                                <div class="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs break-all">
                                    ${highlightUrl(request.url)}
                                </div>
                                <div class="mt-2 text-xs text-gray-600">
                                    <strong>URL Structure:</strong> 
                                    <span class="text-yellow-600">Protocol</span> + 
                                    <span class="text-blue-600">Domain</span> + 
                                    <span class="text-green-600">Path</span> + 
                                    <span class="text-purple-600">Query</span> + 
                                    <span class="text-red-600">Fragment</span>
                                </div>
                            </div>
                            
                            <!-- Request Headers Tab -->
                            ${Object.keys(request.headers || {}).length > 0 ? `
                            <div id="tab-${request.id}-reqheaders" class="tab-pane hidden">
                                <div class="bg-blue-50 p-3 rounded-lg">
                                    <div class="text-xs font-mono space-y-1 max-h-64 overflow-y-auto">
                                        ${Object.entries(request.headers).map(([key, value]) => 
                                            `<div class="py-1 border-b border-blue-200 last:border-b-0">
                                                <div class="font-bold text-blue-700">${key}:</div>
                                                <div class="text-gray-700 ml-4 break-all">${value}</div>
                                            </div>`
                                        ).join('')}
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- Response Headers Tab -->
                            ${Object.keys(request.responseHeaders || {}).length > 0 ? `
                            <div id="tab-${request.id}-respheaders" class="tab-pane hidden">
                                <div class="bg-green-50 p-3 rounded-lg">
                                    <div class="text-xs font-mono space-y-1 max-h-64 overflow-y-auto">
                                        ${Object.entries(request.responseHeaders).map(([key, value]) => 
                                            `<div class="py-1 border-b border-green-200 last:border-b-0">
                                                <div class="font-bold text-green-700">${key}:</div>
                                                <div class="text-gray-700 ml-4 break-all">${value}</div>
                                            </div>`
                                        ).join('')}
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                            
                            <!-- Performance Tab -->
                            <div id="tab-${request.id}-performance" class="tab-pane hidden">
                                <div class="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                        <div class="bg-white p-3 rounded-lg shadow-sm">
                                            <div class="font-bold text-purple-600 text-lg">${new Date(request.startTime).toLocaleTimeString()}</div>
                                            <div class="text-gray-600 text-xs">Start Time</div>
                                        </div>
                                        <div class="bg-white p-3 rounded-lg shadow-sm">
                                            <div class="font-bold text-blue-600 text-lg">${request.duration || 0}ms</div>
                                            <div class="text-gray-600 text-xs">Duration</div>
                                        </div>
                                        <div class="bg-white p-3 rounded-lg shadow-sm">
                                            <div class="font-bold text-green-600 text-lg">${formatBytes(request.size || 0)}</div>
                                            <div class="text-gray-600 text-xs">Request Size</div>
                                        </div>
                                        <div class="bg-white p-3 rounded-lg shadow-sm">
                                            <div class="font-bold text-orange-600 text-lg">${formatBytes(request.responseSize || 0)}</div>
                                            <div class="text-gray-600 text-xs">Response Size</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Toggle request details visibility
 */
function toggleRequestDetails(requestId) {
    const detailsEl = document.getElementById(`details-${requestId}`);
    const chevronEl = document.getElementById(`chevron-${requestId}`);
    
    if (detailsEl && chevronEl) {
        if (detailsEl.classList.contains('hidden')) {
            detailsEl.classList.remove('hidden');
            chevronEl.classList.remove('fa-chevron-down');
            chevronEl.classList.add('fa-chevron-up');
        } else {
            detailsEl.classList.add('hidden');
            chevronEl.classList.remove('fa-chevron-up');
            chevronEl.classList.add('fa-chevron-down');
        }
    }
}

/**
 * Helper functions for formatting
 */
function getStatusColor(status) {
    if (!status || status === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
    if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-800';
    if (status >= 400) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
}

function getMethodColor(method) {
    switch (method) {
        case 'GET': return 'bg-blue-100 text-blue-800';
        case 'POST': return 'bg-green-100 text-green-800';
        case 'PUT': return 'bg-yellow-100 text-yellow-800';
        case 'DELETE': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

function extractDomain(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return 'Unknown';
    }
}

function extractPath(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname + urlObj.search;
    } catch (e) {
        return url;
    }
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatPayload(payload) {
    if (!payload) return 'No payload';
    if (typeof payload === 'string') {
        try {
            // Try to format as JSON if possible
            const parsed = JSON.parse(payload);
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            return payload;
        }
    }
    return JSON.stringify(payload, null, 2);
}

/**
 * Clear network details panel
 */
function clearNetworkDetails() {
    eventDebugState.networkRequests = [];
    const container = document.getElementById('networkDetails');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-globe text-gray-300 text-3xl mb-3"></i>
                <p>Fire an event to see network details</p>
                <p class="text-xs mt-2">All tag-related network requests will appear here</p>
            </div>
        `;
    }
}

/**
 * Refresh network details panel
 */
function refreshNetworkDetails() {
    console.log('🔄 Manually refreshing network details...');
    console.log('🔄 Current network requests:', eventDebugState.networkRequests);
    updateNetworkDetailsPanel();
}

/**
 * Force show all network requests for debugging
 */
function debugShowAllNetworkRequests() {
    const container = document.getElementById('networkDetails');
    if (!container) return;
    
    console.log('🔍 Debug: Showing ALL network requests...');
    console.log('🔍 Total requests:', eventDebugState.networkRequests.length);
    
    // Show ALL requests, not just tag-related ones
    const allRequests = eventDebugState.networkRequests.slice(0, 20);
    
    if (allRequests.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-globe text-gray-300 text-3xl mb-3"></i>
                <p>No network requests captured at all</p>
                <p class="text-xs mt-2">Network monitoring might not be working</p>
            </div>
        `;
        return;
    }
    
    // Remove the "no requests" message
    const noRequestsMsg = container.querySelector('.text-center.py-8');
    if (noRequestsMsg) {
        noRequestsMsg.remove();
    }
    
    let html = '<div class="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">';
    html += `🔍 DEBUG MODE: Showing ALL ${allRequests.length} requests (tag-related and non-tag-related)`;
    html += '</div><div class="space-y-2">';
    
    allRequests.forEach(request => {
        const statusColor = getStatusColor(request.status);
        const methodColor = getMethodColor(request.method);
        const timeAgo = formatTimeAgo(request.startTime);
        const domain = extractDomain(request.url);
        const path = extractPath(request.url);
        const tagRelatedBadge = request.isTagRelated ? 
            '<span class="px-1 py-0.5 bg-green-100 text-green-700 text-xs rounded">TAG</span>' : 
            '<span class="px-1 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">OTHER</span>';
        
        html += `
            <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <span class="px-2 py-1 rounded text-xs font-mono ${methodColor}">${request.method}</span>
                        <span class="px-2 py-1 rounded text-xs font-medium ${statusColor}">${request.status || 'pending'}</span>
                        ${tagRelatedBadge}
                        <span class="text-xs font-medium text-purple-600">${request.vendor}</span>
                    </div>
                    <div class="flex items-center space-x-2 text-xs text-gray-500">
                        <span>${request.duration || 0}ms</span>
                        <span>${formatBytes(request.size)}</span>
                        <span>${timeAgo}</span>
                    </div>
                </div>
                <div class="mt-2">
                    <div class="text-sm font-medium text-gray-900">${domain}</div>
                    <div class="text-xs text-gray-600 truncate">${path}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Export the validation and network functions
window.validateEvent = validateEvent;
window.clearEventValidation = clearEventValidation;
window.updateNetworkDetailsPanel = updateNetworkDetailsPanel;
window.clearNetworkDetails = clearNetworkDetails;
window.refreshNetworkDetails = refreshNetworkDetails;
window.toggleRequestDetails = toggleRequestDetails;
window.debugShowAllNetworkRequests = debugShowAllNetworkRequests;

/**
 * Set up journey event listener to receive events from journey iframes
 */
function setupJourneyEventListener() {
    window.addEventListener('message', function(event) {
        // Accept messages from same origin, null origin, or file:// protocol
        const validOrigins = [
            window.location.origin,
            'null',
            'file://',
            location.protocol + '//' + location.host
        ];
        
        const isValidOrigin = validOrigins.some(origin => 
            event.origin === origin || event.origin.startsWith('http://localhost') || event.origin.startsWith('http://127.0.0.1')
        );
        
        if (isValidOrigin || event.origin === 'null') {
            if (event.data && event.data.type === 'journey_event') {
                console.log('📥 Parent received journey event:', event.data.eventType || event.data.type);
                handleJourneyEvent(event.data);
            }
        }
    });
    console.log('👂 Parent journey event listener set up');
}

/**
 * Handle journey events and route them to appropriate panels
 */
function handleJourneyEvent(eventData) {
    const eventType = eventData.eventType || eventData.type;
    console.log('🎯 Handling journey event type:', eventType);
    
    switch(eventType) {
        case 'debug_message':
            // Add to event debug console
            logToDebugConsole(`${eventData.message}`);
            break;
            
        case 'tealium_event':
            // Add to event history
            addEventToHistory(`${eventData.event_type} (Journey)`, eventData.data);
            
            // Add to debug console
            logToDebugConsole(`🎯 Journey ${eventData.event_type}: ${JSON.stringify(eventData.data)}`);
            
            // Update data layer impact if it's a data layer change
            if (eventData.data) {
                updateDataLayerImpactDisplay(eventData.data, eventData.source);
            }
            break;
            
        case 'data_layer_update':
            // Update data layer impact panel
            updateDataLayerImpactDisplay(eventData.data, eventData.source);
            logToDebugConsole(`📊 Data layer updated from ${eventData.source}`);
            break;
            
        case 'fire_tealium_event':
            // Fire Tealium events in parent window where tags are loaded
            if (typeof window.utag !== 'undefined') {
                const journeyEventData = eventData.data || {};
                
                // Merge journey data with parent's utag_data
                if (window.utag_data) {
                    Object.assign(window.utag_data, journeyEventData);
                }
                
                logToDebugConsole(`🚀 Firing ${eventData.event_type} from journey in parent Tealium`, 'success');
                console.log('🎯 Journey event data:', journeyEventData);
                
                if (eventData.event_type === 'utag.view' && window.utag.view) {
                    window.utag.view(journeyEventData);
                } else if (eventData.event_type === 'utag.link' && window.utag.link) {
                    window.utag.link(journeyEventData);
                }
            } else {
                logToDebugConsole('⚠️ Cannot fire journey event - parent Tealium not loaded', 'warning');
            }
            break;
            
        case 'network_request':
            // Handle network requests from journey iframe
            if (eventData.url) {
                const requestId = 'journey-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                const vendor = detectVendorFromUrl(eventData.url);
                const isTagRelated = isTagRelatedRequest(eventData.url);
                
                // Determine method display based on detection method
                let methodDisplay = eventData.method || 'GET';
                if (eventData.method === 'performance') {
                    methodDisplay = 'PERF';
                } else if (eventData.method === 'script') {
                    methodDisplay = 'SCRIPT';
                } else if (eventData.method === 'pixel') {
                    methodDisplay = 'PIXEL';
                } else if (eventData.method === 'periodic') {
                    methodDisplay = 'SCAN';
                }
                
                const requestData = {
                    id: requestId,
                    url: eventData.url,
                    method: methodDisplay,
                    timestamp: eventData.timestamp || Date.now(),
                    source: eventData.source || 'journey',
                    vendor: vendor,
                    isTagRelated: isTagRelated,
                    requestHeaders: {},
                    responseHeaders: {},
                    completed: eventData.duration !== undefined, // If we have duration, it's completed
                    duration: eventData.duration || 0,
                    size: eventData.transferSize || 0,
                    responseSize: eventData.transferSize || 0,
                    status: eventData.duration !== undefined ? 200 : undefined // Assume success if we have duration
                };
                
                eventDebugState.networkRequests.push(requestData);
                
                // Log to debug console for immediate feedback
                const vendorDisplay = vendor !== 'Unknown' ? ` (${vendor})` : '';
                const statusIcon = isTagRelated ? '🏷️' : '🌐';
                logToDebugConsole(`${statusIcon} Journey ${methodDisplay}${vendorDisplay}: ${eventData.url}`, 'network');
                
                // Update network details display
                scheduleNetworkUpdate();
            }
            break;
            
        case 'network_response':
            // Handle network responses from journey iframe
            if (eventData.url) {
                // Find the corresponding request and update it
                const request = eventDebugState.networkRequests.find(req => 
                    req.url === eventData.url && req.source === eventData.source && !req.completed
                );
                
                if (request) {
                    request.status = eventData.status;
                    request.duration = eventData.duration;
                    request.completed = true;
                    request.responseSize = eventData.responseSize || 0;
                    
                    // Log success to debug console
                    const statusIcon = eventData.status >= 200 && eventData.status < 300 ? '✅' : 
                                      eventData.status >= 400 ? '❌' : '⚠️';
                    logToDebugConsole(`${statusIcon} Journey Response: ${eventData.status} (${eventData.duration}ms)`, 'success');
                    
                    // Update network details display
                    scheduleNetworkUpdate();
                }
            }
            break;
            
        case 'network_error':
            // Handle network errors from journey iframe
            if (eventData.url) {
                // Find the corresponding request and mark as error
                const request = eventDebugState.networkRequests.find(req => 
                    req.url === eventData.url && req.source === eventData.source && !req.completed
                );
                
                if (request) {
                    request.status = 0;
                    request.duration = eventData.duration;
                    request.completed = true;
                    request.error = eventData.error;
                    
                    // Log error to debug console
                    logToDebugConsole(`❌ Journey Error: ${eventData.error} (${eventData.duration}ms)`, 'error');
                    
                    // Update network details display
                    scheduleNetworkUpdate();
                }
            }
            break;
    }
}

/**
 * Update data layer impact display with journey data
 */
function updateDataLayerImpactDisplay(data, source) {
    const resultsEl = document.getElementById('dataLayerImpactResults');
    if (!resultsEl) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const changeHtml = `
        <div class="border-l-4 border-blue-500 pl-3 mb-3 bg-blue-50 p-2 rounded">
            <div class="text-xs text-blue-600 font-medium">${timestamp} - ${source || 'Journey'}</div>
            <div class="text-sm text-gray-800 mt-1">
                ${Object.entries(data).map(([key, value]) => {
                    const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    const shortValue = valueStr.length > 50 ? valueStr.substring(0, 47) + '...' : valueStr;
                    return `<div><span class="font-medium text-blue-700">${key}:</span> <span class="text-gray-600">${shortValue}</span></div>`;
                }).join('')}
            </div>
        </div>
    `;
    
    // Prepend to results (newest first)
    if (resultsEl.querySelector('.text-center')) {
        resultsEl.innerHTML = changeHtml;
    } else {
        resultsEl.insertAdjacentHTML('afterbegin', changeHtml);
    }
    
    // Keep only last 10 entries
    const entries = resultsEl.querySelectorAll('.border-l-4');
    if (entries.length > 10) {
        for (let i = 10; i < entries.length; i++) {
            entries[i].remove();
        }
    }
}
