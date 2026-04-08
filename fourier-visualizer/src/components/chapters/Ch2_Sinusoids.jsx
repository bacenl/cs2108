import { useState, useCallback, useEffect } from 'react'
import Slider from '../shared/Slider'
import DesmosPlot from '../shared/DesmosPlot'
import { useAudio } from '../../hooks/useAudio'

const DEFAULT_OSCILLATORS = [
  { frequency: 220, amplitude: 0.8 },
  { frequency: 440, amplitude: 0.5 },
  { frequency: 660, amplitude: 0.3 },
]

const COLORS = ['#60a5fa', '#34d399', '#f472b6']

export default function Ch2_Sinusoids({ onComplete }) {
  const [oscillators, setOscillators] = useState(DEFAULT_OSCILLATORS)
  const { supported, isPlaying, playSynthesized, stop } = useAudio()
  const [hasPlayed, setHasPlayed] = useState(false)

  useEffect(() => () => stop(), [stop])

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
        What if I told you that any periodic signal can be expressed as a <strong className="text-white">sum of sine / cosine waves</strong>?
      </p>
      <p className="text-gray-300">
        That's right. Any sound that you and I hear can actually be broken down into simple sinusoids.
      </p>
      <p className="text-gray-300">
        But let's start simple. Let's try to create our own <strong className="text-white">periodic</strong> sound!
      </p>
      <p className="text-gray-300">
        Each sine wave has its own frequency and amplitude. Adjust the three sinusoids below
        and hear what the combined sound sounds like.
      </p>


      <div className="grid grid-cols-1 gap-4">
        {oscillators.map((osc, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-gray-300">Sinusoid {i + 1}</h3>
            <DesmosPlot
              lines={[{ latex: 'y=A\\sin(2\\pi f t)', color: COLORS[i] }]}
              variables={{ A: osc.amplitude, f: osc.frequency }}
              xDomain={[0, 0.04]}
              yDomain={[-1.5, 1.5]}
              height={100}
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
        <DesmosPlot
          lines={[{
            latex: 'y=A_{1}\\sin(2\\pi f_{1} t)+A_{2}\\sin(2\\pi f_{2} t)+A_{3}\\sin(2\\pi f_{3} t)',
            color: '#facc15',
          }]}
          variables={{
            'A_{1}': oscillators[0].amplitude,
            'f_{1}': oscillators[0].frequency,
            'A_{2}': oscillators[1].amplitude,
            'f_{2}': oscillators[1].frequency,
            'A_{3}': oscillators[2].amplitude,
            'f_{3}': oscillators[2].frequency,
          }}
          xDomain={[0, 0.04]}
          yDomain={[-3, 3]}
          height={140}
        />
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

      {hasPlayed && (
        <div className="flex flex-col gap-4">
          <p className="text-blue-300">Hooray! We've created our own sound wave!</p>

          <p className="text-blue-300">
            Signal processing techniques promise us that they are able to extract the frequencies from an input signal.
            That means that if you only give me the audio signal you just created, I will be able to tell you the exact frequencies you used to create that signal.
          </p>

          <p className="text-blue-300">
            But how do they do it? That's what we'll soon find out in the next chapter!
          </p>
        </div>
      )}

      {!hasPlayed && (
        <p className="text-blue-400 text-sm italic">Press Play to hear the combined sound and continue.</p>
      )}
    </div>
  )
}
