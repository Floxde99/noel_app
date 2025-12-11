import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

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

// GET /api/admin/messages/[id] - Get message details
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        media: true,
      },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message non trouvé' }, { status: 404 })
    }

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error fetching message:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du message' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/messages/[id] - Delete message (moderation)
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const message = await prisma.chatMessage.delete({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ 
      message: 'Message supprimé avec succès',
      deletedMessage: message,
    })
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du message' },
      { status: 500 }
    )
  }
}
