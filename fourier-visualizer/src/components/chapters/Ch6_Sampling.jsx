import { useState } from 'react'
import Slider from '../shared/Slider'
import DesmosPlot from '../shared/DesmosPlot'
import MathEq from '../shared/MathEq'
import PythonBlock from '../shared/PythonBlock'

const TRUE_FREQ = 440

const CH6_CODE = `import numpy as np
import matplotlib.pyplot as plt
plt.style.use('dark_background')

f_signal = 440   # Signal frequency (Hz) — try values near sr/2
sr = 800         # Sample rate (Hz) — try values below 2 * f_signal

t_cont = np.linspace(0, 0.02, 5000)
t_samp = np.arange(0, 0.02, 1 / sr)

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 5))

# Continuous signal
ax1.plot(t_cont * 1000, np.sin(2 * np.pi * f_signal * t_cont), color='#4b5563', lw=1)
ax1.stem(t_samp * 1000, np.sin(2 * np.pi * f_signal * t_samp),
         linefmt='#60a5fa', markerfmt='o', basefmt='none')
nyquist = sr / 2
status = "✓ OK" if f_signal < nyquist else "✗ Aliasing!"
ax1.set(title=f'Signal: {f_signal} Hz  |  Nyquist: {nyquist} Hz  |  {status}',
        xlabel='Time (ms)', ylabel='Amplitude')
ax1.grid(alpha=0.3)

# Aliased reconstruction
alias_freq = f_signal
n = round(f_signal / sr)
alias_freq = abs(f_signal - n * sr)
ax2.plot(t_cont * 1000, np.sin(2 * np.pi * alias_freq * t_cont), color='#f87171', lw=1.5)
ax2.set(title=f'Reconstructed signal: {alias_freq:.1f} Hz',
        xlabel='Time (ms)', ylabel='Amplitude')
ax2.grid(alpha=0.3)

plt.tight_layout()
plt.show()
`

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

      <div>
        <h3 className="text-base font-semibold text-white mb-3">Visualise aliasing in Python</h3>
        <p className="text-gray-400 text-sm mb-3">
          Try setting <code className="text-blue-300">sr</code> below <code className="text-blue-300">2 * f_signal</code> to see aliasing in action.
        </p>
        <PythonBlock code={CH6_CODE} />
      </div>
    </div>
  )
}
