import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch, getToken, removeToken, setToken } from '../lib/api'

interface AuthUser {
  id: number
  email: string
  name: string
  yandex_token: string | null
  alice_token: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, name: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (data: { name?: string; yandex_token?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      return
    }
    apiFetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Ошибка входа')
    }
    const data = await res.json()
    setToken(data.access_token)
    setUser(data.user)
  }

  const register = async (email: string, name: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Ошибка регистрации')
    }
    const data = await res.json()
    setToken(data.access_token)
    setUser(data.user)
  }

  const logout = () => {
    removeToken()
    setUser(null)
  }

  const updateUser = async (data: { name?: string; yandex_token?: string }) => {
    const res = await apiFetch('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setUser(updated)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
