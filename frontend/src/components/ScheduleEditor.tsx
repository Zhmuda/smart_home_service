import { useState } from 'react'
import { cn } from '../lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'

const WEEKDAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 0, label: 'Вс' },
]

function parseCron(cron: string): { minute: number; hour: number; days: number[] } | null {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [min, hour, dom, month, dow] = parts
  if (dom !== '*' || month !== '*') return null
  if (!/^\d+$/.test(min) || !/^\d+$/.test(hour)) return null
  let days: number[]
  if (dow === '*') days = [0, 1, 2, 3, 4, 5, 6]
  else if (/^[\d,]+$/.test(dow)) days = dow.split(',').map(Number)
  else return null
  return { minute: Number(min), hour: Number(hour), days }
}

function buildCron(minute: number, hour: number, days: number[]): string {
  const dow = days.length === 7 ? '*' : [...days].sort().join(',')
  return `${minute} ${hour} * * ${dow}`
}

export default function ScheduleEditor({ cron, onChange }: { cron: string; onChange: (cron: string) => void }) {
  const parsed = parseCron(cron)
  const [advanced, setAdvanced] = useState(parsed === null)

  if (advanced) {
    return (
      <div className="flex flex-col gap-2">
        <Input value={cron} onChange={(e) => onChange(e.target.value)} placeholder="0 22 * * *" className="w-56" />
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto self-start p-0 text-xs"
          onClick={() => setAdvanced(false)}
        >
          Простой режим
        </Button>
        <p className="text-xs text-muted-foreground">
          Формат cron: минута час день месяц день-недели. Например «0 22 * * *» — каждый день в 22:00.
        </p>
      </div>
    )
  }

  const { minute, hour, days } = parsed ?? { minute: 0, hour: 9, days: [0, 1, 2, 3, 4, 5, 6] }
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

  function toggleDay(d: number) {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d]
    if (next.length === 0) return
    onChange(buildCron(minute, hour, next))
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        type="time"
        value={time}
        className="w-32"
        onChange={(e) => {
          const [h, m] = e.target.value.split(':').map(Number)
          onChange(buildCron(m, h, days))
        }}
      />
      <div className="flex gap-1.5">
        {WEEKDAYS.map((w) => (
          <button
            key={w.value}
            type="button"
            onClick={() => toggleDay(w.value)}
            className={cn(
              'h-8 w-10 rounded-md border text-xs font-medium transition-colors',
              days.includes(w.value)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background text-muted-foreground hover:bg-accent',
            )}
          >
            {w.label}
          </button>
        ))}
      </div>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto self-start p-0 text-xs"
        onClick={() => setAdvanced(true)}
      >
        Расширенный режим (cron)
      </Button>
    </div>
  )
}
