import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'
import { updateProfileSchema } from '@/lib/validations'
import { getZodMessage } from '@/lib/utils'

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

// PATCH /api/profile - Update own profile
export async function PATCH(request: NextRequest) {
  try {
    const payload = await getAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const validationResult = updateProfileSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: getZodMessage(validationResult.error) },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Check email uniqueness if provided
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: payload.userId },
        },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 400 }
        )
      }
    }

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.avatar && { avatar: data.avatar }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
