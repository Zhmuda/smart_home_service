import { cn } from '../lib/utils'
import type { Device, Trigger } from '../types'
import RuleEditor from './RuleEditor'
import ScheduleEditor from './ScheduleEditor'
import SunTriggerEditor from './SunTriggerEditor'

const KINDS: { value: Trigger['kind']; icon: string; label: string; hint: string }[] = [
  { value: 'manual', icon: '👆', label: 'Вручную', hint: 'Запускаете кнопкой, когда нужно' },
  { value: 'schedule', icon: '⏰', label: 'По времени', hint: 'В заданное время и дни недели' },
  { value: 'device_state', icon: '📡', label: 'По датчику', hint: 'Когда устройство изменит состояние' },
  { value: 'sun', icon: '🌅', label: 'Закат/восход', hint: 'По астрономическому времени' },
]

export default function TriggerEditor({
  devices,
  trigger,
  onChange,
}: {
  devices: Device[]
  trigger: Trigger
  onChange: (trigger: Trigger) => void
}) {
  function setKind(kind: Trigger['kind']) {
    if (kind === 'manual') onChange({ kind: 'manual' })
    else if (kind === 'schedule') onChange({ kind: 'schedule', cron: '0 22 * * *' })
    else if (kind === 'sun') onChange({ kind: 'sun', event: 'sunset', offset_minutes: 0 })
    else onChange({ kind: 'device_state', device_id: '', capability_type: '', instance: '', operator: 'eq', value: true })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={cn(
              'flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors',
              trigger.kind === k.value ? 'border-primary bg-primary/5' : 'border-input bg-background hover:bg-accent',
            )}
          >
            <span className="text-lg">{k.icon}</span>
            <span className="text-sm font-medium">{k.label}</span>
            <span className="text-xs text-muted-foreground">{k.hint}</span>
          </button>
        ))}
      </div>

      {trigger.kind === 'schedule' && (
        <ScheduleEditor cron={trigger.cron} onChange={(cron) => onChange({ ...trigger, cron })} />
      )}

      {trigger.kind === 'device_state' && (
        <RuleEditor devices={devices} rule={trigger} onChange={(rule) => onChange({ kind: 'device_state', ...rule })} />
      )}

      {trigger.kind === 'sun' && <SunTriggerEditor trigger={trigger} onChange={onChange} />}
    </div>
  )
}
