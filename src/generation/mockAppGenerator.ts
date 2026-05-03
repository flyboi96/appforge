import { detectIntent, type AppIntent } from './intentDetection'
import type {
  AppBlock,
  AppSpec,
  GeneratedAppDraft,
  SavedEntryField,
  SelectOption,
} from '../types/appSpec'

type AppSpecBase = Omit<AppSpec, 'id' | 'createdAt' | 'updatedAt' | 'version'>

interface PromptAnalysis {
  normalized: string
  intent: AppIntent
  title: string
  topic: string
  topicLower: string
  actions: string[]
  constraints: string[]
  entities: string[]
  suggestedFields: string[]
  checklistItems: string[]
  isUnclear: boolean
  wantsCalculator: boolean
  wantsChecklist: boolean
  wantsRandomizer: boolean
  wantsTracking: boolean
  wantsNotes: boolean
}

interface KeywordMatch {
  terms: string[]
  label: string
}

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'and',
  'app',
  'around',
  'based',
  'build',
  'create',
  'for',
  'from',
  'have',
  'idea',
  'into',
  'let',
  'make',
  'need',
  'that',
  'the',
  'this',
  'track',
  'use',
  'using',
  'want',
  'with',
])

const ACTION_MATCHES: KeywordMatch[] = [
  { terms: ['random', 'randomize', 'shuffle', 'pick one'], label: 'randomize options' },
  { terms: ['log', 'track', 'history', 'save', 'record'], label: 'save history' },
  { terms: ['calculate', 'calculator', 'pace', 'estimate', 'total'], label: 'calculate results' },
  { terms: ['checklist', 'todo', 'to do', 'packing list'], label: 'check progress' },
  { terms: ['decide', 'decision', 'choose', 'compare'], label: 'compare options' },
  { terms: ['notes', 'journal', 'reference', 'guide'], label: 'capture notes' },
  { terms: ['review', 'study', 'flashcard', 'quiz'], label: 'review later' },
  { terms: ['plan', 'planner', 'prepare'], label: 'plan ahead' },
]

const CONSTRAINT_MATCHES: KeywordMatch[] = [
  { terms: ['avoid repeat', 'avoid repeats', 'no repeat', 'without repeats'], label: 'avoid recent repeats' },
  { terms: ['deployed', 'deployment', 'military'], label: 'deployed or constrained environment' },
  { terms: ['short trip', 'weekend', 'carry on', 'carry-on'], label: 'short-trip packing' },
  { terms: ['pr', 'personal record', 'best'], label: 'highlight best results' },
  { terms: ['budget', 'cheap', 'cost'], label: 'watch cost' },
  { terms: ['quick', 'fast', 'simple'], label: 'keep the flow quick' },
  { terms: ['later', 'future', 'remember'], label: 'make saved history useful later' },
]

const FIELD_MATCHES: KeywordMatch[] = [
  { terms: ['date', 'daily', 'today'], label: 'date' },
  { terms: ['location', 'place', 'restaurant', 'destination'], label: 'location' },
  { terms: ['rating', 'score', 'stars'], label: 'rating' },
  { terms: ['status', 'stage', 'state'], label: 'status' },
  { terms: ['category', 'type', 'kind'], label: 'category' },
  { terms: ['cost', 'price', 'budget'], label: 'cost' },
  { terms: ['time', 'minutes', 'duration'], label: 'time' },
  { terms: ['distance', 'mile', 'kilometer', 'km'], label: 'distance' },
  { terms: ['notes', 'details', 'journal'], label: 'notes' },
  { terms: ['option', 'choice', 'decision'], label: 'option' },
]

const INTENT_FIELD_DEFAULTS: Record<AppIntent, string[]> = {
  outfit: ['date', 'setting', 'outfit', 'notes'],
  workout: ['date', 'movement', 'result', 'effort', 'notes'],
  packing: ['trip', 'category', 'item', 'notes'],
  pace: ['date', 'distance', 'time', 'pace', 'notes'],
  decision: ['option', 'criteria', 'confidence', 'notes'],
  reference: ['topic', 'category', 'details', 'source'],
  study: ['question', 'answer', 'confidence', 'notes'],
  restaurant: ['name', 'cuisine', 'location', 'rating', 'status', 'notes'],
  calculator: ['first value', 'second value', 'result', 'notes'],
  checklist: ['item', 'status', 'notes'],
  generic: ['title', 'status', 'notes'],
}

const INTENT_ENTITIES: Record<AppIntent, string[]> = {
  outfit: ['shirts', 'pants', 'layers', 'wear history'],
  workout: ['sessions', 'movements', 'PRs', 'training notes'],
  packing: ['trip context', 'essentials', 'extras', 'reminders'],
  pace: ['distance', 'time', 'pace', 'saved runs'],
  decision: ['options', 'criteria', 'tradeoffs', 'next steps'],
  reference: ['topics', 'entries', 'sources', 'takeaways'],
  study: ['cards', 'questions', 'answers', 'review sessions'],
  restaurant: ['restaurants', 'cuisines', 'locations', 'ratings'],
  calculator: ['inputs', 'operation', 'result', 'saved calculations'],
  checklist: ['items', 'progress', 'notes', 'follow-up'],
  generic: ['items', 'notes', 'saved entries', 'status'],
}

const makeSpec = (base: AppSpecBase): AppSpec => {
  const now = new Date().toISOString()

  return {
    ...base,
    id: createId(),
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
}

const stripLeadIn = (prompt: string) =>
  prompt
    .replace(/^make me an app to\s+/i, '')
    .replace(/^make me an app for\s+/i, '')
    .replace(/^make me\s+/i, '')
    .replace(/^build me an app to\s+/i, '')
    .replace(/^build an app to\s+/i, '')
    .replace(/^i want an app to\s+/i, '')
    .replace(/^i need an app to\s+/i, '')
    .replace(/^an app to\s+/i, '')
    .trim()

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bPrs\b/g, 'PRs')
    .replace(/\bPr\b/g, 'PR')

