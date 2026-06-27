import { Check, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Item { id: number; name: string; bought: boolean }

const API = '/api/shopping'

export default function ShoppingPage() {
  const [items, setItems] = useState<Item[]>([])
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch(API)
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => { load() }, [])

  async function addItem() {
    const name = input.trim()
    if (!name) return
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      setInput('')
      inputRef.current?.focus()
      load()
    }
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

  const pending = items.filter(i => !i.bought)
  const bought = items.filter(i => i.bought)

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15">
          <ShoppingCart className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Список покупок</h1>
          <p className="text-sm text-muted-foreground">{pending.length} товаров нужно купить</p>
        </div>
      </div>

      {/* Добавление */}
      <div className="mb-6 flex gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Добавить товар…"
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

      {/* Список */}
      {items.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Список пуст — добавьте первый товар
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-4 rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          {pending.map((item, i) => (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i < pending.length - 1 ? 'border-b border-border' : ''}`}>
              <button
                onClick={() => toggleBought(item.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-amber-500 transition hover:bg-amber-500/20"
              />
              <span className="flex-1 text-sm text-foreground">{item.name}</span>
              <button onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-red-500 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
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
          {bought.map((item, i) => (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i < bought.length - 1 ? 'border-b border-border' : ''}`}>
              <button
                onClick={() => toggleBought(item.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 transition"
              >
                <Check className="h-3 w-3 text-white" />
              </button>
              <span className="flex-1 text-sm text-foreground line-through">{item.name}</span>
              <button onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-red-500 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
