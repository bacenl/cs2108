import { useEffect, useRef } from 'react'

/**
 * DesmosPlot — renders continuous math functions using the Desmos Graphing Calculator API.
 * Requires the Desmos script to be loaded globally (see index.html).
 *
 * Props:
 *   lines: Array<{ latex: string, color?: string }> — one entry per curve
 *   variables: Record<string, number> — variable bindings updated on every render
 *   xDomain: [number, number] — visible x range
 *   yDomain: [number, number] — visible y range
 *   height: number — container height in px (default 200)
 */
export default function DesmosPlot({
  lines,
  variables = {},
  xDomain,
  yDomain,
  height = 200,
}) {
  const containerRef = useRef(null)
  const calcRef = useRef(null)

  // Create calculator once on mount
  useEffect(() => {
    if (!containerRef.current || !window.Desmos) return

    const calculator = window.Desmos.GraphingCalculator(containerRef.current, {
      keypad: false,
      expressions: false,
      settingsMenu: false,
      zoomButtons: false,
      expressionsTopbar: false,
      border: false,
      lockViewport: true,
    })

    calculator.setMathBounds({
      left: xDomain[0],
      right: xDomain[1],
      bottom: yDomain[0],
      top: yDomain[1],
    })

    lines.forEach((line, i) => {
      calculator.setExpression({
        id: `line_${i}`,
        latex: line.latex,
        ...(line.color ? { color: line.color } : {}),
      })
    })

    calcRef.current = calculator
    return () => {
      calculator.destroy()
      calcRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update variable bindings on every render (idempotent in Desmos)
  useEffect(() => {
    if (!calcRef.current) return
    Object.entries(variables).forEach(([name, value]) => {
      calcRef.current.setExpression({ id: `var_${name}`, latex: `${name}=${value}` })
    })
  })

  return <div ref={containerRef} style={{ height, width: '100%' }} />
}
