// 1. Listen for messages from the side panel or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_AUTOFILL') {
        console.log('[jobNinjas] Starting autofill with data:', message.data);
        // Report started
        chrome.runtime.sendMessage({ type: 'AUTOFILL_STARTED', total: 0 });

        performAutofill(message.data).then(result => {
            sendResponse({ status: 'completed', details: result });
        });
        return true;
    }

    if (message.type === 'GET_AUTH_TOKEN') {
        if (window.location.hostname.includes('jobninjas.ai') || window.location.hostname.includes('jobninjas.org')) {
            const token = localStorage.getItem('auth_token');
            const userData = localStorage.getItem('user_data');
            sendResponse({ token, userData: userData ? JSON.parse(userData) : null });
        } else {
            sendResponse({ error: 'Not on jobninjas.org' });
        }
    }
    return true; // Keep channel open for async response
});

// 2. Field Detection Logic
async function performAutofill(userData) {
    const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    let filledCount = 0;
    const itemsToFill = [];

    // First pass: identify fields and their context
    inputs.forEach(input => {
        const autoId = (input.getAttribute('data-automation-id') || '').toLowerCase();
        const label = findLabelText(input).toLowerCase();
        const name = (input.name || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const context = `${label} ${name} ${placeholder} ${autoId}`.toLowerCase();

        itemsToFill.push({ input, context, label: label || name || 'Field' });
    });

    // Report total discovered
    chrome.runtime.sendMessage({ type: 'AUTOFILL_TOTAL', total: itemsToFill.length });

    for (const item of itemsToFill) {
        const { input, context, label } = item;
        let filled = false;

        // --- Core Identity ---
        if (context.includes('first name') || context.includes('given name') || context.includes('firstName')) {
            filled = fillField(input, userData.name.split(' ')[0], 'First Name');
        } else if (context.includes('last name') || context.includes('family name') || context.includes('surname') || context.includes('lastName')) {
            const parts = userData.name.trim().split(/\s+/);
            const lastPart = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
            filled = fillField(input, lastPart, 'Last Name');
        } else if (context.includes('full name') || context.includes('name')) {
            filled = fillField(input, userData.name, 'Full Name');
        } else if (context.includes('email')) {
            filled = fillField(input, userData.email, 'Email');
        } else if (context.includes('phone') || context.includes('mobile')) {
            filled = fillField(input, userData.phone, 'Phone');
        }

        // --- Socials ---
        else if (context.includes('linkedin') || context.includes('social profile')) {
            filled = fillField(input, userData.linkedin, 'LinkedIn');
        }

        // --- EEO & Bio (Phase 3) ---
        else if (context.includes('gender')) {
            filled = selectOption(input, userData.gender || 'Decline', 'Gender');
        } else if (context.includes('race') || context.includes('ethnicity')) {
            filled = selectOption(input, userData.race || 'Decline', 'Race/Ethnicity');
        } else if (context.includes('disability')) {
            filled = selectOption(input, userData.disabilityStatus || 'No', 'Disability Status');
        } else if (context.includes('veteran')) {
            filled = selectOption(input, userData.veteranStatus || 'No', 'Veteran Status');
        }

        // --- Work Auth ---
        else if (context.includes('sponsorship') || context.includes('authorized')) {
            filled = selectOption(input, 'Yes', 'Work Authorization');
        }

        if (filled) filledCount++;
        // Small delay to make it feel "human" and let sidepanel update
        await new Promise(r => setTimeout(r, 150));
    }

    return { filled: filledCount };
}

function findLabelText(input) {
    // 1. Check for data-automation-id (Workday specific)
    const autoId = input.getAttribute('data-automation-id');
    if (autoId) return autoId.replace(/-/g, ' ');

    // 2. Check for explicit label
    if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) return label.innerText;
    }

    // 3. Check for wrapped label
    const parentLabel = input.closest('label');
    if (parentLabel) return parentLabel.innerText;

    // 4. Check for nearby text (Workday/Lever often put labels in separate div/span)
    const parent = input.parentElement;
    if (parent) {
        const siblingText = parent.innerText || '';
        if (siblingText.length < 50) return siblingText; // Only use if it's short
    }

    // 5. Check for aria-label
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    return '';
}

function fillField(input, value, label) {
    if (!value) return false;
    input.value = value;
    // Trigger events so the site's React/Vue/etc. knows it changed
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Notify sidepanel
    chrome.runtime.sendMessage({ type: 'FIELD_FILLED', label: label });
    return true;
}

function selectOption(select, text, label) {
    if (!select || select.tagName !== 'SELECT' || !text) return false;

    for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].text.toLowerCase().includes(text.toLowerCase()) ||
            select.options[i].value.toLowerCase().includes(text.toLowerCase())) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));

            // Notify sidepanel
            chrome.runtime.sendMessage({ type: 'FIELD_FILLED', label: label });
            return true;
        }
    }
    return false;
}

// 3. Inject "Floating Button" (Similar to Jobright reference)
function injectNinjaButton() {
    const btn = document.createElement('div');
    btn.id = 'job-ninja-floating-btn';
    btn.innerHTML = `
    <div class="ninja-icon">🥷</div>
    <div class="ninja-text">Autofill with jobNinjas</div>
  `;

    // Applying styles via JS for simplicity in this artifact, but sidepanel.css is usually separate
    Object.assign(btn.style, {
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        zIndex: '999999',
        backgroundColor: '#00ff8c',
        color: '#000',
        padding: '12px 20px',
        borderRadius: '30px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontWeight: 'bold',
        fontFamily: 'sans-serif',
        boxShadow: '0 4px 20px rgba(0,255,140,0.4)',
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    });

    btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
    btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');

    btn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    });

    // Only inject if we are on a job application site
    if (isJobSite()) {
        document.body.appendChild(btn);
    }
}

function isJobSite() {
    const host = window.location.hostname;
    const path = window.location.pathname;

    return host.includes('greenhouse') ||
        host.includes('lever') ||
        host.includes('workday') ||
        host.includes('myworkdayjobs') ||
        host.includes('linkedin.com/jobs') ||
        host.includes('indeed.com') ||
        path.includes('/apply') ||
        path.includes('/jobs') ||
        document.body.innerText.includes('Job Application');
}

// Initialize
injectNinjaButton();
