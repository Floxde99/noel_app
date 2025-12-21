import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import type { PollType } from '@prisma/client'

async function requireAdmin(request: NextRequest) {
  let token = null
  
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    token = request.cookies.get('access_token')?.value
  }

  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload || payload.role !== 'ADMIN') return null
  return payload
}

// GET /api/admin/polls/[id] - Get poll details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const { id } = await params

    const poll = await prisma.poll.findUnique({
      where: { id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        options: {
          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            votes: true,
            options: true,
          },
        },
      },
    })

    if (!poll) {
      return NextResponse.json({ error: 'Sondage non trouvé' }, { status: 404 })
    }

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Error fetching poll:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du sondage' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/polls/[id] - Update poll (close, title, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, type, isClosed, autoClose } = body

    const validTypes = ['SINGLE', 'MULTIPLE']
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Type invalide. Doit être: SINGLE ou MULTIPLE' },
        { status: 400 }
      )
    }

    const { id } = await params

    const poll = await prisma.poll.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(type && { type: type as PollType }),
        ...(isClosed !== undefined && { isClosed }),
        ...(autoClose && { autoClose: new Date(autoClose) }),
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        options: {
          include: {
            _count: {
              select: {
                votes: true,
              },
            },
          },
        },
        _count: {
          select: {
            votes: true,
            options: true,
          },
        },
      },
    })

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Error updating poll:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du sondage' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/polls/[id] - Delete poll
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const { id } = await params

    // Get poll to check for image
    const poll = await prisma.poll.findUnique({
      where: { id },
      select: { imageUrl: true }
    })

    // Delete image file if it exists
    if (poll?.imageUrl && poll.imageUrl.startsWith('/uploads/')) {
      const { deleteImageFile } = await import('@/lib/imageProcessor')
      await deleteImageFile(poll.imageUrl).catch((err) => 
        console.error('Failed to delete poll image:', err)
      )
    }

    await prisma.poll.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Sondage supprimé avec succès' })
  } catch (error) {
    console.error('Error deleting poll:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du sondage' },
      { status: 500 }
    )
  }
}
