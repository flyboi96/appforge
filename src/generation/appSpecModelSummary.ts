export const appSpecModelSummary = `
AppSpec includes id, name, description, category, icon, version, createdAt,
updatedAt, dataStores, and screens. Screens include id, title, description,
and blocks. Supported blocks: heading, paragraph, textInput, numberInput,
textarea, select, checkbox, checkboxList, button, computedValue,
savedEntryList, listEditor, randomizer, simpleTable. Button blocks only
support clearValues and setValue actions; use block-native controls for
generated lists, saved entries, random picks, and computed output.
Supported categories:
calculator, checklist, tracker, planner, routine, reference, study, restaurant,
decision, custom.
`.trim()
