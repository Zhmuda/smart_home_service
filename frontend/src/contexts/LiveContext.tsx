import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { fetchDevices, fetchStatus, type EngineStatus } from '../api'
import type { UserInfo } from '../types'

interface LiveState {
  devices: UserInfo | null
  status: EngineStatus | null
}

const LiveContext = createContext<LiveState>({ devices: null, status: null })

export function useLive(): LiveState {
  return useContext(LiveContext)
}

function wsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [devices, setDevices] = useState<UserInfo | null>(null)
  const [status, setStatus] = useState<EngineStatus | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    fetchDevices().then(setDevices).catch(() => {})
    fetchStatus().then(setStatus).catch(() => {})

    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout>
    let lastMessageAt = Date.now()

    function connect() {
      const socket = new WebSocket(wsUrl())
      socketRef.current = socket
      lastMessageAt = Date.now()

      socket.onmessage = (event) => {
        lastMessageAt = Date.now()
        const msg = JSON.parse(event.data)
        if (msg.type === 'snapshot') setDevices(msg.data)
        else if (msg.type === 'status') setStatus({ ok: msg.ok, last_poll_at: msg.last_poll_at, last_error: msg.last_error })
      }

      socket.onclose = () => {
        if (!cancelled) reconnectTimer = setTimeout(connect, 3000)
      }

      // Some proxies/browsers fire onerror without ever following up with onclose,
      // which would otherwise leave the dead socket lingering forever with no reconnect.
      socket.onerror = () => socket.close()
    }

    connect()

    // Safety net for the rare case a dead connection never fires close/error at all
    // (e.g. a half-open TCP connection behind a proxy) — force a reconnect if no
    // message has arrived for much longer than the ~30s poll interval.
    const watchdog = setInterval(() => {
      if (Date.now() - lastMessageAt > 90000) {
        socketRef.current?.close()
      }
    }, 15000)

    return () => {
      cancelled = true
      clearTimeout(reconnectTimer)
      clearInterval(watchdog)
      socketRef.current?.close()
    }
  }, [])

  return <LiveContext.Provider value={{ devices, status }}>{children}</LiveContext.Provider>
}
