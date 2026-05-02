import type { NumberInputBlock, RuntimeValue } from '../types/appSpec'

interface NumberInputBlockViewProps {
  block: NumberInputBlock
  value: RuntimeValue | undefined
  onValueChange: (blockId: string, value: RuntimeValue) => void
}

export function NumberInputBlockView({
  block,
  value,
  onValueChange,
}: NumberInputBlockViewProps) {
  const displayValue =
    typeof value === 'number' || typeof value === 'string'
      ? value
      : block.defaultValue ?? ''

  return (
    <label className="field-block">
      <span>{block.label}</span>
      {block.helpText ? <small>{block.helpText}</small> : null}
      <div className="input-with-unit">
        <input
          type="number"
          inputMode="decimal"
          value={displayValue}
          placeholder={block.placeholder}
          onChange={(event) => {
            const nextValue = event.target.value
            onValueChange(block.id, nextValue === '' ? '' : Number(nextValue))
          }}
        />
        {block.unit ? <span>{block.unit}</span> : null}
      </div>
    </label>
  )
}
