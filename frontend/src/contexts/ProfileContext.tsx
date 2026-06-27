import { createContext, useContext, useEffect, useState } from 'react'

const PROFILES_KEY = 'smarthome_profiles'
const CURRENT_KEY = 'smarthome_current_user'

interface ProfileContextValue {
  profiles: string[]
  currentUser: string | null
  setCurrentUser: (name: string) => void
  addProfile: (name: string) => void
  removeProfile: (name: string) => void
  pickerOpen: boolean
  openPicker: () => void
  closePicker: () => void
}

const ProfileContext = createContext<ProfileContextValue>(null!)

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]') } catch { return [] }
  })
  const [currentUser, setCurrentUserState] = useState<string | null>(
    () => localStorage.getItem(CURRENT_KEY),
  )
  const [pickerOpen, setPickerOpen] = useState(() => !localStorage.getItem(CURRENT_KEY))

  useEffect(() => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  }, [profiles])

  function setCurrentUser(name: string) {
    localStorage.setItem(CURRENT_KEY, name)
    setCurrentUserState(name)
    setPickerOpen(false)
  }

  function addProfile(name: string) {
    const trimmed = name.trim()
    if (!trimmed || profiles.includes(trimmed)) return
    setProfiles(p => [...p, trimmed])
  }

  function removeProfile(name: string) {
    setProfiles(p => p.filter(n => n !== name))
    if (currentUser === name) {
      localStorage.removeItem(CURRENT_KEY)
      setCurrentUserState(null)
      setPickerOpen(true)
    }
  }

  return (
    <ProfileContext.Provider value={{
      profiles, currentUser, setCurrentUser,
      addProfile, removeProfile,
      pickerOpen, openPicker: () => setPickerOpen(true), closePicker: () => setPickerOpen(false),
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}

// Palette for avatar colors
const COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-orange-500', 'bg-rose-500',
]
export function avatarColor(name: string) {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return COLORS[hash % COLORS.length]
}
