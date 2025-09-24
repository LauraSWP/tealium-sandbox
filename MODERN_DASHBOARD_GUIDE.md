# Modern Tealium Sandbox Dashboard

## 🚀 Quick Start

### New Files
- **`index-new.html`** - Modern Tailwind CSS dashboard version
- **`sandbox-new.js`** - Enhanced JavaScript with modern functionality
- **`custom-functions.js`** - Extensible custom functions library

### Key Improvements
1. **Modern Design** - Clean Tailwind CSS dashboard interface
2. **Dedicated Profile Inspector** - Separate section with CORS workarounds
3. **Floating Settings Panel** - Hidden by default, accessible via gear icon
4. **Custom Functions UI** - Visual interface for custom testing functions
5. **Responsive Layout** - Works on all screen sizes
6. **Enhanced Navigation** - Sidebar navigation with clear sections

## 🔧 Features

### Profile Inspector Solutions for CORS Issues

The CORS error (`Access to fetch at 'https://tags.tiqcdn.com/utag/...' has been blocked by CORS policy`) is a browser security feature. We've implemented these workarounds:

#### 1. **Manual Analysis**
- Copy utag.js content from browser
- Paste into the "Manual Analysis" textarea
- Get full analysis without CORS restrictions

#### 2. **Browser Developer Tools Method**
- Load the profile in your site
- Check Network tab for utag.js
- Copy content for analysis

#### 3. **Alternative Access Methods**
- Direct link to open utag.js in new tab
- Clear instructions for each workaround
- Automated analysis of manually pasted content

### Modern Dashboard Features

#### ✨ **Floating Settings Panel**
- Hidden by default (only gear icon visible)
- Slides in from right side
- Quick access to account/profile/environment
- Debug options included
- One-click Tealium loading

#### 🎯 **Profile Inspector Section**
- Dedicated navigation item
- CORS warning with solutions
- Manual content analysis
- Current profile inspection
- Configuration import functionality

#### ⚡ **Custom Functions Library**
- Categorized function buttons
- Visual execution feedback
- Console command examples
- Easy function registration
- Real-time output display

## 🛠️ Usage Instructions

### 1. Getting Started
```bash
# Open the new dashboard
open index-new.html
```

### 2. Configure Tealium
- Click gear icon (top-right) for quick settings
- Or use main Configuration section
- Enter account/profile/environment
- Click "Load Tealium"

### 3. Inspect Profiles
- Navigate to "Profile Inspector"
- Try automatic inspection first
- If CORS blocked, use manual analysis:
  - Open the provided utag.js link
  - Copy content and paste in textarea
  - Click "Analyze Content"

### 4. Use Custom Functions
- Navigate to "Custom Functions"
- Click any function button to execute
- Watch output in the results panel
- Use console commands for direct access

## 🎨 Design Features

### Tailwind CSS Benefits
- **Responsive Design** - Works on mobile, tablet, desktop
- **Modern Styling** - Clean, professional appearance
- **Fast Loading** - CDN-delivered CSS framework
- **Consistent Colors** - Tealium brand colors throughout
- **Smooth Animations** - Sliding panels, hover effects

### Color Scheme
- **Primary**: Tealium blue (`tealium-600`)
- **Success**: Green for positive actions
- **Warning**: Yellow/amber for cautions
- **Error**: Red for errors
- **Info**: Blue for informational messages

### Layout Structure
```
┌─────────────────────────────────────────────┐
│ Header with Section Title & Actions        │
├─────────────┬───────────────────────────────┤
│   Sidebar   │                               │
│ Navigation  │        Main Content           │
│             │         Area                  │
│   - Config  │                               │
│   - Profile │                               │
│   - Data    │                               │
│   - Events  │                               │
│   - etc.    │                               │
└─────────────┴───────────────────────────────┘
                                    [⚙️] Settings
```

## 🔧 Technical Details

### CORS Workaround Implementation
```javascript
// Automatic attempt with fallback
try {
    const response = await fetch(utagUrl);
    const content = await response.text();
    analyzeProfile(content);
} catch (error) {
    // Show CORS alternatives
    showCORSWorkarounds(utagUrl);
}
```

### Custom Functions Registration
```javascript
// Add to custom-functions.js
window.customFunctionRegistry = {
    'Your Function Name': {
        func: yourFunction,
        description: 'What it does',
        category: 'Testing' // Quick Setup, Testing, Debugging, Advanced
    }
};
```

### Settings Persistence
- Saves to localStorage automatically
- Loads previous settings on page refresh
- Syncs between quick settings and main form

## 📱 Responsive Breakpoints

- **Mobile** (< 768px): Single column, collapsed sidebar
- **Tablet** (768px - 1024px): Two columns where applicable
- **Desktop** (> 1024px): Full grid layouts, sidebar always visible

## 🎯 Best Practices

### For Agents
1. **Start with Configuration** - Set up account/profile first
2. **Use Profile Inspector** - Understand client setup before testing
3. **Leverage Custom Functions** - Speed up common testing scenarios
4. **Keep Settings Panel Handy** - Quick environment switching
5. **Export Configurations** - Save working setups for later

### For CORS Issues
1. **Always try automatic first** - May work in some environments
2. **Use manual analysis** - Most reliable method
3. **Browser dev tools** - For real-time inspection
4. **CORS proxy** - For advanced users only

## 🚀 Future Enhancements

The dashboard is designed for easy extension:
- Additional sections can be added to sidebar
- New custom function categories
- Enhanced profile analysis
- Real-time collaboration features
- Import/export configurations

## 📞 Support

For questions about the modern dashboard:
1. Check console for any JavaScript errors
2. Verify all files are loaded correctly
3. Test in different browsers if issues occur
4. Use browser dev tools for debugging

The dashboard maintains backward compatibility while providing a modern, efficient interface for Tealium testing and troubleshooting.
