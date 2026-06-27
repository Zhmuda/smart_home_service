import { BookOpen, Check, Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface KnowledgeEntry {
  id: number
  title: string
  content: string
  category: string
  tags: string[]
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  { key: 'Разное', icon: '📋' },
  { key: 'Пароли', icon: '🔑' },
  { key: 'Размеры', icon: '👗' },
  { key: 'Медицина', icon: '🏥' },
  { key: 'Контакты', icon: '📞' },
  { key: 'Локации', icon: '📍' },
  { key: 'Техника', icon: '⚙️' },
  { key: 'Экстренное', icon: '🆘' },
]

const CAT_COLORS: Record<string, string> = {
  Разное: 'bg-gray-500/15 text-gray-500',
  Пароли: 'bg-yellow-500/15 text-yellow-600',
  Размеры: 'bg-pink-500/15 text-pink-600',
  Медицина: 'bg-red-500/15 text-red-600',
  Контакты: 'bg-blue-500/15 text-blue-600',
  Локации: 'bg-emerald-500/15 text-emerald-600',
  Техника: 'bg-purple-500/15 text-purple-600',
  Экстренное: 'bg-orange-500/15 text-orange-600',
}

const INPUT_CLS =
  'rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

async function fetchEntries(q?: string, category?: string): Promise<KnowledgeEntry[]> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (category) params.set('category', category)
  const res = await fetch(`/api/knowledge?${params}`)
  if (!res.ok) throw new Error('fetch failed')
  return res.json()
}

async function createEntry(data: {
  title: string
  content: string
  category: string
  tags: string[]
}): Promise<KnowledgeEntry> {
  const res = await fetch('/api/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

async function updateEntry(
  id: number,
  data: Partial<{ title: string; content: string; category: string; tags: string[] }>,
): Promise<KnowledgeEntry> {
  const res = await fetch(`/api/knowledge/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

async function deleteEntry(id: number): Promise<void> {
  await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
}

function TagChip({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
      <Tag className="h-2.5 w-2.5" />
      {tag}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:text-destructive">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  )
}

function EntryCard({
  entry,
  onDelete,
  onUpdate,
}: {
  entry: KnowledgeEntry
  onDelete: (id: number) => void
  onUpdate: (entry: KnowledgeEntry) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(entry.title)
  const [content, setContent] = useState(entry.content)
  const [category, setCategory] = useState(entry.category)
  const [tags, setTags] = useState<string[]>(entry.tags)
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const catIcon = CATEGORIES.find(c => c.key === entry.category)?.icon ?? '📋'
  const catColor = CAT_COLORS[entry.category] ?? CAT_COLORS['Разное']

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    const updated = await updateEntry(entry.id, { title, content, category, tags })
    setSaving(false)
    setEditing(false)
    onUpdate(updated)
  }

  const handleCancel = () => {
    setTitle(entry.title)
    setContent(entry.content)
    setCategory(entry.category)
    setTags(entry.tags)
    setTagInput('')
    setEditing(false)
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-ring/50 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Заголовок"
            className={`${INPUT_CLS} w-full font-medium`}
            autoFocus
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Содержимое"
            rows={4}
            className={`${INPUT_CLS} w-full resize-none`}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className={INPUT_CLS}
          >
            {CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>
                {c.icon} {c.key}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <TagChip key={t} tag={t} onRemove={() => setTags(prev => prev.filter(x => x !== t))} />
            ))}
            <div className="flex gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Тег + Enter"
                className={`${INPUT_CLS} w-28 py-0.5 text-[11px]`}
              />
            </div>
          </div>
          <div className="flex gap-2">
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

  const isLong = entry.content.length > 150
  const displayContent = isLong && !expanded ? entry.content.slice(0, 150) + '…' : entry.content

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${catColor}`}>
              {catIcon} {entry.category}
            </span>
            {entry.tags.map(t => (
              <TagChip key={t} tag={t} />
            ))}
          </div>
          <div className="text-sm font-medium text-foreground">{entry.title}</div>
          <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {displayContent}
          </div>
          {isLong && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="mt-1 text-[11px] text-primary hover:underline"
            >
              {expanded ? 'Свернуть' : 'Показать полностью'}
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Редактировать"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Удалить"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function AddEntryForm({ onAdded }: { onAdded: (entry: KnowledgeEntry) => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Разное')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    const entry = await createEntry({ title: title.trim(), content: content.trim(), category, tags })
    setSaving(false)
    setTitle('')
    setContent('')
    setCategory('Разное')
    setTags([])
    setOpen(false)
    onAdded(entry)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="h-4 w-4" />
        Добавить запись
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-ring/50 bg-card p-4 shadow-sm"
    >
      <div className="mb-3 text-sm font-medium text-foreground">Новая запись</div>
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Заголовок"
          className={`${INPUT_CLS} w-full font-medium`}
          autoFocus
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Содержимое"
          rows={3}
          className={`${INPUT_CLS} w-full resize-none`}
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className={INPUT_CLS}
        >
          {CATEGORIES.map(c => (
            <option key={c.key} value={c.key}>
              {c.icon} {c.key}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(t => (
            <TagChip key={t} tag={t} onRemove={() => setTags(prev => prev.filter(x => x !== t))} />
          ))}
          <div className="flex gap-1">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Тег + Enter"
              className={`${INPUT_CLS} w-28 py-0.5 text-[11px]`}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Сохранить
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Отмена
          </button>
        </div>
      </div>
    </form>
  )
}

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const load = () =>
    fetchEntries()
      .then(setEntries)
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    entries.forEach(e => e.tags.forEach(t => set.add(t)))
    return [...set].sort()
  }, [entries])

  const [activeTag, setActiveTag] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = entries
    if (activeCategory) list = list.filter(e => e.category === activeCategory)
    if (activeTag) list = list.filter(e => e.tags.includes(activeTag))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(e => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q))
    }
    return list
  }, [entries, activeCategory, activeTag, search])

  const handleDelete = async (id: number) => {
    await deleteEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const handleUpdate = (updated: KnowledgeEntry) => {
    setEntries(prev => prev.map(e => (e.id === updated.id ? updated : e)))
  }

  const handleAdded = (entry: KnowledgeEntry) => {
    setEntries(prev => [entry, ...prev])
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 shadow-sm">
          <BookOpen className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">База знаний</h1>
          <p className="text-sm text-muted-foreground">Пароли, контакты, размеры, инструкции</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по заголовку и тексту…"
          className={`${INPUT_CLS} w-full pl-9`}
        />
      </div>

      {/* Category filter */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            activeCategory === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Все
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(prev => (prev === c.key ? null : c.key))}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeCategory === c.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {c.icon} {c.key}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {allTags.map(t => (
            <button
              key={t}
              onClick={() => setActiveTag(prev => (prev === t ? null : t))}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                activeTag === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              <Tag className="h-2.5 w-2.5" />
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="mb-4">
        <AddEntryForm onAdded={handleAdded} />
      </div>

      {/* Entries */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {entries.length === 0 ? 'Пока ничего нет. Добавьте первую запись!' : 'Ничего не найдено'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(e => (
            <EntryCard key={e.id} entry={e} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Голосом: «Алиса, что ты знаешь о WiFi?» / «какой размер обуви у Маши?» / «телефон сантехника»
      </p>
    </div>
  )
}
