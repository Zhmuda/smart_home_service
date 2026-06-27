import { Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatMoscow } from '../utils/time'

interface Saving { id: number; amount: number; note?: string; created_at: string }
interface Goal { name: string; target?: number }
interface Overview { total: number; goal: Goal | null; items: Saving[] }

export default function SavingsPage() {
  const [data, setData] = useState<Overview>({ total: 0, goal: null, items: [] })
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [editGoal, setEditGoal] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')

  async function load() {
    const res = await fetch('/api/savings')
    if (res.ok) {
      const d: Overview = await res.json()
      setData(d)
      setGoalName(d.goal?.name ?? '')
      setGoalTarget(d.goal?.target?.toString() ?? '')
    }
  }

  useEffect(() => { load() }, [])

  async function addSaving() {
    const amt = parseInt(amount)
    if (!amt || amt <= 0) return
    await fetch('/api/savings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, note: note.trim() || undefined }),
    })
    setAmount('')
    setNote('')
    load()
  }

  async function deleteSaving(id: number) {
    await fetch(`/api/savings/${id}`, { method: 'DELETE' })
    load()
  }

  async function saveGoal() {
    if (!goalName.trim()) return
    await fetch('/api/savings/goal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: goalName.trim(),
        target: goalTarget ? parseInt(goalTarget) : null,
      }),
    })
    setEditGoal(false)
    load()
  }

  const pct = data.goal?.target ? Math.min(100, Math.round((data.total / data.goal.target) * 100)) : null
  const left = data.goal?.target ? Math.max(0, data.goal.target - data.total) : null

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15">
          <PiggyBank className="h-5 w-5 text-rose-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Копилка</h1>
          <p className="text-sm text-muted-foreground">
            {data.goal ? `${data.goal.name}` : 'Без цели'}
          </p>
        </div>
      </div>

      {/* Прогресс */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-1 flex items-end justify-between">
          <span className="text-3xl font-bold text-foreground">{data.total.toLocaleString('ru-RU')} ₽</span>
          {data.goal?.target && (
            <span className="text-sm text-muted-foreground">из {data.goal.target.toLocaleString('ru-RU')} ₽</span>
          )}
        </div>

        {pct !== null && (
          <>
            <div className="my-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-rose-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{pct}% накоплено</span>
              {left !== null && <span>осталось {left.toLocaleString('ru-RU')} ₽</span>}
            </div>
          </>
        )}

        <button
          onClick={() => setEditGoal(v => !v)}
          className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
        >
          <Pencil className="h-3 w-3" />
          {data.goal ? 'Изменить цель' : 'Задать цель'}
        </button>

        {editGoal && (
          <div className="mt-3 flex flex-col gap-2">
            <input
              value={goalName}
              onChange={e => setGoalName(e.target.value)}
              placeholder="Название цели"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-rose-500/30"
            />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={goalTarget}
                  onChange={e => setGoalTarget(e.target.value)}
                  placeholder="Сумма цели"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-rose-500/30"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₽</span>
              </div>
              <button
                onClick={saveGoal}
                disabled={!goalName.trim()}
                className="rounded-xl bg-rose-500 px-4 text-sm font-medium text-white transition hover:bg-rose-600 disabled:opacity-40"
              >
                Сохранить
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Форма пополнения */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-foreground">Пополнить</p>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSaving()}
                placeholder="Сумма"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₽</span>
            </div>
            <button
              onClick={addSaving}
              disabled={!amount || parseInt(amount) <= 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white transition hover:bg-rose-600 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Заметка (необязательно)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>
      </div>

      {/* История пополнений */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {data.items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Пополнений пока нет</div>
        ) : (
          data.items.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${i < data.items.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="flex-1 min-w-0">
                {s.note && <p className="truncate text-sm text-foreground">{s.note}</p>}
                <p className="text-xs text-muted-foreground">{formatMoscow(s.created_at)}</p>
              </div>
              <span className="shrink-0 font-medium text-rose-500">+{s.amount.toLocaleString('ru-RU')} ₽</span>
              <button onClick={() => deleteSaving(s.id)} className="text-muted-foreground hover:text-red-500 transition">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
