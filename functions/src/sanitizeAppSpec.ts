import { randomUUID } from 'node:crypto'
import type {
  AppBlock,
  AppCategory,
  AppScreenSpec,
  AppSpec,
  ButtonAction,
  ComputedOperation,
  DataStoreSpec,
  DataStoreType,
  EntryFieldType,
  RuntimeValue,
  SavedEntryField,
  SelectOption,
} from './appSpecTypes'

interface SanitizeResult {
  appSpec: AppSpec
  warnings: string[]
}

interface SanitizeOptions {
  preserveMetadata?: {
    createdAt: string
    id: string
    version: number
  }
}

const appCategories = new Set<AppCategory>([
  'calculator',
  'checklist',
  'tracker',
  'planner',
  'routine',
  'reference',
  'study',
  'restaurant',
  'decision',
  'custom',
])

const dataStoreTypes = new Set<DataStoreType>(['entries', 'history', 'list', 'table'])

const entryFieldTypes = new Set<EntryFieldType>([
  'text',
  'number',
  'date',
  'textarea',
  'select',
])

const maxScreens = 5
const maxBlocksPerScreen = 14
const maxDataStores = 8
const maxOptions = 20
const maxFields = 10
const maxStringLength = 280
const maxLongStringLength = 900

const fallbackIconsByCategory: Record<AppCategory, string> = {
  calculator: '🧮',
  checklist: '✅',
  tracker: '📓',
  planner: '🗓',
  routine: '🔁',
  reference: '📚',
  study: '🧠',
  restaurant: '🍽',
  decision: '🧭',
  custom: '✨',
}

const emojiPattern = /\p{Extended_Pictographic}/u

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isRuntimeValue = (value: unknown): value is RuntimeValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  (Array.isArray(value) && value.every((item) => typeof item === 'string'))

const truncate = (value: string, maxLength = maxStringLength) =>
  value.length > maxLength ? value.slice(0, maxLength).trim() : value.trim()

const text = (value: unknown, fallback: string, maxLength = maxStringLength) => {
  if (typeof value !== 'string') {
    return fallback
  }

  const nextValue = truncate(value, maxLength)
  return nextValue || fallback
}

const optionalText = (value: unknown, maxLength = maxStringLength) => {
  if (typeof value !== 'string') {
    return undefined
  }

  const nextValue = truncate(value, maxLength)
  return nextValue || undefined
}

const icon = (value: unknown, category: AppCategory) => {
  if (typeof value !== 'string') {
    return fallbackIconsByCategory[category]
  }

  for (const character of Array.from(value.trim())) {
    if (emojiPattern.test(character)) {
      return character
    }
  }

  return fallbackIconsByCategory[category]
}

const slugify = (value: string, fallback: string) =>
  (value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || fallback

const uniqueId = (rawValue: unknown, fallback: string, usedIds: Set<string>) => {
  const base = slugify(typeof rawValue === 'string' ? rawValue : fallback, fallback)
  let candidate = base
  let index = 2

  while (usedIds.has(candidate)) {
    candidate = `${base}-${index}`
    index += 1
  }

  usedIds.add(candidate)
  return candidate
}

const stringArray = (value: unknown, maxItems = maxOptions) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => truncate(item))
        .filter(Boolean)
        .slice(0, maxItems)
    : []

const sanitizeOptions = (value: unknown, warnings: string[]) => {
  if (!Array.isArray(value)) {
    return []
  }

  const usedIds = new Set<string>()
  return value.reduce<SelectOption[]>((options, option, index) => {
    if (!isRecord(option)) {
      warnings.push('Dropped an invalid select option.')
      return options
    }

    const label = text(option.label, `Option ${index + 1}`)
    options.push({
      id: uniqueId(option.id, label, usedIds),
      label,
      value: text(option.value, label),
    })

    return options
  }, []).slice(0, maxOptions)
}

const sanitizeDataStores = (value: unknown, warnings: string[]) => {
  if (!Array.isArray(value)) {
    warnings.push('Generated app did not include dataStores; using none.')
    return []
  }

  const usedIds = new Set<string>()
  return value.reduce<DataStoreSpec[]>((stores, store, index) => {
    if (!isRecord(store)) {
      warnings.push('Dropped an invalid data store.')
      return stores
    }

    const rawType = store.type
    const typeValue =
      typeof rawType === 'string' && dataStoreTypes.has(rawType as DataStoreType)
        ? (rawType as DataStoreType)
        : 'entries'

    if (typeValue !== rawType) {
      warnings.push('Replaced an invalid data store type with entries.')
    }

    stores.push({
      id: uniqueId(store.id, `store-${index + 1}`, usedIds),
      name: text(store.name, `Store ${index + 1}`),
      type: typeValue,
    })

    return stores
  }, []).slice(0, maxDataStores)
}