const compactWords = (value: string, maxWords: number) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(' ')

const titleFromPrompt = (prompt: string, fallback: string) => {
  const cleaned = stripLeadIn(prompt)
    .split(/\b(?:that|where|while|with|and let me|and track|and log|it should)\b/i)[0]
    .replace(/[.?!,]+$/g, '')
    .trim()

  if (!cleaned) {
    return fallback
  }

  return toTitleCase(compactWords(cleaned, 6))
}

const fallbackTitleForIntent = (intent: AppIntent) => {
  const titles: Record<AppIntent, string> = {
    outfit: 'Outfit Planner',
    workout: 'Workout Log',
    packing: 'Packing Planner',
    pace: 'Run Pace Calculator',
    decision: 'Decision Guide',
    reference: 'Reference Guide',
    study: 'Study Flashcards',
    restaurant: 'Restaurant Tracker',
    calculator: 'Simple Calculator',
    checklist: 'Checklist',
    generic: 'Custom Workspace',
  }

  return titles[intent]
}

const matchLabels = (normalizedPrompt: string, matches: KeywordMatch[]) =>
  matches
    .filter((match) => match.terms.some((term) => normalizedPrompt.includes(term)))
    .map((match) => match.label)

const uniqueStrings = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))

const extractKeywords = (normalizedPrompt: string) =>
  uniqueStrings(normalizedPrompt.match(/[a-z0-9]+/g) ?? [])
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 8)

const hasAny = (normalizedPrompt: string, words: string[]) =>
  words.some((word) => normalizedPrompt.includes(word))

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item'

const option = (label: string): SelectOption => ({
  id: slugify(label),
  label,
  value: label,
})

const selectOptions = (labels: string[]) => labels.map(option)

