export interface CapabilityState {
  instance: string
  value: unknown
}

export interface Capability {
  type: string
  retrievable?: boolean
  state: CapabilityState | null
  parameters?: Record<string, unknown>
}

export interface Device {
  id: string
  name: string
  type: string
  room?: string
  capabilities: Capability[]
  properties: Capability[]
}

export interface Room {
  id: string
  name: string
  devices: string[]
}

export interface UserInfo {
  rooms: Room[]
  devices: Device[]
}

export type Operator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'

export interface Rule {
  device_id: string
  capability_type: string
  instance: string
  operator: Operator
  value: unknown
}

export interface ScheduleTrigger {
  kind: 'schedule'
  cron: string
}

export interface DeviceStateTrigger {
  kind: 'device_state'
  device_id: string
  capability_type: string
  instance: string
  operator: Operator
  value: unknown
}

export interface ManualTrigger {
  kind: 'manual'
}

export type Trigger = ScheduleTrigger | DeviceStateTrigger | ManualTrigger

export interface ActionItem {
  device_id: string
  type: string
  instance: string
  value: unknown
}

export interface Scenario {
  id: number
  name: string
  enabled: boolean
  trigger: Trigger
  conditions: Rule[]
  actions: ActionItem[]
  created_at: string
  updated_at: string
}

export type ScenarioInput = Omit<Scenario, 'id' | 'created_at' | 'updated_at'>

export interface ScenarioRun {
  id: number
  scenario_id: number
  triggered_at: string
  trigger_kind: string
  status: string
  detail: unknown
}

export interface DeviceStateEvent {
  id: number
  device_id: string
  device_name: string | null
  capability_type: string
  instance: string
  value: unknown
  recorded_at: string
}
