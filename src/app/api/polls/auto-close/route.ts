import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// GET /api/polls/auto-close - Close expired polls
export async function GET(request: NextRequest) {
  try {
    // Optional: verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const now = new Date()

    // Find polls that should be auto-closed
    const expiredPolls = await prisma.poll.findMany({
      where: {
        isClosed: false,
        autoClose: {
          lte: now,
        },
      },
      select: {
        id: true,
        title: true,
        eventId: true,
      },
    })

    // Close them
    if (expiredPolls.length > 0) {
      await prisma.poll.updateMany({
        where: {
          id: {
            in: expiredPolls.map((p) => p.id),
          },
        },
        data: {
          isClosed: true,
          closedAt: now,
        },
      })
    }

    return NextResponse.json({
      success: true,
      closed: expiredPolls.length,
      polls: expiredPolls,
    })
  } catch (error) {
    console.error('Auto-close polls error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
