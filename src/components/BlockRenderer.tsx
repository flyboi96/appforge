import { ButtonBlockView } from '../blocks/ButtonBlockView'
import { CheckboxBlockView } from '../blocks/CheckboxBlockView'
import { CheckboxListBlockView } from '../blocks/CheckboxListBlockView'
import { ComputedValueBlockView } from '../blocks/ComputedValueBlockView'
import { HeadingBlockView } from '../blocks/HeadingBlockView'
import { ListEditorBlockView } from '../blocks/ListEditorBlockView'
import { NumberInputBlockView } from '../blocks/NumberInputBlockView'
import { ParagraphBlockView } from '../blocks/ParagraphBlockView'
import { RandomizerBlockView } from '../blocks/RandomizerBlockView'
import { SavedEntryListBlockView } from '../blocks/SavedEntryListBlockView'
import { SelectBlockView } from '../blocks/SelectBlockView'
import { SimpleTableBlockView } from '../blocks/SimpleTableBlockView'
import { TextareaBlockView } from '../blocks/TextareaBlockView'
import { TextInputBlockView } from '../blocks/TextInputBlockView'
import type {
  AppBlock,
  AppRuntimeState,
  ButtonBlock,
  RuntimeValue,
  StoredValue,
} from '../types/appSpec'

interface BlockRendererProps {
  block: AppBlock
  blocks: AppBlock[]
  runtime: AppRuntimeState
  onValueChange: (blockId: string, value: RuntimeValue) => void
  onClearValues: (blockIds: string[]) => void
  onRecordAdd: (storeId: string, values: Record<string, StoredValue>) => void
  onRecordDelete: (storeId: string, recordId: string) => void
}

export function BlockRenderer({
  block,
  blocks,
  runtime,
  onValueChange,
  onClearValues,
  onRecordAdd,
  onRecordDelete,
}: BlockRendererProps) {
  switch (block.type) {
    case 'heading':
      return <HeadingBlockView block={block} />
    case 'paragraph':
      return <ParagraphBlockView block={block} />
    case 'textInput':
      return (
        <TextInputBlockView
          block={block}
          value={runtime.valuesByBlockId[block.id]}
          onValueChange={onValueChange}
        />
      )
    case 'numberInput':
      return (
        <NumberInputBlockView
          block={block}
          value={runtime.valuesByBlockId[block.id]}
          onValueChange={onValueChange}
        />
      )
    case 'textarea':
      return (
        <TextareaBlockView
          block={block}
          value={runtime.valuesByBlockId[block.id]}
          onValueChange={onValueChange}
        />
      )
    case 'select':
      return (
        <SelectBlockView
          block={block}
          value={runtime.valuesByBlockId[block.id]}
          onValueChange={onValueChange}
        />
      )
    case 'checkbox':
      return (
        <CheckboxBlockView
          block={block}
          value={runtime.valuesByBlockId[block.id]}
          onValueChange={onValueChange}
        />
      )
    case 'checkboxList':
      return (
        <CheckboxListBlockView
          block={block}
          value={runtime.valuesByBlockId[block.id]}
          onValueChange={onValueChange}
        />
      )
    case 'button':
      return (
        <ButtonBlockView
          block={block}
          onAction={(buttonBlock) =>
            handleButtonAction(buttonBlock, onValueChange, onClearValues)
          }
        />
      )
    case 'computedValue':
      return (
        <ComputedValueBlockView
          block={block}
          blocks={blocks}
          valuesByBlockId={runtime.valuesByBlockId}
        />
      )
    case 'savedEntryList':
      return (
        <SavedEntryListBlockView
          block={block}
          entries={runtime.dataByStoreId[block.storeId] ?? []}
          onRecordAdd={onRecordAdd}
          onRecordDelete={onRecordDelete}
        />
      )
    case 'listEditor':
      return (
        <ListEditorBlockView
          block={block}
          value={runtime.valuesByBlockId[block.id]}
          onValueChange={onValueChange}
        />
      )
    case 'randomizer':
      return (
        <RandomizerBlockView
          block={block}
          blocks={blocks}
          value={runtime.valuesByBlockId[block.id]}
          valuesByBlockId={runtime.valuesByBlockId}
          onValueChange={onValueChange}
        />
      )
    case 'simpleTable':
      return (
        <SimpleTableBlockView
          block={block}
          records={runtime.dataByStoreId[block.storeId] ?? []}
        />
      )
    default:
      return <UnsupportedBlock type="unknown" />
  }
}

const handleButtonAction = (
  block: ButtonBlock,
  onValueChange: (blockId: string, value: RuntimeValue) => void,
  onClearValues: (blockIds: string[]) => void,
) => {
  if (!block.action) {
    return
  }

  if (block.action.type === 'clearValues') {
    onClearValues(block.action.blockIds)
  }

  if (block.action.type === 'setValue') {
    onValueChange(block.action.targetBlockId, block.action.value)
  }
}

function UnsupportedBlock({ type }: { type: string }) {
  return (
    <section className="unsupported-block">
      <strong>Unsupported block</strong>
      <span>{type}</span>
    </section>
  )
}
