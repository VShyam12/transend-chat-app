import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { SocketProvider } from './context/SocketContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import Features from './pages/Features'
import HowItWorks from './pages/HowItWorks'
import About from './pages/About'
import ForgotPassword from './pages/ForgotPassword'
import {
  dismissNotificationPermissionBanner,
  getNotificationPermission,
  requestNotificationPermission,
  shouldShowNotificationPermissionBanner,
  unlockAudio,
} from './utils/notification'

function App(): JSX.Element {
  const [showNotificationBanner, setShowNotificationBanner] = useState(false)

  useEffect(() => {
    const initializeNotifications = async () => {
      const permission = getNotificationPermission()
      if (permission === 'unsupported' || permission === 'granted') {
        setShowNotificationBanner(false)
        return
      }

      if (permission === 'default') {
        const nextPermission = await requestNotificationPermission()
        setShowNotificationBanner(nextPermission !== 'granted' && shouldShowNotificationPermissionBanner())
        return
      }

      setShowNotificationBanner(shouldShowNotificationPermissionBanner())
    }

    void initializeNotifications()
  }, [])

  useEffect(() => {
    const unlock = () => {
      unlockAudio()
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
      document.removeEventListener('touchstart', unlock)
    }

    document.addEventListener('click', unlock)
    document.addEventListener('keydown', unlock)
    document.addEventListener('touchstart', unlock)

    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [])

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission()
    if (permission === 'granted') {
      setShowNotificationBanner(false)
    }
  }

  const handleDismissNotifications = () => {
    dismissNotificationPermissionBanner()
    setShowNotificationBanner(false)
  }

  return (
    <Router>
      <ThemeProvider>
        <SocketProvider>
          {showNotificationBanner && (
            <div className="sticky top-0 z-50 border-b border-blue-200 bg-blue-50 px-4 py-3">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
                <p className="text-sm text-blue-900">
                  Enable browser notifications to get alerts when new messages arrive.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Enable
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissNotifications}
                    className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/features" element={<Features />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<About />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </SocketProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App