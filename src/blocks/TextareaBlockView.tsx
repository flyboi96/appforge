import type { RuntimeValue, TextareaBlock } from '../types/appSpec'

interface TextareaBlockViewProps {
  block: TextareaBlock
  value: RuntimeValue | undefined
  onValueChange: (blockId: string, value: RuntimeValue) => void
}

export function TextareaBlockView({
  block,
  value,
  onValueChange,
}: TextareaBlockViewProps) {
  const displayValue = typeof value === 'string' ? value : block.defaultValue ?? ''

  return (
    <label className="field-block">
      <span>{block.label}</span>
      {block.helpText ? <small>{block.helpText}</small> : null}
      <textarea
        value={displayValue}
        placeholder={block.placeholder}
        rows={4}
        onChange={(event) => onValueChange(block.id, event.target.value)}
      />
    </label>
  )
}
