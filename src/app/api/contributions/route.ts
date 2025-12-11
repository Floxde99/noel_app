import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { createContributionSchema, updateContributionSchema } from '@/lib/validations'
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

// POST /api/contributions - Create contribution
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = createContributionSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('Create contribution validation error:', validationResult.error)
      return NextResponse.json(
        { error: getZodMessage(validationResult.error) },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Check user has access to event
    const eventUser = await prisma.eventUser.findUnique({
      where: {
        userId_eventId: {
          userId: payload.userId,
          eventId: data.eventId,
        },
      },
    })

    if (!eventUser && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé à cet événement' },
        { status: 403 }
      )
    }

    const contribution = await prisma.contribution.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        quantity: data.quantity,
        imageUrl: data.imageUrl,
        eventId: data.eventId,
        assigneeId: data.assigneeId || payload.userId, // Default to self
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

    return NextResponse.json({ contribution }, { status: 201 })
  } catch (error) {
    console.error('Create contribution error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
