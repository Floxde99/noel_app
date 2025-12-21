import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

// Helper to get auth
async function getAuth(request: NextRequest) {
  let token = null
  
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    token = request.cookies.get('access_token')?.value
  }
  
  if (!token) return null
  return verifyAccessToken(token)
}

// GET /api/events/[id]/menu - Get menu recipes and ingredients
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const payload = await getAuth(request)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const eventId = params.id

    // Check user has access to this event
    const eventUser = await prisma.eventUser.findUnique({
      where: {
        userId_eventId: {
          userId: payload.userId,
          eventId: eventId,
        },
      },
    })

    if (!eventUser && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé à cet événement' },
        { status: 403 }
      )
    }

    const menuRecipes = await prisma.menuRecipe.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      include: {
        ingredients: {
          orderBy: { createdAt: 'asc' },
          include: {
            contribution: {
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      menuRecipes,
      count: menuRecipes.length,
    })
  } catch (error) {
    console.error('Get menu error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