const sentenceList = (items: string[]) => {
  if (items.length === 0) {
    return ''
  }

  if (items.length === 1) {
    return items[0]
  }

  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

const describeConstraints = (analysis: PromptAnalysis) =>
  analysis.constraints.length > 0
    ? `This draft accounts for ${sentenceList(analysis.constraints)}.`
    : 'This draft keeps the workflow local, simple, and easy to revise later.'

const analyzePrompt = (prompt: string, intent: AppIntent): PromptAnalysis => {
  const normalized = prompt.toLowerCase()
  const fallbackTitle = fallbackTitleForIntent(intent)
  const title = titleFromPrompt(prompt, fallbackTitle)
  const keywords = extractKeywords(normalized)
  const actions = uniqueStrings(matchLabels(normalized, ACTION_MATCHES))
  const constraints = uniqueStrings(matchLabels(normalized, CONSTRAINT_MATCHES))
  const suggestedFields = uniqueStrings([
    ...matchLabels(normalized, FIELD_MATCHES),
    ...INTENT_FIELD_DEFAULTS[intent],
  ]).slice(0, 7)
  const entities = uniqueStrings([...INTENT_ENTITIES[intent], ...keywords]).slice(0, 8)
  const checklistItems = checklistItemsForPrompt(keywords, intent)
  const topic = title || fallbackTitle

  return {
    normalized,
    intent,
    title: topic,
    topic,
    topicLower: topic.toLowerCase(),
    actions: actions.length > 0 ? actions : ['capture details', 'save entries'],
    constraints,
    entities,
    suggestedFields,
    checklistItems,
    isUnclear: intent === 'generic' && keywords.length < 3,
    wantsCalculator: hasAny(normalized, ['calculate', 'calculator', 'pace', 'total', 'estimate']),
    wantsChecklist: hasAny(normalized, ['checklist', 'todo', 'to do', 'tasks', 'packing list']),
    wantsRandomizer: hasAny(normalized, ['random', 'randomize', 'shuffle', 'pick one']),
    wantsTracking: hasAny(normalized, ['log', 'track', 'history', 'save', 'record', 'journal']),
    wantsNotes: hasAny(normalized, ['note', 'notes', 'journal', 'reference', 'details']),
  }
}

const checklistItemsForPrompt = (keywords: string[], intent: AppIntent) => {
  const defaults: Record<AppIntent, string[]> = {
    outfit: ['Check weather or setting', 'Avoid recent repeat', 'Log what you wore'],
    workout: ['Warm up', 'Record working sets', 'Note effort', 'Log any PR'],
    packing: ['Documents', 'Wallet', 'Phone charger', 'Clothes', 'Toiletries'],
    pace: ['Enter distance', 'Enter total minutes', 'Save the result'],
    decision: ['Define the goal', 'Compare options', 'Check risks', 'Pick next step'],
    reference: ['Add key fact', 'Add source', 'Review for gaps'],
    study: ['Add card', 'Review answer', 'Mark weak topic'],
    restaurant: ['Add place', 'Pick cuisine', 'Rate after visit'],
    calculator: ['Enter first value', 'Enter second value', 'Review result'],
    checklist: ['First step', 'Second step', 'Final check'],
    generic: ['Capture the item', 'Add notes', 'Choose status', 'Save entry'],
  }

  const promptItems = keywords
    .filter((keyword) => !['app', 'planner', 'tracker', 'calculator'].includes(keyword))
    .slice(0, 4)
    .map((keyword) => `Review ${keyword}`)

  return uniqueStrings([...promptItems, ...defaults[intent]]).slice(0, 6)
}

const introBlocks = (title: string, description: string): AppBlock[] => [
  {
    id: 'intro-heading',
    type: 'heading',
    level: 1,
    text: title,
  },
  {
    id: 'intro-copy',
    type: 'paragraph',
    text: description,
  },
]

const insightBlocks = (analysis: PromptAnalysis): AppBlock[] => [
  {
    id: 'detected-workflow',
    type: 'paragraph',
    text: `Detected workflow: ${sentenceList(analysis.actions)}.`,
  },
  {
    id: 'detected-constraints',
    type: 'paragraph',
    text: describeConstraints(analysis),
  },
]

const buildOutfitSpec = (analysis: PromptAnalysis) =>
  makeSpec({
    name: analysis.title,
    description:
      'Plan outfit combinations, keep editable wardrobe lists, and log wear history.',
    category: 'planner',
    icon: '👕',
    dataStores: [{ id: 'outfit-history', name: 'Wear history', type: 'history' }],
    screens: [
      {
        id: 'overview',
        title: 'Overview',
        description: 'Set the context for the next outfit decision.',
        blocks: [
          ...introBlocks(
            analysis.title,
            `A local outfit planner for ${analysis.topicLower} with random combinations and history.`,
          ),
          ...insightBlocks(analysis),
          {
            id: 'outfit-setting',
            type: 'select',
            label: 'Today setting',
            defaultValue: 'Work',
            options: selectOptions(['Work', 'Casual', 'Travel', 'Workout', 'Event']),
          },
          {
            id: 'outfit-rules',
            type: 'checkboxList',
            label: 'Rules for today',
            items: [
              { id: 'weather', label: 'Fits the weather' },
              { id: 'clean', label: 'Clean and ready' },
              { id: 'repeat', label: 'Avoids a recent repeat' },
              { id: 'setting', label: 'Matches the setting' },
            ],
          },
          {
            id: 'outfit-rule-count',
            type: 'computedValue',
            label: 'Readiness',
            resultLabel: 'Rules checked',
            operation: { type: 'countChecked', inputId: 'outfit-rules' },
          },
        ],
      },
      {
        id: 'closet',
        title: 'Closet',
        description: 'Edit the source lists used by the outfit generator.',
        blocks: [
          {
            id: 'tops',
            type: 'listEditor',
            label: 'Tops',
            helpText: 'These feed the randomizer.',
            placeholder: 'Add a shirt or top',
            defaultItems: hasAny(analysis.normalized, ['deployed', 'deployment'])
              ? ['Tan tee', 'Black tee', 'PT shirt']
              : ['Black tee', 'Gray tee', 'Blue button-down'],
          },
          {
            id: 'bottoms',
            type: 'listEditor',
            label: 'Bottoms',
            placeholder: 'Add pants or shorts',
            defaultItems: ['Jeans', 'Black joggers', 'Khaki pants'],
          },
          {
            id: 'layers',
            type: 'listEditor',
            label: 'Layers or shoes',
            placeholder: 'Add a layer or shoe option',
            defaultItems: ['Light jacket', 'Sneakers', 'Boots'],
          },
        ],
      },
      {
        id: 'generate',
        title: 'Generate',
        description: 'Generate a combination, then log what you actually wore.',
        blocks: [
          {
            id: 'outfit-randomizer',
            type: 'randomizer',
            label: 'Outfit combo',
            helpText: 'Uses your tops, bottoms, and layers lists.',
            resultLabel: 'Suggested outfit',
            buttonLabel: 'Generate outfit',
            sourceBlockIds: ['tops', 'bottoms', 'layers'],
          },
          {
            id: 'wear-log',
            type: 'savedEntryList',
            storeId: 'outfit-history',
            label: 'Wear log',
            submitLabel: 'Log outfit',
            emptyText: 'No outfits logged yet.',
            fields: [
              { id: 'date', label: 'Date', inputType: 'date' },
              {
                id: 'setting',
                label: 'Setting',
                inputType: 'select',
                options: selectOptions(['Work', 'Casual', 'Travel', 'Workout', 'Event']),
              },
              {
                id: 'outfit',
                label: 'Outfit',
                inputType: 'text',
                placeholder: 'Black tee + jeans + sneakers',
              },
              {
                id: 'notes',
                label: 'Notes',
                inputType: 'textarea',
                placeholder: 'Weather, repeats, compliments, or issues',
              },
            ],
          },
        ],
      },
      {
        id: 'history',
        title: 'History',
        description: 'Use recent history to avoid repeats.',
        blocks: [
          {
            id: 'wear-table',
            type: 'simpleTable',
            storeId: 'outfit-history',
            label: 'Recent outfits',
            emptyText: 'Logged outfits will appear here.',
            columns: [
              { fieldId: 'date', label: 'Date' },
              { fieldId: 'setting', label: 'Setting' },
              { fieldId: 'outfit', label: 'Outfit' },
            ],
          },
        ],
      },
    ],
  })

const buildWorkoutSpec = (analysis: PromptAnalysis) =>
  makeSpec({
    name: analysis.title,
    description: 'Log training sessions, review history, and track best results.',
    category: 'tracker',
    icon: '🏋️',
    dataStores: [
      { id: 'workouts', name: 'Workout entries', type: 'entries' },
      { id: 'prs', name: 'Personal records', type: 'history' },
    ],
    screens: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        description: 'Set the focus before logging a session.',
        blocks: [
          ...introBlocks(
            analysis.title,
            `A training workspace built around ${analysis.topicLower}.`,
          ),
          ...insightBlocks(analysis),
          {
            id: 'training-focus',
            type: 'select',
            label: 'Training focus',
            defaultValue: 'Strength',
            options: selectOptions(['Strength', 'Conditioning', 'Mobility', 'Run', 'Recovery']),
          },
          {
            id: 'session-checks',
            type: 'checkboxList',
            label: 'Session checklist',
            items: [
              { id: 'warmup', label: 'Warm-up complete' },
              { id: 'main', label: 'Main work recorded' },
              { id: 'effort', label: 'Effort noted' },
              { id: 'next', label: 'Next adjustment clear' },
            ],
          },
          {
            id: 'session-readiness',
            type: 'computedValue',
            label: 'Progress',
            resultLabel: 'Checks complete',
            operation: { type: 'countChecked', inputId: 'session-checks' },
          },
        ],
      },
      {
        id: 'log',
        title: 'Log',
        description: 'Save the details that make the session useful later.',
        blocks: [
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
                label: 'Movement or session',
                inputType: 'text',
                placeholder: 'Squat, 5K run, push day',
              },
              {
                id: 'result',
                label: 'Result',
                inputType: 'text',
                placeholder: '3x5 at 185, 5K in 24:00',
              },
              {
                id: 'effort',
                label: 'Effort',
                inputType: 'select',
                options: selectOptions(['Easy', 'Moderate', 'Hard', 'Max effort']),
              },
              {
                id: 'notes',
                label: 'Notes',
                inputType: 'textarea',
                placeholder: 'How it felt, form cues, or adjustments',
              },
            ],
          },
        ],
      },
      {
        id: 'history',
        title: 'History',
        description: 'Scan recent sessions without leaving the mini-app.',
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
              { fieldId: 'effort', label: 'Effort' },
            ],
          },
        ],
      },
      {
        id: 'bests',
        title: 'Bests',
        description: 'Keep a separate list of PRs or benchmark results.',
        blocks: [
          {
            id: 'pr-entry',
            type: 'savedEntryList',
            storeId: 'prs',
            label: 'Best results',
            submitLabel: 'Save best',
            emptyText: 'No best results saved yet.',
            fields: [
              { id: 'date', label: 'Date', inputType: 'date' },
              { id: 'movement', label: 'Movement', inputType: 'text' },
              { id: 'best', label: 'Best result', inputType: 'text' },
              { id: 'notes', label: 'Notes', inputType: 'textarea' },
            ],
          },
          {
            id: 'pr-table',
            type: 'simpleTable',
            storeId: 'prs',
            label: 'PR table',
            emptyText: 'Best results will appear here.',
            columns: [
              { fieldId: 'date', label: 'Date' },
              { fieldId: 'movement', label: 'Movement' },
              { fieldId: 'best', label: 'Best' },
            ],
          },
        ],
      },
    ],
  })

