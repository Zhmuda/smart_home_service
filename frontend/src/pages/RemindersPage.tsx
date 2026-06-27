import { Bell, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatMoscow, moscowInputToUtc, nowMoscowInput } from '../utils/time'

interface Reminder {
  id: number
  subject: string
  remind_at: string
  sent: boolean
  created_at: string
}

async function fetchReminders(): Promise<Reminder[]> {
  const res = await fetch('/api/reminders')
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

async function createReminder(subject: string, remind_at: string): Promise<void> {
  await fetch('/api/reminders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, remind_at }),
  })
}

async function deleteReminder(id: number): Promise<void> {
  await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
}

const formatDateTime = formatMoscow

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [subject, setSubject] = useState('')
  const [remindAt, setRemindAt] = useState(nowMoscowInput)
  const [loading, setLoading] = useState(true)

  const load = () => fetchReminders().then(setReminders).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !remindAt) return
    await createReminder(subject.trim(), moscowInputToUtc(remindAt))
    setSubject('')
    setRemindAt('')
    load()
  }

  const handleDelete = async (id: number) => {
    await deleteReminder(id)
    setReminders(r => r.filter(x => x.id !== id))
  }

  const pending = reminders.filter(r => !r.sent)
  const sent = reminders.filter(r => r.sent)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/20">
          <Bell className="h-5 w-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Напоминания</h1>
          <p className="text-sm text-muted-foreground">Голосом через Алису или вручную</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 text-sm font-medium text-foreground">Новое напоминание</div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="О чём напомнить?"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="datetime-local"
            value={remindAt}
            onChange={e => setRemindAt(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Или голосом: «Алиса, напомни» → «купить молоко» → «через 30 минут»
        </p>
      </form>

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : (
        <>
          {pending.length === 0 && sent.length === 0 && (
            <p className="text-sm text-muted-foreground">Нет напоминаний</p>
          )}

          {pending.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Активные</div>
              <div className="flex flex-col gap-2">
                {pending.map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{r.subject}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(r.remind_at)}</div>
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sent.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Выполненные</div>
              <div className="flex flex-col gap-2">
                {sent.slice(0, 10).map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 opacity-50">
                    <div>
                      <div className="text-sm font-medium text-foreground line-through">{r.subject}</div>
                      <div className="text-xs text-muted-foreground">{formatDateTime(r.remind_at)}</div>
                    </div>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
