export type AppCategory =
  | 'calculator'
  | 'checklist'
  | 'tracker'
  | 'planner'
  | 'routine'
  | 'reference'
  | 'study'
  | 'restaurant'
  | 'decision'
  | 'custom'

export type DataStoreType = 'entries' | 'history' | 'list' | 'table'

export type EntryFieldType = 'text' | 'number' | 'date' | 'textarea' | 'select'

export type RuntimeValue = string | number | boolean | string[]

export interface AppSpec {
  id: string
  name: string
  description: string
  category: AppCategory
  icon: string
  version: number
  createdAt: string
  updatedAt: string
  dataStores: DataStoreSpec[]
  screens: AppScreenSpec[]
}

export interface DataStoreSpec {
  id: string
  name: string
  type: DataStoreType
}

export interface AppScreenSpec {
  id: string
  title: string
  description?: string
  blocks: AppBlock[]
}

export interface BaseBlock {
  id: string
  label?: string
  helpText?: string
}

export interface SelectOption {
  id: string
  label: string
  value: string
}

export interface SavedEntryField {
  id: string
  label: string
  inputType: EntryFieldType
  placeholder?: string
  options?: SelectOption[]
}

export type ButtonAction =
  | { type: 'clearValues'; blockIds: string[] }
  | { type: 'setValue'; targetBlockId: string; value: RuntimeValue }

export type ComputedOperation =
  | { type: 'add' | 'subtract' | 'multiply' | 'divide'; inputIds: string[] }
  | { type: 'concat'; inputIds: string[]; separator?: string }
  | { type: 'countChecked'; inputId: string }
  | { type: 'randomChoice'; sourceId: string }
  | { type: 'pace'; distanceInputId: string; minutesInputId: string }

export type AppBlock =
  | (BaseBlock & { type: 'heading'; text: string; level: 1 | 2 })
  | (BaseBlock & { type: 'paragraph'; text: string })
  | (BaseBlock & {
      type: 'textInput'
      placeholder?: string
      defaultValue?: string
    })
  | (BaseBlock & {
      type: 'numberInput'
      placeholder?: string
      defaultValue?: number
      unit?: string
    })
  | (BaseBlock & {
      type: 'textarea'
      placeholder?: string
      defaultValue?: string
    })
  | (BaseBlock & {
      type: 'select'
      options: SelectOption[]
      defaultValue?: string
    })
  | (BaseBlock & { type: 'checkbox'; text: string; defaultValue?: boolean })
  | (BaseBlock & {
      type: 'checkboxList'
      items: Array<{ id: string; label: string }>
    })
  | (BaseBlock & { type: 'button'; text: string; action?: ButtonAction })
  | (BaseBlock & {
      type: 'computedValue'
      operation: ComputedOperation
      resultLabel?: string
      precision?: number
    })
  | (BaseBlock & {
      type: 'savedEntryList'
      storeId: string
      fields: SavedEntryField[]
      submitLabel?: string
      emptyText?: string
    })
  | (BaseBlock & {
      type: 'listEditor'
      placeholder?: string
      addLabel?: string
      defaultItems?: string[]
    })
  | (BaseBlock & {
      type: 'randomizer'
      sourceBlockIds: string[]
      buttonLabel?: string
      resultLabel?: string
    })
  | (BaseBlock & {
      type: 'simpleTable'
      storeId: string
      columns: Array<{ fieldId: string; label: string }>
      emptyText?: string
    })

export interface GenerateAppSpecRequest {
  prompt: string
  existingAppSpecModelSummary?: string
  currentAppSpec?: AppSpec
  mode?: 'create' | 'improve'
}

export interface GenerateAppSpecResponse {
  appSpec: AppSpec
  warnings: string[]
}
