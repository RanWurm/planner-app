import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getActivities, saveActivities } from '@/lib/storage';
import { Activity } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activities = await getActivities();
  return NextResponse.json(activities);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const activities = await getActivities();

  const newActivity: Activity = {
    id: uuidv4(),
    title: body.title,
    description: body.description || '',
    duration: body.duration,
    color: body.color || '#3B82F6',
    createdAt: new Date().toISOString(),
  };

  activities.push(newActivity);
  await saveActivities(activities);
  return NextResponse.json(newActivity, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id === 'all') {
    await saveActivities([]);
    return NextResponse.json({ success: true });
  }

  const activities = await getActivities();
  const filtered = activities.filter((a) => a.id !== id);
  await saveActivities(filtered);
  return NextResponse.json({ success: true });
}
