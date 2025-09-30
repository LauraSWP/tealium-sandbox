# Tealium Implementation Examples

This document provides specific examples and best practices for setting up Tealium configurations that work well with the sandbox toolkit.

## 📋 Essential TiQ Profile Setup

### Required Extensions

#### 1. Universal Debug Extension
**Type**: JavaScript Code  
**Scope**: All Tags, Before Load Rules  
**Purpose**: Comprehensive debugging and data validation

```javascript
// Universal Debug Extension
(function() {
  'use strict';
  
  // Only run in debug environments
  if (window.location.hostname.includes('localhost') || 
      window.location.search.includes('debug=true') ||
      utag_data.environment === 'sandbox') {
    
    console.group('🔧 Tealium Debug Extension');
    
    // Log basic page info
    console.log('📄 Page Info:', {
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent.substring(0, 50) + '...'
    });
    
    // Log utag_data
    console.log('📊 UDO (utag_data):', utag_data);
    
    // Validate required fields
    const requiredFields = ['page_type', 'page_name'];
    const missingFields = requiredFields.filter(field => !utag_data[field]);
    if (missingFields.length > 0) {
      console.warn('⚠️ Missing required fields:', missingFields);
    }
    
    // Check for common data issues
    Object.keys(utag_data).forEach(key => {
      const value = utag_data[key];
      if (value === null || value === undefined) {
        console.warn(`⚠️ Null/undefined value for: ${key}`);
      }
      if (Array.isArray(value) && value.length === 0) {
        console.warn(`⚠️ Empty array for: ${key}`);
      }
      if (typeof value === 'string' && value.trim() === '') {
        console.warn(`⚠️ Empty string for: ${key}`);
      }
    });
    
    console.groupEnd();
    
    // Make debug functions globally available
    window.tealiumDebug = {
      logUtagData: () => console.log('utag_data:', utag_data),
      validateData: () => {
        console.log('Validation complete - check console above');
      },
      showDataLayer: () => {
        console.table(utag_data);
      }
    };
  }
})();
```

#### 2. Data Layer Enhancement Extension
**Type**: JavaScript Code  
**Scope**: All Tags, Before Load Rules  
**Purpose**: Add missing data and normalize formats

```javascript
// Data Layer Enhancement Extension
(function() {
  'use strict';
  
  // Add timestamp if missing
  if (!utag_data.timestamp) {
    utag_data.timestamp = new Date().toISOString();
  }
  
  // Add session info
  if (!utag_data.session_id) {
    // Generate or retrieve session ID
    let sessionId = sessionStorage.getItem('tealium_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('tealium_session_id', sessionId);
    }
    utag_data.session_id = sessionId;
  }
  
  // Normalize arrays - ensure array fields are actually arrays
  const arrayFields = [
    'product_id', 'product_name', 'product_category', 'product_subcategory',
    'product_brand', 'product_price', 'product_quantity', 'product_sku'
  ];
  
  arrayFields.forEach(field => {
    if (utag_data[field] && !Array.isArray(utag_data[field])) {
      utag_data[field] = [utag_data[field]];
    }
  });
  
  // Add page hierarchy
  if (utag_data.page_type && !utag_data.page_hierarchy) {
    const hierarchy = [utag_data.site_section, utag_data.page_type, utag_data.page_name]
      .filter(Boolean)
      .join(' > ');
    utag_data.page_hierarchy = hierarchy;
  }
  
  // Add device type detection
  if (!utag_data.device_type) {
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) {
      utag_data.device_type = 'tablet';
    } else if (/mobile|iphone|android/i.test(ua)) {
      utag_data.device_type = 'mobile';
    } else {
      utag_data.device_type = 'desktop';
    }
  }
  
  console.log('✅ Data layer enhanced');
})();
```

#### 3. E-commerce Data Validator
**Type**: JavaScript Code  
**Scope**: E-commerce Tags, Before Load Rules  
**Load Rules**: `utag_data.product_id` exists

