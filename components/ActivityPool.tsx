'use client';

import { useState } from 'react';
import { Activity } from '@/types';
import { Draggable, Droppable } from '@hello-pangea/dnd';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#06b6d4',
];

const DURATIONS = [10, 15, 20, 30, 45, 60];

interface Props {
  activities: Activity[];
  onAdd: (activity: Omit<Activity, 'id' | 'createdAt'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
}

export default function ActivityPool({ activities, onAdd, onDelete, onClearAll }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [color, setColor] = useState(COLORS[0]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onAdd({ title: title.trim(), description, duration, color });
    setTitle('');
    setDescription('');
    setDuration(30);
    setColor(COLORS[0]);
    setShowForm(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800 text-base">בריכת פעילויות</h2>
        <div className="flex gap-2">
          {activities.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
            >
              נקה הכל
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition font-medium"
          >
            {showForm ? '✕' : '+ הוסף'}
          </button>
        </div>
      </div>

      {/* Confirm clear */}
      {confirmClear && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-sm">
          <p className="text-red-700 font-medium mb-2">למחוק את כל הפעילויות?</p>
          <div className="flex gap-2">
            <button
              onClick={async () => { await onClearAll(); setConfirmClear(false); }}
              className="flex-1 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium"
            >
              מחק הכל
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="flex-1 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2.5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="שם הפעילות *"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-right"
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="תיאור (אופציונלי)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none text-right"
          />
          <div className="flex gap-2">
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d} דקות</option>
              ))}
            </select>
          </div>
          {/* Color picker */}
          <div className="flex gap-1.5 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition"
          >
            הוסף פעילות
          </button>
        </form>
      )}

      {/* Droppable pool */}
      <Droppable droppableId="pool" isDropDisabled={false}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto space-y-2 min-h-[60px] rounded-xl transition-colors ${
              snapshot.isDraggingOver ? 'bg-indigo-50' : ''
            }`}
          >
            {activities.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                <span className="text-3xl block mb-2">🎯</span>
                אין פעילויות עדיין
              </div>
            )}
            {activities.map((activity, index) => (
              <Draggable key={activity.id} draggableId={`pool-${activity.id}`} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`relative bg-white rounded-xl border p-3 shadow-sm transition-shadow ${
                      snapshot.isDragging ? 'shadow-lg rotate-1' : 'hover:shadow-md'
                    }`}
                    style={{
                      borderColor: activity.color + '40',
                      borderRightWidth: '3px',
                      borderRightColor: activity.color,
                      ...provided.draggableProps.style,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-800 text-sm truncate">{activity.title}</span>
                          {activity.description && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId(expandedId === activity.id ? null : activity.id);
                              }}
                              className="w-4 h-4 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: activity.color }}
                              title="מידע נוסף"
                            >
                              i
                            </button>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{activity.duration} דקות</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(activity.id);
                        }}
                        className="text-gray-300 hover:text-red-400 transition text-lg leading-none flex-shrink-0"
                      >
                        ×
                      </button>
                    </div>
                    {expandedId === activity.id && activity.description && (
                      <div
                        className="mt-2 pt-2 border-t text-xs text-gray-600 text-right"
                        style={{ borderColor: activity.color + '30' }}
                      >
                        {activity.description}
                      </div>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
