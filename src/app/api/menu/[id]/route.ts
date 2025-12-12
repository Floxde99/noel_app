import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { getZodMessage } from '@/lib/utils'
import { updateMenuRecipeSchema } from '@/lib/validations'

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

// GET /api/menu/[id] - recipe details + ingredients
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getAuth(request)
    if (!payload) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await ctx.params

    const recipe = await prisma.menuRecipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          orderBy: { createdAt: 'asc' },
          include: {
            contribution: {
              include: {
                assignee: { select: { id: true, name: true, avatar: true } },
              },
            },
          },
        },
      },
    })

    if (!recipe) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 })

    const ok = await ensureEventAccess(recipe.eventId, payload.userId, payload.role)
    if (!ok) return NextResponse.json({ error: 'Accès non autorisé à cet événement' }, { status: 403 })

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('GET /api/menu/[id] error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// PATCH /api/menu/[id] - update recipe
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getAuth(request)
    if (!payload) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await ctx.params

    const body = await request.json()
    const parsed = updateMenuRecipeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodMessage(parsed.error) }, { status: 400 })
    }

    const existing = await prisma.menuRecipe.findUnique({ where: { id }, select: { eventId: true } })
    if (!existing) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 })

    const ok = await ensureEventAccess(existing.eventId, payload.userId, payload.role)
    if (!ok) return NextResponse.json({ error: 'Accès non autorisé à cet événement' }, { status: 403 })

    const recipe = await prisma.menuRecipe.update({
      where: { id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
      },
    })

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('PATCH /api/menu/[id] error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// DELETE /api/menu/[id] - delete recipe
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getAuth(request)
    if (!payload) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await ctx.params

    const existing = await prisma.menuRecipe.findUnique({ where: { id }, select: { eventId: true } })
    if (!existing) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 })

    const ok = await ensureEventAccess(existing.eventId, payload.userId, payload.role)
    if (!ok) return NextResponse.json({ error: 'Accès non autorisé à cet événement' }, { status: 403 })

    await prisma.menuRecipe.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/menu/[id] error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
