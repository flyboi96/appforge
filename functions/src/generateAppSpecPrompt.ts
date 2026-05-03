export const appSpecModelSummary = `
AppSpec:
- id, name, description, category, icon, version, createdAt, updatedAt
- dataStores: [{ id, name, type: entries | history | list | table }]
- screens: [{ id, title, description, blocks }]

Allowed categories:
calculator, checklist, tracker, planner, routine, reference, study, restaurant,
decision, custom.

Allowed blocks:
- heading: text, level
- paragraph: text
- textInput: label, placeholder, defaultValue
- numberInput: label, placeholder, defaultValue, unit
- textarea: label, placeholder, defaultValue
- select: label, options, defaultValue
- checkbox: text, defaultValue
- checkboxList: label, items
- button: text, action clearValues or setValue
- computedValue: operation add/subtract/multiply/divide/concat/countChecked/randomChoice/pace
- savedEntryList: storeId, fields, submitLabel, emptyText
- listEditor: placeholder, addLabel, defaultItems
- randomizer: sourceBlockIds
- simpleTable: storeId, columns
`.trim()

export const buildGenerateAppSpecInput = (
  prompt: string,
  existingAppSpecModelSummary?: string,
) => `
Create a useful AppForge mini-app spec from the user's idea.

User idea:
${prompt}

Current AppSpec model:
${existingAppSpecModelSummary?.trim() || appSpecModelSummary}

Generation rules:
- Return only JSON that matches the supplied response schema.
- Use only supported categories, data store types, block types, field types, and computed operations.
- Do not generate source code, HTML, JavaScript, APIs, Firebase config, auth, payments, or network calls.
- Make the app useful, not a shallow demo.
- Prefer 2 to 4 screens with practical names such as Overview, Capture, Log, History, Review, Settings, or Notes.
- Use dataStores when savedEntryList or simpleTable blocks need persistent records.
- Use a single emoji for icon. Never use an icon word like clipboard, checklist, or calculator.
- Make block ids stable, lowercase, and unique.
- Keep copy concise and mobile-friendly.
- For unsupported requests, create the closest safe local-only AppForge mini-app.
- Put any limitations, assumptions, or omitted unsupported features in warnings.
`.trim()
