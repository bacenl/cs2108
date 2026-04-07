import { useState } from 'react'

/**
 * Stepped wizard component.
 * Props:
 *   chapters: Array<{ title: string, component: React.ComponentType<{ onComplete: () => void }> }>
 */
export default function Wizard({ chapters }) {
  const [current, setCurrent] = useState(0)
  const [completed, setCompleted] = useState(new Set())

  const handleComplete = () => {
    setCompleted((prev) => new Set([...prev, current]))
  }

  const ChapterComponent = chapters[current].component
  const isLastChapter = current === chapters.length - 1

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {chapters.map((ch, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i <= Math.max(...[...completed, current]) && setCurrent(i)}
              className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-colors
                ${i === current ? 'bg-blue-500 text-white' : ''}
                ${completed.has(i) && i !== current ? 'bg-green-600 text-white cursor-pointer' : ''}
                ${!completed.has(i) && i !== current ? 'bg-gray-700 text-gray-400 cursor-default' : ''}
              `}
            >
              {completed.has(i) && i !== current ? '✓' : i + 1}
            </button>
            {i < chapters.length - 1 && (
              <div className={`h-1 flex-1 rounded ${i < current ? 'bg-green-600' : 'bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Chapter title */}
      <h2 className="text-xl font-semibold text-gray-100">{chapters[current].title}</h2>

      {/* Chapter content */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <ChapterComponent onComplete={handleComplete} />
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrent((c) => c - 1)}
          disabled={current === 0}
          className="px-4 py-2 rounded bg-gray-700 text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
        >
          ← Prev
        </button>

        {!isLastChapter && completed.has(current) && (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            Next →
          </button>
        )}

        {isLastChapter && completed.has(current) && (
          <span className="text-green-400 font-semibold">Complete!</span>
        )}
      </div>
    </div>
  )
}
