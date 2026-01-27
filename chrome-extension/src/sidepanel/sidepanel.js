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
async function checkAuth() {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' }, async (response) => {
        if (response && response.token) {
            currentToken = response.token;
            currentUser = response.userData;

            // Fetch full profile for better autofill
            try {
                const profileRes = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    headers: { 'token': currentToken }
                });
                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    if (profileData.success && profileData.profile) {
                        currentUser = { ...currentUser, ...profileData.profile };
                    }
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            }

            showScreen('dashboard');
            updateProfileUI();
        } else {
            showScreen('auth');
        }
    });
}

function updateProfileUI() {
    if (currentUser) {
        elements.resumeName.innerText = currentUser.name || currentUser.fullName || 'Sai_Ram_Resume.docx';
        elements.creditsCount.innerText = '4'; // Mock credits
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
                name: currentUser.name || currentUser.fullName || 'User Name',
                email: currentUser.email || 'user@example.com',
                phone: currentUser.phone || '',
                linkedin: currentUser.linkedinUrl || '',
                address: currentUser.address || currentUser.street || '',
                city: currentUser.city || '',
                state: currentUser.state || '',
                zip: currentUser.zip || currentUser.postalCode || '',
                gender: currentUser.gender,
                race: currentUser.race,
                disabilityStatus: currentUser.disabilityStatus,
                veteranStatus: currentUser.veteranStatus
            }
        }, (response) => {
            isAutofilling = false;
            elements.btnAutofill.innerText = 'Autofill';
            elements.btnAutofill.classList.remove('loading');

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
        chrome.tabs.sendMessage(tabs[0].id, { type: 'CLICK_NEXT' });
    });
}
