import type {
  AppBlock,
  AppForgeData,
  AppRuntimeState,
  AppSpec,
  AppScreenSpec,
  ButtonAction,
  ComputedOperation,
  DataStoreSpec,
  EntryFieldType,
  RuntimeValue,
  SelectOption,
  SimpleTableColumn,
  StoredRecord,
  StoredValue,
} from '../types/appSpec'

const STORAGE_KEY = 'appforge:data:v2'

const appCategories = new Set<AppSpec['category']>([
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

export const emptyRuntimeState = (): AppRuntimeState => ({
  valuesByBlockId: {},
  dataByStoreId: {},
})

export const emptyAppForgeData = (): AppForgeData => ({
  appSpecs: [],
  runtimeByAppId: {},
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asOptionalString = (value: unknown) =>
  typeof value === 'string' ? value : undefined

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const normalizeButtonAction = (value: unknown): ButtonAction | undefined => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return undefined
  }

  if (value.type === 'clearValues' && isStringArray(value.blockIds)) {
    return {
      type: 'clearValues',
      blockIds: value.blockIds,
    }
  }

  if (
    value.type === 'setValue' &&
    typeof value.targetBlockId === 'string' &&
    isRuntimeValue(value.value)
  ) {
    return {
      type: 'setValue',
      targetBlockId: value.targetBlockId,
      value: value.value,
    }
  }

  return undefined
}

const normalizeComputedOperation = (
  value: unknown,
): ComputedOperation | null => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return null
  }

  if (
    ['add', 'subtract', 'multiply', 'divide'].includes(value.type) &&
    isStringArray(value.inputIds)
  ) {
    return {
      type: value.type as 'add' | 'subtract' | 'multiply' | 'divide',
      inputIds: value.inputIds,
    }
  }

  if (value.type === 'concat' && isStringArray(value.inputIds)) {
    return {
      type: 'concat',
      inputIds: value.inputIds,
      separator: asOptionalString(value.separator),
    }
  }

  if (value.type === 'countChecked' && typeof value.inputId === 'string') {
    return {
      type: 'countChecked',
      inputId: value.inputId,
    }
  }

  if (value.type === 'randomChoice' && typeof value.sourceId === 'string') {
    return {
      type: 'randomChoice',
      sourceId: value.sourceId,
    }
  }

  if (
    value.type === 'pace' &&
    typeof value.distanceInputId === 'string' &&
    typeof value.minutesInputId === 'string'
  ) {
    return {
      type: 'pace',
      distanceInputId: value.distanceInputId,
      minutesInputId: value.minutesInputId,
    }
  }

  return null
}

const normalizeOptions = (value: unknown): SelectOption[] =>
  Array.isArray(value)
    ? value.reduce<SelectOption[]>((options, option) => {
        if (
          isRecord(option) &&
          typeof option.id === 'string' &&
          typeof option.label === 'string' &&
          typeof option.value === 'string'
        ) {
          options.push({
            id: option.id,
            label: option.label,
            value: option.value,
          })
        }

        return options
      }, [])
    : []

const normalizeColumns = (value: unknown): SimpleTableColumn[] =>
  Array.isArray(value)
    ? value.reduce<SimpleTableColumn[]>((columns, column) => {
        if (
          isRecord(column) &&
          typeof column.fieldId === 'string' &&
          typeof column.label === 'string'
        ) {
          columns.push({
            fieldId: column.fieldId,
            label: column.label,
          })
        }

        return columns
      }, [])
    : []

const normalizeDataStore = (value: unknown): DataStoreSpec | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.type !== 'string'
  ) {
    return null
  }

  if (!['entries', 'history', 'list', 'table'].includes(value.type)) {
    return null
  }

  return {
    id: value.id,
    name: value.name,
    type: value.type,
  } as DataStoreSpec
}

const normalizeEntryFields = (value: unknown) =>
  Array.isArray(value)
    ? value.reduce<
        Array<{
          id: string
          label: string
          inputType: EntryFieldType
          placeholder?: string
          options?: SelectOption[]
        }>
      >((fields, field) => {
        if (
          isRecord(field) &&
          typeof field.id === 'string' &&
          typeof field.label === 'string' &&
          typeof field.inputType === 'string' &&
          ['text', 'number', 'date', 'textarea', 'select'].includes(
            field.inputType,
          )
        ) {
          fields.push({
            id: field.id,
            label: field.label,
            inputType: field.inputType as EntryFieldType,
            placeholder: asOptionalString(field.placeholder),
            options: normalizeOptions(field.options),
          })
        }

        return fields
      }, [])
    : []

