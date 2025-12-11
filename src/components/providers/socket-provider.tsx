"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './auth-provider'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  joinEvent: (eventId: string) => void
  leaveEvent: (eventId: string) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      path: '/api/socketio',
      auth: {
        userId: user.id,
        userName: user.name,
      },
    })

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected')
      setSocket(socketInstance)
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket disconnected')
      setIsConnected(false)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    return () => {
      socketInstance.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [isAuthenticated, user])

  const joinEvent = (eventId: string) => {
    if (socket && isConnected) {
      socket.emit('join-event', eventId)
    }
  }

  const leaveEvent = (eventId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-event', eventId)
    }
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinEvent,
        leaveEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
