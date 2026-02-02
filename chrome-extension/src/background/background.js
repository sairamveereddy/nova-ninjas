chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Listen for messages from content scripts or the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_AUTH_TOKEN') {
        chrome.storage.local.get(['auth_token', 'user_data'], (local) => {
            if (local.auth_token) {
                const userData = typeof local.user_data === 'string' ? JSON.parse(local.user_data) : local.user_data;
                sendResponse({ token: local.auth_token, userData: userData });
            } else {
                // Fallback: search tabs if storage is empty
                chrome.tabs.query({ url: ["*://*.jobninjas.ai/*", "*://*.jobninjas.org/*", "*://*.jobninjas.com/*", "*://*.jobninjas.io/*"] }, async (tabs) => {
                    const activeTabs = tabs.filter(t => t.id && t.url && !t.url.startsWith('chrome'));
                    if (activeTabs.length > 0) {
                        chrome.tabs.sendMessage(activeTabs[0].id, { type: 'GET_AUTH_TOKEN' }, (res) => {
                            sendResponse(res);
                        });
                    } else {
                        sendResponse({ error: 'No session' });
                    }
                });
            }
        });
        return true;
    }

    if (message.type === 'BROADCAST_AUTOFILL') {
        const tabId = sender.tab.id;
        // Broadcast to ALL frames in the tab
        chrome.webNavigation.getAllFrames({ tabId: tabId }, (frames) => {
            frames.forEach(frame => {
                chrome.tabs.sendMessage(tabId, { type: 'START_AUTOFILL', data: message.data }, { frameId: frame.frameId });
            });
        });
        return false;
    }

    if (message.type === 'TOGGLE_SIDEBAR') {
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

    return false; // Default
});
