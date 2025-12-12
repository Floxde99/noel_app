import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { getZodMessage } from '@/lib/utils'
import { createMenuRecipeSchema } from '@/lib/validations'

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

async function ensureEventAccess(eventId: string, userId: string, role: string) {
  if (role === 'ADMIN') return true
  const eventUser = await prisma.eventUser.findUnique({
    where: { userId_eventId: { userId, eventId } },
    select: { id: true },
  })
  return !!eventUser
}

// GET /api/menu?eventId=... - List recipes for event
export async function GET(request: NextRequest) {
  try {
    const payload = await getAuth(request)
    if (!payload) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const url = new URL(request.url)
    const eventId = url.searchParams.get('eventId')
    if (!eventId) return NextResponse.json({ error: 'eventId requis' }, { status: 400 })

    const ok = await ensureEventAccess(eventId, payload.userId, payload.role)
    if (!ok) return NextResponse.json({ error: 'Accès non autorisé à cet événement' }, { status: 403 })

    const recipes = await prisma.menuRecipe.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { ingredients: true } },
      },
    })

    return NextResponse.json({ recipes })
  } catch (error) {
    console.error('GET /api/menu error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// POST /api/menu - Create recipe (USER+ADMIN of event)
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuth(request)
    if (!payload) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const parsed = createMenuRecipeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodMessage(parsed.error) }, { status: 400 })
    }

    const ok = await ensureEventAccess(parsed.data.eventId, payload.userId, payload.role)
    if (!ok) return NextResponse.json({ error: 'Accès non autorisé à cet événement' }, { status: 403 })

    const recipe = await prisma.menuRecipe.create({
      data: {
        eventId: parsed.data.eventId,
        title: parsed.data.title,
        description: parsed.data.description,
        createdById: payload.userId,
      },
    })

    return NextResponse.json({ recipe }, { status: 201 })
  } catch (error) {
    console.error('POST /api/menu error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
