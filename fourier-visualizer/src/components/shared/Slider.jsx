/**
 * Labeled range slider.
 * Props:
 *   label: string
 *   min, max, step: number
 *   value: number
 *   onChange: (value: number) => void
 *   unit: string (optional, e.g. "Hz")
 *   formatValue: (value: number) => string (optional)
 */
export default function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = '',
  formatValue,
}) {
  const display = formatValue ? formatValue(value) : value
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between text-sm text-gray-300">
        <span>{label}</span>
        <span className="font-mono text-blue-400">
          {display}
          {unit && ` ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}{unit && ` ${unit}`}</span>
        <span>{max}{unit && ` ${unit}`}</span>
      </div>
    </div>
  )
}
