// content.js - Robust field detection and Next-step logic

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_AUTOFILL') {
        console.log('[jobNinjas] Starting autofill for Jobboard...', message.data);
        performAutofill(message.data).then(result => {
            sendResponse({ status: 'completed', details: result });
        });
        return true;
    }

    if (message.type === 'GET_AUTH_TOKEN') {
        const host = window.location.hostname;
        if (host.includes('jobninjas.ai') || host.includes('jobninjas.org')) {
            const token = localStorage.getItem('auth_token');
            const userData = localStorage.getItem('user_data');
            sendResponse({ token, userData: userData ? JSON.parse(userData) : null });
        } else {
            sendResponse({ error: 'Not on platform' });
        }
    }

    if (message.type === 'CLICK_NEXT') {
        clickNextButton();
    }
    return true;
});

async function performAutofill(userData) {
    const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    const itemsToFill = [];

    // Identify candidate fields
    inputs.forEach(input => {
        const context = getFieldContext(input);
        itemsToFill.push({ input, context });
    });

    // Notify total discovered to sidepanel
    chrome.runtime.sendMessage({ type: 'AUTOFILL_TOTAL', total: itemsToFill.length });

    let filledCount = 0;
    for (const item of itemsToFill) {
        const { input, context } = item;
        let filled = false;

        // Smart Mapping
        if (isField(context, ['first name', 'given name', 'firstName'])) {
            filled = fillField(input, userData.name.split(' ')[0], 'First Name');
        } else if (isField(context, ['last name', 'family name', 'surname', 'lastName'])) {
            const parts = userData.name.trim().split(/\s+/);
            filled = fillField(input, parts.length > 1 ? parts.slice(1).join(' ') : parts[0], 'Last Name');
        } else if (isField(context, ['email'])) {
            filled = fillField(input, userData.email, 'Email Address');
        } else if (isField(context, ['phone', 'mobile'])) {
            filled = fillField(input, userData.phone, 'Phone Number');
        } else if (isField(context, ['linkedin', 'social'])) {
            filled = fillField(input, userData.linkedin, 'LinkedIn URL');
        } else if (isField(context, ['gender'])) {
            filled = selectOption(input, userData.gender || 'Decline', 'Gender');
        } else if (isField(context, ['race', 'ethnicity'])) {
            filled = selectOption(input, userData.race || 'Decline', 'Race/Ethnicity');
        } else if (isField(context, ['disability'])) {
            filled = selectOption(input, userData.disabilityStatus || 'No', 'Disability');
        } else if (isField(context, ['veteran'])) {
            filled = selectOption(input, userData.veteranStatus || 'No', 'Veteran');
        } else if (isField(context, ['authorization', 'authorized', 'sponsorship'])) {
            filled = selectOption(input, 'Yes', 'Work Authorization');
        }

        if (filled) {
            filledCount++;
            await new Promise(r => setTimeout(r, 200)); // Human speed ripple
        }
    }
    return { filled: filledCount };
}

function getFieldContext(input) {
    const label = findLabelText(input).toLowerCase();
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const aria = (input.getAttribute('aria-label') || '').toLowerCase();
    return `${label} ${name} ${id} ${placeholder} ${aria}`;
}

function isField(context, keywords) {
    return keywords.some(kw => context.includes(kw.toLowerCase()));
}

function findLabelText(input) {
    // Check explicit label
    if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) return label.innerText;
    }
    // Check wrapped label
    const parentLabel = input.closest('label');
    if (parentLabel) return parentLabel.innerText;
    // Check nearby text
    const parent = input.parentElement;
    if (parent) return parent.innerText.slice(0, 50);
    return '';
}

function fillField(input, value, label) {
    if (!value) return false;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
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
            chrome.runtime.sendMessage({ type: 'FIELD_FILLED', label: label });
            return true;
        }
    }
    return false;
}

function clickNextButton() {
    const selectors = [
        'button:contains("Next")', 'button:contains("Continue")', 'button:contains("Save & Continue")',
        '[aria-label*="Next"]', '[aria-label*="Continue"]',
        'input[type="submit"]', 'button[type="submit"]'
    ];

    // Simple lookup for common text since :contains is not native
    const allButtons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
    const nextBtn = allButtons.find(btn => {
        const text = (btn.innerText || btn.value || '').toLowerCase();
        return text.includes('next') || text.includes('continue') || text.includes('save & continue');
    });

    if (nextBtn) {
        nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => nextBtn.click(), 500);
    }
}

// Floating button logic
function injectNinjaButton() {
    if (document.getElementById('job-ninja-floating-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'job-ninja-floating-btn';
    btn.innerHTML = `
    <div style="font-size: 18px;">🥷</div>
    <div style="font-weight: 700; font-size: 14px;">Autofill with jobNinjas</div>
  `;

    Object.assign(btn.style, {
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        zIndex: '2147483647',
        backgroundColor: '#00e696',
        color: '#000',
        padding: '12px 24px',
        borderRadius: '30px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontFamily: "'Outfit', sans-serif",
        boxShadow: '0 8px 24px rgba(0, 230, 150, 0.3)',
        transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)'
    });

    btn.addEventListener('mouseenter', () => btn.style.transform = 'translateY(-4px) scale(1.02)');
    btn.addEventListener('mouseleave', () => btn.style.transform = 'translateY(0) scale(1)');
    btn.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' }));

    // Inject only on job sites
    const host = window.location.hostname;
    if (host.includes('greenhouse') || host.includes('lever') || host.includes('workday') || host.includes('myworkdayjobs') || host.includes('linkedin.com/jobs')) {
        document.body.appendChild(btn);
    }
}

// Initial Launch
setTimeout(injectNinjaButton, 1000);
