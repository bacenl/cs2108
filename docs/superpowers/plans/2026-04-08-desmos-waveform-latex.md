# Desmos Waveform Plots + LaTeX Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace recharts-based sine waveform plots with Desmos API (continuous function rendering, no sampling artifacts) and fix LaTeX rendering by removing react-katex in favour of direct katex calls.

**Architecture:** A new `DesmosPlot` component wraps the Desmos Graphing Calculator API; chapters pass math expression strings and variable bindings (slider state) instead of sample arrays. `MathEq` is rewritten to call `katex.renderToString` directly. `Ch4_DFT` (raw audio data) and `SpectrumPlot` (DFT bins) are untouched.

**Tech Stack:** React 19, Desmos Graphing Calculator API v1.10, katex 0.16.x, Vitest + @testing-library/react

---

## File Map

| File | Action |
|------|--------|
| `fourier-visualizer/index.html` | Add Desmos CDN `<script>` to `<head>` |
| `fourier-visualizer/src/components/shared/DesmosPlot.jsx` | **Create** — Desmos wrapper component |
| `fourier-visualizer/src/components/shared/MathEq.jsx` | **Rewrite** — use `katex.renderToString` directly |
| `fourier-visualizer/src/components/chapters/Ch1_Signal.jsx` | Swap `WaveformPlot` → `DesmosPlot` |
| `fourier-visualizer/src/components/chapters/Ch2_Sinusoids.jsx` | Swap `WaveformPlot` → `DesmosPlot` |
| `fourier-visualizer/src/components/chapters/Ch3_FourierSeries.jsx` | Swap `WaveformPlot` → `DesmosPlot`; keep JS inner-product calc |
| `fourier-visualizer/src/components/chapters/Ch6_Sampling.jsx` | Swap `WaveformPlot` → `DesmosPlot` |
| `fourier-visualizer/package.json` | Remove `react-katex` |
| `fourier-visualizer/tests/DesmosPlot.test.jsx` | **Create** — unit tests with mocked Desmos |
| `fourier-visualizer/tests/MathEq.test.jsx` | **Create** — KaTeX rendering tests |

`WaveformPlot.jsx` is kept (still used by Ch4).

---

## Task 1: Add Desmos script to index.html

**Files:**
- Modify: `fourier-visualizer/index.html`

- [ ] **Step 1: Add the Desmos CDN script tag**

Open `fourier-visualizer/index.html`. Add the `<script>` tag inside `<head>`, before the closing `</head>`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>fourier-visualizer</title>
    <script src="https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda5"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add fourier-visualizer/index.html
git commit -m "feat: load Desmos Graphing Calculator API from CDN"
```

---

## Task 2: Create DesmosPlot component (TDD)

**Files:**
- Create: `fourier-visualizer/tests/DesmosPlot.test.jsx`
- Create: `fourier-visualizer/src/components/shared/DesmosPlot.jsx`

- [ ] **Step 1: Write the failing tests**

Create `fourier-visualizer/tests/DesmosPlot.test.jsx`:

```jsx
import { render } from '@testing-library/react'
import DesmosPlot from '../src/components/shared/DesmosPlot'

const mockSetExpression = vi.fn()
const mockSetMathBounds = vi.fn()
const mockDestroy = vi.fn()
const mockCalc = {
  setExpression: mockSetExpression,
  setMathBounds: mockSetMathBounds,
  destroy: mockDestroy,
}

beforeEach(() => {
  vi.clearAllMocks()
  window.Desmos = { GraphingCalculator: vi.fn(() => mockCalc) }
})

afterEach(() => {
  delete window.Desmos
})

test('creates calculator on mount with chrome disabled', () => {
  render(
    <DesmosPlot
      lines={[{ latex: 'y=\\sin(x)', color: '#60a5fa' }]}
      variables={{ f: 220 }}
      xDomain={[0, 0.02]}
      yDomain={[-1.5, 1.5]}
    />
  )
  expect(window.Desmos.GraphingCalculator).toHaveBeenCalledWith(
    expect.any(HTMLElement),
    expect.objectContaining({
      keypad: false,
      expressions: false,
      settingsMenu: false,
      zoomButtons: false,
      lockViewport: true,
    })
  )
})

