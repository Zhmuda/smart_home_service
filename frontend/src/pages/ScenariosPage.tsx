import { Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createScenario, deleteScenario, fetchDevices, fetchScenarios, runScenarioNow, updateScenario } from '../api'
import { getOperatorLabel, getStateLabel, getStatusLabel } from '../capabilityLabels'
import InstructionPanel from '../components/InstructionPanel'
import ScenarioForm from '../components/ScenarioForm'
import ScenarioRunsList from '../components/ScenarioRunsList'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Switch } from '../components/ui/switch'
import type { Device, Scenario, ScenarioInput, Trigger } from '../types'

const TRIGGER_ICON: Record<Trigger['kind'], string> = {
  manual: '👆',
  schedule: '⏰',
  device_state: '📡',
  sun: '🌅',
}

const SUN_EVENT_LABEL: Record<'sunrise' | 'sunset', string> = {
  sunrise: 'восход',
  sunset: 'закат',
}

const STATUS_VARIANT: Record<string, 'default' | 'destructive' | 'secondary'> = {
  ok: 'default',
  error: 'destructive',
  condition_not_met: 'secondary',
}

function formatValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'вкл' : 'выкл'
  return String(value)
}

function summarizeTrigger(t: Trigger, devices: Device[]): string {
  if (t.kind === 'manual') return 'Запуск вручную'
  if (t.kind === 'schedule') return `По расписанию: ${t.cron}`
  if (t.kind === 'sun') {
    const sign = t.offset_minutes === 0 ? '' : t.offset_minutes > 0 ? ` +${t.offset_minutes} мин` : ` ${t.offset_minutes} мин`
    return `${SUN_EVENT_LABEL[t.event]}${sign}`
  }
  const device = devices.find((d) => d.id === t.device_id)
  return `${device?.name ?? '?'} — ${getStateLabel(t.capability_type, t.instance)} ${getOperatorLabel(t.operator)} ${formatValue(t.value)}`
}

export default function ScenariosPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<'new' | number | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [lastRunStatus, setLastRunStatus] = useState<Record<number, string>>({})

  async function reload() {
    const [info, list] = await Promise.all([fetchDevices(), fetchScenarios()])
    setDevices(info.devices)
    setScenarios(list)
  }

  useEffect(() => {
    reload().catch((e) => setError(e.message))
  }, [])

  async function handleCreate(input: ScenarioInput) {
    await createScenario(input)
    setEditing(null)
    await reload()
  }

  async function handleUpdate(id: number, input: ScenarioInput) {
    await updateScenario(id, input)
    setEditing(null)
    await reload()
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить сценарий?')) return
    await deleteScenario(id)
    await reload()
  }

  async function handleToggle(scenario: Scenario) {
    await updateScenario(scenario.id, {
      name: scenario.name,
      enabled: !scenario.enabled,
      trigger: scenario.trigger,
      conditions: scenario.conditions,
      actions: scenario.actions,
    })
    await reload()
  }

  async function handleRun(id: number) {
    const run = await runScenarioNow(id)
    setLastRunStatus((s) => ({ ...s, [id]: run.status }))
  }

  if (error) return <div className="p-8 text-destructive">Ошибка: {error}</div>

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Сценарии</h1>
          <p className="text-sm text-muted-foreground">
            Правила «Если — То»: вручную, по времени или по датчикам, с историей и графиками.
          </p>
        </div>
        <Button onClick={() => setEditing('new')} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Новый сценарий
        </Button>
      </div>

      {editing === 'new' && <ScenarioForm devices={devices} onSubmit={handleCreate} onCancel={() => setEditing(null)} />}

      <div className="mt-6 flex flex-col gap-4">
        {scenarios.length === 0 && editing !== 'new' && (
          <p className="text-sm text-muted-foreground">Сценариев пока нет — нажмите «Новый сценарий», чтобы создать первый.</p>
        )}
        {scenarios.map((s) => (
          <div key={s.id}>
            {editing === s.id ? (
              <ScenarioForm
                devices={devices}
                initial={s}
                onSubmit={(input) => handleUpdate(s.id, input)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-lg">{TRIGGER_ICON[s.trigger.kind]}</span>
                    <strong className="text-sm">{s.name}</strong>
                    <Switch checked={s.enabled} onCheckedChange={() => handleToggle(s)} className="ml-1" />
                  </div>
                  <div className="mb-3 text-sm text-muted-foreground">{summarizeTrigger(s.trigger, devices)}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleRun(s.id)}>
                      <Play className="h-3.5 w-3.5" />
                      Запустить
                    </Button>
                    {lastRunStatus[s.id] && (
                      <Badge variant={STATUS_VARIANT[lastRunStatus[s.id]] ?? 'outline'}>
                        {getStatusLabel(lastRunStatus[s.id])}
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(s.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Изменить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Удалить
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                      {expanded === s.id ? 'Скрыть историю' : 'История'}
                    </Button>
                  </div>
                  {expanded === s.id && (
                    <div className="mt-3">
                      <ScenarioRunsList scenarioId={s.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>

      <InstructionPanel />
    </div>
  )
}
