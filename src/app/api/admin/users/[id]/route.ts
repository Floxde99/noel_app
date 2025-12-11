import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import type { Role } from '@prisma/client'

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

// GET /api/admin/users/[id] - Get user details
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        eventUsers: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        contributions: true,
        assignedTasks: true,
        createdTasks: true,
        pollVotes: true,
        chatMessages: true,
        _count: {
          select: {
            eventUsers: true,
            contributions: true,
            chatMessages: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'utilisateur' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/users/[id] - Update user (role, name, avatar, etc.)
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, avatar, role } = body

    const validRoles = ['USER', 'ADMIN']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Rôle invalide. Doit être: USER ou ADMIN' },
        { status: 400 }
      )
    }

    // Prevent admin from demoting themselves
    if (params.id === payload.userId && role && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas modifier votre propre rôle' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email: email || null }),
        ...(avatar !== undefined && { avatar }),
        ...(role && { role: role as Role }),
      },
      include: {
        eventUsers: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            eventUsers: true,
            contributions: true,
            chatMessages: true,
          },
        },
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'utilisateur' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // Prevent admin from deleting themselves
    if (params.id === payload.userId) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
