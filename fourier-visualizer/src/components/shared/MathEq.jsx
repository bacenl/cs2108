import katex from 'katex'

/**
 * Math equation wrapper using katex directly.
 * Props:
 *   math: string  — LaTeX string
 *   block: boolean — if true, renders as display math (centered, larger)
 */
export default function MathEq({ math, block = false }) {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: block })
  if (block) {
    return (
      <div
        className="my-4 overflow-x-auto text-center"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}
