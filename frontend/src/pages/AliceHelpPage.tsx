import { Bell, Home, MessageCircle, Mic, Moon, PiggyBank, Sun, Thermometer, TrendingUp, Users, Wifi, Workflow } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

interface Command {
  phrase: string
  description: string
}

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
      { phrase: 'Как дома?', description: 'Температура, влажность, статус устройств и последний сценарий' },
      { phrase: 'Что происходит дома?', description: 'Полная сводка о состоянии дома' },
      { phrase: 'Сводка', description: 'Краткий отчёт о доме' },
    ],
  },
  {
    icon: Thermometer,
    title: 'Климат',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    commands: [
      { phrase: 'Какая температура?', description: 'Показания датчика температуры' },
      { phrase: 'Какая влажность?', description: 'Показания датчика влажности' },
    ],
  },
  {
    icon: Wifi,
    title: 'Устройства',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    commands: [
      { phrase: 'Включи [название]', description: 'Включить устройство по имени' },
      { phrase: 'Выключи [название]', description: 'Выключить устройство по имени' },
      { phrase: 'Какие устройства офлайн?', description: 'Список недоступных устройств' },
    ],
  },
  {
    icon: Workflow,
    title: 'Сценарии',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    commands: [
      { phrase: 'Запусти сценарий [название]', description: 'Запустить нужный сценарий вручную' },
      { phrase: 'Когда последний раз сработал сценарий?', description: 'Последний запуск и его статус' },
    ],
  },
  {
    icon: Bell,
    title: 'Напоминания',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    commands: [
      { phrase: 'Напомни', description: 'Запустить диалог создания напоминания' },
      { phrase: '→ О чём напомнить?', description: 'Скажите тему напоминания' },
      { phrase: '→ Через 30 минут', description: 'Укажите время: «через час», «через 2 часа» и т.д.' },
    ],
  },
  {
    icon: Bell,
    title: 'Список покупок',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    soon: true,
    commands: [
      { phrase: 'Добавь молоко в список', description: 'Добавить товар в список покупок' },
      { phrase: 'Что нужно купить?', description: 'Зачитать список покупок' },
      { phrase: 'Купил молоко', description: 'Убрать товар из списка' },
    ],
  },
  {
    icon: TrendingUp,
    title: 'Учёт расходов',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    soon: true,
    commands: [
      { phrase: 'Записи 500 рублей на продукты', description: 'Записать расход по категории' },
      { phrase: 'Сколько потратили в этом месяце?', description: 'Итог расходов за месяц' },
    ],
  },
  {
    icon: Users,
    title: 'Кто дома',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    soon: true,
    commands: [
      { phrase: 'Я пришёл', description: 'Активировать домашний режим' },
      { phrase: 'Я ухожу', description: 'Активировать режим отсутствия' },
      { phrase: 'Кто сейчас дома?', description: 'Статус присутствия жителей' },
    ],
  },
  {
    icon: PiggyBank,
    title: 'Семейная копилка',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    soon: true,
    commands: [
      { phrase: 'Положи 200 рублей в копилку', description: 'Добавить сумму в копилку' },
      { phrase: 'Сколько в копилке?', description: 'Текущая сумма накоплений' },
    ],
  },
]

export default function AliceHelpPage() {
  const { theme, toggle } = useTheme()

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Заголовок */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/15 shadow-sm">
            <Mic className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Навык Алисы</h1>
            <p className="text-sm text-muted-foreground">Все голосовые команды</p>
          </div>
        </div>
        <button
          onClick={toggle}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {/* Инструкция активации */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            <MessageCircle className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-sm text-muted-foreground">
            Сначала скажите{' '}
            <span className="font-medium text-foreground">«Алиса, запусти [название навыка]»</span>
            , затем задавайте любые команды ниже. Для выхода скажите{' '}
            <span className="font-medium text-foreground">«стоп»</span>.
          </div>
        </div>
      </div>

      {/* Команды */}
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

            <div className="flex flex-col gap-2.5">
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
