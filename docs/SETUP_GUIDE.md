# Tealium Sandbox Setup Guide

This comprehensive guide will help you set up the Tealium Sandbox Toolkit for testing and troubleshooting various Tealium implementations.

## 📋 Prerequisites

### Browser Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Local file access permissions (for file:// protocol)
- Developer tools access for advanced debugging

### Tealium Requirements
- Valid Tealium account credentials
- Access to desired profiles and environments
- Understanding of your tag configuration
- Basic knowledge of Tealium concepts (UDO, events, tags)

## 🚀 Initial Setup

### 1. File Setup
```bash
# Download or clone the sandbox files
# Ensure all files are in the same directory:
- index.html
- styles.css
- sandbox.js
- README.md
- SETUP_GUIDE.md (this file)
- TROUBLESHOOTING.md
```

### 2. Open the Sandbox
- Double-click `index.html`, or
- Right-click → "Open with" → Your preferred browser, or
- Drag `index.html` into your browser window

### 3. Initial Configuration
1. Enter your Tealium account ID
2. Enter your profile name
3. Select your environment (dev/qa/prod)
4. Click "Load Tealium"

## 🔧 Tealium Configuration

### Account Information
- **Account ID**: Your Tealium account identifier (e.g., "my-company")
- **Profile**: The specific profile within your account (e.g., "main", "mobile")
- **Environment**: The publishing environment (dev, qa, prod)

### Example URLs
The sandbox will construct URLs like:
```
//tags.tiqcdn.com/utag/my-company/main/dev/utag.js
//tags.tiqcdn.com/utag/my-company/main/qa/utag.js
//tags.tiqcdn.com/utag/my-company/main/prod/utag.js
```

## 📊 Recommended Tag Setup in TiQ

### Essential Tags for Testing

#### 1. Universal Tag Debugger
```javascript
// Add as a JavaScript Code extension
console.log('Tealium Debug - utag_data:', utag_data);
console.log('Tealium Debug - Event Data:', b);
console.table(b);
```

#### 2. Google Analytics 4 (if applicable)
- **Tag Template**: Google Analytics 4
- **Measurement ID**: Your GA4 property ID
- **Load Rules**: All Pages (for testing)
- **Data Mappings**: 
  - Map `utag_data` fields to GA4 parameters
  - Include page_title, page_type, custom events

#### 3. Facebook Pixel (if applicable)
- **Tag Template**: Facebook Pixel
- **Pixel ID**: Your Facebook Pixel ID
- **Events**: PageView, Purchase, AddToCart
- **Load Rules**: Appropriate pages/events

#### 4. Custom Container HTML Tag for Testing
```html
<!-- Add as Custom HTML tag -->
<script>
console.log('Custom Tag Fired:', utag_data);
// Add your custom testing logic here
</script>
```

## 🔧 Data Layer Variables vs Extensions

### Best Practice: Use Data Layer Variables First

**✅ USE DATA LAYER VARIABLES IN TiQ FOR:**
- Simple data values (page_type, customer_id, product_name)
- Static content mapping
- URL parameters
- Cookie values
- Basic calculations

**❌ AVOID EXTENSIONS FOR:**
- Simple data that can be mapped in TiQ interface
- Static values
- Basic field mapping

### Data Layer Variables Setup (Recommended)

Add these directly in TiQ as **Data Layer Variables** (no JavaScript needed):

```
Variable Name: page_type
Source: Data Layer
Variable: page_type
Default Value: unknown

Variable Name: customer_id  
Source: Data Layer
Variable: customer_id
Default Value: anonymous

Variable Name: product_category
Source: Data Layer
Variable: product_category
Default Value: (none)

Variable Name: order_total
Source: Data Layer
Variable: order_total
Default Value: 0
```

### When to Use Extensions

**✅ USE EXTENSIONS ONLY FOR:**
- Complex DOM manipulation
- Conditional banner display
- Advanced data processing that requires loops/logic
- API calls or external data fetching
- Error handling with custom logic
- Complex business rules

