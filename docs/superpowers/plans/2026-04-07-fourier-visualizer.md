# Fourier Transform Visualizer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a stepped-wizard React app that teaches Fourier Transform concepts to computing undergrads through interactive visualizations, deployed to GitHub Pages.

**Architecture:** A single-page React + Vite app with a Wizard component managing chapter progression and unlock logic. Core math lives in a pure-JS FFT hook; audio synthesis and playback live in a Web Audio hook. Chapters are isolated components that call `onComplete()` when the user satisfies the unlock condition.

**Tech Stack:** React 18, Vite, Recharts, react-katex, Tailwind CSS, Web Audio API, Vitest, React Testing Library, gh-pages

---

## File Map

```
fourier-visualizer/
  public/
    default_audio.mp3          # bundled default audio (see Task 1 for sourcing)
    default_image.png          # greyscale image for 2D DFT (see Task 1)
  src/
    App.jsx                    # mounts Wizard
    main.jsx                   # React entry point
    index.css                  # Tailwind directives
    hooks/
      useDFT.js                # Cooley-Tukey FFT, magnitudeSpectrum, binFrequencies
      useAudio.js              # Web Audio context, synthesis, file decode, playback
    components/
      Wizard.jsx               # progress bar, chapter array, unlock state, navigation
      shared/
        Slider.jsx             # labeled range input with live value display
        MathEq.jsx             # react-katex inline/block wrapper
        WaveformPlot.jsx       # Recharts LineChart for time-domain signals
        SpectrumPlot.jsx       # Recharts BarChart for frequency-domain magnitude
        AudioPlayer.jsx        # play/stop button wired to useAudio
      chapters/
        Ch1_Signal.jsx         # time-domain waveform of a synthetic sine, frequency slider
        Ch2_Sinusoids.jsx      # additive synthesis: up to 3 sinusoids, play button
        Ch3_FourierSeries.jsx  # Fourier Series → FT: 5 sub-sections
        Ch4_DFT.jsx            # audio upload/default, DFT of real audio, discrete/continuous table
        Ch5_FreqBins.jsx       # N slider, bin resolution, spectral leakage
        Ch6_Sampling.jsx       # Nyquist, aliasing demo with f_s slider
        Ch7_2DDFT.jsx          # 2D spectrum of default image, conceptual only
  tests/
    useDFT.test.js
    Wizard.test.jsx
  vite.config.js
  tailwind.config.js
  postcss.config.js
  index.html
  package.json
```

---

## Task 1: Scaffold Project

**Files:**
- Create: `fourier-visualizer/` (project root, sibling to this plan)
- Create: `fourier-visualizer/vite.config.js`
- Create: `fourier-visualizer/tailwind.config.js`
- Create: `fourier-visualizer/postcss.config.js`
- Create: `fourier-visualizer/src/index.css`
- Create: `fourier-visualizer/src/main.jsx`
- Create: `fourier-visualizer/src/App.jsx`
- Create: `fourier-visualizer/index.html`

- [ ] **Step 1: Create the Vite + React project**

```bash
cd /home/ubuntu/cs2108
npm create vite@latest fourier-visualizer -- --template react
cd fourier-visualizer
npm install
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install recharts react-katex katex tailwindcss @tailwindcss/vite gh-pages
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Vite**

Replace `vite.config.js` with:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/fourier-visualizer/',
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true,
  },
})
```

- [ ] **Step 4: Configure Tailwind**

Create `src/index.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 5: Import KaTeX styles in main.jsx**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 6: Create minimal App.jsx**

```jsx
export default function App() {
  return <div className="min-h-screen bg-gray-950 text-gray-100">Loading...</div>
}
```

- [ ] **Step 7: Add deploy scripts to package.json**

In `package.json`, add to `"scripts"`:
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

- [ ] **Step 8: Create test setup file**

Create `tests/setup.js`:
```javascript
import '@testing-library/jest-dom'
```

- [ ] **Step 9: Source default assets**

Download a short (5–10s) royalty-free audio clip (e.g. a piano note or chord) and save as `public/default_audio.mp3`.

Download or create a greyscale PNG image (e.g. a simple geometric shape, 256×256px) and save as `public/default_image.png`.

These files must exist before the chapter components are built. For development, any `.mp3` and `.png` will do.

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite prints a local URL (e.g. `http://localhost:5173/fourier-visualizer/`). Browser shows "Loading..." on a dark background.

- [ ] **Step 11: Commit**

```bash
git add fourier-visualizer/
git commit -m "feat: scaffold React + Vite project with Tailwind, KaTeX, Recharts"
```

---

## Task 2: useDFT Hook

**Files:**
- Create: `src/hooks/useDFT.js`
- Create: `tests/useDFT.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/useDFT.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { computeFFT, magnitudeSpectrum, binFrequencies, clampToPowerOf2 } from '../src/hooks/useDFT'

describe('computeFFT', () => {
  it('transforms a DC signal: all energy in bin 0', () => {
    const N = 8
    const samples = new Array(N).fill(1.0)
    const { re, im } = computeFFT(samples)
    expect(re[0]).toBeCloseTo(N, 5)
    expect(im[0]).toBeCloseTo(0, 5)
    for (let i = 1; i < N; i++) {
      expect(Math.abs(re[i])).toBeCloseTo(0, 5)
      expect(Math.abs(im[i])).toBeCloseTo(0, 5)
    }
  })

  it('transforms a single-frequency sine: peak at correct bin', () => {
    const N = 64
    const k = 3 // bin index of the sine frequency
    const samples = Array.from({ length: N }, (_, n) =>
      Math.sin(2 * Math.PI * k * n / N)
    )
    const mags = magnitudeSpectrum(samples)
    const peakBin = mags.indexOf(Math.max(...mags))
    expect(peakBin).toBe(k)
  })

  it('magnitudeSpectrum returns N/2 values', () => {
    const N = 128
    const samples = new Array(N).fill(0)
    const mags = magnitudeSpectrum(samples)
    expect(mags).toHaveLength(N / 2)
  })
})

describe('binFrequencies', () => {
  it('bin 0 is 0 Hz', () => {
    const freqs = binFrequencies(256, 44100)
    expect(freqs[0]).toBe(0)
  })

  it('bin spacing equals sampleRate / N', () => {
    const N = 256, sampleRate = 44100
    const freqs = binFrequencies(N, sampleRate)
    expect(freqs[1] - freqs[0]).toBeCloseTo(sampleRate / N, 5)
  })

  it('last bin is just below Nyquist (sampleRate / 2)', () => {
    const N = 256, sampleRate = 44100
    const freqs = binFrequencies(N, sampleRate)
    expect(freqs[freqs.length - 1]).toBeLessThan(sampleRate / 2)
  })
})

describe('clampToPowerOf2', () => {
  it('returns value clamped to nearest power of 2 within [min, max]', () => {
    expect(clampToPowerOf2(300, 256, 8192)).toBe(256)
    expect(clampToPowerOf2(500, 256, 8192)).toBe(512)
    expect(clampToPowerOf2(10000, 256, 8192)).toBe(8192)
    expect(clampToPowerOf2(100, 256, 8192)).toBe(256)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd fourier-visualizer && npx vitest run tests/useDFT.test.js
```

Expected: FAIL — `Cannot find module '../src/hooks/useDFT'`

- [ ] **Step 3: Implement useDFT.js**

