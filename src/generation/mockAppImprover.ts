import type {
  AppBlock,
  AppScreenSpec,
  AppSpec,
  DataStoreSpec,
  GeneratedAppDraft,
} from '../types/appSpec'

const truncate = (value: string, maxLength = 140) =>
  value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value

const slugify = (value: string, fallback: string) =>
  (value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || fallback

const uniqueId = (rawValue: string, usedIds: Set<string>) => {
  const base = slugify(rawValue, 'item')
  let candidate = base
  let index = 2

  while (usedIds.has(candidate)) {
    candidate = `${base}-${index}`
    index += 1
  }

  usedIds.add(candidate)
  return candidate
}

const promptIncludes = (prompt: string, terms: string[]) =>
  terms.some((term) => prompt.includes(term))

const screenTitleFor = (prompt: string) => {
  if (promptIncludes(prompt, ['random', 'shuffle', 'choose', 'suggest'])) {
    return 'Picker'
  }

  if (promptIncludes(prompt, ['log', 'history', 'track', 'save', 'journal'])) {
    return 'Progress Log'
  }

  if (promptIncludes(prompt, ['note', 'reference', 'guide', 'instruction'])) {
    return 'Notes'
  }

  if (promptIncludes(prompt, ['decision', 'compare', 'score', 'choose'])) {
    return 'Decision Notes'
  }

  return 'Upgrade'
}

const addStore = (
  stores: DataStoreSpec[],
  usedStoreIds: Set<string>,
  rawId: string,
  name: string,
) => {
  const id = uniqueId(rawId, usedStoreIds)
  stores.push({ id, name, type: 'entries' })
  return id
}

const buildUpgradeBlocks = (
  prompt: string,
  storeId: string,
  usedBlockIds: Set<string>,
): AppBlock[] => {
  const blocks: AppBlock[] = [
    {
      id: uniqueId('upgrade-heading', usedBlockIds),
      type: 'heading',
      text: 'Upgrade Focus',
      level: 2,
    },
    {
      id: uniqueId('upgrade-summary', usedBlockIds),
      type: 'paragraph',
      text: `Added from your improvement idea: ${truncate(prompt)}.`,
    },
  ]

  if (promptIncludes(prompt, ['random', 'shuffle', 'choose', 'suggest'])) {
    const listId = uniqueId('upgrade-options', usedBlockIds)
    blocks.push(
      {
        id: listId,
        type: 'listEditor',
        label: 'Options to choose from',
        placeholder: 'Add an option',
        addLabel: 'Add Option',
        defaultItems: ['Option 1', 'Option 2', 'Option 3'],
      },
      {
        id: uniqueId('upgrade-randomizer', usedBlockIds),
        type: 'randomizer',
        sourceBlockIds: [listId],
        buttonLabel: 'Pick One',
        resultLabel: 'Suggested option',
      },
    )
  }

  blocks.push({
    id: uniqueId('upgrade-notes', usedBlockIds),
    type: 'textarea',
    label: 'Working notes',
    placeholder: 'Capture what changed, what worked, or what to try next.',
  })

  blocks.push({
    id: uniqueId('upgrade-entry-list', usedBlockIds),
    type: 'savedEntryList',
    storeId,
    fields: [
      {
        id: 'entry',
        label: 'Entry',
        inputType: 'text',
        placeholder: 'What happened?',
      },
      {
        id: 'result',
        label: 'Result',
        inputType: 'textarea',
        placeholder: 'Outcome, context, or follow-up.',
      },
    ],
    submitLabel: 'Save Entry',
    emptyText: 'No upgrade entries saved yet.',
  })

  blocks.push({
    id: uniqueId('upgrade-table', usedBlockIds),
    type: 'simpleTable',
    storeId,
    columns: [
      { fieldId: 'entry', label: 'Entry' },
      { fieldId: 'result', label: 'Result' },
    ],
    emptyText: 'Saved entries will appear here.',
  })

  return blocks
}

export const improveMockAppSpec = (
  currentAppSpec: AppSpec,
  prompt: string,
  warning?: string,
): GeneratedAppDraft => {
  const now = new Date().toISOString()
  const normalizedPrompt = prompt.trim()
  const lowerPrompt = normalizedPrompt.toLowerCase()
  const usedScreenIds = new Set(currentAppSpec.screens.map((screen) => screen.id))
  const usedBlockIds = new Set(
    currentAppSpec.screens.flatMap((screen) =>
      screen.blocks.map((block) => block.id),
    ),
  )
  const dataStores = structuredClone(currentAppSpec.dataStores)
  const usedStoreIds = new Set(dataStores.map((store) => store.id))
  const storeId = addStore(
    dataStores,
    usedStoreIds,
    'upgrade-entries',
    'Upgrade entries',
  )
  const screenTitle = screenTitleFor(lowerPrompt)
  const newScreen: AppScreenSpec = {
    id: uniqueId(screenTitle, usedScreenIds),
    title: screenTitle,
    description: 'A local fallback screen added from your improvement idea.',
    blocks: buildUpgradeBlocks(normalizedPrompt, storeId, usedBlockIds),
  }

  return {
    prompt: normalizedPrompt,
    assumptions: [
      'AI improvement failed, so AppForge added a local fallback upgrade screen.',
      'Existing screen, block, and data store ids were preserved to keep runtime data connected.',
      'The fallback adds notes, saved entries, and a review table around your improvement request.',
    ],
    appSpec: {
      ...structuredClone(currentAppSpec),
      description: `${currentAppSpec.description} Updated with: ${truncate(
        normalizedPrompt,
      )}.`,
      dataStores,
      screens: [...currentAppSpec.screens, newScreen],
      updatedAt: now,
      version: currentAppSpec.version + 1,
    },
    mode: 'improve',
    source: 'mock',
    targetAppId: currentAppSpec.id,
    warnings: warning ? [warning] : [],
  }
}
