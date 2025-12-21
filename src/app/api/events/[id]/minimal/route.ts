import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

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

// GET /api/events/[id]/minimal - Get only essential event info
// Returns: id, name, description, date, endDate, location, mapUrl, status, participant count
// Size: ~2 ko vs 160 ko for full event
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const payload = await getAuth(request)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const eventId = params.id

    // Check user has access to this event
    const eventUser = await prisma.eventUser.findUnique({
      where: {
        userId_eventId: {
          userId: payload.userId,
          eventId: eventId,
        },
      },
    })

    if (!eventUser && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé à cet événement' },
        { status: 403 }
      )
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        description: true,
        date: true,
        endDate: true,
        location: true,
        mapUrl: true,
        status: true,
        bannerImage: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            eventUsers: true,
            contributions: true,
            polls: true,
            tasks: true,
            chatMessages: true,
            menuRecipes: true,
          },
        },
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      event: {
        ...event,
        counts: event._count,
      },
    })
  } catch (error) {
    console.error('Get minimal event error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
