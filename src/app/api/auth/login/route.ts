import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { loginSchema } from '@/lib/validations'
import {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
} from '@/lib/auth'
import { getZodMessage } from '@/lib/utils'

// Simple in-memory rate limiter
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 10 // 10 attempts per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const attempt = loginAttempts.get(ip)

  if (!attempt || now - attempt.firstAttempt > RATE_LIMIT_WINDOW) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now })
    return true
  }

  if (attempt.count >= RATE_LIMIT_MAX) {
    return false
  }

  attempt.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans une minute.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: getZodMessage(validationResult.error) },
        { status: 400 }
      )
    }

    const { name, eventCode } = validationResult.data

    // Find valid event code
    const eventCodeRecord = await prisma.eventCode.findUnique({
      where: { code: eventCode },
      include: {
        events: {
          include: { event: true },
        },
      },
    })

    if (!eventCodeRecord || !eventCodeRecord.isActive) {
      return NextResponse.json(
        { error: 'Code d\'événement invalide ou expiré' },
        { status: 401 }
      )
    }

    // Check expiry
    if (eventCodeRecord.expiresAt && eventCodeRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Ce code d\'événement a expiré' },
        { status: 401 }
      )
    }

    // Upsert user (find or create by name)
    let user = await prisma.user.findFirst({
      where: { name: name },
    })

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          name: name,
          role: 'USER',
        },
      })
    }

    // Link user to all events attached to the code
    const codeEvents = eventCodeRecord.events.map(e => e.event)
    for (const ev of codeEvents) {
      const existingLink = await prisma.eventUser.findUnique({
        where: {
          userId_eventId: {
            userId: user.id,
            eventId: ev.id,
          },
        },
      })
      if (!existingLink) {
        await prisma.eventUser.create({
          data: {
            userId: user.id,
            eventId: ev.id,
          },
        })
      }
    }

    // If master code, link to all events
    if (eventCodeRecord.isMaster) {
      const allEvents = await prisma.event.findMany({
        where: { status: { not: 'CLOSED' } },
      })

      for (const event of allEvents) {
        const exists = await prisma.eventUser.findUnique({
          where: {
            userId_eventId: {
              userId: user.id,
              eventId: event.id,
            },
          },
        })

        if (!exists) {
          await prisma.eventUser.create({
            data: {
              userId: user.id,
              eventId: event.id,
            },
          })
        }
      }
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      name: user.name,
      role: user.role as 'USER' | 'ADMIN',
    }

    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    // Save refresh token to database
    await saveRefreshToken(user.id, refreshToken)

    // Set refresh token cookie
    const response = NextResponse.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    })

    // Set cookie in response
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    // Set access token cookie for middleware
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
