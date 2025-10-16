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
- css/styles.css
- js/sandbox.js
- js/profile-inspector.js
- js/data-layer.js
- js/events.js
- js/sections-config.js
- sections/profile-inspector.html
- sections/data-layer.html
- sections/events.html
- sections/help.html
- docs/README.md
- docs/SETUP_GUIDE.md (this file)
- docs/TROUBLESHOOTING.md
- docs/TEALIUM_EXAMPLES.md
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

---

## 🔧 Sandbox Sections In-Depth

### 📌 Section 1: Configuration
**Location**: Top navigation bar  
**Purpose**: Load and manage Tealium profiles

#### Features:
- **Account/Profile/Environment Selector**
  - Account ID: Your Tealium account identifier
  - Profile: Specific profile within account
  - Environment: dev, qa, prod, or custom

- **Profile Management**
  - Save multiple profile configurations
  - Quick-switch between saved profiles
  - Delete unused profiles

- **Status Monitoring**
  - Real-time load status
  - Connection health check
  - Version information

#### Best Practices:
```javascript
// Recommended Setup:
// DEV Profile: For active development and testing
Account: your-company
Profile: main
Environment: dev

// QA Profile: For quality assurance testing
Account: your-company  
Profile: main
Environment: qa

// PROD Profile: For production verification (view only!)
Account: your-company
Profile: main
Environment: prod
```

---

### 🔍 Section 2: Profile Inspector
**Purpose**: Comprehensive Tealium profile analysis and debugging

#### 2.1 Profile Overview
**What It Shows**:
- Account, Profile, Environment identifiers
- Tealium library version
- Publishing path
- Domain configuration
- Load time metrics

**Use Cases**:
- Verify correct profile is loaded
- Check Tealium version for compatibility
- Confirm environment-specific settings

#### 2.2 Tags Analysis
**Features**:
- **Status Indicators**:
  - ✅ **OK**: Tag loaded and sent successfully
  - ⏸️ **Not Loaded**: Tag prevented from loading
  - 🚫 **Not Sent**: Tag loaded but didn't send
  - ❌ **Condition False**: Load rule evaluated to false
  - ❓ **Not Reported**: Tag hasn't reported status yet
  
- **Tag Information**:
  - UID (Unique Identifier)
  - Tag name and version
  - Template ID
  - Consent category
  - Bundled vs External loading
  
- **Load Rules**:
  - See which load rules control each tag
  - Visual indicators for rule status (TRUE/FALSE)
  - Click to view detailed load rule logic

- **Filtering & Sorting**:
  - Filter by: UID, Status, Version
  - Sort by: UID, Status, Version
  - Ascending/Descending toggle

**Recommended TiQ Setup for Tags**:
```javascript
// Essential tags to configure:

// 1. Debug Tag (Custom HTML)
<script>
console.log('🏷️ Debug Tag Fired:', utag_data);
console.table(b); // Event data
</script>

// 2. Google Analytics 4
// - Map utag_data variables to GA4 parameters
// - Set up e-commerce tracking
// - Configure custom dimensions

// 3. Facebook Pixel  
// - Configure standard events
// - Map product data for e-commerce
// - Set up custom conversions

// 4. Your vendor tags
// - Follow vendor documentation
// - Test in dev environment first
```

#### 2.3 Extensions Analysis
**Features**:
- **Extension Information**:
  - Extension ID and name
  - Execution scope:
    - Before Load Rules
    - After Load Rules
    - DOM Ready
    - After Tags
  - Execution order
  - Status (OK, Error, Not Run)

- **Code Inspection**:
  - View full extension code
  - Syntax highlighting
  - Search within code
  - Code beautification

- **Filtering**:
  - By ID
  - By scope
  - By code content (search in code)

**Practical Extensions for Testing**:

#### Extension 1: Promotional Banner (Conditional Display)
**Use Case**: Display promotional banner to specific users based on data layer conditions  
**Scope**: All Tags, Before Load Rules  
**When to Use**: Testing personalization, A/B testing, promotional campaigns

