import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  isRefreshTokenValid,
  revokeRefreshToken,
  parseExpiry,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (!refreshToken) {
      const response = NextResponse.json(
        { error: 'Token de rafraîchissement manquant' },
        { status: 401 }
      )
      response.cookies.delete('refreshToken')
      response.cookies.delete('access_token')
      return response
    }

    // Verify token signature
    const payload = verifyRefreshToken(refreshToken)
    if (!payload) {
      const response = NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      )
      response.cookies.delete('refreshToken')
      response.cookies.delete('access_token')
      return response
    }

    // Check if token is valid in database
    const isValid = await isRefreshTokenValid(refreshToken)
    if (!isValid) {
      const response = NextResponse.json(
        { error: 'Token révoqué ou expiré' },
        { status: 401 }
      )
      response.cookies.delete('refreshToken')
      response.cookies.delete('access_token')
      return response
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) {
      const response = NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 401 }
      )
      response.cookies.delete('refreshToken')
      response.cookies.delete('access_token')
      return response
    }

    // Revoke old refresh token
    await revokeRefreshToken(refreshToken)

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      name: user.name,
      role: user.role as 'USER' | 'ADMIN',
    }

    const newAccessToken = generateAccessToken(tokenPayload)
    const newRefreshToken = generateRefreshToken(tokenPayload)

    const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '15d'
    const refreshMaxAgeSec = Math.floor(parseExpiry(refreshExpiry) / 1000)
    const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m'
    const accessMaxAgeSec = Math.floor(parseExpiry(accessExpiry) / 1000)

    // Save new refresh token
    await saveRefreshToken(user.id, newRefreshToken)

    // Create response
    const response = NextResponse.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    })

    // Set new refresh token cookie
    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshMaxAgeSec,
      path: '/',
    })

    // Set access token cookie for middleware
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: accessMaxAgeSec,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Refresh token error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
