import { useEffect, useRef, useState } from 'react'
import MathEq from '../shared/MathEq'
import { computeFFT, computeFFTComplex } from '../../hooks/useDFT'

const IMAGE_URL = '/fourier-visualizer/default_image.png'

function getGreyscalePixels(imageData) {
  const { data, width, height } = imageData
  const pixels = []
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      row.push((data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255)
    }
    pixels.push(row)
  }
  return { pixels, width, height }
}

function compute2DFFT(pixels, width, height) {
  // Step 1: FFT each row
  const intermediate = pixels.map((row) => {
    const { re, im } = computeFFT(row)
    return { re: Array.from(re), im: Array.from(im) }
  })

  // Step 2: FFT each column
  const outRe = Array.from({ length: height }, () => new Float64Array(width))
  const outIm = Array.from({ length: height }, () => new Float64Array(width))

  for (let x = 0; x < width; x++) {
    const colRe = intermediate.map((row) => row.re[x])
    const colIm = intermediate.map((row) => row.im[x])
    const { re, im } = computeFFTComplex(colRe, colIm)
    for (let y = 0; y < height; y++) {
      outRe[y][x] = re[y]
      outIm[y][x] = im[y]
    }
  }

  return { outRe, outIm }
}

function renderSpectrum(canvas, outRe, outIm, width, height) {
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(width, height)

  let maxLog = 0
  const logMags = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const re = outRe[y][x], im = outIm[y][x]
      const v = Math.log(1 + Math.sqrt(re * re + im * im))
      if (v > maxLog) maxLog = v
      return v
    })
  )

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = (x + width / 2) % width
      const sy = (y + height / 2) % height
      const brightness = Math.round((logMags[y][x] / maxLog) * 255)
      const i = (sy * width + sx) * 4
      imageData.data[i] = brightness
      imageData.data[i + 1] = brightness
      imageData.data[i + 2] = brightness
      imageData.data[i + 3] = 255
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

export default function Ch7_2DDFT({ onComplete }) {
  const originalCanvasRef = useRef(null)
  const spectrumCanvasRef = useRef(null)
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = IMAGE_URL
    img.onload = () => {
      setStatus('computing')

      const offscreen = document.createElement('canvas')
      offscreen.width = img.width
      offscreen.height = img.height
      const offCtx = offscreen.getContext('2d')
      offCtx.drawImage(img, 0, 0)

      const origCanvas = originalCanvasRef.current
      origCanvas.width = img.width
      origCanvas.height = img.height
      origCanvas.getContext('2d').drawImage(img, 0, 0)

      const imageData = offCtx.getImageData(0, 0, img.width, img.height)
      const { pixels, width, height } = getGreyscalePixels(imageData)

      setTimeout(() => {
        try {
          const { outRe, outIm } = compute2DFFT(pixels, width, height)
          renderSpectrum(spectrumCanvasRef.current, outRe, outIm, width, height)
          setStatus('done')
          onComplete()
        } catch {
          setStatus('error')
        }
      }, 50)
    }
    img.onerror = () => setStatus('error')
  }, [onComplete])

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-300">
        Images are 2D signals. A greyscale image is a grid of pixel intensities — each row is a 1D signal,
        and so is each column. The <strong className="text-white">2D DFT</strong> applies the 1D DFT to every
        row, then every column:
      </p>
      <MathEq block math="X[k_1, k_2] = \sum_{n_1=0}^{N_1-1} \sum_{n_2=0}^{N_2-1} x[n_1, n_2]\, e^{-i2\pi\left(\frac{k_1 n_1}{N_1} + \frac{k_2 n_2}{N_2}\right)}" />

      {status === 'error' && (
        <p className="text-red-400 text-sm">Could not load default_image.png. Check that the file exists in public/.</p>
      )}
      {status === 'computing' && (
        <p className="text-blue-400 text-sm">Computing 2D FFT…</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Original image</h3>
          <canvas ref={originalCanvasRef} className="w-full rounded border border-gray-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
            2D frequency spectrum (log magnitude, DC centred)
          </h3>
          <canvas ref={spectrumCanvasRef} className="w-full rounded border border-gray-700" />
        </div>
      </div>

      {status === 'done' && (
        <div className="flex flex-col gap-3 text-sm text-gray-300">
          <div className="bg-gray-800 rounded-lg p-4">
            <strong className="text-yellow-300">Reading the spectrum:</strong>
            <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
              <li><strong className="text-white">Centre</strong> — DC component (average brightness). Always the brightest point.</li>
              <li><strong className="text-white">Near centre</strong> — low frequencies: smooth gradients, large uniform regions.</li>
              <li><strong className="text-white">Outer edges</strong> — high frequencies: sharp edges, fine texture, noise.</li>
            </ul>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <strong className="text-yellow-300">Connection to 1D DFT:</strong> everything you learned about bins,
            frequency resolution, and orthogonality applies in both directions independently.
            Image compression (JPEG) uses a related transform (DCT) applied to 8×8 pixel blocks.
          </div>
        </div>
      )}
    </div>
  )
}
