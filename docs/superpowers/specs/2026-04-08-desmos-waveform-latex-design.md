# Design: Desmos Waveform Plots + LaTeX Fix

**Date:** 2026-04-08

---

## Problem

Two bugs in the Fourier Visualizer:

1. **Waveform graphs break at high frequencies.** `WaveformPlot` generates a fixed-size sample array (1000 Hz sample rate, 0.02–0.04 s window). At ~500 Hz input, only 2 samples per cycle are generated — hitting the Nyquist limit of the render buffer, not the signal. Recharts draws a straight line instead of a sine wave.

2. **LaTeX not rendering.** `react-katex@3.1.0` is incompatible with React 19, causing math equations to fail silently or render as raw strings.

---

## Scope

- Replace `WaveformPlot` with a Desmos-based component **only for chapters that display pure sine-wave expressions** (Ch1, Ch2, Ch3, Ch6).
- `Ch4_DFT.jsx` shows raw decoded audio data — keep recharts there.
- `SpectrumPlot` (bar chart of DFT bins) — unchanged.
- Fix `MathEq.jsx` to call `katex` directly; remove `react-katex`.

---

## Architecture

### 1. Load Desmos API

Add to `fourier-visualizer/index.html` `<head>`:

```html
<script src="https://www.desmos.com/api/v1.10/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda5"></script>
```

This is the Desmos demo API key, suitable for non-commercial educational use.

### 2. New `DesmosPlot.jsx` component

**Location:** `fourier-visualizer/src/components/shared/DesmosPlot.jsx`

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `lines` | `Array<{ latex: string, color?: string }>` | One entry per curve. `latex` is a Desmos expression like `y=A\sin(2\pi f t)`. |
| `variables` | `Record<string, number>` | Variable bindings, e.g. `{ A: 1.0, f: 220 }`. Updated on each render. |
| `xDomain` | `[number, number]` | Visible x range, e.g. `[0, 0.02]`. |
| `yDomain` | `[number, number]` | Visible y range, e.g. `[-1.5, 1.5]`. |
| `height` | `number` | Container height in px (default 200). |

**Behaviour:**

- On mount: create `Desmos.GraphingCalculator(containerRef.current, { ...minimalUI })` with all chrome disabled (`keypad: false, expressions: false, settingsMenu: false, zoomButtons: false, expressionsTopbar: false, border: false, lockViewport: true`).
- Set `calculator.setMathBounds({ left, right, bottom, top })` from props.
- Set each variable as its own expression: `calculator.setExpression({ id: 'f', latex: 'f=220' })`.
- Set each curve: `calculator.setExpression({ id: 'line0', latex: 'y=...', color: '...' })`.
- On variable prop change (`useEffect` on `variables`): call `setExpression` for each changed variable.
- On unmount: call `calculator.destroy()`.

### 3. Chapter refactoring

Each chapter component removes its `generateSine` function and sample arrays, and instead passes math expressions and current slider values directly.

**Ch1_Signal:** Single curve `y=A\sin(2\pi f t)`, variables `{ A: amplitude, f: frequency }`, xDomain `[0, 0.02]`.

**Ch2_Sinusoids:** Three individual `DesmosPlot` instances (one per oscillator, variables `{ A: osc.amplitude, f: osc.frequency }`), plus one combined-wave plot with expression `y=A_1\sin(2\pi f_1 t)+A_2\sin(2\pi f_2 t)+A_3\sin(2\pi f_3 t)` and all six variables bound.

**Ch3_FourierSeries (section 1 — orthogonality):**
- Wave 1: `y=\sin(2\pi f_1 t)`, variable `{ f1: freq1 }`
- Wave 2: `y=\sin(2\pi f_2 t)`, variable `{ f2: freq2 }`
- Product: `y=\sin(2\pi f_1 t)\cdot\sin(2\pi f_2 t)`, variables `{ f1: freq1, f2: freq2 }`
- The `innerProduct` numeric value is still computed in JS (it's a number displayed in text, not a graph).

**Ch3_FourierSeries (section 4 — correlation):**
- `y=\sin(2\pi \cdot \omega_\text{scaled} \cdot t)` where `omega_scaled = omega * 50`, variable `{ omegaScaled: omega * 50 }`.

**Ch6_Sampling:**
- True signal: `y=\sin(2\pi \cdot 440 \cdot t)` (static, no variables needed)
- Reconstructed: `y=\sin(2\pi \cdot f_p \cdot t)`, variable `{ fp: perceived }`

### 4. MathEq fix

Replace `react-katex` usage in `MathEq.jsx` with a direct call to `katex.renderToString()`:

```jsx
import katex from 'katex'

export default function MathEq({ math, block = false }) {
  const html = katex.renderToString(math, { throwOnError: false, displayMode: block })
  if (block) {
    return <div className="my-4 overflow-x-auto text-center" dangerouslySetInnerHTML={{ __html: html }} />
  }
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}
```

Remove `react-katex` from `package.json` dependencies.

---

## Files Changed

| File | Change |
|------|--------|
| `fourier-visualizer/index.html` | Add Desmos CDN `<script>` tag |
| `fourier-visualizer/src/components/shared/DesmosPlot.jsx` | New file |
| `fourier-visualizer/src/components/shared/MathEq.jsx` | Rewrite to use `katex` directly |
| `fourier-visualizer/src/components/chapters/Ch1_Signal.jsx` | Replace WaveformPlot → DesmosPlot |
| `fourier-visualizer/src/components/chapters/Ch2_Sinusoids.jsx` | Replace WaveformPlot → DesmosPlot |
| `fourier-visualizer/src/components/chapters/Ch3_FourierSeries.jsx` | Replace WaveformPlot → DesmosPlot |
| `fourier-visualizer/src/components/chapters/Ch6_Sampling.jsx` | Replace WaveformPlot → DesmosPlot |
| `fourier-visualizer/package.json` | Remove `react-katex` |

`WaveformPlot.jsx` stays — still used by Ch4.

---

## Out of Scope

- `SpectrumPlot` — DFT bar charts are discrete data, not sine waves; recharts is correct here.
- `Ch4_DFT.jsx` waveform — raw decoded audio, not a mathematical expression.
- Any other recharts usage.
