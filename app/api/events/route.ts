import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getEvents, saveEvents } from '@/lib/storage';
import { CalendarEvent } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const events = await getEvents();
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const events = await getEvents();

  const newEvent: CalendarEvent = {
    id: uuidv4(),
    activityId: body.activityId,
    title: body.title,
    description: body.description || '',
    duration: body.duration,
    color: body.color,
    date: body.date,
    startTime: body.startTime,
    endTime: body.endTime,
  };

  events.push(newEvent);
  await saveEvents(events);
  return NextResponse.json(newEvent, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  const events = await getEvents();
  const filtered = events.filter((e) => e.id !== id);
  await saveEvents(filtered);
  return NextResponse.json({ success: true });
}
