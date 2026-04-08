/**
 * Cooley-Tukey iterative in-place FFT.
 * Modifies re[] and im[] in place. N must be a power of 2.
 */
function fftInPlace(re, im) {
  const N = re.length

  // Bit-reversal permutation
  let j = 0
  for (let i = 1; i < N; i++) {
    let bit = N >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }

  // Butterfly operations
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    for (let i = 0; i < N; i += len) {
      let curRe = 1,
        curIm = 0
      for (let k = 0; k < len / 2; k++) {
        const uRe = re[i + k]
        const uIm = im[i + k]
        const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm
        const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe
        re[i + k] = uRe + vRe
        im[i + k] = uIm + vIm
        re[i + k + len / 2] = uRe - vRe
        im[i + k + len / 2] = uIm - vIm
        const nextRe = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nextRe
      }
    }
  }
}

/**
 * Compute the FFT of a real-valued sample array.
 * samples.length must be a power of 2.
 * Returns { re: Float64Array, im: Float64Array }
 */
export function computeFFT(samples) {
  const N = samples.length
  const re = new Float64Array(samples)
  const im = new Float64Array(N)
  fftInPlace(re, im)
  return { re, im }
}

/**
 * Compute the FFT of a complex-valued input.
 * Both reIn and imIn must have the same power-of-2 length.
 * Returns { re: Float64Array, im: Float64Array }
 */
export function computeFFTComplex(reIn, imIn) {
  const N = reIn.length
  const re = new Float64Array(reIn)
  const im = new Float64Array(imIn)
  fftInPlace(re, im)
  return { re, im }
}

/**
 * Returns the magnitude spectrum for the positive-frequency bins only (N/2 values).
 * Normalised by N so amplitudes are independent of window size.
 */
export function magnitudeSpectrum(samples) {
  const { re, im } = computeFFT(samples)
  const N = samples.length
  return Array.from({ length: N / 2 }, (_, i) =>
    Math.sqrt(re[i] * re[i] + im[i] * im[i]) / N
  )
}

/**
 * Returns the Hz value of each positive-frequency bin.
 * binFrequencies(N, sampleRate)[k] = k * sampleRate / N
 */
export function binFrequencies(N, sampleRate) {
  return Array.from({ length: N / 2 }, (_, i) => (i * sampleRate) / N)
}

/**
 * Clamps n to the nearest power of 2 within [min, max].
 */
export function clampToPowerOf2(n, min = 256, max = 8192) {
  const p = Math.pow(2, Math.round(Math.log2(n)))
  return Math.min(Math.max(p, min), max)
}
