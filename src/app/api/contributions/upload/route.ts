import { NextRequest, NextResponse } from 'next/server';
import { processImageToWebP } from '@/lib/imageProcessor';
import { verifyAccessToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const eventId = formData.get('eventId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!eventId) {
      return NextResponse.json({ error: 'No event ID provided' }, { status: 400 });
    }

    // Verify user has access to event
    const eventUser = await prisma.eventUser.findUnique({
      where: {
        userId_eventId: {
          userId: payload.userId,
          eventId,
        },
      },
    });

    if (!eventUser && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;

    // Process image and convert to WebP
    const result = await processImageToWebP(buffer, mimeType, file.name);

    return NextResponse.json(
      {
        success: true,
        imageUrl: result.url,
        filename: result.filename,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Image upload error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process image';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
