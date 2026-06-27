import { Bell, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatMoscow, moscowInputToUtc, nowMoscowInput, utcToMoscowInput } from '../utils/time'

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

async function updateReminder(id: number, subject: string, remind_at: string): Promise<void> {
  await fetch(`/api/reminders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, remind_at }),
  })
}

async function deleteReminder(id: number): Promise<void> {
  await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
}

const INPUT_CLS = 'rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

function ReminderCard({
  reminder,
  onDelete,
  onSave,
}: {
  reminder: Reminder
  onDelete: (id: number) => void
  onSave: (id: number, subject: string, remindAt: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState(reminder.subject)
  const [remindAt, setRemindAt] = useState(() => utcToMoscowInput(reminder.remind_at))
  const [saving, setSaving] = useState(false)

  const handleEdit = () => {
    setSubject(reminder.subject)
    setRemindAt(utcToMoscowInput(reminder.remind_at))
    setEditing(true)
  }

  const handleSave = async () => {
    if (!subject.trim() || !remindAt) return
    setSaving(true)
    await onSave(reminder.id, subject.trim(), moscowInputToUtc(remindAt))
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => {
    setSubject(reminder.subject)
    setRemindAt(utcToMoscowInput(reminder.remind_at))
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-ring/50 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Название"
            className={`${INPUT_CLS} w-full`}
            autoFocus
          />
          <input
            type="datetime-local"
            value={remindAt}
            onChange={e => setRemindAt(e.target.value)}
            className={INPUT_CLS}
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Сохранить
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Отмена
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md ${reminder.sent ? 'opacity-50' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium text-foreground ${reminder.sent ? 'line-through' : ''}`}>
          {reminder.subject}
        </div>
        <div className="text-xs text-muted-foreground">{formatMoscow(reminder.remind_at)}</div>
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-1">
        {!reminder.sent && (
          <button
            onClick={handleEdit}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Редактировать"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(reminder.id)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="Удалить"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

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
    setRemindAt(nowMoscowInput())
    load()
  }

  const handleDelete = async (id: number) => {
    await deleteReminder(id)
    setReminders(r => r.filter(x => x.id !== id))
  }

  const handleSave = async (id: number, subject: string, remindAt: string) => {
    await updateReminder(id, subject, remindAt)
    load()
  }

  const pending = reminders.filter(r => !r.sent)
  const sent = reminders.filter(r => r.sent)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-500/15 shadow-sm">
          <Bell className="h-5 w-5 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Напоминания</h1>
          <p className="text-sm text-muted-foreground">Голосом через Алису или вручную</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 text-sm font-medium text-foreground">Новое напоминание</div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="О чём напомнить?"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className={`${INPUT_CLS} flex-1`}
          />
          <input
            type="datetime-local"
            value={remindAt}
            onChange={e => setRemindAt(e.target.value)}
            className={INPUT_CLS}
          />
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Голосом: «Алиса, напомни» → «купить молоко» → «через 30 минут» · Редактировать: «измени напоминание»
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
                  <ReminderCard key={r.id} reminder={r} onDelete={handleDelete} onSave={handleSave} />
                ))}
              </div>
            </div>
          )}

          {sent.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Выполненные</div>
              <div className="flex flex-col gap-2">
                {sent.slice(0, 10).map(r => (
                  <ReminderCard key={r.id} reminder={r} onDelete={handleDelete} onSave={handleSave} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
