# Tealium Sandbox - Testing & Troubleshooting Toolkit

A comprehensive testing and troubleshooting toolkit for Tealium implementations, designed for Tealium agents and developers.

## 🚀 Live Demo

**Access the sandbox here: https://lauraswp.github.io/tealium-sandbox/**

## ✨ Features

### 🔧 **Universal Tealium Testing**
- Dynamic loading of any Tealium account/profile/environment
- Support for custom environments (case-sensitive)
- Real-time status monitoring and debugging

### 🔍 **Profile Inspector**
- Analyze existing Tealium profiles
- Extract variables, tags, and load rules
- CORS-friendly workarounds for profile analysis
- Import/export profile configurations

### ⚡ **Custom Functions Library**
- Pre-built testing scenarios (e-commerce, B2B, content)
- Extensible custom function system
- Visual execution with real-time feedback
- Console command integration

### 💾 **Settings Management**
- Save/load frequently used profiles
- Export/import profile collections
- Form synchronization between quick settings and main configuration
- Keyboard shortcuts (Ctrl+S to save, Ctrl+L to load)

### 📏 **Advanced Load Rules Testing**
- Visual load rule builder with TiQ syntax generation
- Support for all standard Tealium variables
- Custom JavaScript function testing
- Save and reuse rule configurations

### 🎯 **Multi-Protocol Support**
- Works with GitHub Pages (HTTPS)
- Local file:// protocol support with automatic fixes
- Comprehensive URL patching for Tealium tag loading

## 🛠️ **Quick Start**

1. **Configure Tealium**: Enter your account, profile, and environment
2. **Load Tealium**: Click "Load Tealium" or use Ctrl+L
3. **Test Scenarios**: Use preset scenarios or custom functions
4. **Debug**: Monitor events and tag loading in real-time
5. **Save Settings**: Use Ctrl+S or the save button for quick access

## 📋 **Use Cases**

### For Tealium Agents:
- **Troubleshoot customer issues** by replicating their exact setup
- **Test new implementations** in dev/qa environments
- **Demonstrate Tealium capabilities** with realistic scenarios
- **Debug load rules** and tag firing conditions

### For Developers:
- **Test custom data layers** and event structures
- **Validate tag configurations** before production deployment
- **Prototype new implementations** with sample data
- **Train team members** on Tealium best practices

## 🎯 **Key Sections**

1. **Configuration** - Set up your Tealium account details
2. **Profile Inspector** - Analyze existing implementations
3. **Data Layer** - Test custom data structures
4. **Events** - Trigger various Tealium events
5. **Load Rules** - Build and test conditional logic
6. **Custom Functions** - Execute pre-built testing scenarios
7. **Consent** - Test privacy and consent scenarios
8. **Debug Console** - Monitor real-time event logs
9. **Tags** - Test individual tag configurations
10. **Extensions** - Manage JavaScript extensions
11. **Help** - Comprehensive documentation and best practices

## 🔧 **Technical Features**

- **Modern Dashboard**: Built with Tailwind CSS for responsive design
- **Form Synchronization**: Linked quick settings and main configuration
- **Local Storage**: Persistent settings across browser sessions
- **Export/Import**: Backup and share profile configurations
- **Keyboard Shortcuts**: Efficient navigation and actions
- **Protocol Agnostic**: Works locally and on web servers

## 📚 **Documentation**

### Essential Files:
- `index.html` - Main dashboard interface
- `sandbox.js` - Core functionality and Tealium integration
- `custom-functions.js` - Extensible testing functions library
- `SETUP_GUIDE.md` - Detailed setup and usage instructions
- `TEALIUM_EXAMPLES.md` - Tealium implementation examples and best practices
- `TROUBLESHOOTING.md` - Common issues and solutions
- `QUICK_START.md` - Quick start guide for new users

### Best Practices:
- Use **Data Layer Variables** in TiQ for simple data mapping
- Reserve **Extensions** for complex logic only
- Test in **dev/qa environments** before production
- Save **frequently used profiles** for quick access

## 🚀 **Development**

### Local Development:
```bash
# Clone the repository
git clone https://github.com/your-username/tealium-sandbox.git
cd tealium-sandbox

# Open index.html in your browser
# No build process required - pure HTML/CSS/JS
```

### Contributing:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with different Tealium profiles
5. Submit a pull request

## 🔍 **Troubleshooting**

### Common Issues:

**Tealium Won't Load:**
- Verify account/profile/environment spelling (case-sensitive)
- Check browser console for errors
- Try different environments (dev/qa/prod)
- Ensure ad blockers aren't interfering

**CORS Issues:**
- Use the manual analysis feature in Profile Inspector
- Copy utag.js content directly for offline analysis
- Access via GitHub Pages for full functionality

**JavaScript Errors:**
- Ensure all scripts are loading properly
- Check browser developer tools (F12)
- Try refreshing the page to reset state

## 📝 **Version History**

- **v2.0** - Modern dashboard with Tailwind CSS, enhanced profile management
- **v1.5** - Added custom functions library and keyboard shortcuts
- **v1.0** - Initial release with basic Tealium testing capabilities

## 🤝 **Support**

For questions, issues, or feature requests:
1. Check the Help section in the dashboard
2. Review the troubleshooting documentation
3. Contact your Tealium technical team

## 📄 **License**

This project is designed for internal Tealium use and testing purposes.

---


**🎯 Ready to test? [Launch the Tealium Sandbox](https://your-username.github.io/tealium-sandbox)**
