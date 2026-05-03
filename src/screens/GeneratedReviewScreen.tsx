import type { GeneratedAppDraft } from '../types/appSpec'
import { displayIconForApp } from '../utils/appIcon'

interface GeneratedReviewScreenProps {
  draft: GeneratedAppDraft
  onBack: () => void
  onSave: () => void
  onSaveAsCopy?: () => void
}

const draftLabelFor = (isImprovement: boolean, isAiGenerated: boolean) => {
  if (isImprovement) {
    return isAiGenerated ? 'AI improved draft' : 'Local improved draft'
  }

  return isAiGenerated ? 'AI generated draft' : 'Local fallback draft'
}

export function GeneratedReviewScreen({
  draft,
  onBack,
  onSave,
  onSaveAsCopy,
}: GeneratedReviewScreenProps) {
  const appSpec = draft.appSpec
  const blockCount = appSpec.screens.reduce(
    (total, screen) => total + screen.blocks.length,
    0,
  )
  const isAiGenerated = draft.source === 'ai'
  const isImprovement = draft.mode === 'improve'
  const draftLabel = draftLabelFor(isImprovement, isAiGenerated)

  return (
    <section className="screen-stack">
      <button type="button" className="back-button" onClick={onBack}>
        {isImprovement ? 'Back to improvement' : 'Back to prompt'}
      </button>

      <header className="detail-header">
        <span className="detail-icon" aria-hidden="true">
          {displayIconForApp(appSpec)}
        </span>
        <div>
          <p className="eyebrow">{draftLabel}</p>
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
        <h3>
          {isAiGenerated ? 'AI generation notes' : 'Mock generator assumptions'}
        </h3>
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

      <div className="button-row wrap">
        <button type="button" className="primary-button" onClick={onSave}>
          {isImprovement ? 'Update App' : 'Save to Library'}
        </button>
        {isImprovement && onSaveAsCopy ? (
          <button
            type="button"
            className="secondary-button"
            onClick={onSaveAsCopy}
          >
            Save as Copy
          </button>
        ) : null}
      </div>
    </section>
  )
}
