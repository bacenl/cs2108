import { useState, useCallback } from 'react'

let _pyodide = null
let _initPromise = null

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = () => reject(new Error('Failed to load ' + src))
    document.head.appendChild(s)
  })
}

async function initPyodide() {
  if (_pyodide) return _pyodide
  if (!_initPromise) {
    _initPromise = (async () => {
      await loadScript('https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js')
      const py = await window.loadPyodide()
      await py.loadPackage(['numpy', 'matplotlib'])
      _pyodide = py
      return py
    })()
  }
  return _initPromise
}

// Injected before user code each run: redirect stdout, set up capture vars
const PREAMBLE = `
import sys as _sys, io as _io, base64 as _b64
import matplotlib as _mpl
_mpl.use('Agg')
import matplotlib.pyplot as _plt
_out = _io.StringIO()
_sys.stdout = _out
`

// Run after user code: restore stdout, collect matplotlib figures as base64 PNGs
const CAPTURE = `
_sys.stdout = _sys.__stdout__
_imgs = []
for _n in _plt.get_fignums():
    _buf = _io.BytesIO()
    _plt.figure(_n).savefig(_buf, format='png', dpi=150,
        bbox_inches='tight', facecolor='#111827', edgecolor='none')
    _buf.seek(0)
    _imgs.append(_b64.b64encode(_buf.read()).decode())
_plt.close('all')
import json as _json
_json.dumps({'stdout': _out.getvalue(), 'images': _imgs})
`

export function usePyodide() {
  const [status, setStatus] = useState('idle') // idle | loading | running | ready | error

  const runCode = useCallback(async (code, { inject, onResult } = {}) => {
    const py = _pyodide ?? await (async () => {
      setStatus('loading')
      try {
        return await initPyodide()
      } catch (e) {
        setStatus('error')
        throw new Error('Could not load Python runtime: ' + e.message)
      }
    })()

    setStatus('running')
    if (inject) await inject(py)
    await py.runPythonAsync(PREAMBLE)

    let userError = null
    try {
      await py.runPythonAsync(code)
    } catch (e) {
      userError = e.message
      try { await py.runPythonAsync('_sys.stdout = _sys.__stdout__') } catch {}
    }

    try {
      const jsonStr = await py.runPythonAsync(CAPTURE)
      const { stdout, images } = JSON.parse(jsonStr)
      if (onResult) await onResult(py)
      setStatus('ready')
      return { stdout: stdout ?? '', images: images ?? [], error: userError }
    } catch (e) {
      setStatus('ready')
      return { stdout: '', images: [], error: userError ?? e.message }
    }
  }, [])

  return { status, runCode }
}
