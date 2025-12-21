import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET /api/tasks/[id]/ical - Export task as iCal file
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const payload = await getAuth(request)
    
    if (!payload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 })
    }

    // Check access
    const eventUser = await prisma.eventUser.findUnique({
      where: {
        userId_eventId: {
          userId: payload.userId,
          eventId: task.eventId,
        },
      },
    })

    if (!eventUser && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // If task is private, only creator, assignee and admins can export
    if (task.isPrivate) {
      const canView = payload.role === 'ADMIN' || 
                      task.createdById === payload.userId || 
                      task.assigneeId === payload.userId

      if (!canView) {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
      }
    }

    // Generate iCal content
    const icalContent = generateICalContent(task)

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="tache_${task.id}.ics"`,
      },
    })
  } catch (error) {
    console.error('Export iCal error:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// Helper function to generate iCal format
function generateICalContent(task: any): string {
  const now = new Date()
  const formatDate = (date: Date): string => {
    // Format: YYYYMMDDTHHmmssZ (UTC)
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  }

  // Status mapping
  const statusMap: Record<string, string> = {
    'TODO': 'NEEDS-ACTION',
    'IN_PROGRESS': 'IN-PROCESS',
    'DONE': 'COMPLETED',
  }

  // Build VTODO (task) in iCalendar format
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Noel Family App//Task Export//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTODO',
    `UID:task-${task.id}@noel-family-app`,
    `DTSTAMP:${formatDate(now)}`,
    `CREATED:${formatDate(new Date(task.createdAt))}`,
    `LAST-MODIFIED:${formatDate(new Date(task.updatedAt))}`,
    `SUMMARY:${escapeICalText(task.title)}`,
  ]

  if (task.description) {
    lines.push(`DESCRIPTION:${escapeICalText(task.description)}`)
  }

  if (task.dueDate) {
    lines.push(`DUE:${formatDate(new Date(task.dueDate))}`)
  }

  // Add status
  lines.push(`STATUS:${statusMap[task.status] || 'NEEDS-ACTION'}`)

  // Add priority (default to medium)
  lines.push('PRIORITY:5')

  // Add organizer (creator)
  if (task.createdBy) {
    lines.push(`ORGANIZER;CN=${escapeICalText(task.createdBy.name)}:MAILTO:noreply@noel-family-app`)
  }

  // Add attendee (assignee)
  if (task.assignee) {
    lines.push(`ATTENDEE;CN=${escapeICalText(task.assignee.name)}:MAILTO:noreply@noel-family-app`)
  }

  // Add location if available from event
  if (task.event?.location) {
    lines.push(`LOCATION:${escapeICalText(task.event.location)}`)
  }

  // Add related event
  lines.push(`RELATED-TO;RELTYPE=PARENT:event-${task.event.id}`)
  lines.push(`COMMENT:Événement: ${escapeICalText(task.event.name)}`)

  // Add completion date if done
  if (task.status === 'DONE') {
    lines.push(`COMPLETED:${formatDate(new Date(task.updatedAt))}`)
    lines.push('PERCENT-COMPLETE:100')
  } else if (task.status === 'IN_PROGRESS') {
    lines.push('PERCENT-COMPLETE:50')
  } else {
    lines.push('PERCENT-COMPLETE:0')
  }

  lines.push('END:VTODO')
  lines.push('END:VCALENDAR')

  // Join with CRLF (RFC 5545 requirement)
  return lines.join('\r\n')
}

// Escape special characters in iCal text fields
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')   // Backslash
    .replace(/;/g, '\\;')     // Semicolon
    .replace(/,/g, '\\,')     // Comma
    .replace(/\n/g, '\\n')    // Newline
}
