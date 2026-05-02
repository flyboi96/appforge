import { EmptyState } from '../components/EmptyState'
import type { AppSpec } from '../types/appSpec'

interface LibraryScreenProps {
  appSpecs: AppSpec[]
  onOpen: (appId: string) => void
  onDuplicate: (appId: string) => void
  onDelete: (appId: string) => void
  onCreateNew: () => void
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))

export function LibraryScreen({
  appSpecs,
  onOpen,
  onDuplicate,
  onDelete,
  onCreateNew,
}: LibraryScreenProps) {
  if (appSpecs.length === 0) {
    return (
      <EmptyState
        title="No generated apps yet"
        message="Describe an idea and save the generated draft to build your local library."
        actionLabel="Create an app"
        onAction={onCreateNew}
      />
    )
  }

  return (
    <section className="screen-stack">
      <div className="screen-heading">
        <p className="eyebrow">Library</p>
        <h2>Generated apps</h2>
      </div>

      <div className="library-list">
        {appSpecs.map((appSpec) => (
          <article key={appSpec.id} className="library-card">
            <div className="library-card-main">
              <span className="app-icon" aria-hidden="true">
                {appSpec.icon}
              </span>
              <div>
                <h3>{appSpec.name}</h3>
                <p>{appSpec.description}</p>
              </div>
            </div>
            <dl className="metadata-row">
              <div>
                <dt>Category</dt>
                <dd>{appSpec.category}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatDate(appSpec.updatedAt)}</dd>
              </div>
            </dl>
            <div className="button-row wrap">
              <button
                type="button"
                className="secondary-button"
                onClick={() => onOpen(appSpec.id)}
              >
                Open
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => onDuplicate(appSpec.id)}
              >
                Duplicate
              </button>
              <button
                type="button"
                className="text-button danger"
                onClick={() => {
                  if (window.confirm(`Delete "${appSpec.name}"?`)) {
                    onDelete(appSpec.id)
                  }
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
