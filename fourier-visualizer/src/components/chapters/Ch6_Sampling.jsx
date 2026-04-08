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
    </div>
  )
}
