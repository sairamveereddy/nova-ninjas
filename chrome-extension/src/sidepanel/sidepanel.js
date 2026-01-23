// Side Panel Logic for Nova Ninjas

const API_BASE_URL = 'https://nova-ninjas-production.up.railway.app';

document.addEventListener('DOMContentLoaded', async () => {
    const welcomeScreen = document.getElementById('welcome-screen');
    const loginScreen = document.getElementById('login-screen');
    const autofillStatusScreen = document.getElementById('autofill-status');
    const userEmailSpan = document.getElementById('user-email');
    const startAutofillBtn = document.getElementById('start-autofill');

    let currentUserData = null;
    let currentToken = null;

    // 1. Initial Auth Check
    async function checkAuth() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' }, async (response) => {
                if (response && response.token) {
                    currentToken = response.token;
                    try {
                        const profileResponse = await fetch(`${API_BASE_URL}/api/user/profile`, {
                            headers: { 'token': currentToken }
                        });
                        const data = await profileResponse.json();
                        if (data.success && data.profile) {
                            currentUserData = data.profile;
                            userEmailSpan.textContent = currentUserData.email;

                            // Check if profile is incomplete (is_new or missing key fields)
                            const isIncomplete = currentUserData.is_new ||
                                !currentUserData.phone ||
                                !currentUserData.linkedinUrl;

                            if (isIncomplete) {
                                showScreen('profile-setup-screen');
                                // Pre-fill name and available EEO if we have it
                                if (currentUserData.fullName) document.getElementById('setup-fullname').value = currentUserData.fullName;
                                if (currentUserData.gender) document.getElementById('setup-gender').value = currentUserData.gender;
                                if (currentUserData.race) document.getElementById('setup-race').value = currentUserData.race;
                            } else {
                                showScreen('welcome-screen');
                            }
                            resolve(true);
                            return;
                        }
                    } catch (err) {
                        console.error('Error fetching profile:', err);
                    }
                }
                showScreen('login-screen');
                resolve(false);
            });
        });
    }

    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        const target = document.getElementById(screenId);
        if (target) target.classList.remove('hidden');
    }

    // Run auth check
    await checkAuth();

    // 2. Profile Setup Logic
    const profileForm = document.getElementById('profile-setup-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('setup-fullname').value;
            const phone = document.getElementById('setup-phone').value;
            const linkedinUrl = document.getElementById('setup-linkedin').value;
            const gender = document.getElementById('setup-gender').value;
            const race = document.getElementById('setup-race').value;

            try {
                const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'token': currentToken
                    },
                    body: JSON.stringify({ fullName, phone, linkedinUrl, gender, race })
                });

                const data = await response.json();
                if (data.success) {
                    currentUserData = { ...currentUserData, fullName, phone, linkedinUrl, gender, race, is_new: false };
                    userEmailSpan.textContent = currentUserData.email;
                    showScreen('welcome-screen');
                } else {
                    alert('Failed to save profile: ' + (data.detail || 'Unknown error'));
                }
            } catch (err) {
                console.error('Error saving profile:', err);
            }
        });
    }

    // 3. Autofill Logic
    let totalFields = 0;
    let filledFields = 0;

    startAutofillBtn.addEventListener('click', async () => {
        if (!currentUserData) {
            alert('Please login first');
            return;
        }

        showScreen('autofill-status');
        resetChecks();

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            chrome.tabs.sendMessage(tab.id, {
                type: 'START_AUTOFILL',
                data: {
                    name: currentUserData.fullName,
                    email: currentUserData.email,
                    phone: currentUserData.phone || '',
                    linkedin: currentUserData.linkedinUrl || '',
                    gender: currentUserData.gender || '',
                    race: currentUserData.race || '',
                    resume: currentUserData.resumeFileName || ''
                }
            });
        }
    });

    // 4. Listen for Real-time Progress (Phase 3)
    chrome.runtime.onMessage.addListener((message) => {
        const fieldCountSpan = document.getElementById('field-count');
        const percentageSpan = document.getElementById('percentage-text');
        const progressFill = document.querySelector('.progress-fill');
        const checklist = document.getElementById('live-checklist');

        if (message.type === 'AUTOFILL_TOTAL') {
            totalFields = message.total;
            filledFields = 0;
            updateUI();
        } else if (message.type === 'FIELD_FILLED') {
            filledFields++;
            updateUI();

            // Add to checklist
            const li = document.createElement('li');
            li.className = 'done';
            li.textContent = message.label || 'Field';
            checklist.appendChild(li);
            checklist.scrollTop = checklist.scrollHeight;
        }

        function updateUI() {
            const percent = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
            fieldCountSpan.textContent = `${filledFields} out of ${totalFields}`;
            percentageSpan.textContent = `${percent}%`;
            progressFill.style.width = `${percent}%`;

            if (percent >= 100) {
                document.getElementById('autofill-title').textContent = 'Autofill Complete!';
            }
        }
    });

    function resetChecks() {
        totalFields = 0;
        filledFields = 0;
        document.getElementById('live-checklist').innerHTML = '';
        document.getElementById('field-count').textContent = '0 out of 0';
        document.getElementById('percentage-text').textContent = '0%';
        document.querySelector('.progress-fill').style.width = '0%';
        document.getElementById('autofill-title').textContent = 'Filling..';
    }
});
