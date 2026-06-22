import { X } from 'lucide-react'
import type { ConditionGroup, Device, Rule } from '../types'
import RuleEditor from './RuleEditor'
import { Button } from './ui/button'

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
          {gi > 0 && <div className="my-2 text-center text-xs font-semibold text-muted-foreground">И</div>}
          <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
            {group.rules.map((rule, ri) => (
              <div key={ri}>
                {ri > 0 && <div className="my-1 text-center text-xs font-semibold text-muted-foreground">ИЛИ</div>}
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
    </div>
  )
}