const baseBlock = (
  block: Record<string, unknown>,
  fallbackId: string,
  usedIds: Set<string>,
) => ({
  id: uniqueId(block.id, fallbackId, usedIds),
  label: optionalText(block.label),
  helpText: optionalText(block.helpText, maxLongStringLength),
})

const sanitizeEntryFields = (
  value: unknown,
  warnings: string[],
): SavedEntryField[] => {
  if (!Array.isArray(value)) {
    return []
  }

  const usedIds = new Set<string>()
  return value.reduce<SavedEntryField[]>((fields, field, index) => {
    if (!isRecord(field)) {
      warnings.push('Dropped an invalid saved entry field.')
      return fields
    }

    const rawType = field.inputType
    const inputType =
      typeof rawType === 'string' && entryFieldTypes.has(rawType as EntryFieldType)
        ? (rawType as EntryFieldType)
        : 'text'
    const label = text(field.label, `Field ${index + 1}`)
    const nextField: SavedEntryField = {
      id: uniqueId(field.id, label, usedIds),
      label,
      inputType,
      placeholder: optionalText(field.placeholder),
    }

    if (inputType === 'select') {
      const options = sanitizeOptions(field.options, warnings)
      nextField.options =
        options.length > 0
          ? options
          : [
              { id: 'option-1', label: 'Option 1', value: 'Option 1' },
              { id: 'option-2', label: 'Option 2', value: 'Option 2' },
            ]
    }

    fields.push(nextField)
    return fields
  }, []).slice(0, maxFields)
}

const sanitizeButtonAction = (value: unknown): ButtonAction | undefined => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return undefined
  }

  if (value.type === 'clearValues') {
    return {
      type: 'clearValues',
      blockIds: stringArray(value.blockIds),
    }
  }

  if (
    value.type === 'setValue' &&
    typeof value.targetBlockId === 'string' &&
    isRuntimeValue(value.value)
  ) {
    return {
      type: 'setValue',
      targetBlockId: slugify(value.targetBlockId, 'target'),
      value: value.value,
    }
  }

  return undefined
}

const sanitizeComputedOperation = (
  value: unknown,
): ComputedOperation | undefined => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return undefined
  }

  if (['add', 'subtract', 'multiply', 'divide'].includes(value.type)) {
    return {
      type: value.type as 'add' | 'subtract' | 'multiply' | 'divide',
      inputIds: stringArray(value.inputIds),
    }
  }

  if (value.type === 'concat') {
    return {
      type: 'concat',
      inputIds: stringArray(value.inputIds),
      separator: optionalText(value.separator, 20),
    }
  }

  if (value.type === 'countChecked' && typeof value.inputId === 'string') {
    return { type: 'countChecked', inputId: slugify(value.inputId, 'input') }
  }

  if (value.type === 'randomChoice' && typeof value.sourceId === 'string') {
    return { type: 'randomChoice', sourceId: slugify(value.sourceId, 'source') }
  }

  if (
    value.type === 'pace' &&
    typeof value.distanceInputId === 'string' &&
    typeof value.minutesInputId === 'string'
  ) {
    return {
      type: 'pace',
      distanceInputId: slugify(value.distanceInputId, 'distance'),
      minutesInputId: slugify(value.minutesInputId, 'minutes'),
    }
  }

  return undefined
}

