import type { RuntimeValue, TextInputBlock } from '../types/appSpec'

interface TextInputBlockViewProps {
  block: TextInputBlock
  value: RuntimeValue | undefined
  onValueChange: (blockId: string, value: RuntimeValue) => void
}

export function TextInputBlockView({
  block,
  value,
  onValueChange,
}: TextInputBlockViewProps) {
  const displayValue = typeof value === 'string' ? value : block.defaultValue ?? ''

  return (
    <label className="field-block">
      <span>{block.label}</span>
      {block.helpText ? <small>{block.helpText}</small> : null}
      <input
        type="text"
        value={displayValue}
        placeholder={block.placeholder}
        onChange={(event) => onValueChange(block.id, event.target.value)}
      />
    </label>
  )
}
