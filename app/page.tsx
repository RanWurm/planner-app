'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Activity, CalendarEvent, ViewMode } from '@/types';
import ActivityPool from '@/components/ActivityPool';
import DayView from '@/components/DayView';
import WeekView from '@/components/WeekView';
import MonthView from '@/components/MonthView';
import { PickActivityModal } from '@/components/ScheduleModal';
import { addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isBefore, isSameDay } from 'date-fns';
import { signOut } from 'next-auth/react';

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function calcEndTime(startTime: string, duration: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + duration;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export default function PlannerPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showPool, setShowPool] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pendingActivity, setPendingActivity] = useState<Activity | null>(null);
  const [cellModal, setCellModal] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/activities').then((r) => r.json()),
      fetch('/api/events').then((r) => r.json()),
    ]).then(([acts, evts]) => {
      setActivities(acts);
      setEvents(evts);
      setLoading(false);
    });
  }, []);

  const handleAddActivity = useCallback(async (data: Omit<Activity, 'id' | 'createdAt'>) => {
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const activity = await res.json();
    setActivities((prev) => [...prev, activity]);
  }, []);

  const handleDeleteActivity = useCallback(async (id: string) => {
    await fetch(`/api/activities?id=${id}`, { method: 'DELETE' });
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleClearAll = useCallback(async () => {
    await fetch('/api/activities?id=all', { method: 'DELETE' });
    setActivities([]);
  }, []);

  const handleDeleteEvent = useCallback(async (id: string) => {
    await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleCellPress = useCallback(async (dateStr: string, time: string) => {
    if (pendingActivity) {
      const endTime = calcEndTime(time, pendingActivity.duration);
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: pendingActivity.id,
          title: pendingActivity.title,
          description: pendingActivity.description,
          duration: pendingActivity.duration,
          color: pendingActivity.color,
          date: dateStr,
          startTime: time,
          endTime,
        }),
      });
      const newEvent = await res.json();
      setEvents((prev) => [...prev, newEvent]);
      await handleDeleteActivity(pendingActivity.id);
      setPendingActivity(null);
    } else {
      setCellModal({ date: dateStr, time });
    }
  }, [pendingActivity, handleDeleteActivity]);

  const handlePickActivityConfirm = useCallback(async (activity: Activity) => {
    if (!cellModal) return;
    const endTime = calcEndTime(cellModal.time, activity.duration);
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activityId: activity.id,
        title: activity.title,
        description: activity.description,
        duration: activity.duration,
        color: activity.color,
        date: cellModal.date,
        startTime: cellModal.time,
        endTime,
      }),
    });
    const newEvent = await res.json();
    setEvents((prev) => [...prev, newEvent]);
    await handleDeleteActivity(activity.id);
    setCellModal(null);
  }, [cellModal, handleDeleteActivity]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, draggableId, source } = result;
      if (!destination) return;

      const destId = destination.droppableId;
      const srcId = source.droppableId;

      if (destId === 'pool') return;
      if (!destId.startsWith('day-')) return;

      const dateStr = destId.replace('day-', '');
      const targetDate = new Date(dateStr + 'T00:00:00');
      if (isBefore(targetDate, TODAY) && !isSameDay(targetDate, TODAY)) return;

      if (srcId === 'pool') {
        const activityId = draggableId.replace('pool-', '');
        const activityData = activities.find((a) => a.id === activityId);
        if (!activityData) return;
        const startTime = '09:00';
        const endTime = calcEndTime(startTime, activityData.duration);
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityId: activityData.id,
            title: activityData.title,
            description: activityData.description,
            duration: activityData.duration,
            color: activityData.color,
            date: dateStr,
            startTime,
            endTime,
          }),
        });
        const newEvent = await res.json();
        setEvents((prev) => [...prev, newEvent]);
        await handleDeleteActivity(activityData.id);

      } else if (srcId.startsWith('day-')) {
        const eventId = draggableId.replace('event-', '');
        const existingEvent = events.find((e) => e.id === eventId);
        if (!existingEvent) return;
        await handleDeleteEvent(eventId);
        const startTime = '09:00';
        const endTime = calcEndTime(startTime, existingEvent.duration);
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...existingEvent, id: undefined, date: dateStr, startTime, endTime }),
        });
        const newEvent = await res.json();
        setEvents((prev) => [...prev, newEvent]);
      }
    },
    [activities, events, handleDeleteActivity, handleDeleteEvent]
  );

  const navigate = (dir: 'prev' | 'next') => {
    setCurrentDate((d) => {
      if (viewMode === 'day') return dir === 'next' ? addDays(d, 1) : subDays(d, 1);
      if (viewMode === 'week') return dir === 'next' ? addWeeks(d, 1) : subWeeks(d, 1);
      return dir === 'next' ? addMonths(d, 1) : subMonths(d, 1);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div dir="rtl" className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between gap-2 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl">📅</span>
            <span className="font-bold text-gray-800 text-sm hidden sm:inline">היומן שלי</span>
          </div>

          <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5 flex-shrink-0">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode === 'day' ? 'יום' : mode === 'week' ? 'שבוע' : 'חודש'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => navigate('prev')} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-lg transition">›</button>
            <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium whitespace-nowrap">היום</button>
            <button onClick={() => navigate('next')} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-lg transition">‹</button>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowPool(!showPool)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${showPool ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}
            >
              🎯
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-500 transition"
            >
              ↩
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {viewMode === 'day' && <DayView date={currentDate} events={events} onDeleteEvent={handleDeleteEvent} onCellPress={handleCellPress} />}
            {viewMode === 'week' && <WeekView date={currentDate} events={events} onDeleteEvent={handleDeleteEvent} onCellPress={handleCellPress} />}
            {viewMode === 'month' && <MonthView date={currentDate} events={events} onDeleteEvent={handleDeleteEvent} minDate={TODAY} maxDate={addMonths(TODAY, 120)} onCellPress={handleCellPress} />}
          </div>

          {showPool && (
            <div className="w-60 sm:w-64 border-r border-gray-200 bg-white flex flex-col p-3 overflow-hidden flex-shrink-0">
              <ActivityPool
                activities={activities}
                onAdd={handleAddActivity}
                onDelete={handleDeleteActivity}
                onClearAll={handleClearAll}
                onSchedule={(activity) => setPendingActivity(activity)}
              />
            </div>
          )}
        </div>

        {cellModal && (
          <PickActivityModal
            activities={activities}
            targetDate={new Date(cellModal.date + 'T00:00:00')}
            targetTime={cellModal.time}
            onConfirm={handlePickActivityConfirm}
            onClose={() => setCellModal(null)}
          />
        )}
      </div>
    </DragDropContext>
  );
}