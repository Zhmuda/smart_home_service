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

    function connect() {
      const socket = new WebSocket(wsUrl())
      socketRef.current = socket

      socket.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === 'snapshot') setDevices(msg.data)
        else if (msg.type === 'status') setStatus({ ok: msg.ok, last_poll_at: msg.last_poll_at, last_error: msg.last_error })
      }

      socket.onclose = () => {
        if (!cancelled) reconnectTimer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(reconnectTimer)
      socketRef.current?.close()
    }
  }, [])

  return <LiveContext.Provider value={{ devices, status }}>{children}</LiveContext.Provider>
}
