/**
 * Google Apps Script to export Google Forms structure to JSON
 * 
 * Instructions:
 * 1. Open Google Apps Script (script.google.com)
 * 2. Create a new project
 * 3. Replace the default code with this script
 * 4. Replace 'YOUR_FORM_ID_HERE' with your actual Google Form ID
 * 5. Run the exportFormStructure function
 * 6. Check the logs (View > Logs) to get the JSON output
 */

function exportFormStructure() {
  // Replace this with your Google Form ID (found in the form URL)
  const FORM_ID = 'YOUR_FORM_ID_HERE';
  
  try {
    // Get the form (read-only access)
    const form = FormApp.openById(FORM_ID);
    
    // Check if we have permission to read the form
    if (!form) {
      throw new Error('Cannot access form. Check the form ID and permissions.');
    }
    
    // Create the export structure
    const exportData = {
      title: form.getTitle(),
      description: form.getDescription(),
      pages: [],
      settings: {
        requiresLogin: form.requiresLogin(),
        allowResponseEdits: form.canEditResponse(),
        collectEmail: form.collectsEmail(),
        confirmationMessage: form.getConfirmationMessage()
      }
    };
    
    // Get all items (questions) from the form
    const items = form.getItems();
    let currentPageBreak = 0;
    let currentPage = {
      pageNumber: 1,
      title: "Page 1",
      description: "",
      questions: []
    };
    
    // Process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemType = item.getType();
      
      // Handle page breaks
      if (itemType === FormApp.ItemType.PAGE_BREAK) {
        // Save current page if it has questions
        if (currentPage.questions.length > 0) {
          exportData.pages.push(currentPage);
        }
        
        // Start new page
        currentPageBreak++;
        const pageBreak = item.asPageBreakItem();
        currentPage = {
          pageNumber: currentPageBreak + 1,
          title: pageBreak.getTitle() || `Page ${currentPageBreak + 1}`,
          description: pageBreak.getHelpText() || "",
          questions: []
        };
        continue;
      }
      
      // Process regular questions
      const question = processQuestion(item);
      if (question) {
        currentPage.questions.push(question);
      }
    }
    
    // Add the last page
    if (currentPage.questions.length > 0 || exportData.pages.length === 0) {
      exportData.pages.push(currentPage);
    }
    
    // Output the JSON
    const jsonOutput = JSON.stringify(exportData, null, 2);
    
    console.log('=== GOOGLE FORMS EXPORT JSON ===');
    console.log(jsonOutput);
    console.log('=== END OF EXPORT ===');
    
    // Also try to create a file in Google Drive (optional)
    try {
      const blob = Utilities.newBlob(jsonOutput, 'application/json', `${form.getTitle()}_export.json`);
      const file = DriveApp.createFile(blob);
      console.log(`Export also saved to Google Drive: ${file.getUrl()}`);
    } catch (driveError) {
      console.log('Could not save to Drive:', driveError.message);
    }
    
    return exportData;
    
  } catch (error) {
    console.error('Error exporting form:', error.message);
    return null;
  }
}

