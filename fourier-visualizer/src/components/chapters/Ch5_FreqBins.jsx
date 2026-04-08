import { useState } from 'react'
import MathEq from '../shared/MathEq'
import PythonBlock from '../shared/PythonBlock'

const SECTIONS = [
  'Bin Smearing',
  'Frequency Resolution',
  'Time–Frequency Trade-off',
]

const CODE_SMEARING = `import numpy as np
import matplotlib.pyplot as plt
plt.style.use('dark_background')

sr = 1000
N = 64
t = np.arange(N) / sr

# Bin spacing = sr / N = 15.625 Hz
# Bins land at 0, 15.625, 31.25, 46.875, 62.5, ...
# 55.5 Hz falls BETWEEN bins — energy spreads to neighbours
f_signal = 55.5
signal = np.sin(2 * np.pi * f_signal * t)

freqs = np.fft.rfftfreq(N, 1 / sr)
mags = np.abs(np.fft.rfft(signal)) * 2 / N

fig, axes = plt.subplots(1, 2, figsize=(10, 4))

axes[0].plot(t * 1000, signal, color='#60a5fa')
axes[0].set(xlabel='Time (ms)', ylabel='Amplitude',
            title=f'Signal: {f_signal} Hz sine wave')
axes[0].grid(alpha=0.3)

axes[1].bar(freqs, mags, width=sr / N * 0.8, color='#60a5fa', alpha=0.8)
axes[1].axvline(f_signal, color='#f87171', ls='--', lw=1.5,
                label=f'True freq: {f_signal} Hz')
for b in freqs[:8]:
    axes[1].axvline(b, color='#374151', ls=':', lw=0.8)
axes[1].set(xlabel='Frequency (Hz)', ylabel='Magnitude',
            title=f'DFT Spectrum  (N={N}, bin spacing = {sr/N:.2f} Hz)')
axes[1].legend()
axes[1].grid(alpha=0.3)

plt.tight_layout()
plt.show()
print(f"Bin spacing: {sr/N:.3f} Hz")
print(f"{f_signal} Hz does NOT land on a bin — energy leaks to neighbours.")
`

const CODE_RESOLUTION = `import numpy as np
import matplotlib.pyplot as plt
plt.style.use('dark_background')

sr = 1000
f1, f2 = 100, 115   # Two tones only 15 Hz apart

fig, axes = plt.subplots(2, 1, figsize=(10, 7))

for ax, N, label in zip(
    axes,
    [64, 512],
    ['Small N = 64  →  poor resolution', 'Large N = 512  →  fine resolution'],
):
    t = np.arange(N) / sr
    signal = np.sin(2 * np.pi * f1 * t) + np.sin(2 * np.pi * f2 * t)
    freqs = np.fft.rfftfreq(N, 1 / sr)
    mags = np.abs(np.fft.rfft(signal)) * 2 / N

    ax.bar(freqs, mags, width=sr / N * 0.8, color='#60a5fa', alpha=0.8)
    ax.axvline(f1, color='#f87171', ls='--', lw=1.5, label=f'{f1} Hz')
    ax.axvline(f2, color='#34d399', ls='--', lw=1.5, label=f'{f2} Hz')
    ax.set(xlim=[60, 160], xlabel='Frequency (Hz)', ylabel='Magnitude',
           title=f'{label}  —  bin spacing = {sr/N:.2f} Hz')
    ax.legend()
    ax.grid(alpha=0.3)

plt.tight_layout()
plt.show()
print(f"N=64:  bin spacing = {sr/64:.2f} Hz  — 100 Hz and 115 Hz merge into one blob")
print(f"N=512: bin spacing = {sr/512:.3f} Hz — both peaks clearly resolved")
`

const CODE_TRADEOFF = `import numpy as np
import matplotlib.pyplot as plt
plt.style.use('dark_background')

sr = 1000
total = sr  # 1 second
t_full = np.arange(total) / sr

# Signal changes from 100 Hz to 300 Hz halfway through
half = total // 2
signal = np.concatenate([
    np.sin(2 * np.pi * 100 * t_full[:half]),
    np.sin(2 * np.pi * 300 * t_full[half:]),
])

fig, axes = plt.subplots(3, 1, figsize=(10, 9))

axes[0].plot(t_full, signal, color='#60a5fa', lw=0.6)
axes[0].set(xlabel='Time (s)', ylabel='Amplitude',
            title='Signal: 100 Hz for 0–0.5 s, then 300 Hz for 0.5–1 s')
axes[0].grid(alpha=0.3)

for ax, N, color, seg in [
    (axes[1], 512, '#f472b6', signal[:512]),
    (axes[2], 32,  '#a78bfa', signal[:32]),
]:
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
print(f"N=512: excellent frequency resolution ({sr/512:.2f} Hz/bin), but window is {512/sr*1000:.0f} ms wide")
print(f"N=32:  poor frequency resolution ({sr/32:.2f} Hz/bin), but window is only {32/sr*1000:.0f} ms")
print("You cannot have both perfect time AND frequency resolution simultaneously.")
`

