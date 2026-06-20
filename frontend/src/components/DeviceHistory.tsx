import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetchDeviceHistory } from '../api'
import { getObservableItems, type StateItem } from '../deviceItems'
import type { Device, DeviceStateEvent } from '../types'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

function toNumeric(value: unknown): number | null {
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number') return value
  return null
}

export default function DeviceHistory({ device }: { device: Device }) {
  const items = getObservableItems(device)
  const [item, setItem] = useState<StateItem | null>(items[0] ?? null)
  const [history, setHistory] = useState<DeviceStateEvent[]>([])

  useEffect(() => {
    if (!item) {
      setHistory([])
      return
    }
    fetchDeviceHistory(device.id, { capability_type: item.capability_type, instance: item.instance }).then(setHistory)
  }, [device.id, item])

  const chartData = history
    .map((e) => ({
      label: new Date(e.recorded_at).toLocaleString(),
      value: toNumeric(e.value),
      raw: e.value,
    }))
    .filter((p) => p.value !== null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label>Параметр</Label>
        <Select
          value={item ? `${item.capability_type}::${item.instance}` : undefined}
          onValueChange={(val) => {
            const found = items.find((i) => `${i.capability_type}::${i.instance}` === val)
            setItem(found ?? null)
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

      {chartData.length > 0 ? (
        <div className="rounded-lg border bg-background p-4">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" hide />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(_v, _n, p) => String(p.payload.raw)} labelFormatter={(l) => l} />
              <Line type="stepAfter" dataKey="value" stroke="hsl(142.1 70.6% 35.3%)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Нет данных за период</p>
      )}

      {history.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Когда</TableHead>
              <TableHead>Значение</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...history]
              .reverse()
              .slice(0, 20)
              .map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.recorded_at).toLocaleString()}</TableCell>
                  <TableCell>{String(e.value)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
