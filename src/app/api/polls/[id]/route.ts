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

    // If imageUrl is explicitly null and there was an old image, delete it
    if (data.imageUrl === null && poll.imageUrl) {
      const { deleteImageFile } = await import('@/lib/imageProcessor')
      if (poll.imageUrl.startsWith('/uploads/')) {
        await deleteImageFile(poll.imageUrl).catch((err) => 
          console.error('Failed to delete old poll image:', err)
        )
      }
    }

    // Update poll
    const updatedPoll = await prisma.poll.update({
      where: { id: pollId },
      data: {
        title: data.title,
        ...(data.description !== undefined && { description: data.description }),
        ...(data.type && { type: data.type }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
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
      if (data.options.length > 0) {
        await prisma.pollOption.createMany({
          data: data.options.map((opt) => ({
            pollId,
            label: opt.label,
          })),
        })
      }

      // Fetch updated poll with new options
      const finalPoll = await prisma.poll.findUnique({
        where: { id: pollId },
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

      return NextResponse.json({ success: true, poll: finalPoll })
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

// DELETE /api/polls/[id] - Delete poll (creator or admin only)
export async function DELETE(
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

    // Check poll exists and user is creator
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        createdById: true,
        imageUrl: true,
        eventId: true,
      },
    })

    if (!poll) {
      return NextResponse.json({ error: 'Sondage non trouvé' }, { status: 404 })
    }

    // Verify user is creator or admin
    if (poll.createdById !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à supprimer ce sondage' },
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

    // Delete image file if it exists
    if (poll.imageUrl && poll.imageUrl.startsWith('/uploads/')) {
      const { deleteImageFile } = await import('@/lib/imageProcessor')
      await deleteImageFile(poll.imageUrl).catch((err) => 
        console.error('Failed to delete poll image:', err)
      )
    }

    // Delete poll (cascade will delete options and votes)
    await prisma.poll.delete({
      where: { id: pollId },
    })

    return NextResponse.json({ message: 'Sondage supprimé avec succès' })
  } catch (error) {
    console.error('Delete poll error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
