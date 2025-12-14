import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { updateEventSchema } from '@/lib/validations'
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

// GET /api/events/[id] - Get event details
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
      include: {
        eventUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        contributions: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        polls: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            options: {
              include: {
                _count: {
                  select: { votes: true },
                },
                votes: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        avatar: true,
                      },
                    },
                  },
                },
              },
            },
            votes: {
              where: { userId: payload.userId },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        chatMessages: {
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
          orderBy: { createdAt: 'desc' },
          take: 50, // Last 50 messages
        },
        menuRecipes: {
          orderBy: { createdAt: 'asc' },
          include: {
            ingredients: {
              orderBy: { createdAt: 'asc' },
              include: {
                contribution: {
                  include: {
                    assignee: {
                      select: { id: true, name: true, avatar: true },
                    },
                  },
                },
              },
            },
          },
        },
        eventCodes: payload.role === 'ADMIN' ? true : false,
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Transform data for response
    const participants = event.eventUsers.map(
      (eu: { user: { id: string; name: string; avatar?: string | null } }) => eu.user
    )
    
    const polls = event.polls.map(
      (poll: {
        id: string
        title: string
        description?: string | null
        type: 'SINGLE' | 'MULTIPLE'
        isClosed: boolean
        createdBy?: { id: string; name: string; avatar?: string | null } | null
        options: Array<{ id: string; label: string; _count: { votes: number }; votes: Array<{ user: { id: string; name: string; avatar?: string | null } }> }>
        votes: Array<{ optionId: string }>
      }) => ({
        ...poll,
        options: poll.options.map((option: { id: string; label: string; _count: { votes: number }; votes: Array<{ user: { id: string; name: string; avatar?: string | null } }> }) => ({
          id: option.id,
          label: option.label,
          voteCount: option._count.votes,
          voters: option.votes.map((v: { user: { id: string; name: string; avatar?: string | null } }) => v.user),
        })),
        hasVoted: poll.votes.length > 0,
        userVotes: poll.votes.map((v: { optionId: string }) => v.optionId),
      })
    )

    return NextResponse.json({
      event: {
        ...event,
        participants,
        polls,
        chatMessages: event.chatMessages.reverse(), // Chronological order
      },
    })
  } catch (error) {
    console.error('Get event error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// PATCH /api/events/[id] - Update event (admin only)
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const payload = await getAuth(request)
    
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = updateEventSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: getZodMessage(validationResult.error) },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const event = await prisma.event.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.mapUrl !== undefined && { mapUrl: data.mapUrl || null }),
        ...(data.status && { status: data.status }),
      },
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Update event error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// DELETE /api/events/[id] - Delete event (admin only)
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const payload = await getAuth(request)
    
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    await prisma.event.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete event error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
