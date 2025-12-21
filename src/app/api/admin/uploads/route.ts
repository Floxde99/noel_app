import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { deleteImageFile } from '@/lib/imageProcessor'
import fs from 'fs/promises'
import path from 'path'

function isUploadsUrl(url: string): boolean {
  return typeof url === 'string' && /^\/uploads\/.+/.test(url)
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req)
    if (!auth?.role || auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const action = body?.action as 'delete-file' | 'moderate-image' | 'delete-orphans' | undefined
    const url = body?.url as string | undefined

    if (!action) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const relative = url ? url.replace(/^\//, '') : undefined // uploads/...

    if (action === 'delete-file') {
      if (!url || !isUploadsUrl(url)) {
        return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
      }
      await deleteImageFile(relative!)
      return NextResponse.json({ success: true, deletedFile: url })
    }

    if (action === 'moderate-image') {
      if (!url || !isUploadsUrl(url)) {
        return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
      }
      // Remove references but keep original messages/contributions/polls/events
      const [deletedChatMedia, updatedContribs, updatedPolls, updatedEvents] = await Promise.all([
        prisma.chatMessageMedia.deleteMany({ where: { imageUrl: url } }),
        prisma.contribution.updateMany({ where: { imageUrl: url }, data: { imageUrl: null } }),
        prisma.poll.updateMany({ where: { imageUrl: url }, data: { imageUrl: null } }),
        prisma.event.updateMany({ where: { bannerImage: url }, data: { bannerImage: null } }),
      ])

      // Finally remove the file itself
      await deleteImageFile(relative!)

      return NextResponse.json({
        success: true,
        url,
        results: {
          chatMediaDeleted: deletedChatMedia.count,
          contributionsUpdated: updatedContribs.count,
          pollsUpdated: updatedPolls.count,
          eventsUpdated: updatedEvents.count,
        },
      })
    }

    if (action === 'delete-orphans') {
      // Scan uploads folder and cross-reference with DB; remove unreferenced files
      const uploadsPath = path.join(process.cwd(), 'public', 'uploads')
      try {
        const [chatMedia, contribImages, pollImages, eventBanners] = await Promise.all([
          prisma.chatMessageMedia.findMany({ select: { imageUrl: true } }),
          prisma.contribution.findMany({ select: { imageUrl: true }, where: { imageUrl: { not: null } } }),
          prisma.poll.findMany({ select: { imageUrl: true }, where: { imageUrl: { not: null } } }),
          prisma.event.findMany({ select: { bannerImage: true }, where: { bannerImage: { not: null } } }),
        ])

        const refSet = new Set<string>()
        for (const m of chatMedia) if (m.imageUrl) refSet.add(m.imageUrl)
        for (const c of contribImages) if (c.imageUrl) refSet.add(c.imageUrl as string)
        for (const p of pollImages) if (p.imageUrl) refSet.add(p.imageUrl as string)
        for (const e of eventBanners) if (e.bannerImage) refSet.add(e.bannerImage as string)

        const items = await fs.readdir(uploadsPath, { withFileTypes: true })
        const deleted: string[] = []
        for (const item of items) {
          if (!item.isFile()) continue
          const filename = item.name
          const urlPath = `/uploads/${filename}`
          if (!refSet.has(urlPath)) {
            await deleteImageFile(`uploads/${filename}`)
            deleted.push(urlPath)
          }
        }

        return NextResponse.json({ success: true, deletedCount: deleted.length, deleted })
      } catch (error) {
        console.error('Delete orphans error:', error)
        return NextResponse.json({ error: 'Erreur lors du nettoyage des orphelins' }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (error) {
    console.error('Admin uploads action error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
