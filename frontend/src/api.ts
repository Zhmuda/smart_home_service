import type { DeviceStateEvent, Scenario, ScenarioInput, ScenarioRun, ScenarioSummary, UserInfo } from './types'

const BASE = '/api'

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchDevices(): Promise<UserInfo> {
  return asJson(await fetch(`${BASE}/devices`))
}

export interface EngineStatus {
  ok: boolean
  last_poll_at: string | null
  last_error: string | null
}

export async function fetchStatus(): Promise<EngineStatus> {
  return asJson(await fetch(`${BASE}/status`))
}

export async function sendAction(
  deviceId: string,
  type: string,
  instance: string,
  value: unknown,
): Promise<void> {
  const res = await fetch(`${BASE}/devices/${deviceId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actions: [{ type, state: { instance, value } }] }),
  })
  if (!res.ok) throw new Error('Failed to send action')
}

export async function fetchScenarios(): Promise<Scenario[]> {
  return asJson(await fetch(`${BASE}/scenarios`))
}

export async function createScenario(payload: ScenarioInput): Promise<Scenario> {
  return asJson(
    await fetch(`${BASE}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
}

export async function updateScenario(id: number, payload: ScenarioInput): Promise<Scenario> {
  return asJson(
    await fetch(`${BASE}/scenarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  )
}

export async function deleteScenario(id: number): Promise<void> {
  const res = await fetch(`${BASE}/scenarios/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete scenario')
}

export async function runScenarioNow(id: number): Promise<ScenarioRun> {
  return asJson(await fetch(`${BASE}/scenarios/${id}/run`, { method: 'POST' }))
}

export async function fetchScenarioRuns(id: number): Promise<ScenarioRun[]> {
  return asJson(await fetch(`${BASE}/scenarios/${id}/runs`))
}

export async function fetchAllRuns(limit = 100): Promise<ScenarioRun[]> {
  return asJson(await fetch(`${BASE}/stats/runs?limit=${limit}`))
}

export async function fetchScenarioSummary(): Promise<ScenarioSummary[]> {
  return asJson(await fetch(`${BASE}/stats/summary`))
}

export async function fetchDeviceHistory(
  deviceId: string,
  params: { capability_type?: string; instance?: string; limit?: number } = {},
): Promise<DeviceStateEvent[]> {
  const query = new URLSearchParams()
  if (params.capability_type) query.set('capability_type', params.capability_type)
  if (params.instance) query.set('instance', params.instance)
  if (params.limit) query.set('limit', String(params.limit))
  return asJson(await fetch(`${BASE}/stats/devices/${deviceId}/history?${query.toString()}`))
}
