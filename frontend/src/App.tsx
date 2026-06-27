import { BrowserRouter, Route, Routes } from 'react-router-dom'
import BackgroundAnimation from './components/BackgroundAnimation'
import Header from './components/Header'
import ProfilePicker from './components/ProfilePicker'
import { LiveProvider } from './contexts/LiveContext'
import { ProfileProvider } from './contexts/ProfileContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AliceHelpPage from './pages/AliceHelpPage'
import CalendarPage from './pages/CalendarPage'
import KnowledgePage from './pages/KnowledgePage'
import DeviceDetailPage from './pages/DeviceDetailPage'
import DevicesPage from './pages/DevicesPage'
import ExpensesPage from './pages/ExpensesPage'
import RemindersPage from './pages/RemindersPage'
import SavingsPage from './pages/SavingsPage'
import ScenariosPage from './pages/ScenariosPage'
import ShoppingPage from './pages/ShoppingPage'
import StatsPage from './pages/StatsPage'

function App() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <BrowserRouter>
          <LiveProvider>
            <BackgroundAnimation />
            <ProfilePicker />
            <div className="flex h-screen flex-col">
              <Header />
              <main className="flex-1 overflow-y-auto">
                <Routes>
                  <Route path="/" element={<DevicesPage />} />
                  <Route path="/devices/:deviceId" element={<DeviceDetailPage />} />
                  <Route path="/scenarios" element={<ScenariosPage />} />
                  <Route path="/stats" element={<StatsPage />} />
                  <Route path="/reminders" element={<RemindersPage />} />
                  <Route path="/shopping" element={<ShoppingPage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/savings" element={<SavingsPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/knowledge" element={<KnowledgePage />} />
                  <Route path="/alice" element={<AliceHelpPage />} />
                </Routes>
              </main>
            </div>
          </LiveProvider>
        </BrowserRouter>
      </ProfileProvider>
    </ThemeProvider>
  )
}

export default App
