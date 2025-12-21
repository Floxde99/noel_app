import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from './prisma';
import { cookies } from 'next/headers';

// Fonction pour obtenir les secrets de manière paresseuse (lazy)
function getJwtSecrets() {
  const JWT_SECRET = process.env.JWT_SECRET;
  const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

  // In production we require explicit secrets. In development, provide
  // a fallback so `npm run dev` works without env setup (but log a warning).
  if (!JWT_SECRET || !NEXTAUTH_SECRET) {
    const missing = [] as string[]
    if (!JWT_SECRET) missing.push('JWT_SECRET')
    if (!NEXTAUTH_SECRET) missing.push('NEXTAUTH_SECRET')

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`JWT secrets must be defined. Missing: ${missing.join(', ')}.`)
    }

    console.warn(`Warning: Missing JWT secrets (${missing.join(', ')}). Using insecure development defaults.`)
    return {
      JWT_SECRET: JWT_SECRET || 'dev-jwt-secret-change-me',
      NEXTAUTH_SECRET: NEXTAUTH_SECRET || 'dev-nextauth-secret-change-me',
    }
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
  const expiresIn = (process.env.JWT_REFRESH_EXPIRY || '15d') as SignOptions['expiresIn'];
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
  const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '15d'
  const expiresInMs = parseExpiry(refreshExpiry)
  const expiresAt = new Date(Date.now() + expiresInMs)

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
  // In this app we rotate refresh tokens. Keeping old tokens forever makes the
  // table grow quickly (especially in dev). Deleting the token is enough to
  // mark it invalid.
  await prisma.refreshToken.deleteMany({
    where: { token },
  })
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  })
}

export async function cleanupRefreshTokens(userId?: string): Promise<void> {
  const now = new Date()
  await prisma.refreshToken.deleteMany({
    where: {
      ...(userId ? { userId } : {}),
      OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
    },
  })
}

export async function pruneUserRefreshTokens(userId: string, maxActiveTokens = 5): Promise<void> {
  const now = new Date()
  const active = await prisma.refreshToken.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  if (active.length <= maxActiveTokens) return

  const toDelete = active.slice(maxActiveTokens).map((t) => t.id)
  await prisma.refreshToken.deleteMany({
    where: { id: { in: toDelete } },
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

// Helper to get auth from request (cookie or bearer token)
export async function getAuth(request: Request): Promise<TokenPayload | null> {
  // Try cookie first
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  if (accessToken) {
    const payload = verifyAccessToken(accessToken)
    if (payload) return payload
  }

  // Try Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const payload = verifyAccessToken(token)
    if (payload) return payload
  }

  return null
}