Create `src/hooks/useDFT.js`:

```javascript
/**
 * Cooley-Tukey iterative in-place FFT.
 * Modifies re[] and im[] in place. N must be a power of 2.
 */
function fftInPlace(re, im) {
  const N = re.length

  // Bit-reversal permutation
  let j = 0
  for (let i = 1; i < N; i++) {
    let bit = N >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }

  // Butterfly operations
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    for (let i = 0; i < N; i += len) {
      let curRe = 1,
        curIm = 0
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k]
        const uIm = im[i + k]
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe
        re[i + k] = uRe + vRe
        im[i + k] = uIm + vIm
        re[i + k + len / 2] = uRe - vRe
        im[i + k + len / 2] = uIm - vIm
        const nextRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nextRe
      }
    }
  }
}

/**
 * Compute the FFT of a real-valued sample array.
 * samples.length must be a power of 2.
 * Returns { re: Float64Array, im: Float64Array }
 */
export function computeFFT(samples) {
  const N = samples.length
  const re = new Float64Array(samples)
  const im = new Float64Array(N)
  fftInPlace(re, im)
  return { re, im }
}

/**
 * Returns the magnitude spectrum for the positive-frequency bins only (N/2 values).
 * Normalised by N so amplitudes are independent of window size.
 */
export function magnitudeSpectrum(samples) {
  const { re, im } = computeFFT(samples)
  const N = samples.length
  return Array.from({ length: N / 2 }, (_, i) =>
    Math.sqrt(re[i] * re[i] + im[i] * im[i]) / N
  )
}

/**
 * Returns the Hz value of each positive-frequency bin.
 * binFrequencies(N, sampleRate)[k] = k * sampleRate / N
 */
export function binFrequencies(N, sampleRate) {
  return Array.from({ length: N / 2 }, (_, i) => (i * sampleRate) / N)
}

/**
 * Clamps n to the nearest power of 2 within [min, max].
 */
export function clampToPowerOf2(n, min = 256, max = 8192) {
  const p = Math.pow(2, Math.round(Math.log2(n)))
  return Math.min(Math.max(p, min), max)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/useDFT.test.js
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDFT.js tests/useDFT.test.js
git commit -m "feat: implement Cooley-Tukey FFT hook with tests"
```

---

## Task 3: useAudio Hook

**Files:**
- Create: `src/hooks/useAudio.js`

Note: Web Audio API cannot be unit-tested without a real browser. This hook is tested manually in Task 9 (Ch2 playback). The hook is kept simple and stateless enough that component integration is the right test surface.

- [ ] **Step 1: Create useAudio.js**

```javascript
import { useRef, useCallback, useState } from 'react'

/**
 * useAudio — wraps Web Audio API for:
 *   - Synthesized tone playback (array of {frequency, amplitude})
 *   - AudioBuffer playback (decoded from file)
 *   - Real-time AnalyserNode data for waveform visualization
 */
export function useAudio() {
  const ctxRef = useRef(null)
  const analyserRef = useRef(null)
  const activeNodesRef = useRef([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [supported, setSupported] = useState(true)

  const getCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) {
      setSupported(false)
      return null
    }
    ctxRef.current = new Ctx()
    analyserRef.current = ctxRef.current.createAnalyser()
    analyserRef.current.fftSize = 2048
    analyserRef.current.connect(ctxRef.current.destination)
    return ctxRef.current
  }, [])

  const stop = useCallback(() => {
    activeNodesRef.current.forEach((n) => {
      try { n.stop() } catch (_) { /* already stopped */ }
      try { n.disconnect() } catch (_) { /* already disconnected */ }
    })
    activeNodesRef.current = []
    setIsPlaying(false)
  }, [])

  /**
   * Play synthesized tones.
   * @param {Array<{frequency: number, amplitude: number}>} oscillators
   */
  const playSynthesized = useCallback(
    (oscillators) => {
      const ctx = getCtx()
      if (!ctx) return
      stop()

      const masterGain = ctx.createGain()
      masterGain.gain.value = 0.4 / Math.max(oscillators.length, 1)
      masterGain.connect(analyserRef.current)

      const oscNodes = oscillators.map(({ frequency, amplitude }) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = frequency
        gain.gain.value = Math.max(0, Math.min(1, amplitude))
        osc.connect(gain)
        gain.connect(masterGain)
        osc.start()
        return osc
      })

      activeNodesRef.current = oscNodes
      setIsPlaying(true)
    },
    [getCtx, stop]
  )

  /**
   * Play a decoded AudioBuffer.
   */
  const playBuffer = useCallback(
    (audioBuffer) => {
      const ctx = getCtx()
      if (!ctx) return
      stop()

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(analyserRef.current)
      source.onended = () => setIsPlaying(false)
      source.start()
      activeNodesRef.current = [source]
      setIsPlaying(true)
    },
    [getCtx, stop]
  )

  /**
   * Decode an ArrayBuffer (from FileReader or fetch) into an AudioBuffer.
   * Returns null if unsupported.
   */
  const decodeAudioFile = useCallback(
    async (arrayBuffer) => {
      const ctx = getCtx()
      if (!ctx) return null
      return ctx.decodeAudioData(arrayBuffer)
    },
    [getCtx]
  )

  /**
   * Get current time-domain data from the analyser (Uint8Array, length 2048).
   * Returns null if audio context not yet initialised.
   */
  const getTimeDomainData = useCallback(() => {
    if (!analyserRef.current) return null
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteTimeDomainData(data)
    return data
  }, [])

  return {
    supported,
    isPlaying,
    playSynthesized,
    playBuffer,
    stop,
    decodeAudioFile,
    getTimeDomainData,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAudio.js
git commit -m "feat: add Web Audio hook for synthesis and file playback"
```

---

## Task 4: Shared Components — Slider and MathEq

**Files:**
- Create: `src/components/shared/Slider.jsx`
- Create: `src/components/shared/MathEq.jsx`

- [ ] **Step 1: Create Slider.jsx**

```jsx
/**
 * Labeled range slider.
 * Props:
 *   label: string
 *   min, max, step: number
 *   value: number
 *   onChange: (value: number) => void
 *   unit: string (optional, e.g. "Hz")
 *   formatValue: (value: number) => string (optional)
 */
export default function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = '',
  formatValue,
}) {
  const display = formatValue ? formatValue(value) : value
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between text-sm text-gray-300">
        <span>{label}</span>
        <span className="font-mono text-blue-400">
          {display}
          {unit && ` ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}{unit && ` ${unit}`}</span>
        <span>{max}{unit && ` ${unit}`}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create MathEq.jsx**

```jsx
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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/Slider.jsx src/components/shared/MathEq.jsx
git commit -m "feat: add Slider and MathEq shared components"
```

---

## Task 5: Shared Components — WaveformPlot and SpectrumPlot

**Files:**
- Create: `src/components/shared/WaveformPlot.jsx`
- Create: `src/components/shared/SpectrumPlot.jsx`

- [ ] **Step 1: Create WaveformPlot.jsx**

```jsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

/**
 * Time-domain waveform plot.
 * Props:
 *   samples: number[]   — amplitude values
 *   sampleRate: number  — used to label x-axis in seconds (optional, defaults to labelling by sample index)
 *   height: number      — chart height in px (default 200)
 *   color: string       — line color (default '#60a5fa')
 *   yDomain: [number, number] — y-axis domain (default [-1.5, 1.5])
 */
export default function WaveformPlot({
  samples,
  sampleRate,
  height = 200,
  color = '#60a5fa',
  yDomain = [-1.5, 1.5],
}) {
  const data = samples.map((v, i) => ({
    t: sampleRate ? Number((i / sampleRate).toFixed(4)) : i,
    v,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="t"
          stroke="#9ca3af"
          tick={{ fontSize: 11 }}
          label={{
            value: sampleRate ? 'Time (s)' : 'Sample',
            position: 'insideBottomRight',
            offset: -5,
            fill: '#9ca3af',
            fontSize: 11,
          }}
        />
        <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} domain={yDomain} />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151' }}
          labelStyle={{ color: '#d1d5db' }}
          itemStyle={{ color: color }}
        />
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          dot={false}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Create SpectrumPlot.jsx**

```jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts'

/**
 * Frequency-domain magnitude spectrum plot.
 * Props:
 *   magnitudes: number[]   — magnitude per bin (length N/2)
 *   frequencies: number[]  — Hz value per bin (length N/2)
 *   height: number         — chart height in px (default 200)
 *   color: string          — bar color (default '#34d399')
 *   nyquist: number        — if provided, draws a vertical reference line
 *   maxFreq: number        — x-axis max (default: last frequency value)
 *   annotatedBins: Array<{binIndex: number, label: string}> — optional bin labels
 */
export default function SpectrumPlot({
  magnitudes,
  frequencies,
  height = 200,
  color = '#34d399',
  nyquist,
  maxFreq,
  annotatedBins = [],
}) {
  const data = magnitudes.map((mag, i) => ({
    freq: frequencies[i] !== undefined ? Math.round(frequencies[i]) : i,
    mag,
    label: annotatedBins.find((b) => b.binIndex === i)?.label,
  }))

  const xMax = maxFreq ?? (frequencies.length > 0 ? frequencies[frequencies.length - 1] : undefined)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="freq"
          stroke="#9ca3af"
          tick={{ fontSize: 10 }}
          type="number"
          domain={[0, xMax]}
          label={{
            value: 'Frequency (Hz)',
            position: 'insideBottomRight',
            offset: -5,
            fill: '#9ca3af',
            fontSize: 11,
          }}
        />
        <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151' }}
          labelStyle={{ color: '#d1d5db' }}
          formatter={(v) => [v.toFixed(4), 'Magnitude']}
          labelFormatter={(v) => `${v} Hz`}
        />
        {nyquist && (
          <ReferenceLine
            x={nyquist}
            stroke="#f87171"
            strokeDasharray="4 4"
            label={{ value: 'Nyquist', fill: '#f87171', fontSize: 11 }}
          />
        )}
        <Bar dataKey="mag" fill={color} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/WaveformPlot.jsx src/components/shared/SpectrumPlot.jsx
git commit -m "feat: add WaveformPlot and SpectrumPlot shared components"
```

---

## Task 6: Wizard Component

**Files:**
- Create: `src/components/Wizard.jsx`
- Create: `tests/Wizard.test.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write failing Wizard tests**

Create `tests/Wizard.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Wizard from '../src/components/Wizard'

// Minimal chapter stubs
const makeChapters = (n) =>
  Array.from({ length: n }, (_, i) => ({
    title: `Chapter ${i + 1}`,
    component: ({ onComplete }) => (
      <button onClick={onComplete}>Complete Ch{i + 1}</button>
    ),
  }))

describe('Wizard', () => {
  it('renders the first chapter on mount', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    expect(screen.getByText('Complete Ch1')).toBeInTheDocument()
  })

  it('does not show Next button until chapter is completed', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    expect(screen.queryByRole('button', { name: /next/i })).toBeNull()
  })

  it('shows Next button after chapter completes', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    fireEvent.click(screen.getByText('Complete Ch1'))
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('advances to next chapter when Next is clicked', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    fireEvent.click(screen.getByText('Complete Ch1'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Complete Ch2')).toBeInTheDocument()
  })

  it('Prev button is disabled on first chapter', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
  })

  it('Prev button navigates back', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    fireEvent.click(screen.getByText('Complete Ch1'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /prev/i }))
    expect(screen.getByText('Complete Ch1')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/Wizard.test.jsx
```

Expected: FAIL — `Cannot find module '../src/components/Wizard'`

- [ ] **Step 3: Implement Wizard.jsx**

```jsx
import { useState } from 'react'

/**
 * Stepped wizard component.
 * Props:
 *   chapters: Array<{ title: string, component: React.ComponentType<{ onComplete: () => void }> }>
 */
export default function Wizard({ chapters }) {
  const [current, setCurrent] = useState(0)
  const [completed, setCompleted] = useState(new Set())

  const handleComplete = () => {
    setCompleted((prev) => new Set([...prev, current]))
  }

  const ChapterComponent = chapters[current].component
  const isLastChapter = current === chapters.length - 1

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {chapters.map((ch, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i <= Math.max(...[...completed, current]) && setCurrent(i)}
              className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-colors
                ${i === current ? 'bg-blue-500 text-white' : ''}
                ${completed.has(i) && i !== current ? 'bg-green-600 text-white cursor-pointer' : ''}
                ${!completed.has(i) && i !== current ? 'bg-gray-700 text-gray-400 cursor-default' : ''}
              `}
            >
              {completed.has(i) && i !== current ? '✓' : i + 1}
            </button>
            {i < chapters.length - 1 && (
              <div className={`h-1 flex-1 rounded ${i < current ? 'bg-green-600' : 'bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Chapter title */}
      <h2 className="text-xl font-semibold text-gray-100">{chapters[current].title}</h2>

      {/* Chapter content */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <ChapterComponent onComplete={handleComplete} />
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrent((c) => c - 1)}
          disabled={current === 0}
          className="px-4 py-2 rounded bg-gray-700 text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
        >
          ← Prev
        </button>

        {!isLastChapter && completed.has(current) && (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            Next →
          </button>
        )}

        {isLastChapter && completed.has(current) && (
          <span className="text-green-400 font-semibold">Complete!</span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run Wizard tests to verify they pass**

```bash
npx vitest run tests/Wizard.test.jsx
```

Expected: all 6 tests PASS

- [ ] **Step 5: Wire Wizard into App.jsx**

```jsx
import Wizard from './components/Wizard'
import Ch1_Signal from './components/chapters/Ch1_Signal'
import Ch2_Sinusoids from './components/chapters/Ch2_Sinusoids'
import Ch3_FourierSeries from './components/chapters/Ch3_FourierSeries'
import Ch4_DFT from './components/chapters/Ch4_DFT'
import Ch5_FreqBins from './components/chapters/Ch5_FreqBins'
import Ch6_Sampling from './components/chapters/Ch6_Sampling'
import Ch7_2DDFT from './components/chapters/Ch7_2DDFT'

const CHAPTERS = [
  { title: '1 — What is a Signal?', component: Ch1_Signal },
  { title: '2 — Frequencies & Sinusoids', component: Ch2_Sinusoids },
  { title: '3 — From Fourier Series to the Fourier Transform', component: Ch3_FourierSeries },
  { title: '4 — The Discrete Fourier Transform', component: Ch4_DFT },
  { title: '5 — Frequency Bins in Depth', component: Ch5_FreqBins },
  { title: '6 — Sampling & the Nyquist Theorem', component: Ch6_Sampling },
  { title: '7 — 2D DFT', component: Ch7_2DDFT },
]

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-blue-400">Fourier Transform Explorer</h1>
        <p className="text-sm text-gray-400 mt-1">An interactive walkthrough of signal frequency analysis</p>
      </header>
      <main className="py-6">
        <Wizard chapters={CHAPTERS} />
      </main>
    </div>
  )
}
```

Note: this will fail until chapter stub files exist. Create minimal stubs for each chapter in the next step.

- [ ] **Step 6: Create chapter stubs (so App.jsx compiles)**

Create each of these files with the same stub content, substituting the chapter number and title:

`src/components/chapters/Ch1_Signal.jsx`:
```jsx
export default function Ch1_Signal({ onComplete }) {
  return (
    <div>
      <p className="text-gray-400">Chapter 1 coming soon.</p>
      <button onClick={onComplete} className="mt-4 px-3 py-1 bg-blue-700 rounded text-sm">
        Mark complete (stub)
      </button>
    </div>
  )
}
```

Repeat the same stub pattern for `Ch2_Sinusoids.jsx`, `Ch3_FourierSeries.jsx`, `Ch4_DFT.jsx`, `Ch5_FreqBins.jsx`, `Ch6_Sampling.jsx`, `Ch7_2DDFT.jsx`.

- [ ] **Step 7: Verify in browser**

```bash
npm run dev
```

Expected: Wizard renders with 7 chapter circles. Clicking "Mark complete (stub)" enables the Next button.

- [ ] **Step 8: Commit**

```bash
git add src/components/Wizard.jsx src/App.jsx src/components/chapters/ tests/Wizard.test.jsx
git commit -m "feat: implement Wizard with unlock logic and chapter stubs"
```

---

## Task 7: Ch1 — What is a Signal?

**Files:**
- Modify: `src/components/chapters/Ch1_Signal.jsx`

- [ ] **Step 1: Implement Ch1_Signal.jsx**

```jsx
import { useState, useMemo } from 'react'
import Slider from '../shared/Slider'
import WaveformPlot from '../shared/WaveformPlot'
import MathEq from '../shared/MathEq'

const SAMPLE_RATE = 1000 // samples per second for display
const DURATION = 0.02    // 20 ms window

function generateSine(frequency, amplitude, sampleRate, duration) {
  const N = Math.floor(sampleRate * duration)
  return Array.from({ length: N }, (_, i) =>
    amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate)
  )
}

