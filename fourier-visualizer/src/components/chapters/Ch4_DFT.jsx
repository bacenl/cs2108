import { useState, useMemo, useCallback, useEffect } from 'react'
import MathEq from '../shared/MathEq'
import SpectrumPlot from '../shared/SpectrumPlot'
import WaveformPlot from '../shared/WaveformPlot'
import PythonBlock from '../shared/PythonBlock'
import Slider from '../shared/Slider'
import { magnitudeSpectrum, binFrequencies, clampToPowerOf2, computeFFT, computeIFFT } from '../../hooks/useDFT'
import { useAudio } from '../../hooks/useAudio'
import defaultAudioUrl from '../../assets/default.mp3'

const N = 4096
const SECTIONS = ['Upload Audio', 'Analysis', 'Compression']

const CH4_ANALYSIS_CODE = `import numpy as np
import matplotlib.pyplot as plt
plt.style.use('dark_background')

# _audio_samples and _audio_sr are injected from the loaded audio
audio = np.array(_audio_samples, dtype=np.float32)
sr = int(_audio_sr)
N = len(audio)
t = np.arange(N) / sr

# FFT happens here!
freqs = np.fft.rfftfreq(N, 1 / sr)
magnitudes = np.abs(np.fft.rfft(audio)) / N

# Time domain graph
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 5))
ax1.plot(t * 1000, audio, color='#60a5fa', lw=0.5)
ax1.set(xlabel='Time (ms)', ylabel='Amplitude',
        title=f'Time domain  ({N} samples @ {sr} Hz)')
ax1.grid(alpha=0.3)

# Frequency domain graph
mask = freqs <= 5000
ax2.plot(freqs[mask], magnitudes[mask], color='#34d399', lw=1)
ax2.set(xlabel='Frequency (Hz)', ylabel='Magnitude',
        title='DFT magnitude spectrum (0–5 kHz)')
ax2.grid(alpha=0.3)

plt.tight_layout()
plt.show()
`

const CH4_COMPRESSION_CODE = `import numpy as np
import matplotlib.pyplot as plt
plt.style.use('dark_background')

# Once again, our audio is here, together with percentage to keep
audio = np.array(_audio_samples, dtype=np.float32)
sr = int(_audio_sr)
keep_percent = float(_keep_percent)

# Obtain frequencies from the original signal, remove % of frequencies, and create the compressed signal

# 1. FFT to obtain the frequencies
spectrum = np.fft.rfft(audio) # 1
mags = np.abs(spectrum)

# 2. Thresholding to remove some frequencies
threshold = np.percentile(mags, 100 - keep_percent) 
compressed_spectrum = np.where(mags >= threshold, spectrum, 0)

# 3. IFFT to create the compressed signal
compressed = np.fft.irfft(compressed_spectrum, n=len(audio)).astype(np.float32)


# Results
kept = int(np.sum(np.abs(compressed_spectrum) > 0))
print(f"Bins kept: {kept} / {len(spectrum)}  ({100 * kept / len(spectrum):.1f}%)")

freqs = np.fft.rfftfreq(len(audio), 1 / sr)
mask = freqs <= 5000
t = np.arange(len(audio)) / sr

# Graph 1
fig, axes = plt.subplots(3, 1, figsize=(8, 7))
axes[0].plot(freqs[mask], mags[mask], '#60a5fa', lw=1, label='Original')
axes[0].set(ylabel='Magnitude', title='Original spectrum (0–5 kHz)')
axes[0].grid(alpha=0.3)

# Graph 2
axes[1].plot(freqs[mask], np.abs(compressed_spectrum[mask]), '#34d399', lw=1)
axes[1].set(ylabel='Magnitude',
            title=f'Compressed spectrum — top {keep_percent:.0f}% of bins kept')
axes[1].grid(alpha=0.3)

# Graph 3
n_disp = min(2000, len(compressed))
axes[2].plot(t[:n_disp] * 1000, compressed[:n_disp], '#f472b6', lw=0.5)
axes[2].set(xlabel='Time (ms)', ylabel='Amplitude', title='Compressed signal (time domain)')
axes[2].grid(alpha=0.3)

plt.tight_layout()
plt.show()

# Expose compressed audio for the Play button
_compressed_audio = compressed
_compressed_sr = sr
`

