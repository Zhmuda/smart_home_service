import { useEffect, useState } from 'react'
import { fetchScenarioRuns } from '../api'
import { getStatusLabel } from '../capabilityLabels'
import type { ScenarioRun } from '../types'
import { Badge } from './ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

const STATUS_VARIANT: Record<string, 'default' | 'destructive' | 'secondary'> = {
  ok: 'default',
  error: 'destructive',
  condition_not_met: 'secondary',
}

export default function ScenarioRunsList({ scenarioId }: { scenarioId: number }) {
  const [runs, setRuns] = useState<ScenarioRun[] | null>(null)

  useEffect(() => {
    setRuns(null)
    fetchScenarioRuns(scenarioId).then(setRuns)
  }, [scenarioId])

  if (runs === null) return <p className="text-sm text-muted-foreground">Загрузка…</p>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Когда</TableHead>
          <TableHead>Триггер</TableHead>
          <TableHead>Статус</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{new Date(r.triggered_at).toLocaleString()}</TableCell>
            <TableCell>{r.trigger_kind}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[r.status] ?? 'outline'}>{getStatusLabel(r.status)}</Badge>
            </TableCell>
          </TableRow>
        ))}
        {runs.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="text-center text-muted-foreground">
              Пока не запускался
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
