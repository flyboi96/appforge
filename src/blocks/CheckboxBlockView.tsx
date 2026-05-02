import type { CheckboxBlock, RuntimeValue } from '../types/appSpec'

interface CheckboxBlockViewProps {
  block: CheckboxBlock
  value: RuntimeValue | undefined
  onValueChange: (blockId: string, value: RuntimeValue) => void
}

export function CheckboxBlockView({
  block,
  value,
  onValueChange,
}: CheckboxBlockViewProps) {
  const checked = typeof value === 'boolean' ? value : block.defaultValue ?? false

  return (
    <label className="checkbox-row single">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onValueChange(block.id, event.target.checked)}
      />
      <span>{block.text}</span>
    </label>
  )
}
