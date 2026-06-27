import { Check, Pencil, Plus, TrendingUp, Trash2, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { avatarColor, useProfile } from '../contexts/ProfileContext'
import { cn } from '../lib/utils'
import { formatMoscow } from '../utils/time'

interface Expense { id: number; amount: number; category: string; note?: string; owner: string; created_at: string }

type Filter = 'mine' | 'common'

const CATEGORIES = ['продукты', 'кафе', 'транспорт', 'здоровье', 'развлечения', 'одежда', 'прочее']
const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280']

const CAT_COLOR: Record<string, string> = {
  продукты: 'bg-emerald-500/15 text-emerald-600',
  кафе: 'bg-amber-500/15 text-amber-600',
  транспорт: 'bg-blue-500/15 text-blue-600',
  здоровье: 'bg-red-500/15 text-red-600',
  развлечения: 'bg-purple-500/15 text-purple-600',
  одежда: 'bg-pink-500/15 text-pink-600',
  прочее: 'bg-gray-500/15 text-gray-600',
}
function catColor(cat: string) { return CAT_COLOR[cat] ?? 'bg-gray-500/15 text-gray-600' }

function monthLabel(m: string) {
  const [year, month] = m.split('-')
  return new Date(+year, +month - 1).toLocaleString('ru-RU', { month: 'short' })
}

interface EditState { id: number; amount: string; category: string; note: string }

export default function ExpensesPage() {
  const { currentUser } = useProfile()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [note, setNote] = useState('')
  const [filter, setFilter] = useState<Filter>('mine')
  const [editing, setEditing] = useState<EditState | null>(null)

  async function load() {
    const res = await fetch('/api/expenses')
    if (res.ok) setExpenses(await res.json())
  }

  useEffect(() => { load() }, [])

  async function addExpense() {
    const amt = parseInt(amount)
    if (!amt || amt <= 0) return
    const owner = filter === 'common' ? 'Общее' : (currentUser ?? 'Общее')
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, category, note: note.trim() || undefined, owner }),
    })
    setAmount('')
    setNote('')
    load()
  }

  async function deleteExpense(id: number) {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    load()
  }

  function startEdit(exp: Expense) {
    setEditing({ id: exp.id, amount: String(exp.amount), category: exp.category, note: exp.note ?? '' })
  }

  async function saveEdit() {
    if (!editing) return
    const amt = parseInt(editing.amount)
    if (!amt || amt <= 0) return
    await fetch(`/api/expenses/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, category: editing.category, note: editing.note || null }),
    })
    setEditing(null)
    load()
  }

  const filtered = filter === 'mine'
    ? expenses.filter(e => e.owner === currentUser)
    : expenses.filter(e => e.owner === 'Общее')

  const now = new Date()
  const thisMonth = filtered.filter(e => {
    const d = new Date(e.created_at + 'Z')
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const monthTotal = thisMonth.reduce((s, e) => s + e.amount, 0)

  const pieMap: Record<string, number> = {}
  thisMonth.forEach(e => { pieMap[e.category] = (pieMap[e.category] ?? 0) + e.amount })
  const pieData = Object.entries(pieMap).map(([name, value]) => ({ name, value }))

  const barMap: Record<string, number> = {}
  filtered.forEach(e => {
    const m = e.created_at.substring(0, 7)
    barMap[m] = (barMap[m] ?? 0) + e.amount
  })
  const barData = Object.entries(barMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, total]) => ({ month: monthLabel(m), total }))

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-500/15">
          <TrendingUp className="h-5 w-5 text-pink-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Расходы</h1>
          <p className="text-sm text-muted-foreground">В этом месяце: {monthTotal.toLocaleString('ru-RU')} ₽</p>
        </div>
      </div>

      <div className="mb-4 flex gap-1 rounded-2xl bg-muted p-1">
        {([['mine', 'Мои'], ['common', 'Общее']] as [Filter, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'flex-1 rounded-xl py-1.5 text-sm font-medium transition-colors',
              filter === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {(pieData.length > 0 || barData.length > 0) && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {pieData.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-foreground">Этот месяц по категориям</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toLocaleString('ru-RU')} ₽`} />
                  <Legend formatter={v => <span className="text-xs text-muted-foreground">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {barData.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-foreground">Расходы по месяцам</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}к`} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString('ru-RU')} ₽`} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                  <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-medium text-foreground">Добавить расход</p>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addExpense()}
                placeholder="Сумма"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-pink-500/30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₽</span>
            </div>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-pink-500/30"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Заметка (необязательно)"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-pink-500/30"
            />
            <button
              onClick={addExpense}
              disabled={!amount || parseInt(amount) <= 0}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-500 text-white transition hover:bg-pink-600 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Расходов пока нет</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(exp => (
              <div key={exp.id}>
                {editing?.id === exp.id ? (
                  <div className="flex flex-col gap-2 p-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          autoFocus
                          type="number"
                          value={editing.amount}
                          onChange={e => setEditing({ ...editing, amount: e.target.value })}
                          onKeyDown={e => e.key === 'Enter' && saveEdit()}
                          className="w-full rounded-xl border border-pink-400 bg-background px-3 py-1.5 pr-8 text-sm text-foreground outline-none focus:ring-2 focus:ring-pink-500/30"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₽</span>
                      </div>
                      <select
                        value={editing.category}
                        onChange={e => setEditing({ ...editing, category: e.target.value })}
                        className="rounded-xl border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={editing.note}
                        onChange={e => setEditing({ ...editing, note: e.target.value })}
                        placeholder="Заметка"
                        className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                      />
                      <button onClick={saveEdit} className="text-emerald-500 hover:text-emerald-600 transition">
                        <Check className="h-5 w-5" />
                      </button>
                      <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground transition">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${catColor(exp.category)}`}>
                      {exp.category}
                    </span>
                    <div className="flex-1 min-w-0">
                      {exp.note && <p className="truncate text-sm text-foreground">{exp.note}</p>}
                      <p className="text-xs text-muted-foreground">{formatMoscow(exp.created_at)}</p>
                    </div>
                    {exp.owner === 'Общее'
                      ? <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      : <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white', avatarColor(exp.owner))}>{exp.owner[0].toUpperCase()}</span>
                    }
                    <span className="shrink-0 font-medium text-foreground">{exp.amount.toLocaleString('ru-RU')} ₽</span>
                    <button onClick={() => startEdit(exp)} className="text-muted-foreground hover:text-pink-500 transition">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteExpense(exp.id)} className="text-muted-foreground hover:text-red-500 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
