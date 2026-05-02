import type { GeneratedAppDraft } from '../types/appSpec'

interface GeneratedReviewScreenProps {
  draft: GeneratedAppDraft
  onBack: () => void
  onSave: () => void
}

export function GeneratedReviewScreen({
  draft,
  onBack,
  onSave,
}: GeneratedReviewScreenProps) {
  const appSpec = draft.appSpec
  const blockCount = appSpec.screens.reduce(
    (total, screen) => total + screen.blocks.length,
    0,
  )
  const isAiGenerated = draft.source === 'ai'

  return (
    <section className="screen-stack">
      <button type="button" className="back-button" onClick={onBack}>
        Back to prompt
      </button>

      <header className="detail-header">
        <span className="detail-icon" aria-hidden="true">
          {appSpec.icon}
        </span>
        <div>
          <p className="eyebrow">
            {isAiGenerated ? 'AI generated draft' : 'Local fallback draft'}
          </p>
          <h2>{appSpec.name}</h2>
          <p>{appSpec.description}</p>
        </div>
      </header>

      <section className="panel review-grid">
        <div>
          <span>Category</span>
          <strong>{appSpec.category}</strong>
        </div>
        <div>
          <span>Screens</span>
          <strong>{appSpec.screens.length}</strong>
        </div>
        <div>
          <span>Blocks</span>
          <strong>{blockCount}</strong>
        </div>
        <div>
          <span>Data stores</span>
          <strong>{appSpec.dataStores.length}</strong>
        </div>
      </section>

      {draft.warnings && draft.warnings.length > 0 ? (
        <section className="panel generation-warning">
          <h3>Generation warnings</h3>
          {draft.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </section>
      ) : null}

      <section className="panel assumption-list">
        <h3>{isAiGenerated ? 'AI generation notes' : 'Mock generator assumptions'}</h3>
        {draft.assumptions.map((assumption) => (
          <p key={assumption}>{assumption}</p>
        ))}
      </section>

      <section className="panel spec-outline">
        <h3>Draft structure</h3>
        {appSpec.screens.map((screen) => (
          <article key={screen.id}>
            <strong>{screen.title}</strong>
            <span>
              {screen.blocks.map((block) => block.type).join(', ')}
            </span>
          </article>
        ))}
      </section>

      <button type="button" className="primary-button" onClick={onSave}>
        Save to Library
      </button>
    </section>
  )
}