```javascript
// EXTENSION 1: Promotional Banner for New Customers
// Scope: All Tags, Before Load Rules
// Load Rule: page_type == "product" AND customer_type == "new"

(function() {
  'use strict';
  
  // Only show on product pages for new customers with high-value products
  if (utag_data.page_type === 'product' && 
      utag_data.customer_type === 'new' &&
      parseFloat(utag_data.product_price[0]) > 100 &&
      !sessionStorage.getItem('promo_banner_shown')) {
    
    // Create promotional banner
    const banner = document.createElement('div');
    banner.id = 'tealium-promo-banner';
    banner.innerHTML = `
      <div style="background: linear-gradient(90deg, #4CAF50, #45a049); 
                  color: white; padding: 15px; text-align: center; 
                  position: fixed; top: 0; left: 0; right: 0; z-index: 10000;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
        <strong>🎉 Welcome!</strong> First-time customers get <strong>15% OFF</strong> on orders over $100!
        <button onclick="this.parentElement.parentElement.remove(); sessionStorage.setItem('promo_banner_shown', 'true');" 
                style="background: white; color: #4CAF50; border: none; 
                       padding: 5px 15px; margin-left: 15px; border-radius: 3px; 
                       cursor: pointer; font-weight: bold;">
          Got it!
        </button>
      </div>
    `;
    
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Track banner display event
    utag.link({
      event_name: 'promo_banner_displayed',
      banner_type: 'new_customer_discount',
      banner_product_category: utag_data.product_category ? utag_data.product_category[0] : '',
      banner_product_price: utag_data.product_price ? utag_data.product_price[0] : 0
    });
    
    // Mark as shown to avoid repeated displays
    sessionStorage.setItem('promo_banner_shown', 'true');
    
    console.log('✅ Promotional banner displayed for new customer');
  }
})();
```

**Why This Extension?**
- Tests conditional logic based on customer type and product value
- Demonstrates DOM manipulation in Tealium
- Tracks banner interactions with `utag.link`
- Uses sessionStorage to control frequency
- Practical for real-world promotional campaigns

---

#### Extension 2: Exit Intent Popup (Cart Abandonment)
**Use Case**: Capture abandoning users with special offers  
**Scope**: All Tags, DOM Ready  
**When to Use**: Testing cart abandonment campaigns, lead capture

```javascript
// EXTENSION 2: Exit Intent Popup for Cart Pages
// Scope: All Tags, DOM Ready
// Load Rule: page_type == "cart" AND order_total > 50

(function() {
  'use strict';
  
  // Only run on cart pages with items
  if (utag_data.page_type !== 'cart' || 
      !utag_data.order_total || 
      parseFloat(utag_data.order_total) === 0) {
    return;
  }
  
  let exitIntentShown = sessionStorage.getItem('exit_intent_shown');
  
  // Detect exit intent (mouse leaving viewport)
  document.addEventListener('mouseleave', function(e) {
    if (e.clientY < 0 && !exitIntentShown) {
      showExitPopup();
    }
  });
  
  function showExitPopup() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'tealium-exit-modal';
    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                  background: rgba(0,0,0,0.7); z-index: 99999; 
                  display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 30px; border-radius: 10px; 
                    max-width: 500px; text-align: center; position: relative;">
          <button onclick="this.closest('#tealium-exit-modal').remove();" 
                  style="position: absolute; top: 10px; right: 10px; 
                         background: none; border: none; font-size: 24px; 
                         cursor: pointer; color: #999;">×</button>
          <h2 style="color: #333; margin-bottom: 15px;">Wait! Don't Leave Yet! 🎁</h2>
          <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
            Complete your order now and get <strong style="color: #f44336;">FREE SHIPPING</strong>!
          </p>
          <p style="color: #999; font-size: 14px; margin-bottom: 20px;">
            Your cart: $${utag_data.order_total}
          </p>
          <button onclick="window.location.href='/checkout'; this.closest('#tealium-exit-modal').remove();" 
                  style="background: #4CAF50; color: white; border: none; 
                         padding: 12px 30px; font-size: 16px; border-radius: 5px; 
                         cursor: pointer; font-weight: bold;">
            Complete My Order
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Track exit intent popup display
    utag.link({
      event_name: 'exit_intent_shown',
      cart_value: utag_data.order_total,
      product_count: utag_data.product_id ? utag_data.product_id.length : 0,
      popup_type: 'free_shipping_offer'
    });
    
    sessionStorage.setItem('exit_intent_shown', 'true');
    console.log('✅ Exit intent popup displayed');
  }
})();
```

