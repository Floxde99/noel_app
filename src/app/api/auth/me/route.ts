import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

// Middleware helper to verify auth
export async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const payload = verifyAccessToken(token)
  
  if (!payload) {
    return null
  }

  return payload
}

// Middleware helper to require admin role
export async function requireAdmin(request: NextRequest) {
  const payload = await verifyAuth(request)
  
  if (!payload || payload.role !== 'ADMIN') {
    return null
  }

  return payload
}

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth(request)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
