# 🚀 Tealium Sandbox - Quick Start Guide

Get up and running with the Tealium Sandbox Toolkit in under 5 minutes!

## ⚡ Immediate Setup (2 minutes)

### Step 1: Open the Sandbox
1. Download all files to a folder on your computer
2. Double-click `index.html` to open in your browser
3. You should see the Tealium Sandbox interface

### Step 2: Configure Your Tealium Account
1. Enter your **Account ID** (e.g., "my-company")
2. Enter your **Profile** name (e.g., "main", "demo") 
3. Select your **Environment** (dev/qa/prod)
4. Click **"Load Tealium"**

### Step 3: Verify It's Working
- Look for "Tealium Status: Loaded & Ready" 
- Check the browser console for debug messages
- Click "Check Status" to see detailed information

**🎉 You're ready to test!**

## 📊 Sandbox Sections Overview

### 🔧 1. Configuration
**Purpose**: Load and configure your Tealium profile

**Quick Actions**:
- Load Tealium with your account/profile/environment
- Save multiple profile configurations
- Switch between different environments instantly
- Monitor connection status in real-time

**Best Practice**: Always start in **dev** or **qa** environment for testing

---

### 🔍 2. Profile Inspector (NEW!)
**Purpose**: Comprehensive analysis of your loaded Tealium profile

**What It Shows**:
- **Profile Overview**: Account, profile, environment, version information
- **Tags Analysis**: All tags with status (OK, Not Loaded, Condition False, etc.)
  - Filter by UID, status, or version
  - See load rules for each tag
  - View tag versions and template IDs
  - Open tag files (`utag.XX.js`) directly
- **Extensions Analysis**: All extensions with execution order
  - Filter by ID, scope, or code content
  - View extension code with syntax highlighting
  - Search within extension code
  - See execution status (OK, Error, Not Run)
- **Load Rules Analysis**: All load rules with TRUE/FALSE status
  - Filter by ID, status, or condition
  - See which tags use each load rule
  - View detailed load rule conditions
  - Understand why rules pass or fail
- **utag.cfg Settings**: Current Tealium configuration
  - Session timeout, cookie settings
  - Debug mode, noview, nocache status
  - Domain overrides and custom settings
- **Tealium Cookies**: All Tealium-related cookies
  - `utag_main` cookies (visitor ID, session tracking)
  - Consent cookies (CONSENTMGR, OPTOUTMULTI)
  - Web Companion cookies

**When to Use**:
- ✅ Debugging why tags aren't firing
- ✅ Understanding load rule evaluation
- ✅ Checking extension execution order
- ✅ Validating profile configuration
- ✅ Inspecting cookie behavior

**Pro Tip**: Use the filter and sort features to quickly find specific tags, extensions, or load rules!

---

### 📋 3. Data Layer
**Purpose**: Manage and test your Universal Data Object (utag_data)

**Features**:
- **Current Data Viewer**: See live utag_data in real-time
- **Preset Scenarios**: One-click test data
  - 🏠 Homepage
  - 🛍️ E-commerce Product
  - 🛒 Shopping Cart
  - ✅ Purchase Complete
  - 📝 User Registration
  - 👤 Logged In User
- **Custom JSON Editor**: Add your own test data
- **Export/Import**: Save and share data scenarios

**Best Practice Data Layer Variables to Set Up**:
```javascript
// Essential for all implementations
{
  "page_type": "homepage",           // Required: homepage, product, category, cart, etc.
  "page_name": "Home",               // Required: Human-readable page name
  "site_section": "main",            // Recommended: Site hierarchy
  
  // User data
  "customer_id": "user123",          // For logged-in users
  "customer_type": "registered",     // new, registered, premium, guest
  "customer_email": "user@example.com",
  
  // E-commerce (arrays for multiple products)
  "product_id": ["SKU123", "SKU456"],
  "product_name": ["Product 1", "Product 2"],
  "product_category": ["Electronics", "Accessories"],
  "product_price": [99.99, 29.99],
  "product_quantity": [1, 2],
  "product_currency": "USD",
  
  // Order data
  "order_id": "ORDER-12345",
  "order_total": 159.97,
  "order_tax": 12.80,
  "order_shipping": 5.99,
  
  // Custom dimensions
  "custom_dimension_1": "value1",
  "custom_dimension_2": "value2"
}
```

---

### ⚡ 4. Events
**Purpose**: Trigger and test Tealium events

**Event Types**:
- **Page View Events** (`utag.view`): Page load tracking
- **Link Events** (`utag.link`): User interactions
  - 🛒 Add to Cart
  - ❤️ Add to Wishlist  
  - 🔍 Product View
  - 📧 Newsletter Signup
  - 📱 Social Share
  - And more...
- **Custom Events**: Build your own event data