**Why This Extension?**
- Real-world cart abandonment prevention
- Event-driven (mouseleave detection)
- Tracks popup effectiveness
- Uses sessionStorage for user experience
- Tests conditional offers based on cart value

---

#### Extension 3: Product Recommendation Tracker
**Use Case**: Track which product recommendations users interact with  
**Scope**: All Tags, DOM Ready  
**When to Use**: Testing recommendation engines, personalization

```javascript
// EXTENSION 3: Product Recommendation Click Tracker
// Scope: All Tags, DOM Ready
// Load Rule: page_type == "product"

(function() {
  'use strict';
  
  // Only run on product pages
  if (utag_data.page_type !== 'product') return;
  
  // Wait for DOM to be fully ready
  setTimeout(function() {
    // Find all product recommendation links (customize selectors)
    const recommendationLinks = document.querySelectorAll(
      '.recommendations a, ' +
      '.product-recommendations a, ' +
      '[data-recommendation] a, ' +
      '.similar-products a'
    );
    
    if (recommendationLinks.length === 0) {
      console.log('ℹ️ No product recommendation links found');
      return;
    }
    
    console.log(`✅ Tracking ${recommendationLinks.length} recommendation links`);
    
    // Add click tracking to each recommendation
    recommendationLinks.forEach(function(link, index) {
      link.addEventListener('click', function(e) {
        // Extract product info from link (customize based on your HTML)
        const productName = this.textContent.trim() || 'Unknown Product';
        const productUrl = this.href;
        const position = index + 1;
        
        // Track recommendation click
        utag.link({
          event_name: 'product_recommendation_click',
          recommendation_source_product: utag_data.product_id ? utag_data.product_id[0] : '',
          recommendation_clicked_product: productName,
          recommendation_position: position,
          recommendation_url: productUrl,
          page_type: utag_data.page_type
        });
        
        console.log('🔗 Recommendation clicked:', {
          product: productName,
          position: position
        });
      });
    });
  }, 1000); // Wait 1 second for recommendations to load
})();
```

**Why This Extension?**
- Tracks user engagement with recommendations
- Real-world e-commerce use case
- Demonstrates DOM querying and event listeners
- Captures position/placement data for optimization
- Useful for testing recommendation algorithms

---

#### Extension 4: Form Abandonment Tracker
**Use Case**: Track when users start but don't complete forms  
**Scope**: All Tags, DOM Ready  
**When to Use**: Testing lead generation, checkout optimization

