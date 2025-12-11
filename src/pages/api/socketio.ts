import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import type { NextApiRequest, NextApiResponse } from 'next'

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    console.log('Socket is already attached')
    res.end()
    return
  }

  console.log('Initializing Socket.io server...')
  const io = new SocketIOServer(res.socket.server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  })

  // Socket.io event handlers
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Join event room
    socket.on('join-event', (eventId: string) => {
      socket.join(`event:${eventId}`)
      console.log(`Socket ${socket.id} joined event:${eventId}`)
    })

    // Leave event room
    socket.on('leave-event', (eventId: string) => {
      socket.leave(`event:${eventId}`)
      console.log(`Socket ${socket.id} left event:${eventId}`)
    })

    // Chat message
    socket.on('chat-message', (data: { eventId: string; message: any }) => {
      io.to(`event:${data.eventId}`).emit('new-message', data.message)
    })

    // Poll update (vote or close)
    socket.on('poll-update', (data: { eventId: string; poll: any }) => {
      io.to(`event:${data.eventId}`).emit('poll-updated', data.poll)
    })

    // Contribution update
    socket.on('contribution-update', (data: { eventId: string; contribution: any }) => {
      io.to(`event:${data.eventId}`).emit('contribution-updated', data.contribution)
    })

    // Task update
    socket.on('task-update', (data: { eventId: string; task: any }) => {
      io.to(`event:${data.eventId}`).emit('task-updated', data.task)
    })

    // Typing indicator
    socket.on('typing', (data: { eventId: string; userName: string }) => {
      socket.to(`event:${data.eventId}`).emit('user-typing', data.userName)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  res.socket.server.io = io
  res.end()
}
