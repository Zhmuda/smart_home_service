import { useEffect, useState } from 'react'
import { fetchAllRuns, fetchDevices } from '../api'
import { getStatusLabel } from '../capabilityLabels'
import DeviceHistory from '../components/DeviceHistory'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import type { Device, ScenarioRun } from '../types'

const STATUS_VARIANT: Record<string, 'default' | 'destructive' | 'secondary'> = {
  ok: 'default',
  error: 'destructive',
  condition_not_met: 'secondary',
}

export default function StatsPage() {
  const [runs, setRuns] = useState<ScenarioRun[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchAllRuns(100), fetchDevices()])
      .then(([runList, info]) => {
        setRuns(runList)
        setDevices(info.devices)
      })
      .catch((e) => setError(e.message))
  }, [])

  const device = devices.find((d) => d.id === deviceId) ?? null

  if (error) return <div className="p-8 text-destructive">Ошибка: {error}</div>

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Статистика и логи</h1>
        <p className="text-sm text-muted-foreground">График изменений по любому устройству и журнал всех срабатываний сценариев.</p>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">История состояний устройства</h2>
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex flex-col gap-1">
              <Label>Устройство</Label>
              <Select value={deviceId || undefined} onValueChange={setDeviceId}>
                <SelectTrigger className="w-56">
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

            {device && <DeviceHistory device={device} />}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Последние срабатывания сценариев</h2>
        <Card>
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Когда</TableHead>
                  <TableHead>Сценарий</TableHead>
                  <TableHead>Триггер</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.triggered_at).toLocaleString()}</TableCell>
                    <TableCell>#{r.scenario_id}</TableCell>
                    <TableCell>{r.trigger_kind}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status] ?? 'outline'}>{getStatusLabel(r.status)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {runs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Пока нет ни одного срабатывания
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
