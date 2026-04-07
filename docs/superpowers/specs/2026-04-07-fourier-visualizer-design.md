# Fourier Transform Visualizer — Design Spec
**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

A React + Vite single-page application deployed to GitHub Pages. It teaches Fourier Transform concepts to computing undergrad students (with linear algebra background, no prior signal processing) via a stepped wizard. Each chapter focuses on one concept, requires a meaningful interaction to unlock the next, and uses interactive sliders, plots, math equations, and audio playback throughout.

The pedagogical arc is:
1. Build intuition with synthetic signals the user constructs and hears
2. Introduce continuous FT theory (Fourier Series → FT)
3. Apply DFT to a real audio file the user uploads or selects
4. Drill into frequency bin nuances
5. Explain sampling in context of DFT
6. Briefly extend to 2D (images)

---

## Target Audience

Computing undergrad students with:
- Solid programming background
- Linear algebra (vectors, inner products, orthogonality)
- No prior signal processing or media computing exposure

---

## Chapter Structure

### Chapter 1 — What is a Signal?
- Display the time-domain waveform of a short synthetic sine wave
- Introduce: amplitude, time axis, period
- Sliders: frequency, amplitude
- Unlock condition: user adjusts frequency slider and observes period change

### Chapter 2 — Frequencies and Sinusoids
- Additive synthesis: user adds up to 3 sinusoids (each with frequency + amplitude sliders)
- Combined waveform displayed in real time
- **Play button**: user hears the synthesized sound via Web Audio API
- Unlock condition: user plays the synthesized audio at least once
- Key point: frequency is a mathematical property, not just "pitch"

### Chapter 3 — From Fourier Series to the Fourier Transform
**3a — Fourier Series**
- Use the synthetic signal from Ch2 as the running example
- Explain: periodic signals can be expressed as a discrete sum of harmonically related sinusoids
- Show KaTeX formula for Fourier Series coefficients
- Key point: periodicity assumption → discrete frequency coefficients

**3b — Orthogonality**
- Sin/cos at different frequencies are orthogonal functions: their inner product (integral of product) = 0
- Explicitly connect to linear algebra: this is like orthogonal basis vectors — you can project a signal onto each frequency independently
- Interactive: display two sinusoids, animate their product and show the integral → 0
- Misconception cleared: "decomposition is unique because the basis functions are orthogonal"

**3c — Why Complex Numbers?**
- The real part of the FT = correlation with cosine (even component)
- The imaginary part = correlation with sine (odd component)
- This is not a mathematical trick — it encodes both amplitude AND phase
- KaTeX: show how real and imaginary parts relate to magnitude and phase angle

**3d — Euler's Formula**
- e^(iωt) = cos(ωt) + i·sin(ωt)
- Compact unified notation for the rotating vector
- Slider: vary ω, visualize the rotating phasor on a unit circle

**3e — The Leap to the Fourier Transform**
- What if the signal is not periodic? Let period T → ∞
- Discrete sum → continuous integral: the Fourier Transform falls out naturally
- KaTeX: show the FT formula
- Key point: FT output is a continuous spectrum (not discrete spikes)
- Slider: vary ω, watch the correlation with the synthetic signal update live
- Unlock condition: user interacts with the ω slider

### Chapter 4 — Discrete Fourier Transform
- **Audio selection happens here**: upload own file OR use default (default_audio.mp3)
- Transition from synthetic → real: motivate why we need a discrete version
- Show the discrete/continuous duality table:

| Domain | Time | Frequency |
|--------|------|-----------|
| Fourier Series | Continuous, Periodic | Discrete |
| Fourier Transform | Continuous, Aperiodic | Continuous |
| DFT | Discrete, (Periodic assumed) | Discrete |

- KaTeX: DFT formula
- Plot: magnitude spectrum of the uploaded/default audio
- Misconception cleared: "DFT assumes the signal repeats" — spectral leakage preview
- Unlock condition: audio file selected (upload or default)

### Chapter 5 — Frequency Bins in Depth
- Bin resolution = f_s / N (not f_s)
- What N actually controls: frequency resolution, not max frequency
- Max frequency = f_s / 2 (Nyquist — teased here, explained fully in Ch6)
- Misconception cleared: "more samples = higher max frequency" — actually gives finer resolution
- Interactive: slider for N (window size, powers of 2: 256 → 8192)
  - Watch bin spacing change on the spectrum plot of the real audio
  - Annotate individual bins with their Hz values