```javascript
// E-commerce Data Validator
(function() {
  'use strict';
  
  console.group('🛒 E-commerce Validation');
  
  // Check for required e-commerce fields
  const ecomFields = {
    product_id: 'Product IDs',
    product_name: 'Product Names',
    product_price: 'Product Prices',
    product_category: 'Product Categories'
  };
  
  const validation = {
    errors: [],
    warnings: [],
    info: []
  };
  
  // Validate each field
  Object.keys(ecomFields).forEach(field => {
    const value = utag_data[field];
    const label = ecomFields[field];
    
    if (!value) {
      validation.errors.push(`Missing ${label} (${field})`);
    } else if (!Array.isArray(value)) {
      validation.warnings.push(`${label} should be an array (${field})`);
    } else if (value.length === 0) {
      validation.warnings.push(`Empty ${label} array (${field})`);
    } else {
      validation.info.push(`✅ ${label}: ${value.length} items`);
    }
  });
  
  // Check array length consistency
  const arrayLengths = {};
  ['product_id', 'product_name', 'product_price', 'product_category', 'product_quantity'].forEach(field => {
    if (utag_data[field] && Array.isArray(utag_data[field])) {
      arrayLengths[field] = utag_data[field].length;
    }
  });
  
  const lengths = Object.values(arrayLengths);
  const allSameLength = lengths.every(length => length === lengths[0]);
  
  if (!allSameLength) {
    validation.errors.push('Product arrays have inconsistent lengths: ' + JSON.stringify(arrayLengths));
  }
  
  // Calculate totals
  if (utag_data.product_price && Array.isArray(utag_data.product_price)) {
    const quantities = utag_data.product_quantity || utag_data.product_price.map(() => 1);
    const calculatedTotal = utag_data.product_price.reduce((sum, price, index) => {
      return sum + (parseFloat(price) * parseInt(quantities[index] || 1));
    }, 0);
    
    validation.info.push(`Calculated total: ${calculatedTotal.toFixed(2)}`);
    
    if (utag_data.order_total) {
      const orderTotal = parseFloat(utag_data.order_total);
      if (Math.abs(orderTotal - calculatedTotal) > 0.01) {
        validation.warnings.push(`Order total (${orderTotal}) doesn't match calculated total (${calculatedTotal.toFixed(2)})`);
      }
    }
  }
  
  // Log results
  if (validation.errors.length > 0) {
    console.error('❌ E-commerce Errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('⚠️ E-commerce Warnings:', validation.warnings);
  }
  if (validation.info.length > 0) {
    console.info('ℹ️ E-commerce Info:', validation.info);
  }
  
  // Add validation results to data layer for debugging
  utag_data.ecommerce_validation = {
    valid: validation.errors.length === 0,
    errors: validation.errors,
    warnings: validation.warnings,
    timestamp: new Date().toISOString()
  };
  
  console.groupEnd();
})();
```

### Custom Load Rules

#### 1. Sandbox Environment Detection
```javascript
// Load Rule: Sandbox Environment
function(data) {
  // Only load on sandbox/test environments
  return window.location.hostname.includes('localhost') ||
         window.location.hostname.includes('test') ||
         window.location.hostname.includes('sandbox') ||
         window.location.search.includes('tealium_test=true') ||
         data.environment === 'sandbox';
}
```

#### 2. E-commerce Page Detection
```javascript
// Load Rule: E-commerce Pages
function(data) {
  // Load on pages with product information
  return data.product_id || 
         data.page_type === 'product' ||
         data.page_type === 'category' ||
         data.page_type === 'cart' ||
         data.page_type === 'checkout' ||
         data.page_type === 'purchase_complete';
}
```

#### 3. User Authentication State
```javascript
// Load Rule: Authenticated Users
function(data) {
  return data.customer_id || 
         data.user_id ||
         data.customer_type === 'logged_in' ||
         data.customer_status === 'authenticated';
}
```

## 🏷️ Tag Configuration Examples

### Google Analytics 4 Configuration

#### Basic GA4 Setup
**Tag Template**: Google Analytics 4  
**Measurement ID**: `{{GA4 Measurement ID}}`

**Data Mappings**:
```
GA4 Parameter          | Tealium Variable
----------------------|------------------
page_title            | {{page_name}}
page_location         | {{dom.url}}
content_group1        | {{page_type}}
content_group2        | {{site_section}}
custom_parameter_1    | {{custom_dimension_1}}
user_id              | {{customer_id}}
```

#### GA4 E-commerce Configuration
**Trigger Type**: Link  
**Event Name**: `purchase`

**GA4 E-commerce Parameters**:
```javascript
// Custom JavaScript in tag template
var items = [];
if (utag_data.product_id && Array.isArray(utag_data.product_id)) {
  for (var i = 0; i < utag_data.product_id.length; i++) {
    items.push({
      item_id: utag_data.product_id[i],
      item_name: utag_data.product_name[i] || '',
      item_category: utag_data.product_category[i] || '',
      item_category2: utag_data.product_subcategory[i] || '',
      item_brand: utag_data.product_brand[i] || '',
      price: parseFloat(utag_data.product_price[i]) || 0,
      quantity: parseInt(utag_data.product_quantity[i]) || 1
    });
  }
}

