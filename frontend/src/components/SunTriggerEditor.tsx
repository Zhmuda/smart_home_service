import type { SunTrigger } from '../types'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

export default function SunTriggerEditor({
  trigger,
  onChange,
}: {
  trigger: SunTrigger
  onChange: (trigger: SunTrigger) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
      <div className="flex flex-col gap-1">
        <Label>Событие</Label>
        <Select value={trigger.event} onValueChange={(v) => onChange({ ...trigger, event: v as SunTrigger['event'] })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sunrise">Восход</SelectItem>
            <SelectItem value="sunset">Закат</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Смещение, мин (− раньше, + позже)</Label>
        <Input
          type="number"
          className="w-40"
          value={trigger.offset_minutes}
          onChange={(e) => onChange({ ...trigger, offset_minutes: Number(e.target.value) })}
        />
      </div>
      <p className="w-full text-xs text-muted-foreground">
        Точное время зависит от координат в .env (HOME_LATITUDE/HOME_LONGITUDE) — без них триггер не сработает.
      </p>
    </div>
  )
}
