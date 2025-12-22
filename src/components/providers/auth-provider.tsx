"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email?: string
  avatar?: string
  role: 'USER' | 'ADMIN'
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
    accessToken: string | null
  login: (name: string, eventCode: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshAttempts, setRefreshAttempts] = useState(0)
  const router = useRouter()

  // Refresh access token using refresh token cookie
  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setAccessToken(data.accessToken)
        setUser(data.user)
        setRefreshAttempts(0)  // Reset on success
        return
      }
    } catch (error) {
      console.error('Failed to refresh auth:', error)
    }
    
    setUser(null)
    setAccessToken(null)
  }, [])

  // Initial auth check
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      await refreshAuth()
      setIsLoading(false)
    }

    initAuth()
  }, [refreshAuth])

  // Auto-refresh token before expiry (every 10 minutes for 15min token)
  // This ensures we have a 5-minute buffer before the token expires
  useEffect(() => {
    if (!accessToken) return

    const interval = setInterval(() => {
      refreshAuth()
    }, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [accessToken, refreshAuth])

  // Extra safety: aggressively refresh if access token is about to expire
  // This handles edge cases on slow/intermittent mobile connections
  useEffect(() => {
    if (!accessToken) return

    // Refresh every 5 minutes as a safety net (very conservative)
    const safetyInterval = setInterval(() => {
      refreshAuth()
    }, 5 * 60 * 1000)

    return () => clearInterval(safetyInterval)
  }, [accessToken, refreshAuth])

  const login = async (name: string, eventCode: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, eventCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Erreur de connexion' }
      }

      setAccessToken(data.accessToken)
      setUser(data.user)
      
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Erreur de connexion au serveur' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setAccessToken(null)
      router.push('/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
          accessToken,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