// Set GA4 parameters
gtag('event', 'purchase', {
  transaction_id: utag_data.order_id,
  value: parseFloat(utag_data.order_total) || 0,
  currency: utag_data.order_currency || 'USD',
  items: items
});
```

### Facebook Pixel Configuration

#### Basic Facebook Pixel
**Tag Template**: Facebook Pixel  
**Pixel ID**: `{{Facebook Pixel ID}}`

**Standard Events Mapping**:
```
Facebook Event    | Tealium Trigger
-----------------|------------------
PageView         | All Pages
ViewContent      | page_type = "product"
AddToCart        | event_name = "add_to_cart"
Purchase         | event_name = "purchase"
Lead             | event_name = "form_submit"
```

#### Custom Facebook Events
```javascript
// Custom JavaScript for Facebook Pixel
if (typeof fbq !== 'undefined') {
  // Enhanced e-commerce data
  var contentIds = utag_data.product_id || [];
  var contentType = utag_data.page_type === 'product' ? 'product' : 'product_group';
  
  fbq('track', 'ViewContent', {
    content_ids: contentIds,
    content_type: contentType,
    content_name: utag_data.product_name ? utag_data.product_name[0] : utag_data.page_name,
    content_category: utag_data.product_category ? utag_data.product_category[0] : '',
    value: utag_data.product_price ? parseFloat(utag_data.product_price[0]) : 0,
    currency: utag_data.product_currency || 'USD'
  });
}
```

### Custom HTML Tags

#### Performance Monitoring Tag
```html
<script>
(function() {
  // Monitor page performance
  window.addEventListener('load', function() {
    setTimeout(function() {
      var perfData = window.performance.timing;
      var loadTime = perfData.loadEventEnd - perfData.navigationStart;
      
      console.log('📊 Page Performance:', {
        load_time: loadTime,
        dom_ready: perfData.domContentLoadedEventEnd - perfData.navigationStart,
        first_paint: perfData.responseEnd - perfData.requestStart
      });
      
      // Send performance data via link event
      if (typeof utag !== 'undefined' && utag.link) {
        utag.link({
          event_name: 'page_performance',
          load_time: loadTime,
          page_url: window.location.href
        });
      }
    }, 0);
  });
})();
</script>
```

#### Error Tracking Tag
```html
<script>
(function() {
  // Track JavaScript errors
  window.addEventListener('error', function(e) {
    console.error('❌ JavaScript Error Tracked:', e.message);
    
    if (typeof utag !== 'undefined' && utag.link) {
      utag.link({
        event_name: 'javascript_error',
        error_message: e.message,
        error_filename: e.filename,
        error_line: e.lineno,
        error_column: e.colno,
        page_url: window.location.href
      });
    }
  });
  
  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Unhandled Promise Rejection:', e.reason);
    
    if (typeof utag !== 'undefined' && utag.link) {
      utag.link({
        event_name: 'promise_rejection',
        error_reason: e.reason ? e.reason.toString() : 'Unknown',
        page_url: window.location.href
      });
    }
  });
})();
</script>
```

## 🔐 Consent Management Examples

### Tealium Consent Manager Setup

#### Basic Consent Configuration
```javascript
// Consent Manager Configuration Extension
if (typeof utag !== 'undefined' && utag.gdpr) {
  // Set default consent categories
  var defaultConsent = {
    analytics: true,
    marketing: false,
    personalization: true,
    social: false,
    affiliates: false,
    display_ads: false
  };
  
  // Apply default consent if none exists
  if (!utag.gdpr.getConsent()) {
    utag.gdpr.setConsent(defaultConsent);
    console.log('🔐 Default consent applied:', defaultConsent);
  }
  
  // Log current consent status
  console.log('🔐 Current consent:', utag.gdpr.getConsent());
}
```

#### Custom Consent Banner
```html
<!-- Custom Consent Banner HTML -->
<div id="customConsentBanner" style="display:none; position:fixed; bottom:0; left:0; right:0; background:#333; color:white; padding:20px; z-index:10000;">
  <div style="max-width:800px; margin:0 auto;">
    <p>We use cookies to improve your experience. Please choose your preferences:</p>
    <div style="margin:10px 0;">
      <label style="margin-right:20px;">
        <input type="checkbox" id="consent-analytics" checked> Analytics
      </label>
      <label style="margin-right:20px;">
        <input type="checkbox" id="consent-marketing"> Marketing
      </label>
      <label style="margin-right:20px;">
        <input type="checkbox" id="consent-personalization" checked> Personalization
      </label>
    </div>
    <button onclick="saveConsent()" style="background:#007bff; color:white; border:none; padding:10px 20px; margin-right:10px;">Save Preferences</button>
    <button onclick="acceptAllConsent()" style="background:#28a745; color:white; border:none; padding:10px 20px;">Accept All</button>
  </div>
