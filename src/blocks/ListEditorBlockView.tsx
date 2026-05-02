import { useState } from 'react'
import type { ListEditorBlock, RuntimeValue } from '../types/appSpec'

interface ListEditorBlockViewProps {
  block: ListEditorBlock
  value: RuntimeValue | undefined
  onValueChange: (blockId: string, value: RuntimeValue) => void
}

export function ListEditorBlockView({
  block,
  value,
  onValueChange,
}: ListEditorBlockViewProps) {
  const [draftItem, setDraftItem] = useState('')
  const items = Array.isArray(value) ? value : block.defaultItems ?? []

  const addItem = () => {
    const trimmedItem = draftItem.trim()

    if (!trimmedItem) {
      return
    }

    onValueChange(block.id, [...items, trimmedItem])
    setDraftItem('')
  }

  const removeItem = (item: string) => {
    onValueChange(
      block.id,
      items.filter((candidate) => candidate !== item),
    )
  }

  return (
    <section className="field-block">
      <span>{block.label}</span>
      {block.helpText ? <small>{block.helpText}</small> : null}
      <div className="inline-form">
        <input
          type="text"
          value={draftItem}
          placeholder={block.placeholder}
          onChange={(event) => setDraftItem(event.target.value)}
        />
        <button type="button" className="secondary-button" onClick={addItem}>
          {block.addLabel ?? 'Add'}
        </button>
      </div>
      <div className="pill-list">
        {items.length === 0 ? (
          <p className="muted-text">No items yet.</p>
        ) : (
          items.map((item) => (
            <button
              key={item}
              type="button"
              className="pill-item"
              onClick={() => removeItem(item)}
            >
              {item}
              <span aria-hidden="true">×</span>
            </button>
          ))
        )}
      </div>
    </section>
  )
}
