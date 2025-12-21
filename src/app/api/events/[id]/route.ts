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
// Query params: include=contributions,polls,tasks,chatMessages,menuRecipes,participants
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

    // Get query parameters for optional includes
    const { searchParams } = new URL(request.url)
    const includeParam = searchParams.get('include')?.split(',') || []
    
    // Build dynamic include object based on request
    const includeObj: any = {}
    
    if (includeParam.includes('participants') || includeParam.length === 0) {
      includeObj.eventUsers = {
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }
    }
    
    if (includeParam.includes('contributions')) {
      includeObj.contributions = {
        include: {
          assignee: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' as const },
      }
    }
    
    if (includeParam.includes('polls')) {
      includeObj.polls = {
        include: {
          createdBy: {
            select: { id: true, name: true, avatar: true },
          },
          options: {
            include: {
              _count: { select: { votes: true } },
              votes: {
                include: {
                  user: {
                    select: { id: true, name: true, avatar: true },
                  },
                },
              },
            },
          },
          votes: {
            where: { userId: payload.userId },
          },
        },
        orderBy: { createdAt: 'desc' as const },
      }
    }
    
    if (includeParam.includes('tasks')) {
      includeObj.tasks = {
        include: {
          assignee: {
            select: { id: true, name: true, avatar: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' as const },
      }
    }
    
    if (includeParam.includes('chatMessages')) {
      includeObj.chatMessages = {
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
          media: true,
        },
        orderBy: { createdAt: 'desc' as const },
        take: 50, // Last 50 messages
      }
    }
    
    if (includeParam.includes('menuRecipes')) {
      includeObj.menuRecipes = {
        orderBy: { createdAt: 'asc' as const },
        include: {
          ingredients: {
            orderBy: { createdAt: 'asc' as const },
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
      }
    }
    
    if (payload.role === 'ADMIN' && includeParam.includes('codes')) {
      includeObj.eventCodes = true
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: Object.keys(includeObj).length > 0 ? includeObj : undefined,
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Transform data for response
    const response: any = { event }
    
    if (event.eventUsers) {
      response.event.participants = event.eventUsers.map(
        (eu: { user: { id: string; name: string; avatar?: string | null } }) => eu.user
      )
      delete response.event.eventUsers
    }
    
    if (event.polls) {
      response.event.polls = event.polls.map(
        (poll: {
          id: string
          title: string
          description?: string | null
          type: 'SINGLE' | 'MULTIPLE'
          isClosed: boolean
          imageUrl?: string | null
          createdById?: string | null
          createdBy?: { id: string; name: string; avatar?: string | null } | null
          options: Array<{ id: string; label: string; _count: { votes: number }; votes: Array<{ user: { id: string; name: string; avatar?: string | null } }> }>
          votes: Array<{ optionId: string }>
        }) => ({
          id: poll.id,
          title: poll.title,
          description: poll.description,
          type: poll.type,
          isClosed: poll.isClosed,
          imageUrl: poll.imageUrl,
          createdBy: poll.createdBy,
          createdById: poll.createdById,
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
    }
    
    if (event.chatMessages) {
      response.event.chatMessages = event.chatMessages.reverse() // Chronological order
    }

    return NextResponse.json(response)
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
