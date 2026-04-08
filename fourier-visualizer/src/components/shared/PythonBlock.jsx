import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { usePyodide } from '../../hooks/usePyodide'

const STATUS_LABEL = {
  idle: '▶ Run',
  loading: 'Loading Python...',
  running: 'Running...',
  ready: '▶ Run',
  error: '▶ Run',
}

/**
 * PythonBlock — editable Python code block with in-browser execution via Pyodide.
 * Captures matplotlib figures and stdout, displays them below the editor.
 *
 * Props:
 *   code: string     — initial Python code
 *   inject: fn       — async (pyodide) => void, called before running
 *   onResult: fn     — async (pyodide) => void, called after running
 */
export default function PythonBlock({ code: initialCode, inject, onResult, onRun }) {
  const [code, setCode] = useState(initialCode)
  const [output, setOutput] = useState(null)
  const { status, runCode } = usePyodide()

  const busy = status === 'loading' || status === 'running'

  const handleRun = async () => {
    try {
      const result = await runCode(code, { inject, onResult })
      setOutput(result)
      if (onRun) onRun(result)
    } catch (e) {
      const err = { stdout: '', images: [], error: e.message }
      setOutput(err)
      if (onRun) onRun(err)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg overflow-hidden border border-gray-700">
        <div className="flex items-center justify-between bg-gray-800 px-3 py-1.5 border-b border-gray-700">
          <span className="text-xs text-gray-400 font-mono">python</span>
          <button
            onClick={handleRun}
            disabled={busy}
            className="px-3 py-1 rounded bg-green-700 hover:bg-green-600 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {STATUS_LABEL[status]}
          </button>
        </div>
        <CodeMirror
          value={code}
          onChange={setCode}
          extensions={[python()]}
          theme={vscodeDark}
          basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
          style={{ fontSize: '13px' }}
        />
      </div>

      {output && (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-700 bg-gray-900 p-3">
          {output.error && (
            <pre className="text-red-400 text-xs whitespace-pre-wrap font-mono">
              {output.error}
            </pre>
          )}
          {output.stdout && (
            <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap">
              {output.stdout}
            </pre>
          )}
          {output.images.map((img, i) => (
            <img
              key={i}
              src={`data:image/png;base64,${img}`}
              alt={`Plot ${i + 1}`}
              className="rounded max-w-full"
            />
          ))}
          {!output.error && !output.stdout && output.images.length === 0 && (
            <p className="text-gray-500 text-xs italic">No output.</p>
          )}
        </div>
      )}
    </div>
  )
}
