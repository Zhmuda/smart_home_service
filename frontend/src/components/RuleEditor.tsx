import { X } from 'lucide-react'
import { getOperatorLabel } from '../capabilityLabels'
import { getObservableItems } from '../deviceItems'
import type { Device, Operator, Rule } from '../types'
import StatePicker from './StatePicker'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import ValueEditor from './ValueEditor'

const OPERATORS: Operator[] = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte']

export default function RuleEditor({
  devices,
  rule,
  onChange,
  onRemove,
  showDuration = false,
}: {
  devices: Device[]
  rule: Rule
  onChange: (rule: Rule) => void
  onRemove?: () => void
  showDuration?: boolean
}) {
  const device = devices.find((d) => d.id === rule.device_id)
  const items = device ? getObservableItems(device) : []
  const current = items.find((i) => i.capability_type === rule.capability_type && i.instance === rule.instance)

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
      <StatePicker
        devices={devices}
        mode="observable"
        deviceId={rule.device_id}
        capabilityType={rule.capability_type}
        instance={rule.instance}
        onChange={(deviceId, capability_type, instance, currentValue) =>
          onChange({ ...rule, device_id: deviceId, capability_type, instance, value: currentValue })
        }
      />
      <div className="flex flex-col gap-1">
        <Label>Условие</Label>
        <Select value={rule.operator} onValueChange={(v) => onChange({ ...rule, operator: v as Operator })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((o) => (
              <SelectItem key={o} value={o}>
                {getOperatorLabel(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Значение</Label>
        <ValueEditor
          value={rule.value}
          capabilityType={rule.capability_type}
          instance={rule.instance}
          parameters={current?.parameters}
          onChange={(v) => onChange({ ...rule, value: v })}
        />
      </div>
      {showDuration && (
        <div className="flex flex-col gap-1">
          <Label>Не менее, сек</Label>
          <Input
            type="number"
            min={1}
            className="w-28"
            placeholder="сразу"
            value={rule.for_seconds ?? ''}
            onChange={(e) =>
              onChange({ ...rule, for_seconds: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
        </div>
      )}
      {onRemove && (
        <Button type="button" variant="ghost" size="icon" className="ml-auto text-muted-foreground" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
