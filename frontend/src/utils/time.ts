const TZ = 'Europe/Moscow'

// Ensure bare datetime strings from backend (no Z/offset) are treated as UTC
function toUtc(iso: string): string {
  return iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z'
}

export function formatMoscow(iso: string): string {
  return new Date(toUtc(iso)).toLocaleString('ru-RU', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Returns current Moscow time as "YYYY-MM-DDTHH:mm" for datetime-local input
export function nowMoscowInput(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T').slice(0, 16)
}

// Treats datetime-local string as Moscow time, returns UTC ISO string
export function moscowInputToUtc(localStr: string): string {
  return new Date(localStr + '+03:00').toISOString()
}

// Converts UTC ISO string to Moscow time for datetime-local input value
export function utcToMoscowInput(iso: string): string {
  return new Date(toUtc(iso)).toLocaleString('sv-SE', { timeZone: 'Europe/Moscow' }).replace(' ', 'T').slice(0, 16)
}
