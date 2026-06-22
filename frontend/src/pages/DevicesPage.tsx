import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sendAction } from '../api'
import { getDeviceStateLabel } from '../capabilityLabels'
import ValueEditor from '../components/ValueEditor'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { useLive } from '../contexts/LiveContext'
import type { Device, UserInfo } from '../types'

const ON_OFF = 'devices.capabilities.on_off'

function onOffCapability(device: Device) {
  return device.capabilities.find((c) => c.type === ON_OFF)
}

function DeviceCard({
  device,
  onToggle,
}: {
  device: Device
  onToggle: (device: Device, next: boolean) => void
}) {
  const onOff = onOffCapability(device)
  const isOn = Boolean(onOff?.state?.value)

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-4">
        <Link to={`/devices/${device.id}`} className="group">
          <div className="flex items-center gap-2">
            <div className="font-medium group-hover:text-primary group-hover:underline">{device.name}</div>
            {device.state && device.state !== 'online' && (
              <Badge variant="destructive">{getDeviceStateLabel(device.state)}</Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{device.type.replace('devices.types.', '')}</div>
        </Link>
        {onOff ? (
          <ValueEditor value={isOn} capabilityType={ON_OFF} instance="on" onChange={(v) => onToggle(device, Boolean(v))} />
        ) : (
          <span className="text-xs text-muted-foreground">нет управления</span>
        )}
      </CardContent>
    </Card>
  )
}

export default function DevicesPage() {
  const { devices: liveData } = useLive()
  const [override, setOverride] = useState<UserInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const data = override ?? liveData

  useEffect(() => {
    setOverride(null)
  }, [liveData])

  async function handleToggle(device: Device, next: boolean) {
    if (!data) return
    setOverride({
      ...data,
      devices: data.devices.map((d) =>
        d.id === device.id
          ? {
              ...d,
              capabilities: d.capabilities.map((c) =>
                c.type === ON_OFF ? { ...c, state: { instance: 'on', value: next } } : c,
              ),
            }
          : d,
      ),
    })
    try {
      await sendAction(device.id, ON_OFF, 'on', next)
    } catch (e) {
      setError((e as Error).message)
      setOverride(null)
    }
  }

  if (error) return <div className="p-8 text-destructive">Ошибка: {error}</div>
  if (!data) return <div className="p-8 text-muted-foreground">Загрузка…</div>

  const devicesById = new Map(data.devices.map((d) => [d.id, d]))

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Устройства</h1>
        <p className="text-sm text-muted-foreground">Текущее состояние и быстрое управление по комнатам.</p>
      </div>
      {data.rooms.map((room) => (
        <section key={room.id} className="mb-8">
          <h2 className="mb-3 text-base font-semibold">{room.name}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {room.devices.map((deviceId) => {
              const device = devicesById.get(deviceId)
              if (!device) return null
              return <DeviceCard key={device.id} device={device} onToggle={handleToggle} />
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
