import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts'

/**
 * Frequency-domain magnitude spectrum plot.
 * Props:
 *   magnitudes: number[]   — magnitude per bin (length N/2)
 *   frequencies: number[]  — Hz value per bin (length N/2)
 *   height: number         — chart height in px (default 200)
 *   color: string          — bar color (default '#34d399')
 *   nyquist: number        — if provided, draws a vertical reference line
 *   maxFreq: number        — x-axis max (default: last frequency value)
 *   annotatedBins: Array<{binIndex: number, label: string}> — optional bin labels
 */
export default function SpectrumPlot({
  magnitudes,
  frequencies,
  height = 200,
  color = '#34d399',
  nyquist,
  maxFreq,
  annotatedBins = [],
}) {
  const data = magnitudes.map((mag, i) => ({
    freq: frequencies[i] !== undefined ? Math.round(frequencies[i]) : i,
    mag,
    label: annotatedBins.find((b) => b.binIndex === i)?.label,
  }))

  const xMax = maxFreq ?? (frequencies.length > 0 ? frequencies[frequencies.length - 1] : undefined)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="freq"
          stroke="#9ca3af"
          tick={{ fontSize: 10 }}
          type="number"
          domain={[0, xMax]}
          label={{
            value: 'Frequency (Hz)',
            position: 'insideBottomRight',
            offset: -5,
            fill: '#9ca3af',
            fontSize: 11,
          }}
        />
        <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151' }}
          labelStyle={{ color: '#d1d5db' }}
          formatter={(v) => [v.toFixed(4), 'Magnitude']}
          labelFormatter={(v) => `${v} Hz`}
        />
        {nyquist && (
          <ReferenceLine
            x={nyquist}
            stroke="#f87171"
            strokeDasharray="4 4"
            label={{ value: 'Nyquist', fill: '#f87171', fontSize: 11 }}
          />
        )}
        <Bar dataKey="mag" fill={color} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}