export default function Ch4_DFT({ onComplete }) {
  const [section, setSection] = useState(0)
  const [audioBuffer, setAudioBuffer] = useState(null)
  const [audioName, setAudioName] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [keepPercent, setKeepPercent] = useState(10)
  const [playingSource, setPlayingSource] = useState(null) // 'original' | 'compressed' | null
  const [compressedFromPython, setCompressedFromPython] = useState(null)

  const { supported, isPlaying, playBuffer, stop, decodeAudioFile, createAudioBuffer } = useAudio()

  useEffect(() => () => stop(), [stop])
  useEffect(() => { if (!isPlaying) setPlayingSource(null) }, [isPlaying])
  useEffect(() => { setCompressedFromPython(null) }, [keepPercent])

  const canReach = (i) => i === 0 || audioBuffer !== null

  const loadAudio = useCallback((buffer, name) => {
    setAudioBuffer(buffer)
    setAudioName(name)
    setSection(1)
    onComplete()
  }, [onComplete])

  const loadDefault = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(defaultAudioUrl)
      if (!res.ok) throw new Error('Could not load default audio.')
      const arrayBuffer = await res.arrayBuffer()
      const decoded = await decodeAudioFile(arrayBuffer)
      loadAudio(decoded, 'default.mp3')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [decodeAudioFile, loadAudio])

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('audio/')) { setError('Please upload an audio file.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('File too large (max 10 MB).'); return }
    setError(null)
    setLoading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const decoded = await decodeAudioFile(arrayBuffer)
      loadAudio(decoded, file.name)
    } catch {
      setError('Could not decode audio file. Try a different format.')
    } finally {
      setLoading(false)
    }
  }, [decodeAudioFile, loadAudio])

  // ── Derived audio data ──────────────────────────────────────────────────────

  const samples = useMemo(() => {
    if (!audioBuffer) return null
    const channelData = audioBuffer.getChannelData(0)
    const windowN = clampToPowerOf2(N, 256, 8192)
    return Array.from(channelData.slice(0, windowN))
  }, [audioBuffer])

  const sampleRate = audioBuffer?.sampleRate ?? 44100

  const { magnitudes, frequencies } = useMemo(() => {
    if (!samples) return { magnitudes: [], frequencies: [] }
    return {
      magnitudes: magnitudeSpectrum(samples),
      frequencies: binFrequencies(samples.length, sampleRate),
    }
  }, [samples, sampleRate])

  const { displaySamples, displaySampleRate } = useMemo(() => {
    if (!samples) return { displaySamples: null, displaySampleRate: sampleRate }
    const maxPoints = 500
    if (samples.length <= maxPoints) return { displaySamples: samples, displaySampleRate: sampleRate }
    const step = Math.ceil(samples.length / maxPoints)
    return {
      displaySamples: samples.filter((_, i) => i % step === 0),
      displaySampleRate: sampleRate / step,
    }
  }, [samples, sampleRate])

  // ── Compression ─────────────────────────────────────────────────────────────

  const compressionResult = useMemo(() => {
    if (!samples) return null
    const { re, im } = computeFFT(samples)
    const halfN = samples.length / 2

    // Magnitude of each positive-frequency bin
    const posMags = Array.from({ length: halfN }, (_, k) =>
      Math.sqrt(re[k] ** 2 + im[k] ** 2)
    )

    // Threshold: keep top keepPercent% by magnitude
    const sorted = [...posMags].sort((a, b) => b - a)
    const cutoffIdx = Math.min(Math.floor(sorted.length * keepPercent / 100), sorted.length - 1)
    const threshold = sorted[cutoffIdx] ?? 0

    // Zero bins below threshold (maintain conjugate symmetry for real IFFT)
    const compRe = new Float64Array(re)
    const compIm = new Float64Array(im)
    let keptBins = 0
    for (let k = 1; k < halfN; k++) {
      if (posMags[k] >= threshold) {
        keptBins++
      } else {
        compRe[k] = 0; compIm[k] = 0
        compRe[samples.length - k] = 0; compIm[samples.length - k] = 0
      }
    }

    const compSamples = Array.from(computeIFFT(compRe, compIm))
    const compMagnitudes = Array.from({ length: halfN }, (_, k) =>
      Math.sqrt(compRe[k] ** 2 + compIm[k] ** 2)
    )

    return { compSamples, compMagnitudes, keptBins, totalBins: halfN }
  }, [samples, keepPercent])

  // ── Playback ─────────────────────────────────────────────────────────────────

  const playOriginal = useCallback(() => {
    if (playingSource === 'original') { stop(); return }
    stop()
    setPlayingSource('original')
    playBuffer(audioBuffer)
  }, [playingSource, stop, playBuffer, audioBuffer])

  const playCompressed = useCallback(() => {
    if (!compressedFromPython) return
    if (playingSource === 'compressed') { stop(); return }
    stop()
    setPlayingSource('compressed')
    playBuffer(compressedFromPython)
  }, [playingSource, stop, playBuffer, compressedFromPython])

  const pyOnResult = useCallback(async (py) => {
    try {
      const compProxy = py.globals.get('_compressed_audio')
      const sr = py.globals.get('_compressed_sr')
      if (!compProxy || !sr) return
      const buf = createAudioBuffer(compProxy.toJs(), Number(sr))
      if (buf) setCompressedFromPython(buf)
    } catch {}
  }, [createAudioBuffer])

  // ── Python inject ─────────────────────────────────────────────────────────────

  const pyInjectAnalysis = useCallback(async (py) => {
    if (!samples) return
    py.globals.set('_audio_samples', py.toPy(samples))
    py.globals.set('_audio_sr', sampleRate)
  }, [samples, sampleRate])

  const pyInjectCompression = useCallback(async (py) => {
    if (!audioBuffer) return
    py.globals.set('_audio_samples', py.toPy(Array.from(audioBuffer.getChannelData(0))))
    py.globals.set('_audio_sr', audioBuffer.sampleRate)
    py.globals.set('_keep_percent', keepPercent)
  }, [audioBuffer, keepPercent])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Section pill nav */}
      <div className="flex flex-wrap gap-2 text-xs">
        {SECTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => canReach(i) && setSection(i)}
            disabled={!canReach(i)}
            className={`px-2 py-1 rounded-full transition-colors ${
              i === section
                ? 'bg-blue-600 text-white'
                : canReach(i)
                  ? 'bg-green-800 text-green-200 hover:bg-green-700 cursor-pointer'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Section 0: Upload Audio ── */}
      {section === 0 && (
        <div className="flex flex-col gap-6">
          <p className="text-gray-300">
            The Fourier Transform we've studied is continuous. Real-world signals are{' '}
            <strong className="text-white">sampled</strong> — discrete values measured at regular intervals.
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

          <p className="text-gray-300">
            Let's try to perform DFT on a real-world signal! Upload an audio file below, or use the sample audio!
          </p>

          <div>
            <h3 className="text-base font-semibold text-white mb-3">Load audio to analyse</h3>
            {!supported && <p className="text-red-400 text-sm mb-3">Web Audio API not supported in this browser.</p>}
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
          </div>

          <p className="text-blue-400 text-sm italic">Load an audio file to continue.</p>
        </div>
      )}

      {/* ── Section 1: Analysis ── */}
      {section === 1 && samples && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <p className="text-green-400 text-sm">Loaded: {audioName}</p>
            <button
              onClick={() => { stop(); setSection(0); setAudioBuffer(null); setAudioName(null) }}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              ← Load different audio
            </button>
          </div>


          {supported && (
            <button
              onClick={() => (isPlaying ? stop() : playBuffer(audioBuffer))}
              className="self-start px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 transition-colors text-sm"
            >
              {isPlaying ? '⏹ Stop' : '▶ Play audio'}
            </button>
          )}

          <div>
            <h3 className="text-base font-semibold text-white mb-1">Analysis in Python</h3>
            <p className="text-gray-400 text-sm mb-3">
              The code below uses the audio you loaded. It basically performs FFT and graphs out the result!
            </p>
            <PythonBlock code={CH4_ANALYSIS_CODE} inject={pyInjectAnalysis} />
          </div>
        </div>
      )}

      {/* ── Section 2: Compression ── */}
      {section === 2 && samples && compressionResult && (
        <div className="flex flex-col gap-6">
          <p className="text-gray-300">
            Since the DFT tells us which frequencies carry the most energy, we can discard low-energy bins
            and reconstruct the signal from the remaining ones. This is the core idea behind{' '}
            <strong className="text-white">lossy audio compression</strong>.
          </p>

          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <strong className="text-yellow-300">How it works:</strong> compute the DFT, zero out all bins
            below a magnitude threshold, then apply the inverse DFT (IDFT) to recover the compressed signal.
            Fewer bins = smaller representation, but lower quality.
          </div>

          <Slider
            label="Bins to keep"
            min={1} max={100} step={1}
            value={keepPercent}
            onChange={setKeepPercent}
            formatValue={(v) => `Top ${v}%`}
          />

          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Bins kept</p>
              <p className="text-xl font-bold text-white mt-1">{compressionResult.keptBins}</p>
              <p className="text-gray-500 text-xs">of {compressionResult.totalBins}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Retained</p>
              <p className="text-xl font-bold text-blue-400 mt-1">
                {(compressionResult.keptBins / compressionResult.totalBins * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs uppercase tracking-wide">Discarded</p>
              <p className="text-xl font-bold text-red-400 mt-1">
                {((1 - compressionResult.keptBins / compressionResult.totalBins) * 100).toFixed(1)}%
              </p>
            </div>
          </div>


          <div>
            <h3 className="text-base font-semibold text-white mb-1">Reproduce in Python</h3>
            <p className="text-gray-400 text-sm mb-3">
              The slider value is passed as <code className="text-blue-300">_keep_percent</code>. Run the
              code to generate the compressed audio, then use the play buttons to compare.
            </p>
            <PythonBlock code={CH4_COMPRESSION_CODE} inject={pyInjectCompression} onResult={pyOnResult} />
          </div>

          {supported && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={playOriginal}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 transition-colors text-sm"
              >
                {playingSource === 'original' ? '⏹ Stop' : '▶ Play original'}
              </button>
              <button
                onClick={playCompressed}
                disabled={!compressedFromPython}
                className="px-4 py-2 rounded bg-green-700 hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title={!compressedFromPython ? 'Run the Python code first' : ''}
              >
                {playingSource === 'compressed' ? '⏹ Stop' : '▶ Play compressed'}
              </button>
              {!compressedFromPython && (
                <span className="text-gray-500 text-xs self-center italic">Run the code above first</span>
              )}
            </div>
          )}
        </div>
      )}
      {/* Back / Next navigation */}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={() => setSection((s) => Math.max(0, s - 1))}
          disabled={section === 0}
          className="px-4 py-2 rounded bg-gray-700 text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm"
        >
          ← Back
        </button>
        {section < SECTIONS.length - 1 && (
          <button
            onClick={() => setSection((s) => s + 1)}
            disabled={!canReach(section + 1)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next section →
          </button>
        )}
      </div>
    </div>
  )
}
