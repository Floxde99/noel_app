import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email/client'
import { generateTaskReminderEmail, generateEventReminderEmail } from '@/lib/email/templates'

// GET /api/reminders/send - Send reminder emails for upcoming tasks and events
export async function GET(request: NextRequest) {
  try {
    // Optional: Protect with CRON_SECRET (same pattern as auto-close)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET) {
      const token = authHeader?.replace('Bearer ', '')
      if (token !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    const now = new Date()
    const reminderWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

    let sentCount = 0
    const results: any[] = []

    // 1. Find tasks with dueDate in the next 24 hours
    const upcomingTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: reminderWindow,
        },
        status: {
          not: 'DONE',
        },
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    })

    // Send task reminder emails
    for (const task of upcomingTasks) {
      if (!task.assignee?.email) {
        continue // Skip if no email configured
      }

      const emailData = generateTaskReminderEmail({
        taskTitle: task.title,
        taskDescription: task.description || undefined,
        dueDate: task.dueDate!.toISOString(),
        eventName: task.event.name,
        eventLocation: task.event.location || undefined,
        userName: task.assignee.name,
      })

      const sent = await sendEmail({
        to: task.assignee.email,
        ...emailData,
      })

      if (sent) {
        sentCount++
        results.push({ type: 'task', taskId: task.id, recipient: task.assignee.email })
      }
    }

    // 2. Find events starting in the next 24 hours
    const upcomingEvents = await prisma.event.findMany({
      where: {
        date: {
          gte: now,
          lte: reminderWindow,
        },
        status: 'OPEN',
      },
      include: {
        eventUsers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Send event reminder emails to all participants with email
    for (const event of upcomingEvents) {
      for (const eventUser of event.eventUsers) {
        if (!eventUser.user.email) {
          continue // Skip if no email
        }

        const emailData = generateEventReminderEmail({
          eventName: event.name,
          eventDescription: event.description || undefined,
          date: event.date.toISOString(),
          endDate: event.endDate?.toISOString(),
          location: event.location || undefined,
          userName: eventUser.user.name,
        })

        const sent = await sendEmail({
          to: eventUser.user.email,
          ...emailData,
        })

        if (sent) {
          sentCount++
          results.push({ type: 'event', eventId: event.id, recipient: eventUser.user.email })
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      results,
    })
  } catch (error) {
    console.error('Send reminders error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
