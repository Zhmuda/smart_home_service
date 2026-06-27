import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import { LiveProvider } from './contexts/LiveContext'
import AliceHelpPage from './pages/AliceHelpPage'
import DeviceDetailPage from './pages/DeviceDetailPage'
import DevicesPage from './pages/DevicesPage'
import ScenariosPage from './pages/ScenariosPage'
import StatsPage from './pages/StatsPage'

function App() {
  return (
    <BrowserRouter>
      <LiveProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<DevicesPage />} />
              <Route path="/devices/:deviceId" element={<DeviceDetailPage />} />
              <Route path="/scenarios" element={<ScenariosPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/alice" element={<AliceHelpPage />} />
            </Routes>
          </main>
        </div>
      </LiveProvider>
    </BrowserRouter>
  )
}

export default App