</div>

<script>
function showConsentBanner() {
  document.getElementById('customConsentBanner').style.display = 'block';
}

function saveConsent() {
  var consent = {
    analytics: document.getElementById('consent-analytics').checked,
    marketing: document.getElementById('consent-marketing').checked,
    personalization: document.getElementById('consent-personalization').checked,
    social: false,
    affiliates: false
  };
  
  // Save via Tealium Consent Manager or custom method
  if (typeof utag !== 'undefined' && utag.gdpr) {
    utag.gdpr.setConsent(consent);
  }
  
  // Save to cookie for persistence
  document.cookie = 'consent_preferences=' + JSON.stringify(consent) + '; path=/; max-age=31536000';
  
  document.getElementById('customConsentBanner').style.display = 'none';
  
  // Trigger consent update event
  if (typeof utag !== 'undefined' && utag.link) {
    utag.link({
      event_name: 'consent_updated',
      consent_analytics: consent.analytics,
      consent_marketing: consent.marketing,
      consent_personalization: consent.personalization
    });
  }
  
  console.log('🔐 Consent saved:', consent);
}

function acceptAllConsent() {
  var allConsent = {
    analytics: true,
    marketing: true,
    personalization: true,
    social: true,
    affiliates: true
  };
  
  if (typeof utag !== 'undefined' && utag.gdpr) {
    utag.gdpr.setConsent(allConsent);
  }
  
  document.cookie = 'consent_preferences=' + JSON.stringify(allConsent) + '; path=/; max-age=31536000';
  document.getElementById('customConsentBanner').style.display = 'none';
  
  console.log('🔐 All consent accepted');
}

