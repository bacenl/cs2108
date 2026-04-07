import { useRef, useCallback, useState } from 'react'

/**
 * useAudio — wraps Web Audio API for:
 *   - Synthesized tone playback (array of {frequency, amplitude})
 *   - AudioBuffer playback (decoded from file)
 *   - Real-time AnalyserNode data for waveform visualization
 */
export function useAudio() {
  const ctxRef = useRef(null)
  const analyserRef = useRef(null)
  const activeNodesRef = useRef([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [supported, setSupported] = useState(true)

  const getCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) {
      setSupported(false)
      return null
    }
    ctxRef.current = new Ctx()
    analyserRef.current = ctxRef.current.createAnalyser()
    analyserRef.current.fftSize = 2048
    analyserRef.current.connect(ctxRef.current.destination)
    return ctxRef.current
  }, [])

  const stop = useCallback(() => {
    activeNodesRef.current.forEach((n) => {
      try { n.stop() } catch (_) { /* already stopped */ }
      try { n.disconnect() } catch (_) { /* already disconnected */ }
    })
    activeNodesRef.current = []
    setIsPlaying(false)
  }, [])

  /**
   * Play synthesized tones.
   * @param {Array<{frequency: number, amplitude: number}>} oscillators
   */
  const playSynthesized = useCallback(
    (oscillators) => {
      const ctx = getCtx()
      if (!ctx) return
      stop()

      const masterGain = ctx.createGain()
      masterGain.gain.value = 0.4 / Math.max(oscillators.length, 1)
      masterGain.connect(analyserRef.current)

      const oscNodes = oscillators.map(({ frequency, amplitude }) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = frequency
        gain.gain.value = Math.max(0, Math.min(1, amplitude))
        osc.connect(gain)
        gain.connect(masterGain)
        osc.start()
        return osc
      })

      activeNodesRef.current = oscNodes
      setIsPlaying(true)
    },
    [getCtx, stop]
  )

  /**
   * Play a decoded AudioBuffer.
   */
  const playBuffer = useCallback(
    (audioBuffer) => {
      const ctx = getCtx()
      if (!ctx) return
      stop()

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(analyserRef.current)
      source.onended = () => setIsPlaying(false)
      source.start()
      activeNodesRef.current = [source]
      setIsPlaying(true)
    },
    [getCtx, stop]
  )

  /**
   * Decode an ArrayBuffer (from FileReader or fetch) into an AudioBuffer.
   * Returns null if unsupported.
   */
  const decodeAudioFile = useCallback(
    async (arrayBuffer) => {
      const ctx = getCtx()
      if (!ctx) return null
      return ctx.decodeAudioData(arrayBuffer)
    },
    [getCtx]
  )

  /**
   * Get current time-domain data from the analyser (Uint8Array, length 2048).
   * Returns null if audio context not yet initialised.
   */
  const getTimeDomainData = useCallback(() => {
    if (!analyserRef.current) return null
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteTimeDomainData(data)
    return data
  }, [])

  return {
    supported,
    isPlaying,
    playSynthesized,
    playBuffer,
    stop,
    decodeAudioFile,
    getTimeDomainData,
  }
}
