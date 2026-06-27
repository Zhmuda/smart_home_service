import { Plus, TrendingUp, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { avatarColor, useProfile } from '../contexts/ProfileContext'
import { cn } from '../lib/utils'
import { formatMoscow } from '../utils/time'

interface Expense { id: number; amount: number; category: string; note?: string; owner: string; created_at: string }
interface CategorySummary { category: string; total: number }
interface MonthSummary { month: string; total: number }

type Filter = 'mine' | 'common' | 'all'

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
  const d = new Date(+year, +month - 1)
  return d.toLocaleString('ru-RU', { month: 'short' })
}

export default function ExpensesPage() {
  const { currentUser } = useProfile()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<CategorySummary[]>([])
  const [monthly, setMonthly] = useState<MonthSummary[]>([])
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [note, setNote] = useState('')
  const [isCommon, setIsCommon] = useState(false)
  const [filter, setFilter] = useState<Filter>('mine')

  async function load() {
    const [expRes, sumRes, monRes] = await Promise.all([
      fetch('/api/expenses'),
      fetch('/api/expenses/summary'),
      fetch('/api/expenses/monthly'),
    ])
    if (expRes.ok) setExpenses(await expRes.json())
    if (sumRes.ok) setSummary(await sumRes.json())
    if (monRes.ok) setMonthly(await monRes.json())
  }

  useEffect(() => { load() }, [])

  async function addExpense() {
    const amt = parseInt(amount)
    if (!amt || amt <= 0) return
    const owner = isCommon ? 'Общее' : (currentUser ?? 'Общее')
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

  function applyFilter(list: Expense[]) {
    if (filter === 'mine') return list.filter(e => e.owner === currentUser || e.owner === 'Общее')
    if (filter === 'common') return list.filter(e => e.owner === 'Общее')
    return list
  }

  const filtered = applyFilter(expenses)
  const monthTotal = filtered.reduce((s, e) => {
    const now = new Date()
    const d = new Date(e.created_at + 'Z')
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() ? s + e.amount : s
  }, 0)

  // Pie data from filtered current-month expenses
  const pieMap: Record<string, number> = {}
  filtered.forEach(e => {
    const d = new Date(e.created_at + 'Z')
    const now = new Date()
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      pieMap[e.category] = (pieMap[e.category] ?? 0) + e.amount
    }
  })
  const pieData = Object.entries(pieMap).map(([name, value]) => ({ name, value }))

  // Bar chart: all monthly, or filter by owner
  const barData = monthly.map(m => ({ month: monthLabel(m.month), total: m.total }))

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

      {/* Фильтр */}
      <div className="mb-4 flex gap-1 rounded-2xl bg-muted p-1">
        {([['mine', 'Мои'], ['common', 'Общее'], ['all', 'Все']] as [Filter, string][]).map(([key, label]) => (
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

      {/* Графики */}
      {(pieData.length > 0 || barData.length > 0) && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {/* Круговая — категории этого месяца */}
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

          {/* Столбчатый — по месяцам */}
          {barData.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-foreground">Расходы по месяцам</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}к`} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString('ru-RU')} ₽`} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                  <Bar dataKey="total" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Форма добавления */}
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
          <button
            onClick={() => setIsCommon(v => !v)}
            className={cn(
              'flex items-center gap-2 self-start rounded-xl px-3 py-1.5 text-sm transition',
              isCommon ? 'bg-pink-500/15 text-pink-600 font-medium' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Users className="h-3.5 w-3.5" />
            {isCommon ? 'Общий расход' : 'Личный расход'}
          </button>
        </div>
      </div>

      {/* История */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Расходов пока нет</div>
        ) : (
          filtered.map((exp, i) => (
            <div key={exp.id} className={`flex items-center gap-3 px-4 py-3 ${i < filtered.length - 1 ? 'border-b border-border' : ''}`}>
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
              <button onClick={() => deleteExpense(exp.id)} className="text-muted-foreground hover:text-red-500 transition">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
