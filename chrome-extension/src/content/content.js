// content.js - Robust field detection and Next-step logic

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_AUTOFILL') {
        console.log('[jobNinjas] Starting autofill for Jobboard...', message.data);
        performAutofill(message.data).then(result => {
            sendResponse({ status: 'completed', details: result });
        }).catch(err => {
            sendResponse({ status: 'error', message: err.message });
        });
        return true; // Async
    }

    if (message.type === 'GET_AUTH_TOKEN') {
        const host = window.location.hostname;
        if (host.includes('jobninjas.ai') || host.includes('jobninjas.org') || host.includes('jobninjas.com') || host.includes('jobninjas.io')) {
            const token = localStorage.getItem('auth_token');
            const userData = localStorage.getItem('user_data');
            sendResponse({ token, userData: userData ? JSON.parse(userData) : null });
        } else {
            sendResponse({ error: 'Not on platform' });
        }
        return false; // Sync
    }

    if (message.type === 'CLICK_NEXT') {
        clickNextButton();
        sendResponse({ status: 'clicked' });
        return false; // Sync
    }
});

async function performAutofill(userData) {
    console.log('[jobNinjas] Starting smarter autofill...', userData);
    const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea, [role="checkbox"], [role="radio"]');
    const itemsToFill = [];
    const filledLabels = [];

    inputs.forEach(input => {
        const context = getFieldContext(input);
        itemsToFill.push({ input, context });
    });

    chrome.runtime.sendMessage({ type: 'AUTOFILL_TOTAL', total: itemsToFill.length });

    let filledCount = 0;
    for (const item of itemsToFill) {
        const { input, context } = item;
        let filled = false;
        let label = '';

        // Helper to get string value safely
        const getStr = (val) => (typeof val === 'object' && val !== null) ? (val.line1 || val.name || val.text || JSON.stringify(val)) : (val || '');

        if (isField(context, ['first name', 'given name', 'firstName', 'legalNameSection_firstName', '_firstName'])) {
            label = 'First Name';
            const val = getStr(userData.firstName || userData.person?.fullName?.split(' ')[0] || userData.name?.split(' ')[0]);
            filled = fillField(input, val, label);
        } else if (isField(context, ['last name', 'family name', 'surname', 'lastName', 'legalNameSection_lastName', '_lastName'])) {
            label = 'Last Name';
            const full = getStr(userData.person?.fullName || userData.fullName || userData.name);
            const parts = full.trim().split(/\s+/);
            const val = parts.length > 1 ? parts.slice(1).join(' ') : getStr(userData.lastName || '');
            filled = fillField(input, val, label);
        } else if (isField(context, ['email', 'email address', 'user_email', 'contactInformation_email', '_email'])) {
            label = 'Email';
            filled = fillField(input, getStr(userData.person?.email || userData.email), label);
        } else if (isField(context, ['phone', 'mobile', 'telephone', 'contact number', 'phone-number', '_phone'])) {
            label = 'Phone';
            filled = fillField(input, getStr(userData.person?.phone || userData.phone), label);
        }
        else if (isField(context, ['address line 1', 'street address', 'mailing address', 'addressSection_addressLine1', '_address'])) {
            label = 'Address Line 1';
            filled = fillField(input, getStr(userData.address?.line1 || userData.line1 || userData.address), label);
        } else if (isField(context, ['address line 2', 'apartment', 'suite', 'unit', 'addressSection_addressLine2'])) {
            label = 'Address Line 2';
            filled = fillField(input, getStr(userData.address?.line2 || userData.line2), label);
        } else if (isField(context, ['city', 'location', 'town', 'addressSection_city', '_city'])) {
            label = 'City';
            filled = fillField(input, getStr(userData.address?.city || userData.city), label);
        } else if (isField(context, ['state', 'province', 'region', 'addressSection_state', '_state'])) {
            label = 'State';
            filled = selectSmart(input, getStr(userData.address?.state || userData.state), label);
        } else if (isField(context, ['zip', 'postal', 'zipcode', 'postcode', 'addressSection_postalCode', 'postal-code'])) {
            label = 'Postal Code';
            filled = fillField(input, getStr(userData.address?.zip || userData.zip || userData.postalCode), label);
        } else if (isField(context, ['country', 'nation', 'addressSection_country', '_country'])) {
            label = 'Country';
            filled = selectSmart(input, getStr(userData.address?.country || userData.country), label);
        }

        if (filled) {
            filledCount++;
            filledLabels.push(label);
            await new Promise(r => setTimeout(r, 100));
        }
    }
    return { filled: filledCount, labels: filledLabels };
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

    // 3. Check for specific Workday pattern: label is a sibling of the container
    const container = input.closest('[data-automation-id]') || input.parentElement;
    if (container) {
        // Look for siblings that might be labels before the container
        let sib = container.previousElementSibling;
        if (sib && (sib.tagName === 'LABEL' || sib.classList.contains('label') || sib.innerText.length < 50)) return sib.innerText;

        // Look for labels inside the parent
        const innerLabel = container.querySelector('label, [class*="label"], [data-automation-id*="label"]');
        if (innerLabel) return innerLabel.innerText;
    }

    // 4. Check aria-labelledby
    const labelledBy = input.getAttribute('aria-labelledby');
    if (labelledBy) {
        const el = document.getElementById(labelledBy);
        if (el) return el.innerText;
    }

    // 5. Check placeholder
    if (input.placeholder) return input.placeholder;

    // 6. Check aria-label directly
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

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

// Floating Sidebar & Button Logic (Jobright-style Overlay)
let sidebarContainer = null;
let sidebarShadow = null;
let currentSidebarUser = null;
let currentSidebarToken = null;
let sidebarAuthInterval = null;

const API_BASE_URL = 'https://nova-ninjas-production.up.railway.app';

function injectNinjaSidebar() {
    if (window.top !== window.self) return; // Prevent multiple sidebars in iframes
    if (sidebarContainer) return;

    sidebarContainer = document.createElement('div');
    sidebarContainer.id = 'job-ninja-sidebar-host';
    sidebarContainer.style.all = 'initial';
    document.body.appendChild(sidebarContainer);

    sidebarShadow = sidebarContainer.attachShadow({ mode: 'open' });

    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap';
    sidebarShadow.appendChild(fontLink);

    const style = document.createElement('style');
    style.textContent = `
        :host {
            --primary-blue: #00ced1;
            --primary-gradient: linear-gradient(135deg, #00ced1 0%, #008b8b 100%);
            --accent-green: #00ffa3;
            --bg-light: #f8f9fa;
            --card-white: #ffffff;
            --text-main: #000000;
            --text-muted: #666666;
            --border-light: #eeeeee;
            --shadow-md: 0 4px 24px rgba(0, 0, 0, 0.15);
        }

        .sidebar-overlay {
            position: fixed;
            top: 20px;
            right: -420px;
            width: 380px;
            height: calc(100vh - 40px);
            background: var(--card-white);
            z-index: 2147483647;
            border-radius: 24px;
            box-shadow: var(--shadow-md);
            transition: right 0.4s cubic-bezier(0.19, 1, 0.22, 1);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: 'Outfit', -apple-system, sans-serif;
            border: 1px solid var(--border-light);
        }

        .sidebar-overlay.open {
            right: 20px;
        }

        .header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-light);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo-section {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .logo-icon {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .logo-text h1 { margin: 0; font-size: 1.1rem; }
        .logo-text p { margin: 0; font-size: 0.75rem; color: var(--text-muted); }

        .content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            position: relative;
        }

        .hero-card {
            background: #fff;
            padding: 24px;
            border-radius: 20px;
            text-align: center;
            border: 1px solid var(--border-light);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
        }

        .btn-primary {
            background: var(--primary-gradient);
            color: white;
            border: none;
            padding: 16px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 1rem;
            width: 100%;
            cursor: pointer;
            text-decoration: none;
            display: block;
            transition: transform 0.2s;
            text-align: center;
        }

        .btn-primary:active { transform: scale(0.98); }

        .form-group {
            margin-bottom: 16px;
            text-align: left;
        }

        .form-label {
            display: block;
            font-size: 0.85rem;
            font-weight: 700;
            margin-bottom: 6px;
            color: #333;
        }
        .form-label span { color: #ff4d4f; margin-right: 4px; }

        .form-input {
            width: 100%;
            padding: 12px;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            font-family: inherit;
            font-size: 0.9rem;
            box-sizing: border-box;
        }

        .form-textarea {
            width: 100%;
            height: 120px;
            padding: 12px;
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            font-family: inherit;
            font-size: 0.9rem;
            resize: none;
            box-sizing: border-box;
        }

        /* Match Score Circle */
        .match-score-container {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
        }

        .match-circle {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 3px solid #00ffa3;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.85rem;
            color: #333;
            background: white;
        }

        .progress-section {
            margin-top: 20px;
            text-align: left;
            width: 100%;
        }

        .progress-bar-container {
            height: 8px;
            background: #f0f2f5;
            border-radius: 4px;
            margin-top: 8px;
            overflow: hidden;
            position: relative;
        }

        .progress-fill {
            height: 100%;
            background: var(--primary-blue);
            width: 0%;
            transition: width 0.3s ease;
        }

        .filled-feedback {
            margin-top: 12px;
            padding: 12px;
            background: #f0fdfa;
            border-radius: 12px;
            border: 1px solid #ccfbf1;
            font-size: 0.8rem;
            color: #115e59;
            text-align: left;
        }

        .filled-tag {
            display: inline-block;
            background: #ccfbf1;
            padding: 2px 8px;
            border-radius: 4px;
            margin: 2px;
            font-weight: 600;
        }

        .btn-next-page {
            margin-top: 16px;
            background: #000;
            color: white;
            padding: 12px;
            border-radius: 12px;
            text-align: center;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn-next-page:hover { background: #333; }

        .hidden { display: none !important; }
    `;
    sidebarShadow.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.innerHTML = `
        <div class="header">
            <div class="logo-section">
                <div class="logo-icon" id="sidebar-header-icon">
                    <img src="${chrome.runtime.getURL('icons/icon128.png')}" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
                <div class="logo-text">
                    <h1>jobNinjas</h1>
                    <p>AI Career Copilot</p>
                </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <button class="back-btn hidden" id="btn-sidebar-back">✕</button>
                <button class="close-btn">❯</button>
            </div>
        </div>
        <div class="content" id="sidebar-content">
            <!-- Auth View -->
            <div id="view-auth">
                <div class="hero-card">
                    <img src="${chrome.runtime.getURL('icons/icon128.png')}" style="width: 80px; height: 80px; border-radius: 20px;" />
                    <h2>Connect Your Account</h2>
                    <p>Open <strong>jobNinjas.io</strong> to sync your AI profile and resume data.</p>
                    <a href="https://jobninjas.io/login" target="_blank" class="btn-primary">🔑 Go to jobNinjas</a>
                </div>
            </div>

            <!-- Dashboard View -->
            <div id="view-dashboard" class="hidden">
                <div class="hero-card" id="btn-trigger-add-job" style="cursor: pointer; background: #f9fafb;">
                   <div style="font-size: 24px; color: #00ced1;">+</div>
                   <p style="font-size: 0.9rem; font-weight: 600;">Add A New Job to Get Job Match Score & Tailor Your Resume</p>
                </div>
                
                <button class="btn-primary" id="btn-dashboard-autofill">Autofill</button>
                
                <div class="resume-card">
                    <span id="txt-resume-name">Sai_Ram_Resume.docx</span>
                    <button style="border: none; background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">Change</button>
                </div>

                <div class="progress-section">
                    <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.85rem;">
                        <span>Completion</span>
                        <span id="txt-completion-pct">0%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-fill" id="bar-completion-fill"></div>
                    </div>
                </div>

                <div id="autofill-feedback-container" class="hidden">
                    <div class="filled-feedback">
                        <div style="font-weight: 700; margin-bottom: 4px;">Filled Fields:</div>
                        <div id="list-filled-fields"></div>
                    </div>
                    <div class="btn-next-page" id="btn-next-step">
                        <span>Go to Next Step</span>
                        <span>❯</span>
                    </div>
                </div>
            </div>

            <!-- Add Job View -->
            <div id="view-add-job" class="hidden">
                <h3 style="margin-top: 0; margin-bottom: 20px;">Add a New Job for This Page</h3>
                <div class="form-group">
                    <label class="form-label"><span>*</span>Job Title</label>
                    <input type="text" class="form-input" id="input-job-title" placeholder="Enter Job Title">
                </div>
                <div class="form-group">
                    <label class="form-label"><span>*</span>URL for Original Posting</label>
                    <input type="text" class="form-input" id="input-job-url" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label"><span>*</span>Company Name</label>
                    <input type="text" class="form-input" id="input-job-company" placeholder="Enter the company name">
                </div>
                <div class="form-group">
                    <label class="form-label"><span>*</span>Job Description</label>
                    <textarea class="form-textarea" id="input-job-desc" placeholder="Please paste the complete job description..."></textarea>
                </div>
                <button class="btn-primary" id="btn-continue-add-job">Continue</button>
            </div>

            <!-- Analyzing View -->
            <div id="view-analyzing" class="hidden" style="text-align: center; padding: 40px 0;">
                <div class="analyzing-sparkle">✨</div>
                <div class="progress-bar-container" style="width: 80%; margin: 20px auto;">
                    <div class="progress-fill" id="bar-analyzing-fill" style="width: 0%;"></div>
                </div>
                <h2 style="margin: 10px 0;">Analyzing New Job...</h2>
                <p style="font-size: 0.9rem; color: #666; line-height: 1.5; padding: 0 20px;">
                    Takes about 5-10 seconds, you can stay on this page to view the results later.
                </p>
            </div>

            <!-- Result View -->
            <div id="view-result" class="hidden">
               <div class="match-score-container">
                    <div class="match-circle">61%</div>
               </div>
               <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                    <div style="width: 40px; height: 40px; background: #f3f4f6; border-radius: 8px;"></div>
                    <div>
                        <div id="txt-result-company" style="font-weight: 700; font-size: 1rem;">Company Name</div>
                        <div id="txt-result-industry" style="color: #999; font-size: 0.8rem;">Industry</div>
                    </div>
               </div>
               <h2 id="txt-result-title" style="margin: 15px 0 5px 0; border-bottom: 2px solid #000; display: inline-block;">Job Title</h2>
               <p style="color: #999; font-size: 0.8rem; margin-bottom: 25px;">just now</p>

               <button class="btn-primary" id="btn-result-autofill" style="background: var(--primary-blue); font-size: 1.2rem; margin-bottom: 10px;">Autofill</button>
               <p style="text-align: center; font-size: 0.85rem; text-decoration: underline; margin-bottom: 20px; cursor: pointer;">4 Remaining Credits</p>

               <div style="border-top: 1px solid #eee; padding-top: 20px;">
                    <p style="font-weight: 700; margin-bottom: 15px;">Resume</p>
                    <div class="resume-card" style="margin-top: 0;">
                        <span id="txt-result-resume-name">Sai_Ram_Resume.docx</span>
                        <button style="border: none; background: #eee; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">Change</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #eee; border-radius: 12px; margin-top: 10px; cursor: pointer;">
                        <span style="display: flex; align-items: center; gap: 8px;">✨ Generate Custom Resume</span>
                        <span>❯</span>
                    </div>
               </div>

                <div class="progress-section">
                    <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.85rem;">
                        <span>Completion</span>
                        <span id="txt-result-completion-pct">0%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-fill" id="bar-result-completion-fill"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    sidebarShadow.appendChild(overlay);

    // Elements
    const views = {
        auth: overlay.querySelector('#view-auth'),
        dashboard: overlay.querySelector('#view-dashboard'),
        addJob: overlay.querySelector('#view-add-job'),
        analyzing: overlay.querySelector('#view-analyzing'),
        result: overlay.querySelector('#view-result')
    };

    const btns = {
        close: overlay.querySelector('.close-btn'),
        back: overlay.querySelector('#btn-sidebar-back'),
        triggerAddJob: overlay.querySelector('#btn-trigger-add-job'),
        continueAddJob: overlay.querySelector('#btn-continue-add-job'),
        dashAutofill: overlay.querySelector('#btn-dashboard-autofill'),
        resultAutofill: overlay.querySelector('#btn-result-autofill'),
        nextStep: overlay.querySelector('#btn-next-step')
    };

    const inputs = {
        title: overlay.querySelector('#input-job-title'),
        url: overlay.querySelector('#input-job-url'),
        company: overlay.querySelector('#input-job-company'),
        desc: overlay.querySelector('#input-job-desc')
    };

    // Navigation Logic
    const showView = (viewName) => {
        Object.keys(views).forEach(v => views[v].classList.add('hidden'));
        views[viewName].classList.remove('hidden');

        // Show/Hide back button
        if (viewName === 'addJob' || viewName === 'result') btns.back.classList.remove('hidden');
        else btns.back.classList.add('hidden');
    };

    btns.close.onclick = () => {
        sidebarShadow.querySelector('.sidebar-overlay').classList.remove('open');
        sessionStorage.setItem('job-ninja-closed', 'true');
    };

    btns.back.onclick = () => showView('dashboard');

    btns.triggerAddJob.onclick = () => {
        inputs.url.value = window.location.href;
        // Try to guess company and title from document meta
        inputs.title.value = document.title.split('|')[0].trim();
        showView('addJob');
    };

    btns.continueAddJob.onclick = () => {
        if (!inputs.title.value || !inputs.company.value) {
            alert('Please fill in required fields.');
            return;
        }

        showView('analyzing');
        let progress = 0;
        const fillBar = overlay.querySelector('#bar-analyzing-fill');
        const interval = setInterval(() => {
            progress += 5;
            fillBar.style.width = `${progress}%`;
            if (progress >= 100) {
                clearInterval(interval);
                // Transition to result
                overlay.querySelector('#txt-result-company').innerText = inputs.company.value;
                overlay.querySelector('#txt-result-title').innerText = inputs.title.value;
                showView('result');
            }
        }, 150); // ~3 seconds total for demo
    };

    const handleAutofillAction = (btn) => {
        if (currentSidebarUser) {
            btn.innerText = 'Filling...';
            const feedbackCont = overlay.querySelector('#autofill-feedback-container');
            const listEl = overlay.querySelector('#list-filled-fields');

            // Clear previous feedback
            listEl.innerHTML = '';
            feedbackCont.classList.add('hidden');
            updateOverallProgress(0);

            // Broadcast to all frames (including current if it has fields)
            chrome.runtime.sendMessage({ type: 'BROADCAST_AUTOFILL', data: currentSidebarUser });

            // Reset button after 3 seconds
            setTimeout(() => {
                btn.innerText = 'Autofill';
            }, 3000);
        }
    };

    btns.nextStep.onclick = () => {
        clickNextButton();
    };

    btns.dashAutofill.onclick = () => handleAutofillAction(btns.dashAutofill);
    btns.resultAutofill.onclick = () => handleAutofillAction(btns.resultAutofill);

    startSidebarAuthPolling();
}

function startSidebarAuthPolling() {
    if (sidebarAuthInterval) return;
    sidebarCheckAuth();
    sidebarAuthInterval = setInterval(sidebarCheckAuth, 3000);
}

async function sidebarCheckAuth() {
    if (!chrome.runtime || !chrome.runtime.id) return;

    chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.token) {
            updateViewWithAuth(false);
            return;
        }

        // Token or data changed
        if (response.token !== currentSidebarToken || JSON.stringify(response.userData) !== JSON.stringify(currentSidebarUser)) {
            currentSidebarToken = response.token;
            currentSidebarUser = response.userData;

            updateViewWithAuth(true);
            updateSidebarDashboardData();
        }
    });
}

function updateViewWithAuth(isAuth) {
    const shadow = sidebarShadow;
    if (!shadow) return;
    const authView = shadow.querySelector('#view-auth');
    const dashView = shadow.querySelector('#view-dashboard');

    if (!isAuth) {
        authView.classList.remove('hidden');
        dashView.classList.add('hidden');
    } else if (authView.classList.contains('hidden') === false) {
        // Only switch from auth to dash if we were on auth
        authView.classList.add('hidden');
        dashView.classList.remove('hidden');
    }
}

function updateSidebarDashboardData() {
    const shadow = sidebarShadow;
    if (!shadow || !currentSidebarUser) return;
    const nameStr = currentSidebarUser.person?.fullName || currentSidebarUser.fullName || currentSidebarUser.name || 'Sai_Ram_Resume.docx';
    shadow.querySelector('#txt-resume-name').innerText = nameStr;
    shadow.querySelector('#txt-result-resume-name').innerText = nameStr;
}

function toggleSidebar() {
    if (!sidebarContainer) injectNinjaSidebar();
    const overlay = sidebarShadow.querySelector('.sidebar-overlay');
    overlay.classList.toggle('open');
}

function updateOverallProgress(pct) {
    if (!sidebarShadow) return;
    const targets = [
        { text: '#txt-completion-pct', bar: '#bar-completion-fill' },
        { text: '#txt-result-completion-pct', bar: '#bar-result-completion-fill' }
    ];
    targets.forEach(t => {
        const elTxt = sidebarShadow.querySelector(t.text);
        const elBar = sidebarShadow.querySelector(t.bar);
        if (elTxt) elTxt.innerText = `${pct}%`;
        if (elBar) elBar.style.width = `${pct}%`;
    });
}

function injectBirdButton() {
    if (window.top !== window.self) return; // Only top frame
    if (!chrome.runtime || !chrome.runtime.id) return;

    let btn = document.getElementById('job-ninja-floating-bird');
    const isNew = !btn;

    if (isNew) {
        btn = document.createElement('div');
        btn.id = 'job-ninja-floating-bird';
        document.body.appendChild(btn);
    }

    const iconUrl = chrome.runtime.getURL('icons/bird.png');
    // Using ninja face logo and making it "fill up" the area
    btn.innerHTML = `<img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;

    Object.assign(btn.style, {
        position: 'fixed',
        top: '50%',
        right: '25px', // Float away from edge
        transform: 'translateY(-50%)',
        zIndex: '2147483647',
        background: 'transparent', // Remove blue background
        width: '64px',
        height: '64px',
        borderRadius: '50%', // Full circle
        boxShadow: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
        border: 'none',
        padding: '0',
        overflow: 'hidden'
    });

    if (isNew) {
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-50%) scale(1.1)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'translateY(-50%) scale(1)';
        });
        btn.addEventListener('click', () => {
            if (chrome.runtime && chrome.runtime.id) {
                toggleSidebar();
            } else {
                alert('JobNinjas extension was updated. Please refresh the page.');
            }
        });

        const host = window.location.hostname;
        const domains = ['greenhouse', 'lever', 'workday', 'myworkdayjobs', 'linkedin', 'indeed', 'glassdoor'];
        const isJobSite = domains.some(d => host.includes(d)) || window.location.pathname.includes('apply') || window.location.pathname.includes('jobs');

        btn.style.display = isJobSite ? 'flex' : 'none';

        // Auto-open on job sites if not manually closed
        if (isJobSite && !sessionStorage.getItem('job-ninja-closed')) {
            setTimeout(toggleSidebar, 1500);
        }

        // Listen for toggle messages
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.type === 'TOGGLE_SIDEBAR') toggleSidebar();
            if (msg.type === 'FIELD_FILLED' && sidebarShadow) {
                // Update Progress
                const currentPercent = parseInt(sidebarShadow.querySelector('#txt-completion-pct').innerText) || 0;
                const nextPercent = Math.min(95, currentPercent + 8);
                updateOverallProgress(nextPercent);

                // Add to filled fields list
                const listEl = sidebarShadow.querySelector('#list-filled-fields');
                const feedbackCont = sidebarShadow.querySelector('#autofill-feedback-container');
                feedbackCont.classList.remove('hidden');

                // Add tag if not already there
                if (!listEl.innerHTML.includes(`>${msg.label}</span>`)) {
                    const tag = document.createElement('span');
                    tag.className = 'filled-tag';
                    tag.innerText = msg.label;
                    listEl.appendChild(tag);
                }
            }
        });
    }
}

// Initial Launch
setTimeout(injectBirdButton, 1000);
setInterval(injectBirdButton, 5000);