const sanitizeBlock = (
  value: unknown,
  index: number,
  usedIds: Set<string>,
  warnings: string[],
): AppBlock | null => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    warnings.push('Dropped a block with an invalid shape.')
    return null
  }

  const base = baseBlock(value, `${value.type}-${index + 1}`, usedIds)

  switch (value.type) {
    case 'heading':
      return {
        ...base,
        type: 'heading',
        text: text(value.text, 'Untitled'),
        level: value.level === 2 ? 2 : 1,
      }
    case 'paragraph':
      return {
        ...base,
        type: 'paragraph',
        text: text(value.text, '', maxLongStringLength),
      }
    case 'textInput':
      return {
        ...base,
        type: 'textInput',
        placeholder: optionalText(value.placeholder),
        defaultValue: optionalText(value.defaultValue),
      }
    case 'numberInput':
      return {
        ...base,
        type: 'numberInput',
        placeholder: optionalText(value.placeholder),
        defaultValue:
          typeof value.defaultValue === 'number' ? value.defaultValue : undefined,
        unit: optionalText(value.unit, 24),
      }
    case 'textarea':
      return {
        ...base,
        type: 'textarea',
        placeholder: optionalText(value.placeholder),
        defaultValue: optionalText(value.defaultValue, maxLongStringLength),
      }
    case 'select': {
      const options = sanitizeOptions(value.options, warnings)
      if (options.length === 0) {
        warnings.push('Dropped a select block without options.')
        return null
      }

      return {
        ...base,
        type: 'select',
        options,
        defaultValue: optionalText(value.defaultValue),
      }
    }
    case 'checkbox':
      return {
        ...base,
        type: 'checkbox',
        text: text(value.text, 'Check item'),
        defaultValue:
          typeof value.defaultValue === 'boolean' ? value.defaultValue : undefined,
      }
    case 'checkboxList': {
      const usedItemIds = new Set<string>()
      const items = Array.isArray(value.items)
        ? value.items
            .filter(isRecord)
            .map((item, itemIndex) => {
              const label = text(item.label, `Item ${itemIndex + 1}`)
              return {
                id: uniqueId(item.id, label, usedItemIds),
                label,
              }
            })
            .slice(0, maxOptions)
        : []

      if (items.length === 0) {
        warnings.push('Dropped a checkbox list without items.')
        return null
      }

      return { ...base, type: 'checkboxList', items }
    }
    case 'button':
      return {
        ...base,
        type: 'button',
        text: text(value.text, 'Run'),
        action: sanitizeButtonAction(value.action),
      }
    case 'computedValue': {
      const operation = sanitizeComputedOperation(value.operation)

      if (!operation) {
        warnings.push('Dropped a computed value block with an invalid operation.')
        return null
      }

      return {
        ...base,
        type: 'computedValue',
        operation,
        resultLabel: optionalText(value.resultLabel),
        precision: typeof value.precision === 'number' ? value.precision : undefined,
      }
    }
    case 'savedEntryList': {
      const fields = sanitizeEntryFields(value.fields, warnings)

      if (fields.length === 0) {
        warnings.push('Dropped a saved entry block without fields.')
        return null
      }

      return {
        ...base,
        type: 'savedEntryList',
        storeId: slugify(text(value.storeId, 'entries'), 'entries'),
        fields,
        submitLabel: optionalText(value.submitLabel),
        emptyText: optionalText(value.emptyText),
      }
    }
    case 'listEditor':
      return {
        ...base,
        type: 'listEditor',
        placeholder: optionalText(value.placeholder),
        addLabel: optionalText(value.addLabel),
        defaultItems: stringArray(value.defaultItems),
      }
    case 'randomizer':
      return {
        ...base,
        type: 'randomizer',
        sourceBlockIds: stringArray(value.sourceBlockIds).map((id) =>
          slugify(id, 'source'),
        ),
        buttonLabel: optionalText(value.buttonLabel),
        resultLabel: optionalText(value.resultLabel),
      }
    case 'simpleTable':
      return {
        ...base,
        type: 'simpleTable',
        storeId: slugify(text(value.storeId, 'entries'), 'entries'),
        columns: Array.isArray(value.columns)
          ? value.columns
              .filter(isRecord)
              .map((column, columnIndex) => ({
                fieldId: slugify(text(column.fieldId, `field-${columnIndex + 1}`), 'field'),
                label: text(column.label, `Column ${columnIndex + 1}`),
              }))
              .slice(0, maxFields)
          : [],
        emptyText: optionalText(value.emptyText),
      }
    default:
      warnings.push(`Dropped unsupported block type: ${value.type}.`)
      return null
  }
}

const fallbackScreen = (): AppScreenSpec => ({
  id: 'overview',
  title: 'Overview',
  description: 'Generated fallback screen.',
  blocks: [
    {
      id: 'intro',
      type: 'paragraph',
      text: 'This generated app needed cleanup before it could be rendered.',
    },
  ],
})

const sanitizeScreens = (value: unknown, warnings: string[]) => {
  if (!Array.isArray(value)) {
    warnings.push('Generated app did not include screens; created a fallback screen.')
    return [fallbackScreen()]
  }

  const usedScreenIds = new Set<string>()
  const usedBlockIds = new Set<string>()
  const screens = value.reduce<AppScreenSpec[]>((nextScreens, screen, index) => {
    if (!isRecord(screen)) {
      warnings.push('Dropped an invalid screen.')
      return nextScreens
    }

    const blocks = Array.isArray(screen.blocks)
      ? screen.blocks
          .slice(0, maxBlocksPerScreen)
          .map((block, blockIndex) =>
            sanitizeBlock(block, blockIndex, usedBlockIds, warnings),
          )
          .filter((block): block is AppBlock => block !== null)
      : []

    nextScreens.push({
      id: uniqueId(screen.id, `screen-${index + 1}`, usedScreenIds),
      title: text(screen.title, `Screen ${index + 1}`),
      description: optionalText(screen.description),
      blocks:
        blocks.length > 0
          ? blocks
          : [
              {
                id: uniqueId('screen-note', `screen-note-${index + 1}`, usedBlockIds),
                type: 'paragraph',
                text: 'This screen was generated without renderable blocks.',
              },
            ],
    })

    return nextScreens
  }, []).slice(0, maxScreens)

  return screens.length > 0 ? screens : [fallbackScreen()]
}