const buildPackingSpec = (analysis: PromptAnalysis) =>
  makeSpec({
    name: analysis.title,
    description: 'Plan trip context, checklist progress, custom lists, and notes.',
    category: 'planner',
    icon: '🎒',
    dataStores: [{ id: 'trip-notes', name: 'Trip notes', type: 'entries' }],
    screens: [
      {
        id: 'overview',
        title: 'Overview',
        description: 'Define the trip before checking off items.',
        blocks: [
          ...introBlocks(
            analysis.title,
            `A compact packing planner for ${analysis.topicLower}.`,
          ),
          ...insightBlocks(analysis),
          {
            id: 'trip-name',
            type: 'textInput',
            label: 'Trip',
            placeholder: 'Weekend trip, work travel, beach week',
          },
          {
            id: 'trip-type',
            type: 'select',
            label: 'Trip type',
            defaultValue: hasAny(analysis.normalized, ['work']) ? 'Work' : 'Short trip',
            options: selectOptions(['Short trip', 'Work', 'Outdoor', 'Family', 'International']),
          },
          {
            id: 'trip-context',
            type: 'textarea',
            label: 'Trip context',
            placeholder: 'Weather, events, baggage limits, or special needs',
          },
        ],
      },
      {
        id: 'checklist',
        title: 'Checklist',
        description: 'Track essential items locally.',
        blocks: [
          {
            id: 'packing-checklist',
            type: 'checkboxList',
            label: 'Packing checklist',
            items: analysis.checklistItems.map((item) => ({
              id: slugify(item),
              label: item,
            })),
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
        id: 'custom-lists',
        title: 'Lists',
        description: 'Add reusable items that are specific to this kind of trip.',
        blocks: [
          {
            id: 'clothing-list',
            type: 'listEditor',
            label: 'Clothing extras',
            placeholder: 'Add clothing item',
            defaultItems: ['Extra socks', 'Light jacket', 'Sleepwear'],
          },
          {
            id: 'gear-list',
            type: 'listEditor',
            label: 'Gear or documents',
            placeholder: 'Add gear or document',
            defaultItems: ['ID', 'Phone charger', 'Medication'],
          },
        ],
      },
      {
        id: 'notes',
        title: 'Notes',
        description: 'Save trip-specific reminders and lessons learned.',
        blocks: [
          {
            id: 'trip-note-list',
            type: 'savedEntryList',
            storeId: 'trip-notes',
            label: 'Trip notes',
            submitLabel: 'Save note',
            emptyText: 'No trip notes yet.',
            fields: [
              { id: 'date', label: 'Date', inputType: 'date' },
              {
                id: 'topic',
                label: 'Topic',
                inputType: 'select',
                options: selectOptions(['Reminder', 'Weather', 'Missing item', 'Lesson learned']),
              },
              {
                id: 'note',
                label: 'Note',
                inputType: 'textarea',
                placeholder: 'Weather, events, or special reminders',
              },
            ],
          },
          {
            id: 'trip-note-table',
            type: 'simpleTable',
            storeId: 'trip-notes',
            label: 'Saved reminders',
            emptyText: 'Saved trip notes will appear here.',
            columns: [
              { fieldId: 'date', label: 'Date' },
              { fieldId: 'topic', label: 'Topic' },
              { fieldId: 'note', label: 'Note' },
            ],
          },
        ],
      },
    ],
  })

const buildPaceSpec = (analysis: PromptAnalysis) =>
  makeSpec({
    name: analysis.title,
    description: 'Calculate run pace and keep a lightweight history of runs.',
    category: 'calculator',
    icon: '🏃',
    dataStores: [{ id: 'runs', name: 'Saved runs', type: 'history' }],
    screens: [
      {
        id: 'calculator',
        title: 'Calculator',
        description: 'Enter distance and total minutes to calculate pace.',
        blocks: [
          ...introBlocks(
            analysis.title,
            'Use safe built-in math for pace. No generated code or eval is used.',
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
      {
        id: 'saved-runs',
        title: 'Saved Runs',
        description: 'Save calculated or planned runs for later comparison.',
        blocks: [
          {
            id: 'run-entry',
            type: 'savedEntryList',
            storeId: 'runs',
            label: 'Run history',
            submitLabel: 'Save run',
            emptyText: 'No runs saved yet.',
            fields: [
              { id: 'date', label: 'Date', inputType: 'date' },
              { id: 'distance', label: 'Distance', inputType: 'number', placeholder: '3.1' },
              { id: 'minutes', label: 'Minutes', inputType: 'number', placeholder: '30' },
              { id: 'pace', label: 'Pace', inputType: 'text', placeholder: '9:40 / mile' },
              { id: 'notes', label: 'Notes', inputType: 'textarea' },
            ],
          },
          {
            id: 'run-table',
            type: 'simpleTable',
            storeId: 'runs',
            label: 'Recent runs',
            emptyText: 'Saved runs will appear here.',
            columns: [
              { fieldId: 'date', label: 'Date' },
              { fieldId: 'distance', label: 'Distance' },
              { fieldId: 'pace', label: 'Pace' },
            ],
          },
        ],
      },
    ],
  })

const buildDecisionSpec = (analysis: PromptAnalysis) =>
  makeSpec({
    name: analysis.title,
    description: 'Frame a decision, compare criteria, and save option notes.',
    category: 'decision',
    icon: '🧭',
    dataStores: [{ id: 'decisions', name: 'Decision notes', type: 'entries' }],
    screens: [
      {
        id: 'frame',
        title: 'Frame',
        description: 'Name the decision and the options being compared.',
        blocks: [
          ...introBlocks(
            analysis.title,
            `A structured guide for ${analysis.topicLower}.`,
          ),
          ...insightBlocks(analysis),
          {
            id: 'decision-question',
            type: 'textInput',
            label: 'Decision question',
            placeholder: 'What are you deciding?',
          },
          {
            id: 'option-a',
            type: 'textInput',
            label: 'Option A',
            placeholder: 'First option',
          },
          {
            id: 'option-b',
            type: 'textInput',
            label: 'Option B',
            placeholder: 'Second option',
          },
          {
            id: 'comparison-line',
            type: 'computedValue',
            label: 'Comparison',
            resultLabel: 'Current options',
            operation: { type: 'concat', inputIds: ['option-a', 'option-b'], separator: ' vs ' },
          },
        ],
      },
      {
        id: 'criteria',
        title: 'Criteria',
        description: 'Check the signals that make the choice clearer.',
        blocks: [
          {
            id: 'priority',
            type: 'select',
            label: 'Top priority',
            defaultValue: 'Confidence',
            options: selectOptions(['Speed', 'Cost', 'Quality', 'Confidence', 'Reversibility']),
          },
          {
            id: 'decision-checks',
            type: 'checkboxList',
            label: 'Criteria met',
            items: [
              { id: 'goal', label: 'Fits the goal' },
              { id: 'risk', label: 'Risk is acceptable' },
              { id: 'cost', label: 'Cost is acceptable' },
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
        description: 'Save tradeoffs and decision snapshots.',
        blocks: [
          {
            id: 'decision-entry',
            type: 'savedEntryList',
            storeId: 'decisions',
            label: 'Decision notes',
            submitLabel: 'Save note',
            emptyText: 'No decision notes yet.',
            fields: [
              { id: 'option', label: 'Option', inputType: 'text', placeholder: 'Option A' },
              { id: 'upside', label: 'Upside', inputType: 'textarea' },
              { id: 'concern', label: 'Concern', inputType: 'textarea' },
              { id: 'nextStep', label: 'Next step', inputType: 'text' },
            ],
          },
          {
            id: 'decision-table',
            type: 'simpleTable',
            storeId: 'decisions',
            label: 'Saved option notes',
            emptyText: 'Saved notes will appear here.',
            columns: [
              { fieldId: 'option', label: 'Option' },
              { fieldId: 'upside', label: 'Upside' },
              { fieldId: 'nextStep', label: 'Next' },
            ],
          },
        ],
      },
    ],
  })

const buildReferenceSpec = (analysis: PromptAnalysis) =>
  makeSpec({
    name: analysis.title,
    description: 'Capture reference entries, sources, and quick reminders.',
    category: 'reference',
    icon: '📚',
    dataStores: [{ id: 'references', name: 'Reference entries', type: 'entries' }],
    screens: [
      {
        id: 'overview',
        title: 'Overview',
        description: 'Keep the active topic visible.',
        blocks: [
          ...introBlocks(
            analysis.title,
            `A reference workspace for ${analysis.topicLower}.`,
          ),
          ...insightBlocks(analysis),
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
          {
            id: 'review-checks',
            type: 'checkboxList',
            label: 'Review checks',
            items: [
              { id: 'source', label: 'Source captured' },
              { id: 'summary', label: 'Summary is clear' },
              { id: 'next', label: 'Next lookup identified' },
            ],
          },
        ],
      },
      {
        id: 'entries',
        title: 'Entries',
        description: 'Save structured notes instead of one long document.',
        blocks: [
          {
            id: 'reference-entry',
            type: 'savedEntryList',
            storeId: 'references',
            label: 'Reference entries',
            submitLabel: 'Save reference',
            emptyText: 'No reference entries yet.',
            fields: [
              { id: 'title', label: 'Title', inputType: 'text' },
              {
                id: 'category',
                label: 'Category',
                inputType: 'select',
                options: selectOptions(['Fact', 'Step', 'Link', 'Warning', 'Idea']),
              },
              { id: 'body', label: 'Details', inputType: 'textarea' },
              { id: 'source', label: 'Source', inputType: 'text' },
            ],
          },
        ],
      },
      {
        id: 'lookup',
        title: 'Lookup',
        description: 'Review saved entries in a compact table.',
        blocks: [
          {
            id: 'reference-table',
            type: 'simpleTable',
            storeId: 'references',
            label: 'Saved references',
            emptyText: 'Saved entries will appear here.',
            columns: [
              { fieldId: 'title', label: 'Title' },
              { fieldId: 'category', label: 'Category' },
              { fieldId: 'source', label: 'Source' },
            ],
          },
        ],
      },
    ],
  })

const buildStudySpec = (analysis: PromptAnalysis) =>
  makeSpec({
    name: analysis.title,
    description: 'Create study cards, review prompts, and log weak spots.',
    category: 'study',
    icon: '🧠',
    dataStores: [
      { id: 'cards', name: 'Flashcards', type: 'entries' },
      { id: 'study-sessions', name: 'Study sessions', type: 'history' },
    ],
    screens: [
      {
        id: 'deck',
        title: 'Deck',
        description: 'Add question and answer cards.',
        blocks: [
          ...introBlocks(
            analysis.title,
            `A study mini-app for ${analysis.topicLower}.`,
          ),
          {
            id: 'card-entry',
            type: 'savedEntryList',
            storeId: 'cards',
            label: 'Flashcards',
            submitLabel: 'Add card',
            emptyText: 'No cards yet.',
            fields: [
              { id: 'topic', label: 'Topic', inputType: 'text' },
              { id: 'question', label: 'Question', inputType: 'textarea' },
              { id: 'answer', label: 'Answer', inputType: 'textarea' },
              {
                id: 'confidence',
                label: 'Confidence',
                inputType: 'select',
                options: selectOptions(['Low', 'Medium', 'High']),
              },
            ],
          },
        ],
      },
      {
        id: 'review',
        title: 'Review',
        description: 'Use starter prompts for quick self-testing.',
        blocks: [
          {
            id: 'review-prompts',
            type: 'listEditor',
            label: 'Review prompts',
            placeholder: 'Add review prompt',
            defaultItems: ['Define the key term', 'Explain from memory', 'Give one example'],
          },
          {
            id: 'review-randomizer',
            type: 'randomizer',
            label: 'Review drill',
            buttonLabel: 'Pick prompt',
            resultLabel: 'Prompt',
            sourceBlockIds: ['review-prompts'],
          },
          {
            id: 'card-table',
            type: 'simpleTable',
            storeId: 'cards',
            label: 'Saved cards',
            emptyText: 'Add flashcards to review them here.',
            columns: [
              { fieldId: 'topic', label: 'Topic' },
              { fieldId: 'question', label: 'Question' },
              { fieldId: 'confidence', label: 'Confidence' },
            ],
          },
        ],
      },
      {
        id: 'session-log',
        title: 'Sessions',
        description: 'Track study sessions and weak spots.',
        blocks: [
          {
            id: 'study-entry',
            type: 'savedEntryList',
            storeId: 'study-sessions',
            label: 'Study session',
            submitLabel: 'Save session',
            emptyText: 'No study sessions yet.',
            fields: [
              { id: 'date', label: 'Date', inputType: 'date' },
              { id: 'focus', label: 'Focus', inputType: 'text' },
              { id: 'weakSpot', label: 'Weak spot', inputType: 'text' },
              { id: 'notes', label: 'Notes', inputType: 'textarea' },
            ],
          },
        ],
      },
    ],
  })

const buildRestaurantSpec = (analysis: PromptAnalysis) =>
  makeSpec({
    name: analysis.title,
    description: 'Track restaurants to try, visit notes, ratings, and shortlists.',
    category: 'restaurant',
    icon: '🍽️',
    dataStores: [{ id: 'restaurants', name: 'Restaurants', type: 'entries' }],
    screens: [
      {
        id: 'add',
        title: 'Add',
        description: 'Capture enough detail to make the list actionable.',
        blocks: [
          ...introBlocks(
            analysis.title,
            `A local restaurant tracker for ${analysis.topicLower}.`,
          ),
          ...insightBlocks(analysis),
          {
            id: 'restaurant-entry',
            type: 'savedEntryList',
            storeId: 'restaurants',
            label: 'Restaurants',
            submitLabel: 'Save restaurant',
            emptyText: 'No restaurants saved yet.',
            fields: [
              { id: 'name', label: 'Name', inputType: 'text' },
              { id: 'cuisine', label: 'Cuisine', inputType: 'text', placeholder: 'Thai, tacos, diner' },
              { id: 'location', label: 'Location', inputType: 'text', placeholder: 'Neighborhood or city' },
              {
                id: 'status',
                label: 'Status',
                inputType: 'select',
                options: selectOptions(['Want to try', 'Booked', 'Tried', 'Favorite', 'Skip']),
              },
              { id: 'rating', label: 'Rating', inputType: 'number', placeholder: '1-5' },
              { id: 'notes', label: 'Notes', inputType: 'textarea' },
            ],
          },
        ],
      },
      {
        id: 'browse',
        title: 'Browse',
        description: 'Review the saved places.',
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
              { fieldId: 'rating', label: 'Rating' },
            ],
          },
        ],
      },
      {
        id: 'shortlist',
        title: 'Shortlist',
        description: 'Keep reusable filters and pick a dinner idea.',
        blocks: [
          {
            id: 'cuisine-list',
            type: 'listEditor',
            label: 'Cuisines to rotate',
            placeholder: 'Add cuisine',
            defaultItems: ['Tacos', 'Sushi', 'Thai', 'Pizza'],
          },
          {
            id: 'area-list',
            type: 'listEditor',
            label: 'Areas',
            placeholder: 'Add area',
            defaultItems: ['Nearby', 'Downtown', 'On the way'],
          },
          {
            id: 'dinner-randomizer',
            type: 'randomizer',
            label: 'Dinner idea',
            buttonLabel: 'Pick idea',
            resultLabel: 'Try',
            sourceBlockIds: ['cuisine-list', 'area-list'],
          },
        ],
      },
    ],
  })

const calculatorOperationForPrompt = (analysis: PromptAnalysis) => {
  if (hasAny(analysis.normalized, ['subtract', 'minus', 'difference'])) {
    return { type: 'subtract' as const, label: 'Difference' }
  }

  if (hasAny(analysis.normalized, ['multiply', 'product', 'times'])) {
    return { type: 'multiply' as const, label: 'Product' }
  }

  if (hasAny(analysis.normalized, ['divide', 'ratio', 'per '])) {
    return { type: 'divide' as const, label: 'Ratio' }
  }

  return { type: 'add' as const, label: 'Total' }
}

const buildCalculatorSpec = (analysis: PromptAnalysis) => {
  const operation = calculatorOperationForPrompt(analysis)

  return makeSpec({
    name: analysis.title,
    description: 'Calculate with safe typed inputs and save calculation notes.',
    category: 'calculator',
    icon: '🧮',
    dataStores: [{ id: 'calculations', name: 'Saved calculations', type: 'history' }],
    screens: [
      {
        id: 'calculator',
        title: 'Calculator',
        description: 'Enter two values to calculate the result.',
        blocks: [
          ...introBlocks(
            analysis.title,
            `A simple ${operation.label.toLowerCase()} calculator generated from your prompt.`,
          ),
          {
            id: 'a',
            type: 'numberInput',
            label: analysis.suggestedFields.includes('distance') ? 'Distance' : 'First value',
            placeholder: '0',
          },
          {
            id: 'b',
            type: 'numberInput',
            label: analysis.suggestedFields.includes('time') ? 'Time' : 'Second value',
            placeholder: '0',
          },
          {
            id: 'result',
            type: 'computedValue',
            label: operation.label,
            resultLabel: operation.label,
            operation: { type: operation.type, inputIds: ['a', 'b'] },
            precision: 2,
          },
          {
            id: 'reset-calculator',
            type: 'button',
            text: 'Clear inputs',
            action: { type: 'clearValues', blockIds: ['a', 'b'] },
          },
        ],
      },
      {
        id: 'saved',
        title: 'Saved',
        description: 'Store calculation context or results manually.',
        blocks: [
          {
            id: 'calculation-entry',
            type: 'savedEntryList',
            storeId: 'calculations',
            label: 'Saved calculations',
            submitLabel: 'Save calculation',
            emptyText: 'No calculations saved yet.',
            fields: [
              { id: 'label', label: 'Label', inputType: 'text' },
              { id: 'result', label: 'Result', inputType: 'text' },
              { id: 'notes', label: 'Notes', inputType: 'textarea' },
            ],
          },
          {
            id: 'calculation-table',
            type: 'simpleTable',
            storeId: 'calculations',
            label: 'Recent calculations',
            emptyText: 'Saved calculations will appear here.',
            columns: [
              { fieldId: 'label', label: 'Label' },
              { fieldId: 'result', label: 'Result' },
            ],
          },
        ],
      },
    ],
  })
}

const buildChecklistSpec = (analysis: PromptAnalysis) =>
  makeSpec({
    name: analysis.title,
    description: 'Track checklist progress and save notes for follow-up.',
    category: 'checklist',
    icon: '✅',
    dataStores: [{ id: 'checklist-notes', name: 'Checklist notes', type: 'entries' }],
    screens: [
      {
        id: 'checklist',
        title: 'Checklist',
        description: 'Check off progress as you go.',
        blocks: [
          ...introBlocks(
            analysis.title,
            `A checklist for ${analysis.topicLower} with progress tracking.`,
          ),
          {
            id: 'items',
            type: 'checkboxList',
            label: 'Items',
            items: analysis.checklistItems.map((item) => ({
              id: slugify(item),
              label: item,
            })),
          },
          {
            id: 'done-count',
            type: 'computedValue',
            label: 'Progress',
            resultLabel: 'Completed items',
            operation: { type: 'countChecked', inputId: 'items' },
          },
        ],
      },
      {
        id: 'extras',
        title: 'Extras',
        description: 'Hold extra item ideas until a fuller editor exists.',
        blocks: [
          {
            id: 'extra-items',
            type: 'listEditor',
            label: 'Extra items',
            placeholder: 'Add an extra item',
            defaultItems: analysis.entities.slice(0, 3),
          },
        ],
      },
      {
        id: 'notes',
        title: 'Notes',
        description: 'Save follow-up notes separately from checkbox state.',
        blocks: [
          {
            id: 'checklist-note-entry',
            type: 'savedEntryList',
            storeId: 'checklist-notes',
            label: 'Checklist notes',
            submitLabel: 'Save note',
            emptyText: 'No checklist notes yet.',
            fields: [
              { id: 'date', label: 'Date', inputType: 'date' },
              { id: 'item', label: 'Item or area', inputType: 'text' },
              { id: 'note', label: 'Note', inputType: 'textarea' },
            ],
          },
          {
            id: 'checklist-note-table',
            type: 'simpleTable',
            storeId: 'checklist-notes',
            label: 'Saved notes',
            emptyText: 'Saved checklist notes will appear here.',
            columns: [
              { fieldId: 'date', label: 'Date' },
              { fieldId: 'item', label: 'Item' },
              { fieldId: 'note', label: 'Note' },
            ],
          },
        ],
      },
    ],
  })

const genericEntryFields = (analysis: PromptAnalysis): SavedEntryField[] => {
  const fields: SavedEntryField[] = [
    { id: 'title', label: `${analysis.topic} item`, inputType: 'text' as const },
    {
      id: 'status',
      label: 'Status',
      inputType: 'select' as const,
      options: selectOptions(['Idea', 'Active', 'Waiting', 'Done']),
    },
  ]

  if (analysis.suggestedFields.includes('rating')) {
    fields.push({
      id: 'rating',
      label: 'Rating',
      inputType: 'number' as const,
    })
  }

  if (analysis.suggestedFields.includes('location')) {
    fields.push({
      id: 'location',
      label: 'Location',
      inputType: 'text' as const,
    })
  }

  fields.push({
    id: 'notes',
    label: 'Notes',
    inputType: 'textarea' as const,
  })

  return fields
}

const buildGenericSpec = (analysis: PromptAnalysis) => {
  const baseScreens = [
    {
      id: 'overview',
      title: 'Overview',
      description: 'A flexible starting point for an unclear or broad prompt.',
      blocks: [
        ...introBlocks(
          analysis.title,
          analysis.isUnclear
            ? 'The prompt was broad, so this draft starts as a practical notes and entry tracker.'
            : `A flexible local workspace for ${analysis.topicLower}.`,
        ),
        ...insightBlocks(analysis),
        {
          id: 'current-focus',
          type: 'textInput' as const,
          label: 'Current focus',
          placeholder: `What matters most for ${analysis.topicLower}?`,
        },
        {
          id: 'status',
          type: 'select' as const,
          label: 'Status',
          defaultValue: 'Idea',
          options: selectOptions(['Idea', 'Active', 'Waiting', 'Done']),
        },
        {
          id: 'working-notes',
          type: 'textarea' as const,
          label: 'Working notes',
          placeholder: 'Details, constraints, or next steps',
        },
        {
          id: 'next-checks',
          type: 'checkboxList' as const,
          label: 'Next checks',
          items: analysis.checklistItems.slice(0, 4).map((item) => ({
            id: slugify(item),
            label: item,
          })),
        },
        {
          id: 'next-check-count',
          type: 'computedValue' as const,
          label: 'Progress',
          resultLabel: 'Checks complete',
          operation: { type: 'countChecked' as const, inputId: 'next-checks' },
        },
      ],
    },
    {
      id: 'capture',
      title: 'Capture',
      description: 'Save structured entries that match the prompt.',
      blocks: [
        {
          id: 'entry-list',
          type: 'savedEntryList' as const,
          storeId: 'entries',
          label: 'Saved entries',
          submitLabel: 'Save entry',
          emptyText: 'No entries yet.',
          fields: genericEntryFields(analysis),
        },
      ],
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Scan saved entries in a table.',
      blocks: [
        {
          id: 'entry-table',
          type: 'simpleTable' as const,
          storeId: 'entries',
          label: 'Recent entries',
          emptyText: 'Saved entries will appear here.',
          columns: [
            { fieldId: 'title', label: 'Title' },
            { fieldId: 'status', label: 'Status' },
            ...(analysis.suggestedFields.includes('rating')
              ? [{ fieldId: 'rating', label: 'Rating' }]
              : []),
            ...(analysis.suggestedFields.includes('location')
              ? [{ fieldId: 'location', label: 'Location' }]
              : []),
          ],
        },
      ],
    },
  ]

  const screens = analysis.wantsRandomizer
    ? [
        ...baseScreens,
        {
          id: 'randomizer',
          title: 'Randomize',
          description: 'Use editable source lists to pick a quick option.',
          blocks: [
            {
              id: 'option-list',
              type: 'listEditor' as const,
              label: 'Options',
              placeholder: 'Add option',
              defaultItems: analysis.entities.slice(0, 4),
            },
            {
              id: 'random-choice',
              type: 'randomizer' as const,
              label: 'Random choice',
              buttonLabel: 'Pick one',
              resultLabel: 'Selected',
              sourceBlockIds: ['option-list'],
            },
          ],
        },
      ]
    : baseScreens

  return makeSpec({
    name: analysis.title,
    description:
      'A generated workspace with prompt-aware fields, notes, and saved entries.',
    category: 'custom',
    icon: '✨',
    dataStores: [{ id: 'entries', name: 'Saved entries', type: 'entries' }],
    screens,
  })
}

const builders: Record<AppIntent, (analysis: PromptAnalysis) => AppSpec> = {
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

const assumptionsForAnalysis = (analysis: PromptAnalysis) => {
  const assumptions = [
    `Detected intent: ${analysis.intent}.`,
    `Generated screens around ${sentenceList(analysis.entities.slice(0, 4))}.`,
    `Suggested fields: ${sentenceList(analysis.suggestedFields.slice(0, 5))}.`,
  ]

  if (analysis.constraints.length > 0) {
    assumptions.push(`Detected constraints: ${sentenceList(analysis.constraints)}.`)
  }

  const generatedCapabilities = [
    analysis.wantsCalculator ? 'computed values' : '',
    analysis.wantsChecklist ? 'checklist progress' : '',
    analysis.wantsRandomizer ? 'randomizer controls' : '',
    analysis.wantsTracking ? 'saved history' : '',
    analysis.wantsNotes ? 'notes fields' : '',
  ].filter(Boolean)

  if (generatedCapabilities.length > 0) {
    assumptions.push(`Included ${sentenceList(generatedCapabilities)} based on the prompt.`)
  }

  if (analysis.isUnclear) {
    assumptions.push(
      'The prompt was unclear, so AppForge generated a generic capture and review app.',
    )
  }

  assumptions.push(
    'This is still deterministic local mock generation. A future AI backend can replace this function with strict AppSpec JSON.',
  )

  return assumptions
}

export const generateMockAppSpec = (prompt: string): GeneratedAppDraft => {
  const intent = detectIntent(prompt)
  const analysis = analyzePrompt(prompt, intent)
  const appSpec = builders[intent](analysis)

  return {
    prompt,
    assumptions: assumptionsForAnalysis(analysis),
    appSpec,
    mode: 'create',
    source: 'mock',
    warnings: [],
  }
}
