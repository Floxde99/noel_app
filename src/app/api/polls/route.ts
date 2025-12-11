import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { createPollSchema, voteSchema } from '@/lib/validations'
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

// POST /api/polls - Create poll
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = createPollSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('Create poll validation error:', validationResult.error)
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

    console.log('Create poll request:', { eventId: data.eventId, title: data.title, options: data.options, userId: payload.userId })

    if (!eventUser && payload.role !== 'ADMIN') {
      console.error('Create poll unauthorized: user', payload.userId, 'not part of event', data.eventId)
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const poll = await prisma.poll.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        imageUrl: data.imageUrl,
        eventId: data.eventId,
        // set createdById directly (client accepts this shape)
        createdById: payload.userId,
        autoClose: data.autoClose ? new Date(data.autoClose) : undefined,
        options: {
          create: data.options.map((opt) => ({ label: opt })),
        },
      },
      include: {
        options: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ poll }, { status: 201 })
  } catch (error) {
    console.error('Create poll error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
