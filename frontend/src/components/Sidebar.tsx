import { BarChart3, Home, Workflow } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useLive } from '../contexts/LiveContext'
import { cn } from '../lib/utils'

const NAV = [
  { to: '/', label: 'Устройства', icon: Home, end: true },
  { to: '/scenarios', label: 'Сценарии', icon: Workflow, end: false },
  { to: '/stats', label: 'Статистика', icon: BarChart3, end: false },
]

const STALE_AFTER_SECONDS = 70

function ConnectionStatus() {
  const { status } = useLive()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!status || !status.last_poll_at) {
    return (
      <div className="flex items-center gap-2 px-2 text-xs text-sidebar-muted">
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        Подключение…
      </div>
    )
  }

  const secondsAgo = Math.max(0, Math.round((now - new Date(status.last_poll_at).getTime()) / 1000))
  const isStale = !status.ok || secondsAgo > STALE_AFTER_SECONDS

  return (
    <div className="flex flex-col gap-0.5 px-2 text-xs">
      <div className={cn('flex items-center gap-2', isStale ? 'text-red-400' : 'text-sidebar-muted')}>
        <span className={cn('h-2 w-2 rounded-full', isStale ? 'bg-red-500' : 'bg-emerald-500')} />
        {status.ok ? `Обновлено ${secondsAgo} сек назад` : 'Нет связи с Yandex API'}
      </div>
      {status.last_error && <div className="truncate text-red-400" title={status.last_error}>{status.last_error}</div>}
    </div>
  )
}

export default function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-6">
        <div className="text-lg font-semibold text-white">Умный дом</div>
        <div className="text-xs text-sidebar-muted">Личный дашборд</div>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-sidebar-accent text-white' : 'text-sidebar-muted hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-3 py-4">
        <ConnectionStatus />
      </div>
    </aside>
  )
}
