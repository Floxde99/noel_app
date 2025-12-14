import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { getZodMessage } from '@/lib/utils'
import { z } from 'zod'

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

const updatePollSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['SINGLE', 'MULTIPLE']).optional(),
  imageUrl: z.string().optional().nullable(),
  options: z.array(z.object({ id: z.string().optional(), label: z.string().min(1) })).optional(),
})

// PATCH /api/polls/[id] - Update poll
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const params = await props.params
    const pollId = params.id
    const body = await request.json()

    const validationResult = updatePollSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: getZodMessage(validationResult.error) },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Check poll exists and user is creator
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { event: true },
    })

    if (!poll) {
      return NextResponse.json({ error: 'Sondage non trouvé' }, { status: 404 })
    }

    // Verify user is creator or admin
    if (poll.createdById !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à modifier ce sondage' },
        { status: 403 }
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
      return NextResponse.json(
        { error: 'Accès non autorisé à cet événement' },
        { status: 403 }
      )
    }

    // Update poll
    const updatedPoll = await prisma.poll.update({
      where: { id: pollId },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        imageUrl: data.imageUrl,
      },
      include: {
        options: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    })

    // Handle options update if provided
    if (data.options && Array.isArray(data.options)) {
      // Delete existing options
      await prisma.pollOption.deleteMany({
        where: { pollId },
      })

      // Create new options
      await prisma.pollOption.createMany({
        data: data.options.map((opt) => ({
          pollId,
          label: opt.label,
        })),
      })
    }

    return NextResponse.json({ success: true, poll: updatedPoll })
  } catch (error) {
    console.error('Update poll error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
