import { useState, type FormEvent } from 'react'
import type {
  SavedEntryField,
  SavedEntryListBlock,
  StoredRecord,
  StoredValue,
} from '../types/appSpec'

interface SavedEntryListBlockViewProps {
  block: SavedEntryListBlock
  entries: StoredRecord[]
  onRecordAdd: (storeId: string, values: Record<string, StoredValue>) => void
  onRecordDelete: (storeId: string, recordId: string) => void
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))

const normalizeFieldValue = (field: SavedEntryField, value: string): StoredValue => {
  if (field.inputType === 'number') {
    return value === '' ? 0 : Number(value)
  }

  return value
}

export function SavedEntryListBlockView({
  block,
  entries,
  onRecordAdd,
  onRecordDelete,
}: SavedEntryListBlockViewProps) {
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})

  const updateDraftValue = (fieldId: string, value: string) => {
    setDraftValues((currentValues) => ({
      ...currentValues,
      [fieldId]: value,
    }))
  }

  const submitEntry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const values = block.fields.reduce<Record<string, StoredValue>>(
      (nextValues, field) => {
        nextValues[field.id] = normalizeFieldValue(
          field,
          draftValues[field.id] ?? '',
        )
        return nextValues
      },
      {},
    )

    onRecordAdd(block.storeId, values)
    setDraftValues({})
  }

  return (
    <section className="entry-block">
      <div className="entry-block-header">
        <div>
          <h3>{block.label}</h3>
          {block.helpText ? <p>{block.helpText}</p> : null}
        </div>
        <span>{entries.length}</span>
      </div>

      <form className="entry-form" onSubmit={submitEntry}>
        {block.fields.map((field) => (
          <label key={field.id} className="field-block">
            <span>{field.label}</span>
            {field.inputType === 'textarea' ? (
              <textarea
                value={draftValues[field.id] ?? ''}
                placeholder={field.placeholder}
                rows={3}
                onChange={(event) =>
                  updateDraftValue(field.id, event.target.value)
                }
              />
            ) : field.inputType === 'select' ? (
              <select
                value={draftValues[field.id] ?? field.options?.[0]?.value ?? ''}
                onChange={(event) =>
                  updateDraftValue(field.id, event.target.value)
                }
              >
                {(field.options ?? []).map((option) => (
                  <option key={option.id} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.inputType}
                inputMode={field.inputType === 'number' ? 'decimal' : undefined}
                value={draftValues[field.id] ?? ''}
                placeholder={field.placeholder}
                onChange={(event) =>
                  updateDraftValue(field.id, event.target.value)
                }
              />
            )}
          </label>
        ))}
        <button type="submit" className="primary-button">
          {block.submitLabel ?? 'Save'}
        </button>
      </form>

      <div className="entry-list">
        {entries.length === 0 ? (
          <p className="muted-text">{block.emptyText ?? 'No entries yet.'}</p>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="entry-card">
              <div>
                <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
                {block.fields.map((field) => {
                  const value = entry.values[field.id]
                  return value === '' || value === undefined ? null : (
                    <p key={field.id}>
                      <strong>{field.label}:</strong> {String(value)}
                    </p>
                  )
                })}
              </div>
              <button
                type="button"
                className="text-button danger"
                onClick={() => onRecordDelete(block.storeId, entry.id)}
              >
                Delete
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