test('sets math bounds from xDomain and yDomain', () => {
  render(
    <DesmosPlot
      lines={[]}
      variables={{}}
      xDomain={[0, 0.02]}
      yDomain={[-1.5, 1.5]}
    />
  )
  expect(mockSetMathBounds).toHaveBeenCalledWith({
    left: 0,
    right: 0.02,
    bottom: -1.5,
    top: 1.5,
  })
})

test('sets each line expression on mount', () => {
  render(
    <DesmosPlot
      lines={[
        { latex: 'y=\\sin(x)', color: '#60a5fa' },
        { latex: 'y=\\cos(x)', color: '#34d399' },
      ]}
      variables={{}}
      xDomain={[0, 1]}
      yDomain={[-1, 1]}
    />
  )
  expect(mockSetExpression).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'line_0', latex: 'y=\\sin(x)', color: '#60a5fa' })
  )
  expect(mockSetExpression).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'line_1', latex: 'y=\\cos(x)', color: '#34d399' })
  )
})

test('sets variable expressions on render', () => {
  render(
    <DesmosPlot
      lines={[]}
      variables={{ f: 440, A: 0.8 }}
      xDomain={[0, 1]}
      yDomain={[-1, 1]}
    />
  )
  expect(mockSetExpression).toHaveBeenCalledWith({ id: 'var_f', latex: 'f=440' })
  expect(mockSetExpression).toHaveBeenCalledWith({ id: 'var_A', latex: 'A=0.8' })
})

test('destroys calculator on unmount', () => {
  const { unmount } = render(
    <DesmosPlot lines={[]} variables={{}} xDomain={[0, 1]} yDomain={[-1, 1]} />
  )
  unmount()
  expect(mockDestroy).toHaveBeenCalled()
})

