import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

async function requireAdmin(request: NextRequest) {
  let token = null
  
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    token = request.cookies.get('access_token')?.value
  }

  if (!token) return null
  const payload = verifyAccessToken(token)
  if (!payload || payload.role !== 'ADMIN') return null
  return payload
}

// DELETE /api/admin/codes/[id] - Delete code
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const payload = await requireAdmin(request)
    if (!payload) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    await prisma.eventCode.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete code error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
