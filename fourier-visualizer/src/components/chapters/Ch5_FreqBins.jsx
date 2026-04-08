import { useState, useCallback } from 'react'
import Slider from '../shared/Slider'
import MathEq from '../shared/MathEq'
import PythonBlock from '../shared/PythonBlock'

const SECTIONS = [
  'Bin Smearing',
  'Frequency Resolution',
  'Time–Frequency Trade-off',
]

const fmtN = (exp) => `2^${exp} = ${Math.pow(2, exp)}`

// ── Code generators ────────────────────────────────────────────────────────

function codeSmearing(N, fSignal) {
  return `import numpy as np
import matplotlib.pyplot as plt
plt.style.use('dark_background')

sr = 1000
N = ${N}
f_signal = ${fSignal}

t = np.arange(N) / sr
signal = np.sin(2 * np.pi * f_signal * t)

freqs = np.fft.rfftfreq(N, 1 / sr)
mags = np.abs(np.fft.rfft(signal)) * 2 / N
bin_spacing = sr / N

fig, axes = plt.subplots(1, 2, figsize=(10, 4))

axes[0].plot(t * 1000, signal, color='#60a5fa')
axes[0].set(xlabel='Time (ms)', ylabel='Amplitude',
            title=f'Signal: {f_signal} Hz sine wave')
axes[0].grid(alpha=0.3)

axes[1].bar(freqs, mags, width=bin_spacing * 0.8, color='#60a5fa', alpha=0.8)
axes[1].axvline(f_signal, color='#f87171', ls='--', lw=1.5,
                label=f'True freq: {f_signal} Hz')
for b in freqs[:12]:
    axes[1].axvline(b, color='#374151', ls=':', lw=0.8)
axes[1].set(xlabel='Frequency (Hz)', ylabel='Magnitude',
            title=f'DFT Spectrum  (N={N}, bin spacing = {bin_spacing:.2f} Hz)')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
plt.show()

nearest_bin = round(f_signal / bin_spacing) * bin_spacing
offset = abs(f_signal - nearest_bin)
print(f"N = {N}  →  bin spacing = {bin_spacing:.3f} Hz")
print(f"Signal at {f_signal} Hz, nearest bin at {nearest_bin:.2f} Hz (offset = {offset:.2f} Hz)")
if offset < 1e-6:
    print("Signal lands exactly on a bin — clean single spike!")
else:
    print("Signal is between bins — energy leaks to neighbours (spectral leakage).")
`
}

function codeResolution(nSmall, nLarge) {
  const bsSmall = (1000 / nSmall).toFixed(2)
  const bsLarge = (1000 / nLarge).toFixed(3)
  const resolveSmall = 1000 / nSmall < 15 ? 'can' : 'cannot'
  const resolveLarge = 1000 / nLarge < 15 ? 'can' : 'cannot'
  return `import numpy as np
import matplotlib.pyplot as plt
plt.style.use('dark_background')

sr = 1000
f1, f2 = 100, 115   # two tones 15 Hz apart
N_small = ${nSmall}
N_large = ${nLarge}

fig, axes = plt.subplots(2, 1, figsize=(10, 7))

for ax, N, label in zip(
    axes,
    [N_small, N_large],
    ['N = ${nSmall}  →  bin spacing = ${bsSmall} Hz  (${resolveSmall} resolve 15 Hz gap)',
     'N = ${nLarge}  →  bin spacing = ${bsLarge} Hz  (${resolveLarge} resolve 15 Hz gap)'],
):
    t = np.arange(N) / sr
    signal = np.sin(2 * np.pi * f1 * t) + np.sin(2 * np.pi * f2 * t)
    freqs = np.fft.rfftfreq(N, 1 / sr)
    mags = np.abs(np.fft.rfft(signal)) * 2 / N

    ax.bar(freqs, mags, width=sr / N * 0.8, color='#60a5fa', alpha=0.8)
    ax.axvline(f1, color='#f87171', ls='--', lw=1.5, label=f'{f1} Hz')
    ax.axvline(f2, color='#34d399', ls='--', lw=1.5, label=f'{f2} Hz')
    ax.set(xlim=[60, 160], xlabel='Frequency (Hz)', ylabel='Magnitude',
           title=label)
    ax.legend()
    ax.grid(alpha=0.3)

plt.tight_layout()
plt.show()
print(f"N=${nSmall}: bin spacing = ${bsSmall} Hz  → ${resolveSmall} resolve 15 Hz gap")
print(f"N=${nLarge}: bin spacing = ${bsLarge} Hz  → ${resolveLarge} resolve 15 Hz gap")
`
}

