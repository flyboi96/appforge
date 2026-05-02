import { detectIntent, type AppIntent } from './intentDetection'
import type { AppSpec, GeneratedAppDraft } from '../types/appSpec'

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const titleFromPrompt = (prompt: string, fallback: string) => {
  const cleaned = prompt
    .replace(/^make me an app to\s+/i, '')
    .replace(/^make me\s+/i, '')
    .replace(/^an app to\s+/i, '')
    .trim()

  if (!cleaned) {
    return fallback
  }

  const words = cleaned.split(/\s+/).slice(0, 5)
  return words
    .join(' ')
    .replace(/[.?!,]+$/g, '')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const makeSpec = (
  base: Omit<AppSpec, 'id' | 'createdAt' | 'updatedAt' | 'version'>,
): AppSpec => {
  const now = new Date().toISOString()

  return {
    ...base,
    id: createId(),
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
}

const introBlocks = (title: string, description: string) => [
  {
    id: 'intro-heading',
    type: 'heading' as const,
    level: 1 as const,
    text: title,
  },
  {
    id: 'intro-copy',
    type: 'paragraph' as const,
    text: description,
  },
]

const buildOutfitSpec = () =>
  makeSpec({
    name: 'Outfit Planner',
    description:
      'Randomize outfit combinations and keep a simple history of what you wore.',
    category: 'planner',
    icon: '👕',
    dataStores: [{ id: 'outfit-history', name: 'Wear history', type: 'history' }],
    screens: [
      {
        id: 'closet',
        title: 'Closet',
        description: 'Edit the source lists used by the outfit randomizer.',
        blocks: [
          ...introBlocks(
            'Outfit Planner',
            'Add clothing options, generate a combination, and log what you wore.',
          ),
          {
            id: 'shirts',
            type: 'listEditor',
            label: 'Shirts',
            placeholder: 'Add a shirt',
            defaultItems: ['Black tee', 'Gray tee', 'Blue button-down'],
          },
          {
            id: 'pants',
            type: 'listEditor',
            label: 'Pants',
            placeholder: 'Add pants',
            defaultItems: ['Jeans', 'Black joggers', 'Khaki pants'],
          },
        ],
      },
      {
        id: 'generate',
        title: 'Generate',
        blocks: [
          {
            id: 'outfit-randomizer',
            type: 'randomizer',
            label: 'Outfit combo',
            resultLabel: 'Suggested outfit',
            buttonLabel: 'Generate outfit',
            sourceBlockIds: ['shirts', 'pants'],
          },
          {
            id: 'wear-log',
            type: 'savedEntryList',
            storeId: 'outfit-history',
            label: 'Wear history',
            submitLabel: 'Log outfit',
            emptyText: 'No outfits logged yet.',
            fields: [
              { id: 'date', label: 'Date', inputType: 'date' },
              {
                id: 'outfit',
                label: 'Outfit',
                inputType: 'text',
                placeholder: 'Black tee + jeans',
              },
              {
                id: 'notes',
                label: 'Notes',
                inputType: 'textarea',
                placeholder: 'Weather, setting, or repeats to avoid',
              },
            ],
          },
          {
            id: 'wear-table',
            type: 'simpleTable',
            storeId: 'outfit-history',
            label: 'Recent outfits',
            emptyText: 'Logged outfits will appear here.',
            columns: [
              { fieldId: 'date', label: 'Date' },
              { fieldId: 'outfit', label: 'Outfit' },
            ],
          },
        ],
      },
    ],
  })

const buildWorkoutSpec = () =>
  makeSpec({
    name: 'Workout Log',
    description: 'Log workouts and review recent lifts, runs, or sessions.',
    category: 'tracker',
    icon: '🏋️',
    dataStores: [{ id: 'workouts', name: 'Workout entries', type: 'entries' }],
    screens: [
      {
        id: 'log',
        title: 'Log',
        blocks: [
          ...introBlocks(
            'Workout Log',
            'Save each session with movement, effort, and notes.',
          ),
          {
            id: 'workout-entry',
            type: 'savedEntryList',
            storeId: 'workouts',
            label: 'New workout',
            submitLabel: 'Save workout',
            emptyText: 'No workouts yet.',
            fields: [
              { id: 'date', label: 'Date', inputType: 'date' },
              {
                id: 'movement',
                label: 'Movement',
                inputType: 'text',
                placeholder: 'Squat, run, pull-ups',
              },
              {
                id: 'result',
                label: 'Result',
                inputType: 'text',
                placeholder: '3x5 at 185, 5K in 24:00',
              },
              {
                id: 'notes',
                label: 'Notes',
                inputType: 'textarea',
                placeholder: 'How it felt, PRs, or adjustments',
              },
            ],
          },
        ],
      },
      {
        id: 'history',
        title: 'History',
        blocks: [
          {
            id: 'workout-table',
            type: 'simpleTable',
            storeId: 'workouts',
            label: 'Recent sessions',
            emptyText: 'Saved workouts will appear here.',
            columns: [
              { fieldId: 'date', label: 'Date' },
              { fieldId: 'movement', label: 'Movement' },
              { fieldId: 'result', label: 'Result' },
            ],
          },
        ],
      },
    ],
  })

const buildPackingSpec = () =>
  makeSpec({
    name: 'Packing Planner',
    description: 'Plan trip essentials, checklist progress, and notes.',
    category: 'planner',
    icon: '🎒',
    dataStores: [{ id: 'trip-notes', name: 'Trip notes', type: 'entries' }],
    screens: [
      {
        id: 'plan',
        title: 'Plan',
        blocks: [
          ...introBlocks(
            'Packing Planner',
            'Keep the trip context and essentials in one compact checklist.',
          ),
          {
            id: 'trip-name',
            type: 'textInput',
            label: 'Trip',
            placeholder: 'Weekend trip',
          },
          {
            id: 'trip-type',
            type: 'select',
            label: 'Trip type',
            defaultValue: 'short',
            options: [
              { id: 'short', label: 'Short trip', value: 'short' },
              { id: 'work', label: 'Work trip', value: 'work' },
              { id: 'outdoor', label: 'Outdoor trip', value: 'outdoor' },
            ],
          },
          {
            id: 'packing-checklist',
            type: 'checkboxList',
            label: 'Essentials',
            items: [
              { id: 'wallet', label: 'Wallet' },
              { id: 'charger', label: 'Phone charger' },
              { id: 'clothes', label: 'Clothes' },
              { id: 'toiletries', label: 'Toiletries' },
              { id: 'meds', label: 'Medication' },
            ],
          },
          {
            id: 'packed-count',
            type: 'computedValue',
            label: 'Progress',
            resultLabel: 'Packed items',
            operation: { type: 'countChecked', inputId: 'packing-checklist' },
          },
        ],
      },
      {
        id: 'notes',
        title: 'Notes',
        blocks: [
          {
            id: 'trip-note-list',
            type: 'savedEntryList',
            storeId: 'trip-notes',
            label: 'Trip notes',
            submitLabel: 'Save note',
            fields: [
              { id: 'date', label: 'Date', inputType: 'date' },
              {
                id: 'note',
                label: 'Note',
                inputType: 'textarea',
                placeholder: 'Weather, events, or special reminders',
              },
            ],
          },
        ],
      },
    ],
  })

const buildPaceSpec = () =>
  makeSpec({
    name: 'Run Pace Calculator',
    description: 'Calculate pace from distance and total time.',
    category: 'calculator',
    icon: '🏃',
    dataStores: [],
    screens: [
      {
        id: 'calculator',
        title: 'Calculator',
        blocks: [
          ...introBlocks(
            'Run Pace Calculator',
            'Enter distance and total minutes to get pace per mile or kilometer.',
          ),
          {
            id: 'distance',
            type: 'numberInput',
            label: 'Distance',
            unit: 'mi/km',
            placeholder: '3.1',
          },
          {
            id: 'minutes',
            type: 'numberInput',
            label: 'Total minutes',
            unit: 'min',
            placeholder: '30',
          },
          {
            id: 'pace',
            type: 'computedValue',
            label: 'Pace',
            resultLabel: 'Pace',
            operation: {
              type: 'pace',
              distanceInputId: 'distance',
              minutesInputId: 'minutes',
            },
          },
          {
            id: 'reset-pace',
            type: 'button',
            text: 'Clear inputs',
            action: { type: 'clearValues', blockIds: ['distance', 'minutes'] },
          },
        ],
      },
    ],
  })

const buildDecisionSpec = () =>
  makeSpec({
    name: 'Decision Guide',
    description: 'Clarify a decision and score the criteria that matter.',
    category: 'decision',
    icon: '🧭',
    dataStores: [{ id: 'decisions', name: 'Decision notes', type: 'entries' }],
    screens: [
      {
        id: 'guide',
        title: 'Guide',
        blocks: [
          ...introBlocks(
            'Decision Guide',
            'Frame the question, set a priority, and check what is true.',
          ),
          {
            id: 'decision-question',
            type: 'textInput',
            label: 'Decision',
            placeholder: 'What are you deciding?',
          },
          {
            id: 'priority',
            type: 'select',
            label: 'Top priority',
            defaultValue: 'confidence',
            options: [
              { id: 'speed', label: 'Speed', value: 'speed' },
              { id: 'cost', label: 'Cost', value: 'cost' },
              { id: 'quality', label: 'Quality', value: 'quality' },
              { id: 'confidence', label: 'Confidence', value: 'confidence' },
            ],
          },
          {
            id: 'decision-checks',
            type: 'checkboxList',
            label: 'Criteria met',
            items: [
              { id: 'goal', label: 'Fits the goal' },
              { id: 'risk', label: 'Risk is acceptable' },
              { id: 'reversible', label: 'Easy to reverse later' },
              { id: 'next', label: 'Next step is clear' },
            ],
          },
          {
            id: 'decision-score',
            type: 'computedValue',
            label: 'Signal',
            resultLabel: 'Criteria checked',
            operation: { type: 'countChecked', inputId: 'decision-checks' },
          },
        ],
      },
      {
        id: 'notes',
        title: 'Notes',
        blocks: [
          {
            id: 'decision-entry',
            type: 'savedEntryList',
            storeId: 'decisions',
            label: 'Decision notes',
            submitLabel: 'Save note',
            fields: [
              {
                id: 'option',
                label: 'Option',
                inputType: 'text',
                placeholder: 'Option A',
              },
              {
                id: 'notes',
                label: 'Notes',
                inputType: 'textarea',
                placeholder: 'Tradeoffs, concerns, or next action',
              },
            ],
          },
        ],
      },
    ],
  })

const buildReferenceSpec = (prompt: string) =>
  makeSpec({
    name: titleFromPrompt(prompt, 'Reference Guide'),
    description: 'Capture reference notes and quick lookup entries.',
    category: 'reference',
    icon: '📚',
    dataStores: [{ id: 'references', name: 'Reference entries', type: 'entries' }],
    screens: [
      {
        id: 'overview',
        title: 'Guide',
        blocks: [
          ...introBlocks(
            titleFromPrompt(prompt, 'Reference Guide'),
            'Store short reference entries for later lookup.',
          ),
          {
            id: 'topic',
            type: 'textInput',
            label: 'Current topic',
            placeholder: 'Topic or area',
          },
          {
            id: 'summary',
            type: 'textarea',
            label: 'Quick summary',
            placeholder: 'Key details to remember',
          },
        ],
      },
      {
        id: 'entries',
        title: 'Entries',
        blocks: [
          {
            id: 'reference-entry',
            type: 'savedEntryList',
            storeId: 'references',
            label: 'Reference entries',
            submitLabel: 'Save reference',
            fields: [
              { id: 'title', label: 'Title', inputType: 'text' },
              { id: 'body', label: 'Details', inputType: 'textarea' },
            ],
          },
        ],
      },
    ],
  })

const buildStudySpec = () =>
  makeSpec({
    name: 'Study Flashcards',
    description: 'Create flashcards and track study prompts.',
    category: 'study',
    icon: '🧠',
    dataStores: [{ id: 'cards', name: 'Flashcards', type: 'entries' }],
    screens: [
      {
        id: 'cards',
        title: 'Cards',
        blocks: [
          ...introBlocks(
            'Study Flashcards',
            'Save question and answer pairs for quick review.',
          ),
          {
            id: 'card-entry',
            type: 'savedEntryList',
            storeId: 'cards',
            label: 'Flashcards',
            submitLabel: 'Add card',
            fields: [
              {
                id: 'question',
                label: 'Question',
                inputType: 'textarea',
                placeholder: 'What is the concept?',
              },
              {
                id: 'answer',
                label: 'Answer',
                inputType: 'textarea',
                placeholder: 'Explain it simply',
              },
            ],
          },
        ],
      },
      {
        id: 'review',
        title: 'Review',
        blocks: [
          {
            id: 'card-table',
            type: 'simpleTable',
            storeId: 'cards',
            label: 'Saved cards',
            emptyText: 'Add flashcards to review them here.',
            columns: [
              { fieldId: 'question', label: 'Question' },
              { fieldId: 'answer', label: 'Answer' },
            ],
          },
        ],
      },
    ],
  })

const buildRestaurantSpec = () =>
  makeSpec({
    name: 'Restaurant Tracker',
    description: 'Track restaurants to try and what you thought afterward.',
    category: 'restaurant',
    icon: '🍽️',
    dataStores: [{ id: 'restaurants', name: 'Restaurants', type: 'entries' }],
    screens: [
      {
        id: 'add',
        title: 'Add',
        blocks: [
          ...introBlocks(
            'Restaurant Tracker',
            'Save places to try, cuisine, status, and notes.',
          ),
          {
            id: 'restaurant-entry',
            type: 'savedEntryList',
            storeId: 'restaurants',
            label: 'Restaurants',
            submitLabel: 'Save restaurant',
            fields: [
              { id: 'name', label: 'Name', inputType: 'text' },
              {
                id: 'cuisine',
                label: 'Cuisine',
                inputType: 'text',
                placeholder: 'Thai, tacos, diner',
              },
              {
                id: 'status',
                label: 'Status',
                inputType: 'select',
                options: [
                  { id: 'want', label: 'Want to try', value: 'Want to try' },
                  { id: 'tried', label: 'Tried', value: 'Tried' },
                  { id: 'favorite', label: 'Favorite', value: 'Favorite' },
                ],
              },
              { id: 'notes', label: 'Notes', inputType: 'textarea' },
            ],
          },
        ],
      },
      {
        id: 'list',
        title: 'List',
        blocks: [
          {
            id: 'restaurant-table',
            type: 'simpleTable',
            storeId: 'restaurants',
            label: 'Saved restaurants',
            emptyText: 'Restaurants will appear here.',
            columns: [
              { fieldId: 'name', label: 'Name' },
              { fieldId: 'cuisine', label: 'Cuisine' },
              { fieldId: 'status', label: 'Status' },
            ],
          },
        ],
      },
    ],
  })

const buildCalculatorSpec = () =>
  makeSpec({
    name: 'Simple Calculator',
    description: 'Add two numbers using generated input and computed blocks.',
    category: 'calculator',
    icon: '🧮',
    dataStores: [],
    screens: [
      {
        id: 'calculator',
        title: 'Calculator',
        blocks: [
          ...introBlocks('Simple Calculator', 'Enter two values to calculate a total.'),
          { id: 'a', type: 'numberInput', label: 'First value', placeholder: '0' },
          { id: 'b', type: 'numberInput', label: 'Second value', placeholder: '0' },
          {
            id: 'total',
            type: 'computedValue',
            label: 'Total',
            operation: { type: 'add', inputIds: ['a', 'b'] },
            precision: 2,
          },
        ],
      },
    ],
  })

const buildChecklistSpec = (prompt: string) =>
  makeSpec({
    name: titleFromPrompt(prompt, 'Checklist'),
    description: 'A generated checklist with progress tracking.',
    category: 'checklist',
    icon: '✅',
    dataStores: [],
    screens: [
      {
        id: 'checklist',
        title: 'Checklist',
        blocks: [
          ...introBlocks(titleFromPrompt(prompt, 'Checklist'), 'Check off progress as you go.'),
          {
            id: 'items',
            type: 'checkboxList',
            label: 'Items',
            items: [
              { id: 'item-1', label: 'First step' },
              { id: 'item-2', label: 'Second step' },
              { id: 'item-3', label: 'Final check' },
            ],
          },
          {
            id: 'done-count',
            type: 'computedValue',
            label: 'Progress',
            operation: { type: 'countChecked', inputId: 'items' },
          },
        ],
      },
    ],
  })

const buildGenericSpec = (prompt: string) =>
  makeSpec({
    name: titleFromPrompt(prompt, 'Custom App'),
    description:
      'A generated workspace with notes, inputs, and saved entries for your idea.',
    category: 'custom',
    icon: '✨',
    dataStores: [{ id: 'entries', name: 'Saved entries', type: 'entries' }],
    screens: [
      {
        id: 'workspace',
        title: 'Workspace',
        blocks: [
          ...introBlocks(
            titleFromPrompt(prompt, 'Custom App'),
            'This draft captures the idea as a simple usable local app.',
          ),
          {
            id: 'primary-input',
            type: 'textInput',
            label: 'Primary item',
            placeholder: 'Name, task, option, or topic',
          },
          {
            id: 'notes',
            type: 'textarea',
            label: 'Notes',
            placeholder: 'Details, context, or next steps',
          },
          {
            id: 'ready',
            type: 'checkbox',
            text: 'Ready for next action',
          },
        ],
      },
      {
        id: 'log',
        title: 'Log',
        blocks: [
          {
            id: 'entry-list',
            type: 'savedEntryList',
            storeId: 'entries',
            label: 'Saved entries',
            submitLabel: 'Save entry',
            emptyText: 'No entries yet.',
            fields: [
              {
                id: 'title',
                label: 'Title',
                inputType: 'text',
                placeholder: 'Entry title',
              },
              {
                id: 'notes',
                label: 'Notes',
                inputType: 'textarea',
                placeholder: 'What should be remembered?',
              },
            ],
          },
          {
            id: 'entry-table',
            type: 'simpleTable',
            storeId: 'entries',
            label: 'Recent entries',
            columns: [
              { fieldId: 'title', label: 'Title' },
              { fieldId: 'notes', label: 'Notes' },
            ],
          },
        ],
      },
    ],
  })

const builders: Record<AppIntent, (prompt: string) => AppSpec> = {
  outfit: buildOutfitSpec,
  workout: buildWorkoutSpec,
  packing: buildPackingSpec,
  pace: buildPaceSpec,
  decision: buildDecisionSpec,
  reference: buildReferenceSpec,
  study: buildStudySpec,
  restaurant: buildRestaurantSpec,
  calculator: buildCalculatorSpec,
  checklist: buildChecklistSpec,
  generic: buildGenericSpec,
}

const assumptionsForIntent: Record<AppIntent, string[]> = {
  outfit: [
    'Use editable source lists for clothing options.',
    'Track wear history manually after generating an outfit.',
  ],
  workout: [
    'Treat each workout as a saved log entry.',
    'Show recent sessions in a simple table.',
  ],
  packing: [
    'Start with a reusable essentials checklist.',
    'Use saved notes for trip-specific reminders.',
  ],
  pace: [
    'Use distance and total minutes as inputs.',
    'Show pace as minutes per distance unit.',
  ],
  decision: [
    'Use checked criteria as a simple decision signal.',
    'Store notes for options and tradeoffs.',
  ],
  reference: [
    'Use saved entries as reference cards.',
    'Keep the first screen as a quick summary workspace.',
  ],
  study: [
    'Represent flashcards as saved question and answer entries.',
    'Use a table for lightweight review.',
  ],
  restaurant: [
    'Track restaurants as saved entries.',
    'Include status so places can move from want-to-try to tried.',
  ],
  calculator: [
    'Use safe computed operations instead of generated code.',
    'Start with addition because the prompt did not specify another operation.',
  ],
  checklist: [
    'Generate a starter checklist with progress count.',
    'Items can be checked locally while using the app.',
  ],
  generic: [
    'The prompt was broad, so AppForge created a flexible notes and log app.',
    'A future AI backend could ask follow-up questions before generation.',
  ],
}

export const generateMockAppSpec = (prompt: string): GeneratedAppDraft => {
  const intent = detectIntent(prompt)
  const appSpec = builders[intent](prompt)

  return {
    prompt,
    assumptions: assumptionsForIntent[intent],
    appSpec,
  }
}
