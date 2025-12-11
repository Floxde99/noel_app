import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

async function requireAdmin(request: NextRequest) {
  let token = null
  
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    token = request.cookies.get('access_token')?.value
  }

  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload || payload.role !== 'ADMIN') return null
  return payload
}

// GET /api/admin/messages - List all messages (for moderation)
export async function GET(request: NextRequest) {
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const url = new URL(request.url)
    const eventId = url.searchParams.get('eventId')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    const messages = await prisma.chatMessage.findMany({
      where: {
        ...(eventId && { eventId }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        media: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des messages' },
      { status: 500 }
    )
  }
}