#### 1. Custom Banner Extension (Complex Logic)
```javascript
// JavaScript Code Extension - Product Pages - Before Load Rules
// Use ONLY when you need complex conditional logic

if (utag_data.page_type === 'product' && 
    utag_data.customer_type === 'new' && 
    !localStorage.getItem('banner_shown') &&
    parseFloat(utag_data.product_price) > 100) {
    
    // Create custom promotional banner
    const banner = document.createElement('div');
    banner.id = 'new-customer-banner';
    banner.innerHTML = '🎉 Welcome! First-time customers get 15% off!';
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; 
        background: #28a745; color: white; padding: 12px; 
        text-align: center; z-index: 10000;
        font-weight: bold;
    `;
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        float: right; background: none; border: none; 
        color: white; font-size: 18px; cursor: pointer;
        margin-left: 15px;
    `;
    closeBtn.onclick = () => {
        banner.remove();
        localStorage.setItem('banner_shown', 'true');
        
        // Track banner dismissal
        utag.link({
            event_name: 'banner_dismissed',
            banner_type: 'new_customer_promo'
        });
    };
    
    banner.appendChild(closeBtn);
    document.body.appendChild(banner);
    
    // Track banner display
    utag.link({
        event_name: 'banner_displayed',
        banner_type: 'new_customer_promo',
        product_category: utag_data.product_category
    });
    
    localStorage.setItem('banner_shown', 'true');
    console.log('New customer banner displayed');
}
```

#### 2. E-commerce Data Validation
```javascript
// JavaScript Code Extension - E-commerce Pages - Before Load Rules
// Validate e-commerce data structure

if (utag_data.product_id && Array.isArray(utag_data.product_id)) {
  utag_data.ecommerce_validation = {
    product_count: utag_data.product_id.length,
    has_prices: utag_data.product_price ? utag_data.product_price.length : 0,
    has_names: utag_data.product_name ? utag_data.product_name.length : 0,
    is_valid: utag_data.product_id.length === utag_data.product_price.length
  };
  
  console.log('E-commerce Validation:', utag_data.ecommerce_validation);
}
```

#### 3. Consent Management Extension
```javascript
// JavaScript Code Extension - All Pages - Before Load Rules
// Handle consent preferences

// Check for consent preferences
if (typeof utag.gdpr !== 'undefined') {
  // Tealium Consent Manager is loaded
  console.log('Consent Manager Available');
  
  // Set default consent if none exists
  if (!utag.gdpr.getConsent()) {
    utag.gdpr.setConsent({
      analytics: true,
      marketing: false,
      personalization: true,
      social: false
    });
    console.log('Default consent set');
  }
} else {
  // Manual consent handling
  utag_data.consent_status = {
    analytics: getCookie('consent_analytics') === 'true',
    marketing: getCookie('consent_marketing') === 'true',
    personalization: getCookie('consent_personalization') === 'true',
    social: getCookie('consent_social') === 'true'
  };
  
  console.log('Manual consent status:', utag_data.consent_status);
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}
```

## 📏 Load Rules Configuration

### Basic Load Rules (Use TiQ Interface)

Instead of complex JavaScript, use TiQ's built-in load rule conditions:

#### Recommended Load Rules

1. **All Pages**
   - Condition: `page_type` is not empty
   - TiQ Rule: `b["page_type"] != ""`

2. **Homepage Only**
   - Condition: `page_type` equals `homepage`
   - TiQ Rule: `b["page_type"] == "homepage"`

3. **Product Pages**
   - Condition: `page_type` equals `product` OR `product_id` exists
   - TiQ Rule: `b["page_type"] == "product" || b["product_id"]`

4. **Logged In Users**
   - Condition: `customer_id` exists OR `customer_type` equals `logged_in`
   - TiQ Rule: `b["customer_id"] || b["customer_type"] == "logged_in"`

5. **High Value Orders**
   - Condition: `order_total` greater than 100
   - TiQ Rule: `parseFloat(b["order_total"]) > 100`

