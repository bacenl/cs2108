import { useState, useMemo } from 'react'
import Slider from '../shared/Slider'
import DesmosPlot from '../shared/DesmosPlot'
import MathEq from '../shared/MathEq'

const SAMPLE_RATE = 1000
const DURATION = 0.04
const N_DISPLAY = Math.floor(SAMPLE_RATE * DURATION)

function sine(freq, amp, n, sampleRate) {
  return Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * freq * i / sampleRate))
}

function innerProduct(a, b) {
  const dt = 1 / SAMPLE_RATE
  return a.reduce((sum, v, i) => sum + v * (b[i] ?? 0) * dt, 0)
}

function Phasor({ omega }) {
  const cx = 80, cy = 80, r = 60
  const x = cx + r * Math.cos(omega)
  const y = cy - r * Math.sin(omega)

  return (
    <svg width="160" height="160" className="mx-auto">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#374151" strokeWidth="1.5" />
      <line x1={cx - r - 10} y1={cy} x2={cx + r + 10} y2={cy} stroke="#4b5563" strokeWidth="1" />
      <line x1={cx} y1={cy - r - 10} x2={cx} y2={cy + r + 10} stroke="#4b5563" strokeWidth="1" />
      <line x1={x} y1={cy} x2={x} y2={y} stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />
      <line x1={cx} y1={y} x2={x} y2={y} stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" />
      <line x1={cx} y1={cy} x2={x} y2={y} stroke="#facc15" strokeWidth="2.5" />
      <circle cx={x} cy={y} r={4} fill="#facc15" />
      <text x={cx + r + 12} y={cy + 4} fill="#60a5fa" fontSize="11">Re</text>
      <text x={cx + 2} y={cy - r - 12} fill="#34d399" fontSize="11">Im</text>
    </svg>
  )
}

const SECTIONS = [
  'Fourier Series',
  'Orthogonality',
  'Why Complex Numbers?',
  "Euler's Formula",
  'The Leap to FT',
]