- Spectral leakage: what happens when a frequency falls between bins
- Unlock condition: user changes N at least once

### Chapter 6 — Sampling & the Nyquist Theorem
- Now that DFT is understood: why do we sample at a particular rate?
- Nyquist theorem: f_s must be ≥ 2 * f_max to avoid aliasing
- Interactive aliasing demo: slider for f_s, show what happens when f_s < 2 * f_max on a simple sinusoid
- Show the actual audio's spectrum with the Nyquist frequency marked
- Unlock condition: user triggers aliasing by setting f_s too low

### Chapter 7 — 2D DFT (Conceptual)
- Extend: rows and columns of an image are each 1D signals
- Show the 2D frequency spectrum of default_image.png
- Low frequencies = smooth regions, high frequencies = edges/detail
- Brief — no upload, no interactive controls
- Connects back: "everything you just learned about 1D DFT applies in both dimensions"

---

## Technical Architecture

### Stack
| Concern | Library |
|---------|---------|
| Framework | React 18 + Vite |
| Routing / state | React useState/useContext (no router needed — single page) |
| Charts | Recharts |
| Math equations | KaTeX (via react-katex) |
| Audio playback + synthesis | Web Audio API |
| Styling | Tailwind CSS |
| Deployment | GitHub Pages via gh-pages |
| Tests | Vitest + React Testing Library |

### File Structure
```
src/
  components/
    Wizard.jsx              # progress bar, chapter nav, unlock logic
    chapters/
      Ch1_Signal.jsx
      Ch2_Sinusoids.jsx
      Ch3_FourierSeries.jsx
      Ch4_DFT.jsx           # audio upload/select lives here
      Ch5_FreqBins.jsx
      Ch6_Sampling.jsx
      Ch7_2DDFT.jsx
    shared/
      WaveformPlot.jsx      # Recharts wrapper for time-domain
      SpectrumPlot.jsx      # Recharts wrapper for frequency-domain
      MathEq.jsx            # react-katex wrapper
      AudioPlayer.jsx       # play/stop for Web Audio output
      Slider.jsx            # labeled range input with value display
  hooks/
    useAudio.js             # Web Audio API context, analyser, synthesis
    useDFT.js               # FFT implementation (Cooley-Tukey, N = power of 2)
  assets/
    default_audio.mp3
    default_image.png
```

### Wizard Unlock Logic
- Top-level `chapterStatus[]` array in Wizard state: each entry is `{ unlocked: boolean, completed: boolean }`
- Each chapter receives an `onComplete()` callback; calls it when the unlock condition is met
- Back navigation always enabled; forward navigation only to unlocked chapters

### DFT Implementation
- `useDFT.js` implements Cooley-Tukey FFT in JS
- Used for: interactive bin demos, annotated spectrum, leakage visualization
- Web Audio `AnalyserNode` used only for real-time playback visualization (Ch2 synth, Ch4 audio)
- Rationale: custom FFT gives full control over N and bin annotation; AnalyserNode is limited

---

## Error Handling

| Boundary | Handling |
|----------|----------|
| Audio upload | Validate `audio/*` MIME type and file size (<10MB); inline error message |
| Web Audio API unsupported | Check on mount; show graceful "your browser doesn't support audio playback" fallback |
| FFT input | N always constrained to powers of 2 via slider; no invalid input possible |
| Image (Ch7) | Bundled asset — no upload, no runtime error risk |

---

## Testing

- **Unit tests (Vitest):** `useDFT.js` — verify FFT magnitude output matches known values for pure sinusoids (e.g., single 440 Hz tone → peak at correct bin)
- **Component tests (React Testing Library):** Wizard unlock logic — simulate `onComplete()` calls and assert chapter state transitions
- **No tests** on pure visualization components (Recharts wrappers, KaTeX wrapper)

---

## Deployment

- `vite.config.js` sets `base` to the GitHub repo name for correct asset paths
- `gh-pages` package script: `npm run deploy` builds and pushes to `gh-pages` branch
- No backend, no environment variables, fully static

---

## Out of Scope
- Mobile optimization (desktop-first)
- User accounts or saved progress
- Image upload for 2D DFT
- Audio recording from microphone
