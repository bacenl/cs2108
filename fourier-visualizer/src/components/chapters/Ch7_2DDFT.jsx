import { useState, useEffect, useCallback } from 'react'
import MathEq from '../shared/MathEq'
import PythonBlock from '../shared/PythonBlock'
import fourierImg from '../../assets/fourier.jpg'

const PYTHON_CODE = `import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import io, base64

plt.style.use('dark_background')

# _image_b64 is injected as a Python global (base64-encoded image bytes)
img_bytes = base64.b64decode(_image_b64)
img = Image.open(io.BytesIO(img_bytes)).convert('L')

# Cap at 512 px on the long side to keep the FFT fast
max_dim = 512
if max(img.width, img.height) > max_dim:
    ratio = max_dim / max(img.width, img.height)
    img = img.resize(
        (int(img.width * ratio), int(img.height * ratio)),
        Image.LANCZOS,
    )

img_arr = np.array(img, dtype=float)
h, w = img_arr.shape

# ── 2D FFT ────────────────────────────────────────────────────────────────
fft2        = np.fft.fft2(img_arr)
fft_shifted = np.fft.fftshift(fft2)          # move DC to centre
mag_log     = np.log1p(np.abs(fft_shifted))  # log scale for visibility
phase       = np.angle(fft_shifted)

# ── Plot ──────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(13, 4))

axes[0].imshow(img_arr, cmap='gray', vmin=0, vmax=255)
axes[0].set(title='Original (greyscale)', xticks=[], yticks=[])

axes[1].imshow(mag_log, cmap='magma')
axes[1].set(title='Magnitude spectrum (log, DC centred)', xticks=[], yticks=[])

axes[2].imshow(phase, cmap='hsv')
axes[2].set(title='Phase spectrum', xticks=[], yticks=[])

plt.tight_layout()
plt.show()

print(f"Image: {w} × {h} px  →  {w}×{h} = {w*h:,} complex coefficients")
print(f"DC component (centre):  {np.abs(fft_shifted[h//2, w//2]):.1f}")
print(f"Max magnitude:          {np.abs(fft_shifted).max():.1f}")
print(f"Bright centre = low-frequency content  (smooth regions, overall brightness)")
print(f"Bright edges  = high-frequency content (sharp edges, fine texture)")
`

function readFileAsBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.readAsDataURL(file)
  })
}

async function fetchAsBase64(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return readFileAsBase64(blob)
}

