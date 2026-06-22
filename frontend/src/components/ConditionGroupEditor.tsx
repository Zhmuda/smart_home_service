import { X } from 'lucide-react'
import type { ConditionGroup, Device, Rule } from '../types'
import RuleEditor from './RuleEditor'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

function Connector({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-border" />
      <Badge className={color}>{label}</Badge>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

const EMPTY_RULE: Rule = { device_id: '', capability_type: '', instance: '', operator: 'eq', value: true }

export default function ConditionGroupEditor({
  devices,
  groups,
  onChange,
}: {
  devices: Device[]
  groups: ConditionGroup[]
  onChange: (groups: ConditionGroup[]) => void
}) {
  function updateGroup(i: number, group: ConditionGroup) {
    onChange(groups.map((g, j) => (j === i ? group : g)))
  }

  function removeGroup(i: number) {
    onChange(groups.filter((_, j) => j !== i))
  }

  function addGroup() {
    onChange([...groups, { rules: [{ ...EMPTY_RULE }] }])
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && <Connector label="И" color="border-transparent bg-amber-500 text-white" />}
          <div className="flex flex-col gap-2 rounded-lg border-l-4 border-l-sky-400 bg-sky-50/40 p-3">
            {group.rules.length > 1 && (
              <p className="text-xs text-muted-foreground">Сработает, если выполнится хотя бы одно из условий ниже</p>
            )}
            {group.rules.map((rule, ri) => (
              <div key={ri} className="flex flex-col gap-2">
                {ri > 0 && <Connector label="ИЛИ" color="border-transparent bg-sky-500 text-white" />}
                <RuleEditor
                  devices={devices}
                  rule={rule}
                  showDuration
                  onChange={(r) => updateGroup(gi, { rules: group.rules.map((x, j) => (j === ri ? r : x)) })}
                  onRemove={
                    group.rules.length > 1
                      ? () => updateGroup(gi, { rules: group.rules.filter((_, j) => j !== ri) })
                      : undefined
                  }
                />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateGroup(gi, { rules: [...group.rules, { ...EMPTY_RULE }] })}
              >
                + добавить ИЛИ внутри группы
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto text-muted-foreground"
                onClick={() => removeGroup(gi)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addGroup}>
        + добавить группу условий (И)
      </Button>
      {groups.length > 1 && (
        <p className="text-xs text-muted-foreground">Все группы условий выше должны выполняться одновременно (И)</p>
      )}
    </div>
  )
}
