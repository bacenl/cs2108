import { useState } from 'react'
import Slider from '../shared/Slider'
import DesmosPlot from '../shared/DesmosPlot'
import MathEq from '../shared/MathEq'

export default function Ch1_Signal({ onComplete }) {
  const [frequency, setFrequency] = useState(220)
  const [amplitude, setAmplitude] = useState(1.0)
  const [phase, setPhase] = useState(0)
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
        <MathEq block math="x(t) = A \sin(2\pi f t + \phi)" />
        <p className="text-gray-400 text-sm mt-1">
          where <MathEq math="A" /> is amplitude, <MathEq math="f" /> is frequency (Hz), <MathEq math="t" /> is time (seconds), and <MathEq math="\phi" /> is phase (radians).
        </p>
      </div>

      <DesmosPlot
        lines={[{ latex: 'y=A\\sin(2\\pi f t+\\phi)', color: '#60a5fa' }]}
        variables={{ A: amplitude, f: frequency, '\\phi': phase }}
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
        <Slider
          label="Phase"
          min={0}
          max={6.28}
          step={0.05}
          value={phase}
          onChange={(v) => setPhase(v)}
          formatValue={(v) => `${v.toFixed(2)} rad`}
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
