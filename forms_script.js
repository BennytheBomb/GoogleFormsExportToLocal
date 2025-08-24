let currentPage = 1;
const totalPages = 10;

// Question mapping from ID to title
const questionTitles = {};

document.addEventListener('DOMContentLoaded', function() {
    buildQuestionTitleMap();
    loadSavedData();
    updateProgress();
    setupValidation();
    showCurrentPageIndicator();
    setupAutoSave();
});

function setupValidation() {
    // Setup validation for all pages
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setupPageValidation(pageNum);
    }

    // Handle "other" option inputs
    setupOtherOptions();
}

function setupPageValidation(pageNum) {
    const nextBtn = document.getElementById(`nextBtn${pageNum}`) || 
                   document.querySelector(`#page${pageNum} .next-btn`);
    
    if (!nextBtn) return;

    // Get all form elements on this page
    const page = document.getElementById(`page${pageNum}`);
    const inputs = page.querySelectorAll('input[type="text"], input[type="checkbox"], input[type="radio"]');
    
    // Initially check validation
    validatePage(pageNum);
    
    // Add event listeners for real-time validation
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            validatePage(pageNum);
            saveCurrentData();
        });
        input.addEventListener('input', () => {
            validatePage(pageNum);
            saveCurrentData();
        });
    });
}

function validatePage(pageNum) {
    const nextBtn = document.getElementById(`nextBtn${pageNum}`) || 
                   document.querySelector(`#page${pageNum} .next-btn`);
    const page = document.getElementById(`page${pageNum}`);
    
    if (!nextBtn || !page) return;

    let isValid = true;

    // Page 1: Privacy policy is required
    if (pageNum === 1) {
        const privacyCheckbox = document.getElementById('q_2138434720');
        isValid = privacyCheckbox && privacyCheckbox.checked;
    }
    
    // For evaluation pages (5, 7, 9), require system selection
    else if ([5, 7, 9].includes(pageNum)) {
        const systemSelectors = page.querySelectorAll('input[name^="q_"][name$="635"], input[name^="q_"][name$="265"], input[name^="q_"][name$="845"]');
        let systemSelected = false;
        systemSelectors.forEach(input => {
            if (input.checked) systemSelected = true;
        });
        isValid = systemSelected;
    }
    
    // Other pages are optional by default based on the JSON
    else {
        isValid = true;
    }

    nextBtn.disabled = !isValid;
}

function setupOtherOptions() {
    // Handle "other" radio button options
    document.querySelectorAll('input[value="other"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const otherInput = this.parentElement.querySelector('.other-input');
            if (otherInput) {
                otherInput.focus();
            }
        });
    });
}

function setupEvaluationValidation() {
    // Pages 5, 7, and 9 have required system selection
    [5, 7, 9].forEach(pageNum => {
        const nextBtn = document.getElementById(`nextBtn${pageNum}`);
        if (nextBtn) {
            nextBtn.disabled = false; // These are optional in the original form
        }
    });
}

