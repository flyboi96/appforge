import type {
  AppBlock,
  ComputedValueBlock,
  ListEditorBlock,
  RuntimeValue,
} from '../types/appSpec'

interface ComputedValueBlockViewProps {
  block: ComputedValueBlock
  blocks: AppBlock[]
  valuesByBlockId: Record<string, RuntimeValue>
}

const toNumber = (value: RuntimeValue | undefined) => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const formatNumber = (value: number, precision = 2) => {
  if (!Number.isFinite(value)) {
    return 'Invalid'
  }

  return value
    .toFixed(precision)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*[1-9])0+$/, '$1')
}

const getListValue = (
  blockId: string,
  blocks: AppBlock[],
  valuesByBlockId: Record<string, RuntimeValue>,
) => {
  const runtimeValue = valuesByBlockId[blockId]

  if (Array.isArray(runtimeValue)) {
    return runtimeValue
  }

  const sourceBlock = blocks.find(
    (candidate): candidate is ListEditorBlock =>
      candidate.id === blockId && candidate.type === 'listEditor',
  )

  return sourceBlock?.defaultItems ?? []
}

export function ComputedValueBlockView({
  block,
  blocks,
  valuesByBlockId,
}: ComputedValueBlockViewProps) {
  const operation = block.operation
  let result: string | number = ''

  if (
    operation.type === 'add' ||
    operation.type === 'subtract' ||
    operation.type === 'multiply' ||
    operation.type === 'divide'
  ) {
    const values = operation.inputIds.map((inputId) =>
      toNumber(valuesByBlockId[inputId]),
    )
    let numericResult = 0

    if (operation.type === 'add') {
      numericResult = values.reduce((total, value) => total + value, 0)
    }

    if (operation.type === 'subtract') {
      numericResult = values
        .slice(1)
        .reduce((total, value) => total - value, values[0] ?? 0)
    }

    if (operation.type === 'multiply') {
      numericResult = values.reduce((total, value) => total * value, 1)
    }

    if (operation.type === 'divide') {
      numericResult = values.slice(1).some((value) => value === 0)
        ? Number.NaN
        : values.slice(1).reduce((total, value) => total / value, values[0] ?? 0)
    }

    result = formatNumber(numericResult, block.precision)
  }

  if (operation.type === 'concat') {
    result = operation.inputIds
      .map((inputId) => valuesByBlockId[inputId])
      .filter((value) => typeof value === 'string' && value.trim() !== '')
      .join(operation.separator ?? ' ')
  }

  if (operation.type === 'countChecked') {
    const value = valuesByBlockId[operation.inputId]
    result = Array.isArray(value) ? value.length : 0
  }

  if (operation.type === 'randomChoice') {
    const options = getListValue(operation.sourceId, blocks, valuesByBlockId)
    result = options[0] ?? 'Add options first'
  }

  if (operation.type === 'pace') {
    const distance = toNumber(valuesByBlockId[operation.distanceInputId])
    const minutes = toNumber(valuesByBlockId[operation.minutesInputId])

    if (distance <= 0 || minutes <= 0) {
      result = 'Enter distance and time'
    } else {
      const pace = minutes / distance
      const wholeMinutes = Math.floor(pace)
      const seconds = Math.round((pace - wholeMinutes) * 60)
      result = `${wholeMinutes}:${seconds.toString().padStart(2, '0')} / unit`
    }
  }

  return (
    <section className="formula-block">
      <div>
        <span>{block.resultLabel ?? block.label ?? 'Result'}</span>
        {block.helpText ? <small>{block.helpText}</small> : null}
      </div>
      <output>{result}</output>
    </section>
  )
}
