import { useState, useMemo, useCallback } from 'react'
import MathEq from '../shared/MathEq'
import SpectrumPlot from '../shared/SpectrumPlot'
import WaveformPlot from '../shared/WaveformPlot'
import { magnitudeSpectrum, binFrequencies, clampToPowerOf2 } from '../../hooks/useDFT'
import { useAudio } from '../../hooks/useAudio'

const DEFAULT_AUDIO_URL = `${import.meta.env.BASE_URL}default_audio.mp3`
const SAMPLE_RATE = 44100
const N = 4096

export default function Ch4_DFT({ onComplete }) {
  const [audioBuffer, setAudioBuffer] = useState(null)
  const [audioName, setAudioName] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const { supported, isPlaying, playBuffer, stop, decodeAudioFile } = useAudio()

  const loadDefault = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(DEFAULT_AUDIO_URL)
      if (!res.ok) throw new Error('Could not load default audio file.')
      const arrayBuffer = await res.arrayBuffer()
      const decoded = await decodeAudioFile(arrayBuffer)
      setAudioBuffer(decoded)
      setAudioName('default_audio.mp3')
      onComplete()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [decodeAudioFile, onComplete])

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file (mp3, wav, ogg, etc.)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Please use a file under 10 MB.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const decoded = await decodeAudioFile(arrayBuffer)
      setAudioBuffer(decoded)
      setAudioName(file.name)
      onComplete()
    } catch {
      setError('Could not decode audio file. Try a different format.')
    } finally {
      setLoading(false)
    }
  }, [decodeAudioFile, onComplete])

  const samples = useMemo(() => {
    if (!audioBuffer) return null
    const channelData = audioBuffer.getChannelData(0)
    const windowN = clampToPowerOf2(N, 256, 8192)
    return Array.from(channelData.slice(0, windowN))
  }, [audioBuffer])

  const { magnitudes, frequencies } = useMemo(() => {
    if (!samples) return { magnitudes: [], frequencies: [] }
    return {
      magnitudes: magnitudeSpectrum(samples),
      frequencies: binFrequencies(samples.length, SAMPLE_RATE),
    }
  }, [samples])

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-300">
        The Fourier Transform we've studied is continuous. Real-world signals are{' '}
        <strong className="text-white">sampled</strong> — they consist of discrete values measured at regular intervals.
        The <strong className="text-white">Discrete Fourier Transform (DFT)</strong> applies the same idea to finite, discrete signals.
      </p>

      <MathEq block math="X[k] = \sum_{n=0}^{N-1} x[n]\, e^{-i 2\pi k n / N} \quad k = 0, 1, \ldots, N-1" />

      <div className="overflow-x-auto">
        <table className="text-sm text-gray-300 border-collapse w-full">
          <thead>
            <tr className="bg-gray-800">
              <th className="border border-gray-700 px-3 py-2 text-left">Transform</th>
              <th className="border border-gray-700 px-3 py-2">Time domain</th>
              <th className="border border-gray-700 px-3 py-2">Frequency domain</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-700 px-3 py-2">Fourier Series</td>
              <td className="border border-gray-700 px-3 py-2 text-center">Continuous, periodic</td>
              <td className="border border-gray-700 px-3 py-2 text-center">Discrete</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-3 py-2">Fourier Transform</td>
              <td className="border border-gray-700 px-3 py-2 text-center">Continuous, aperiodic</td>
              <td className="border border-gray-700 px-3 py-2 text-center">Continuous</td>
            </tr>
            <tr className="bg-blue-900/30">
              <td className="border border-gray-700 px-3 py-2 font-semibold text-blue-300">DFT</td>
              <td className="border border-gray-700 px-3 py-2 text-center text-blue-200">Discrete (periodic assumed)</td>
              <td className="border border-gray-700 px-3 py-2 text-center text-blue-200">Discrete</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
        <strong className="text-yellow-300">Important:</strong> the DFT assumes the <MathEq math="N" /> samples{' '}
        <em>repeat indefinitely</em>. If the signal doesn't start and end at the same value, this creates a
        discontinuity — causing <strong className="text-white">spectral leakage</strong> (covered in the next chapter).
      </div>

      <div>
        <h3 className="text-base font-semibold text-white mb-3">Load audio to apply the DFT</h3>
        {!supported && (
          <p className="text-red-400 text-sm mb-3">Web Audio API not supported in this browser.</p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadDefault}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Use default audio'}
          </button>
          <label className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-sm cursor-pointer">
            Upload your own
            <input type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        {audioName && <p className="text-green-400 text-sm mt-2">Loaded: {audioName}</p>}
      </div>

      {audioBuffer && samples && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Time domain (first {samples.length} samples)
            </h3>
            <WaveformPlot samples={samples} sampleRate={SAMPLE_RATE} height={140} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Frequency domain — DFT magnitude spectrum
            </h3>
            <SpectrumPlot magnitudes={magnitudes} frequencies={frequencies} height={180} />
          </div>
          {supported && (
            <button
              onClick={() => (isPlaying ? stop() : playBuffer(audioBuffer))}
              className="self-start px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 transition-colors text-sm"
            >
              {isPlaying ? '⏹ Stop' : '▶ Play audio'}
            </button>
          )}
        </>
      )}

      {!audioBuffer && (
        <p className="text-blue-400 text-sm italic">Select or upload an audio file to continue.</p>
      )}
    </div>
  )
}
