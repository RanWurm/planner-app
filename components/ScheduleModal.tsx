'use client';

import React, { useState } from 'react';
import { Activity } from '@/types';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 10, 20, 30, 40, 50];

interface ScheduleActivityModalProps {
  activity: Activity;
  initialDate: Date;
  onConfirm: (startTime: string, date: Date) => void;
  onClose: () => void;
}

export function ScheduleActivityModal({ activity, initialDate, onConfirm, onClose }: ScheduleActivityModalProps) {
  const now = new Date();
  const TODAY = new Date(); TODAY.setHours(0,0,0,0);
  const [date, setDate] = useState(initialDate);
  const [hour, setHour] = useState(now.getHours());
  const [minute, setMinute] = useState(Math.ceil(now.getMinutes() / 10) * 10 % 60);

  const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  const changeDay = (dir: number) => {
    setDate(d => {
      const next = new Date(d);
      next.setDate(next.getDate() + dir);
      if (next < TODAY) return d;
      return next;
    });
  };

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">תזמן פעילות</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="rounded-xl px-3 py-2.5 mb-5" style={{ backgroundColor: activity.color + '20', borderRight: `3px solid ${activity.color}` }}>
          <div className="font-semibold text-gray-800 text-sm">{activity.title}</div>
          <div className="text-xs text-gray-500">{activity.duration} דקות</div>
        </div>

        {/* Date navigator */}
        <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-xl px-3 py-2">
          <button onClick={() => changeDay(1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-indigo-600 text-lg">‹</button>
          <span className="text-sm font-medium text-gray-700">{format(date, 'EEEE, d בMMMM', { locale: he })}</span>
          <button onClick={() => changeDay(-1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-indigo-600 text-lg">›</button>
        </div>

        {/* Time picker */}
        <div className="flex gap-3 justify-center items-center mb-6">
          <select value={minute} onChange={(e) => setMinute(Number(e.target.value))} className="text-2xl font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center">
            {MINUTES.map((m) => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
          </select>
          <span className="text-2xl font-bold text-gray-400">:</span>
          <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="text-2xl font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center">
            {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
          </select>
        </div>

        <button onClick={() => onConfirm(startTime, date)} className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl transition text-sm">
          הוסף ל-{format(date, 'd/M', { locale: he })} ב-{startTime}
        </button>
      </div>
    </Overlay>
  );
}

interface PickActivityModalProps {
  activities: Activity[];
  targetDate: Date;
  targetTime: string;
  onConfirm: (activity: Activity) => void;
  onClose: () => void;
}

export function PickActivityModal({ activities, targetDate, targetTime, onConfirm, onClose }: PickActivityModalProps) {
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">בחר פעילות</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="text-center text-sm text-gray-500 mb-4">
          {format(targetDate, 'EEEE, d בMMMM', { locale: he })} ב-{targetTime}
        </div>

        {activities.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">
            <span className="text-3xl block mb-2">🎯</span>
            אין פעילויות בבריכה
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => onConfirm(activity)}
                className="w-full text-right rounded-xl px-3 py-3 transition hover:opacity-80 active:scale-95"
                style={{ backgroundColor: activity.color + '20', borderRight: `3px solid ${activity.color}` }}
              >
                <div className="font-semibold text-gray-800 text-sm">{activity.title}</div>
                <div className="text-xs text-gray-500">{activity.duration} דקות</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      {children}
    </div>
  );
}