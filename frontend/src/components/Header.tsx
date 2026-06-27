import { BarChart3, Bell, CalendarDays, Home, Menu, Mic, Moon, PiggyBank, ShoppingCart, Sun, TrendingUp, Workflow, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { avatarColor, useProfile } from '../contexts/ProfileContext'
import { useLive } from '../contexts/LiveContext'
import { useTheme } from '../contexts/ThemeContext'
import { cn } from '../lib/utils'
import NotificationBell from './NotificationBell'

const NAV = [
  { to: '/', label: 'Устройства', icon: Home, end: true },
  { to: '/scenarios', label: 'Сценарии', icon: Workflow, end: false },
  { to: '/stats', label: 'Статистика', icon: BarChart3, end: false },
  { to: '/reminders', label: 'Напоминания', icon: Bell, end: false },
  { to: '/shopping', label: 'Покупки', icon: ShoppingCart, end: false },
  { to: '/expenses', label: 'Расходы', icon: TrendingUp, end: false },
  { to: '/savings', label: 'Копилка', icon: PiggyBank, end: false },
  { to: '/calendar', label: 'Календарь', icon: CalendarDays, end: false },
  { to: '/alice', label: 'Алиса', icon: Mic, end: false },
]

function ConnectionDot() {
  const { status } = useLive()
  if (!status?.last_poll_at) return <span className="h-2 w-2 rounded-full bg-gray-500" title="Подключение…" />
  const isOk = status.ok
  return (
    <span
      className={cn('h-2 w-2 rounded-full', isOk ? 'bg-emerald-400' : 'bg-red-500')}
      title={isOk ? 'Связь с Yandex API есть' : status.last_error ?? 'Нет связи с Yandex API'}
    />
  )
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const { currentUser, openPicker } = useProfile()

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-white/10 bg-sidebar px-4 gap-2">
        {/* Логотип */}
        <div className="mr-4 shrink-0">
          <span className="text-base font-semibold text-white">Умный дом</span>
        </div>

        {/* Навигация — десктоп */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-white'
                    : 'text-sidebar-muted hover:bg-white/5 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Правая часть */}
        <div className="ml-auto flex items-center gap-2">
          <ConnectionDot />
          <NotificationBell />
          {currentUser && (
            <button
              onClick={openPicker}
              title={`Профиль: ${currentUser}`}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white transition hover:opacity-80 ${avatarColor(currentUser)}`}
            >
              {currentUser[0].toUpperCase()}
            </button>
          )}
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-sidebar-muted hover:bg-white/5 hover:text-white transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Гамбургер — мобильный */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-sidebar-muted hover:bg-white/5 hover:text-white transition-colors md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Мобильное меню */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
          <nav className="fixed left-0 right-0 top-14 z-20 flex flex-col gap-1 border-b border-white/10 bg-sidebar p-3 md:hidden">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-white'
                      : 'text-sidebar-muted hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
    </>
  )
}
