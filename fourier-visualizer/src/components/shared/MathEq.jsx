import { InlineMath, BlockMath } from 'react-katex'

/**
 * Math equation wrapper.
 * Props:
 *   math: string  — LaTeX string
 *   block: boolean — if true, renders as display math (centered, larger)
 */
export default function MathEq({ math, block = false }) {
  if (block) {
    return (
      <div className="my-4 overflow-x-auto text-center">
        <BlockMath math={math} />
      </div>
    )
  }
  return <InlineMath math={math} />
}