```javascript
// EXTENSION 4: Form Abandonment Tracker
// Scope: All Tags, DOM Ready
// Load Rule: page_type == "contact" OR page_type == "checkout"

(function() {
  'use strict';
  
  // Find all forms on the page
  const forms = document.querySelectorAll('form');
  
  if (forms.length === 0) return;
  
  forms.forEach(function(form) {
    let formStarted = false;
    let formInteractions = {};
    const formName = form.name || form.id || 'unnamed_form';
    
    // Track when user starts filling the form
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(function(input) {
      input.addEventListener('focus', function() {
        if (!formStarted) {
          formStarted = true;
          
          // Track form start
          utag.link({
            event_name: 'form_started',
            form_name: formName,
            form_type: utag_data.form_type || 'unknown',
            page_type: utag_data.page_type
          });
          
          console.log('📝 Form started:', formName);
        }
        
        // Track field interactions
        const fieldName = this.name || this.id || 'unnamed_field';
        if (!formInteractions[fieldName]) {
          formInteractions[fieldName] = true;
          
          utag.link({
            event_name: 'form_field_interacted',
            form_name: formName,
            field_name: fieldName,
            field_type: this.type
          });
        }
      });
    });
    
    // Track form submission (success)
    form.addEventListener('submit', function(e) {
      utag.link({
        event_name: 'form_submitted',
        form_name: formName,
        form_type: utag_data.form_type || 'unknown',
        fields_interacted: Object.keys(formInteractions).length,
        page_type: utag_data.page_type
      });
      
      console.log('✅ Form submitted:', formName);
    });
    
    // Track form abandonment (page unload without submission)
    window.addEventListener('beforeunload', function() {
      if (formStarted && Object.keys(formInteractions).length > 0) {
        // User started form but didn't submit
        utag.link({
          event_name: 'form_abandoned',
          form_name: formName,
          form_type: utag_data.form_type || 'unknown',
          fields_interacted: Object.keys(formInteractions).length,
          page_type: utag_data.page_type
        });
        
        console.log('⚠️ Form abandoned:', formName);
      }
    });
  });
})();
```

**Why This Extension?**
- Tracks complete form funnel (start → interact → submit/abandon)
- Critical for conversion rate optimization
- Identifies problematic form fields
- Real-world lead generation use case
- Tests multi-step tracking logic

---

#### Extension 5: Scroll Depth Tracker
**Use Case**: Measure content engagement by scroll depth  
**Scope**: All Tags, DOM Ready  
**When to Use**: Testing content engagement, page optimization

```javascript
// EXTENSION 5: Scroll Depth Tracker
// Scope: All Tags, DOM Ready
// Load Rule: page_type == "article" OR page_type == "blog"

(function() {
  'use strict';
  
  // Only track on content pages
  if (!utag_data.page_type || 
      (utag_data.page_type !== 'article' && 
       utag_data.page_type !== 'blog' &&
       utag_data.page_type !== 'product')) {
    return;
  }
  
  const milestones = [25, 50, 75, 90, 100];
  const reachedMilestones = new Set();
  let maxScroll = 0;
  
  function checkScrollDepth() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);
    
    // Update max scroll
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
    }
    
    // Check milestones
    milestones.forEach(function(milestone) {
      if (scrollPercent >= milestone && !reachedMilestones.has(milestone)) {
        reachedMilestones.add(milestone);
        
        // Track scroll milestone
        utag.link({
          event_name: 'scroll_depth',
          scroll_depth_percentage: milestone,
          scroll_depth_pixels: scrollTop,
          page_type: utag_data.page_type,
          page_name: utag_data.page_name,
          article_category: utag_data.content_category || ''
        });
        
        console.log(`📊 Scroll milestone reached: ${milestone}%`);
      }
    });
  }
  
  // Throttle scroll events
  let scrollTimeout;
  window.addEventListener('scroll', function() {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(checkScrollDepth, 100);
  });
  
  // Track max scroll on page exit
  window.addEventListener('beforeunload', function() {
    utag.link({
      event_name: 'page_exit_scroll',
      max_scroll_depth: maxScroll,
      page_type: utag_data.page_type,
      page_name: utag_data.page_name
    });
  });
})();
```

**Why This Extension?**
- Measures content engagement beyond pageviews
- Industry-standard metric (scroll depth)
- Throttled for performance
- Captures max scroll on exit
- Useful for content optimization

---

#### Extension 6: Video Player Tracking
**Use Case**: Track video play, pause, and completion events  
**Scope**: All Tags, DOM Ready  
**When to Use**: Testing video engagement, content strategy