export default function Ch1_Signal({ onComplete }) {
  const [frequency, setFrequency] = useState(220)
  const [amplitude, setAmplitude] = useState(1.0)
  const [interacted, setInteracted] = useState(false)

  const samples = useMemo(
    () => generateSine(frequency, amplitude, SAMPLE_RATE, DURATION),
    [frequency, amplitude]
  )

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

      <WaveformPlot samples={samples} sampleRate={SAMPLE_RATE} />

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

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Navigate to Chapter 1. The sine waveform should render and update in real time as sliders move. After touching the frequency slider, the Next button appears.

- [ ] **Step 3: Commit**

```bash
git add src/components/chapters/Ch1_Signal.jsx
git commit -m "feat: implement Ch1 signal waveform with frequency/amplitude sliders"
```

---

## Task 8: Ch2 — Frequencies & Sinusoids

**Files:**
- Modify: `src/components/chapters/Ch2_Sinusoids.jsx`

- [ ] **Step 1: Implement Ch2_Sinusoids.jsx**

```jsx
import { useState, useMemo, useCallback } from 'react'
import Slider from '../shared/Slider'
import WaveformPlot from '../shared/WaveformPlot'
import { useAudio } from '../../hooks/useAudio'

const SAMPLE_RATE = 1000
const DURATION = 0.04

function generateSine(freq, amp, sampleRate, duration) {
  const N = Math.floor(sampleRate * duration)
  return Array.from({ length: N }, (_, i) =>
    amp * Math.sin(2 * Math.PI * freq * i / sampleRate)
  )
}

const DEFAULT_OSCILLATORS = [
  { frequency: 220, amplitude: 0.8 },
  { frequency: 440, amplitude: 0.5 },
  { frequency: 660, amplitude: 0.3 },
]

export default function Ch2_Sinusoids({ onComplete }) {
  const [oscillators, setOscillators] = useState(DEFAULT_OSCILLATORS)
  const { supported, isPlaying, playSynthesized, stop } = useAudio()
  const [hasPlayed, setHasPlayed] = useState(false)

  const individualWaves = useMemo(
    () => oscillators.map(({ frequency, amplitude }) =>
      generateSine(frequency, amplitude, SAMPLE_RATE, DURATION)
    ),
    [oscillators]
  )

  const combined = useMemo(() => {
    const N = individualWaves[0]?.length ?? 0
    return Array.from({ length: N }, (_, i) =>
      individualWaves.reduce((sum, wave) => sum + (wave[i] ?? 0), 0)
    )
  }, [individualWaves])

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
            <WaveformPlot
              samples={individualWaves[i]}
              height={100}
              color={['#60a5fa', '#34d399', '#f472b6'][i]}
              yDomain={[-1.5, 1.5]}
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
        <WaveformPlot samples={combined} height={140} color="#facc15" yDomain={[-3, 3]} />
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

- [ ] **Step 2: Verify in browser**

Navigate to Chapter 2. Three coloured waveforms and a combined waveform should render. Clicking Play should produce audio. After playing, the Next button appears.

- [ ] **Step 3: Commit**

```bash
git add src/components/chapters/Ch2_Sinusoids.jsx
git commit -m "feat: implement Ch2 additive synthesis with Web Audio playback"
```

---

## Task 9: Ch3 — From Fourier Series to the Fourier Transform

**Files:**
- Modify: `src/components/chapters/Ch3_FourierSeries.jsx`

This chapter has 5 sub-sections rendered in sequence within the same wizard step. A local `section` state (0–4) controls which sub-section is visible. The chapter calls `onComplete()` when the user advances past section 4 (or presses the "I understand" button in the last section).

- [ ] **Step 1: Implement Ch3_FourierSeries.jsx**

```jsx
import { useState, useMemo } from 'react'
import Slider from '../shared/Slider'
import WaveformPlot from '../shared/WaveformPlot'
import MathEq from '../shared/MathEq'

const SAMPLE_RATE = 1000
const DURATION = 0.04
const N_DISPLAY = Math.floor(SAMPLE_RATE * DURATION)

function sine(freq, amp, n, sampleRate) {
  return Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * freq * i / sampleRate))
}

function cosine(freq, amp, n, sampleRate) {
  return Array.from({ length: n }, (_, i) => amp * Math.cos(2 * Math.PI * freq * i / sampleRate))
}

// Approximate inner product (integral) of two signals via trapezoidal rule
function innerProduct(a, b) {
  const dt = 1 / SAMPLE_RATE
  return a.reduce((sum, v, i) => sum + v * (b[i] ?? 0) * dt, 0)
}

