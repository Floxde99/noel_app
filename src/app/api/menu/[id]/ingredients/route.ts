import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { getZodMessage } from '@/lib/utils'
import { createMenuIngredientSchema } from '@/lib/validations'

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

// POST /api/menu/[id]/ingredients - create ingredient
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getAuth(request)
    if (!payload) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await ctx.params

    const recipe = await prisma.menuRecipe.findUnique({ where: { id }, select: { id: true, eventId: true } })
    if (!recipe) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 })

    const ok = await ensureEventAccess(recipe.eventId, payload.userId, payload.role)
    if (!ok) return NextResponse.json({ error: 'Accès non autorisé à cet événement' }, { status: 403 })

    const body = await request.json()
    const parsed = createMenuIngredientSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: getZodMessage(parsed.error) }, { status: 400 })
    }

    const ingredient = await prisma.menuIngredient.create({
      data: {
        recipeId: id,
        name: parsed.data.name,
        details: parsed.data.details,
      },
    })

    return NextResponse.json({ ingredient }, { status: 201 })
  } catch (error) {
    console.error('POST /api/menu/[id]/ingredients error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
