import type { ButtonBlock } from '../types/appSpec'

interface ButtonBlockViewProps {
  block: ButtonBlock
  onAction: (block: ButtonBlock) => void
}

export function ButtonBlockView({ block, onAction }: ButtonBlockViewProps) {
  const hasAction = Boolean(block.action)

  return (
    <section className="button-block">
      <button
        type="button"
        className="secondary-button full-width"
        disabled={!hasAction}
        onClick={() => onAction(block)}
      >
        {block.text}
      </button>
      {!hasAction ? (
        <p className="muted-text">
          This generated button is not configured yet. Improve this app to
          replace it with a supported control.
        </p>
      ) : null}
    </section>
  )
}
