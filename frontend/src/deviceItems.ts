import { getCategoryLabel, getStateLabel } from './capabilityLabels'
import type { Capability, Device } from './types'

export interface StateItem {
  capability_type: string
  instance: string
  label: string
  currentValue: unknown
  parameters?: Record<string, unknown>
}

function toItems(caps: Capability[]): StateItem[] {
  const items: StateItem[] = []
  for (const cap of caps) {
    if (!cap.state) continue
    items.push({
      capability_type: cap.type,
      instance: cap.state.instance,
      label: `${getCategoryLabel(cap.type)} — ${getStateLabel(cap.type, cap.state.instance)}`,
      currentValue: cap.state.value,
      parameters: cap.parameters,
    })
  }
  return items
}

export function getObservableItems(device: Device): StateItem[] {
  return toItems([...device.capabilities, ...device.properties])
}

export function getControllableItems(device: Device): StateItem[] {
  return toItems(device.capabilities)
}
