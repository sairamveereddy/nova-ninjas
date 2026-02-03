// Extension Diagnostic Script
// Open this in Chrome DevTools Console to check if extension is loaded

console.log('=== JobNinjas Extension Diagnostics ===');

// 1. Check if scripts are loaded
console.log('1. Checking if scripts are loaded...');
console.log('   AutofillEngineV2 exists:', typeof window.AutofillEngineV2);
console.log('   Content script loaded:', typeof performAutofill);

// 2. Check current URL
console.log('2. Current URL:', window.location.href);
console.log('   Is LinkedIn:', window.location.hostname.includes('linkedin'));

// 3. Check for LinkedIn matcher
if (window.location.hostname.includes('linkedin')) {
    console.log('3. LinkedIn detected - checking matcher...');
    setTimeout(() => {
        const widget = document.getElementById('jobninjas-match-widget');
        console.log('   Match widget exists:', !!widget);
        if (!widget) {
            console.error('   ❌ LinkedIn match widget NOT found');
            console.log('   Check Console for errors from linkedin-matcher.js');
        } else {
            console.log('   ✅ Match widget found!');
        }
    }, 3000);
}

// 4. Check extension storage
chrome.storage.local.get(['auth_token', 'user_data'], (result) => {
    console.log('4. Extension Storage:');
    console.log('   Auth token:', result.auth_token ? 'Present' : 'Missing');
    console.log('   User data:', result.user_data ? 'Present' : 'Missing');
});

// 5. Check for sidebar
setTimeout(() => {
    const sidebar = document.getElementById('job-ninja-sidebar-container');
    const bird = document.getElementById('job-ninja-floating-bird');
    console.log('5. UI Elements:');
    console.log('   Sidebar exists:', !!sidebar);
    console.log('   Floating bird exists:', !!bird);
}, 2000);

// 6. Check CSS  
setTimeout(() => {
    const sidebar = document.getElementById('job-ninja-sidebar-container');
    if (sidebar && sidebar.shadowRoot) {
        const primaryBtn = sidebar.shadowRoot.querySelector('.btn-primary');
        if (primaryBtn) {
            const bgColor = window.getComputedStyle(primaryBtn).backgroundColor;
            console.log('6. Branding Check:');
            console.log('   Primary button color:', bgColor);
            console.log('   Is JobNinjas blue (#00ced1):', bgColor.includes('0, 206, 209'));
        }
    }
}, 3000);

console.log('=== Run this diagnostic after page loads ===');