// Phasor SVG: rotating vector on unit circle for Euler section
function Phasor({ omega }) {
  const angle = omega  // treat omega directly as angle in radians for display
  const cx = 80, cy = 80, r = 60
  const x = cx + r * Math.cos(angle)
  const y = cy - r * Math.sin(angle)
  const reX = cx + r * Math.cos(angle)
  const imY = cy - r * Math.sin(angle)

  return (
    <svg width="160" height="160" className="mx-auto">
      {/* Unit circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#374151" strokeWidth="1.5" />
      {/* Axes */}
      <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke="#4b5563" strokeWidth="1" />
      <line x1={cx} y1={cy - r - 10} x2={cx} y2={cy + r + 10} stroke="#4b5563" strokeWidth="1" />
      {/* Real projection */}
      <line x1={reX} y1={cy} x2={reX} y2={imY} stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />
      {/* Imaginary projection */}
      <line x1={cx} y1={imY} x2={reX} y2={imY} stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" />
      {/* Phasor */}
      <line x1={cx} y1={cy} x2={x} y2={y} stroke="#facc15" strokeWidth="2.5" />
      <circle cx={x} cy={y} r={4} fill="#facc15" />
      {/* Labels */}
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
  'The Leap to the Fourier Transform',
]

export default function Ch3_FourierSeries({ onComplete }) {
  const [section, setSection] = useState(0)
  const [freq1, setFreq1] = useState(100)
  const [freq2, setFreq2] = useState(300)
  const [omega, setOmega] = useState(1.0)
  const [omegaInteracted, setOmegaInteracted] = useState(false)

  const wave1 = useMemo(() => sine(freq1, 1, N_DISPLAY, SAMPLE_RATE), [freq1])
  const wave2 = useMemo(() => sine(freq2, 1, N_DISPLAY, SAMPLE_RATE), [freq2])
  const product = useMemo(() => wave1.map((v, i) => v * wave2[i]), [wave1, wave2])
  const ip = useMemo(() => innerProduct(wave1, wave2), [wave1, wave2])

  const correlationSamples = useMemo(() => {
    // correlation of e^(i*omega*t) with itself: shows max at correct omega
    const testFreq = omega * 50  // map 0..4π to ~0..600 Hz
    return sine(testFreq, 1, N_DISPLAY, SAMPLE_RATE)
  }, [omega])

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
      {/* Sub-section progress */}
      <div className="flex gap-2 text-xs">
        {SECTIONS.map((s, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded-full ${i === section ? 'bg-blue-600 text-white' : i < section ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-400'}`}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Section 0: Fourier Series */}
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

      {/* Section 1: Orthogonality */}
      {section === 1 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Orthogonality of Sine Waves</h3>
          <p className="text-gray-300">
            The reason Fourier decomposition <em>works</em> — and gives unique coefficients — is that sines at
            different frequencies are <strong className="text-white">orthogonal</strong>.
            Just like orthogonal basis vectors in linear algebra, you can project a signal onto each frequency
            component independently.
          </p>
          <p className="text-gray-300 text-sm">
            Two functions <MathEq math="f" /> and <MathEq math="g" /> are orthogonal if their inner product is zero:
          </p>
          <MathEq block math="\langle f, g \rangle = \int_0^T f(t)\,g(t)\,dt = 0" />
          <p className="text-gray-400 text-sm">
            Try different frequencies below. When they differ, the product oscillates and integrates to ≈ 0.
            When they match, the product is always positive — non-zero integral.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <WaveformPlot samples={wave1} height={80} color="#60a5fa" />
            <WaveformPlot samples={wave2} height={80} color="#34d399" />
            <WaveformPlot samples={product} height={80} color="#f472b6" yDomain={[-1.5, 1.5]} />
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

      {/* Section 2: Complex Numbers */}
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
              <strong className="text-blue-300">Real part</strong> — correlation with <MathEq math="\cos(\omega t)" />{' '}
              (the even/symmetric component)
            </li>
            <li>
              <strong className="text-green-300">Imaginary part</strong> — correlation with <MathEq math="\sin(\omega t)" />{' '}
              (the odd/antisymmetric component)
            </li>
          </ul>
          <p className="text-gray-300 text-sm">
            Together they encode both the <strong className="text-white">amplitude</strong> and the{' '}
            <strong className="text-white">phase</strong> of that frequency component:
          </p>
          <MathEq block math="X(\omega) = \underbrace{\int x(t)\cos(\omega t)\,dt}_{\text{Re}} - i\underbrace{\int x(t)\sin(\omega t)\,dt}_{\text{Im}}" />
          <MathEq block math="|X(\omega)| = \sqrt{\text{Re}^2 + \text{Im}^2} \quad \angle X(\omega) = \arctan\!\left(\frac{\text{Im}}{\text{Re}}\right)" />
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <strong className="text-yellow-300">Common misconception:</strong> "complex numbers are just a convenient notation."
            They're not — the phase information in the imaginary part is essential for reconstructing the original signal
            via the inverse Fourier transform.
          </div>
        </div>
      )}

      {/* Section 3: Euler's Formula */}
      {section === 3 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Euler's Formula</h3>
          <p className="text-gray-300">
            Instead of writing cosine and sine separately, we use <strong className="text-white">Euler's formula</strong>
            to unify them as a single rotating complex exponential:
          </p>
          <MathEq block math="e^{i\omega t} = \cos(\omega t) + i\sin(\omega t)" />
          <p className="text-gray-300 text-sm">
            Geometrically, <MathEq math="e^{i\omega t}" /> traces a unit circle in the complex plane as <MathEq math="t" /> increases.
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
          <p className="text-gray-400 text-sm">
            This lets us write the Fourier Transform compactly as a single integral using{' '}
            <MathEq math="e^{-i\omega t}" /> instead of separate cosine and sine integrals.
          </p>
        </div>
      )}

      {/* Section 4: The Leap to FT */}
      {section === 4 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">The Leap to the Fourier Transform</h3>
          <p className="text-gray-300">
            The Fourier Series works for periodic signals with period <MathEq math="T" />.
            But what about <strong className="text-white">aperiodic</strong> signals — like a single piano note, or your voice?
          </p>
          <p className="text-gray-300">
            We take the Fourier Series and let <MathEq math="T \to \infty" />. As the period grows:
          </p>
          <ul className="list-disc list-inside text-gray-300 text-sm flex flex-col gap-1 ml-2">
            <li>The discrete harmonics get closer and closer together</li>
            <li>The sum over discrete frequencies becomes a continuous integral</li>
            <li>Discrete coefficients <MathEq math="a_k, b_k" /> become a continuous function <MathEq math="X(\omega)" /></li>
          </ul>
          <MathEq block math="X(\omega) = \int_{-\infty}^{\infty} x(t)\, e^{-i\omega t}\, dt" />
          <p className="text-gray-300 text-sm">
            The result is a <em>continuous</em> spectrum — every frequency has a value, not just discrete harmonics.
            The Fourier Series is a special case of this when the signal is periodic.
          </p>
          <p className="text-gray-400 text-sm">
            Drag <MathEq math="\omega" /> to see how the correlation of <MathEq math="e^{-i\omega t}" /> with a synthetic signal changes:
          </p>
          <WaveformPlot samples={correlationSamples} height={100} color="#a78bfa" />
          <Slider
            label="ω (angular frequency)"
            min={0.1} max={12.56} step={0.1}
            value={omega}
            onChange={handleOmegaChange}
            formatValue={(v) => `${v.toFixed(2)} rad/s`}
          />
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <strong className="text-yellow-300">Summary so far:</strong> Fourier Series (periodic, discrete spectrum)
            → Fourier Transform (aperiodic, continuous spectrum). Both rely on orthogonality of{' '}
            <MathEq math="e^{i\omega t}" /> basis functions.
          </div>
        </div>
      )}

      {/* Navigation within chapter */}
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

- [ ] **Step 2: Verify in browser**

Navigate to Chapter 3. Step through all 5 sub-sections. Verify:
- Section 1: product waveform updates when freq sliders change; inner product shows ≈ 0 for different frequencies
- Section 3: phasor rotates as omega slider moves
- Section 4: "I understand" button only enables after omega slider is touched

- [ ] **Step 3: Commit**

```bash
git add src/components/chapters/Ch3_FourierSeries.jsx
git commit -m "feat: implement Ch3 Fourier Series to FT walkthrough with orthogonality and Euler sections"
```

---

## Task 10: Ch4 — Discrete Fourier Transform

**Files:**
- Modify: `src/components/chapters/Ch4_DFT.jsx`

- [ ] **Step 1: Implement Ch4_DFT.jsx**

```jsx
import { useState, useMemo, useCallback } from 'react'
import MathEq from '../shared/MathEq'
import SpectrumPlot from '../shared/SpectrumPlot'
import WaveformPlot from '../shared/WaveformPlot'
import { magnitudeSpectrum, binFrequencies, clampToPowerOf2 } from '../../hooks/useDFT'
import { useAudio } from '../../hooks/useAudio'

const DEFAULT_AUDIO_URL = '/fourier-visualizer/default_audio.mp3'
const SAMPLE_RATE = 44100
const N = 4096

export default function Ch4_DFT({ onComplete }) {
  const [audioBuffer, setAudioBuffer] = useState(null)
  const [audioName, setAudioName] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { supported, isPlaying, playBuffer, stop, decodeAudioFile } = useAudio()

  const loadDefault = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(DEFAULT_AUDIO_URL)
      if (!res.ok) throw new Error('Could not load default audio file.')
      const arrayBuffer = await res.arrayBuffer()
      const decoded = await decodeAudioFile(arrayBuffer)
      setAudioBuffer(decoded)
      setAudioName('default_audio.mp3')
      onComplete()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [decodeAudioFile, onComplete])

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file (mp3, wav, ogg, etc.)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Please use a file under 10 MB.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const decoded = await decodeAudioFile(arrayBuffer)
      setAudioBuffer(decoded)
      setAudioName(file.name)
      onComplete()
    } catch (e) {
      setError('Could not decode audio file. Try a different format.')
    } finally {
      setLoading(false)
    }
  }, [decodeAudioFile, onComplete])

  // Extract N samples from channel 0 of the decoded AudioBuffer
  const samples = useMemo(() => {
    if (!audioBuffer) return null
    const channelData = audioBuffer.getChannelData(0)
    const windowN = clampToPowerOf2(N, 256, 8192)
    return Array.from(channelData.slice(0, windowN))
  }, [audioBuffer])

  const { magnitudes, frequencies } = useMemo(() => {
    if (!samples) return { magnitudes: [], frequencies: [] }
    return {
      magnitudes: magnitudeSpectrum(samples),
      frequencies: binFrequencies(samples.length, SAMPLE_RATE),
    }
  }, [samples])

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-300">
        The Fourier Transform we've studied is continuous. Real-world signals are{' '}
        <strong className="text-white">sampled</strong> — they consist of discrete values measured at regular intervals.
        The <strong className="text-white">Discrete Fourier Transform (DFT)</strong> applies the same idea to finite, discrete signals.
      </p>

      <MathEq block math="X[k] = \sum_{n=0}^{N-1} x[n]\, e^{-i 2\pi k n / N} \quad k = 0, 1, \ldots, N-1" />

      <div className="overflow-x-auto">
        <table className="text-sm text-gray-300 border-collapse w-full">
          <thead>
            <tr className="bg-gray-800">
              <th className="border border-gray-700 px-3 py-2 text-left">Transform</th>
              <th className="border border-gray-700 px-3 py-2">Time domain</th>
              <th className="border border-gray-700 px-3 py-2">Frequency domain</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-700 px-3 py-2">Fourier Series</td>
              <td className="border border-gray-700 px-3 py-2 text-center">Continuous, periodic</td>
              <td className="border border-gray-700 px-3 py-2 text-center">Discrete</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-3 py-2">Fourier Transform</td>
              <td className="border border-gray-700 px-3 py-2 text-center">Continuous, aperiodic</td>
              <td className="border border-gray-700 px-3 py-2 text-center">Continuous</td>
            </tr>
            <tr className="bg-blue-900/30">
              <td className="border border-gray-700 px-3 py-2 font-semibold text-blue-300">DFT</td>
              <td className="border border-gray-700 px-3 py-2 text-center text-blue-200">Discrete (periodic assumed)</td>
              <td className="border border-gray-700 px-3 py-2 text-center text-blue-200">Discrete</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
        <strong className="text-yellow-300">Important:</strong> the DFT assumes the <MathEq math="N" /> samples{' '}
        <em>repeat indefinitely</em>. If the signal doesn't start and end at the same value, this creates a
        discontinuity — causing <strong className="text-white">spectral leakage</strong> (covered in the next chapter).
      </div>

      <div>
        <h3 className="text-base font-semibold text-white mb-3">Load audio to apply the DFT</h3>
        {!supported && (
          <p className="text-red-400 text-sm mb-3">Web Audio API not supported in this browser. Audio features are unavailable.</p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadDefault}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Use default audio'}
          </button>
          <label className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-sm cursor-pointer">
            Upload your own
            <input type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        {audioName && <p className="text-green-400 text-sm mt-2">Loaded: {audioName}</p>}
      </div>

      {audioBuffer && samples && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Time domain (first {samples.length} samples)
            </h3>
            <WaveformPlot samples={samples} sampleRate={SAMPLE_RATE} height={140} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Frequency domain — DFT magnitude spectrum
            </h3>
            <SpectrumPlot magnitudes={magnitudes} frequencies={frequencies} height={180} />
          </div>
          {supported && (
            <button
              onClick={() => (isPlaying ? stop() : playBuffer(audioBuffer))}
              className="self-start px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 transition-colors text-sm"
            >
              {isPlaying ? '⏹ Stop' : '▶ Play audio'}
            </button>
          )}
        </>
      )}

      {!audioBuffer && (
        <p className="text-blue-400 text-sm italic">Select or upload an audio file to continue.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to Chapter 4. Load the default audio. Verify:
- Waveform of the audio renders
- Spectrum plot shows meaningful peaks
- Play button works
- Next button appears after audio loads

- [ ] **Step 3: Commit**

```bash
git add src/components/chapters/Ch4_DFT.jsx
git commit -m "feat: implement Ch4 DFT with audio upload, spectrum plot, and discrete/continuous duality table"
```

---

## Task 11: Ch5 — Frequency Bins in Depth

**Files:**
- Modify: `src/components/chapters/Ch5_FreqBins.jsx`

- [ ] **Step 1: Implement Ch5_FreqBins.jsx**

```jsx
import { useState, useMemo } from 'react'
import Slider from '../shared/Slider'
import SpectrumPlot from '../shared/SpectrumPlot'
import MathEq from '../shared/MathEq'
import { magnitudeSpectrum, binFrequencies, clampToPowerOf2 } from '../../hooks/useDFT'

const SAMPLE_RATE = 44100
// Synthesize a signal with a frequency between two bins to demonstrate leakage
function syntheticSignal(N, freq) {
  return Array.from({ length: N }, (_, n) => Math.sin(2 * Math.PI * freq * n / SAMPLE_RATE))
}

export default function Ch5_FreqBins({ onComplete }) {
  const [nExp, setNExp] = useState(10) // N = 2^nExp, so 10 → 1024
  const [interacted, setInteracted] = useState(false)

  const N = Math.pow(2, nExp)
  // Use a frequency that falls between bins for N=1024 to show leakage
  const testFreq = 1000.7 * (SAMPLE_RATE / N) // slightly off-bin

  const samples = useMemo(() => syntheticSignal(N, testFreq), [N, testFreq])

  const magnitudes = useMemo(() => magnitudeSpectrum(samples), [samples])
  const frequencies = useMemo(() => binFrequencies(N, SAMPLE_RATE), [N])

  const binSpacing = SAMPLE_RATE / N
  const nyquist = SAMPLE_RATE / 2
  const numBins = N / 2

  const handleNChange = (v) => {
    setNExp(v)
    if (!interacted) {
      setInteracted(true)
      onComplete()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-300">
        The DFT of <MathEq math="N" /> samples produces <MathEq math="N" /> complex values —
        but only the first <MathEq math="N/2" /> are meaningful (the rest are mirror images).
        Each of those values corresponds to a <strong className="text-white">frequency bin</strong>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Bin spacing</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{binSpacing.toFixed(1)} Hz</p>
          <MathEq math={`\\frac{f_s}{N} = \\frac{${SAMPLE_RATE}}{${N}}`} />
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Number of bins</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{numBins.toLocaleString()}</p>
          <MathEq math="N/2" />
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Max frequency</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{(nyquist / 1000).toFixed(1)} kHz</p>
          <MathEq math="f_s / 2" /> <span className="text-xs text-gray-400">(always)</span>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2 text-sm text-gray-300">
        <p><strong className="text-yellow-300">Common misconception:</strong> "More samples = higher max frequency."</p>
        <p>
          Wrong. The maximum frequency is always <MathEq math="f_s / 2" /> — fixed by the sample rate.
          More samples give you <em>finer frequency resolution</em> (smaller bin spacing), not higher frequencies.
        </p>
      </div>

      <Slider
        label="Window size N = 2^n"
        min={8} max={13} step={1}
        value={nExp}
        onChange={handleNChange}
        formatValue={(v) => `2^${v} = ${Math.pow(2, v).toLocaleString()} samples`}
      />

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Spectrum of a {testFreq.toFixed(1)} Hz tone (note: not on a bin boundary)
        </h3>
        <SpectrumPlot
          magnitudes={magnitudes}
          frequencies={frequencies}
          height={180}
          maxFreq={5000}
        />
      </div>

      <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
        <strong className="text-yellow-300">Spectral leakage:</strong> when a frequency falls between two bins,
        energy "leaks" into neighbouring bins. This is visible above — instead of a single spike, you see a spread.
        Increasing <MathEq math="N" /> makes bins narrower, reducing the relative gap to the nearest bin.
        <br /><br />
        In practice, <strong className="text-white">windowing functions</strong> (Hann, Hamming) are applied to
        the samples before the DFT to reduce leakage, at the cost of slightly blurring the peaks.
      </div>

      {!interacted && (
        <p className="text-blue-400 text-sm italic">Change the window size slider to continue.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to Chapter 5. The three stat cards should update as the N slider moves. The spectrum should show leakage spread around the test frequency. Next button appears after slider is touched.

- [ ] **Step 3: Commit**

```bash
git add src/components/chapters/Ch5_FreqBins.jsx
git commit -m "feat: implement Ch5 frequency bins with N slider, leakage demo, and misconception callouts"
```

---

## Task 12: Ch6 — Sampling & the Nyquist Theorem

**Files:**
- Modify: `src/components/chapters/Ch6_Sampling.jsx`

- [ ] **Step 1: Implement Ch6_Sampling.jsx**

```jsx
import { useState, useMemo } from 'react'
import Slider from '../shared/Slider'
import WaveformPlot from '../shared/WaveformPlot'
import MathEq from '../shared/MathEq'

const TRUE_FREQ = 440 // Hz — the "true" signal frequency
const DISPLAY_DURATION = 0.01 // 10ms window
const CONTINUOUS_RATE = 10000 // used to render the "continuous" ground truth

function sineAtRate(freq, sampleRate, duration) {
  const N = Math.floor(sampleRate * duration)
  return Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * freq * i / sampleRate))
}

// Reconstruct apparent frequency from aliased samples
function aliasedFreq(trueFreq, sampleRate) {
  // Alias: perceived freq = |f - round(f / fs) * fs|
  const n = Math.round(trueFreq / sampleRate)
  return Math.abs(trueFreq - n * sampleRate)
}

export default function Ch6_Sampling({ onComplete }) {
  const [sampleRate, setSampleRate] = useState(44100)
  const [aliasTriggered, setAliasTriggered] = useState(false)

  const nyquist = sampleRate / 2
  const isAliased = TRUE_FREQ > nyquist
  const perceived = isAliased ? aliasedFreq(TRUE_FREQ, sampleRate) : TRUE_FREQ

  const continuousSamples = useMemo(
    () => sineAtRate(TRUE_FREQ, CONTINUOUS_RATE, DISPLAY_DURATION),
    []
  )
  const sampledPoints = useMemo(
    () => sineAtRate(TRUE_FREQ, sampleRate, DISPLAY_DURATION),
    [sampleRate]
  )
  const reconstructed = useMemo(
    () => sineAtRate(perceived, CONTINUOUS_RATE, DISPLAY_DURATION),
    [perceived]
  )

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
        <WaveformPlot samples={continuousSamples} height={100} color="#60a5fa" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Reconstructed from samples
          {isAliased
            ? <span className="text-red-400 ml-2">⚠ Aliased! Perceived: {perceived.toFixed(1)} Hz</span>
            : <span className="text-green-400 ml-2">✓ Correct: {perceived.toFixed(1)} Hz</span>
          }
        </h3>
        <WaveformPlot samples={reconstructed} height={100} color={isAliased ? '#f87171' : '#34d399'} />
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

- [ ] **Step 2: Verify in browser**

Navigate to Chapter 6. Drag the sample rate slider below 880 Hz. The reconstructed waveform should change colour to red and show an aliased frequency. The Next button should appear once aliasing is triggered.

- [ ] **Step 3: Commit**

```bash
git add src/components/chapters/Ch6_Sampling.jsx
git commit -m "feat: implement Ch6 Nyquist and aliasing demo with interactive sample rate slider"
```

---

## Task 13: Ch7 — 2D DFT (Conceptual)

**Files:**
- Modify: `src/components/chapters/Ch7_2DDFT.jsx`

The 2D DFT is computed by applying the 1D FFT to each row, then each column of a greyscale image, and rendering the log-magnitude spectrum to a canvas element.

- [ ] **Step 1: Implement Ch7_2DDFT.jsx**

```jsx
import { useEffect, useRef, useState } from 'react'
import MathEq from '../shared/MathEq'
import { computeFFT } from '../../hooks/useDFT'

const IMAGE_URL = '/fourier-visualizer/default_image.png'

function getGreyscalePixels(imageData) {
  const { data, width, height } = imageData
  const pixels = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      row.push((data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255)
    }
    pixels.push(row)
  }
  return { pixels, width, height }
}

function compute2DFFT(pixels, width, height) {
  // Step 1: FFT each row
  let intermediate = pixels.map((row) => {
    const { re, im } = computeFFT(row)
    return { re: Array.from(re), im: Array.from(im) }
  })

  // Step 2: FFT each column
  const outRe = Array.from({ length: height }, () => new Float64Array(width))
  const outIm = Array.from({ length: height }, () => new Float64Array(width))

  for (let x = 0; x < width; x++) {
    const colRe = intermediate.map((row) => row.re[x])
    const colIm = intermediate.map((row) => row.im[x])
    const { re, im } = computeFFT(colRe)
    for (let y = 0; y < height; y++) {
      outRe[y][x] = re[y]
      outIm[y][x] = im[y]
    }
  }

  return { outRe, outIm }
}

function renderSpectrum(canvas, outRe, outIm, width, height) {
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(width, height)

  // Log magnitude, shifted so DC is in centre
  let maxLog = 0
  const logMags = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const re = outRe[y][x], im = outIm[y][x]
      const v = Math.log(1 + Math.sqrt(re * re + im * im))
      if (v > maxLog) maxLog = v
      return v
    })
  )

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Shift so DC (zero frequency) is at centre
      const sx = (x + width / 2) % width
      const sy = (y + height / 2) % height
      const brightness = Math.round((logMags[y][x] / maxLog) * 255)
      const i = (sy * width + sx) * 4
      imageData.data[i] = brightness
      imageData.data[i + 1] = brightness
      imageData.data[i + 2] = brightness
      imageData.data[i + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

export default function Ch7_2DDFT({ onComplete }) {
  const originalCanvasRef = useRef(null)
  const spectrumCanvasRef = useRef(null)
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = IMAGE_URL
    img.onload = () => {
      setStatus('computing')

      const offscreen = document.createElement('canvas')
      offscreen.width = img.width
      offscreen.height = img.height
      const offCtx = offscreen.getContext('2d')
      offCtx.drawImage(img, 0, 0)

      // Draw original
      const origCanvas = originalCanvasRef.current
      origCanvas.width = img.width
      origCanvas.height = img.height
      origCanvas.getContext('2d').drawImage(img, 0, 0)

      const imageData = offCtx.getImageData(0, 0, img.width, img.height)
      const { pixels, width, height } = getGreyscalePixels(imageData)

      setTimeout(() => {
        try {
          const { outRe, outIm } = compute2DFFT(pixels, width, height)
          renderSpectrum(spectrumCanvasRef.current, outRe, outIm, width, height)
          setStatus('done')
          onComplete()
        } catch (e) {
          setStatus('error')
        }
      }, 50) // yield to browser to render "Computing..." before heavy work
    }
    img.onerror = () => setStatus('error')
  }, [onComplete])

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-300">
        Images are 2D signals. A greyscale image is a grid of pixel intensities — each row is a 1D signal,
        and so is each column. The <strong className="text-white">2D DFT</strong> applies the 1D DFT to every
        row, then every column:
      </p>
      <MathEq block math="X[k_1, k_2] = \sum_{n_1=0}^{N_1-1} \sum_{n_2=0}^{N_2-1} x[n_1, n_2]\, e^{-i2\pi\left(\frac{k_1 n_1}{N_1} + \frac{k_2 n_2}{N_2}\right)}" />

      {status === 'error' && (
        <p className="text-red-400 text-sm">Could not load default_image.png. Check that the file exists in public/.</p>
      )}
      {status === 'computing' && (
        <p className="text-blue-400 text-sm">Computing 2D FFT…</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Original image</h3>
          <canvas ref={originalCanvasRef} className="w-full rounded border border-gray-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            2D frequency spectrum (log magnitude, DC centred)
          </h3>
          <canvas ref={spectrumCanvasRef} className="w-full rounded border border-gray-700" />
        </div>
      </div>

      {status === 'done' && (
        <div className="flex flex-col gap-3 text-sm text-gray-300">
          <div className="bg-gray-800 rounded-lg p-4">
            <strong className="text-yellow-300">Reading the spectrum:</strong>
            <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
              <li><strong className="text-white">Centre</strong> — DC component (average brightness). Always the brightest point.</li>
              <li><strong className="text-white">Near centre</strong> — low frequencies: smooth gradients, large uniform regions.</li>
              <li><strong className="text-white">Outer edges</strong> — high frequencies: sharp edges, fine texture, noise.</li>
            </ul>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <strong className="text-yellow-300">Connection to 1D DFT:</strong> everything you learned about bins,
            frequency resolution, and orthogonality applies in both the horizontal and vertical directions independently.
            Image compression (JPEG) uses a related transform (DCT) applied to 8×8 pixel blocks using exactly this principle.
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to Chapter 7. Both the original image and its 2D spectrum should render. The spectrum should show a bright DC component at the centre with higher frequencies toward the edges. "Complete!" badge should appear.

- [ ] **Step 3: Commit**

```bash
git add src/components/chapters/Ch7_2DDFT.jsx
git commit -m "feat: implement Ch7 2D DFT with row-column FFT algorithm and log spectrum canvas render"
```

---

## Task 14: Deployment

**Files:**
- Modify: `vite.config.js` (already configured in Task 1)
- Modify: `package.json` (deploy scripts already added in Task 1)

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests PASS (useDFT tests + Wizard tests)

- [ ] **Step 2: Build for production**

```bash
npm run build
```

Expected: `dist/` folder created with no errors.

- [ ] **Step 3: Preview production build locally**

```bash
npm run preview
```

Visit the printed URL. Step through all 7 chapters and verify everything works in the production build.

- [ ] **Step 4: Create GitHub repository**

On GitHub, create a new repository named `fourier-visualizer` (public).

```bash
git remote add origin https://github.com/<your-username>/fourier-visualizer.git
git push -u origin master
```

- [ ] **Step 5: Deploy to GitHub Pages**

```bash
npm run deploy
```

Expected: `gh-pages` branch created and pushed. After ~1 minute, the site is live at `https://<your-username>.github.io/fourier-visualizer/`.

- [ ] **Step 6: Verify live site**

Open the GitHub Pages URL in a browser and confirm all chapters load correctly.

- [ ] **Step 7: Final commit in cs2108 repo**

```bash
cd /home/ubuntu/cs2108
git add fourier-visualizer/
git commit -m "feat: complete Fourier Transform visualizer — all chapters implemented and deployed"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Stepped wizard with unlock logic | Task 6 |
| Ch1: time-domain waveform, frequency slider | Task 7 |
| Ch2: additive synthesis, play audio | Task 8 |
| Ch3: Fourier Series → FT, orthogonality, complex numbers, Euler | Task 9 |
| Ch4: DFT, audio upload/default, discrete/continuous duality table | Task 10 |
| Ch5: N slider, bin spacing formula, spectral leakage, misconception | Task 11 |
| Ch6: Nyquist, aliasing demo | Task 12 |
| Ch7: 2D DFT, log spectrum, conceptual only | Task 13 |
| Deployment to GitHub Pages | Task 14 |
| Tests: useDFT unit tests | Task 2 |
| Tests: Wizard unlock logic | Task 6 |
| KaTeX math equations | Tasks 7–13 |
| Recharts plots | Tasks 5, 7–12 |
| Web Audio API | Tasks 3, 8, 10 |
| Default audio + image assets | Task 1 |

All spec requirements covered. No gaps found.