function nextPage() {
    if (currentPage < totalPages) {
        // Hide current page
        document.getElementById(`page${currentPage}`).classList.add('hidden');
        
        // Show next page
        currentPage++;
        document.getElementById(`page${currentPage}`).classList.remove('hidden');
        
        // Update progress and page indicator
        updateProgress();
        showCurrentPageIndicator();
        
        // Save current data
        saveCurrentData();
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
}

function prevPage() {
    if (currentPage > 1) {
        // Hide current page
        document.getElementById(`page${currentPage}`).classList.add('hidden');
        
        // Show previous page
        currentPage--;
        document.getElementById(`page${currentPage}`).classList.remove('hidden');
        
        // Update progress and page indicator
        updateProgress();
        showCurrentPageIndicator();
        
        // Save current data
        saveCurrentData();
        
        // Scroll to top
        window.scrollTo(0, 0);
    }
}

function updateProgress() {
    const progress = document.getElementById('progress');
    const percentage = (currentPage / totalPages) * 100;
    progress.style.width = percentage + '%';
}

function showCurrentPageIndicator() {
    // Add page indicator if it doesn't exist
    let indicator = document.querySelector('.page-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'page-indicator';
        document.querySelector('.container').insertBefore(indicator, document.querySelector('.progress-bar').nextSibling);
    }
    indicator.textContent = `Page ${currentPage} of ${totalPages}`;
}

function submitForm() {
    // Collect all form data
    const formData = {
        submissionTime: new Date().toISOString(),
        sessionId: generateSessionId(),
        responses: {}
    };
    
    // Collect all form responses using unique keys (ID + title)
    // Text inputs
    document.querySelectorAll('input[type="text"]').forEach(input => {
        if (input.id && input.id.startsWith('q_')) {
            const questionTitle = getQuestionTitle(input.id) || input.id;
            const uniqueKey = `${input.id}_${questionTitle}`;
            formData.responses[uniqueKey] = input.value;
        }
    });
    
    // Checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.id && checkbox.id.startsWith('q_')) {
            const questionTitle = getQuestionTitle(checkbox.id) || checkbox.id;
            const uniqueKey = `${checkbox.id}_${questionTitle}`;
            formData.responses[uniqueKey] = checkbox.checked;
        }
    });
    
    // Radio buttons
    document.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
        const name = radio.name;
        if (name && name.startsWith('q_')) {
            const questionTitle = getQuestionTitle(name) || name;
            const uniqueKey = `${name}_${questionTitle}`;
            if (radio.value === 'other') {
                const otherInput = radio.parentElement.querySelector('.other-input');
                formData.responses[uniqueKey] = otherInput ? otherInput.value : 'other';
                formData.responses[uniqueKey + ' (Other)'] = otherInput ? otherInput.value : '';
            } else {
                formData.responses[uniqueKey] = radio.value;
            }
        }
    });
    
    // Mark study as completed
    markStudyCompleted();
    
    // Download the form data as JSON
    downloadFormData(formData);
    
    // Clear saved data
    clearSavedData();
    
    // Show completion message with reset option
    const userChoice = confirm('Thank you for participating in our form! Your responses have been submitted and downloaded.\n\nWould you like to reset the form for a new participant?');
    
    if (userChoice) {
        resetStudy();
    }
}

function resetStudy() {
    // Clear all saved data including completion status
    clearAllSavedData();
    
    // Reset to first page
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.getElementById('page1').classList.remove('hidden');
    currentPage = 1;
    
    // Reset all form inputs
    document.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });
    
    // Reset validation for all buttons
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        validatePage(pageNum);
    }
    
    // Reset progress
    updateProgress();
    showCurrentPageIndicator();
    
    alert('Study has been reset. Ready for a new participant!');
}

function generateSessionId() {
    return 'study_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function downloadFormData(data) {
    // Create a blob with the JSON data
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element for download
    const link = document.createElement('a');
    link.href = url;
    link.download = `user_study_${data.sessionId}.json`;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the temporary URL
    URL.revokeObjectURL(url);
}

function buildQuestionTitleMap() {
    // Build mapping from question IDs to titles by reading the DOM
    document.querySelectorAll('input[id^="q_"], input[name^="q_"]').forEach(input => {
        const id = input.id || input.name;
        if (id && id.startsWith('q_')) {
            const formGroup = input.closest('.form-group');
            if (formGroup) {
                const label = formGroup.querySelector('label');
                if (label && label.textContent) {
                    questionTitles[id] = label.textContent.trim();
                }
            }
        }
    });
}

function getQuestionTitle(questionId) {
    return questionTitles[questionId] || questionId;
}

function setupAutoSave() {
    // Save data every 5 seconds
    setInterval(saveCurrentData, 5000);
    
    // Save on page visibility change (user switching tabs/apps)
    document.addEventListener('visibilitychange', saveCurrentData);
    
    // Save before page unload
    window.addEventListener('beforeunload', saveCurrentData);
}

