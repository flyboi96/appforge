import type { SimpleTableBlock, StoredRecord } from '../types/appSpec'

interface SimpleTableBlockViewProps {
  block: SimpleTableBlock
  records: StoredRecord[]
}

export function SimpleTableBlockView({
  block,
  records,
}: SimpleTableBlockViewProps) {
  return (
    <section className="table-block">
      <h3>{block.label}</h3>
      {records.length === 0 ? (
        <p className="muted-text">{block.emptyText ?? 'No rows yet.'}</p>
      ) : (
        <div className="simple-table" role="table">
          <div className="table-row table-head" role="row">
            {block.columns.map((column) => (
              <span key={column.fieldId} role="columnheader">
                {column.label}
              </span>
            ))}
          </div>
          {records.map((record) => (
            <div key={record.id} className="table-row" role="row">
              {block.columns.map((column) => (
                <span key={column.fieldId} role="cell">
                  {String(record.values[column.fieldId] ?? '')}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