```javascript
// EXTENSION 6: Video Player Tracking
// Scope: All Tags, DOM Ready
// Load Rule: Videos exist on page

(function() {
  'use strict';
  
  // Find all HTML5 video players
  setTimeout(function() {
    const videos = document.querySelectorAll('video');
    
    if (videos.length === 0) {
      console.log('ℹ️ No videos found on page');
      return;
    }
    
    console.log(`✅ Tracking ${videos.length} videos`);
    
    videos.forEach(function(video, index) {
      const videoTitle = video.getAttribute('data-title') || 
                        video.title || 
                        `Video ${index + 1}`;
      
      let playTracked = false;
      let milestones = { 25: false, 50: false, 75: false, 95: false };
      
      // Play event
      video.addEventListener('play', function() {
        if (!playTracked) {
          utag.link({
            event_name: 'video_start',
            video_title: videoTitle,
            video_duration: Math.round(this.duration),
            video_current_time: Math.round(this.currentTime),
            page_type: utag_data.page_type
          });
          playTracked = true;
          console.log('▶️ Video started:', videoTitle);
        }
      });
      
      // Pause event
      video.addEventListener('pause', function() {
        if (this.currentTime < this.duration - 1) { // Not at end
          utag.link({
            event_name: 'video_pause',
            video_title: videoTitle,
            video_duration: Math.round(this.duration),
            video_current_time: Math.round(this.currentTime),
            video_percent_watched: Math.round((this.currentTime / this.duration) * 100)
          });
          console.log('⏸️ Video paused:', videoTitle);
        }
      });
      
      // Progress tracking
      video.addEventListener('timeupdate', function() {
        const percent = (this.currentTime / this.duration) * 100;
        
        Object.keys(milestones).forEach(function(milestone) {
          if (percent >= milestone && !milestones[milestone]) {
            milestones[milestone] = true;
            
            utag.link({
              event_name: 'video_progress',
              video_title: videoTitle,
              video_duration: Math.round(video.duration),
              video_percent_watched: milestone,
              page_type: utag_data.page_type
            });
            
            console.log(`📊 Video ${milestone}% watched:`, videoTitle);
          }
        });
      });
      
      // Completion event
      video.addEventListener('ended', function() {
        utag.link({
          event_name: 'video_complete',
          video_title: videoTitle,
          video_duration: Math.round(this.duration),
          page_type: utag_data.page_type
        });
        console.log('✅ Video completed:', videoTitle);
      });
    });
  }, 1500); // Wait for videos to load
})();
```

**Why This Extension?**
- Comprehensive video engagement tracking
- Tracks play, pause, progress, completion
- Real-world media content analytics
- Milestone-based progression tracking
- Valuable for content strategy decisions

---

### Testing These Extensions in Your Sandbox

1. **Add Extension to TiQ Profile** (dev environment)
2. **Load Profile in Sandbox** (Configuration section)
3. **Analyze Profile** (Profile Inspector → Extensions tab)
4. **View Extension Code** (Click "View Code" button)
5. **Test Conditions** (Use Data Layer section to set required data)
6. **Trigger Events** (Events section)
7. **Monitor Console** (Check for extension log messages)
8. **Verify Tracking** (Check Network tab for `utag.link` calls)

Each extension demonstrates practical, real-world Tealium implementation patterns you'll encounter in production environments.

#### 2.4 Load Rules Analysis
**Features**:
- **Rule Status**: TRUE (green) or FALSE (red)
- **Associated Tags**: See which tags use each rule
- **Rule Details**: Click "Details" to see:
  - Exact load rule condition
  - Variables used
  - Current evaluation result
  - Why it passed or failed

- **Filtering**:
  - By rule ID
  - By status (TRUE/FALSE)
  - By condition content

**Common Load Rule Patterns**:

```javascript
// LOAD RULE 1: All Pages
// Use this for tags that should fire everywhere
b["page_type"] != ""

// LOAD RULE 2: Product Pages
// For product detail page tags
b["page_type"] == "product" || b["product_id"]

// LOAD RULE 3: E-commerce Pages
// For any page with product data
(b["product_id"] && b["product_id"].length > 0) || 
b["page_type"] == "product" || 
b["page_type"] == "cart" ||
b["page_type"] == "checkout"

// LOAD RULE 4: Logged In Users
// For personalized tags
b["customer_id"] || b["customer_type"] == "logged_in"

// LOAD RULE 5: High Value Orders
// For remarketing tags on large orders
parseFloat(b["order_total"]) > 100

// LOAD RULE 6: New Customers
// For new customer tracking
b["customer_type"] == "new" || b["customer_type"] == "guest"

// LOAD RULE 7: Sandbox/Test Environment
// For debug tags only
window.location.hostname.includes("localhost") ||
window.location.search.includes("debug=true") ||
b["environment"] == "sandbox"
```

