import type {
  AppBlock,
  ListEditorBlock,
  RandomizerBlock,
  RuntimeValue,
} from '../types/appSpec'

interface RandomizerBlockViewProps {
  block: RandomizerBlock
  blocks: AppBlock[]
  value: RuntimeValue | undefined
  valuesByBlockId: Record<string, RuntimeValue>
  onValueChange: (blockId: string, value: RuntimeValue) => void
}

const getOptions = (
  sourceBlockId: string,
  blocks: AppBlock[],
  valuesByBlockId: Record<string, RuntimeValue>,
) => {
  const runtimeValue = valuesByBlockId[sourceBlockId]

  if (Array.isArray(runtimeValue)) {
    return runtimeValue
  }

  const sourceBlock = blocks.find(
    (candidate): candidate is ListEditorBlock =>
      candidate.id === sourceBlockId && candidate.type === 'listEditor',
  )

  return sourceBlock?.defaultItems ?? []
}

const pickOne = (items: string[]) => {
  if (items.length === 0) {
    return ''
  }

  return items[Math.floor(Math.random() * items.length)]
}

export function RandomizerBlockView({
  block,
  blocks,
  value,
  valuesByBlockId,
  onValueChange,
}: RandomizerBlockViewProps) {
  const result = typeof value === 'string' ? value : ''

  const generateResult = () => {
    const picks = block.sourceBlockIds
      .map((sourceBlockId) => pickOne(getOptions(sourceBlockId, blocks, valuesByBlockId)))
      .filter(Boolean)

    onValueChange(
      block.id,
      picks.length > 0 ? picks.join(' + ') : 'Add source items first',
    )
  }

  return (
    <section className="randomizer-block">
      <div>
        <h3>{block.label}</h3>
        {block.helpText ? <p>{block.helpText}</p> : null}
      </div>
      <button type="button" className="primary-button" onClick={generateResult}>
        {block.buttonLabel ?? 'Generate'}
      </button>
      <output>
        <span>{block.resultLabel ?? 'Result'}</span>
        <strong>{result || 'Tap generate'}</strong>
      </output>
    </section>
  )
}
