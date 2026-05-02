import type { RuntimeValue, SelectBlock } from '../types/appSpec'

interface SelectBlockViewProps {
  block: SelectBlock
  value: RuntimeValue | undefined
  onValueChange: (blockId: string, value: RuntimeValue) => void
}

export function SelectBlockView({
  block,
  value,
  onValueChange,
}: SelectBlockViewProps) {
  const firstOption = block.options[0]?.value ?? ''
  const displayValue =
    typeof value === 'string' ? value : block.defaultValue ?? firstOption

  return (
    <label className="field-block">
      <span>{block.label}</span>
      {block.helpText ? <small>{block.helpText}</small> : null}
      <select
        value={displayValue}
        onChange={(event) => onValueChange(block.id, event.target.value)}
      >
        {block.options.map((option) => (
          <option key={option.id} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
