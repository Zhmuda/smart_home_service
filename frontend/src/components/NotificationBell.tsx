import { Bell, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLive } from '../contexts/LiveContext'
import { cn } from '../lib/utils'

export default function NotificationBell({ collapsed }: { collapsed: boolean }) {
  const { notifications, clearNotifications } = useLive()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const count = notifications.length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="Уведомления"
        className={cn(
          'relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-white/5 hover:text-white',
          collapsed && 'justify-center px-2',
          open && 'bg-white/5 text-white',
        )}
      >
        <Bell className="h-4 w-4 shrink-0" />
        {!collapsed && 'Уведомления'}
        {count > 0 && (
          <span className="absolute right-2 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-full mb-1 ml-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-sidebar shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-sm font-medium text-white">Напоминания</span>
            {count > 0 && (
              <button
                onClick={clearNotifications}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-sidebar-muted hover:bg-white/10 hover:text-white"
              >
                <X className="h-3 w-3" />
                Очистить
              </button>
            )}
          </div>

          {count === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-sidebar-muted">
              Нет новых уведомлений
            </div>
          ) : (
            <div className="flex max-h-64 flex-col overflow-y-auto">
              {[...notifications].reverse().map((n, i) => (
                <div key={`${n.id}-${i}`} className="border-b border-white/5 px-4 py-3 last:border-0">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    <div>
                      <div className="text-sm text-white">{n.subject}</div>
                      <div className="text-xs text-sidebar-muted">
                        {new Date(n.receivedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
