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
