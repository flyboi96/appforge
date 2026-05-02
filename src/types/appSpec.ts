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

export type AppBlockType =
  | 'heading'
  | 'paragraph'
  | 'textInput'
  | 'numberInput'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'checkboxList'
  | 'button'
  | 'computedValue'
  | 'savedEntryList'
  | 'listEditor'
  | 'randomizer'
  | 'simpleTable'

export type DataStoreType = 'entries' | 'history' | 'list' | 'table'

export type EntryFieldType = 'text' | 'number' | 'date' | 'textarea' | 'select'

export type RuntimeValue = string | number | boolean | string[]

export type StoredValue = string | number | boolean

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
  type: AppBlockType
  label?: string
  helpText?: string
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading'
  text: string
  level: 1 | 2
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph'
  text: string
}

export interface TextInputBlock extends BaseBlock {
  type: 'textInput'
  placeholder?: string
  defaultValue?: string
}

export interface NumberInputBlock extends BaseBlock {
  type: 'numberInput'
  placeholder?: string
  defaultValue?: number
  unit?: string
}

export interface TextareaBlock extends BaseBlock {
  type: 'textarea'
  placeholder?: string
  defaultValue?: string
}

export interface SelectOption {
  id: string
  label: string
  value: string
}

export interface SelectBlock extends BaseBlock {
  type: 'select'
  options: SelectOption[]
  defaultValue?: string
}

export interface CheckboxBlock extends BaseBlock {
  type: 'checkbox'
  text: string
  defaultValue?: boolean
}

export interface CheckboxListItem {
  id: string
  label: string
}

export interface CheckboxListBlock extends BaseBlock {
  type: 'checkboxList'
  items: CheckboxListItem[]
}

export type ButtonAction =
  | { type: 'clearValues'; blockIds: string[] }
  | { type: 'setValue'; targetBlockId: string; value: RuntimeValue }

export interface ButtonBlock extends BaseBlock {
  type: 'button'
  text: string
  action?: ButtonAction
}

export type ComputedOperation =
  | { type: 'add' | 'subtract' | 'multiply' | 'divide'; inputIds: string[] }
  | { type: 'concat'; inputIds: string[]; separator?: string }
  | { type: 'countChecked'; inputId: string }
  | { type: 'randomChoice'; sourceId: string }
  | { type: 'pace'; distanceInputId: string; minutesInputId: string }

export interface ComputedValueBlock extends BaseBlock {
  type: 'computedValue'
  operation: ComputedOperation
  resultLabel?: string
  precision?: number
}

export interface SavedEntryField {
  id: string
  label: string
  inputType: EntryFieldType
  placeholder?: string
  options?: SelectOption[]
}

export interface SavedEntryListBlock extends BaseBlock {
  type: 'savedEntryList'
  storeId: string
  fields: SavedEntryField[]
  submitLabel?: string
  emptyText?: string
}

export interface ListEditorBlock extends BaseBlock {
  type: 'listEditor'
  placeholder?: string
  addLabel?: string
  defaultItems?: string[]
}

export interface RandomizerBlock extends BaseBlock {
  type: 'randomizer'
  sourceBlockIds: string[]
  buttonLabel?: string
  resultLabel?: string
}

export interface SimpleTableColumn {
  fieldId: string
  label: string
}

export interface SimpleTableBlock extends BaseBlock {
  type: 'simpleTable'
  storeId: string
  columns: SimpleTableColumn[]
  emptyText?: string
}

export type AppBlock =
  | HeadingBlock
  | ParagraphBlock
  | TextInputBlock
  | NumberInputBlock
  | TextareaBlock
  | SelectBlock
  | CheckboxBlock
  | CheckboxListBlock
  | ButtonBlock
  | ComputedValueBlock
  | SavedEntryListBlock
  | ListEditorBlock
  | RandomizerBlock
  | SimpleTableBlock

export interface StoredRecord {
  id: string
  createdAt: string
  values: Record<string, StoredValue>
}

export interface AppRuntimeState {
  valuesByBlockId: Record<string, RuntimeValue>
  dataByStoreId: Record<string, StoredRecord[]>
}

export interface AppForgeData {
  appSpecs: AppSpec[]
  runtimeByAppId: Record<string, AppRuntimeState>
}

export interface GeneratedAppDraft {
  prompt: string
  assumptions: string[]
  appSpec: AppSpec
  source?: 'ai' | 'mock'
  warnings?: string[]
}
