import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { StudyPlanData } from '@/lib/types';

interface StudyPlanCalendarProps {
  studyPlan?: StudyPlanData;
  onSelectDate?: (dateStr: string) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** YYYY-MM-DD in local time, which is what the cell keys use. */
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function StudyPlanCalendar({
  studyPlan,
  onSelectDate,
}: StudyPlanCalendarProps) {
  // Opens on the learner's own month, not a fixed one. It used to default to
  // August 2026 "to match mock/reference", which meant the calendar showed the
  // wrong month to everyone once that date passed.
  const [currentDate, setCurrentDate] = useState(() => {
    if (studyPlan?.selectedDate) {
      const parts = studyPlan.selectedDate.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    () => studyPlan?.selectedDate || isoDate(new Date()),
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthName = MONTH_NAMES[month];

  // Calculations for calendar grid
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build grid days
  const calendarCells: {
    day: number;
    monthOffset: -1 | 0 | 1;
    fullDateStr: string;
  }[] = [];

  // 1. Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, day);
    const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({ day, monthOffset: -1, fullDateStr: dateStr });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({ day, monthOffset: 0, fullDateStr: dateStr });
  }

  // 3. Next month leading days (fill up to 35 or 42 cells)
  const totalCells = calendarCells.length > 35 ? 42 : 35;
  const remaining = totalCells - calendarCells.length;
  for (let day = 1; day <= remaining; day++) {
    const nextMonthDate = new Date(year, month + 1, day);
    const dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({ day, monthOffset: 1, fullDateStr: dateStr });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (fullDateStr: string, monthOffset: number) => {
    setSelectedDateStr(fullDateStr);
    if (monthOffset !== 0) {
      const parts = fullDateStr.split('-');
      setCurrentDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
    }
    onSelectDate?.(fullDateStr);
  };

  const activeEventsForDay = studyPlan?.scheduledEvents?.filter(
    e => e.date === selectedDateStr,
  );

  return (
    <div className="bg-card dark:bg-[#12161c] border border-border/80 dark:border-white/10 rounded-2xl p-6 space-y-4 shadow-sm">
      {/* Title with Info icon */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-orange-500 tracking-tight">Study Plan</h3>
        <button
          type="button"
          className="text-orange-500 hover:text-orange-600 dark:text-orange-400 p-0.5 rounded-full hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
          title="Daily adaptive study schedule based on your exam date"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Month & Navigation */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-sm sm:text-base font-bold text-foreground tracking-tight">
          {monthName} {year}
        </span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-md hover:bg-muted dark:hover:bg-white/5 hover:text-foreground transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-md hover:bg-muted dark:hover:bg-white/5 hover:text-foreground transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-xs font-semibold text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 text-center">
        {calendarCells.map((cell, index) => {
          const isSelected = cell.fullDateStr === selectedDateStr;
          const isCurrentMonth = cell.monthOffset === 0;
          const hasEvent = studyPlan?.scheduledEvents?.some(e => e.date === cell.fullDateStr);
          const isActiveStudyDay = studyPlan?.activeDays?.includes(cell.fullDateStr);

          return (
            <div key={index} className="flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={() => handleDayClick(cell.fullDateStr, cell.monthOffset)}
                className={`
                  relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                  ${
                    isSelected
                      ? 'border-2 border-primary text-primary font-bold bg-primary/10'
                      : isCurrentMonth
                        ? 'text-foreground hover:bg-muted dark:hover:bg-white/5'
                        : 'text-muted-foreground/40 dark:text-muted-foreground/30 hover:bg-muted/50'
                  }
                `}
              >
                <span>{cell.day}</span>
                {hasEvent && !isSelected && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-orange-500" />
                )}
                {isActiveStudyDay && !hasEvent && !isSelected && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary/70" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected day scheduled tasks overview (if any) */}
      {activeEventsForDay && activeEventsForDay.length > 0 && (
        <div className="pt-3 border-t border-border dark:border-white/5 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Schedule for {selectedDateStr}
          </div>
          {activeEventsForDay.map(event => (
            <div
              key={event.id}
              className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 dark:bg-white/[0.03] border border-border/50"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    event.completed ? 'bg-primary' : 'bg-orange-500'
                  }`}
                />
                <span className="font-medium text-foreground">{event.title}</span>
              </div>
              <span className="text-xs text-muted-foreground capitalize">
                {event.completed ? 'Done' : event.type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