function saveCurrentData() {
    const saveData = {
        currentPage: currentPage,
        responses: {},
        timestamp: new Date().toISOString()
    };
    
    // Save all current form values
    document.querySelectorAll('input[type="text"]').forEach(input => {
        if (input.id && input.id.startsWith('q_') && input.value) {
            saveData.responses[input.id] = input.value;
        }
    });
    
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.id && checkbox.id.startsWith('q_')) {
            saveData.responses[checkbox.id] = checkbox.checked;
        }
    });
    
    document.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
        const name = radio.name;
        if (name && name.startsWith('q_')) {
            saveData.responses[name] = radio.value;
            // Also save other input if present
            const otherInput = radio.parentElement.querySelector('.other-input');
            if (otherInput && otherInput.value) {
                saveData.responses[name + '_other'] = otherInput.value;
            }
        }
    });
    
    localStorage.setItem('study_progress', JSON.stringify(saveData));
}

function loadSavedData() {
    // Check if study was completed
    if (isStudyCompleted()) {
        // Study was completed, start fresh
        clearAllSavedData();
        return;
    }
    
    const savedData = localStorage.getItem('study_progress');
    if (!savedData) return;
    
    try {
        const data = JSON.parse(savedData);
        
        // Restore current page
        if (data.currentPage && data.currentPage > 1 && data.currentPage <= totalPages) {
            // Hide current page
            document.getElementById(`page${currentPage}`).classList.add('hidden');
            
            // Show saved page
            currentPage = data.currentPage;
            document.getElementById(`page${currentPage}`).classList.remove('hidden');
            
            updateProgress();
            showCurrentPageIndicator();
        }
        
        // Restore form values
        Object.keys(data.responses).forEach(key => {
            const value = data.responses[key];
            
            if (key.endsWith('_other')) {
                // Handle other input
                const baseKey = key.replace('_other', '');
                const otherRadio = document.querySelector(`input[name="${baseKey}"][value="other"]`);
                if (otherRadio) {
                    const otherInput = otherRadio.parentElement.querySelector('.other-input');
                    if (otherInput) {
                        otherInput.value = value;
                    }
                }
            } else {
                const element = document.getElementById(key) || document.querySelector(`input[name="${key}"]`);
                
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else if (element.type === 'radio') {
                        const radioOption = document.querySelector(`input[name="${key}"][value="${value}"]`);
                        if (radioOption) {
                            radioOption.checked = true;
                        }
                    } else {
                        element.value = value;
                    }
                }
            }
        });
        
        // Show restoration message if there was saved data
        if (Object.keys(data.responses).length > 0) {
            const lastSaved = new Date(data.timestamp).toLocaleString();
            alert(`Welcome back! Your progress has been restored from ${lastSaved}.`);
        }
        
    } catch (error) {
        console.error('Error loading saved data:', error);
        localStorage.removeItem('study_progress');
    }
}

function clearSavedData() {
    localStorage.removeItem('study_progress');
}

function markStudyCompleted() {
    localStorage.setItem('study_completed', JSON.stringify({
        completed: true,
        completionTime: new Date().toISOString()
    }));
}

function isStudyCompleted() {
    const completionData = localStorage.getItem('study_completed');
    if (!completionData) return false;
    
    try {
        const data = JSON.parse(completionData);
        return data.completed === true;
    } catch (error) {
        return false;
    }
}

function clearAllSavedData() {
    localStorage.removeItem('study_progress');
    localStorage.removeItem('study_completed');
}

function resetForm() {
    // Clear all saved data including completion status
    clearAllSavedData();
    
    // Reset to first page
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.getElementById('page1').classList.remove('hidden');
    currentPage = 1;
    
    // Reset all form inputs
    document.querySelectorAll('input').forEach(input => {
        if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });
    
    // Reset buttons
    document.querySelectorAll('.next-btn').forEach(btn => {
        if (btn.id === 'nextBtn1') {
            btn.disabled = true;
        } else {
            btn.disabled = false;
        }
    });
    
    // Reset progress
    updateProgress();
    showCurrentPageIndicator();
}

function showCurrentPageIndicator() {
    // Add page indicator if it doesn't exist
    let indicator = document.querySelector('.page-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'page-indicator';
        document.querySelector('.container').insertBefore(indicator, document.querySelector('.progress-bar').nextSibling);
    }
    indicator.textContent = `Page ${currentPage} of ${totalPages}`;
}