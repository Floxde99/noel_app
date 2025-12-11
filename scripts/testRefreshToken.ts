import { randomUUID } from 'crypto'
import { generateRefreshToken, saveRefreshToken } from '../src/lib/auth'
import prisma from '../src/lib/prisma'

async function main() {
  const payload = { userId: process.argv[2] || 'cmj03qkgb0009i6fzyxn700ln', name: 'Test', role: 'USER' as const }
  const token = generateRefreshToken(payload)
  console.log('Generated token length:', token.length)
  try {
    await saveRefreshToken(payload.userId, token)
    console.log('Saved refresh token successfully')
  } catch (err) {
    console.error('Error saving refresh token:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
