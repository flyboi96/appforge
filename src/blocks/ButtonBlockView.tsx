import type { ButtonBlock } from '../types/appSpec'

interface ButtonBlockViewProps {
  block: ButtonBlock
  onAction: (block: ButtonBlock) => void
}

export function ButtonBlockView({ block, onAction }: ButtonBlockViewProps) {
  return (
    <button
      type="button"
      className="secondary-button full-width"
      onClick={() => onAction(block)}
    >
      {block.text}
    </button>
  )
}
