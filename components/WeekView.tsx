'use client';

import { CalendarEvent } from '@/types';
import { Droppable } from '@hello-pangea/dnd';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import { he } from 'date-fns/locale';
import { useState } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 50;

interface Props {
  date: Date;
  events: CalendarEvent[];
  onDeleteEvent: (id: string) => void;
}

export default function WeekView({ date, events, onDeleteEvent }: Props) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventStyle = (event: CalendarEvent) => {
    const [startH, startM] = event.startTime.split(':').map(Number);
    const top = (startH + startM / 60) * SLOT_HEIGHT;
    const height = (event.duration / 60) * SLOT_HEIGHT;
    return { top, height: Math.max(height, 20) };
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Day headers */}
      <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className={`text-center py-2 ${isToday(day) ? 'bg-indigo-50' : ''}`}>
            <div className="text-[10px] text-gray-400">{format(day, 'EEE', { locale: he })}</div>
            <div className={`text-sm font-bold ${isToday(day) ? 'text-indigo-600' : 'text-gray-700'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="relative" style={{ height: `${24 * SLOT_HEIGHT}px` }}>
          {/* Grid */}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
            {/* Time column */}
            <div className="relative">
              {HOURS.map((h) => (
                <div key={h} className="absolute w-full" style={{ top: h * SLOT_HEIGHT }}>
                  <span className="text-[10px] text-gray-400 block text-right pr-1">
                    {String(h).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = events.filter((e) => e.date === dateStr);
              return (
                <Droppable key={dateStr} droppableId={`day-${dateStr}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`relative border-r border-gray-100 ${
                        snapshot.isDraggingOver ? 'bg-indigo-50/50' : isToday(day) ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* Hour lines */}
                      {HOURS.map((h) => (
                        <div
                          key={h}
                          className="absolute w-full border-t border-gray-100"
                          style={{ top: h * SLOT_HEIGHT }}
                        />
                      ))}

                      {/* Events */}
                      {dayEvents.map((event) => {
                        const style = getEventStyle(event);
                        const isExpanded = expandedEventId === event.id;
                        return (
                          <div
                            key={event.id}
                            className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 overflow-hidden cursor-pointer shadow-sm"
                            style={{
                              top: style.top,
                              height: style.height,
                              backgroundColor: event.color + '25',
                              borderRight: `2px solid ${event.color}`,
                            }}
                            onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-[9px] font-semibold text-gray-800 truncate leading-tight">
                                {event.title}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.id); }}
                                className="text-gray-300 hover:text-red-400 text-xs leading-none flex-shrink-0"
                              >
                                ×
                              </button>
                            </div>
                            {isExpanded && event.description && (
                              <div className="text-[8px] text-gray-600 mt-0.5">{event.description}</div>
                            )}
                          </div>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
