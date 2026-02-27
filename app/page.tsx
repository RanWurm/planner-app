'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Activity, CalendarEvent, ViewMode } from '@/types';
import ActivityPool from '@/components/ActivityPool';
import DayView from '@/components/DayView';
import WeekView from '@/components/WeekView';
import MonthView from '@/components/MonthView';
import { PickActivityModal } from '@/components/ScheduleModal';
import { addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isBefore, isSameDay, format, startOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
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

function hasOverlap(events: CalendarEvent[], date: string, startTime: string, endTime: string): boolean {
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const newStart = sH * 60 + sM;
  const newEnd = eH * 60 + eM;
  return events.some((ev) => {
    if (ev.date !== date) return false;
    const [esH, esM] = ev.startTime.split(':').map(Number);
    const [eeH, eeM] = ev.endTime.split(':').map(Number);
    return newStart < eeH * 60 + eeM && newEnd > esH * 60 + esM;
  });
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

  const handleEventUpdate = useCallback(async (eventId: string, newStartTime: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const endTime = calcEndTime(newStartTime, ev.duration);
    if (hasOverlap(events.filter((e) => e.id !== eventId), ev.date, newStartTime, endTime)) return;
    await fetch(`/api/events?id=${eventId}`, { method: 'DELETE' });
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ev, id: undefined, startTime: newStartTime, endTime }),
    });
    const newEvent = await res.json();
    setEvents((prev) => [...prev.filter((e) => e.id !== eventId), newEvent]);
  }, [events]);

  const handleEventToPool = useCallback(async (eventId: string) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    await fetch(`/api/events?id=${eventId}`, { method: 'DELETE' });
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    const res = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: ev.title, description: ev.description, duration: ev.duration, color: ev.color }),
    });
    const activity = await res.json();
    setActivities((prev) => [...prev, activity]);
  }, [events]);

  const handleCellPress = useCallback(async (dateStr: string, time: string) => {
    if (pendingActivity) {
      if (viewMode !== 'day') {
        setCurrentDate(new Date(dateStr + 'T00:00:00'));
        setViewMode('day');
        return;
      }
      const endTime = calcEndTime(time, pendingActivity.duration);
      if (hasOverlap(events, dateStr, time, endTime)) return;
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
      setShowPool(true);
    } else {
      if (viewMode !== 'day') {
        setCurrentDate(new Date(dateStr + 'T00:00:00'));
        setViewMode('day');
        return;
      }
      setCellModal({ date: dateStr, time });
    }
  }, [pendingActivity, events, viewMode, handleDeleteActivity]);

  const handlePickActivityConfirm = useCallback(async (activity: Activity) => {
    if (!cellModal) return;
    const endTime = calcEndTime(cellModal.time, activity.duration);
    if (hasOverlap(events, cellModal.date, cellModal.time, endTime)) return;
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
  }, [cellModal, events, handleDeleteActivity]);

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
        if (hasOverlap(events, dateStr, startTime, endTime)) return;
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
        if (srcId === destId) return;
        if (hasOverlap(events.filter((e) => e.id !== eventId), dateStr, existingEvent.startTime, existingEvent.endTime)) return;
        await handleDeleteEvent(eventId);
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...existingEvent, id: undefined, date: dateStr }),
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
            <button onClick={() => navigate('next')} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-lg transition">›</button>
            <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition font-medium whitespace-nowrap">
              {viewMode === 'day' && format(currentDate, 'd MMMM yyyy', { locale: he })}
              {viewMode === 'week' && (() => { const ws = startOfWeek(currentDate, { weekStartsOn: 0 }); return `${format(ws, 'd.M')} - ${format(addDays(ws, 6), 'd.M')}`; })()}
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: he })}
            </button>
            <button onClick={() => navigate('prev')} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-lg transition">‹</button>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowPool(!showPool)}
              className={`hidden sm:block px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${showPool ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}
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

        {pendingActivity && (
          <div className="bg-indigo-500 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-medium">בחר מיקום ביומן עבור: {pendingActivity.title}</span>
            <button
              onClick={() => { setPendingActivity(null); setShowPool(true); }}
              className="text-white/80 hover:text-white text-sm px-2 py-0.5 rounded hover:bg-white/20 transition"
            >
              ביטול
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {viewMode === 'day' && <DayView date={currentDate} events={events} onDeleteEvent={handleDeleteEvent} onCellPress={handleCellPress} onEventUpdate={handleEventUpdate} onEventToPool={handleEventToPool} />}
            {viewMode === 'week' && <WeekView date={currentDate} events={events} onDeleteEvent={handleDeleteEvent} onCellPress={handleCellPress} />}
            {viewMode === 'month' && <MonthView date={currentDate} events={events} onDeleteEvent={handleDeleteEvent} minDate={TODAY} maxDate={addMonths(TODAY, 120)} onCellPress={handleCellPress} />}
          </div>

          {showPool && (
            <div className="hidden sm:flex w-64 border-r border-gray-200 bg-white flex-col p-3 overflow-hidden flex-shrink-0">
              <ActivityPool
                activities={activities}
                onAdd={handleAddActivity}
                onDelete={handleDeleteActivity}
                onClearAll={handleClearAll}
                onSchedule={(activity) => { setPendingActivity(activity); setShowPool(false); }}
              />
            </div>
          )}
        </div>

        {/* Mobile bottom sheet */}
        {showPool && (
          <div className="sm:hidden fixed inset-x-0 bottom-0 h-1/2 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-40 flex flex-col rounded-t-2xl">
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <ActivityPool
                activities={activities}
                onAdd={handleAddActivity}
                onDelete={handleDeleteActivity}
                onClearAll={handleClearAll}
                onSchedule={(activity) => { setPendingActivity(activity); setShowPool(false); }}
              />
            </div>
          </div>
        )}

        {/* Mobile floating toggle */}
        <button
          onClick={() => setShowPool(!showPool)}
          className="sm:hidden fixed bottom-4 left-4 z-50 w-12 h-12 rounded-full bg-indigo-500 text-white shadow-lg flex items-center justify-center text-xl active:scale-95 transition"
        >
          {showPool ? '✕' : '🎯'}
        </button>

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