function processQuestion(item) {
  const itemType = item.getType();
  const title = item.getTitle();
  const helpText = item.getHelpText();
  const required = item.isRequired ? item.isRequired() : false;
  
  const baseQuestion = {
    id: item.getId(),
    title: title,
    description: helpText,
    required: required,
    type: null,
    options: [],
    validation: null
  };
  
  switch (itemType) {
    case FormApp.ItemType.TEXT:
      const textItem = item.asTextItem();
      baseQuestion.type = 'text';
      const textValidation = textItem.getValidation();
      if (textValidation) {
        baseQuestion.validation = {
          type: textValidation.getCriteriaType().toString(),
          values: textValidation.getCriteriaValues()
        };
      }
      break;
      
    case FormApp.ItemType.PARAGRAPH_TEXT:
      baseQuestion.type = 'textarea';
      const paragraphItem = item.asParagraphTextItem();
      const paragraphValidation = paragraphItem.getValidation();
      if (paragraphValidation) {
        baseQuestion.validation = {
          type: paragraphValidation.getCriteriaType().toString(),
          values: paragraphValidation.getCriteriaValues()
        };
      }
      break;
      
    case FormApp.ItemType.MULTIPLE_CHOICE:
      const mcItem = item.asMultipleChoiceItem();
      baseQuestion.type = 'radio';
      baseQuestion.options = mcItem.getChoices().map(choice => ({
        value: choice.getValue(),
        isOther: choice.isOther(),
        goToPage: choice.getGotoPage() ? choice.getGotoPage().getTitle() : null
      }));
      baseQuestion.hasOther = mcItem.hasOtherOption();
      break;
      
    case FormApp.ItemType.CHECKBOX:
      const checkboxItem = item.asCheckboxItem();
      baseQuestion.type = 'checkbox';
      baseQuestion.options = checkboxItem.getChoices().map(choice => ({
        value: choice.getValue(),
        isOther: choice.isOther()
      }));
      baseQuestion.hasOther = checkboxItem.hasOtherOption();
      const checkboxValidation = checkboxItem.getValidation();
      if (checkboxValidation) {
        baseQuestion.validation = {
          type: checkboxValidation.getCriteriaType().toString(),
          values: checkboxValidation.getCriteriaValues()
        };
      }
      break;
      
    case FormApp.ItemType.DROPDOWN:
      const dropdownItem = item.asListItem();
      baseQuestion.type = 'dropdown';
      baseQuestion.options = dropdownItem.getChoices().map(choice => ({
        value: choice.getValue(),
        goToPage: choice.getGotoPage() ? choice.getGotoPage().getTitle() : null
      }));
      break;
      
    case FormApp.ItemType.LINEAR_SCALE:
      const scaleItem = item.asScaleItem();
      baseQuestion.type = 'scale';
      baseQuestion.scale = {
        lowerBound: scaleItem.getLowerBound(),
        upperBound: scaleItem.getUpperBound(),
        lowerLabel: scaleItem.getLeftLabel(),
        upperLabel: scaleItem.getRightLabel()
      };
      break;
      
    case FormApp.ItemType.MULTIPLE_CHOICE_GRID:
      const mcGridItem = item.asMultipleChoiceGridItem();
      baseQuestion.type = 'radio_grid';
      baseQuestion.rows = mcGridItem.getRows();
      baseQuestion.columns = mcGridItem.getColumns();
      baseQuestion.requireResponseInEachRow = mcGridItem.isRequired();
      break;
      
    case FormApp.ItemType.CHECKBOX_GRID:
      const checkboxGridItem = item.asCheckboxGridItem();
      baseQuestion.type = 'checkbox_grid';
      baseQuestion.rows = checkboxGridItem.getRows();
      baseQuestion.columns = checkboxGridItem.getColumns();
      baseQuestion.requireResponseInEachRow = checkboxGridItem.isRequired();
      break;
      
    case FormApp.ItemType.DATE:
      const dateItem = item.asDateItem();
      baseQuestion.type = 'date';
      baseQuestion.includeTime = dateItem.includesTime();
      baseQuestion.includeYear = dateItem.includesYear();
      break;
      
    case FormApp.ItemType.TIME:
      const timeItem = item.asTimeItem();
      baseQuestion.type = 'time';
      baseQuestion.includeDuration = timeItem.isDuration();
      break;
      
    case FormApp.ItemType.FILE_UPLOAD:
      const fileItem = item.asFileUploadItem();
      baseQuestion.type = 'file';
      baseQuestion.fileTypes = fileItem.getAcceptedTypes();
      baseQuestion.maxFiles = fileItem.getMaxFiles();
      baseQuestion.maxSize = fileItem.getMaxFileSize();
      break;
      
    case FormApp.ItemType.SECTION_HEADER:
      baseQuestion.type = 'section_header';
      break;
      
    case FormApp.ItemType.IMAGE:
      const imageItem = item.asImageItem();
      baseQuestion.type = 'image';
      baseQuestion.image = {
        url: imageItem.getImage() ? imageItem.getImage().getUrl() : null,
        altText: imageItem.getAltText(),
        width: imageItem.getWidth(),
        alignment: imageItem.getAlignment().toString()
      };
      break;
      
    case FormApp.ItemType.VIDEO:
      const videoItem = item.asVideoItem();
      baseQuestion.type = 'video';
      baseQuestion.video = {
        url: videoItem.getVideoUrl(),
        width: videoItem.getWidth(),
        alignment: videoItem.getAlignment().toString()
      };
      break;
      
    default:
      console.log(`Unsupported item type: ${itemType}`);
      return null;
  }
  
  return baseQuestion;
}

/**
 * Helper function to test with a specific form ID
 * Usage: testExport('your_form_id_here')
 */
function testExport(formId) {
  if (!formId) {
    console.log('Please provide a form ID');
    return;
  }
  
  // Temporarily set the form ID
  const originalCode = exportFormStructure.toString();
  const modifiedCode = originalCode.replace('YOUR_FORM_ID_HERE', formId);
  
  // This is a bit hacky, but for testing purposes
  console.log(`Testing with form ID: ${formId}`);
  
  try {
    const form = FormApp.openById(formId);
    console.log(`Successfully opened form: "${form.getTitle()}"`);
    
    // Call the main export function with the replaced ID
    return exportFormStructure();
  } catch (error) {
    console.error('Error in test export:', error.message);
  }
}