export default function Ch5_FreqBins({ onComplete }) {
  const [section, setSection] = useState(0)
  const [ranSections, setRanSections] = useState(new Set())

  const markRan = () => setRanSections((prev) => new Set([...prev, section]))

  const canAdvance = ranSections.has(section)

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

      {section === 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Bin Smearing (Spectral Leakage)</h3>
          <p className="text-gray-300">
            The DFT doesn't measure every possible frequency — it samples the spectrum at discrete
            <strong className="text-white"> frequency bins</strong> spaced{' '}
            <MathEq math="\Delta f = f_s / N" /> Hz apart. Frequencies that fall{' '}
            <em>between</em> bins can't be represented exactly, so their energy{' '}
            <strong className="text-white">leaks</strong> into neighbouring bins, smearing the spectrum.
          </p>
          <MathEq block math="\Delta f = \frac{f_s}{N}" />
          <p className="text-gray-400 text-sm">
            Run the code below. The red dashed line shows where the true frequency is — notice
            how the energy spreads across several bins instead of landing on one spike.
          </p>
          <PythonBlock code={CODE_SMEARING} onRun={markRan} />
          {!canAdvance && (
            <p className="text-blue-400 text-sm italic">Run the code above to continue.</p>
          )}
        </div>
      )}

      {section === 1 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Frequency Resolution</h3>
          <p className="text-gray-300">
            The bin spacing <MathEq math="\Delta f = f_s / N" /> determines how close two
            frequencies can be and still appear as separate peaks. If two tones are closer together
            than <MathEq math="\Delta f" />, the DFT cannot distinguish them.
          </p>
          <ul className="list-disc list-inside text-gray-300 text-sm flex flex-col gap-1 ml-2">
            <li>
              <strong className="text-white">More samples (larger N)</strong> → smaller bin spacing
              → finer frequency resolution
            </li>
            <li>
              <strong className="text-white">Fewer samples (smaller N)</strong> → wider bins →
              nearby tones merge into one blob
            </li>
          </ul>
          <p className="text-gray-400 text-sm">
            The code plots two tones 15 Hz apart under a small and a large window. See when they
            become distinguishable.
          </p>
          <PythonBlock code={CODE_RESOLUTION} onRun={markRan} />
          {!canAdvance && (
            <p className="text-blue-400 text-sm italic">Run the code above to continue.</p>
          )}
        </div>
      )}

      {section === 2 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Time–Frequency Trade-off</h3>
          <p className="text-gray-300">
            Better frequency resolution requires a <em>longer</em> time window (more samples).
            But a longer window averages over more time, so you lose the ability to pinpoint{' '}
            <em>when</em> a frequency change happened. This is the{' '}
            <strong className="text-white">time–frequency uncertainty principle</strong>:
          </p>
          <MathEq block math="\Delta t \cdot \Delta f \geq \text{const}" />
          <ul className="list-disc list-inside text-gray-300 text-sm flex flex-col gap-1 ml-2">
            <li>
              <strong className="text-white">Large N</strong> — sharp frequency resolution, blurry
              timing
            </li>
            <li>
              <strong className="text-white">Small N</strong> — sharp timing, blurry frequency
              resolution
            </li>
          </ul>
          <p className="text-gray-400 text-sm">
            The signal below switches from 100 Hz to 300 Hz halfway through. Watch how each window
            size captures (or misses) this change.
          </p>
          <PythonBlock code={CODE_TRADEOFF} onRun={markRan} />
          {!canAdvance && (
            <p className="text-blue-400 text-sm italic">Run the code above to continue.</p>
          )}
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
          disabled={!canAdvance}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {section < SECTIONS.length - 1 ? 'Next section →' : 'I understand — continue ✓'}
        </button>
      </div>
    </div>
  )
}
