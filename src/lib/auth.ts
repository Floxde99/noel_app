import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from './prisma';
import { cookies } from 'next/headers';

// Fonction pour obtenir les secrets de manière paresseuse (lazy)
function getJwtSecrets() {
  const JWT_SECRET = process.env.JWT_SECRET;
  const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

  if (!JWT_SECRET || !NEXTAUTH_SECRET) {
    throw new Error('JWT secrets must be defined');
  }

  return { JWT_SECRET, NEXTAUTH_SECRET };
}

export interface TokenPayload {
  userId: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

export function generateAccessToken(payload: TokenPayload): string {
  const { JWT_SECRET } = getJwtSecrets();
  const expiresIn = (process.env.JWT_ACCESS_EXPIRY || '15m') as SignOptions['expiresIn'];
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function generateRefreshToken(payload: TokenPayload): string {
  const { NEXTAUTH_SECRET } = getJwtSecrets();
  const expiresIn = (process.env.JWT_REFRESH_EXPIRY || '7d') as SignOptions['expiresIn'];
  return jwt.sign(payload, NEXTAUTH_SECRET, { expiresIn });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const { JWT_SECRET } = getJwtSecrets();
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const { NEXTAUTH_SECRET } = getJwtSecrets();
    return jwt.verify(token, NEXTAUTH_SECRET) as TokenPayload;
  } catch {
    return null;
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