test('does not crash when Desmos is not loaded', () => {
  delete window.Desmos
  expect(() =>
    render(<DesmosPlot lines={[]} variables={{}} xDomain={[0, 1]} yDomain={[-1, 1]} />)
  ).not.toThrow()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd fourier-visualizer && npm test -- --reporter=verbose 2>&1 | grep -A3 "DesmosPlot"
```

Expected: `Cannot find module '../src/components/shared/DesmosPlot'`

- [ ] **Step 3: Implement DesmosPlot.jsx**

Create `fourier-visualizer/src/components/shared/DesmosPlot.jsx`:

```jsx
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd fourier-visualizer && npm test -- --reporter=verbose 2>&1 | grep -A3 "DesmosPlot"
```

Expected: all 6 DesmosPlot tests pass.

- [ ] **Step 5: Commit**

```bash
git add fourier-visualizer/tests/DesmosPlot.test.jsx fourier-visualizer/src/components/shared/DesmosPlot.jsx
git commit -m "feat: add DesmosPlot component wrapping Desmos Graphing Calculator API"
```

---

## Task 3: Fix MathEq (LaTeX rendering)

**Files:**
- Create: `fourier-visualizer/tests/MathEq.test.jsx`
- Modify: `fourier-visualizer/src/components/shared/MathEq.jsx`
- Modify: `fourier-visualizer/package.json`

- [ ] **Step 1: Write the failing tests**

Create `fourier-visualizer/tests/MathEq.test.jsx`:

```jsx
import { render } from '@testing-library/react'
import MathEq from '../src/components/shared/MathEq'

test('renders inline math with katex class', () => {
  const { container } = render(<MathEq math="f = 440" />)
  expect(container.querySelector('.katex')).not.toBeNull()
})

test('inline math renders as span', () => {
  const { container } = render(<MathEq math="A" />)
  expect(container.firstChild.tagName).toBe('SPAN')
})

test('block math renders with katex-display class', () => {
  const { container } = render(<MathEq math="X(\\omega) = \\int x(t) e^{-i\\omega t} dt" block />)
  expect(container.querySelector('.katex-display')).not.toBeNull()
})

test('block math renders as div', () => {
  const { container } = render(<MathEq math="f = 440" block />)
  expect(container.firstChild.tagName).toBe('DIV')
})

test('does not throw on invalid LaTeX', () => {
  expect(() => render(<MathEq math="\\invalid{" />)).not.toThrow()
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd fourier-visualizer && npm test -- --reporter=verbose 2>&1 | grep -A3 "MathEq"
```

Expected: tests fail because `react-katex` renders differently than `katex.renderToString`.

- [ ] **Step 3: Rewrite MathEq.jsx**

Replace the entire contents of `fourier-visualizer/src/components/shared/MathEq.jsx`:

```jsx
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
```

- [ ] **Step 4: Remove react-katex from package.json**

In `fourier-visualizer/package.json`, remove the `"react-katex"` line from `"dependencies"`:

```json
"dependencies": {
  "@tailwindcss/vite": "^4.2.2",
  "gh-pages": "^6.3.0",
  "katex": "^0.16.45",
  "react": "^19.2.4",
  "react-dom": "^19.2.4",
  "recharts": "^3.8.1",
  "tailwindcss": "^4.2.2"
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
cd fourier-visualizer && npm test -- --reporter=verbose 2>&1 | grep -A3 "MathEq"
```

Expected: all 5 MathEq tests pass.

- [ ] **Step 6: Commit**

```bash
git add fourier-visualizer/tests/MathEq.test.jsx fourier-visualizer/src/components/shared/MathEq.jsx fourier-visualizer/package.json
git commit -m "fix: rewrite MathEq to use katex directly, remove react-katex"
```

---

## Task 4: Migrate Ch1_Signal to DesmosPlot

**Files:**
- Modify: `fourier-visualizer/src/components/chapters/Ch1_Signal.jsx`

- [ ] **Step 1: Replace WaveformPlot with DesmosPlot**

Replace the entire file `fourier-visualizer/src/components/chapters/Ch1_Signal.jsx`:

```jsx
import { useState } from 'react'
import Slider from '../shared/Slider'
import DesmosPlot from '../shared/DesmosPlot'
import MathEq from '../shared/MathEq'

export default function Ch1_Signal({ onComplete }) {
  const [frequency, setFrequency] = useState(220)
  const [amplitude, setAmplitude] = useState(1.0)
  const [interacted, setInteracted] = useState(false)

  const handleFrequencyChange = (v) => {
    setFrequency(v)
    if (!interacted) {
      setInteracted(true)
      onComplete()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-300">
        A <strong className="text-white">signal</strong> is any quantity that varies over time.
        In audio, it's air pressure — measured many thousands of times per second.
        Below is a pure sine wave: the simplest possible signal.
      </p>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Signal formula</h3>
        <MathEq block math="x(t) = A \sin(2\pi f t)" />
        <p className="text-gray-400 text-sm mt-1">
          where <MathEq math="A" /> is amplitude, <MathEq math="f" /> is frequency (Hz), and <MathEq math="t" /> is time (seconds).
        </p>
      </div>

      <DesmosPlot
        lines={[{ latex: 'y=A\\sin(2\\pi f t)', color: '#60a5fa' }]}
        variables={{ A: amplitude, f: frequency }}
        xDomain={[0, 0.02]}
        yDomain={[-1.5, 1.5]}
        height={200}
      />

      <div className="flex flex-col gap-4">
        <Slider
          label="Frequency"
          min={50}
          max={1000}
          step={10}
          value={frequency}
          onChange={handleFrequencyChange}
          unit="Hz"
        />
        <Slider
          label="Amplitude"
          min={0.1}
          max={1.5}
          step={0.1}
          value={amplitude}
          onChange={(v) => setAmplitude(v)}
        />
      </div>

      <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
        <strong className="text-yellow-300">Observe:</strong> as you increase frequency, the wave cycles faster — more peaks fit in the same time window.
        The <strong className="text-white">period</strong> <MathEq math="T = 1/f" /> is the time for one full cycle.
      </div>

      {!interacted && (
        <p className="text-blue-400 text-sm italic">Move the frequency slider to continue.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd fourier-visualizer && npm test
```

Expected: all tests pass (Ch1 has no direct tests; existing Wizard tests still pass).

- [ ] **Step 3: Commit**

```bash
git add fourier-visualizer/src/components/chapters/Ch1_Signal.jsx
git commit -m "feat: migrate Ch1_Signal waveform to DesmosPlot"
```

---

## Task 5: Migrate Ch2_Sinusoids to DesmosPlot

**Files:**
- Modify: `fourier-visualizer/src/components/chapters/Ch2_Sinusoids.jsx`

- [ ] **Step 1: Replace WaveformPlot with DesmosPlot**

Replace the entire file `fourier-visualizer/src/components/chapters/Ch2_Sinusoids.jsx`:

```jsx
import { useState, useCallback } from 'react'
import Slider from '../shared/Slider'
import DesmosPlot from '../shared/DesmosPlot'
import { useAudio } from '../../hooks/useAudio'

const DEFAULT_OSCILLATORS = [
  { frequency: 220, amplitude: 0.8 },
  { frequency: 440, amplitude: 0.5 },
  { frequency: 660, amplitude: 0.3 },
]

const COLORS = ['#60a5fa', '#34d399', '#f472b6']

export default function Ch2_Sinusoids({ onComplete }) {
  const [oscillators, setOscillators] = useState(DEFAULT_OSCILLATORS)
  const { supported, isPlaying, playSynthesized, stop } = useAudio()
  const [hasPlayed, setHasPlayed] = useState(false)

  const updateOscillator = (index, field, value) => {
    setOscillators((prev) =>
      prev.map((osc, i) => (i === index ? { ...osc, [field]: value } : osc))
    )
  }

  const handlePlay = useCallback(() => {
    if (isPlaying) {
      stop()
    } else {
      playSynthesized(oscillators)
      if (!hasPlayed) {
        setHasPlayed(true)
        onComplete()
      }
    }
  }, [isPlaying, oscillators, playSynthesized, stop, hasPlayed, onComplete])

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-300">
        Any periodic signal can be expressed as a <strong className="text-white">sum of sine waves</strong>.
        Each sine wave has its own frequency and amplitude. Adjust the three sinusoids below
        and hear what the combined sound sounds like.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {oscillators.map((osc, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-300">Sinusoid {i + 1}</h3>
            <DesmosPlot
              lines={[{ latex: 'y=A\\sin(2\\pi f t)', color: COLORS[i] }]}
              variables={{ A: osc.amplitude, f: osc.frequency }}
              xDomain={[0, 0.04]}
              yDomain={[-1.5, 1.5]}
              height={100}
            />
            <Slider
              label="Frequency"
              min={50} max={2000} step={10}
              value={osc.frequency}
              onChange={(v) => updateOscillator(i, 'frequency', v)}
              unit="Hz"
            />
            <Slider
              label="Amplitude"
              min={0} max={1} step={0.05}
              value={osc.amplitude}
              onChange={(v) => updateOscillator(i, 'amplitude', v)}
            />
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Combined signal</h3>
        <DesmosPlot
          lines={[{
            latex: 'y=A_{1}\\sin(2\\pi f_{1} t)+A_{2}\\sin(2\\pi f_{2} t)+A_{3}\\sin(2\\pi f_{3} t)',
            color: '#facc15',
          }]}
          variables={{
            'A_{1}': oscillators[0].amplitude,
            'f_{1}': oscillators[0].frequency,
            'A_{2}': oscillators[1].amplitude,
            'f_{2}': oscillators[1].frequency,
            'A_{3}': oscillators[2].amplitude,
            'f_{3}': oscillators[2].frequency,
          }}
          xDomain={[0, 0.04]}
          yDomain={[-3, 3]}
          height={140}
        />
      </div>

      {!supported ? (
        <p className="text-red-400 text-sm">Your browser doesn't support the Web Audio API. Audio playback is unavailable.</p>
      ) : (
        <button
          onClick={handlePlay}
          className="self-start px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 transition-colors font-medium"
        >
          {isPlaying ? '⏹ Stop' : '▶ Play combined sound'}
        </button>
      )}

      <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
        <strong className="text-yellow-300">Key insight:</strong> "Frequency" is a mathematical property — not just pitch.
        Setting amplitude to 0 silences a component without removing it from the sum.
      </div>

      {!hasPlayed && (
        <p className="text-blue-400 text-sm italic">Press Play to hear the combined sound and continue.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd fourier-visualizer && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add fourier-visualizer/src/components/chapters/Ch2_Sinusoids.jsx
git commit -m "feat: migrate Ch2_Sinusoids waveforms to DesmosPlot"
```

---

## Task 6: Migrate Ch3_FourierSeries to DesmosPlot

**Files:**
- Modify: `fourier-visualizer/src/components/chapters/Ch3_FourierSeries.jsx`

Note: `wave1` and `wave2` sample arrays are kept for the numeric inner-product computation (`ip`). Only the WaveformPlot rendering is replaced; the `product` sample array and `correlationSamples` are removed.

- [ ] **Step 1: Replace WaveformPlot with DesmosPlot**

Replace the entire file `fourier-visualizer/src/components/chapters/Ch3_FourierSeries.jsx`:

```jsx
import { useState, useMemo } from 'react'
import Slider from '../shared/Slider'
import DesmosPlot from '../shared/DesmosPlot'
import MathEq from '../shared/MathEq'

const SAMPLE_RATE = 1000
const DURATION = 0.04
const N_DISPLAY = Math.floor(SAMPLE_RATE * DURATION)

function sine(freq, amp, n, sampleRate) {
  return Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * freq * i / sampleRate))
}

function innerProduct(a, b) {
  const dt = 1 / SAMPLE_RATE
  return a.reduce((sum, v, i) => sum + v * (b[i] ?? 0) * dt, 0)
}

function Phasor({ omega }) {
  const cx = 80, cy = 80, r = 60
  const x = cx + r * Math.cos(omega)
  const y = cy - r * Math.sin(omega)

  return (
    <svg width="160" height="160" className="mx-auto">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#374151" strokeWidth="1.5" />
      <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke="#4b5563" strokeWidth="1" />
      <line x1={cx} y1={cy - r - 10} x2={cx} y2={cy + r + 10} stroke="#4b5563" strokeWidth="1" />
      <line x1={x} y1={cy} x2={x} y2={y} stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />
      <line x1={cx} y1={y} x2={x} y2={y} stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" />
      <line x1={cx} y1={cy} x2={x} y2={y} stroke="#facc15" strokeWidth="2.5" />
      <circle cx={x} cy={y} r={4} fill="#facc15" />
      <text x={cx + r + 12} y={cy + 4} fill="#60a5fa" fontSize="11">Re</text>
      <text x={cx + 2} y={cy - r - 12} fill="#34d399" fontSize="11">Im</text>
    </svg>
  )
}

const SECTIONS = [
  'Fourier Series',
  'Orthogonality',
  'Why Complex Numbers?',
  "Euler's Formula",
  'The Leap to FT',
]

export default function Ch3_FourierSeries({ onComplete }) {
  const [section, setSection] = useState(0)
  const [freq1, setFreq1] = useState(100)
  const [freq2, setFreq2] = useState(300)
  const [omega, setOmega] = useState(1.0)
  const [omegaInteracted, setOmegaInteracted] = useState(false)

  // Kept for numeric inner-product display only — not used for rendering
  const wave1 = useMemo(() => sine(freq1, 1, N_DISPLAY, SAMPLE_RATE), [freq1])
  const wave2 = useMemo(() => sine(freq2, 1, N_DISPLAY, SAMPLE_RATE), [freq2])
  const ip = useMemo(() => innerProduct(wave1, wave2), [wave1, wave2])

  const handleOmegaChange = (v) => {
    setOmega(v)
    if (!omegaInteracted) setOmegaInteracted(true)
  }

  const advance = () => {
    if (section < SECTIONS.length - 1) {
      setSection((s) => s + 1)
    } else {
      onComplete()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 text-xs">
        {SECTIONS.map((s, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded-full ${i === section ? 'bg-blue-600 text-white' : i < section ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-400'}`}
          >
            {s}
          </span>
        ))}
      </div>

      {section === 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Fourier Series</h3>
          <p className="text-gray-300">
            In the 19th century, Joseph Fourier showed that any <em>periodic</em> function
            can be written as an infinite sum of sines and cosines — the <strong className="text-white">Fourier Series</strong>.
          </p>
          <MathEq block math="x(t) = a_0 + \sum_{k=1}^{\infty} \left[ a_k \cos\!\left(\frac{2\pi k t}{T}\right) + b_k \sin\!\left(\frac{2\pi k t}{T}\right) \right]" />
          <p className="text-gray-300 text-sm">
            Each coefficient <MathEq math="a_k" />, <MathEq math="b_k" /> captures how much of frequency <MathEq math="k/T" /> is present.
            The frequencies are <em>discrete</em> — they must be integer multiples (harmonics) of the fundamental frequency <MathEq math="1/T" />.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <strong className="text-yellow-300">Key assumption:</strong> the signal is periodic with period <MathEq math="T" />.
            This gives us a discrete set of frequency coefficients — one per harmonic.
          </div>
        </div>
      )}

      {section === 1 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Orthogonality of Sine Waves</h3>
          <p className="text-gray-300">
            The reason Fourier decomposition <em>works</em> — and gives unique coefficients — is that sines at
            different frequencies are <strong className="text-white">orthogonal</strong>.
            Just like orthogonal basis vectors in linear algebra, you can project a signal onto each frequency
            component independently.
          </p>
          <MathEq block math="\langle f, g \rangle = \int_0^T f(t)\,g(t)\,dt = 0" />
          <p className="text-gray-400 text-sm">
            Try different frequencies below. When they differ, the product oscillates and integrates to ≈ 0.
            When they match, the product is always positive — non-zero integral.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <DesmosPlot
              lines={[{ latex: 'y=\\sin(2\\pi f t)', color: '#60a5fa' }]}
              variables={{ f: freq1 }}
              xDomain={[0, 0.04]}
              yDomain={[-1.5, 1.5]}
              height={80}
            />
            <DesmosPlot
              lines={[{ latex: 'y=\\sin(2\\pi f t)', color: '#34d399' }]}
              variables={{ f: freq2 }}
              xDomain={[0, 0.04]}
              yDomain={[-1.5, 1.5]}
              height={80}
            />
            <DesmosPlot
              lines={[{ latex: 'y=\\sin(2\\pi f t)\\cdot\\sin(2\\pi g t)', color: '#f472b6' }]}
              variables={{ f: freq1, g: freq2 }}
              xDomain={[0, 0.04]}
              yDomain={[-1.5, 1.5]}
              height={80}
            />
          </div>
          <p className="text-sm text-center font-mono">
            Inner product ≈ <span className={Math.abs(ip) < 0.01 ? 'text-green-400' : 'text-red-400'}>{ip.toFixed(4)}</span>
            {Math.abs(ip) < 0.01 ? ' ✓ orthogonal' : ' ✗ not orthogonal'}
          </p>
          <div className="flex flex-col gap-3">
            <Slider label="Frequency 1" min={50} max={500} step={50} value={freq1} onChange={setFreq1} unit="Hz" />
            <Slider label="Frequency 2" min={50} max={500} step={50} value={freq2} onChange={setFreq2} unit="Hz" />
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <strong className="text-yellow-300">Linear algebra connection:</strong> this is exactly like dot products.
            Orthogonal basis vectors let you decompose any vector uniquely. Orthogonal frequency basis functions
            let you decompose any signal uniquely.
          </div>
        </div>
      )}

      {section === 2 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Why Complex Numbers?</h3>
          <p className="text-gray-300">
            The Fourier transform produces <strong className="text-white">complex-valued</strong> output.
            This is not a mathematical trick — it carries real information.
          </p>
          <p className="text-gray-300">
            When we measure how much of frequency <MathEq math="\omega" /> is in a signal, we need two numbers:
          </p>
          <ul className="list-disc list-inside text-gray-300 text-sm flex flex-col gap-1 ml-2">
            <li>
              <strong className="text-blue-300">Real part</strong> — correlation with <MathEq math="\cos(\omega t)" /> (the even component)
            </li>
            <li>
              <strong className="text-green-300">Imaginary part</strong> — correlation with <MathEq math="\sin(\omega t)" /> (the odd component)
            </li>
          </ul>
          <MathEq block math="X(\omega) = \underbrace{\int x(t)\cos(\omega t)\,dt}_{\text{Re}} - i\underbrace{\int x(t)\sin(\omega t)\,dt}_{\text{Im}}" />
          <MathEq block math="|X(\omega)| = \sqrt{\text{Re}^2 + \text{Im}^2} \quad \angle X(\omega) = \arctan\!\left(\frac{\text{Im}}{\text{Re}}\right)" />
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <strong className="text-yellow-300">Common misconception:</strong> "complex numbers are just a convenient notation."
            They're not — the phase information in the imaginary part is essential for reconstructing the original signal
            via the inverse Fourier transform.
          </div>
        </div>
      )}

      {section === 3 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Euler's Formula</h3>
          <p className="text-gray-300">
            Instead of writing cosine and sine separately, we use <strong className="text-white">Euler's formula</strong>
            to unify them as a single rotating complex exponential:
          </p>
          <MathEq block math="e^{i\omega t} = \cos(\omega t) + i\sin(\omega t)" />
          <p className="text-gray-300 text-sm">
            Geometrically, <MathEq math="e^{i\omega t}" /> traces a unit circle in the complex plane.
            The real part is the x-coordinate (cosine), the imaginary part is the y-coordinate (sine).
          </p>
          <Phasor omega={omega} />
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="bg-gray-800 rounded p-2">
              <span className="text-blue-300">Re = cos(ω) = </span>
              <span className="font-mono text-blue-400">{Math.cos(omega).toFixed(3)}</span>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <span className="text-green-300">Im = sin(ω) = </span>
              <span className="font-mono text-green-400">{Math.sin(omega).toFixed(3)}</span>
            </div>
          </div>
          <Slider
            label="Angle ω (radians)"
            min={0} max={6.28} step={0.05}
            value={omega}
            onChange={setOmega}
            formatValue={(v) => `${v.toFixed(2)} rad`}
          />
        </div>
      )}

      {section === 4 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">The Leap to the Fourier Transform</h3>
          <p className="text-gray-300">
            The Fourier Series works for periodic signals with period <MathEq math="T" />.
            But what about <strong className="text-white">aperiodic</strong> signals?
          </p>
          <p className="text-gray-300">
            We take the Fourier Series and let <MathEq math="T \to \infty" />. As the period grows:
          </p>
          <ul className="list-disc list-inside text-gray-300 text-sm flex flex-col gap-1 ml-2">
            <li>The discrete harmonics get closer and closer together</li>
            <li>The sum over discrete frequencies becomes a continuous integral</li>
            <li>Discrete coefficients <MathEq math="a_k, b_k" /> become a continuous spectrum <MathEq math="X(\omega)" /></li>
          </ul>
          <MathEq block math="X(\omega) = \int_{-\infty}^{\infty} x(t)\, e^{-i\omega t}\, dt" />
          <p className="text-gray-400 text-sm">
            Drag <MathEq math="\omega" /> to see how the correlation with the signal changes:
          </p>
          <DesmosPlot
            lines={[{ latex: 'y=\\sin(2\\pi p t)', color: '#a78bfa' }]}
            variables={{ p: omega * 50 }}
            xDomain={[0, 0.04]}
            yDomain={[-1.5, 1.5]}
            height={100}
          />
          <Slider
            label="ω (angular frequency)"
            min={0.1} max={12.56} step={0.1}
            value={omega}
            onChange={handleOmegaChange}
            formatValue={(v) => `${v.toFixed(2)} rad/s`}
          />
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <strong className="text-yellow-300">Summary:</strong> Fourier Series (periodic, discrete spectrum)
            → Fourier Transform (aperiodic, continuous spectrum). Both rely on orthogonality of <MathEq math="e^{i\omega t}" /> basis functions.
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={() => setSection((s) => Math.max(0, s - 1))}
          disabled={section === 0}
          className="px-4 py-2 rounded bg-gray-700 text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm"
        >
          ← Back
        </button>
        <button
          onClick={advance}
          disabled={section === 4 && !omegaInteracted}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {section < SECTIONS.length - 1 ? 'Next section →' : 'I understand — continue ✓'}
        </button>
      </div>
      {section === 4 && !omegaInteracted && (
        <p className="text-blue-400 text-sm italic text-center">Move the ω slider to continue.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd fourier-visualizer && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add fourier-visualizer/src/components/chapters/Ch3_FourierSeries.jsx
git commit -m "feat: migrate Ch3_FourierSeries waveforms to DesmosPlot"
```

---

## Task 7: Migrate Ch6_Sampling to DesmosPlot

**Files:**
- Modify: `fourier-visualizer/src/components/chapters/Ch6_Sampling.jsx`

- [ ] **Step 1: Replace WaveformPlot with DesmosPlot**

Replace the entire file `fourier-visualizer/src/components/chapters/Ch6_Sampling.jsx`:

```jsx
import { useState } from 'react'
import Slider from '../shared/Slider'
import DesmosPlot from '../shared/DesmosPlot'
import MathEq from '../shared/MathEq'

const TRUE_FREQ = 440

function aliasedFreq(trueFreq, sampleRate) {
  const n = Math.round(trueFreq / sampleRate)
  return Math.abs(trueFreq - n * sampleRate)
}

export default function Ch6_Sampling({ onComplete }) {
  const [sampleRate, setSampleRate] = useState(44100)
  const [aliasTriggered, setAliasTriggered] = useState(false)

  const nyquist = sampleRate / 2
  const isAliased = TRUE_FREQ > nyquist
  const perceived = isAliased ? aliasedFreq(TRUE_FREQ, sampleRate) : TRUE_FREQ

  const handleSampleRateChange = (v) => {
    setSampleRate(v)
    if (v < 2 * TRUE_FREQ && !aliasTriggered) {
      setAliasTriggered(true)
      onComplete()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-300">
        Now that you understand frequency bins, we can explain <em>why</em> we sample at a particular rate.
        The <strong className="text-white">Nyquist–Shannon sampling theorem</strong> states:
      </p>
      <div className="bg-gray-800 rounded-lg p-4">
        <MathEq block math="f_s \geq 2 \cdot f_{\max}" />
        <p className="text-gray-300 text-sm text-center">
          The sample rate must be at least twice the highest frequency in the signal.
        </p>
      </div>
      <p className="text-gray-300">
        Below is a {TRUE_FREQ} Hz sine wave (the "true" signal). Reduce the sample rate below{' '}
        {2 * TRUE_FREQ} Hz to see <strong className="text-white">aliasing</strong> — where the sampled
        version appears to be a different, lower frequency.
      </p>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
          True signal ({TRUE_FREQ} Hz)
        </h3>
        <DesmosPlot
          lines={[{ latex: 'y=\\sin(2\\pi f t)', color: '#60a5fa' }]}
          variables={{ f: TRUE_FREQ }}
          xDomain={[0, 0.01]}
          yDomain={[-1.5, 1.5]}
          height={100}
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Reconstructed from samples
          {isAliased
            ? <span className="text-red-400 ml-2">⚠ Aliased! Perceived: {perceived.toFixed(1)} Hz</span>
            : <span className="text-green-400 ml-2">✓ Correct: {perceived.toFixed(1)} Hz</span>
          }
        </h3>
        <DesmosPlot
          lines={[{ latex: 'y=\\sin(2\\pi f t)', color: isAliased ? '#f87171' : '#34d399' }]}
          variables={{ f: perceived }}
          xDomain={[0, 0.01]}
          yDomain={[-1.5, 1.5]}
          height={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-center">
        <div className={`rounded-lg p-3 ${isAliased ? 'bg-red-900/40' : 'bg-gray-800'}`}>
          <p className="text-gray-400">Sample rate</p>
          <p className="text-xl font-bold text-white">{sampleRate.toLocaleString()} Hz</p>
        </div>
        <div className={`rounded-lg p-3 ${isAliased ? 'bg-red-900/40' : 'bg-gray-800'}`}>
          <p className="text-gray-400">Nyquist limit</p>
          <p className={`text-xl font-bold ${isAliased ? 'text-red-400' : 'text-green-400'}`}>
            {nyquist.toLocaleString()} Hz
          </p>
        </div>
      </div>

      <Slider
        label="Sample rate"
        min={100} max={44100} step={100}
        value={sampleRate}
        onChange={handleSampleRateChange}
        unit="Hz"
      />

      <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
        <strong className="text-yellow-300">Why audio is sampled at 44,100 Hz:</strong> human hearing tops out
        at ~20 kHz. Nyquist requires <MathEq math="f_s \geq 40{,}000" /> Hz. 44,100 Hz (CD quality)
        gives a comfortable margin above that limit.
      </div>

      {!aliasTriggered && (
        <p className="text-blue-400 text-sm italic">
          Drag the sample rate below {2 * TRUE_FREQ} Hz to trigger aliasing and continue.
        </p>
      )}
    </div>
  )
}
```

Note: `isAliased` affects the `color` prop of the reconstructed plot's `lines`. Since `lines` is only read on mount (the initial Desmos setup), a change in `isAliased` won't update the curve color after mount. If dynamic colour-switching is needed, the DesmosPlot key should be changed to force remount: add `key={isAliased ? 'aliased' : 'correct'}` to the reconstructed DesmosPlot.

Update the reconstructed DesmosPlot to add the key:

```jsx
<DesmosPlot
  key={isAliased ? 'aliased' : 'correct'}
  lines={[{ latex: 'y=\\sin(2\\pi f t)', color: isAliased ? '#f87171' : '#34d399' }]}
  variables={{ f: perceived }}
  xDomain={[0, 0.01]}
  yDomain={[-1.5, 1.5]}
  height={100}
/>
```

- [ ] **Step 2: Run full test suite**

```bash
cd fourier-visualizer && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add fourier-visualizer/src/components/chapters/Ch6_Sampling.jsx
git commit -m "feat: migrate Ch6_Sampling waveforms to DesmosPlot"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run complete test suite**

```bash
cd fourier-visualizer && npm test
```

Expected output: all test suites pass, no failures.

- [ ] **Step 2: Build for production**

```bash
cd fourier-visualizer && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit (if any cleanup needed)**

If the build produced warnings you addressed:

```bash
git add -p
git commit -m "chore: post-migration cleanup"
```
