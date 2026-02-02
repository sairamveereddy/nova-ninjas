chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Listen for messages from content scripts or the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_AUTH_TOKEN') {
        chrome.tabs.query({ url: ["*://*.jobninjas.ai/*", "*://*.jobninjas.org/*", "*://*.jobninjas.com/*", "*://*.jobninjas.io/*"] }, async (tabs) => {
            const activeTabs = tabs.filter(t => t.id && t.url && !t.url.startsWith('chrome'));
            const API_BASE_URL = 'https://nova-ninjas-production.up.railway.app';

            if (activeTabs.length === 0) {
                sendResponse({ error: 'No JobNinjas tab found. Please open jobninjas.io and login.' });
                return;
            }

            let session = null;
            for (const tab of activeTabs) {
                try {
                    const response = await new Promise((resolve) => {
                        chrome.tabs.sendMessage(tab.id, { type: 'GET_AUTH_TOKEN' }, (res) => {
                            if (chrome.runtime.lastError) resolve(null);
                            else resolve(res);
                        });
                    });

                    if (response && response.token) {
                        session = response;
                        break;
                    }
                } catch (e) {
                    console.warn(`[jobNinjas] Sync failed for tab ${tab.id}:`, e);
                }
            }

            if (session) {
                try {
                    // Fetch profile in background to avoid CORS issues in content scripts
                    const profileRes = await fetch(`${API_BASE_URL}/api/user/profile`, {
                        headers: { 'token': session.token }
                    });
                    if (profileRes.ok) {
                        const profileData = await profileRes.json();
                        if (profileData && profileData.profile) {
                            session.userData = { ...session.userData, ...profileData.profile };
                        }
                    }

                    // Also fetch latest resume
                    const resumeRes = await fetch(`${API_BASE_URL}/api/resumes?email=${encodeURIComponent(session.userData?.email || '')}`, {
                        headers: { 'token': session.token }
                    });
                    if (resumeRes.ok) {
                        const resumeData = await resumeRes.json();
                        if (resumeData && resumeData.resumes && resumeData.resumes.length > 0) {
                            // Attach latest resume text if available
                            session.userData.latestResume = resumeData.resumes[0];
                        }
                    }
                } catch (e) {
                    console.error('[jobNinjas] Background data fetch failed:', e);
                }
                sendResponse(session);
            } else {
                sendResponse({ error: 'No active session found. Please login to jobninjas.io' });
            }
        });
        return true;
    }

    if (message.type === 'BROADCAST_AUTOFILL') {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'START_AUTOFILL', data: message.data });
        return false;
    }

    if (message.type === 'TOGGLE_SIDEBAR') {
        // Toggle message for content script in-page overlay
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_SIDEBAR' });
            }
        });
        return false;
    }

    if (message.type === 'OPEN_SIDE_PANEL') {
        if (sender.tab && sender.tab.id) {
            chrome.sidePanel.open({ tabId: sender.tab.id });
        }
        return false;
    }

    return false; // Default: close channel
});
