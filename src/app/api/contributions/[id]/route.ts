import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { updateContributionSchema } from '@/lib/validations'
import { deleteImageFile } from '@/lib/imageProcessor'
import { getZodMessage } from '@/lib/utils'

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

// PATCH /api/contributions/[id] - Update contribution
export async function PATCH(
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
    const validationResult = updateContributionSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: getZodMessage(validationResult.error) },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Get contribution to check access
    const existing = await prisma.contribution.findUnique({
      where: { id: params.id },
      include: { event: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Contribution non trouvée' },
        { status: 404 }
      )
    }

    // Check access
    const eventUser = await prisma.eventUser.findUnique({
      where: {
        userId_eventId: {
          userId: payload.userId,
          eventId: existing.eventId,
        },
      },
    })

    if (!eventUser && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    const contribution = await prisma.contribution.update({
      where: { id: params.id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.quantity && { quantity: data.quantity }),
        ...(data.budget !== undefined && { budget: data.budget }),
        ...(data.status && { status: data.status }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
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

    return NextResponse.json({ contribution })
  } catch (error) {
    console.error('Update contribution error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// DELETE /api/contributions/[id] - Delete contribution
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

    const existing = await prisma.contribution.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Contribution non trouvée' },
        { status: 404 }
      )
    }

    // Only admin or assignee can delete
    if (existing.assigneeId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    // Delete associated image from filesystem if present
    if (existing.imageUrl && existing.imageUrl.startsWith('/uploads/')) {
      await deleteImageFile(existing.imageUrl.replace(/^\//, ''))
    }

    await prisma.contribution.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete contribution error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
