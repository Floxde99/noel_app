import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import type { Prisma } from '@prisma/client'

const adminUserInclude = {
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
  contributions: {
    select: {
      id: true,
    },
  },
  _count: {
    select: {
      eventUsers: true,
    },
  },
} as const

type AdminUserWithRelations = Prisma.UserGetPayload<{ include: typeof adminUserInclude }>

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

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const users: AdminUserWithRelations[] = await prisma.user.findMany({
      include: adminUserInclude,
      orderBy: { createdAt: 'desc' },
    })

    const usersWithEvents = users.map((user) => {
      const events = user.eventUsers.map(({ event }) => event)
      const { eventUsers, ...userWithoutEventUsers } = user
      return {
        ...userWithoutEventUsers,
        events,
      }
    })

    return NextResponse.json(usersWithEvents)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST /api/admin/users - Create a user
export async function POST(request: NextRequest) {
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const name = (body?.name || '').trim()
    const email = body?.email ? String(body.email).trim() : null
    const role = body?.role === 'ADMIN' ? 'ADMIN' : 'USER'
    const avatar = body?.avatar ?? null

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 })
    }

    // Optional: ensure unique email if provided
    if (email) {
      const existing = await prisma.user.findFirst({ where: { email } })
      if (existing) {
        return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 400 })
      }
    }

    const user = await prisma.user.create({
      data: { name, email, role, avatar },
      include: adminUserInclude,
    })

    const events = user.eventUsers.map(({ event }) => event)
    const { eventUsers, ...userWithoutEventUsers } = user as any
    return NextResponse.json({ ...userWithoutEventUsers, events }, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
