import { BarChart3, Home, Workflow } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../lib/utils'

const NAV = [
  { to: '/', label: 'Устройства', icon: Home, end: true },
  { to: '/scenarios', label: 'Сценарии', icon: Workflow, end: false },
  { to: '/stats', label: 'Статистика', icon: BarChart3, end: false },
]

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
    </aside>
  )
}