#### 2.5 utag.cfg Settings
**Shows Current Configuration**:
- `utagdb`: Debug mode (true/false)
- `noview`: Disable auto page view (true/false)
- `nocache`: Disable caching (true/false)
- `session_timeout`: Session duration (milliseconds)
- `split_cookie`: Cookie splitting enabled
- `domain_override`: Custom cookie domain
- And more...

**Common Settings**:
```javascript
// Enable debug mode
utag.cfg.utagdb = true;

// Disable automatic page view (for SPAs)
utag.cfg.noview = true;

// Set custom session timeout (30 minutes)
utag.cfg.session_timeout = 1800000;

// Override cookie domain
utag.cfg.domain_override = ".example.com";
```

#### 2.6 Tealium Cookies
**Cookie Categories**:
- **utag_main cookies**: Visitor ID, session tracking
  - `utag_main_v_id`: Visitor identifier
  - `utag_main_ses_id`: Session start timestamp
  - `utag_main__ss`: First page in session
  - `utag_main__se`: Session event count
  - `utag_main__pn`: Page view count
  - `utag_main__sn`: Session count

- **Consent cookies**:
  - `CONSENTMGR`: Consent Manager preferences
  - `OPTOUTMULTI`: Privacy opt-out settings

- **Web Companion cookies**: Environment selection

**Use Cases**:
- Debug session tracking
- Verify visitor ID generation
- Check consent status
- Troubleshoot cookie domain issues

---

### 📋 Section 3: Data Layer
**Purpose**: Manage and test utag_data (Universal Data Object)

#### Essential Data Layer Variables

```javascript
// CORE PAGE VARIABLES (Always Required)
{
  "page_type": "homepage",        // REQUIRED: Type of page
  "page_name": "Home",            // REQUIRED: Page name
  "site_section": "main",         // Site hierarchy
  "page_language": "en",          // Language code
  "page_country": "US",           // Country code
  
  // USER/CUSTOMER VARIABLES
  "customer_id": "user123",       // Unique user identifier
  "customer_type": "registered",  // new, guest, registered, premium
  "customer_email": "user@example.com",
  "customer_status": "logged_in", // logged_in, logged_out
  
  // E-COMMERCE PRODUCT VARIABLES (Arrays)
  "product_id": ["SKU123"],       // Product SKU/ID
  "product_name": ["Product Name"],
  "product_category": ["Electronics"],
  "product_subcategory": ["Phones"],
  "product_brand": ["BrandName"],
  "product_price": [99.99],
  "product_quantity": [1],
  "product_currency": "USD",
  "product_sku": ["SKU123"],
  
  // ORDER/TRANSACTION VARIABLES
  "order_id": "ORDER-12345",      // Unique order ID
  "order_total": 99.99,           // Total order value
  "order_subtotal": 89.99,        // Subtotal before tax/shipping
  "order_tax": 8.00,              // Tax amount
  "order_shipping": 2.00,         // Shipping cost
  "order_discount": 0.00,         // Discount amount
  "order_currency": "USD",        // Currency code
  "order_payment_method": "credit_card",
  
  // FORM/LEAD VARIABLES
  "form_name": "contact_us",      // Form identifier
  "form_type": "lead_generation", // Form purpose
  "lead_source": "organic_search",
  "campaign_id": "CAMP123",
  
  // SEARCH VARIABLES
  "search_term": "laptop",        // Search query
  "search_results_count": 45,     // Number of results
  "search_filter": "price_asc",   // Applied filters
  
  // CUSTOM DIMENSIONS (Flexible)
  "custom_dimension_1": "value1",
  "custom_dimension_2": "value2",
  "custom_metric_1": 123,
  
  // TECHNICAL/METADATA
  "timestamp": "2025-09-30T10:00:00Z",
  "environment": "sandbox",       // sandbox, dev, qa, prod
  "site_version": "2.0",
  "device_type": "desktop"        // mobile, tablet, desktop
}
```

