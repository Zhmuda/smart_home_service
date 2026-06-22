import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchScenarios, sendAction } from '../api'
import { getOperatorLabel, getStateLabel } from '../capabilityLabels'
import DeviceHistory from '../components/DeviceHistory'
import ScenarioRunsList from '../components/ScenarioRunsList'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import ValueEditor from '../components/ValueEditor'
import { useLive } from '../contexts/LiveContext'
import { getControllableItems } from '../deviceItems'
import type { Device, Scenario } from '../types'

function referencesDevice(scenario: Scenario, deviceId: string): boolean {
  const t = scenario.trigger
  if (t.kind === 'device_state' && t.device_id === deviceId) return true
  if (scenario.conditions.some((g) => g.rules.some((r) => r.device_id === deviceId))) return true
  if (scenario.actions.some((a) => a.device_id === deviceId)) return true
  return false
}

export default function DeviceDetailPage() {
  const { deviceId } = useParams<{ deviceId: string }>()
  const { devices: liveData } = useLive()
  const [override, setOverride] = useState<Device | null>(null)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [expanded, setExpanded] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const liveDevice = liveData?.devices.find((d) => d.id === deviceId) ?? null
  const device = override ?? liveDevice
  const room = liveData?.rooms.find((r) => r.devices.includes(deviceId ?? '')) ?? null

  useEffect(() => {
    setOverride(null)
  }, [liveDevice])

  useEffect(() => {
    fetchScenarios()
      .then((list) => setScenarios(list.filter((s) => deviceId && referencesDevice(s, deviceId))))
      .catch((e) => setError(e.message))
  }, [deviceId])

  async function handleAction(item: ReturnType<typeof getControllableItems>[number], value: unknown) {
    if (!device) return
    try {
      await sendAction(device.id, item.capability_type, item.instance, value)
      setOverride({
        ...device,
        capabilities: device.capabilities.map((c) =>
          c.type === item.capability_type && c.state?.instance === item.instance
            ? { ...c, state: { instance: item.instance, value } }
            : c,
        ),
      })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (error) return <div className="p-8 text-destructive">Ошибка: {error}</div>
  if (!device) return <div className="p-8 text-muted-foreground">Загрузка…</div>

  const controllable = getControllableItems(device)

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/" className="mb-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Все устройства
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{device.name}</h1>
        <p className="text-sm text-muted-foreground">
          {room?.name ? `${room.name} · ` : ''}
          {device.type.replace('devices.types.', '')}
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">Управление</h2>
        {controllable.length === 0 && <p className="text-sm text-muted-foreground">У этого устройства нет управляемых параметров</p>}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {controllable.map((item) => (
            <Card key={`${item.capability_type}::${item.instance}`}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="text-sm font-medium">{item.label}</div>
                <ValueEditor
                  value={item.currentValue}
                  capabilityType={item.capability_type}
                  instance={item.instance}
                  parameters={item.parameters}
                  onChange={(v) => handleAction(item, v)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">История и график</h2>
        <DeviceHistory device={device} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">Связанные сценарии</h2>
        {scenarios.length === 0 && <p className="text-sm text-muted-foreground">Это устройство не используется ни в одном сценарии</p>}
        <div className="flex flex-col gap-4">
          {scenarios.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="mb-1 flex items-center gap-2">
                  <strong className="text-sm">{s.name}</strong>
                  <Badge variant={s.enabled ? 'default' : 'secondary'}>{s.enabled ? 'включён' : 'выключен'}</Badge>
                </div>
                <div className="mb-3 text-sm text-muted-foreground">
                  {s.trigger.kind === 'manual' && 'Запуск вручную'}
                  {s.trigger.kind === 'schedule' && `По расписанию: ${s.trigger.cron}`}
                  {s.trigger.kind === 'device_state' &&
                    `${getStateLabel(s.trigger.capability_type, s.trigger.instance)} ${getOperatorLabel(s.trigger.operator)} ${String(s.trigger.value)}`}
                </div>
                <Button variant="outline" size="sm" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  {expanded === s.id ? 'Скрыть историю' : 'История запусков'}
                </Button>
                {expanded === s.id && (
                  <div className="mt-3">
                    <ScenarioRunsList scenarioId={s.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
