import { createContext, useContext, useState, useEffect } from 'react'
import { API_URL } from '../lib/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      // Récupérer le token JWT depuis localStorage
      const token = localStorage.getItem('nonotalk_token')
      
      const headers = {
        'Content-Type': 'application/json'
      }
      
      // Ajouter le token JWT si disponible (pour Safari iOS)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',  // Garder pour compatibilité desktop
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        // Token invalide ou expiré, nettoyer localStorage
        localStorage.removeItem('nonotalk_token')
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'authentification:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, pin) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, pin }),
      })

      const data = await response.json()

      if (response.ok) {
        // Stocker le token JWT dans localStorage (pour Safari iOS)
        if (data.token) {
          localStorage.setItem('nonotalk_token', data.token)
          console.log('[useAuth] Token JWT stocké dans localStorage')
        }
        setUser(data.user)
        return { success: true, user: data.user }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: 'Erreur de connexion' }
    }
  }

  const register = async (username, email, pin, parrain_email) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, email, pin, parrain_email }),
      })

      const data = await response.json()

      if (response.ok) {
        // Stocker le token JWT dans localStorage (pour Safari iOS)
        if (data.token) {
          localStorage.setItem('nonotalk_token', data.token)
          console.log('[useAuth] Token JWT stocké dans localStorage')
        }
        setUser(data.user)
        return { success: true, user: data.user, bonus_quota: data.bonus_quota }
      } else {
        return { success: false, error: data.error }
      }
    } catch (error) {
      return { success: false, error: 'Erreur d\'inscription' }
    }
  }

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
    } finally {
      // Nettoyer le token JWT
      localStorage.removeItem('nonotalk_token')
      setUser(null)
    }
  }

  const updateUser = (updatedUser) => {
    setUser(updatedUser)
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    checkAuthStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
