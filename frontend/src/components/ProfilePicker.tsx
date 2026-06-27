import { Plus, Trash2, UserCircle2 } from 'lucide-react'
import { useState } from 'react'
import { avatarColor, useProfile } from '../contexts/ProfileContext'

export default function ProfilePicker() {
  const { profiles, currentUser, setCurrentUser, addProfile, removeProfile, pickerOpen, closePicker } = useProfile()
  const [input, setInput] = useState('')

  if (!pickerOpen) return null

  function handleAdd() {
    const name = input.trim()
    if (!name) return
    addProfile(name)
    setCurrentUser(name)
    setInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <UserCircle2 className="h-6 w-6 text-blue-500" />
          <div>
            <h2 className="font-semibold text-foreground">Кто ты?</h2>
            <p className="text-xs text-muted-foreground">Выбери профиль или создай новый</p>
          </div>
        </div>

        {/* Существующие профили */}
        {profiles.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {profiles.map(name => (
              <div key={name} className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentUser(name)}
                  className="flex flex-1 items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:border-blue-500/50 hover:bg-blue-500/5"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarColor(name)}`}>
                    {name[0].toUpperCase()}
                  </span>
                  <span className="font-medium text-foreground">{name}</span>
                  {currentUser === name && (
                    <span className="ml-auto text-xs text-blue-500">текущий</span>
                  )}
                </button>
                <button
                  onClick={() => removeProfile(name)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Новый профиль */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Имя…"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-blue-500/30"
            autoFocus
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white transition hover:bg-blue-600 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Закрыть (только если уже есть currentUser) */}
        {currentUser && (
          <button
            onClick={closePicker}
            className="mt-4 w-full rounded-xl py-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            Отмена
          </button>
        )}
      </div>
    </div>
  )
}