const normalizeBlock = (value: unknown): AppBlock | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.type !== 'string'
  ) {
    return null
  }

  const base = {
    id: value.id,
    label: asOptionalString(value.label),
    helpText: asOptionalString(value.helpText),
  }

  switch (value.type) {
    case 'heading':
      if (typeof value.text !== 'string') {
        return null
      }

      return {
        ...base,
        type: 'heading',
        text: value.text,
        level: value.level === 2 ? 2 : 1,
      }
    case 'paragraph':
      return typeof value.text === 'string'
        ? { ...base, type: 'paragraph', text: value.text }
        : null
    case 'textInput':
      return {
        ...base,
        type: 'textInput',
        placeholder: asOptionalString(value.placeholder),
        defaultValue: asOptionalString(value.defaultValue),
      }
    case 'numberInput':
      return {
        ...base,
        type: 'numberInput',
        placeholder: asOptionalString(value.placeholder),
        defaultValue:
          typeof value.defaultValue === 'number' ? value.defaultValue : undefined,
        unit: asOptionalString(value.unit),
      }
    case 'textarea':
      return {
        ...base,
        type: 'textarea',
        placeholder: asOptionalString(value.placeholder),
        defaultValue: asOptionalString(value.defaultValue),
      }
    case 'select': {
      const options = normalizeOptions(value.options)

      return options.length > 0
        ? {
            ...base,
            type: 'select',
            options,
            defaultValue: asOptionalString(value.defaultValue),
          }
        : null
    }
    case 'checkbox':
      return typeof value.text === 'string'
        ? {
            ...base,
            type: 'checkbox',
            text: value.text,
            defaultValue:
              typeof value.defaultValue === 'boolean'
                ? value.defaultValue
                : undefined,
          }
        : null
    case 'checkboxList':
      if (!Array.isArray(value.items)) {
        return null
      }

      return {
        ...base,
        type: 'checkboxList',
        items: value.items.reduce<Array<{ id: string; label: string }>>(
          (items, item) => {
            if (
              isRecord(item) &&
              typeof item.id === 'string' &&
              typeof item.label === 'string'
            ) {
              items.push({ id: item.id, label: item.label })
            }

            return items
          },
          [],
        ),
      }
    case 'button':
      return typeof value.text === 'string'
        ? {
            ...base,
            type: 'button',
            text: value.text,
            action: normalizeButtonAction(value.action),
          }
        : null
    case 'computedValue': {
      const operation = normalizeComputedOperation(value.operation)

      return operation
        ? {
            ...base,
            type: 'computedValue',
            operation,
            resultLabel: asOptionalString(value.resultLabel),
            precision:
              typeof value.precision === 'number' ? value.precision : undefined,
          }
        : null
    }
    case 'savedEntryList': {
      const fields = normalizeEntryFields(value.fields)

      return typeof value.storeId === 'string' && fields.length > 0
        ? {
            ...base,
            type: 'savedEntryList',
            storeId: value.storeId,
            fields,
            submitLabel: asOptionalString(value.submitLabel),
            emptyText: asOptionalString(value.emptyText),
          }
        : null
    }
    case 'listEditor':
      return {
        ...base,
        type: 'listEditor',
        placeholder: asOptionalString(value.placeholder),
        addLabel: asOptionalString(value.addLabel),
        defaultItems: isStringArray(value.defaultItems)
          ? value.defaultItems
          : undefined,
      }
    case 'randomizer':
      return isStringArray(value.sourceBlockIds)
        ? {
            ...base,
            type: 'randomizer',
            sourceBlockIds: value.sourceBlockIds,
            buttonLabel: asOptionalString(value.buttonLabel),
            resultLabel: asOptionalString(value.resultLabel),
          }
        : null
    case 'simpleTable':
      return typeof value.storeId === 'string'
        ? {
            ...base,
            type: 'simpleTable',
            storeId: value.storeId,
            columns: normalizeColumns(value.columns),
            emptyText: asOptionalString(value.emptyText),
          }
        : null
    default:
      return null
  }
}

