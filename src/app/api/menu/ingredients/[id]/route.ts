import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { getZodMessage } from '@/lib/utils'
import { updateMenuIngredientSchema } from '@/lib/validations'

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

// PATCH /api/menu/ingredients/[id] - update ingredient
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getAuth(request)
    if (!payload) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await ctx.params

    const ingredient = await prisma.menuIngredient.findUnique({
      where: { id },
      include: { recipe: { select: { eventId: true } } },
    })
    if (!ingredient) return NextResponse.json({ error: 'Ingrédient introuvable' }, { status: 404 })

    const ok = await ensureEventAccess(ingredient.recipe.eventId, payload.userId, payload.role)
    if (!ok) return NextResponse.json({ error: 'Accès non autorisé à cet événement' }, { status: 403 })

    const body = await request.json()
    const parsed = updateMenuIngredientSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodMessage(parsed.error) }, { status: 400 })
    }

    const updated = await prisma.menuIngredient.update({
      where: { id },
      data: {
        name: parsed.data.name,
        details: parsed.data.details,
      },
    })

    return NextResponse.json({ ingredient: updated })
  } catch (error) {
    console.error('PATCH /api/menu/ingredients/[id] error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

// DELETE /api/menu/ingredients/[id] - delete ingredient
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getAuth(request)
    if (!payload) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await ctx.params

    const ingredient = await prisma.menuIngredient.findUnique({
      where: { id },
      include: { recipe: { select: { eventId: true } }, contribution: { select: { id: true } } },
    })
    if (!ingredient) return NextResponse.json({ error: 'Ingrédient introuvable' }, { status: 404 })

    const ok = await ensureEventAccess(ingredient.recipe.eventId, payload.userId, payload.role)
    if (!ok) return NextResponse.json({ error: 'Accès non autorisé à cet événement' }, { status: 403 })

    await prisma.menuIngredient.delete({ where: { id } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('DELETE /api/menu/ingredients/[id] error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
