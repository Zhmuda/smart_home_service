import { BarChart2, Bell, Home, MessageCircle, Mic, PiggyBank, ShoppingCart, TrendingUp, Wifi } from 'lucide-react'

interface Command { phrase: string; description: string }
interface Section {
  icon: React.ElementType
  title: string
  color: string
  bg: string
  commands: Command[]
  soon?: boolean
}

const SECTIONS: Section[] = [
  {
    icon: Home,
    title: 'Сводка по дому',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    commands: [
      { phrase: 'Как дома?', description: 'Температура, влажность, статус устройств и последний сценарий одним ответом' },
      { phrase: 'Сводка', description: 'Короткая форма' },
      { phrase: 'Что происходит дома?', description: 'Полный доклад о состоянии дома' },
    ],
  },
  {
    icon: Wifi,
    title: 'Устройства',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    commands: [
      { phrase: 'Какие устройства офлайн?', description: 'Список устройств, которые сейчас недоступны' },
      { phrase: 'Какие устройства не работают?', description: 'Альтернативная фраза' },
    ],
  },
  {
    icon: BarChart2,
    title: 'Сценарии',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    commands: [
      { phrase: 'Запусти сценарий [название]', description: 'Запустить сценарий вручную голосом' },
      { phrase: 'Когда последний раз сработал сценарий?', description: 'Название и статус последнего запуска' },
    ],
  },
  {
    icon: Bell,
    title: 'Напоминания',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    commands: [
      { phrase: 'Напомни', description: 'Диалог: Алиса спросит о чём и через сколько' },
      { phrase: '→ [тема] → через 30 минут', description: 'Двухшаговый диалог — тема, потом время' },
      { phrase: 'Измени напоминание', description: 'Выбрать активное напоминание и изменить название или время' },
    ],
  },
  {
    icon: ShoppingCart,
    title: 'Список покупок',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    commands: [
      { phrase: 'Добавь молоко в список', description: 'Добавить товар в список покупок' },
      { phrase: 'Что нужно купить?', description: 'Алиса зачитает список' },
      { phrase: 'Купил молоко', description: 'Отметить товар как купленный' },
    ],
  },
  {
    icon: TrendingUp,
    title: 'Учёт расходов',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    commands: [
      { phrase: 'Записи 500 рублей на продукты', description: 'Добавить расход по категории' },
      { phrase: 'Сколько потратили в этом месяце?', description: 'Итог расходов за текущий месяц' },
      { phrase: 'Сколько на продукты?', description: 'Расходы по конкретной категории' },
    ],
  },
  {
    icon: PiggyBank,
    title: 'Копилка',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    commands: [
      { phrase: 'Положи 200 рублей в копилку', description: 'Добавить сумму в накопления' },
      { phrase: 'Сколько в копилке?', description: 'Текущая сумма и прогресс к цели' },
      { phrase: 'На что копим?', description: 'Название цели и остаток' },
    ],
  },
]

export default function AliceHelpPage() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 shadow-sm">
          <Mic className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Навык Алисы</h1>
          <p className="text-sm text-muted-foreground">Голосовые команды умного дома</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            <MessageCircle className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            Скажите{' '}
            <span className="font-medium text-foreground">«Алиса, запусти [название навыка]»</span>
            {' '}— затем используйте команды ниже. Для выхода скажите{' '}
            <span className="font-medium text-foreground">«стоп»</span>.
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${section.bg}`}>
                  <section.icon className={`h-4 w-4 ${section.color}`} />
                </div>
                <h2 className="font-medium text-foreground">{section.title}</h2>
              </div>
              {section.soon && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Скоро
                </span>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {section.commands.map((cmd) => (
                <div key={cmd.phrase} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                  <span className={`shrink-0 self-start rounded-lg px-2.5 py-1 font-mono text-xs font-medium ${section.bg} ${section.color}`}>
                    «{cmd.phrase}»
                  </span>
                  <span className="text-sm text-muted-foreground">{cmd.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
