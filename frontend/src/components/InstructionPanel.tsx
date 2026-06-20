import { ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

export default function InstructionPanel() {
  const [open, setOpen] = useState(false)

  return (
    <Card className="mt-8 border-dashed border-blue-300 bg-blue-50/60">
      <CardContent className="p-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-2 px-0 text-blue-700 hover:bg-transparent hover:text-blue-800"
          onClick={() => setOpen(!open)}
        >
          <Info className="h-4 w-4" />
          Как устроен сценарий?
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {open && (
          <div className="mt-3 space-y-2 text-sm leading-relaxed">
            <p>Сценарий состоит из трёх частей:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Если</strong> (триггер) — что запускает сценарий: вы нажимаете кнопку, наступает заданное
                время, или устройство меняет состояние (например, датчик температуры превысил порог).
              </li>
              <li>
                <strong>И при этом</strong> (условия, необязательно) — дополнительные проверки, которые тоже должны
                быть верны именно в момент срабатывания. Например: «и при этом сейчас темно».
              </li>
              <li>
                <strong>То</strong> (действия) — что нужно сделать: включить/выключить устройство, изменить яркость,
                цвет, режим и т.д. Действий может быть несколько.
              </li>
            </ul>
            <p>
              <strong>Пример 1:</strong> Триггер «По датчику» — лампочка включилась → действие — выключить её обратно
              (защита от случайного включения).
            </p>
            <p>
              <strong>Пример 2:</strong> Триггер «По времени» — каждый день в 22:00 → действие — выключить свет в
              гостиной.
            </p>
            <p className="text-xs text-muted-foreground">
              Состояния устройств проверяются раз в 30 секунд, поэтому реакция на датчики может занять до полминуты.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
