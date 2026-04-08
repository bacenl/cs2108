import Wizard from './components/Wizard'
import Ch0_Intro from './components/chapters/Ch0_Intro'
import Ch1_Signal from './components/chapters/Ch1_Signal'
import Ch2_Sinusoids from './components/chapters/Ch2_Sinusoids'
import Ch3_FourierSeries from './components/chapters/Ch3_FourierSeries'
import Ch4_DFT from './components/chapters/Ch4_DFT'
import Ch5_FreqBins from './components/chapters/Ch5_FreqBins'
import Ch6_Sampling from './components/chapters/Ch6_Sampling'
import Ch7_2DDFT from './components/chapters/Ch7_2DDFT'

const CHAPTERS = [
  { title: 'Introduction', component: Ch0_Intro },
  { title: '1 — What is a Signal?', component: Ch1_Signal },
  { title: '2 — Frequencies & Sinusoids', component: Ch2_Sinusoids },
  { title: '3 — From Fourier Series to the Fourier Transform', component: Ch3_FourierSeries },
  { title: '4 — The Discrete Fourier Transform', component: Ch4_DFT },
  { title: '5 — Frequency Bins in Depth', component: Ch5_FreqBins },
  { title: '6 — Sampling & the Nyquist Theorem', component: Ch6_Sampling },
  { title: '7 — 2D DFT', component: Ch7_2DDFT },
]

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold text-blue-400">Fourier Transform Explorer</h1>
        <p className="text-sm text-gray-400 mt-1">An interactive walkthrough of signal frequency analysis</p>
      </header>
      <main className="py-6">
        <Wizard chapters={CHAPTERS} />
      </main>
    </div>
  )
}
