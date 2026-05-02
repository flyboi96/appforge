import type { ParagraphBlock } from '../types/appSpec'

interface ParagraphBlockViewProps {
  block: ParagraphBlock
}

export function ParagraphBlockView({ block }: ParagraphBlockViewProps) {
  return <p className="block-copy">{block.text}</p>
}
