import { Home, Mic, ShoppingCart, Moon, TrendingUp, Users, PiggyBank, Thermometer, Wifi, Workflow, MessageCircle } from 'lucide-react'

interface Command {
  phrase: string
  description: string
}

interface Section {
  icon: React.ElementType
  title: string
  color: string
  commands: Command[]
  soon?: boolean
}

const SECTIONS: Section[] = [
  {
    icon: Home,
    title: 'Сводка по дому',
    color: 'text-blue-400',
    commands: [
      { phrase: 'Как дома?', description: 'Температура, влажность, статус устройств и последний сценарий' },
      { phrase: 'Что происходит дома?', description: 'Полная сводка о состоянии дома' },
      { phrase: 'Сводка', description: 'Краткий отчёт о доме' },
    ],
  },
  {
    icon: Thermometer,
    title: 'Климат',
    color: 'text-orange-400',
    commands: [
      { phrase: 'Какая температура?', description: 'Показания датчика температуры' },
      { phrase: 'Какая влажность?', description: 'Показания датчика влажности' },
    ],
  },
  {
    icon: Wifi,
    title: 'Устройства',
    color: 'text-emerald-400',
    commands: [
      { phrase: 'Включи [название]', description: 'Включить устройство по имени' },
      { phrase: 'Выключи [название]', description: 'Выключить устройство по имени' },
      { phrase: 'Какие устройства офлайн?', description: 'Список недоступных устройств' },
    ],
  },
  {
    icon: Workflow,
    title: 'Сценарии автоматизации',
    color: 'text-purple-400',
    commands: [
      { phrase: 'Запусти сценарий [название]', description: 'Запустить нужный сценарий вручную' },
      { phrase: 'Когда последний раз сработал сценарий?', description: 'Последний запуск и его статус' },
    ],
  },
  {
    icon: ShoppingCart,
    title: 'Список покупок',
    color: 'text-yellow-400',
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
    color: 'text-pink-400',
    soon: true,
    commands: [
      { phrase: 'Записи 500 рублей на продукты', description: 'Записать расход по категории' },
      { phrase: 'Сколько потратили в этом месяце?', description: 'Итог расходов за месяц' },
      { phrase: 'Сколько на еду?', description: 'Расходы по категории' },
    ],
  },
  {
    icon: Moon,
    title: 'Дневник сна',
    color: 'text-indigo-400',
    soon: true,
    commands: [
      { phrase: 'Лёг в 23, встал в 7', description: 'Записать время сна и пробуждения' },
      { phrase: 'Сколько я сплю в среднем?', description: 'Средняя продолжительность сна' },
      { phrase: 'Как я спал последнюю неделю?', description: 'График сна за 7 дней' },
    ],
  },
  {
    icon: Users,
    title: 'Кто дома',
    color: 'text-cyan-400',
    soon: true,
    commands: [
      { phrase: 'Я пришёл', description: 'Активировать домашний режим (сценарии прихода)' },
      { phrase: 'Я ухожу', description: 'Активировать режим отсутствия' },
      { phrase: 'Кто сейчас дома?', description: 'Статус присутствия жителей' },
    ],
  },
  {
    icon: PiggyBank,
    title: 'Семейная копилка',
    color: 'text-rose-400',
    soon: true,
    commands: [
      { phrase: 'Положи 200 рублей в копилку', description: 'Добавить сумму в копилку' },
      { phrase: 'Сколько в копилке?', description: 'Текущая сумма накоплений' },
      { phrase: 'На что копим?', description: 'Цель накоплений и прогресс' },
    ],
  },
]

export default function AliceHelpPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
            <Mic className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Навык Алисы</h1>
            <p className="text-sm text-muted-foreground">Все голосовые команды</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <div className="text-sm text-muted-foreground">
              Сначала скажите{' '}
              <span className="font-medium text-white">«Алиса, запусти [название навыка]»</span>
              , затем задавайте любые вопросы из списка ниже. Для выхода скажите{' '}
              <span className="font-medium text-white">«стоп»</span> или{' '}
              <span className="font-medium text-white">«выход»</span>.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-xl border border-white/10 bg-white/5 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <section.icon className={`h-4 w-4 ${section.color}`} />
                <h2 className="font-medium text-white">{section.title}</h2>
              </div>
              {section.soon && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-muted-foreground">
                  Скоро
                </span>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {section.commands.map((cmd) => (
                <div key={cmd.phrase} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs text-white">
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
