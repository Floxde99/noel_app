import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { z } from 'zod'
import { getZodMessage } from '@/lib/utils'
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

const createPollSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  description: z.string().optional().nullable(),
  type: z.enum(['SINGLE', 'MULTIPLE']).default('SINGLE'),
  imageUrl: z.string().optional().nullable(),
  eventId: z.string().min(1, 'L\'événement est requis'),
  options: z.array(z.object({ label: z.string().min(1) })).min(2, 'Au moins 2 options sont requises'),
  autoClose: z.string().optional().nullable(), // ISO date string
})

// GET /api/admin/polls - List all polls
export async function GET(request: NextRequest) {
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const polls = await prisma.poll.findMany({
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
        _count: {
          select: {
            votes: true,
            options: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(polls)
  } catch (error) {
    console.error('Error fetching polls:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des sondages' },
      { status: 500 }
    )
  }
}

// POST /api/admin/polls - Create a new poll as admin
export async function POST(request: NextRequest) {
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const validationResult = createPollSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: getZodMessage(validationResult.error) },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
    })

    if (!event) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 })
    }

    // Create poll with options
    const poll = await prisma.poll.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type as PollType,
        imageUrl: data.imageUrl,
        eventId: data.eventId,
        createdById: payload.userId,
        autoClose: data.autoClose ? new Date(data.autoClose) : null,
        options: {
          createMany: {
            data: data.options.map((opt) => ({ label: opt.label })),
          },
        },
      },
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
        options: true,
        _count: {
          select: {
            votes: true,
            options: true,
          },
        },
      },
    })

    return NextResponse.json(poll, { status: 201 })
  } catch (error) {
    console.error('Error creating poll:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du sondage' },
      { status: 500 }
    )
  }
}
