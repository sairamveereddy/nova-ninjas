// background.js - Orchestrates auth, data fetching, and cross-frame communication
const API_BASE_URL = 'https://nova-ninjas-production.up.railway.app';

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 1. Auth & Data Retrieval
    if (message.type === 'GET_AUTH_TOKEN') {
        handleGetAuthToken(sendResponse);
        return true;
    }

    // 2. Cross-Frame Broadcast
    if (message.type === 'BROADCAST_AUTOFILL') {
        const tabId = sender.tab.id;
        chrome.webNavigation.getAllFrames({ tabId: tabId }, (frames) => {
            frames.forEach(frame => {
                chrome.tabs.sendMessage(tabId, { type: 'START_AUTOFILL', data: message.data }, { frameId: frame.frameId });
            });
        });
        return false;
    }

    // 3. Message Forwarding (From frames to Top-Frame Sidebar)
    if (message.type === 'FIELD_FILLED' || message.type === 'AUTOFILL_TOTAL') {
        if (sender.tab && sender.tab.id) {
            // Forward to top frame (frameId: 0)
            chrome.tabs.sendMessage(sender.tab.id, message, { frameId: 0 });
        }
        return false;
    }

    // 4. UI Controls
    if (message.type === 'TOGGLE_SIDEBAR') {
        if (sender.tab && sender.tab.id) {
            chrome.tabs.sendMessage(sender.tab.id, { type: 'TOGGLE_SIDEBAR' }, { frameId: 0 });
        }
        return false;
    }

    if (message.type === 'OPEN_SIDE_PANEL') {
        if (sender.tab && sender.tab.id) {
            chrome.sidePanel.open({ tabId: sender.tab.id });
        }
        return false;
    }

    return false;
});

async function handleGetAuthToken(sendResponse) {
    // Try storage first
    const { auth_token, user_data } = await chrome.storage.local.get(['auth_token', 'user_data']);

    let token = auth_token;
    let userData = user_data ? (typeof user_data === 'string' ? JSON.parse(user_data) : user_data) : null;

    // Fallback: check tabs if storage is empty or stale
    if (!token) {
        const tabs = await chrome.tabs.query({ url: ["*://*.jobninjas.ai/*", "*://*.jobninjas.org/*", "*://*.jobninjas.com/*", "*://*.jobninjas.io/*"] });
        const activeTabs = tabs.filter(t => t.id && t.url && !t.url.startsWith('chrome'));

        if (activeTabs.length > 0) {
            const res = await new Promise(resolve => {
                chrome.tabs.sendMessage(activeTabs[0].id, { type: 'GET_AUTH_TOKEN' }, (r) => {
                    if (chrome.runtime.lastError) resolve(null);
                    else resolve(r);
                });
            });
            if (res && res.token) {
                token = res.token;
                userData = res.userData;
                // Save to storage for next time
                chrome.storage.local.set({ 'auth_token': token, 'user_data': userData });
            }
        }
    }

    if (!token) {
        sendResponse({ error: 'No session' });
        return;
    }

    // Always attempt to fetch full profile and latest resume to ensure autofill has data
    try {
        const profileRes = await fetch(`${API_BASE_URL}/api/user/profile`, {
            headers: { 'token': token }
        });
        if (profileRes.ok) {
            const pData = await profileRes.json();
            if (pData && pData.profile) {
                userData = { ...userData, ...pData.profile };
            }
        }

        const resumeRes = await fetch(`${API_BASE_URL}/api/resumes?email=${encodeURIComponent(userData?.email || '')}`, {
            headers: { 'token': token }
        });
        if (resumeRes.ok) {
            const rData = await resumeRes.json();
            if (rData && rData.resumes && rData.resumes.length > 0) {
                userData.latestResume = rData.resumes[0];
            }
        }

        // Update storage with full data
        chrome.storage.local.set({ 'user_data': userData });
    } catch (e) {
        console.warn('[jobNinjas] Background data refresh failed:', e);
    }

    sendResponse({ token, userData });
}
