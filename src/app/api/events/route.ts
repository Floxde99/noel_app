import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { createEventSchema } from '@/lib/validations'
import { getZodMessage } from '@/lib/utils'

// Helper to get auth
async function getAuth(request: NextRequest) {
  let token = null
  
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    token = request.cookies.get('access_token')?.value
  }
  
  if (!token) return null
  return verifyAccessToken(token)
}

// GET /api/events - List user's events
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuth(request)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Get events the user is linked to
    const eventUsers = (await prisma.eventUser.findMany({
      where: { userId: payload.userId },
      include: {
        event: {
          include: {
            _count: {
              select: {
                eventUsers: true,
                contributions: true,
                tasks: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          date: 'asc',
        },
      },
    })) as Array<{
      event: {
        id: string
        name: string
        description?: string | null
        date: Date
        endDate?: Date | null
        location?: string | null
        mapUrl?: string | null
        status: string
        bannerImage?: string | null
        createdAt: Date
        updatedAt: Date
        _count: {
          eventUsers: number
          contributions: number
          tasks: number
        }
      }
    }>

    const events = eventUsers.map((eu) => ({
      ...eu.event,
      participantCount: eu.event._count.eventUsers,
      contributionCount: eu.event._count.contributions,
      taskCount: eu.event._count.tasks,
    }))

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Get events error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST /api/events - Create new event (admin only)
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuth(request)
    
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createEventSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: getZodMessage(validationResult.error) },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const event = await prisma.event.create({
      data: {
        name: data.name,
        description: data.description,
        date: new Date(data.date),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        location: data.location,
        mapUrl: data.mapUrl || undefined,
        status: data.status,
      },
    })

    // Automatically link admin to the event
    await prisma.eventUser.create({
      data: {
        userId: payload.userId,
        eventId: event.id,
      },
    })

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('Create event error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
