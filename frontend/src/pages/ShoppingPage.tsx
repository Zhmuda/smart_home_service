import { Check, Pencil, Plus, ShoppingCart, Trash2, Users, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { avatarColor, useProfile } from '../contexts/ProfileContext'
import { cn } from '../lib/utils'

interface Item { id: number; name: string; bought: boolean; owner: string }

type Filter = 'mine' | 'common'

const API = '/api/shopping'

export default function ShoppingPage() {
  const { currentUser } = useProfile()
  const [items, setItems] = useState<Item[]>([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<Filter>('mine')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch(API)
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => { load() }, [])

  async function addItem() {
    const name = input.trim()
    if (!name) return
    const owner = filter === 'common' ? 'Общее' : (currentUser ?? 'Общее')
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, owner }),
    })
    setInput('')
    inputRef.current?.focus()
    load()
  }

  async function toggleBought(id: number) {
    await fetch(`${API}/${id}/buy`, { method: 'PATCH' })
    load()
  }

  async function deleteItem(id: number) {
    await fetch(`${API}/${id}`, { method: 'DELETE' })
    load()
  }

  async function clearBought() {
    await fetch(`${API}/bought/clear`, { method: 'DELETE' })
    load()
  }

  function startEdit(item: Item) {
    setEditingId(item.id)
    setEditValue(item.name)
  }

  async function saveEdit(id: number) {
    const name = editValue.trim()
    if (!name) return
    await fetch(`${API}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setEditingId(null)
    load()
  }

  const filtered = filter === 'mine'
    ? items.filter(i => i.owner === currentUser)
    : items.filter(i => i.owner === 'Общее')

  const pending = filtered.filter(i => !i.bought)
  const bought = filtered.filter(i => i.bought)

  function ItemRow({ item, crossed }: { item: Item; crossed?: boolean }) {
    const editing = editingId === item.id
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => toggleBought(item.id)}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
            crossed
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-amber-500 hover:bg-amber-500/20',
          )}
        >
          {crossed && <Check className="h-3 w-3 text-white" />}
        </button>

        {editing ? (
          <>
            <input
              autoFocus
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') saveEdit(item.id)
                if (e.key === 'Escape') setEditingId(null)
              }}
              className="flex-1 rounded-xl border border-amber-400 bg-background px-2 py-0.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <button onClick={() => saveEdit(item.id)} className="text-emerald-500 hover:text-emerald-600 transition">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground transition">
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <span className={cn('flex-1 text-sm text-foreground', crossed && 'line-through')}>{item.name}</span>
            {item.owner === 'Общее'
              ? <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              : <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white', avatarColor(item.owner))}>{item.owner[0].toUpperCase()}</span>
            }
            {!crossed && (
              <button onClick={() => startEdit(item)} className="text-muted-foreground hover:text-amber-500 transition">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-red-500 transition">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15">
          <ShoppingCart className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Список покупок</h1>
          <p className="text-sm text-muted-foreground">{pending.length} нужно купить</p>
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

      <div className="mb-6 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder={filter === 'common' ? 'Добавить в общий список…' : 'Добавить себе…'}
          className="flex-1 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        <button
          onClick={addItem}
          disabled={!input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Список пуст
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-4 rounded-2xl border border-border bg-card overflow-hidden shadow-sm divide-y divide-border">
          {pending.map(item => <ItemRow key={item.id} item={item} />)}
        </div>
      )}

      {bought.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm opacity-60">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Куплено ({bought.length})</span>
            <button onClick={clearBought} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition">
              <Trash2 className="h-3 w-3" />
              Очистить
            </button>
          </div>
          <div className="divide-y divide-border">
            {bought.map(item => <ItemRow key={item.id} item={item} crossed />)}
          </div>
        </div>
      )}
    </div>
  )
}