6. **E-commerce Events**
   - Condition: `product_id` exists AND is not empty
   - TiQ Rule: `b["product_id"] && b["product_id"].length > 0`

### Testing Load Rules in Sandbox

Use the sandbox's **Load Rules Testing** section to:

1. **Test Predefined Rules**: Click buttons to test common scenarios
2. **Build Custom Rules**: Use the rule builder to test specific conditions
3. **View TiQ Syntax**: See the exact code to use in TiQ load rules
4. **Validate Data**: Check if current data meets rule conditions

### Advanced Load Rules (When Simple Rules Aren't Enough)

```javascript
// Multi-condition rule (use in TiQ Advanced Conditions)
function(data) {
  // Load for VIP customers on product pages
  return data.page_type === 'product' && 
         (data.customer_type === 'premium' || 
          parseFloat(data.customer_lifetime_value) > 1000);
}
```

```javascript
// Environment-specific rule
function(data) {
  // Only load on specific domains for testing
  return window.location.hostname.includes('sandbox') || 
         window.location.hostname.includes('test') ||
         data.environment === 'qa';
}
```

### Custom Environment Support

The sandbox supports custom environments with **case sensitivity**:

#### Standard Environments
- `dev` - Development environment
- `qa` - Quality Assurance environment  
- `prod` - Production environment

#### Custom Environments (Case Sensitive)
- `Prod` - Custom production (different from `prod`)
- `QA-Legacy` - Legacy QA environment
- `staging` - Staging environment
- `demo` - Demo environment
- `client-specific` - Client-specific environments

#### Setting Up Custom Environments

1. **In Sandbox**: Select "Custom Environment" and enter exact name
2. **In TiQ**: Create custom environment in Account Settings
3. **Case Sensitivity**: `Prod` ≠ `prod` ≠ `PROD`
4. **Naming**: Use descriptive names like `client-demo`, `staging-v2`

#### Testing Custom Environments

```javascript
// Test environment detection
console.log('Current environment:', utag.cfg.env);

// Environment-specific logic
if (utag.cfg.env === 'Prod') {
  // Capital P Prod environment
} else if (utag.cfg.env === 'prod') {
  // Lowercase prod environment  
}
```

## 🎯 Testing Scenarios Setup

### 1. E-commerce Implementation
Configure these data layer fields in your profile:
- `product_id` (array)
- `product_name` (array)
- `product_category` (array)
- `product_price` (array)
- `product_quantity` (array)
- `order_id`
- `order_total`
- `customer_id`

### 2. Content Site Implementation
Configure these data layer fields:
- `page_type`
- `page_name`
- `site_section`
- `content_category`
- `author`
- `publish_date`
- `article_id`

### 3. Lead Generation Implementation
Configure these data layer fields:
- `form_name`
- `form_type`
- `lead_source`
- `campaign_id`
- `user_type`

## 🔍 Debug Configuration

### Enable Trace Mode
Add this JavaScript extension to enable detailed tracing:
```javascript
// Enable trace mode for debugging
if (typeof utag !== 'undefined') {
  utag.trace = true;
  console.log('Tealium trace mode enabled');
}
```

### Tag Performance Monitoring
```javascript
// Monitor tag loading performance
if (typeof utag !== 'undefined') {
  const originalSender = utag.sender;
  utag.sender = {};
  
  Object.keys(originalSender).forEach(tagId => {
    utag.sender[tagId] = function(data) {
      const startTime = performance.now();
      
      const result = originalSender[tagId].call(this, data);
      
      const endTime = performance.now();
      console.log(`Tag ${tagId} execution time: ${endTime - startTime}ms`);
      
      return result;
    };
  });
}
```

### Event Data Logger
```javascript
// Log all event data for debugging
// Add as extension on specific events or pages

console.group('Tealium Event Debug');
console.log('Trigger Type:', typeof b !== 'undefined' ? 'Link Event' : 'View Event');
console.log('utag_data:', utag_data);
if (typeof b !== 'undefined') {
  console.log('Event Data:', b);
}
console.log('Page URL:', window.location.href);
console.log('Timestamp:', new Date().toISOString());
console.groupEnd();
```

