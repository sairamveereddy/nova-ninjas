// Side Panel Logic for jobNinjas (Jobright-style Flow)

const API_BASE_URL = 'https://nova-ninjas-production.up.railway.app';

// State Management
let currentUser = null;
let currentToken = null;
let isAutofilling = false;
let filledFields = new Set();
let totalRequiredFields = 11; // Demo value, will be calculated dynamically

// DOM Elements
const screens = {
    auth: document.getElementById('auth-screen'),
    dashboard: document.getElementById('dashboard-screen'),
    addJob: document.getElementById('add-job-screen')
};

const elements = {
    btnAutofill: document.getElementById('btn-autofill'),
    btnAddJobTrigger: document.getElementById('btn-add-job-trigger'),
    btnCloseForm: document.getElementById('btn-close-form'),
    btnSaveJob: document.getElementById('btn-save-job'),
    btnChangeResume: document.getElementById('btn-change-resume'),
    btnNextStep: document.getElementById('btn-next-step'),
    footerActions: document.getElementById('footer-actions'),
    completionPercentage: document.getElementById('completion-percentage'),
    progressFill: document.getElementById('progress-fill'),
    checklist: document.getElementById('autofill-checklist'),
    resumeName: document.getElementById('resume-name'),
    creditsCount: document.getElementById('credits-count')
};

// 1. App Initialization
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation
    elements.btnAddJobTrigger.addEventListener('click', () => showScreen('addJob'));
    elements.btnCloseForm.addEventListener('click', () => showScreen('dashboard'));

    // Actions
    elements.btnAutofill.addEventListener('click', startAutofill);
    elements.btnSaveJob.addEventListener('click', handleSaveJob);
    elements.btnNextStep.addEventListener('click', handleNextStep);

    // Settings / UI
    document.querySelectorAll('.settings-btn')[2].addEventListener('click', () => {
        // Toggle side panel behavior - simulate close
        window.close();
    });
}

// 2. Auth Logic
let authCheckInterval = null;

async function checkAuth() {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.token) {
            showScreen('auth');
            startAuthPolling();
            return;
        }

        // Token or data changed
        if (response.token !== currentToken || JSON.stringify(response.userData) !== JSON.stringify(currentUser)) {
            currentToken = response.token;
            currentUser = response.userData;

            stopAuthPolling();
            showScreen('dashboard');
            updateProfileUI();
        }
    });
}

function startAuthPolling() {
    if (authCheckInterval) return;
    console.log('[jobNinjas] Starting auth polling...');
    authCheckInterval = setInterval(() => {
        // Only poll if the auth screen is actually visible
        if (!screens.auth.classList.contains('hidden')) {
            checkAuth();
        } else {
            stopAuthPolling();
        }
    }, 3000); // Check every 3 seconds
}

function stopAuthPolling() {
    if (authCheckInterval) {
        console.log('[jobNinjas] Stopping auth polling.');
        clearInterval(authCheckInterval);
        authCheckInterval = null;
    }
}

function updateProfileUI() {
    if (currentUser) {
        const resumeName = currentUser.latestResume?.fileName || currentUser.person?.fullName || currentUser.fullName || currentUser.name || 'Sai_Ram_Resume.docx';
        elements.resumeName.innerText = resumeName;
        elements.creditsCount.innerText = currentUser.plan === 'Pro' ? 'Unlimited' : '10';
    }
}

function showScreen(screenId) {
    Object.keys(screens).forEach(id => {
        if (id === screenId) {
            screens[id].classList.remove('hidden');
        } else {
            screens[id].classList.add('hidden');
        }
    });
}

// 3. Job Handling
function handleSaveJob() {
    const jobData = {
        title: document.getElementById('job-title-input').value,
        url: document.getElementById('job-url-input').value,
        company: document.getElementById('company-name-input').value,
        description: document.getElementById('job-description-input').value
    };

    if (!jobData.title || !jobData.company) {
        alert('Please fill in required fields');
        return;
    }

    // Here we would normally save to backend
    console.log('Saving job match data...', jobData);

    // Simulate matching...
    elements.btnSaveJob.innerText = 'Matching...';
    setTimeout(() => {
        elements.btnSaveJob.innerText = 'Continue';
        showScreen('dashboard');
        // Update dashboard UI state for 'matched'
        elements.btnAddJobTrigger.style.background = 'linear-gradient(to right, #ecfdf5, #ffffff)';
        elements.btnAddJobTrigger.querySelector('p').innerText = `${jobData.title} at ${jobData.company}`;
    }, 1000);
}

