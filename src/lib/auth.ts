import jwt, { Secret, type SignOptions } from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import prisma from './prisma'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET
const ACCESS_EXPIRY: SignOptions['expiresIn'] =
  (process.env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn']) || ('15m' as SignOptions['expiresIn'])
const REFRESH_EXPIRY: SignOptions['expiresIn'] =
  (process.env.JWT_REFRESH_EXPIRY as SignOptions['expiresIn']) || ('7d' as SignOptions['expiresIn'])

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT secrets must be defined')
}

const accessSecret: Secret = ACCESS_SECRET
const refreshSecret: Secret = REFRESH_SECRET

interface TokenPayload {
  userId: string
  name: string
  role: 'USER' | 'ADMIN'
}

export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: ACCESS_EXPIRY }
  return jwt.sign(payload, accessSecret, options)
}

export function generateRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: REFRESH_EXPIRY,
    jwtid: randomUUID(),
  }
  return jwt.sign(payload, refreshSecret, options)
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, accessSecret) as TokenPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, refreshSecret) as TokenPayload
  } catch {
    return null
  }
}

export async function saveRefreshToken(userId: string, token: string): Promise<void> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  try {
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    })
  } catch (err: any) {
    // Handle unique constraint violations gracefully. This can happen in
    // rare race conditions or unexpected token reuse. If the token already
    // exists, update its expiry and user association instead of failing.
    if (err?.code === 'P2002') {
      try {
        await prisma.refreshToken.update({
          where: { token },
          data: { userId, expiresAt, revokedAt: null },
        })
        return
      } catch (updateErr) {
        // If update also fails, rethrow the original error for visibility
        console.error('Failed to update existing refresh token after P2002', updateErr)
        throw err
      }
    }
    throw err
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revokedAt: new Date() },
  })
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function isRefreshTokenValid(token: string): Promise<boolean> {
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token },
  })

  if (!storedToken) return false
  if (storedToken.revokedAt) return false
  if (storedToken.expiresAt < new Date()) return false

  return true
}

// Parse expiry string to milliseconds
export function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/)
  if (!match) return 15 * 60 * 1000 // default 15 minutes

  const value = parseInt(match[1])
  const unit = match[2]

  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: return 15 * 60 * 1000
  }
}
