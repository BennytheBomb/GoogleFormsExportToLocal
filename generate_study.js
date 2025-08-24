// Generator script to create complete forms website from export.json
const fs = require('fs');
const path = require('path');

// Load the export data
const exportData = JSON.parse(fs.readFileSync('./export.json', 'utf8'));

function generateHTML() {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exportData.title}</title>
    <link rel="stylesheet" href="forms_styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>${exportData.title}</h1>
        </header>

        <div class="progress-bar">
            <div class="progress" id="progress"></div>
        </div>
`;

    // Generate each page
    exportData.pages.forEach((page, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === exportData.pages.length - 1;
        
        html += `
        <!-- Page ${page.pageNumber}: ${page.title} -->
        <div class="page${isFirstPage ? '' : ' hidden'}" id="page${page.pageNumber}">
            <div class="content">`;

        // Add page title if not first page
        if (!isFirstPage && page.title && page.title !== `Page ${page.pageNumber}`) {
            html += `<h2>${page.title}</h2>`;
        }

        // Add page description
        if (page.description) {
            html += `<div class="description">`;
            const paragraphs = page.description.split('\n\n');
            paragraphs.forEach(para => {
                if (para.trim()) {
                    html += `<p>${para.trim()}</p>`;
                }
            });
            html += `</div>`;
        }

        // Add description from first page if it's the first page
        if (isFirstPage && exportData.description) {
            html += `<div class="description">`;
            const paragraphs = exportData.description.split('\n\n');
            paragraphs.forEach(para => {
                if (para.trim()) {
                    html += `<p>${para.trim()}</p>`;
                }
            });
            html += `</div>`;
        }

        // Generate questions for this page
        page.questions.forEach(question => {
            html += generateQuestion(question);
        });

        html += `
            </div>
            <div class="button-container${isFirstPage ? ' single-button' : ''}">`;

        // Add back button for pages 2 and onwards
        if (!isFirstPage) {
            html += `<button class="back-btn" onclick="prevPage()">Back</button>`;
        }

        // Add next/submit button with reset option on last page
        if (isLastPage) {
            html += `
                <div>
                    <button class="next-btn" id="nextBtn${page.pageNumber}" ${needsValidation(page) ? 'disabled' : ''} onclick="submitForm()">Submit Study</button>
                    <button class="reset-btn" onclick="resetStudy()">Reset Study</button>
                </div>`;
        } else {
            html += `<button class="next-btn" id="nextBtn${page.pageNumber}" ${needsValidation(page) ? 'disabled' : ''} onclick="nextPage()">Next</button>`;
        }

        html += `
            </div>
        </div>`;
    });

    html += `
    </div>
    <script src="forms_script.js"></script>
</body>
</html>`;

    return html;
}

function generateQuestion(question) {
    let html = '';

    switch (question.type) {
        case 'checkbox':
            html += `
                <div class="form-group">
                    <label>${question.title}</label>
                    ${question.description ? `<p class="question-description">${question.description}</p>` : ''}
                    <div class="checkbox-group">`;
            
            question.options.forEach((option, index) => {
                const questionId = question.options.length === 1 ? `q_${question.id}` : `q_${question.id}_${index}`;
                html += `
                        <label class="checkbox-container">
                            <input type="checkbox" id="${questionId}" name="q_${question.id}" value="${option.value}">
                            <span class="checkmark"></span>
                            ${option.value}
                        </label>`;
            });
            
            html += `
                    </div>
                </div>`;
            break;

        case 'radio':
            html += `
                <div class="form-group">
                    <label>${question.title}</label>
                    ${question.description ? `<p class="question-description">${question.description}</p>` : ''}
                    <div class="radio-group">`;
            
            question.options.forEach((option, index) => {
                html += `
                        <label class="radio-container">
                            <input type="radio" name="q_${question.id}" value="${option.value}" ${question.required ? 'required' : ''}>
                            <span class="radio-checkmark"></span>
                            ${option.value}
                        </label>`;
            });

            if (question.hasOther) {
                html += `
                        <label class="radio-container">
                            <input type="radio" name="q_${question.id}" value="other">
                            <span class="radio-checkmark"></span>
                            Other: <input type="text" class="other-input" placeholder="Please specify">
                        </label>`;
            }
            
            html += `
                    </div>
                </div>`;
            break;

        case 'text':
            html += `
                <div class="form-group">
                    <label for="q_${question.id}">${question.title}</label>
                    ${question.description ? `<p class="question-description">${question.description}</p>` : ''}
                    <input type="text" id="q_${question.id}" ${question.required ? 'required' : ''} placeholder="${question.title}">
                </div>`;
            break;

        case 'scale':
            const scale = question.scale;
            html += `
                <div class="form-group">
                    <label>${question.title}</label>
                    ${question.description ? `<p class="question-description">${question.description}</p>` : ''}
                    <div class="likert-scale">
                        <div class="scale-labels">
                            <span>${scale.lowerLabel}</span>
                            <span>${scale.upperLabel}</span>
                        </div>
                        <div class="scale-options">`;
            
            for (let i = scale.lowerBound; i <= scale.upperBound; i++) {
                html += `
                            <label class="scale-option">
                                <input type="radio" name="q_${question.id}" value="${i}" ${question.required ? 'required' : ''}>
                                <span class="scale-number">${i}</span>
                            </label>`;
            }
            
            html += `
                        </div>
                    </div>
                </div>`;
            break;

        case 'section_header':
            html += `
                <div class="section-header">
                    <h3>${question.title}</h3>
                    ${question.description ? `<p>${question.description}</p>` : ''}
                </div>`;
            break;

        case 'image':
            html += `
                <div class="form-group">
                    <div class="image-placeholder">
                        <p><strong>${question.title}</strong></p>
                        <div class="image-container">
                            <img src="park.jpg" alt="${question.title}" style="width: ${question.image?.width || 'auto'}px; max-width: 100%; height: auto;">
                        </div>
                    </div>
                </div>`;
            break;

        default:
            console.log(`Unsupported question type: ${question.type}`);
            break;
    }

    return html;
}

function needsValidation(page) {
    // Page 1 needs validation (privacy policy checkbox)
    // Evaluation pages (5, 7, 9) need system selection
    return page.pageNumber === 1 || [5, 7, 9].includes(page.pageNumber);
}

// Generate and save the HTML file
const htmlContent = generateHTML();
fs.writeFileSync('./user_study_complete.html', htmlContent);

console.log('Complete Forms HTML generated successfully!');
console.log('File saved as: forms.html');
console.log(`Generated ${exportData.pages.length} pages with ${exportData.pages.reduce((total, page) => total + page.questions.length, 0)} total questions.`);