export interface Activity {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes (10-60)
  color: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  activityId: string;
  title: string;
  description?: string;
  duration: number;
  color: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export type ViewMode = 'day' | 'week' | 'month';
