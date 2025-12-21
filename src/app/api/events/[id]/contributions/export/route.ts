import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

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

// GET /api/events/[id]/contributions/export - Export contributions as CSV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuth(request)
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id: eventId } = await params

    // Check event access
    const eventUser = await prisma.eventUser.findUnique({
      where: {
        userId_eventId: {
          userId: payload.userId,
          eventId,
        },
      },
    })

    if (!eventUser && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé à cet événement' },
        { status: 403 }
      )
    }

    // Fetch contributions with assignee
    const contributions = await prisma.contribution.findMany({
      where: { eventId },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        quantity: true,
        budget: true,
        status: true,
        assignee: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { title: 'asc' },
      ],
    })

    // Build CSV content
    const headers = ['Catégorie', 'Titre', 'Description', 'Quantité', 'Budget (€)', 'Apporté par', 'Statut']
    const rows = contributions.map((c) => [
      c.category || 'Autre',
      c.title,
      c.description || '',
      c.quantity.toString(),
      c.budget ? Number(c.budget).toFixed(2) : '',
      c.assignee?.name || 'Non assigné',
      c.status === 'PLANNED' ? 'Prévu' : c.status === 'CONFIRMED' ? 'Confirmé' : 'Apporté',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="contributions_${eventId}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export contributions error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