## 🔐 Consent Setup

### Tealium Consent Manager
If using Tealium's Consent Manager:
1. Enable in your profile
2. Configure consent categories
3. Set up appropriate load rules
4. Test with the sandbox consent controls

### Custom Consent Implementation
```javascript
// Custom consent implementation example
function updateConsent(consentObj) {
  // Save to cookie/localStorage
  document.cookie = `tealium_consent=${JSON.stringify(consentObj)};path=/;max-age=31536000`;
  
  // Update data layer
  utag_data.consent_analytics = consentObj.analytics;
  utag_data.consent_marketing = consentObj.marketing;
  utag_data.consent_personalization = consentObj.personalization;
  
  // Trigger event
  if (typeof utag !== 'undefined' && utag.link) {
    utag.link({
      event_name: 'consent_update',
      consent_categories: Object.keys(consentObj).filter(k => consentObj[k])
    });
  }
}
```

## 🏷️ Tag-Specific Setup

### Google Analytics 4
```javascript
// GA4 Enhanced Ecommerce Setup
// Map Tealium data to GA4 format

if (utag_data.product_id && utag_data.product_id.length > 0) {
  // Create GA4 items array
  const items = utag_data.product_id.map((id, index) => ({
    item_id: id,
    item_name: utag_data.product_name[index],
    item_category: utag_data.product_category[index],
    price: utag_data.product_price[index],
    quantity: utag_data.product_quantity[index] || 1
  }));
  
  utag_data.ga4_items = items;
}
```

### Facebook Pixel
```javascript
// Facebook Pixel Enhanced Data
if (utag_data.page_type === 'product') {
  utag_data.fb_content_type = 'product';
  utag_data.fb_content_ids = utag_data.product_id;
  utag_data.fb_content_name = utag_data.product_name[0];
  utag_data.fb_content_category = utag_data.product_category[0];
  utag_data.fb_value = utag_data.product_price[0];
  utag_data.fb_currency = utag_data.product_currency || 'USD';
}
```

## 📱 Mobile Testing Setup

### Responsive Testing
1. Use browser dev tools to simulate mobile devices
2. Test touch events vs click events
3. Verify mobile-specific data layer fields
4. Test app webview scenarios

### Mobile-Specific Extensions
```javascript
// Mobile detection and data enhancement
utag_data.device_info = {
  is_mobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  screen_width: screen.width,
  screen_height: screen.height,
  orientation: screen.orientation ? screen.orientation.angle : 'unknown',
  touch_enabled: 'ontouchstart' in window
};
```

## 🚀 Advanced Setup

### Local Development Server
For enhanced testing with proper HTTP context:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (with serve package)
npx serve .

# Then access: http://localhost:8000
```

### Domain Simulation
Edit your hosts file to simulate different domains:
```
127.0.0.1 test.example.com
127.0.0.1 staging.example.com
```

### HTTPS Setup (for secure cookie testing)
Use tools like `mkcert` for local HTTPS:
```bash
mkcert -install
mkcert localhost 127.0.0.1 ::1
# Then serve with HTTPS using the generated certificates
```

## ✅ Verification Checklist

Before starting your testing:
- [ ] Tealium library loads successfully
- [ ] Account/profile/environment are correct
- [ ] Data layer populates with expected fields
- [ ] Debug extensions are active
- [ ] Console shows Tealium events
- [ ] Tag firing can be verified
- [ ] Consent system responds appropriately
- [ ] Error handling works as expected

## 🔄 Maintenance

### Regular Updates
- Update account/profile configurations as needed
- Refresh tag templates for new features
- Update data scenarios for current business needs
- Review and update load rules
- Test with latest Tealium library versions

### Performance Monitoring
- Monitor tag load times
- Check for JavaScript errors
- Verify data layer completeness
- Test across different browsers/devices
- Monitor consent compliance

---

This setup guide provides a comprehensive foundation for testing Tealium implementations. Adjust configurations based on your specific use cases and requirements.
