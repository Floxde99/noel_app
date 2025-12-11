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

// GET /api/admin/events - List all events
export async function GET(request: NextRequest) {
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const events = await prisma.event.findMany({
      include: {
        _count: {
          select: {
            eventUsers: true,
            contributions: true,
            tasks: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Admin events error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
