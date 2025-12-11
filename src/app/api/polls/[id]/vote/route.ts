import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

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

// POST /api/polls/[id]/vote - Vote on poll
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const payload = await getAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { optionIds } = body as { optionIds: string[] }

    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
      return NextResponse.json(
        { error: 'Au moins une option est requise' },
        { status: 400 }
      )
    }

    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: { options: true },
    })

    if (!poll) {
      return NextResponse.json({ error: 'Sondage non trouvé' }, { status: 404 })
    }

    if (poll.isClosed) {
      return NextResponse.json(
        { error: 'Ce sondage est fermé' },
        { status: 400 }
      )
    }

    // Check user has access to event
    const eventUser = await prisma.eventUser.findUnique({
      where: {
        userId_eventId: {
          userId: payload.userId,
          eventId: poll.eventId,
        },
      },
    })

    if (!eventUser && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // Single choice: only one option allowed
    if (poll.type === 'SINGLE' && optionIds.length > 1) {
      return NextResponse.json(
        { error: 'Une seule option autorisée pour ce sondage' },
        { status: 400 }
      )
    }

    // Validate all options belong to this poll
    const validOptionIds = poll.options.map((o: { id: string }) => o.id)
    for (const optionId of optionIds) {
      if (!validOptionIds.includes(optionId)) {
        return NextResponse.json(
          { error: 'Option invalide' },
          { status: 400 }
        )
      }
    }

    // Delete existing votes for this user on this poll
    await prisma.pollVote.deleteMany({
      where: {
        pollId: params.id,
        userId: payload.userId,
      },
    })

    // Create new votes
    await prisma.pollVote.createMany({
      data: optionIds.map((optionId) => ({
        pollId: params.id,
        optionId,
        userId: payload.userId,
      })),
    })

    // Return updated poll with vote counts
    const updatedPoll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
        votes: {
          where: { userId: payload.userId },
        },
      },
    })

    return NextResponse.json({
      poll: {
        ...updatedPoll,
        options: updatedPoll!.options.map((option: { id: string; label: string; _count: { votes: number } }) => ({
          id: option.id,
          label: option.label,
          voteCount: option._count.votes,
        })),
        hasVoted: true,
        userVotes: optionIds,
      },
    })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// DELETE /api/polls/[id]/vote - Remove vote
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const payload = await getAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
    })

    if (!poll) {
      return NextResponse.json({ error: 'Sondage non trouvé' }, { status: 404 })
    }

    if (poll.isClosed) {
      return NextResponse.json(
        { error: 'Ce sondage est fermé' },
        { status: 400 }
      )
    }

    await prisma.pollVote.deleteMany({
      where: {
        pollId: params.id,
        userId: payload.userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove vote error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
