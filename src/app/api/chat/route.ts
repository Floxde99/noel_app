import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { createMessageSchema } from '@/lib/validations'
import { getZodMessage } from '@/lib/utils'

async function getAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    return verifyAccessToken(token)
  }
  const cookieToken = request.cookies.get('access_token')?.value
  if (cookieToken) return verifyAccessToken(cookieToken)
  return null
}

// GET /api/chat?eventId=xxx - Get chat messages
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId est requis' },
        { status: 400 }
      )
    }

    // Check user has access to event
    const eventUser = await prisma.eventUser.findUnique({
      where: {
        userId_eventId: {
          userId: payload.userId,
          eventId: eventId,
        },
      },
    })

    if (!eventUser && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const messages = await prisma.chatMessage.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        media: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST /api/chat - Send message
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = createMessageSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: getZodMessage(validationResult.error) },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Check user has access to event
    const eventUser = await prisma.eventUser.findUnique({
      where: {
        userId_eventId: {
          userId: payload.userId,
          eventId: data.eventId,
        },
      },
    })

    if (!eventUser && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const message = await prisma.chatMessage.create({
      data: {
        content: data.content,
        eventId: data.eventId,
        userId: payload.userId,
        media: data.imageUrls && data.imageUrls.length > 0 ? {
          create: data.imageUrls.map((url) => ({
            imageUrl: url,
          })),
        } : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        media: true,
      },
    })

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