function codeTradeoff(nSmall, nLarge) {
  return `import numpy as np
import matplotlib.pyplot as plt
plt.style.use('dark_background')

sr = 1000
total = sr       # 1 second of samples
t_full = np.arange(total) / sr

# Signal switches from 100 Hz to 300 Hz halfway through
half = total // 2
signal = np.concatenate([
    np.sin(2 * np.pi * 100 * t_full[:half]),
    np.sin(2 * np.pi * 300 * t_full[half:]),
])

N_large = ${nLarge}
N_small = ${nSmall}

fig, axes = plt.subplots(3, 1, figsize=(10, 9))

axes[0].plot(t_full, signal, color='#60a5fa', lw=0.6)
axes[0].set(xlabel='Time (s)', ylabel='Amplitude',
            title='Signal: 100 Hz for first half, 300 Hz for second half')
axes[0].grid(alpha=0.3)

for ax, N, color in [
    (axes[1], N_large, '#f472b6'),
    (axes[2], N_small, '#a78bfa'),
]:
    seg = signal[:N]
    freqs = np.fft.rfftfreq(N, 1 / sr)
    mags = np.abs(np.fft.rfft(seg)) * 2 / N
    ax.bar(freqs, mags, width=sr / N * 0.8, color=color, alpha=0.8)
    ax.axvline(100, color='#f87171', ls='--', lw=1.5, label='100 Hz')
    ax.axvline(300, color='#34d399', ls='--', lw=1.5, label='300 Hz')
    ax.set(xlim=[0, 500], xlabel='Frequency (Hz)', ylabel='Magnitude',
           title=(f'N={N}: bin spacing = {sr/N:.1f} Hz, '
                  f'window = {N/sr*1000:.0f} ms'))
    ax.legend()
    ax.grid(alpha=0.3)

plt.tight_layout()
plt.show()
print(f"N={N_large}: {sr/N_large:.2f} Hz/bin, window = {N_large/sr*1000:.0f} ms  → fine freq, blurry timing")
print(f"N={N_small}: {sr/N_small:.1f} Hz/bin, window = {N_small/sr*1000:.0f} ms   → coarse freq, sharp timing")
`
}

// ── Component ──────────────────────────────────────────────────────────────

