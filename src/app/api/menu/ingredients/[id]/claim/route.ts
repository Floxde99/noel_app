import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

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

// POST /api/menu/ingredients/[id]/claim - claim ingredient (creates a Contribution in separate category)
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getAuth(request)
    if (!payload) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await ctx.params

    const ingredient = await prisma.menuIngredient.findUnique({
      where: { id },
      include: {
        recipe: { select: { id: true, title: true, eventId: true } },
        contribution: { include: { assignee: { select: { id: true } } } },
      },
    })

    if (!ingredient) return NextResponse.json({ error: 'Ingrédient introuvable' }, { status: 404 })

    const ok = await ensureEventAccess(ingredient.recipe.eventId, payload.userId, payload.role)
    if (!ok) return NextResponse.json({ error: 'Accès non autorisé à cet événement' }, { status: 403 })

    if (ingredient.contributionId && ingredient.contribution?.assignee?.id) {
      return NextResponse.json({ error: 'Déjà pris' }, { status: 409 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const contrib = await tx.contribution.create({
        data: {
          title: ingredient.name,
          description: `${ingredient.recipe.title}${ingredient.details ? ` — ${ingredient.details}` : ''}`,
          category: 'ingredient',
          quantity: 1,
          status: 'CONFIRMED',
          eventId: ingredient.recipe.eventId,
          assigneeId: payload.userId,
        },
        include: {
          assignee: { select: { id: true, name: true, avatar: true } },
        },
      })

      const updatedIngredient = await tx.menuIngredient.update({
        where: { id: ingredient.id },
        data: { contributionId: contrib.id },
      })

      return { contrib, updatedIngredient }
    })

    return NextResponse.json({ contribution: result.contrib, ingredient: result.updatedIngredient })
  } catch (error) {
    console.error('POST /api/menu/ingredients/[id]/claim error:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
