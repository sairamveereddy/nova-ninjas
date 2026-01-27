chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

// Listen for messages from content scripts or the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_AUTH_TOKEN') {
        // Find a tab that is on jobninjas.ai or .org to extract the token from localStorage
        chrome.tabs.query({ url: ["*://*.jobninjas.ai/*", "*://*.jobninjas.org/*"] }, (tabs) => {
            if (tabs && tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_AUTH_TOKEN' }, (response) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ error: 'Could not communicate with tab' });
                    } else {
                        sendResponse(response || { error: 'No response from tab' });
                    }
                });
            } else {
                sendResponse({ error: 'No JobNinjas tab found. Please open jobninjas.org and login.' });
            }
        });
        return true; // Keep channel open for async response
    }

    if (message.type === 'OPEN_SIDE_PANEL') {
        chrome.sidePanel.open({ tabId: sender.tab.id });
    }
});
