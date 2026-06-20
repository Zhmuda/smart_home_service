import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Slider } from './ui/slider'
import { Switch } from './ui/switch'

interface RangeParams {
  min: number
  max: number
  precision?: number
  unit?: string
}

interface ModeOption {
  value: string
}

export default function ValueEditor({
  value,
  onChange,
  capabilityType,
  instance,
  parameters,
}: {
  value: unknown
  onChange: (value: unknown) => void
  capabilityType?: string
  instance?: string
  parameters?: Record<string, unknown>
}) {
  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={value} onCheckedChange={(v) => onChange(v)} />
        <span className="text-sm text-muted-foreground">{value ? 'Вкл' : 'Выкл'}</span>
      </div>
    )
  }

  if (capabilityType === 'devices.capabilities.mode' && Array.isArray(parameters?.modes)) {
    const modes = parameters.modes as ModeOption[]
    return (
      <Select value={value != null ? String(value) : undefined} onValueChange={(v) => onChange(v)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {modes.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (capabilityType === 'devices.capabilities.range' && parameters?.range) {
    const range = parameters.range as RangeParams
    const num = typeof value === 'number' ? value : range.min
    return (
      <div className="flex w-48 items-center gap-3">
        <Slider
          min={range.min}
          max={range.max}
          step={range.precision ?? 1}
          value={[num]}
          onValueChange={([v]) => onChange(v)}
        />
        <span className="w-10 text-right text-sm font-medium tabular-nums">{num}</span>
      </div>
    )
  }

  if (capabilityType === 'devices.capabilities.color_setting' && instance === 'temperature_k' && parameters?.temperature_k) {
    const range = parameters.temperature_k as RangeParams
    const num = typeof value === 'number' ? value : range.min
    return (
      <div className="flex w-52 items-center gap-3">
        <Slider min={range.min} max={range.max} step={100} value={[num]} onValueChange={([v]) => onChange(v)} />
        <span className="w-14 text-right text-sm font-medium tabular-nums">{num}K</span>
      </div>
    )
  }

  if (typeof value === 'number') {
    return <Input type="number" className="w-24" value={value} onChange={(e) => onChange(e.target.valueAsNumber)} />
  }

  return (
    <Input
      type="text"
      className="w-40"
      value={value == null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