export default function Ch3_FourierSeries({ onComplete }) {
  const [section, setSection] = useState(0)
  const [freq1, setFreq1] = useState(100)
  const [freq2, setFreq2] = useState(300)
  const [omega, setOmega] = useState(1.0)
  const [omegaInteracted, setOmegaInteracted] = useState(false)

  // Kept for numeric inner-product display only — not used for rendering
  const wave1 = useMemo(() => sine(freq1, 1, N_DISPLAY, SAMPLE_RATE), [freq1])
  const wave2 = useMemo(() => sine(freq2, 1, N_DISPLAY, SAMPLE_RATE), [freq2])
  const ip = useMemo(() => innerProduct(wave1, wave2), [wave1, wave2])

  const handleOmegaChange = (v) => {
    setOmega(v)
    if (!omegaInteracted) setOmegaInteracted(true)
  }

  const advance = () => {
    if (section < SECTIONS.length - 1) {
      setSection((s) => s + 1)
    } else {
      onComplete()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 text-xs">
        {SECTIONS.map((s, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded-full ${i === section ? 'bg-blue-600 text-white' : i < section ? 'bg-green-800 text-green-200' : 'bg-gray-700 text-gray-400'}`}
          >
            {s}
          </span>
        ))}
      </div>

      {section === 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Fourier Series</h3>
          <p className="text-gray-300">
            In the 19th century, Joseph Fourier showed that any <em>periodic</em> function
            can be written as an infinite sum of sines and cosines — the <strong className="text-white">Fourier Series</strong>.
          </p>
          <MathEq block math="x(t) = a_0 + \sum_{k=1}^{\infty} \left[ a_k \cos\!\left(\frac{2\pi k t}{T}\right) + b_k \sin\!\left(\frac{2\pi k t}{T}\right) \right]" />
          <p className="text-gray-300 text-sm">
            Each coefficient <MathEq math="a_k" />, <MathEq math="b_k" /> captures how much of frequency <MathEq math="k/T" /> is present.
            The frequencies are <em>discrete</em> — they must be integer multiples (harmonics) of the fundamental frequency <MathEq math="1/T" />.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <strong className="text-yellow-300">Key assumption:</strong> the signal is periodic with period <MathEq math="T" />.
            This gives us a discrete set of frequency coefficients — one per harmonic.
          </div>
        </div>
      )}

      {section === 1 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Orthogonality of Sine Waves</h3>
          <p className="text-gray-300">
            The reason Fourier decomposition <em>works</em> — and gives unique coefficients — is that sines at
            different frequencies are <strong className="text-white">orthogonal</strong>.
            Just like orthogonal basis vectors in linear algebra, you can project a signal onto each frequency
            component independently.
          </p>
          <MathEq block math="\langle f, g \rangle = \int_0^T f(t)\,g(t)\,dt = 0" />
          <p className="text-gray-400 text-sm">
            Try different frequencies below. When they differ, the product oscillates and integrates to ≈ 0.
            When they match, the product is always positive — non-zero integral.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <DesmosPlot
              lines={[{ latex: 'y=\\sin(2\\pi f t)', color: '#60a5fa' }]}
              variables={{ f: freq1 }}
              xDomain={[0, 0.04]}
              yDomain={[-1.5, 1.5]}
              height={80}
            />
            <DesmosPlot
              lines={[{ latex: 'y=\\sin(2\\pi f t)', color: '#34d399' }]}
              variables={{ f: freq2 }}
              xDomain={[0, 0.04]}
              yDomain={[-1.5, 1.5]}
              height={80}
            />
            <DesmosPlot
              lines={[{ latex: 'y=\\sin(2\\pi f t)\\cdot\\sin(2\\pi g t)', color: '#f472b6' }]}
              variables={{ f: freq1, g: freq2 }}
              xDomain={[0, 0.04]}
              yDomain={[-1.5, 1.5]}
              height={80}
            />
          </div>
          <p className="text-sm text-center font-mono">
            Inner product ≈ <span className={Math.abs(ip) < 0.01 ? 'text-green-400' : 'text-red-400'}>{ip.toFixed(4)}</span>
            {Math.abs(ip) < 0.01 ? ' ✓ orthogonal' : ' ✗ not orthogonal'}
          </p>
          <div className="flex flex-col gap-3">
            <Slider label="Frequency 1" min={50} max={500} step={50} value={freq1} onChange={setFreq1} unit="Hz" />
            <Slider label="Frequency 2" min={50} max={500} step={50} value={freq2} onChange={setFreq2} unit="Hz" />
          </div>
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <strong className="text-yellow-300">Linear algebra connection:</strong> this is exactly like dot products.
            Orthogonal basis vectors let you decompose any vector uniquely. Orthogonal frequency basis functions
            let you decompose any signal uniquely.
          </div>
        </div>
      )}

      {section === 2 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Why Complex Numbers?</h3>
          <p className="text-gray-300">
            The Fourier transform produces <strong className="text-white">complex-valued</strong> output.
            This is not a mathematical trick — it carries real information.
          </p>
          <p className="text-gray-300">
            When we measure how much of frequency <MathEq math="\omega" /> is in a signal, we need two numbers:
          </p>
          <ul className="list-disc list-inside text-gray-300 text-sm flex flex-col gap-1 ml-2">
            <li>
              <strong className="text-blue-300">Real part</strong> — correlation with <MathEq math="\cos(\omega t)" /> (the even component)
            </li>
            <li>
              <strong className="text-green-300">Imaginary part</strong> — correlation with <MathEq math="\sin(\omega t)" /> (the odd component)
            </li>
          </ul>
          <MathEq block math="X(\omega) = \underbrace{\int x(t)\cos(\omega t)\,dt}_{\text{Re}} - i\underbrace{\int x(t)\sin(\omega t)\,dt}_{\text{Im}}" />
          <MathEq block math="|X(\omega)| = \sqrt{\text{Re}^2 + \text{Im}^2} \quad \angle X(\omega) = \arctan\!\left(\frac{\text{Im}}{\text{Re}}\right)" />
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <strong className="text-yellow-300">Common misconception:</strong> "complex numbers are just a convenient notation."
            They're not — the phase information in the imaginary part is essential for reconstructing the original signal
            via the inverse Fourier transform.
          </div>
        </div>
      )}

      {section === 3 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">Euler's Formula</h3>
          <p className="text-gray-300">
            Instead of writing cosine and sine separately, we use <strong className="text-white">Euler's formula</strong>
            to unify them as a single rotating complex exponential:
          </p>
          <MathEq block math="e^{i\omega t} = \cos(\omega t) + i\sin(\omega t)" />
          <p className="text-gray-300 text-sm">
            Geometrically, <MathEq math="e^{i\omega t}" /> traces a unit circle in the complex plane.
            The real part is the x-coordinate (cosine), the imaginary part is the y-coordinate (sine).
          </p>
          <Phasor omega={omega} />
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="bg-gray-800 rounded p-2">
              <span className="text-blue-300">Re = cos(ω) = </span>
              <span className="font-mono text-blue-400">{Math.cos(omega).toFixed(3)}</span>
            </div>
            <div className="bg-gray-800 rounded p-2">
              <span className="text-green-300">Im = sin(ω) = </span>
              <span className="font-mono text-green-400">{Math.sin(omega).toFixed(3)}</span>
            </div>
          </div>
          <Slider
            label="Angle ω (radians)"
            min={0} max={6.28} step={0.05}
            value={omega}
            onChange={setOmega}
            formatValue={(v) => `${v.toFixed(2)} rad`}
          />
        </div>
      )}

      {section === 4 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-white">The Leap to the Fourier Transform</h3>
          <p className="text-gray-300">
            The Fourier Series works for periodic signals with period <MathEq math="T" />.
            But what about <strong className="text-white">aperiodic</strong> signals?
          </p>
          <p className="text-gray-300">
            We take the Fourier Series and let <MathEq math="T \to \infty" />. As the period grows:
          </p>
          <ul className="list-disc list-inside text-gray-300 text-sm flex flex-col gap-1 ml-2">
            <li>The discrete harmonics get closer and closer together</li>
            <li>The sum over discrete frequencies becomes a continuous integral</li>
            <li>Discrete coefficients <MathEq math="a_k, b_k" /> become a continuous spectrum <MathEq math="X(\omega)" /></li>
          </ul>
          <MathEq block math="X(\omega) = \int_{-\infty}^{\infty} x(t)\, e^{-i\omega t}\, dt" />
          <p className="text-gray-400 text-sm">
            Drag <MathEq math="\omega" /> to see how the correlation with the signal changes:
          </p>
          <DesmosPlot
            lines={[{ latex: 'y=\\sin(2\\pi p t)', color: '#a78bfa' }]}
            variables={{ p: omega * 50 }}
            xDomain={[0, 0.04]}
            yDomain={[-1.5, 1.5]}
            height={100}
          />
          <Slider
            label="ω (angular frequency)"
            min={0.1} max={12.56} step={0.1}
            value={omega}
            onChange={handleOmegaChange}
            formatValue={(v) => `${v.toFixed(2)} rad/s`}
          />
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
            <strong className="text-yellow-300">Summary:</strong> Fourier Series (periodic, discrete spectrum)
            → Fourier Transform (aperiodic, continuous spectrum). Both rely on orthogonality of <MathEq math="e^{i\omega t}" /> basis functions.
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={() => setSection((s) => Math.max(0, s - 1))}
          disabled={section === 0}
          className="px-4 py-2 rounded bg-gray-700 text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors text-sm"
        >
          ← Back
        </button>
        <button
          onClick={advance}
          disabled={section === 4 && !omegaInteracted}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {section < SECTIONS.length - 1 ? 'Next section →' : 'I understand — continue ✓'}
        </button>
      </div>
      {section === 4 && !omegaInteracted && (
        <p className="text-blue-400 text-sm italic text-center">Move the ω slider to continue.</p>
      )}
    </div>
  )
}
