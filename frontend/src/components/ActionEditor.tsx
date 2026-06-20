import { X } from 'lucide-react'
import { getControllableItems } from '../deviceItems'
import type { ActionItem, Device } from '../types'
import StatePicker from './StatePicker'
import { Button } from './ui/button'
import { Label } from './ui/label'
import ValueEditor from './ValueEditor'

export default function ActionEditor({
  devices,
  action,
  onChange,
  onRemove,
}: {
  devices: Device[]
  action: ActionItem
  onChange: (action: ActionItem) => void
  onRemove?: () => void
}) {
  const device = devices.find((d) => d.id === action.device_id)
  const items = device ? getControllableItems(device) : []
  const current = items.find((i) => i.capability_type === action.type && i.instance === action.instance)

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
      <StatePicker
        devices={devices}
        mode="controllable"
        deviceId={action.device_id}
        capabilityType={action.type}
        instance={action.instance}
        onChange={(deviceId, type, instance, currentValue) =>
          onChange({ ...action, device_id: deviceId, type, instance, value: currentValue })
        }
      />
      <div className="flex flex-col gap-1">
        <Label>Установить значение</Label>
        <ValueEditor
          value={action.value}
          capabilityType={action.type}
          instance={action.instance}
          parameters={current?.parameters}
          onChange={(v) => onChange({ ...action, value: v })}
        />
      </div>
      {onRemove && (
        <Button type="button" variant="ghost" size="icon" className="ml-auto text-muted-foreground" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