// 4. Autofill Logic
function startAutofill() {
    if (!currentUser) return;

    isAutofilling = true;
    elements.btnAutofill.innerText = 'Filling...';
    elements.btnAutofill.classList.add('loading');

    filledFields.clear();
    elements.checklist.innerHTML = '';
    updateProgressUI(0);

    // Send command to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: 'START_AUTOFILL',
            data: {
                ...currentUser,
                // Ensure top-level mappings for backward compatibility in content script
                name: currentUser.person?.fullName || currentUser.name || currentUser.fullName || '',
                firstName: (currentUser.person?.fullName || currentUser.fullName || currentUser.name || '').split(' ')[0],
                lastName: (currentUser.person?.fullName || currentUser.fullName || currentUser.name || '').split(' ').slice(1).join(' '),
                email: currentUser.person?.email || currentUser.email || '',
                phone: currentUser.person?.phone || currentUser.phone || '',
                linkedin: currentUser.person?.linkedinUrl || currentUser.linkedin || '',
                github: currentUser.person?.githubUrl || currentUser.githubUrl || '',
                portfolio: currentUser.person?.portfolioUrl || currentUser.portfolioUrl || '',
                address: currentUser.address?.line1 || currentUser.line1 || currentUser.address || '',
                city: currentUser.address?.city || currentUser.city || '',
                state: currentUser.address?.state || currentUser.state || '',
                zip: currentUser.address?.zip || currentUser.zip || currentUser.postalCode || '',
                country: currentUser.address?.country || currentUser.country || '',
                work_authorization: {
                    authorized_to_work: currentUser.work_authorization?.authorized_to_work || currentUser.authorized_to_work || 'Yes',
                    requires_sponsorship_now: currentUser.work_authorization?.requires_sponsorship_now || currentUser.requires_sponsorship_now || 'No',
                    requires_sponsorship_future: currentUser.work_authorization?.requires_sponsorship_future || currentUser.requires_sponsorship_future || 'No'
                },
                sensitive: {
                    gender: currentUser.sensitive?.gender || currentUser.gender || 'Decline',
                    race: currentUser.sensitive?.race || currentUser.race || 'Decline',
                    disability: currentUser.sensitive?.disability || currentUser.disability || 'No',
                    veteran: currentUser.sensitive?.veteran || currentUser.veteran || 'No'
                }
            }
        }, (response) => {
            const error = chrome.runtime.lastError;
            isAutofilling = false;
            elements.btnAutofill.innerText = 'Autofill';
            elements.btnAutofill.classList.remove('loading');

            if (error) {
                console.warn('[jobNinjas] Autofill failed:', error.message);
                alert('Autofill failed: Please ensure you are on a supported job board and the page is fully loaded.');
                return;
            }

            if (response && response.status === 'completed') {
                showFooterAction(true);
            }
        });
    });
}

// 5. Progress Feedback (Called via messages from content.js)
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'AUTOFILL_TOTAL') {
        totalRequiredFields = message.total || 11;
        updateProgressUI(0);
    }

    if (message.type === 'FIELD_FILLED') {
        filledFields.add(message.label);
        addChecklistItem(message.label, true);

        const percentage = Math.round((filledFields.size / totalRequiredFields) * 100);
        updateProgressUI(percentage);
    }
});

function updateProgressUI(percentage) {
    elements.completionPercentage.innerText = `${percentage}%`;
    elements.progressFill.style.width = `${percentage}%`;
}

function addChecklistItem(label, isDone) {
    // Check if item already exists
    let li = Array.from(elements.checklist.children).find(el => el.getAttribute('data-id') === label);

    if (!li) {
        li = document.createElement('li');
        li.setAttribute('data-id', label);
        li.innerText = label;
        elements.checklist.appendChild(li);
    }

    if (isDone) {
        li.classList.add('done');
    }
}

function showFooterAction(show) {
    if (show) {
        elements.footerActions.classList.remove('hidden');
    } else {
        elements.footerActions.classList.add('hidden');
    }
}

function handleNextStep() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: 'CLICK_NEXT' }, (response) => {
                const error = chrome.runtime.lastError;
                if (error) {
                    console.warn('[jobNinjas] Could not click next:', error.message);
                }
            });
        }
    });
}
