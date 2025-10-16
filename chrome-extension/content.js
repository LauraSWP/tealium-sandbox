// Tealium Sandbox API Connector - Content Script
console.log('Tealium Sandbox API Connector content script loaded');

// Announce extension presence immediately
window.postMessage({ type: 'TEALIUM_EXTENSION_AVAILABLE' }, '*');

// Listen for messages from page
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  
  const { type, requestId } = event.data;
  
  // Respond to check
  if (type === 'TEALIUM_EXTENSION_CHECK') {
    window.postMessage({ type: 'TEALIUM_EXTENSION_AVAILABLE' }, '*');
    return;
  }
  
  // Forward API requests to background
  if (type === 'TEALIUM_API_AUTH' || type === 'TEALIUM_API_PROFILE') {
    console.log('Content forwarding:', type);
    chrome.runtime.sendMessage(event.data, (response) => {
      console.log('Content received response:', response);
      window.postMessage({
        type: 'TEALIUM_API_RESPONSE',
        requestId: requestId,
        response: response
      }, '*');
    });
  }
});

