import { apiFetch } from '../lib/api'
import { Check, ChevronDown, ChevronUp, Pencil, PiggyBank, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useProfile } from '../contexts/ProfileContext'
import { cn } from '../lib/utils'
import { formatMoscow } from '../utils/time'

interface Deposit { id: number; amount: number; note?: string; owner: string; created_at: string }
interface Goal { id: number; name: string; target?: number; owner: string; total: number; deposits: Deposit[] }

type Tab = 'mine' | 'common'

export default function SavingsPage() {
  const { currentUser } = useProfile()
  const [goals, setGoals] = useState<Goal[]>([])
  const [tab, setTab] = useState<Tab>('mine')

  // New goal form
  const [addingGoal, setAddingGoal] = useState(false)
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('')

  // Per-goal editing
  const [editGoalId, setEditGoalId] = useState<number | null>(null)
  const [editGoalName, setEditGoalName] = useState('')
  const [editGoalTarget, setEditGoalTarget] = useState('')

  // Deposit forms per goal
  const [addingDepositGoal, setAddingDepositGoal] = useState<number | null>(null)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositNote, setDepositNote] = useState('')

  // Deposit editing
  const [editDepId, setEditDepId] = useState<number | null>(null)
  const [editDepAmount, setEditDepAmount] = useState('')
  const [editDepNote, setEditDepNote] = useState('')

  // Collapsed deposit lists
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  async function load() {
    const res = await apiFetch('/api/savings')
    if (res.ok) setGoals(await res.json())
  }

  useEffect(() => { load() }, [])

  const filtered = goals.filter(g =>
    tab === 'mine' ? g.owner === currentUser : g.owner === 'Общее',
  )

  async function createGoal() {
    if (!newGoalName.trim()) return
    const owner = tab === 'common' ? 'Общее' : (currentUser ?? 'Общее')
    await apiFetch('/api/savings/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGoalName.trim(), target: newGoalTarget ? parseInt(newGoalTarget) : null, owner }),
    })
    setNewGoalName('')
    setNewGoalTarget('')
    setAddingGoal(false)
    load()
  }

  async function updateGoal(id: number) {
    if (!editGoalName.trim()) return
    await apiFetch(`/api/savings/goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editGoalName.trim(), target: editGoalTarget ? parseInt(editGoalTarget) : null }),
    })
    setEditGoalId(null)
    load()
  }

  async function deleteGoal(id: number) {
    if (!confirm('Удалить цель и все взносы к ней?')) return
    await apiFetch(`/api/savings/goals/${id}`, { method: 'DELETE' })
    load()
  }

  function startEditGoal(g: Goal) {
    setEditGoalId(g.id)
    setEditGoalName(g.name)
    setEditGoalTarget(g.target?.toString() ?? '')
  }

  async function addDeposit(goalId: number) {
    const amt = parseInt(depositAmount)
    if (!amt || amt <= 0) return
    await apiFetch(`/api/savings/goals/${goalId}/deposits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, note: depositNote.trim() || undefined }),
    })
    setAddingDepositGoal(null)
    setDepositAmount('')
    setDepositNote('')
    load()
  }

  function startEditDeposit(dep: Deposit) {
    setEditDepId(dep.id)
    setEditDepAmount(String(dep.amount))
    setEditDepNote(dep.note ?? '')
  }

  async function saveDeposit() {
    if (!editDepId) return
    const amt = parseInt(editDepAmount)
    if (!amt || amt <= 0) return
    await apiFetch(`/api/savings/deposits/${editDepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, note: editDepNote || null }),
    })
    setEditDepId(null)
    load()
  }

  async function deleteDeposit(id: number) {
    await apiFetch(`/api/savings/deposits/${id}`, { method: 'DELETE' })
    load()
  }

  function toggleCollapse(id: number) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15">
          <PiggyBank className="h-5 w-5 text-rose-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Копилка</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'цель' : 'целей'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-2xl bg-muted p-1">
        {([['mine', 'Мои'], ['common', 'Общее']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 rounded-xl py-1.5 text-sm font-medium transition-colors',
              tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Goals list */}
      <div className="flex flex-col gap-4 mb-4">
        {filtered.map(goal => {
          const pct = goal.target ? Math.min(100, Math.round((goal.total / goal.target) * 100)) : null
          const left = goal.target ? Math.max(0, goal.target - goal.total) : null
          const isCollapsed = collapsed.has(goal.id)

          return (
            <div key={goal.id} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Goal header */}
              <div className="p-4">
                {editGoalId === goal.id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      autoFocus
                      value={editGoalName}
                      onChange={e => setEditGoalName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && updateGoal(goal.id)}
                      className="rounded-xl border border-rose-400 bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={editGoalTarget}
                          onChange={e => setEditGoalTarget(e.target.value)}
                          placeholder="Сумма цели"
                          className="w-full rounded-xl border border-border bg-background px-3 py-1.5 pr-8 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₽</span>
                      </div>
                      <button onClick={() => updateGoal(goal.id)} className="text-emerald-500 hover:text-emerald-600 transition">
                        <Check className="h-5 w-5" />
                      </button>
                      <button onClick={() => setEditGoalId(null)} className="text-muted-foreground hover:text-foreground transition">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{goal.name}</p>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-2xl font-bold text-rose-500">{goal.total.toLocaleString('ru-RU')} ₽</span>
                          {goal.target && (
                            <span className="text-sm text-muted-foreground">из {goal.target.toLocaleString('ru-RU')} ₽</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditGoal(goal)} className="p-1.5 text-muted-foreground hover:text-rose-500 transition rounded-lg hover:bg-rose-500/10">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteGoal(goal.id)} className="p-1.5 text-muted-foreground hover:text-red-500 transition rounded-lg hover:bg-red-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {pct !== null && (
                      <>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted mb-1">
                          <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{pct}%</span>
                          {left !== null && <span>осталось {left.toLocaleString('ru-RU')} ₽</span>}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Deposit form */}
              {addingDepositGoal === goal.id ? (
                <div className="border-t border-border p-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        autoFocus
                        type="number"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addDeposit(goal.id)}
                        placeholder="Сумма"
                        className="w-full rounded-xl border border-rose-400 bg-background px-3 py-1.5 pr-8 text-sm text-foreground outline-none focus:ring-2 focus:ring-rose-500/30"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₽</span>
                    </div>
                    <button onClick={() => addDeposit(goal.id)} disabled={!depositAmount || parseInt(depositAmount) <= 0}
                      className="h-9 px-3 rounded-xl bg-rose-500 text-white text-sm transition hover:bg-rose-600 disabled:opacity-40"
                    >
                      Добавить
                    </button>
                    <button onClick={() => setAddingDepositGoal(null)} className="text-muted-foreground hover:text-foreground transition">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <input
                    value={depositNote}
                    onChange={e => setDepositNote(e.target.value)}
                    placeholder="Заметка (необязательно)"
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                </div>
              ) : (
                <div className="border-t border-border px-4 py-2 flex items-center justify-between">
                  <button
                    onClick={() => { setAddingDepositGoal(goal.id); setDepositAmount(''); setDepositNote('') }}
                    className="flex items-center gap-1.5 text-sm text-rose-500 hover:text-rose-600 font-medium transition"
                  >
                    <Plus className="h-4 w-4" />
                    Пополнить
                  </button>
                  {goal.deposits.length > 0 && (
                    <button onClick={() => toggleCollapse(goal.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
                      {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                      {isCollapsed ? 'Показать' : 'Скрыть'} взносы ({goal.deposits.length})
                    </button>
                  )}
                </div>
              )}

              {/* Deposits list */}
              {!isCollapsed && goal.deposits.length > 0 && (
                <div className="border-t border-border divide-y divide-border">
                  {goal.deposits.map(dep => (
                    <div key={dep.id}>
                      {editDepId === dep.id ? (
                        <div className="flex flex-col gap-2 p-3">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                autoFocus
                                type="number"
                                value={editDepAmount}
                                onChange={e => setEditDepAmount(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && saveDeposit()}
                                className="w-full rounded-xl border border-rose-400 bg-background px-3 py-1.5 pr-8 text-sm text-foreground outline-none"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₽</span>
                            </div>
                            <button onClick={saveDeposit} className="text-emerald-500 hover:text-emerald-600 transition">
                              <Check className="h-5 w-5" />
                            </button>
                            <button onClick={() => setEditDepId(null)} className="text-muted-foreground hover:text-foreground transition">
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                          <input
                            value={editDepNote}
                            onChange={e => setEditDepNote(e.target.value)}
                            placeholder="Заметка"
                            className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex-1 min-w-0">
                            {dep.note && <p className="truncate text-sm text-foreground">{dep.note}</p>}
                            <p className="text-xs text-muted-foreground">{formatMoscow(dep.created_at)}</p>
                          </div>
                          <span className="shrink-0 font-medium text-rose-500">+{dep.amount.toLocaleString('ru-RU')} ₽</span>
                          <button onClick={() => startEditDeposit(dep)} className="text-muted-foreground hover:text-rose-500 transition">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteDeposit(dep.id)} className="text-muted-foreground hover:text-red-500 transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add new goal */}
      {addingGoal ? (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Новая цель</p>
          <input
            autoFocus
            value={newGoalName}
            onChange={e => setNewGoalName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createGoal()}
            placeholder="Название (например, Отпуск)"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-rose-500/30"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={newGoalTarget}
                onChange={e => setNewGoalTarget(e.target.value)}
                placeholder="Сумма цели (необязательно)"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₽</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createGoal}
              disabled={!newGoalName.trim()}
              className="flex-1 rounded-xl bg-rose-500 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:opacity-40"
            >
              Создать
            </button>
            <button onClick={() => setAddingGoal(false)} className="flex-1 rounded-xl border border-border py-2 text-sm text-muted-foreground transition hover:text-foreground">
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingGoal(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:text-foreground hover:border-rose-400 transition"
        >
          <Plus className="h-4 w-4" />
          Новая цель
        </button>
      )}
    </div>
  )
}
