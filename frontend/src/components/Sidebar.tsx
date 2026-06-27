import { BarChart3, Bell, ChevronLeft, ChevronRight, Home, Menu, Mic, Moon, Sun, Workflow, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useSidebar } from '../contexts/SidebarContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLive } from '../contexts/LiveContext'
import { cn } from '../lib/utils'
import NotificationBell from './NotificationBell'

const NAV = [
  { to: '/', label: 'Устройства', icon: Home, end: true },
  { to: '/scenarios', label: 'Сценарии', icon: Workflow, end: false },
  { to: '/stats', label: 'Статистика', icon: BarChart3, end: false },
  { to: '/reminders', label: 'Напоминания', icon: Bell, end: false },
  { to: '/alice', label: 'Навык Алисы', icon: Mic, end: false },
]

const STALE_AFTER_SECONDS = 70

function ConnectionStatus({ collapsed }: { collapsed: boolean }) {
  const { status } = useLive()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!status || !status.last_poll_at) {
    return (
      <div className="flex items-center gap-2 px-2 text-xs text-sidebar-muted">
        <span className="h-2 w-2 shrink-0 rounded-full bg-gray-400" />
        {!collapsed && 'Подключение…'}
      </div>
    )
  }

  const secondsAgo = Math.max(0, Math.round((now - new Date(status.last_poll_at).getTime()) / 1000))
  const isStale = !status.ok || secondsAgo > STALE_AFTER_SECONDS

  return (
    <div className="flex flex-col gap-0.5 px-2 text-xs">
      <div className={cn('flex items-center gap-2', isStale ? 'text-red-400' : 'text-sidebar-muted')}>
        <span className={cn('h-2 w-2 shrink-0 rounded-full', isStale ? 'bg-red-500' : 'bg-emerald-500')} />
        {!collapsed && (status.ok ? `Обновлено ${secondsAgo} сек назад` : 'Нет связи с Yandex API')}
      </div>
      {!collapsed && status.last_error && (
        <div className="truncate text-red-400" title={status.last_error}>{status.last_error}</div>
      )}
    </div>
  )
}

function SidebarContent() {
  const { collapsed, toggleCollapsed, closeMobile } = useSidebar()
  const { theme, toggle: toggleTheme } = useTheme()

  return (
    <aside
      className={cn(
        'flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex items-center px-4 py-5', collapsed ? 'justify-center' : 'justify-between')}>
        {!collapsed && (
          <div>
            <div className="text-base font-semibold text-white">Умный дом</div>
            <div className="text-xs text-sidebar-muted">Личный дашборд</div>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          className="hidden rounded-lg p-1.5 text-sidebar-muted hover:bg-white/10 hover:text-white md:flex"
          title={collapsed ? 'Развернуть' : 'Свернуть'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        <button
          onClick={closeMobile}
          className="rounded-lg p-1.5 text-sidebar-muted hover:bg-white/10 hover:text-white md:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={closeMobile}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-sidebar-accent text-white shadow-sm'
                  : 'text-sidebar-muted hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 px-2 py-4">
        <NotificationBell collapsed={collapsed} />

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white',
            collapsed && 'justify-center px-2',
          )}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {!collapsed && (theme === 'dark' ? 'Светлая тема' : 'Тёмная тема')}
        </button>

        <ConnectionStatus collapsed={collapsed} />
      </div>
    </aside>
  )
}

export default function Sidebar() {
  const { mobileOpen, closeMobile, openMobile } = useSidebar()

  return (
    <>
      <button
        onClick={openMobile}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar text-white shadow-lg md:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={closeMobile} />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent />
      </div>

      <div className="hidden shrink-0 md:flex">
        <SidebarContent />
      </div>
    </>
  )
}
