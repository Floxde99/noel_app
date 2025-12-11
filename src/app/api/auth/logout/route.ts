import { NextRequest, NextResponse } from 'next/server'
import { revokeRefreshToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (refreshToken) {
      // Revoke the refresh token in database
      await revokeRefreshToken(refreshToken)
    }

    // Create response
    const response = NextResponse.json({ success: true })

    // Clear the cookies
    response.cookies.delete('refreshToken')
    response.cookies.delete('access_token')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    // Even on error, clear the cookies
    const response = NextResponse.json({ success: true })
    response.cookies.delete('refreshToken')
    response.cookies.delete('access_token')
    return response
  }
}
