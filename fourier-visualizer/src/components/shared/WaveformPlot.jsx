import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

/**
 * Time-domain waveform plot.
 * Props:
 *   samples: number[]   — amplitude values
 *   sampleRate: number  — used to label x-axis in seconds (optional)
 *   height: number      — chart height in px (default 200)
 *   color: string       — line color (default '#60a5fa')
 *   yDomain: [number, number] — y-axis domain (default [-1.5, 1.5])
 */
export default function WaveformPlot({
  samples,
  sampleRate,
  height = 200,
  color = '#60a5fa',
  yDomain = [-1.5, 1.5],
}) {
  const data = samples.map((v, i) => ({
    t: sampleRate ? Number((i / sampleRate).toFixed(4)) : i,
    v,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="t"
          stroke="#9ca3af"
          tick={{ fontSize: 11 }}
          label={{
            value: sampleRate ? 'Time (s)' : 'Sample',
            position: 'insideBottomRight',
            offset: -5,
            fill: '#9ca3af',
            fontSize: 11,
          }}
        />
        <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} domain={yDomain} />
        <Tooltip
          contentStyle={{ background: '#1f2937', border: '1px solid #374151' }}
          labelStyle={{ color: '#d1d5db' }}
          itemStyle={{ color: color }}
        />
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          dot={false}
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
