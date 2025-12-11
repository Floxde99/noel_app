import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiting (pour production, utiliser Redis)
const rateLimit = new Map<string, { count: number; timestamp: number }>()

const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 30 // 30 requests per minute for login

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
  return `${ip}:${request.nextUrl.pathname}`
}

function isRateLimited(key: string, max: number): boolean {
  const now = Date.now()
  const entry = rateLimit.get(key)

  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW) {
    rateLimit.set(key, { count: 1, timestamp: now })
    return false
  }

  if (entry.count >= max) {
    return true
  }

  entry.count++
  return false
}

// Nettoyer les anciennes entrées périodiquement
setInterval(() => {
  const now = Date.now()
  rateLimit.forEach((value, key) => {
    if (now - value.timestamp > RATE_LIMIT_WINDOW) {
      rateLimit.delete(key)
    }
  })
}, RATE_LIMIT_WINDOW)

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.headers.set('Access-Control-Allow-Credentials', 'true')

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }

    // Rate limiting for login endpoint
    if (pathname === '/api/auth/login' && request.method === 'POST') {
      const key = getRateLimitKey(request)
      if (isRateLimited(key, RATE_LIMIT_MAX)) {
        return NextResponse.json(
          { error: 'Trop de tentatives. Réessayez dans une minute.' },
          { status: 429 }
        )
      }
    }

    return response
  }

  // Redirect authenticated users away from login page
  if (pathname === '/login') {
    const accessToken = request.cookies.get('access_token')?.value
    if (accessToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protect authenticated routes
  const protectedPaths = ['/dashboard', '/events', '/profile', '/admin']
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    const accessToken = request.cookies.get('access_token')?.value
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Security headers
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
}