// Show banner if no consent exists
if (!document.cookie.includes('consent_preferences')) {
  setTimeout(showConsentBanner, 1000);
}
</script>
```

## 📱 Mobile & App Testing

### Mobile Web Detection
```javascript
// Mobile Detection Extension
(function() {
  var isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  var isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(navigator.userAgent);
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  utag_data.device_mobile = isMobile;
  utag_data.device_tablet = isTablet;
  utag_data.device_ios = isIOS;
  utag_data.viewport_width = window.innerWidth;
  utag_data.viewport_height = window.innerHeight;
  
  console.log('📱 Mobile Detection:', {
    mobile: isMobile,
    tablet: isTablet,
    ios: isIOS,
    viewport: window.innerWidth + 'x' + window.innerHeight
  });
})();
```

### App WebView Configuration
```javascript
// App WebView Detection and Configuration
(function() {
  // Detect WebView
  var isWebView = /(wv|WebView)/.test(navigator.userAgent);
  var isInApp = window.webkit && window.webkit.messageHandlers;
  
  if (isWebView || isInApp) {
    utag_data.app_webview = true;
    utag_data.app_platform = isIOS ? 'ios' : 'android';
    
    // Try to get app version from query parameters or JavaScript bridge
    var urlParams = new URLSearchParams(window.location.search);
    utag_data.app_version = urlParams.get('app_version') || 'unknown';
    
    console.log('📱 App WebView detected:', {
      platform: utag_data.app_platform,
      version: utag_data.app_version
    });
  }
})();
```

## 🧪 Testing Best Practices

### Test Data Generation
```javascript
// Test Data Generator Extension
window.generateTestData = function(type) {
  var generators = {
    ecommerce: function() {
      return {
        page_type: 'product',
        product_id: ['TEST-' + Date.now()],
        product_name: ['Test Product ' + Math.floor(Math.random() * 1000)],
        product_category: ['Test Category'],
        product_price: [Math.floor(Math.random() * 500) + 10],
        product_quantity: [1],
        product_currency: ['USD']
      };
    },
    
    purchase: function() {
      var orderId = 'ORDER-' + Date.now();
      return {
        page_type: 'purchase_complete',
        order_id: orderId,
        order_total: Math.floor(Math.random() * 1000) + 50,
        order_currency: 'USD',
        product_id: ['TEST-1', 'TEST-2'],
        product_name: ['Test Product 1', 'Test Product 2'],
        product_price: [25.99, 39.99],
        product_quantity: [1, 2]
      };
    },
    
    user: function() {
      var userId = 'USER-' + Date.now();
      return {
        customer_id: userId,
        customer_type: 'registered',
        customer_email: 'test@example.com',
        customer_status: 'logged_in'
      };
    }
  };
  
  return generators[type] ? generators[type]() : {};
};
```

### Automated Testing Functions
```javascript
// Automated Testing Suite
window.tealiumTestSuite = {
  runBasicTests: function() {
    console.log('🧪 Running basic Tealium tests...');
    
    // Test 1: Tealium library loaded
    console.assert(typeof utag !== 'undefined', 'Tealium library should be loaded');
    
    // Test 2: utag_data exists
    console.assert(typeof utag_data !== 'undefined', 'utag_data should exist');
    
    // Test 3: Required methods available
    console.assert(typeof utag.view === 'function', 'utag.view should be available');
    console.assert(typeof utag.link === 'function', 'utag.link should be available');
    
    // Test 4: Basic data integrity
    if (utag_data.product_id) {
      console.assert(Array.isArray(utag_data.product_id), 'product_id should be an array');
    }
    
    console.log('✅ Basic tests completed');
  },
  
  testEventFiring: function() {
    console.log('🧪 Testing event firing...');
    
    var testData = {
      event_name: 'test_event',
      test_timestamp: new Date().toISOString()
    };
    
    try {
      utag.link(testData);
      console.log('✅ Test event fired successfully');
    } catch (e) {
      console.error('❌ Test event failed:', e);
    }
  },
  
  runAllTests: function() {
    this.runBasicTests();
    this.testEventFiring();
    console.log('🏁 All tests completed');
  }
};
```

This comprehensive set of examples provides everything needed to set up a robust Tealium implementation that works perfectly with the sandbox toolkit for testing and troubleshooting.
