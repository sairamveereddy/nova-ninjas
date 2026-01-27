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
    // Select all interactive elements
    const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea, [role="checkbox"], [role="radio"]');
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

        // Smart Mapping Logic
        if (isField(context, ['first name', 'given name', 'firstName'])) {
            filled = fillField(input, userData.name.split(' ')[0], 'First Name');
        } else if (isField(context, ['last name', 'family name', 'surname', 'lastName'])) {
            const parts = userData.name.trim().split(/\s+/);
            filled = fillField(input, parts.length > 1 ? parts.slice(1).join(' ') : parts[0], 'Last Name');
        } else if (isField(context, ['email'])) {
            filled = fillField(input, userData.email, 'Email Address');
        } else if (isField(context, ['phone', 'mobile'])) {
            filled = fillField(input, userData.phone, 'Phone Number');
        } else if (isField(context, ['linkedin', 'social', 'website', 'portfolio'])) {
            filled = fillField(input, userData.linkedin, 'LinkedIn URL');
        } else if (isField(context, ['gender'])) {
            filled = selectSmart(input, userData.gender || 'Decline', 'Gender');
        } else if (isField(context, ['race', 'ethnicity'])) {
            filled = selectSmart(input, userData.race || 'Decline', 'Race/Ethnicity');
        } else if (isField(context, ['disability'])) {
            filled = selectSmart(input, userData.disabilityStatus || 'No', 'Disability');
        } else if (isField(context, ['veteran'])) {
            filled = selectSmart(input, userData.veteranStatus || 'No', 'Veteran');
        } else if (isField(context, ['authorization', 'authorized', 'sponsorship', 'right to work'])) {
            filled = selectSmart(input, 'Yes', 'Work Authorization');
        } else if (isField(context, ['address line', 'street'])) {
            filled = fillField(input, userData.address || '', 'Address');
        } else if (isField(context, ['city'])) {
            filled = fillField(input, userData.city || '', 'City');
        } else if (isField(context, ['state', 'province'])) {
            filled = selectSmart(input, userData.state || '', 'State');
        } else if (isField(context, ['zip', 'postal'])) {
            filled = fillField(input, userData.zip || '', 'Postal Code');
        }

        if (filled) {
            filledCount++;
            await new Promise(r => setTimeout(r, 100)); // Human-like delay
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
    const title = (input.getAttribute('title') || '').toLowerCase();
    const dataAutomation = (input.getAttribute('data-automation-id') || '').toLowerCase();
    return `${label} ${name} ${id} ${placeholder} ${aria} ${title} ${dataAutomation}`;
}

function isField(context, keywords) {
    return keywords.some(kw => context.includes(kw.toLowerCase()));
}

function findLabelText(input) {
    // 1. Check explicit label
    if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) return label.innerText;
    }
    // 2. Check wrapped label
    const parentLabel = input.closest('label');
    if (parentLabel) return parentLabel.innerText;

    // 3. Check preceding elements (Workday style)
    let prev = input.previousElementSibling;
    while (prev) {
        if (prev.tagName === 'LABEL' || prev.classList.contains('label')) return prev.innerText;
        prev = prev.previousElementSibling;
    }

    // 4. Check parent's siblings (Common in complex grids)
    const parent = input.parentElement;
    if (parent && parent.previousElementSibling) {
        return parent.previousElementSibling.innerText.slice(0, 50);
    }

    // 5. Check aria-labelledby
    const labelledBy = input.getAttribute('aria-labelledby');
    if (labelledBy) {
        const el = document.getElementById(labelledBy);
        if (el) return el.innerText;
    }

    return '';
}

function fillField(input, value, label) {
    if (!value || input.disabled || input.readOnly) return false;

    input.value = value;
    // Trigger all common events
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));

    chrome.runtime.sendMessage({ type: 'FIELD_FILLED', label: label });
    return true;
}

function selectSmart(input, text, label) {
    if (input.tagName === 'SELECT') {
        return selectOption(input, text, label);
    } else if (input.type === 'radio' || input.getAttribute('role') === 'radio') {
        return selectRadio(input, text, label);
    } else if (input.type === 'checkbox' || input.getAttribute('role') === 'checkbox') {
        // For generic "Yes" questions
        if (text.toLowerCase() === 'yes' || text === true) {
            input.click();
            chrome.runtime.sendMessage({ type: 'FIELD_FILLED', label: label });
            return true;
        }
    }
    return false;
}

function selectOption(select, text, label) {
    if (!select || !text) return false;
    const target = text.toLowerCase();

    for (let i = 0; i < select.options.length; i++) {
        const optionText = select.options[i].text.toLowerCase();
        const optionValue = select.options[i].value.toLowerCase();

        if (optionText.includes(target) || optionValue.includes(target) || target.includes(optionText)) {
            select.selectedIndex = i;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            chrome.runtime.sendMessage({ type: 'FIELD_FILLED', label: label });
            return true;
        }
    }
    return false;
}

function selectRadio(radio, text, label) {
    const context = getFieldContext(radio);
    if (context.includes(text.toLowerCase())) {
        radio.click();
        chrome.runtime.sendMessage({ type: 'FIELD_FILLED', label: label });
        return true;
    }
    return false;
}

function clickNextButton() {
    // Expanded selectors for next/continue buttons
    const selectors = [
        'button:contains("Next")', 'button:contains("Continue")', 'button:contains("Save & Continue")',
        'button:contains("Finish")', 'button:contains("Review")',
        '[aria-label*="Next"]', '[aria-label*="Continue"]',
        '[data-automation-id="bottom-navigation-next-button"]', // Workday
        '.gnew-button-continue', // Greenhouse
        'input[type="submit"]', 'button[type="submit"]'
    ];

    const allButtons = Array.from(document.querySelectorAll('button, a, input[type="submit"], [role="button"]'));
    const nextBtn = allButtons.find(btn => {
        const text = (btn.innerText || btn.getAttribute('value') || '').toLowerCase();
        return text.includes('next') || text.includes('continue') || text.includes('save & continue') || text.includes('submit application');
    });

    if (nextBtn) {
        nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            nextBtn.click();
            // Optional: Workday sometimes needs a second click or has specific behavior
        }, 500);
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

    // Inject only on job sites or if it's an application
    const host = window.location.hostname;
    const path = window.location.pathname;
    const domains = ['greenhouse', 'lever', 'workday', 'myworkdayjobs', 'linkedin', 'indeed', 'glassdoor'];

    if (domains.some(d => host.includes(d)) || path.includes('apply') || path.includes('jobs')) {
        document.body.appendChild(btn);
    }
}

// Initial Launch
setTimeout(injectNinjaButton, 2000); // Wait for dynamic content
setInterval(injectNinjaButton, 5000); // Periodic check for SPAs
