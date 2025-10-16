# Tealium Sandbox Troubleshooting Guide

This guide covers common issues and solutions when using the Tealium Sandbox Toolkit.

## 🚨 Common Issues

### Tealium Won't Load

#### Symptoms
- "Tealium Status: Not Loaded" remains after clicking "Load Tealium"
- Console errors about script loading
- No utag object available

#### Causes & Solutions

**Invalid Account/Profile/Environment**
```
Error: Failed to load resource: the server responded with a status of 404 (Not Found)
```
- **Solution**: Verify account ID, profile name, and environment are correct
- **Test**: Try loading the URL directly in browser: `https://tags.tiqcdn.com/utag/ACCOUNT/PROFILE/ENVIRONMENT/utag.js`
- **Common mistakes**: Extra spaces, wrong case sensitivity, missing profiles

**Network/Firewall Issues**
```
Error: Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
```
- **Solution**: Check ad blockers, corporate firewalls, or content security policies
- **Test**: Disable ad blockers temporarily
- **Alternative**: Use a different network or VPN

**Mixed Content Issues**
```
Error: Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure script
```
- **Solution**: Use HTTPS for the sandbox or force HTTPS in Tealium URL
- **Fix**: Change the utag.js URL to use `https://` instead of `//`

### Data Layer Issues

#### utag_data Not Updating

**Symptoms**
- Data layer display shows old values
- Custom scenarios don't apply
- Events don't contain expected data

**Solutions**
```javascript
// Force refresh the data layer
window.utag_data = { ...window.utag_data, ...newData };
updateDataLayerDisplay();

// Check if utag_data is properly declared
if (typeof utag_data === 'undefined') {
  console.error('utag_data is not defined');
  window.utag_data = {};
}
```

#### Invalid JSON in Custom Data
```
Error: Unexpected token in JSON at position X
```
- **Solution**: Validate JSON format using online validators
- **Common issues**: Missing quotes, trailing commas, undefined values
- **Fix**: Use proper JSON syntax with double quotes

### Event Tracking Issues

#### Events Not Firing

**Debug Steps**
1. Check if Tealium is loaded: `typeof utag !== 'undefined'`
2. Verify utag.view/utag.link functions exist
3. Check console for JavaScript errors
4. Enable debug logging and trace mode

**Common Fixes**
```javascript
// Ensure Tealium is ready before firing events
if (typeof utag !== 'undefined' && utag.view) {
  utag.view(eventData);
} else {
  console.error('Tealium not ready for events');
}

// Add delay if timing is an issue
setTimeout(() => {
  if (typeof utag !== 'undefined' && utag.view) {
    utag.view(eventData);
  }
}, 1000);
```

#### Event Data Not Mapping
- **Issue**: Data appears in utag_data but not in tag tools
- **Solution**: Check tag load rules and data mappings in TiQ
- **Debug**: Use Universal Tag Debugger to see what data tags receive

### Consent Management Issues

#### Consent Methods Not Available

**Symptoms**
```
Error: Cannot read property 'setConsent' of undefined
```

**Solutions**
```javascript
// Check for different consent implementations
if (typeof utag !== 'undefined') {
  if (utag.gdpr && utag.gdpr.setConsent) {
    // Tealium Consent Manager
    utag.gdpr.setConsent(consentData);
  } else if (utag.setConsentValue) {
    // Alternative consent method
    Object.keys(consentData).forEach(category => {
      utag.setConsentValue(category, consentData[category]);
    });
  } else {
    // Fallback: use link event
    utag.link({
      event_name: 'consent_update',
      ...consentData
    });
  }
}
```

#### Consent Banner Not Showing
- **Check**: Consent Manager is enabled in TiQ profile
- **Verify**: Load rules are configured correctly
- **Test**: Try manual consent banner trigger methods

### Browser-Specific Issues

#### Safari Issues
- **CORS restrictions**: Safari may block cross-origin requests
- **Solution**: Test with local server instead of file:// protocol
- **ITP restrictions**: Safari's tracking prevention may affect cookies

#### Firefox Issues
- **Enhanced tracking protection**: May block Tealium script
- **Solution**: Add exception for testing domain
- **Privacy settings**: Check privacy.trackingprotection settings

#### Chrome Issues
- **Ad blockers**: Extensions may block Tealium
- **CORS policy**: Local file restrictions
- **Solution**: Use `--allow-file-access-from-files` flag or local server

### Performance Issues

#### Slow Loading
```javascript
// Monitor load times
const startTime = performance.now();
// ... after Tealium loads
const loadTime = performance.now() - startTime;
console.log(`Tealium load time: ${loadTime}ms`);
```

**Optimization Tips**
- Use async loading
- Minimize data layer size
- Reduce number of active tags for testing
- Use dev/qa environments instead of prod

#### Memory Issues
- **Clear event log regularly**: Use "Clear Log" button
- **Limit data scenarios**: Don't apply multiple large scenarios simultaneously
- **Refresh browser**: If memory usage becomes excessive

## 🔧 Debug Techniques

### Console Debugging

