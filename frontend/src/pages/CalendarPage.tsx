import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { avatarColor, useProfile } from '../contexts/ProfileContext'
import { cn } from '../lib/utils'

interface CalEvent {
  id: number
  title: string
  person: string
  event_date: string
  start_time?: string
  end_time?: string
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function todayStr() {
  const d = new Date()
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

function PersonBadge({ person, small }: { person: string; small?: boolean }) {
  return (
    <span className={cn(
      'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white',
      small ? 'h-4 w-4 text-[9px]' : 'h-6 w-6 text-xs',
      avatarColor(person),
    )}>
      {person[0].toUpperCase()}
    </span>
  )
}

export default function CalendarPage() {
  const { profiles, currentUser } = useProfile()
  const today = todayStr()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [events, setEvents] = useState<CalEvent[]>([])

  // Add form state
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formPerson, setFormPerson] = useState(currentUser ?? '')
  const [formDate, setFormDate] = useState(today)
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  async function load() {
    const res = await fetch(`/api/calendar?month=${monthKey}`)
    if (res.ok) setEvents(await res.json())
  }

  useEffect(() => { load() }, [monthKey])

  async function addEvent() {
    if (!formTitle.trim() || !formPerson.trim() || !formDate) return
    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formTitle.trim(),
        person: formPerson.trim(),
        event_date: formDate,
        start_time: formStart || null,
        end_time: formEnd || null,
      }),
    })
    setFormTitle('')
    setFormStart('')
    setFormEnd('')
    setShowForm(false)
    load()
  }

  async function deleteEvent(id: number) {
    await fetch(`/api/calendar/${id}`, { method: 'DELETE' })
    load()
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday-based: 0=Mon..6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7
  const cells: Array<number | null> = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
    ...Array(totalCells - startOffset - lastDay.getDate()).fill(null),
  ]

  // Events indexed by date
  const byDate: Record<string, CalEvent[]> = {}
  for (const ev of events) {
    if (!byDate[ev.event_date]) byDate[ev.event_date] = []
    byDate[ev.event_date].push(ev)
  }

  const selectedEvents = byDate[selectedDate] ?? []

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15">
          <CalendarDays className="h-5 w-5 text-violet-500" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">Семейный календарь</h1>
          <p className="text-sm text-muted-foreground">Дела и события</p>
        </div>
        <button
          onClick={() => { setFormDate(selectedDate); setShowForm(true) }}
          className="flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-600"
        >
          <Plus className="h-4 w-4" />
          Добавить
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Календарная сетка */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          {/* Навигация по месяцам */}
          <div className="mb-4 flex items-center justify-between">
            <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-foreground">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Дни недели */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">{d}</div>
            ))}
          </div>

          {/* Ячейки */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const dateStr = toDateStr(year, month, day)
              const dayEvents = byDate[dateStr] ?? []
              const isToday = dateStr === today
              const isSelected = dateStr === selectedDate
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    'relative flex flex-col items-center rounded-xl p-1.5 transition min-h-[52px]',
                    isSelected ? 'bg-violet-500 text-white' : isToday ? 'bg-violet-500/10 text-violet-600' : 'hover:bg-muted text-foreground',
                  )}
                >
                  <span className="text-sm font-medium">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                      {dayEvents.slice(0, 4).map((ev, j) => (
                        <span
                          key={j}
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            isSelected ? 'bg-white/80' : avatarColor(ev.person).replace('bg-', 'bg-').replace('/15', ''),
                          )}
                        />
                      ))}
                      {dayEvents.length > 4 && (
                        <span className={cn('text-[9px]', isSelected ? 'text-white/80' : 'text-muted-foreground')}>
                          +{dayEvents.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Панель событий выбранного дня */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedDate === today ? 'Сегодня' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'long' })}
              </p>
            </div>
            <button
              onClick={() => { setFormDate(selectedDate); setShowForm(true) }}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {selectedEvents.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Ничего не запланировано
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selectedEvents.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
                  <PersonBadge person={ev.person} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{ev.person}</p>
                    {(ev.start_time || ev.end_time) && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-violet-500">
                        <Clock className="h-3 w-3" />
                        {ev.start_time}{ev.end_time ? ` — ${ev.end_time}` : ''}
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} className="text-muted-foreground hover:text-red-500 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Форма добавления (модальное) */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Новое дело</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Что за дело?"
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-violet-500/30"
                autoFocus
              />

              {/* Кнопки профилей + произвольный ввод */}
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Для кого</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {profiles.map(p => (
                    <button
                      key={p}
                      onClick={() => setFormPerson(p)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-sm transition',
                        formPerson === p ? `${avatarColor(p)} text-white` : 'border border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className="font-medium">{p}</span>
                    </button>
                  ))}
                </div>
                <input
                  value={formPerson}
                  onChange={e => setFormPerson(e.target.value)}
                  placeholder="Или введите имя…"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Дата</p>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">Время (необязательно)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={formStart}
                    onChange={e => setFormStart(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                  <span className="text-xs text-muted-foreground">—</span>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={e => setFormEnd(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
              </div>

              <button
                onClick={addEvent}
                disabled={!formTitle.trim() || !formPerson.trim() || !formDate}
                className="mt-1 rounded-xl bg-violet-500 py-2.5 text-sm font-medium text-white transition hover:bg-violet-600 disabled:opacity-40"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
