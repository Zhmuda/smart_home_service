import { getControllableItems, getObservableItems } from '../deviceItems'
import type { Device } from '../types'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export default function StatePicker({
  devices,
  mode,
  deviceId,
  capabilityType,
  instance,
  onChange,
}: {
  devices: Device[]
  mode: 'observable' | 'controllable'
  deviceId: string
  capabilityType: string
  instance: string
  onChange: (deviceId: string, capabilityType: string, instance: string, currentValue: unknown) => void
}) {
  const device = devices.find((d) => d.id === deviceId)
  const items = device ? (mode === 'observable' ? getObservableItems(device) : getControllableItems(device)) : []

  return (
    <>
      <div className="flex flex-col gap-1">
        <Label>Устройство</Label>
        <Select
          value={deviceId || undefined}
          onValueChange={(val) => {
            const d = devices.find((x) => x.id === val)
            const first = d ? (mode === 'observable' ? getObservableItems(d) : getControllableItems(d))[0] : undefined
            onChange(val, first?.capability_type ?? '', first?.instance ?? '', first?.currentValue)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="выберите…" />
          </SelectTrigger>
          <SelectContent>
            {devices.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Параметр</Label>
        <Select
          value={capabilityType && instance ? `${capabilityType}::${instance}` : undefined}
          disabled={!device}
          onValueChange={(val) => {
            const [ct, inst] = val.split('::')
            const item = items.find((i) => i.capability_type === ct && i.instance === inst)
            onChange(deviceId, ct, inst, item?.currentValue)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="выберите…" />
          </SelectTrigger>
          <SelectContent>
            {items.map((i) => (
              <SelectItem key={`${i.capability_type}::${i.instance}`} value={`${i.capability_type}::${i.instance}`}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
