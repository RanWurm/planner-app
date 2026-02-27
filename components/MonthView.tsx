'use client';

import { CalendarEvent } from '@/types';
import { Droppable } from '@hello-pangea/dnd';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, isBefore, isSameDay, addDays,
} from 'date-fns';
import { he } from 'date-fns/locale';
import { useState } from 'react';

interface Props {
  date: Date;
  events: CalendarEvent[];
  onDeleteEvent: (id: string) => void;
  minDate: Date;
  maxDate: Date;
}

const DAY_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export default function MonthView({ date, events, onDeleteEvent, minDate, maxDate }: Props) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Month header */}
      <div className="text-center py-2 border-b border-gray-100">
        <span className="font-bold text-gray-800">{format(date, 'MMMM yyyy', { locale: he })}</span>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 py-1.5 font-medium">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayEvents = events.filter((e) => e.date === dateStr);
            const isCurrentMonth = isSameMonth(day, date);
            const isPast = isBefore(day, minDate) && !isSameDay(day, minDate);

            return (
              <Droppable key={dateStr} droppableId={`day-${dateStr}`} isDropDisabled={isPast}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[80px] border-b border-r border-gray-100 p-1 transition-colors ${
                      !isCurrentMonth ? 'bg-gray-50/50' : ''
                    } ${isToday(day) ? 'bg-indigo-50/40' : ''}
                    ${snapshot.isDraggingOver ? 'bg-indigo-100/60' : ''}
                    ${isPast ? 'opacity-50' : ''}`}
                  >
                    <div
                      className={`text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mb-1 ${
                        isToday(day)
                          ? 'bg-indigo-500 text-white'
                          : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-[9px] rounded px-1 py-0.5 truncate cursor-pointer flex items-center gap-0.5"
                          style={{ backgroundColor: event.color + '25', borderRight: `2px solid ${event.color}` }}
                          onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                        >
                          <span className="truncate text-gray-700">{event.title}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.id); }}
                            className="text-gray-400 hover:text-red-400 leading-none flex-shrink-0 text-[10px]"
                          >×</button>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[9px] text-gray-400 pr-1">+{dayEvents.length - 3} עוד</div>
                      )}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    </div>
  );
}
