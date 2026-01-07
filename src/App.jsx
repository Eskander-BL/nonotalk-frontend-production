import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import './App.css'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import ChatPage from './components/ChatPage'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { NotificationManager, scheduleInactivityReminder, scheduleDailyRitual } from './components/NotificationManager'

function AppRoutes() {
  const { user, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const invitationToken = searchParams.get('token')
  
  // ✅ Si token d'invitation présent, forcer un état "guest" (ignorer la session existante)
  const isGuest = !!invitationToken
  const effectiveUser = isGuest ? null : user

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-blue-400 to-cyan-400 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={effectiveUser ? <Navigate to="/chat" replace /> : <LoginPage />} 
      />
      <Route 
        path="/signup" 
        element={effectiveUser ? <Navigate to="/chat" replace /> : <SignupPage />} 
      />
      <Route 
        path="/chat" 
        element={effectiveUser ? <ChatPage /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={effectiveUser ? "/chat" : "/login"} replace />} 
      />
    </Routes>
  )
}

function App() {
  useEffect(() => {
    // Démarrer les notifications
    scheduleInactivityReminder()
    scheduleDailyRitual()
  }, [])

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-purple-400 via-blue-400 to-cyan-400">
          <NotificationManager />
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
