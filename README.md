# GoogleFormsExportToLocal
Exports a Google Forms and generates a local website to use.

- Supports handful of question types
- Saves user progress (even on web page reload)
- Downloads questions at the end
- Reset at the end

## How to use
1. On your Forms add a new AppScript and paste the `google_forms_exporter.js` code inside.
2. Copy the Forms ID from the Forms URL (the edit view, not the participant view) into the **two** strings that say 'YOUR_FORM_ID_HERE'.
3. This will ask for permission to access your Google Account, say yes.
4. Run the script and download the `export.json` that gets generated into your Google Drive.
5. Run `node generate_study.js` with the `export.json` in the same directory.
6. Open the generated `forms.html` (make sure that `forms_script.js` and `forms_styles.css` are both in the same directory.
