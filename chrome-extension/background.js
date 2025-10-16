// Tealium Sandbox API Connector - Background Service Worker
console.log('Tealium Sandbox API Connector loaded');

let sessions = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received:', request.type);
  
  if (request.type === 'TEALIUM_API_AUTH') {
    authenticateAPI(request.apiKey).then(sendResponse);
    return true;
  }
  
  if (request.type === 'TEALIUM_API_PROFILE') {
    fetchProfile(request.sessionId, request.account, request.profile, request.version)
      .then(sendResponse);
    return true;
  }
  
  return false;
});

async function authenticateAPI(apiKey) {
  try {
    console.log('Authenticating with Tealium API...');
    const response = await fetch('https://api.tealiumiq.com/v3/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: apiKey })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Auth failed:', data);
      return {
        success: false,
        error: data.error_description || 'Authentication failed'
      };
    }

    const sessionId = generateSessionId();
    sessions[sessionId] = {
      bearerToken: data.token || data.access_token,
      hostname: data.hostname || data.region || 'api.tealiumiq.com',
      expiresAt: Date.now() + (data.expires_in * 1000)
    };

    console.log('Auth successful, session:', sessionId);
    return {
      success: true,
      sessionId: sessionId,
      hostname: sessions[sessionId].hostname,
      expiresIn: data.expires_in
    };
  } catch (error) {
    console.error('Auth error:', error);
    return { success: false, error: error.message };
  }
}

async function fetchProfile(sessionId, account, profile, version) {
  const session = sessions[sessionId];
  
  if (!session || Date.now() > session.expiresAt) {
    return { success: false, error: 'Session expired or invalid' };
  }

  try {
    let apiUrl = `https://${session.hostname}/v3/${account}/${profile}`;
    if (version) apiUrl += `/version/${version}`;

    console.log('Fetching profile:', apiUrl);
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Profile fetch failed:', data);
      return {
        success: false,
        error: data.error_description || 'Failed to fetch profile'
      };
    }

    console.log('Profile fetched successfully');
    return { success: true, data: data };
  } catch (error) {
    console.error('Profile fetch error:', error);
    return { success: false, error: error.message };
  }
}

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(sessions).forEach(sessionId => {
    if (now > sessions[sessionId].expiresAt) {
      delete sessions[sessionId];
      console.log('Cleaned expired session:', sessionId);
    }
  });
}, 5 * 60 * 1000);

