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

## 🧪 First Tests (3 minutes)

### Test 1: Basic Page View
1. Click **"Trigger utag.view()"** in the Event Testing section
2. Check the Debug Console for the logged event
3. Look in browser Network tab for outgoing requests

### Test 2: Apply a Data Scenario
1. Click **"🛒 E-commerce Product"** button in Data Layer section
2. See how the data layer updates in the textarea
3. Click **"Trigger utag.view()"** again to send the new data

### Test 3: Test Link Events
1. Click any button in the Link Events section (e.g., "🛒 Add to Cart")
2. Watch the Debug Console for the link event
3. Verify the event data in the logs

**✅ If you see events in the console and network requests, everything is working!**

## 🔍 Quick Troubleshooting

### Tealium Won't Load?
- **Check account/profile spelling** - must be exact
- **Try different environment** - dev vs qa vs prod
- **Check browser console** for error messages
- **Disable ad blockers** temporarily

### No Events Showing?
- Enable **"Enable Console Debugging"** checkbox
- Check if **"Log All Events"** is enabled
- Look in browser **Developer Tools > Console**
- Verify Tealium loaded successfully

### Common Issues
- **Mixed content errors**: Use HTTPS or local server
- **CORS errors**: Try a different browser or disable security temporarily
- **Ad blockers**: May block Tealium scripts

## 📊 Essential Features Overview

### 🔧 Configuration Panel
- **Dynamic Tealium loading** - Test any account/profile
- **Debug settings** - Control logging and notifications
- **Status monitoring** - Real-time connection status

### 📋 Data Layer Management  
- **Current data viewer** - See live utag_data
- **Preset scenarios** - E-commerce, purchase, registration, etc.
- **Custom JSON editor** - Add your own test data

### ⚡ Event Testing
- **View events** - Page view simulation (utag.view)
- **Link events** - User interaction tracking (utag.link)  
- **Custom events** - Build your own event data

### 🔐 Consent Management
- **Consent controls** - Test different permission scenarios
- **Status monitoring** - See current consent state
- **Banner testing** - Trigger consent prompts

### 🔍 Debug Console
- **Real-time logging** - All events with timestamps
- **Status information** - Tags, performance, errors
- **Tealium inspection** - Examine utag object structure

## 🎯 Common Testing Workflows

### New Implementation Testing
```
1. Load your dev environment
2. Apply "E-commerce Product" scenario  
3. Test view and link events
4. Verify tags fire correctly
5. Check data formatting
```

### Debugging Existing Issues
```
1. Load problematic environment
2. Enable all debug options
3. Reproduce the issue scenario
4. Analyze event logs and network
5. Test fixes with custom data
```

### Training/Demo Sessions
```
1. Use preset scenarios for consistency
2. Show different event types
3. Demonstrate consent management  
4. Explain debugging techniques
```

## 📁 File Overview

- **`index.html`** - Main interface (open this file)
- **`sandbox.js`** - Core functionality and event handling
- **`styles.css`** - Modern styling and responsive design
- **`README.md`** - Complete documentation
- **`SETUP_GUIDE.md`** - Detailed setup instructions  
- **`TROUBLESHOOTING.md`** - Common issues and solutions
- **`TEALIUM_EXAMPLES.md`** - TiQ configuration examples
- **`QUICK_START.md`** - This file

## 🔧 Browser Setup Tips

### Recommended Browser Settings
1. **Enable Developer Tools** (F12)
2. **Disable ad blockers** for testing domain
3. **Allow mixed content** if testing HTTPS sites
4. **Enable third-party cookies** for full tag testing

### Useful Browser Extensions
- **Tealium Tools** - Official Tealium debugging extension
- **EditThisCookie** - Cookie management for consent testing
- **JSON Formatter** - Better JSON viewing in network tab

## 🌐 Next Steps

### For Basic Testing
- Read **`README.md`** for feature details
- Try all preset scenarios
- Test with your actual tag configuration
- Practice debugging workflows

### For Advanced Setup  
- Review **`SETUP_GUIDE.md`** for TiQ configuration
- Check **`TEALIUM_EXAMPLES.md`** for tag examples
- Set up local HTTPS for secure testing
- Configure your own data scenarios

### For Troubleshooting
- Keep **`TROUBLESHOOTING.md`** handy
- Learn browser debugging techniques
- Practice with different browsers
- Test mobile responsive scenarios

## 📞 Getting Help

### Built-in Help
- Use **"Check Status"** button for diagnostics
- Enable **debug logging** for detailed information  
- Check **browser console** for error messages
- Use **"View utag Object"** to inspect Tealium

### Documentation
- **README.md** - Complete feature documentation
- **Browser console** - Detailed error messages and logs
- **Network tab** - See actual requests and responses

### Best Practices
- Always test in **dev environment** first
- Keep scenarios **simple and focused**
- **Document your test cases** for repeatability
- **Clear cache** between tests for clean results

---

**🎉 Happy Testing!** You now have a comprehensive toolkit for Tealium testing and troubleshooting.

Need more details? Check the other documentation files for in-depth guides and examples.
