import type { HeadingBlock } from '../types/appSpec'

interface HeadingBlockViewProps {
  block: HeadingBlock
}

export function HeadingBlockView({ block }: HeadingBlockViewProps) {
  if (block.level === 1) {
    return <h2 className="block-title">{block.text}</h2>
  }

  return <h3 className="block-subtitle">{block.text}</h3>
}
