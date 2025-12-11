import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { createEventCodeSchema } from '@/lib/validations'
import { getZodMessage } from '@/lib/utils'

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

// GET /api/admin/codes - List all codes
export async function GET(request: NextRequest) {
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const codes = await prisma.eventCode.findMany({
      include: {
        events: {
          include: {
            event: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ codes })
  } catch (error) {
    console.error('Admin codes error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/admin/codes - Create code
export async function POST(request: NextRequest) {
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createEventCodeSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ error: getZodMessage(validation.error) }, { status: 400 })
    }

    const data = validation.data

    // Check if code already exists
    const existing = await prisma.eventCode.findUnique({
      where: { code: data.code },
    })

    if (existing) {
      return NextResponse.json({ error: 'Ce code existe déjà' }, { status: 400 })
    }

    const code = await prisma.eventCode.create({
      data: {
        code: data.code,
        isMaster: data.isMaster,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
        events: {
          create: data.eventIds.map((eventId: string) => ({ eventId }))
        },
      },
      include: {
        events: {
          include: { event: { select: { id: true, name: true } } },
        },
      },
    })

    return NextResponse.json({ code }, { status: 201 })
  } catch (error) {
    console.error('Create code error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
