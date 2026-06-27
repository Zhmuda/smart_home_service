import { createContext, useContext, useState } from 'react'

interface SidebarCtx {
  collapsed: boolean
  mobileOpen: boolean
  toggleCollapsed: () => void
  openMobile: () => void
  closeMobile: () => void
}

const SidebarContext = createContext<SidebarCtx>({
  collapsed: false,
  mobileOpen: false,
  toggleCollapsed: () => {},
  openMobile: () => {},
  closeMobile: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar') === 'collapsed')
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = () =>
    setCollapsed(v => {
      localStorage.setItem('sidebar', !v ? 'collapsed' : 'open')
      return !v
    })

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        mobileOpen,
        toggleCollapsed,
        openMobile: () => setMobileOpen(true),
        closeMobile: () => setMobileOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
