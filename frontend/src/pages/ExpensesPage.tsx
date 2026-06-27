import { Plus, TrendingUp, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatMoscow } from '../utils/time'

interface Expense { id: number; amount: number; category: string; note?: string; created_at: string }
interface CategorySummary { category: string; total: number }

const CATEGORIES = ['продукты', 'кафе', 'транспорт', 'здоровье', 'развлечения', 'одежда', 'прочее']
const CATEGORY_COLORS: Record<string, string> = {
  продукты: 'bg-emerald-500/15 text-emerald-600',
  кафе: 'bg-amber-500/15 text-amber-600',
  транспорт: 'bg-blue-500/15 text-blue-600',
  здоровье: 'bg-red-500/15 text-red-600',
  развлечения: 'bg-purple-500/15 text-purple-600',
  одежда: 'bg-pink-500/15 text-pink-600',
  прочее: 'bg-gray-500/15 text-gray-600',
}

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-gray-500/15 text-gray-600'
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<CategorySummary[]>([])
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [note, setNote] = useState('')

  async function load() {
    const [expRes, sumRes] = await Promise.all([fetch('/api/expenses'), fetch('/api/expenses/summary')])
    if (expRes.ok) setExpenses(await expRes.json())
    if (sumRes.ok) setSummary(await sumRes.json())
  }

  useEffect(() => { load() }, [])

  async function addExpense() {
    const amt = parseInt(amount)
    if (!amt || amt <= 0) return
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, category, note: note.trim() || undefined }),
    })
    if (res.ok) {
      setAmount('')
      setNote('')
      load()
    }
  }

  async function deleteExpense(id: number) {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    load()
  }

  const monthTotal = summary.reduce((sum, c) => sum + c.total, 0)

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
        </div>
      </div>

      {/* Итоги по категориям */}
      {summary.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-3 text-sm font-medium text-foreground">Этот месяц по категориям</p>
          <div className="flex flex-col gap-2">
            {summary.map(row => (
              <div key={row.category} className="flex items-center gap-3">
                <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${categoryColor(row.category)}`}>
                  {row.category}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-muted h-1.5">
                  <div
                    className="h-full rounded-full bg-pink-500 transition-all"
                    style={{ width: `${Math.min(100, (row.total / monthTotal) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 text-sm font-medium text-foreground">{row.total.toLocaleString('ru-RU')} ₽</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* История */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {expenses.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Расходов пока нет</div>
        ) : (
          expenses.map((exp, i) => (
            <div key={exp.id} className={`flex items-center gap-3 px-4 py-3 ${i < expenses.length - 1 ? 'border-b border-border' : ''}`}>
              <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${categoryColor(exp.category)}`}>
                {exp.category}
              </span>
              <div className="flex-1 min-w-0">
                {exp.note && <p className="truncate text-sm text-foreground">{exp.note}</p>}
                <p className="text-xs text-muted-foreground">{formatMoscow(exp.created_at)}</p>
              </div>
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
