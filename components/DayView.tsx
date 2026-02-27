'use client';

import { CalendarEvent } from '@/types';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { useState } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_HEIGHT = 60; // px per hour

interface Props {
  date: Date;
  events: CalendarEvent[];
  onDeleteEvent: (id: string) => void;
  onCellPress: (dateStr: string, time: string) => void;
}

export default function DayView({ date, events, onDeleteEvent, onCellPress }: Props) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayEvents = events.filter((e) => e.date === dateStr);

  const getEventStyle = (event: CalendarEvent) => {
    const [startH, startM] = event.startTime.split(':').map(Number);
    const top = (startH + startM / 60) * SLOT_HEIGHT;
    const height = (event.duration / 60) * SLOT_HEIGHT;
    return { top, height: Math.max(height, 24) };
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="text-center py-3 border-b border-gray-100">
        <div className="text-lg font-bold text-gray-800">
          {format(date, 'EEEE', { locale: he })}
        </div>
        <div className="text-sm text-gray-500">
          {format(date, 'd בMMMM yyyy', { locale: he })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="relative pt-3 pb-3" style={{ height: `${24 * SLOT_HEIGHT + 24}px` }}>
          {/* Hour lines */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute w-full border-t border-gray-100 flex"
              style={{ top: hour * SLOT_HEIGHT }}
            >
              <span className="text-xs text-gray-400 w-10 text-left pr-1 -mt-2.5 flex-shrink-0">
                {String(hour).padStart(2, '0')}:00
              </span>
              <div className="flex-1" />
            </div>
          ))}

          {/* 10-min slot lines */}
          {HOURS.map((hour) =>
            [1, 2, 3, 4, 5].map((tenth) => (
              <div
                key={`${hour}-${tenth}`}
                className="absolute w-full border-t border-gray-50"
                style={{ top: hour * SLOT_HEIGHT + tenth * 10, right: 40 }}
              />
            ))
          )}

          {/* Droppable column */}
          <Droppable droppableId={`day-${dateStr}`}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`absolute inset-0 mr-10 transition-colors ${
                  snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''
                }`}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const totalMinutes = Math.round((y / SLOT_HEIGHT) * 60 / 10) * 10;
                  const h = Math.floor(totalMinutes / 60);
                  const m = totalMinutes % 60;
                  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  onCellPress(dateStr, time);
                }}
              >
                {/* Placed events */}
                {dayEvents.map((event, idx) => {
                  const style = getEventStyle(event);
                  const isExpanded = expandedEventId === event.id;
                  return (
                    <Draggable key={event.id} draggableId={`event-${event.id}`} index={idx}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className={`absolute left-1 right-1 rounded-lg px-2 py-1 shadow-sm cursor-grab overflow-hidden ${
                            dragSnapshot.isDragging ? 'shadow-lg z-50 opacity-90' : ''
                          }`}
                          style={{
                            top: style.top,
                            height: style.height,
                            backgroundColor: event.color + '20',
                            borderRight: `3px solid ${event.color}`,
                            ...dragProvided.draggableProps.style,
                          }}
                          onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-semibold text-gray-800 truncate">
                                  {event.title}
                                </span>
                                {event.description && (
                                  <span
                                    className="w-3.5 h-3.5 rounded-full text-white text-[9px] flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: event.color }}
                                  >
                                    i
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {event.startTime} - {event.endTime}
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.id); }}
                              className="text-gray-300 hover:text-red-400 text-base leading-none flex-shrink-0"
                            >
                              ×
                            </button>
                          </div>
                          {isExpanded && event.description && (
                            <div className="text-[10px] text-gray-600 mt-1 border-t border-black/5 pt-1">
                              {event.description}
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </div>
    </div>
  );
}
