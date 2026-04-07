import { describe, it, expect } from 'vitest'
import { computeFFT, magnitudeSpectrum, binFrequencies, clampToPowerOf2 } from '../src/hooks/useDFT'

describe('computeFFT', () => {
  it('transforms a DC signal: all energy in bin 0', () => {
    const N = 8
    const samples = new Array(N).fill(1.0)
    const { re, im } = computeFFT(samples)
    expect(re[0]).toBeCloseTo(N, 5)
    expect(im[0]).toBeCloseTo(0, 5)
    for (let i = 1; i < N; i++) {
      expect(Math.abs(re[i])).toBeCloseTo(0, 5)
      expect(Math.abs(im[i])).toBeCloseTo(0, 5)
    }
  })

  it('transforms a single-frequency sine: peak at correct bin', () => {
    const N = 64
    const k = 3
    const samples = Array.from({ length: N }, (_, n) =>
      Math.sin(2 * Math.PI * k * n / N)
    )
    const mags = magnitudeSpectrum(samples)
    const peakBin = mags.indexOf(Math.max(...mags))
    expect(peakBin).toBe(k)
  })

  it('magnitudeSpectrum returns N/2 values', () => {
    const N = 128
    const samples = new Array(N).fill(0)
    const mags = magnitudeSpectrum(samples)
    expect(mags).toHaveLength(N / 2)
  })
})

describe('binFrequencies', () => {
  it('bin 0 is 0 Hz', () => {
    const freqs = binFrequencies(256, 44100)
    expect(freqs[0]).toBe(0)
  })

  it('bin spacing equals sampleRate / N', () => {
    const N = 256, sampleRate = 44100
    const freqs = binFrequencies(N, sampleRate)
    expect(freqs[1] - freqs[0]).toBeCloseTo(sampleRate / N, 5)
  })

  it('last bin is just below Nyquist (sampleRate / 2)', () => {
    const N = 256, sampleRate = 44100
    const freqs = binFrequencies(N, sampleRate)
    expect(freqs[freqs.length - 1]).toBeLessThan(sampleRate / 2)
  })
})

describe('clampToPowerOf2', () => {
  it('returns value clamped to nearest power of 2 within [min, max]', () => {
    expect(clampToPowerOf2(300, 256, 8192)).toBe(256)
    expect(clampToPowerOf2(500, 256, 8192)).toBe(512)
    expect(clampToPowerOf2(10000, 256, 8192)).toBe(8192)
    expect(clampToPowerOf2(100, 256, 8192)).toBe(256)
  })
})