export default function Ch5_FreqBins({ onComplete }) {
  const [section, setSection] = useState(0)
  const [ranSections, setRanSections] = useState(new Set())

  // Section 0 — Bin Smearing
  const [s0Exp, setS0Exp] = useState(6)       // N = 2^6 = 64
  const [s0Freq, setS0Freq] = useState(55)    // signal frequency (Hz)

  // Section 1 — Frequency Resolution
  const [s1SmExp, setS1SmExp] = useState(6)   // N_small = 64
  const [s1LgExp, setS1LgExp] = useState(9)   // N_large = 512

  // Section 2 — Time–Frequency Trade-off
  const [s2SmExp, setS2SmExp] = useState(5)   // N_small = 32
  const [s2LgExp, setS2LgExp] = useState(9)   // N_large = 512

  const unmark = useCallback((sec) => {
    setRanSections((prev) => {
      const next = new Set(prev)
      next.delete(sec)
      return next
    })
  }, [])

  const markRan = () =>
    setRanSections((prev) => new Set([...prev, section]))

  const canAdvance = ranSections.has(section)

  const advance = () => {
    if (section < SECTIONS.length - 1) setSection((s) => s + 1)
    else onComplete()
  }

  // Slider change helpers — update value and invalidate the section gate
  const s0ExpChange  = (v) => { setS0Exp(v);  unmark(0) }
  const s0FreqChange = (v) => { setS0Freq(v); unmark(0) }
  const s1SmChange   = (v) => { setS1SmExp(v); unmark(1) }
  const s1LgChange   = (v) => { setS1LgExp(v); unmark(1) }
  const s2SmChange   = (v) => { setS2SmExp(v); unmark(2) }
  const s2LgChange   = (v) => { setS2LgExp(v); unmark(2) }

  const s0N = Math.pow(2, s0Exp)
  const s1Sm = Math.pow(2, s1SmExp)
  const s1Lg = Math.pow(2, s1LgExp)
  const s2Sm = Math.pow(2, s2SmExp)
  const s2Lg = Math.pow(2, s2LgExp)

  return (
    <div className="flex flex-col gap-6">
      {/* Section pills */}
      <div className="flex flex-wrap gap-2 text-xs">
        {SECTIONS.map((s, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded-full ${
              i === section
                ? 'bg-blue-600 text-white'
                : i < section
                ? 'bg-green-800 text-green-200'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {s}
          </span>
        ))}
      </div>

      {/* ── Section 0: Bin Smearing ───────────────────────────────────────── */}
      {section === 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Bin Smearing (Spectral Leakage)</h3>
          <p className="text-gray-300">
            The DFT samples the spectrum at discrete <strong className="text-white">frequency bins</strong>{' '}
            spaced <MathEq math="\Delta f = f_s / N" /> Hz apart. Frequencies that fall{' '}
            <em>between</em> bins can't be represented exactly — their energy{' '}
            <strong className="text-white">leaks</strong> into neighbouring bins, smearing the peak.
          </p>
          <MathEq block math="\Delta f = \frac{f_s}{N}" />
          <p className="text-gray-400 text-sm">
            Adjust the sliders and re-run. Notice how bin spacing changes with N, and how leakage
            disappears when the signal frequency lands exactly on a bin.
          </p>
          <div className="flex flex-col gap-3 bg-gray-800 rounded-lg p-4">
            <Slider
              label="Window size N"
              min={5} max={9} step={1}
              value={s0Exp}
              onChange={s0ExpChange}
              formatValue={fmtN}
            />
            <Slider
              label="Signal frequency"
              min={10} max={200} step={5}
              value={s0Freq}
              onChange={s0FreqChange}
              unit="Hz"
            />
            <p className="text-xs text-gray-500 font-mono">
              Bin spacing: {(1000 / s0N).toFixed(2)} Hz &nbsp;|&nbsp;
              Nearest bin: {(Math.round(s0Freq / (1000 / s0N)) * (1000 / s0N)).toFixed(2)} Hz
            </p>
          </div>
          <PythonBlock code={codeSmearing(s0N, s0Freq)} onRun={markRan} />
          {!canAdvance && (
            <p className="text-blue-400 text-sm italic">Run the code above to continue.</p>
          )}
        </div>
      )}

      {/* ── Section 1: Frequency Resolution ──────────────────────────────── */}
      {section === 1 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Frequency Resolution</h3>
          <p className="text-gray-300">
            Bin spacing <MathEq math="\Delta f = f_s / N" /> sets the minimum distance between
            two tones that can be told apart. If two frequencies are closer than{' '}
            <MathEq math="\Delta f" />, they merge into one peak.
          </p>
          <ul className="list-disc list-inside text-gray-300 text-sm flex flex-col gap-1 ml-2">
            <li><strong className="text-white">Larger N</strong> → smaller bins → closer tones resolved</li>
            <li><strong className="text-white">Smaller N</strong> → wider bins → nearby tones merge</li>
          </ul>
          <p className="text-gray-400 text-sm">
            Two tones at 100 Hz and 115 Hz (15 Hz gap) are plotted. Use the sliders to find
            the crossover where the smaller window can no longer separate them.
          </p>
          <div className="flex flex-col gap-3 bg-gray-800 rounded-lg p-4">
            <Slider
              label="Small window N (top plot)"
              min={5} max={8} step={1}
              value={s1SmExp}
              onChange={s1SmChange}
              formatValue={fmtN}
            />
            <Slider
              label="Large window N (bottom plot)"
              min={7} max={10} step={1}
              value={s1LgExp}
              onChange={s1LgChange}
              formatValue={fmtN}
            />
            <p className="text-xs text-gray-500 font-mono">
              Small bin spacing: {(1000 / s1Sm).toFixed(2)} Hz &nbsp;|&nbsp;
              Large bin spacing: {(1000 / s1Lg).toFixed(3)} Hz &nbsp;|&nbsp;
              Tone gap: 15 Hz
            </p>
          </div>
          <PythonBlock code={codeResolution(s1Sm, s1Lg)} onRun={markRan} />
          {!canAdvance && (
            <p className="text-blue-400 text-sm italic">Run the code above to continue.</p>
          )}
        </div>
      )}

      {/* ── Section 2: Time–Frequency Trade-off ──────────────────────────── */}
      {section === 2 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Time–Frequency Trade-off</h3>
          <p className="text-gray-300">
            Better frequency resolution requires a <em>longer</em> time window. But a longer
            window smears over more time — you lose the ability to pinpoint <em>when</em> a
            change happened. This is the{' '}
            <strong className="text-white">time–frequency uncertainty principle</strong>:
          </p>
          <MathEq block math="\Delta t \cdot \Delta f \geq \text{const}" />
          <p className="text-gray-400 text-sm">
            The signal below switches from 100 Hz to 300 Hz halfway through. Try making the
            large window very large and the small window very small to see the extremes.
          </p>
          <div className="flex flex-col gap-3 bg-gray-800 rounded-lg p-4">
            <Slider
              label="Large window N (middle plot)"
              min={7} max={10} step={1}
              value={s2LgExp}
              onChange={s2LgChange}
              formatValue={fmtN}
            />
            <Slider
              label="Small window N (bottom plot)"
              min={3} max={7} step={1}
              value={s2SmExp}
              onChange={s2SmChange}
              formatValue={fmtN}
            />
            <p className="text-xs text-gray-500 font-mono">
              Large window: {(s2Lg / 1000 * 1000).toFixed(0)} ms, {(1000 / s2Lg).toFixed(2)} Hz/bin &nbsp;|&nbsp;
              Small window: {(s2Sm / 1000 * 1000).toFixed(0)} ms, {(1000 / s2Sm).toFixed(1)} Hz/bin
            </p>
          </div>
          <PythonBlock code={codeTradeoff(s2Sm, s2Lg)} onRun={markRan} />
          {!canAdvance && (
            <p className="text-blue-400 text-sm italic">Run the code above to continue.</p>
          )}
        </div>
      )}

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
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
          disabled={!canAdvance}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {section < SECTIONS.length - 1 ? 'Next section →' : 'I understand — continue ✓'}
        </button>
      </div>
    </div>
  )
}