#### Basic Tealium Inspection
```javascript
// Check Tealium status
console.log('utag available:', typeof utag !== 'undefined');
console.log('utag_data:', utag_data);

// Inspect utag object
if (typeof utag !== 'undefined') {
  console.log('utag configuration:', utag.cfg);
  console.log('utag data:', utag.data);
  console.log('utag sender:', Object.keys(utag.sender || {}));
}
```

#### Event Flow Monitoring
```javascript
// Override utag methods to monitor calls
if (typeof utag !== 'undefined') {
  const originalView = utag.view;
  const originalLink = utag.link;
  
  utag.view = function(data) {
    console.log('🔍 utag.view called:', data);
    return originalView.call(this, data);
  };
  
  utag.link = function(data) {
    console.log('🔗 utag.link called:', data);
    return originalLink.call(this, data);
  };
}
```

#### Data Layer Validation
```javascript
// Validate data layer structure
function validateUtagData() {
  const required = ['page_type', 'page_name'];
  const missing = required.filter(field => !utag_data[field]);
  
  if (missing.length > 0) {
    console.warn('Missing required fields:', missing);
  }
  
  // Check for empty arrays
  Object.keys(utag_data).forEach(key => {
    if (Array.isArray(utag_data[key]) && utag_data[key].length === 0) {
      console.warn(`Empty array detected: ${key}`);
    }
  });
}
```

### Network Analysis

#### Monitoring Tag Requests
1. Open browser Developer Tools
2. Go to Network tab
3. Filter by domain (e.g., google-analytics.com, facebook.com)
4. Trigger events and observe requests
5. Check request payloads and responses

#### Common Request Issues
- **401/403 errors**: Authentication/permission issues
- **404 errors**: Incorrect tag configuration
- **CORS errors**: Cross-origin restrictions
- **Timeout errors**: Network or server issues

### Advanced Debugging

#### Tealium Trace Mode
```javascript
// Enable comprehensive tracing
if (typeof utag !== 'undefined') {
  utag.trace = true;
  
  // Custom trace logger
  if (utag.DB) {
    const originalTrace = utag.DB;
    utag.DB = function(message) {
      console.log('📊 Tealium Trace:', message);
      return originalTrace.call(this, message);
    };
  }
}
```

#### Tag-Specific Debugging

**Google Analytics 4**
```javascript
// GA4 debug mode
if (typeof gtag !== 'undefined') {
  gtag('config', 'GA_MEASUREMENT_ID', {
    debug_mode: true
  });
}

// Check GA4 data layer
console.log('GA4 dataLayer:', window.dataLayer);
```

**Facebook Pixel**
```javascript
// Facebook Pixel debug
if (typeof fbq !== 'undefined') {
  // Enable debug mode
  fbq('init', 'PIXEL_ID', {}, { debug: true });
  
  // Check pixel queue
  console.log('FB Pixel queue:', fbq.queue);
}
```

## 🔍 Diagnostic Tools

### Built-in Sandbox Diagnostics
- Use "Check Status" button for quick health check
- Monitor the debug console for real-time events
- Use "View utag Object" to inspect Tealium internals
- Check tag performance metrics

### External Tools

#### Browser Extensions
- **Tealium Tools**: Official browser extension
- **Tag Assistant (Legacy)**: Google's tag debugging tool
- **Facebook Pixel Helper**: Facebook's pixel debugging tool
- **EditThisCookie**: Cookie management for consent testing

#### Online Validators
- **JSONLint**: Validate JSON syntax
- **GTM/GA Debugger**: Various online debugging tools
- **Tealium Community**: Forums and documentation

### Manual Testing Procedures

#### Step-by-Step Event Testing
1. Clear browser cache and cookies
2. Open sandbox with fresh session
3. Load Tealium configuration
4. Apply test scenario
5. Trigger event
6. Verify in debug console
7. Check network requests
8. Validate tag behavior

#### Cross-Browser Testing Checklist
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome/Safari
- [ ] Private/Incognito mode

## 📊 Performance Optimization

### Sandbox Performance
- Clear event logs regularly
- Avoid excessive console logging
- Limit simultaneous tag testing
- Use minimal data scenarios for basic testing

### Tealium Performance
- Use appropriate environments (dev vs prod)
- Minimize active tags for testing
- Optimize load rules
- Use conditional loading

## 🚨 Emergency Procedures

### Complete Reset
If the sandbox becomes unresponsive:
1. Clear browser cache and cookies
2. Refresh the page
3. Reconfigure Tealium settings
4. Start with basic scenarios

### Data Recovery
Settings are saved in localStorage:
```javascript
// View saved settings
console.log('Saved config:', localStorage.getItem('tealium-sandbox-config'));
console.log('Saved settings:', localStorage.getItem('tealium-sandbox-settings'));

// Manual recovery
const savedConfig = {
  account: 'your-account',
  profile: 'your-profile',
  environment: 'dev'
};
localStorage.setItem('tealium-sandbox-config', JSON.stringify(savedConfig));
```

### Contact Information
For persistent issues:
1. Document the exact error messages
2. Note browser and OS versions
3. Provide account/profile information
4. Include steps to reproduce
5. Contact Tealium technical support

---

Remember: This sandbox is a testing tool. Always validate implementations in proper staging environments before production deployment.