**Quick Test**:
1. Load your Tealium profile
2. Apply a data scenario (e.g., "E-commerce Product")
3. Click "Trigger utag.view()" to send a page view
4. Check the browser console and Network tab for tag fires

---

### 📚 5. Help
**Purpose**: Built-in documentation and troubleshooting

**Includes**:
- Quick reference guides
- Common troubleshooting steps
- Best practices
- Code examples

---

## 🎯 Essential TiQ Profile Setup

### Recommended Extensions for Your Profile

#### 1. Universal Debug Extension (Critical for Sandbox Testing)
Add this to your TiQ profile to enhance sandbox debugging:

**Extension Type**: JavaScript Code  
**Scope**: All Tags, Before Load Rules

```javascript
// Universal Debug Extension for Sandbox
(function() {
  'use strict';
  
  // Only run in sandbox/test environments
  if (window.location.hostname.includes('localhost') || 
      window.location.search.includes('debug=true') ||
      utag_data.environment === 'sandbox') {
    
    console.group('🔧 Tealium Debug');
    console.log('📄 Page:', {
      type: utag_data.page_type,
      name: utag_data.page_name,
      url: window.location.href
    });
    console.log('📊 UDO:', utag_data);
    
    // Validate required fields
    const required = ['page_type', 'page_name'];
    const missing = required.filter(field => !utag_data[field]);
    if (missing.length > 0) {
      console.warn('⚠️ Missing required:', missing);
    }
    
    console.groupEnd();
  }
})();
```

#### 2. Data Layer Enhancement Extension (Recommended)
**Extension Type**: JavaScript Code  
**Scope**: All Tags, Before Load Rules

```javascript
// Data Layer Enhancement
(function() {
  'use strict';
  
  // Add timestamp
  if (!utag_data.timestamp) {
    utag_data.timestamp = new Date().toISOString();
  }
  
  // Normalize product arrays
  const arrayFields = ['product_id', 'product_name', 'product_price', 'product_quantity'];
  arrayFields.forEach(field => {
    if (utag_data[field] && !Array.isArray(utag_data[field])) {
      utag_data[field] = [utag_data[field]];
    }
  });
  
  // Add device detection
  if (!utag_data.device_type) {
    const ua = navigator.userAgent;
    utag_data.device_type = /mobile|iphone|android/i.test(ua) ? 'mobile' : 'desktop';
  }
})();
```

#### 3. E-commerce Validator Extension (For E-commerce Sites)
**Extension Type**: JavaScript Code  
**Scope**: Before Load Rules  
**Load Rule**: `utag_data.product_id` exists

```javascript
// E-commerce Data Validator
(function() {
  const fields = ['product_id', 'product_name', 'product_price'];
  const validation = { errors: [], warnings: [] };
  
  fields.forEach(field => {
    if (!utag_data[field]) {
      validation.errors.push(`Missing ${field}`);
    } else if (!Array.isArray(utag_data[field])) {
      validation.warnings.push(`${field} should be array`);
    }
  });
  
  if (validation.errors.length > 0) {
    console.error('❌ E-commerce Errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('⚠️ E-commerce Warnings:', validation.warnings);
  }
  
  utag_data.ecommerce_validation = validation;
})();
```

---

## 🧪 First Tests (3 minutes)

### Test 1: Basic Page View
1. Navigate to **Events** section
2. Click **"Trigger utag.view()"**
3. Check the browser console for the logged event
4. Look in Network tab for outgoing tag requests

### Test 2: Profile Inspector Analysis
1. Navigate to **Profile Inspector** section
2. Click **"Analyze Profile"**
3. Review all tags and their status
4. Check load rules to see which are TRUE/FALSE
5. Inspect extensions execution order
6. Review utag.cfg settings

### Test 3: Apply a Data Scenario
1. Navigate to **Data Layer** section
2. Click **"🛒 E-commerce Product"** button
3. See how the data layer updates
4. Go to **Events** and click **"Trigger utag.view()"**
5. Check **Profile Inspector** to see which tags fired

### Test 4: Debug Load Rules
1. In **Profile Inspector**, find a tag that shows "Condition False"
2. Click the **"Details"** button next to the associated load rule
3. See exactly which conditions failed
4. Modify your data layer to match the rule requirements
5. Trigger the event again and verify the tag fires

**✅ If you see events in console, tags in Profile Inspector, and network requests, everything is working!**

---

## 🔍 Quick Troubleshooting

### Tealium Won't Load?
- **Check account/profile spelling** - must be exact (case-sensitive)
- **Try different environment** - dev vs qa vs prod
- **Check browser console** for error messages
- **Disable ad blockers** temporarily
- **Verify profile exists** in TiQ

