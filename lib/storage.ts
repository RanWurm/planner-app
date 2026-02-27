import { Activity, CalendarEvent } from '@/types';

// ── Detect environment ──────────────────────────────────────────────────────
// When KV_REST_API_URL is set (Vercel production / Vercel CLI pull), use KV.
// Otherwise fall back to a local JSON file so dev needs zero infrastructure.
const USE_KV = !!process.env.UPSTASH_REDIS_REST_URL;

// ── Local JSON file fallback (development only) ─────────────────────────────
// Runs only on the server (API routes), never in the browser.
async function readFile(): Promise<{ activities: Activity[]; events: CalendarEvent[] }> {
  const { readFile, writeFile, mkdir } = await import('fs/promises');
  const path = await import('path');
  const filePath = path.join(process.cwd(), 'data', 'db.json');
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { activities: [], events: [] };
  }
}

async function writeFileData(data: { activities: Activity[]; events: CalendarEvent[] }): Promise<void> {
  const { writeFile, mkdir } = await import('fs/promises');
  const path = await import('path');
  const dir = path.join(process.cwd(), 'data');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'db.json'), JSON.stringify(data, null, 2), 'utf-8');
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function getActivities(): Promise<Activity[]> {
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis');
const kv = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
    const activities = await kv.get<Activity[]>('activities');
    return activities || [];
  }
  return (await readFile()).activities;
}

export async function saveActivities(activities: Activity[]): Promise<void> {
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis');
const kv = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
    await kv.set('activities', activities);
    return;
  }
  const data = await readFile();
  await writeFileData({ ...data, activities });
}

export async function getEvents(): Promise<CalendarEvent[]> {
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis');
const kv = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
    const events = await kv.get<CalendarEvent[]>('events');
    return events || [];
  }
  return (await readFile()).events;
}

export async function saveEvents(events: CalendarEvent[]): Promise<void> {
  if (USE_KV) {
    const { Redis } = await import('@upstash/redis');
const kv = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
    await kv.set('events', events);
    return;
  }
  const data = await readFile();
  await writeFileData({ ...data, events });
}