#### Data Layer Best Practices

1. **Use Consistent Naming**:
   - Lowercase with underscores: `product_name`, not `productName`
   - Be consistent across all pages

2. **Arrays for E-commerce**:
   - Always use arrays for product data, even for single products
   - Keep array lengths consistent

3. **Required vs Optional**:
   - Always include: `page_type`, `page_name`
   - Include when available: customer, product, order data

4. **Data Types**:
   - Strings: `"value"`
   - Numbers: `99.99` (no quotes)
   - Arrays: `["value1", "value2"]`
   - Booleans: `true` or `false`

---

### ⚡ Section 4: Events
**Purpose**: Trigger and test Tealium tracking events

#### Event Types:

**1. Page View Events** (`utag.view`)
- Sent on page load
- Updates all page-level data
- Fires view tags

```javascript
// Example utag.view call
utag.view({
  page_type: "product",
  page_name: "Product Details",
  product_id: ["SKU123"],
  product_name: ["Example Product"],
  product_price: [99.99]
});
```

**2. Link Events** (`utag.link`)
- Sent on user interactions
- Doesn't override page data
- Fires link tags

```javascript
// Example utag.link call
utag.link({
  event_name: "add_to_cart",
  product_id: ["SKU123"],
  product_quantity: [1]
});
```

#### Preset Link Events:
- 🛒 Add to Cart
- ❤️ Add to Wishlist
- 👁️ Product View
- 🔍 Search
- 📧 Newsletter Signup
- 📱 Social Share
- 💳 Checkout Start
- ✅ Purchase Complete

#### Custom Events:
Build your own events with custom data:
```javascript
{
  "event_name": "video_play",
  "video_title": "Product Demo",
  "video_duration": 120,
  "video_progress": 0.25
}
```

---

### 📚 Section 5: Help
**Purpose**: Quick reference and documentation

**Includes**:
- Feature overviews
- Common use cases
- Troubleshooting tips
- Links to detailed documentation

---

## 🎯 Recommended Tealium Profile Configuration

### Essential Data Layer Variables Setup in TiQ

**Add these as Data Layer Variables (not extensions)**:

```
Variable Name: page_type
Source: Data Layer  
Variable: page_type
Default Value: unknown

Variable Name: page_name
Source: Data Layer
Variable: page_name
Default Value: (not set)

Variable Name: customer_id
Source: Data Layer
Variable: customer_id
Default Value: anonymous

Variable Name: customer_type
Source: Data Layer
Variable: customer_type
Default Value: guest

Variable Name: product_id
Source: Data Layer
Variable: product_id
Default Value: []

Variable Name: order_id
Source: Data Layer
Variable: order_id
Default Value: (none)

Variable Name: order_total
Source: Data Layer
Variable: order_total
Default Value: 0
```

---

## ✅ Verification Checklist

Before starting your testing:
- [ ] Tealium library loads successfully
- [ ] Account/profile/environment are correct
- [ ] Profile Inspector shows all tags
- [ ] Data layer populates with expected fields
- [ ] Debug extensions are active
- [ ] Console shows Tealium events
- [ ] Tag firing can be verified in Network tab
- [ ] Load rules evaluate correctly
- [ ] Extensions execute in proper order

---

## 🔄 Maintenance & Updates

### Regular Tasks:
- Update account/profile configurations as needed
- Refresh tag templates for new features
- Update data scenarios for current business needs
- Review and update load rules
- Test with latest Tealium library versions
- Validate extensions after TiQ changes

### Performance Monitoring:
- Monitor tag load times in Network tab
- Check for JavaScript errors in Console
- Verify data layer completeness
- Test across different browsers/devices
- Review Profile Inspector regularly

---

This comprehensive setup guide provides everything needed for effective Tealium implementation testing and troubleshooting using the sandbox toolkit.