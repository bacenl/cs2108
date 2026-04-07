import { useState, useMemo } from 'react'
import Slider from '../shared/Slider'
import SpectrumPlot from '../shared/SpectrumPlot'
import MathEq from '../shared/MathEq'
import { magnitudeSpectrum, binFrequencies, clampToPowerOf2 } from '../../hooks/useDFT'

const SAMPLE_RATE = 44100

function syntheticSignal(N, freq) {
  return Array.from({ length: N }, (_, n) => Math.sin(2 * Math.PI * freq * n / SAMPLE_RATE))
}

export default function Ch5_FreqBins({ onComplete }) {
  const [nExp, setNExp] = useState(10)
  const [interacted, setInteracted] = useState(false)

  const N = Math.pow(2, nExp)
  const testFreq = 1000.7 * (SAMPLE_RATE / N)

  const samples = useMemo(() => syntheticSignal(N, testFreq), [N, testFreq])
  const magnitudes = useMemo(() => magnitudeSpectrum(samples), [samples])
  const frequencies = useMemo(() => binFrequencies(N, SAMPLE_RATE), [N])

  const binSpacing = SAMPLE_RATE / N
  const nyquist = SAMPLE_RATE / 2
  const numBins = N / 2

  const handleNChange = (v) => {
    setNExp(v)
    if (!interacted) {
      setInteracted(true)
      onComplete()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-300">
        The DFT of <MathEq math="N" /> samples produces <MathEq math="N" /> complex values —
        but only the first <MathEq math="N/2" /> are meaningful (the rest are mirror images).
        Each of those values corresponds to a <strong className="text-white">frequency bin</strong>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Bin spacing</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{binSpacing.toFixed(1)} Hz</p>
          <MathEq math={`\\frac{f_s}{N} = \\frac{${SAMPLE_RATE}}{${N}}`} />
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Number of bins</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{numBins.toLocaleString()}</p>
          <MathEq math="N/2" />
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Max frequency</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{(nyquist / 1000).toFixed(1)} kHz</p>
          <MathEq math="f_s / 2" />
          <span className="text-xs text-gray-400">(always)</span>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2 text-sm text-gray-300">
        <p><strong className="text-yellow-300">Common misconception:</strong> "More samples = higher max frequency."</p>
        <p>
          Wrong. The maximum frequency is always <MathEq math="f_s / 2" /> — fixed by the sample rate.
          More samples give you <em>finer frequency resolution</em> (smaller bin spacing), not higher frequencies.
        </p>
      </div>

      <Slider
        label="Window size N = 2^n"
        min={8} max={13} step={1}
        value={nExp}
        onChange={handleNChange}
        formatValue={(v) => `2^${v} = ${Math.pow(2, v).toLocaleString()} samples`}
      />

      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Spectrum of a {testFreq.toFixed(1)} Hz tone (note: not on a bin boundary)
        </h3>
        <SpectrumPlot
          magnitudes={magnitudes}
          frequencies={frequencies}
          height={180}
          maxFreq={5000}
        />
      </div>

      <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
        <strong className="text-yellow-300">Spectral leakage:</strong> when a frequency falls between two bins,
        energy "leaks" into neighbouring bins. This is visible above — instead of a single spike, you see a spread.
        Increasing <MathEq math="N" /> makes bins narrower, reducing the relative gap to the nearest bin.
        In practice, <strong className="text-white">windowing functions</strong> (Hann, Hamming) are applied to
        reduce leakage.
      </div>

      {!interacted && (
        <p className="text-blue-400 text-sm italic">Change the window size slider to continue.</p>
      )}
    </div>
  )
}
