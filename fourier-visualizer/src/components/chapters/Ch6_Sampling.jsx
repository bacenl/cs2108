import { useState } from 'react'
import Slider from '../shared/Slider'
import DesmosPlot from '../shared/DesmosPlot'
import MathEq from '../shared/MathEq'
import PythonBlock from '../shared/PythonBlock'

const TRUE_FREQ = 440

function ch6Code(sr) {
  return `import numpy as np
import matplotlib.pyplot as plt
plt.style.use('dark_background')

f_signal = ${TRUE_FREQ}   # Signal frequency (Hz)
sr = ${sr}                # Sample rate (Hz)

t_cont = np.linspace(0, 0.02, 5000)
t_samp = np.arange(0, 0.02, 1 / sr)

# ── Compute alias frequency ───────────────────────────────────────────────
n = round(f_signal / sr)
alias_freq = abs(f_signal - n * sr)
nyquist = sr / 2
is_aliased = f_signal > nyquist

# ── Figure 1: time domain ─────────────────────────────────────────────────
fig1, (ax1, ax2) = plt.subplots(2, 1, figsize=(9, 5))

ax1.plot(t_cont * 1000, np.sin(2 * np.pi * f_signal * t_cont), color='#4b5563', lw=1)
ax1.stem(t_samp * 1000, np.sin(2 * np.pi * f_signal * t_samp),
         linefmt='#60a5fa', markerfmt='o', basefmt='none')
status = "✗ Aliasing!" if is_aliased else "✓ OK"
ax1.set(title=f'Signal: {f_signal} Hz  |  Nyquist: {nyquist} Hz  |  {status}',
        xlabel='Time (ms)', ylabel='Amplitude')
ax1.grid(alpha=0.3)

perceived = alias_freq if is_aliased else f_signal
color2 = '#f87171' if is_aliased else '#34d399'
ax2.plot(t_cont * 1000, np.sin(2 * np.pi * perceived * t_cont), color=color2, lw=1.5)
ax2.set(title=f'Reconstructed signal: {perceived:.1f} Hz',
        xlabel='Time (ms)', ylabel='Amplitude')
ax2.grid(alpha=0.3)

plt.tight_layout()
plt.show()

# ── Figure 2: repeating spectrum diagram ──────────────────────────────────
fig2, ax = plt.subplots(figsize=(10, 3.5))

TRUE_COLOR  = '#60a5fa'
COPY_COLOR  = '#4b5563'
ALIAS_COLOR = '#f87171'
BAND_COLOR  = '#34d399'

# Draw repeating copies for n = -2 … +2
for n_copy in range(-2, 3):
    for sign in [1, -1]:          # real signal has symmetric spectrum
        f = sign * f_signal + n_copy * sr
        in_band = abs(f) <= nyquist + 1e-6
        # The alias is the copy of the original that lands inside the baseband
        is_alias = in_band and abs(abs(f) - alias_freq) < 1e-3 and n_copy != 0
        is_original = n_copy == 0
        color = ALIAS_COLOR if is_alias else (TRUE_COLOR if is_original else COPY_COLOR)
        lw    = 2.5 if (is_original or is_alias) else 1
        alpha = 0.9 if (is_original or is_alias) else 0.35
        ax.plot([f, f], [0, 1], color=color, lw=lw, alpha=alpha)

# Shade the visible baseband [−fs/2, +fs/2]
ax.axvspan(-nyquist, nyquist, alpha=0.10, color=BAND_COLOR, zorder=0)
ax.axvline(-nyquist, color=BAND_COLOR, ls='--', lw=1,
           label=f'Nyquist limits ±{nyquist:.0f} Hz  (visible baseband)')
ax.axvline( nyquist, color=BAND_COLOR, ls='--', lw=1)

# Invisible lines for legend entries
ax.plot([], [], color=TRUE_COLOR,  lw=2.5, label=f'True spectrum ({f_signal} Hz)')
ax.plot([], [], color=COPY_COLOR,  lw=1, alpha=0.5, label='Repeated copies (every fs Hz)')
if is_aliased:
    ax.plot([], [], color=ALIAS_COLOR, lw=2.5,
            label=f'Alias folds to {alias_freq:.0f} Hz inside baseband')

ax.set(
    xlim=[-2.3 * sr, 2.3 * sr],
    ylim=[0, 1.35],
    xlabel='Frequency (Hz)',
    yticks=[],
    title=(f'Sampling at fs={sr} Hz repeats the spectrum every fs Hz — '
           + (f'alias at {alias_freq:.0f} Hz folds inside [−{nyquist:.0f}, {nyquist:.0f}] Hz'
              if is_aliased else 'signal safely within Nyquist limit')),
)
ax.legend(fontsize=9, loc='upper right')
ax.grid(alpha=0.15)

plt.tight_layout()
plt.show()

if is_aliased:
    print(f"Aliasing: {f_signal} Hz > Nyquist ({nyquist} Hz)")
    print(f"Nearest copy to baseband: {f_signal} − {round(f_signal/sr)}×{sr} = {alias_freq:.1f} Hz")
else:
    print(f"No aliasing: {f_signal} Hz < Nyquist ({nyquist} Hz)")
`
}

function aliasedFreq(trueFreq, sampleRate) {
  const n = Math.round(trueFreq / sampleRate)
  return Math.abs(trueFreq - n * sampleRate)
}

export default function Ch6_Sampling({ onComplete }) {
  const [sampleRate, setSampleRate] = useState(2000)
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
          key={isAliased ? 'aliased' : 'correct'}
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
        min={100} max={2000} step={100}
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

      <div>
        <h3 className="text-base font-semibold text-white mb-2">Visualise aliasing in Python</h3>
        <p className="text-gray-400 text-sm mb-3">
          The code reflects the current slider value. Drag the sample rate slider above, then
          click Run to see both charts update.
        </p>
        <PythonBlock code={ch6Code(sampleRate)} />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-white">Why aliasing happens: the repeating spectrum</h3>
        <p className="text-gray-300 text-sm">
          Sampling a continuous signal at rate <MathEq math="f_s" /> is equivalent to multiplying it by
          an impulse train spaced <MathEq math="1/f_s" /> apart in time. In the frequency domain,
          convolution with an impulse train <strong className="text-white">replicates the spectrum</strong>{' '}
          at every integer multiple of <MathEq math="f_s" />:
        </p>
        <MathEq block math="X_s(f) = \sum_{n=-\infty}^{\infty} X\!\left(f - n f_s\right)" />
        <p className="text-gray-300 text-sm">
          A digital system can only observe frequencies in the baseband{' '}
          <MathEq math="[-f_s/2,\; f_s/2]" />. Any spectral copy that falls <em>inside</em> this
          window is indistinguishable from a genuine low-frequency component — that copy is the{' '}
          <strong className="text-white">alias</strong>. For a signal at{' '}
          <MathEq math="f > f_s/2" />, the alias lands at:
        </p>
        <MathEq block math="f_{\text{alias}} = \left|f - n f_s\right|, \quad n = \operatorname{round}\!\left(\tfrac{f}{f_s}\right)" />
        <p className="text-gray-300 text-sm">
          The second Python plot below draws this picture directly — the blue spikes are the
          original spectrum, grey spikes are the repeated copies, and the red spike is the alias
          that folds back into the visible baseband (green shaded region).
        </p>
      </div>
    </div>
  )
}