const normalizeScreen = (value: unknown): AppScreenSpec | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !Array.isArray(value.blocks)
  ) {
    return null
  }

  return {
    id: value.id,
    title: value.title,
    description: asOptionalString(value.description),
    blocks: value.blocks
      .map((block) => normalizeBlock(block))
      .filter((block): block is AppBlock => block !== null),
  }
}

export const normalizeAppSpec = (value: unknown): AppSpec | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.description !== 'string' ||
    typeof value.category !== 'string' ||
    typeof value.icon !== 'string' ||
    !Array.isArray(value.dataStores) ||
    !Array.isArray(value.screens)
  ) {
    return null
  }

  if (!appCategories.has(value.category as AppSpec['category'])) {
    return null
  }

  const screens = value.screens
    .map((screen) => normalizeScreen(screen))
    .filter((screen): screen is AppScreenSpec => screen !== null)

  if (screens.length === 0) {
    return null
  }

  return {
    id: value.id,
    name: value.name,
    description: value.description,
    category: value.category as AppSpec['category'],
    icon: value.icon,
    version: typeof value.version === 'number' ? value.version : 1,
    createdAt:
      typeof value.createdAt === 'string'
        ? value.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof value.updatedAt === 'string'
        ? value.updatedAt
        : new Date().toISOString(),
    dataStores: value.dataStores
      .map((store) => normalizeDataStore(store))
      .filter((store): store is DataStoreSpec => store !== null),
    screens,
  }
}

const isRuntimeValue = (value: unknown): value is RuntimeValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  (Array.isArray(value) && value.every((item) => typeof item === 'string'))

const isStoredValue = (value: unknown): value is StoredValue =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean'

const isStoredRecord = (value: unknown): value is StoredRecord =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.createdAt === 'string' &&
  isRecord(value.values) &&
  Object.values(value.values).every(isStoredValue)

const normalizeRuntimeState = (value: unknown): AppRuntimeState => {
  if (!isRecord(value)) {
    return emptyRuntimeState()
  }

  const valuesByBlockId = isRecord(value.valuesByBlockId)
    ? Object.entries(value.valuesByBlockId).reduce<Record<string, RuntimeValue>>(
        (nextValues, [blockId, runtimeValue]) => {
          if (isRuntimeValue(runtimeValue)) {
            nextValues[blockId] = runtimeValue
          }

          return nextValues
        },
        {},
      )
    : {}

  const dataByStoreId = isRecord(value.dataByStoreId)
    ? Object.entries(value.dataByStoreId).reduce<Record<string, StoredRecord[]>>(
        (nextStores, [storeId, records]) => {
          if (Array.isArray(records)) {
            nextStores[storeId] = records.filter(isStoredRecord)
          }

          return nextStores
        },
        {},
      )
    : {}

  return {
    valuesByBlockId,
    dataByStoreId,
  }
}

export const normalizeAppForgeData = (value: unknown): AppForgeData | null => {
  if (!isRecord(value) || !Array.isArray(value.appSpecs)) {
    return null
  }

  const runtimeByAppId = isRecord(value.runtimeByAppId)
    ? Object.fromEntries(
        Object.entries(value.runtimeByAppId).map(([appId, runtime]) => [
          appId,
          normalizeRuntimeState(runtime),
        ]),
      )
    : {}

  return {
    appSpecs: value.appSpecs
      .map((appSpec) => normalizeAppSpec(appSpec))
      .filter((appSpec): appSpec is AppSpec => appSpec !== null),
    runtimeByAppId,
  }
}

export const parseAppForgeDataJson = (json: string): AppForgeData | null => {
  try {
    return normalizeAppForgeData(JSON.parse(json))
  } catch {
    return null
  }
}

export const loadAppForgeData = (): AppForgeData => {
  if (typeof window === 'undefined') {
    return emptyAppForgeData()
  }

  let stored: string | null

  try {
    stored = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return emptyAppForgeData()
  }

  if (!stored) {
    return emptyAppForgeData()
  }

  try {
    const parsed: unknown = JSON.parse(stored)
    return normalizeAppForgeData(parsed) ?? emptyAppForgeData()
  } catch {
    return emptyAppForgeData()
  }
}

export const saveAppForgeData = (data: AppForgeData) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Keep the app usable if storage is unavailable or full.
  }
}

export const resetAppForgeData = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Keep reset non-fatal in restricted browser contexts.
  }
}
