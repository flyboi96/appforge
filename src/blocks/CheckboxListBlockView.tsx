import type { CheckboxListBlock, RuntimeValue } from '../types/appSpec'

interface CheckboxListBlockViewProps {
  block: CheckboxListBlock
  value: RuntimeValue | undefined
  onValueChange: (blockId: string, value: RuntimeValue) => void
}

export function CheckboxListBlockView({
  block,
  value,
  onValueChange,
}: CheckboxListBlockViewProps) {
  const checkedIds = Array.isArray(value) ? value : []

  const toggleItem = (itemId: string) => {
    const nextValue = checkedIds.includes(itemId)
      ? checkedIds.filter((checkedId) => checkedId !== itemId)
      : [...checkedIds, itemId]

    onValueChange(block.id, nextValue)
  }

  return (
    <section className="field-block">
      <span>{block.label}</span>
      {block.helpText ? <small>{block.helpText}</small> : null}
      <div className="checkbox-list">
        {block.items.map((item) => (
          <label key={item.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={checkedIds.includes(item.id)}
              onChange={() => toggleItem(item.id)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </section>
  )
}