export default function Ch7_2DDFT({ onComplete }) {
  const [imageb64, setImageb64] = useState(null)
  const [imageLabel, setImageLabel] = useState('fourier.jpg')
  const [loadError, setLoadError] = useState(null)

  // Load the default image once on mount
  useEffect(() => {
    fetchAsBase64(fourierImg)
      .then(setImageb64)
      .catch(() => setLoadError('Could not load default image.'))
  }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const b64 = await readFileAsBase64(file)
    setImageb64(b64)
    setImageLabel(file.name)
  }

  // inject runs before the Python block: load Pillow and pass the image
  const inject = useCallback(
    async (py) => {
      await py.loadPackage(['Pillow'])
      py.globals.set('_image_b64', imageb64)
    },
    [imageb64],
  )

  return (
    <div className="flex flex-col gap-6">
      <p className="text-gray-300">
        Images are 2D signals. A greyscale image is a grid of pixel intensities — each row is a
        1D signal, and so is each column. The <strong className="text-white">2D DFT</strong> applies
        the 1D DFT to every row, then every column:
      </p>
      <MathEq
        block
        math="X[k_1,k_2]=\sum_{n_1=0}^{N_1-1}\sum_{n_2=0}^{N_2-1}x[n_1,n_2]\,e^{-i2\pi\!\left(\frac{k_1 n_1}{N_1}+\frac{k_2 n_2}{N_2}\right)}"
      />

      <div className="flex flex-col gap-3 text-sm text-gray-300">
        <div className="bg-gray-800 rounded-lg p-4">
          <strong className="text-yellow-300">Reading the spectrum:</strong>
          <ul className="list-disc list-inside mt-2 flex flex-col gap-1">
            <li>
              <strong className="text-white">Centre (DC)</strong> — average brightness of the
              entire image; always the brightest point.
            </li>
            <li>
              <strong className="text-white">Near centre</strong> — low frequencies: smooth
              gradients and large uniform regions.
            </li>
            <li>
              <strong className="text-white">Outer ring</strong> — high frequencies: sharp edges,
              fine texture, and noise.
            </li>
          </ul>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <strong className="text-yellow-300">Magnitude vs. Phase:</strong> the magnitude tells
          you <em>how much</em> of each 2D frequency is present; the phase encodes{' '}
          <em>where</em> structures are located. Swap the phases of two images and the
          reconstructed image looks like whichever image donated its phase — the eyes follow
          structure, not energy.
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <strong className="text-yellow-300">Connection to JPEG:</strong> JPEG compression uses
          the Discrete Cosine Transform (a close relative of the DFT) applied to 8×8 pixel blocks.
          High-frequency coefficients are quantised aggressively because the eye is less sensitive
          to fine detail — the same principle as dropping small-magnitude bins in Ch 4.
        </div>
      </div>

      {/* Output explanations */}
      <div className="flex flex-col gap-3 text-sm text-gray-300">
        <h3 className="text-base font-semibold text-white">Understanding the three output plots</h3>

        <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2">
          <p className="font-semibold text-gray-100">Plot 1 — Original (greyscale)</p>
          <p>
            The input image converted to a single channel where each pixel value represents
            brightness (0 = black, 255 = white). Colour information is discarded because the
            DFT treats the image as a 2D real-valued function of intensity.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2">
          <p className="font-semibold text-gray-100">Plot 2 — Magnitude spectrum (log scale, DC centred)</p>
          <p>
            Each point <MathEq math="(k_1, k_2)" /> represents a 2D spatial frequency — how
            rapidly the image intensity oscillates horizontally (<MathEq math="k_2" />) and
            vertically (<MathEq math="k_1" />). The brightness at that point is{' '}
            <MathEq math="\log(1 + |X[k_1,k_2]|)" />, telling you{' '}
            <strong className="text-white">how much</strong> of that frequency is present.
          </p>
          <ul className="list-disc list-inside flex flex-col gap-1 mt-1 ml-1 text-gray-400">
            <li><strong className="text-gray-200">Bright centre</strong> — strong low-frequency content: large uniform regions and smooth gradients.</li>
            <li><strong className="text-gray-200">Bright lines/spokes</strong> — repeated patterns or strong edges in a particular direction.</li>
            <li><strong className="text-gray-200">Dim outer ring</strong> — little high-frequency energy, meaning few sharp details or noise.</li>
          </ul>
          <p className="text-gray-400">
            Log scale is used because the DC component (centre) is orders of magnitude larger
            than the rest — without it, everything except the centre would appear black.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-2">
          <p className="font-semibold text-gray-100">Plot 3 — Phase spectrum</p>
          <p>
            The phase <MathEq math="\angle X[k_1,k_2] \in [-\pi, \pi]" /> at each frequency
            encodes <strong className="text-white">where</strong> that frequency's pattern is
            positioned in the image — it is the shift of the corresponding 2D sinusoid.
          </p>
          <p className="text-gray-400">
            Phase looks like coloured noise but carries the structural information (edges,
            shapes, object locations). A classic demonstration: if you swap the phase spectra of
            two images and reconstruct, the result looks like whichever image donated its
            phase — the visual system follows structure far more than energy.
          </p>
        </div>
      </div>

      {/* Image source controls */}
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-300">
          Current image: <span className="font-mono text-blue-300">{imageLabel}</span>
        </p>
        <label className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Upload your own:</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="text-sm text-gray-300 file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-gray-700 file:text-gray-200 file:hover:bg-gray-600 file:cursor-pointer"
          />
        </label>
      </div>

      {loadError && <p className="text-red-400 text-sm">{loadError}</p>}

      {imageb64 ? (
        <PythonBlock
          key={imageLabel}
          code={PYTHON_CODE}
          inject={inject}
          onRun={onComplete}
        />
      ) : (
        !loadError && (
          <p className="text-gray-400 text-sm italic">Loading default image…</p>
        )
      )}
    </div>
  )
}
