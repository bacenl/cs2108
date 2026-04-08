# Progress Log

## 2026-04-08 — Desmos Waveform Plots + LaTeX Fix

### Problem
1. Sine waveform plots broke at ~500 Hz: recharts rendered discrete sample arrays, and at high frequencies (hitting the Nyquist limit of the 1000 Hz render buffer) the sine shape degenerated into a straight line.
2. LaTeX equations not rendering: `react-katex@3.1.0` is incompatible with React 19.

### Solution
- Replaced recharts `WaveformPlot` with a new `DesmosPlot` component in Ch1, Ch2, Ch3, Ch6. Desmos renders math expressions continuously — no sample arrays, no aliasing.
- Rewrote `MathEq` to call `katex.renderToString()` directly; removed `react-katex` dependency.
- Ch4 (raw audio waveform) and `SpectrumPlot` (DFT bar chart) keep recharts — they show discrete data, not mathematical sine expressions.

### Lessons
- Recharts/canvas-based charting is fundamentally unsuitable for high-frequency sine wave visualization: discrete sample arrays alias at Nyquist regardless of pixel density. Expression-based renderers (Desmos, function plotters) are the right tool for continuous math functions.
- `react-katex` wraps `katex` without adding value; using `katex.renderToString` + `dangerouslySetInnerHTML` directly is simpler, more reliable across React versions, and one fewer dependency.
- When a Desmos plot changes a `lines` prop (e.g., colour based on state), the calculator must be remounted via React `key` since `lines` are only read on mount.
