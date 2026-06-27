import { BrowserRouter, Route, Routes } from 'react-router-dom'
import BackgroundAnimation from './components/BackgroundAnimation'
import Sidebar from './components/Sidebar'
import { LiveProvider } from './contexts/LiveContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AliceHelpPage from './pages/AliceHelpPage'
import DeviceDetailPage from './pages/DeviceDetailPage'
import DevicesPage from './pages/DevicesPage'
import RemindersPage from './pages/RemindersPage'
import ScenariosPage from './pages/ScenariosPage'
import StatsPage from './pages/StatsPage'

function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <BrowserRouter>
          <LiveProvider>
            <BackgroundAnimation />
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
                <Routes>
                  <Route path="/" element={<DevicesPage />} />
                  <Route path="/devices/:deviceId" element={<DeviceDetailPage />} />
                  <Route path="/scenarios" element={<ScenariosPage />} />
                  <Route path="/stats" element={<StatsPage />} />
                  <Route path="/reminders" element={<RemindersPage />} />
                  <Route path="/alice" element={<AliceHelpPage />} />
                </Routes>
              </main>
            </div>
          </LiveProvider>
        </BrowserRouter>
      </SidebarProvider>
    </ThemeProvider>
  )
}

export default App
