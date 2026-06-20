import { useState, type FormEvent } from 'react'
import type { ActionItem, Device, Rule, Scenario, ScenarioInput, Trigger } from '../types'
import ActionEditor from './ActionEditor'
import RuleEditor from './RuleEditor'
import TriggerEditor from './TriggerEditor'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'

export default function ScenarioForm({
  devices,
  initial,
  onSubmit,
  onCancel,
}: {
  devices: Device[]
  initial?: Scenario
  onSubmit: (input: ScenarioInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [trigger, setTrigger] = useState<Trigger>(initial?.trigger ?? { kind: 'manual' })
  const [conditions, setConditions] = useState<Rule[]>(initial?.conditions ?? [])
  const [actions, setActions] = useState<ActionItem[]>(initial?.actions ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addCondition() {
    setConditions([...conditions, { device_id: '', capability_type: '', instance: '', operator: 'eq', value: true }])
  }

  function addAction() {
    setActions([...actions, { device_id: '', type: '', instance: '', value: true }])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ name, enabled, trigger, conditions, actions })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="mt-4 flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <Label>Название сценария</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Выключить свет на ночь"
          className="text-base font-medium"
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Switch checked={enabled} onCheckedChange={setEnabled} />
        Сценарий включён
      </label>

      <Card className="bg-muted/40">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Badge className="border-transparent bg-blue-600 text-white">Если</Badge>
            <span className="text-sm font-medium text-muted-foreground">Что запускает сценарий</span>
          </div>
          <TriggerEditor devices={devices} trigger={trigger} onChange={setTrigger} />
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Badge className="border-transparent bg-amber-500 text-white">И при этом</Badge>
            <span className="text-sm font-medium text-muted-foreground">Дополнительные условия (необязательно)</span>
          </div>
          {conditions.length === 0 && (
            <p className="mb-2 text-sm text-muted-foreground">Без условий — сценарий сработает сразу при триггере</p>
          )}
          <div className="flex flex-col gap-2">
            {conditions.map((rule, i) => (
              <RuleEditor
                key={i}
                devices={devices}
                rule={rule}
                onChange={(r) => setConditions(conditions.map((c, j) => (j === i ? r : c)))}
                onRemove={() => setConditions(conditions.filter((_, j) => j !== i))}
              />
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addCondition}>
            + добавить условие
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Badge>То</Badge>
            <span className="text-sm font-medium text-muted-foreground">Что нужно сделать</span>
          </div>
          <div className="flex flex-col gap-2">
            {actions.map((action, i) => (
              <ActionEditor
                key={i}
                devices={devices}
                action={action}
                onChange={(a) => setActions(actions.map((c, j) => (j === i ? a : c)))}
                onRemove={() => setActions(actions.filter((_, j) => j !== i))}
              />
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addAction}>
            + добавить действие
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving || actions.length === 0}>
          {saving ? 'Сохранение…' : 'Сохранить сценарий'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
