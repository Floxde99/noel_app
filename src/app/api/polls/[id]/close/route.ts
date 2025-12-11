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

// POST /api/polls/[id]/close - Close poll and create contributions from top 2 options
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const payload = await getAuth(request)
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const poll = await prisma.poll.findUnique({
      where: { id: params.id },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
      },
    })

    if (!poll) {
      return NextResponse.json({ error: 'Sondage non trouvé' }, { status: 404 })
    }

    if (poll.isClosed) {
      return NextResponse.json(
        { error: 'Ce sondage est déjà fermé' },
        { status: 400 }
      )
    }

    // Sort options by vote count (descending)
    const sortedOptions = [...poll.options].sort(
      (a, b) => b._count.votes - a._count.votes
    )

    // Get top 2 options (or all if less than 2)
    const topOptions = sortedOptions.slice(0, 2).filter((opt) => opt._count.votes > 0)

    // Create contributions from top options
    const createdContributions = []
    for (const option of topOptions) {
      const contribution = await prisma.contribution.create({
        data: {
          title: option.label,
          description: `Ajouté automatiquement depuis le sondage: "${poll.title}"`,
          category: 'autre',
          quantity: 1,
          eventId: poll.eventId,
          fromPollId: poll.id,
          status: 'PLANNED',
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      })
      createdContributions.push(contribution)
    }

    // Close the poll
    const closedPoll = await prisma.poll.update({
      where: { id: params.id },
      data: {
        isClosed: true,
        closedAt: new Date(),
      },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
      },
    })

    return NextResponse.json({
      poll: {
        ...closedPoll,
        options: closedPoll.options.map((option: { id: string; label: string; _count: { votes: number } }) => ({
          id: option.id,
          label: option.label,
          voteCount: option._count.votes,
        })),
      },
      createdContributions,
      message: topOptions.length > 0
        ? `Sondage fermé. ${topOptions.length} contribution(s) ajoutée(s) automatiquement.`
        : 'Sondage fermé. Aucune contribution ajoutée (pas de votes).',
    })
  } catch (error) {
    console.error('Close poll error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
