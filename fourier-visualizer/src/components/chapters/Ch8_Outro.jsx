import { useEffect } from 'react'
import MathEq from '../shared/MathEq'

const SUMMARY = [
  {
    chapter: '1 — What is a Signal?',
    color: 'text-blue-400',
    points: [
      'A signal is any quantity that varies over time (or space).',
      'Audio is a pressure wave recorded as a time-domain sequence of amplitude samples.',
      'Three parameters fully describe a pure sinusoid: frequency, amplitude, and phase.',
    ],
  },
  {
    chapter: '2 — Frequencies & Sinusoids',
    color: 'text-purple-400',
    points: [
      'Real-world sounds are sums of many sinusoids at different frequencies and amplitudes.',
      'The frequency spectrum shows how much of each frequency is present in a signal.',
      'Timbre — why a guitar and a piano playing the same note sound different — comes from their different harmonic content.',
    ],
  },
  {
    chapter: '3 — Fourier Series & the Fourier Transform',
    color: 'text-pink-400',
    points: [
      'Any periodic signal can be written as an infinite sum of harmonically related sinusoids (Fourier Series).',
      'Sines and cosines at different frequencies are orthogonal — their inner product is zero — which is why each coefficient can be extracted independently.',
      "Euler's formula unifies cosine and sine into a single rotating complex exponential: e^{iωt} = cos(ωt) + i·sin(ωt).",
      'Letting the period T → ∞ turns the discrete Fourier Series into the continuous Fourier Transform.',
    ],
  },
  {
    chapter: '4 — The Discrete Fourier Transform',
    color: 'text-green-400',
    points: [
      'The DFT computes N complex coefficients from N time-domain samples — one per frequency bin.',
      'The FFT (Fast Fourier Transform) computes the same result in O(N log N) instead of O(N²).',
      'Frequency-domain compression works by zeroing out small-magnitude bins and reconstructing via the inverse DFT — the basis of audio compression.',
    ],
  },
  {
    chapter: '5 — Frequency Bins in Depth',
    color: 'text-yellow-400',
    points: [
      'Bin spacing Δf = fs / N sets the frequency resolution: how close two tones can be and still appear as separate peaks.',
      'Spectral leakage occurs when a frequency falls between two bins and its energy spreads to neighbours.',
      'The time–frequency uncertainty principle: finer frequency resolution requires a longer time window, and vice versa.',
    ],
  },
  {
    chapter: '6 — Sampling & the Nyquist Theorem',
    color: 'text-orange-400',
    points: [
      'Sampling at rate fs replicates the spectrum every fs Hz in the frequency domain.',
      'The Nyquist–Shannon theorem: fs ≥ 2·fmax is required to avoid aliasing.',
      'Aliasing folds frequencies above fs/2 back into the baseband, making them indistinguishable from lower frequencies.',
      'CD audio uses 44,100 Hz — comfortably above twice the 20 kHz limit of human hearing.',
    ],
  },
  {
    chapter: '7 — 2D DFT & Images',
    color: 'text-cyan-400',
    points: [
      'A greyscale image is a 2D signal; the 2D DFT applies the 1D DFT to every row, then every column.',
      'The magnitude spectrum (DC centred) shows low-frequency content near the centre and high-frequency detail at the edges.',
      'The phase encodes where structures are located — swap two images\' phases and the result looks like whichever donated its phase.',
      'JPEG uses the Discrete Cosine Transform (a close relative of the DFT) on 8×8 pixel blocks, dropping high-frequency coefficients to compress.',
    ],
  },
]

export default function Ch8_Outro({ onComplete }) {
  useEffect(() => { onComplete() }, [onComplete])

  return (
    <div className="flex flex-col gap-8">
      {/* Thank you header */}
      <div className="flex flex-col gap-3 text-center">
        <h2 className="text-3xl font-bold text-white">Thank you!</h2>
        <p className="text-gray-300 max-w-xl mx-auto">
          You have reached the end of the Fourier Transform Explorer. Here is a recap of
          everything we covered — a reference you can come back to any time.
        </p>
      </div>

      {/* The big formula */}
      <div className="bg-gray-800 rounded-xl p-6 flex flex-col gap-3 text-center">
        <p className="text-sm text-gray-400 uppercase tracking-wide font-semibold">The Fourier Transform</p>
        <MathEq block math="X(\omega) = \int_{-\infty}^{\infty} x(t)\, e^{-i\omega t}\, dt" />
        <p className="text-gray-400 text-sm">
          Project a signal onto every frequency <MathEq math="e^{i\omega t}" /> at once.
          The result tells you exactly how much of each frequency is present — and where.
        </p>
      </div>

      {/* Chapter summaries */}
      <div className="flex flex-col gap-4">
        {SUMMARY.map(({ chapter, color, points }) => (
          <div key={chapter} className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2">
            <h3 className={`text-sm font-semibold uppercase tracking-wide ${color}`}>{chapter}</h3>
            <ul className="flex flex-col gap-1">
              {points.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className={`mt-0.5 shrink-0 ${color}`}>›</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-center text-gray-500 text-sm pb-4">
        Made with React, Pyodide, Desmos, and a lot of sinusoids.
      </p>
    </div>
  )
}