const referencedIdsForOperation = (operation: ComputedOperation) => {
  switch (operation.type) {
    case 'add':
    case 'subtract':
    case 'multiply':
    case 'divide':
    case 'concat':
      return operation.inputIds
    case 'countChecked':
      return [operation.inputId]
    case 'randomChoice':
      return [operation.sourceId]
    case 'pace':
      return [operation.distanceInputId, operation.minutesInputId]
  }
}

const repairReferences = (appSpec: AppSpec, warnings: string[]) => {
  const dataStores = [...appSpec.dataStores]
  const storeIds = new Set(dataStores.map((store) => store.id))
  const allBlocks = appSpec.screens.flatMap((screen) => screen.blocks)
  const blockIds = new Set(allBlocks.map((block) => block.id))
  const listEditorIds = new Set(
    allBlocks
      .filter((block) => block.type === 'listEditor')
      .map((block) => block.id),
  )

  const ensureStore = (storeId: string) => {
    if (storeIds.has(storeId)) {
      return
    }

    storeIds.add(storeId)
    dataStores.push({
      id: storeId,
      name: `${storeId.replace(/-/g, ' ')} store`,
      type: 'entries',
    })
    warnings.push(`Added missing data store for ${storeId}.`)
  }

  const screens = appSpec.screens.map((screen) => ({
    ...screen,
    blocks: screen.blocks
      .map((block): AppBlock | null => {
        if (block.type === 'savedEntryList') {
          ensureStore(block.storeId)
        }

        if (block.type === 'simpleTable') {
          ensureStore(block.storeId)
          return block.columns.length > 0
            ? block
            : { ...block, columns: [{ fieldId: 'title', label: 'Title' }] }
        }

        if (block.type === 'randomizer') {
          const sourceBlockIds = block.sourceBlockIds.filter((id) =>
            listEditorIds.has(id),
          )

          if (sourceBlockIds.length === 0) {
            warnings.push('Dropped a randomizer with no valid listEditor sources.')
            return null
          }

          return { ...block, sourceBlockIds }
        }

        if (block.type === 'computedValue') {
          const referencedIds = referencedIdsForOperation(block.operation)
          const hasAllRefs = referencedIds.every((id) => blockIds.has(id))

          if (!hasAllRefs) {
            warnings.push('Dropped a computed value with invalid block references.')
            return null
          }
        }

        if (block.type === 'button' && block.action?.type === 'clearValues') {
          return {
            ...block,
            action: {
              type: 'clearValues',
              blockIds: block.action.blockIds.filter((id) => blockIds.has(id)),
            },
          }
        }

        if (
          block.type === 'button' &&
          block.action?.type === 'setValue' &&
          !blockIds.has(block.action.targetBlockId)
        ) {
          return { ...block, action: undefined }
        }

        return block
      })
      .filter((block): block is AppBlock => block !== null),
  }))

  return { ...appSpec, dataStores, screens }
}

export const sanitizeAppSpec = (
  value: unknown,
  options: SanitizeOptions = {},
): SanitizeResult => {
  const warnings: string[] = []

  if (!isRecord(value)) {
    throw new Error('Model did not return an AppSpec object.')
  }

  const rawCategory = value.category
  const category =
    typeof rawCategory === 'string' && appCategories.has(rawCategory as AppCategory)
      ? (rawCategory as AppCategory)
      : 'custom'

  if (category !== rawCategory) {
    warnings.push('Replaced invalid category with custom.')
  }

  const now = new Date().toISOString()
  const preservedMetadata = options.preserveMetadata
  const appSpec: AppSpec = {
    id: preservedMetadata?.id ?? randomUUID(),
    name: text(value.name, 'Generated App'),
    description: text(
      value.description,
      'Generated by AppForge AI.',
      maxLongStringLength,
    ),
    category,
    icon: icon(value.icon, category),
    version: preservedMetadata ? preservedMetadata.version + 1 : 1,
    createdAt: preservedMetadata?.createdAt ?? now,
    updatedAt: now,
    dataStores: sanitizeDataStores(value.dataStores, warnings),
    screens: sanitizeScreens(value.screens, warnings),
  }

  return {
    appSpec: repairReferences(appSpec, warnings),
    warnings: warnings.slice(0, 12),
  }
}