### Profile Inspector Shows No Data?
- Ensure Tealium is loaded first (Configuration section)
- Click "Analyze Profile" button to refresh
- Check that `window.utag` exists in browser console

### Tags Show "Condition False"?
- Click load rule "Details" to see exact conditions
- Check your data layer has required variables
- Verify variable names match exactly (case-sensitive)
- Use data layer presets to test with known-good data

### No Events Showing?
- Enable **"Enable Console Debugging"** in Configuration
- Check browser **Developer Tools > Console**
- Verify Tealium loaded successfully
- Check for JavaScript errors blocking execution

### Common Issues
- **Mixed content errors**: Use HTTPS or local server
- **CORS errors**: Try a different browser or run local server
- **Ad blockers**: May block Tealium scripts
- **Firewall**: Corporate firewalls may block CDN

---

## 🎯 Common Testing Workflows

### Workflow 1: New Tag Implementation
```
1. Load your dev environment (Configuration)
2. Analyze profile (Profile Inspector)
3. Verify tag appears in tags list
4. Check load rule conditions
5. Apply appropriate data scenario (Data Layer)
6. Trigger test event (Events)
7. Verify tag status changes to "OK"
8. Check network requests
```

### Workflow 2: Debugging Load Rules
```
1. Load profile and analyze (Profile Inspector)
2. Find tag with "Condition False"
3. Click load rule "Details" button
4. Review exact conditions required
5. Modify data layer to match (Data Layer)
6. Trigger event (Events)
7. Verify tag fires in Profile Inspector
```

### Workflow 3: Extension Debugging
```
1. Analyze profile (Profile Inspector)
2. Navigate to Extensions tab
3. Click "View Code" on extension
4. Search for specific functions or variables
5. Check execution status (OK/Error/Not Run)
6. Review execution order
7. Modify extension in TiQ if needed
8. Reload profile and re-test
```

### Workflow 4: Data Layer Validation
```
1. Apply your data scenario (Data Layer)
2. Analyze profile (Profile Inspector)
3. Check which tags loaded
4. Review extension data enhancements
5. Export data layer for documentation
6. Share with team or use in QA
```

---

## 📁 File Overview

- **`index.html`** - Main interface (open this file)
- **`js/sandbox.js`** - Core functionality
- **`js/profile-inspector.js`** - Profile analysis engine
- **`js/data-layer.js`** - Data layer management
- **`js/events.js`** - Event handling
- **`css/styles.css`** - Modern UI styling
- **`sections/`** - Modular section HTML files
- **`docs/`** - Complete documentation
  - `README.md` - Complete documentation
  - `QUICK_START.md` - This file
  - `SETUP_GUIDE.md` - Detailed setup instructions  
  - `TROUBLESHOOTING.md` - Common issues and solutions
  - `TEALIUM_EXAMPLES.md` - TiQ configuration examples

---

## 🔧 Browser Setup Tips

### Recommended Browser Settings
1. **Enable Developer Tools** (F12 or Cmd+Opt+I)
2. **Disable ad blockers** for testing domain
3. **Allow mixed content** if testing HTTPS sites
4. **Enable third-party cookies** for full tag testing
5. **Clear cache** between major test changes

### Useful Browser Extensions
- **Tealium Tools** - Official Tealium debugging extension
- **EditThisCookie** - Cookie management for consent testing
- **JSON Formatter** - Better JSON viewing in network tab

---

## 🌐 Next Steps

### For Basic Testing
- Read **`README.md`** for complete feature details
- Try all preset data scenarios
- Test with your actual tag configuration
- Practice using Profile Inspector filters

### For Advanced Setup  
- Review **`SETUP_GUIDE.md`** for TiQ configuration
- Check **`TEALIUM_EXAMPLES.md`** for extension examples
- Set up local HTTPS for secure testing
- Configure your own custom data scenarios

### For Troubleshooting
- Keep **`TROUBLESHOOTING.md`** handy
- Learn browser debugging techniques
- Practice with different browsers
- Test mobile responsive scenarios

---

## 💡 Pro Tips

1. **Save Your Profiles**: Use the "Save Profile" feature to quickly switch between environments
2. **Use Filters**: In Profile Inspector, use filters to quickly find specific tags or load rules
3. **Export Data**: Save your data layer scenarios for reuse
4. **Debug Mode**: Always enable debug logging in Configuration for detailed insights
5. **Network Tab**: Keep browser Network tab open to see actual tag requests
6. **Console Groups**: Extension logs are organized in console groups for easy navigation
7. **Search Extensions**: Use "Code" filter in Extensions to search for specific functions
8. **Load Rule Details**: Click "Details" on any load rule to see exactly why it passed/failed

---

**🎉 Happy Testing!** You now have a comprehensive toolkit for Tealium testing, debugging, and validation.

Need more details? Check the other documentation files for in-depth guides and examples.