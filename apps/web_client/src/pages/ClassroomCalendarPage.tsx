import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CaretLeft,
  CaretRight,
  CalendarBlank,
  VideoCamera,
  CheckCircle,
  Clock,
  GraduationCap,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

export const ClassroomCalendarPage: React.FC = () => {
  const { isDark, courses, assignments, liveRooms } = useApp();
  const navigate = useNavigate();

  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Filter courses
  const filteredCourses =
    selectedCourseId === 'all'
      ? courses.filter((c) => !c.isArchived)
      : courses.filter((c) => c.id === selectedCourseId && !c.isArchived);

  // Filter assignments
  const relevantAssignments = assignments.filter((a) =>
    selectedCourseId === 'all' ? true : a.courseId === selectedCourseId
  );

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build grid days for the month
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const leadingBlanks = Array.from({ length: firstDayIndex }, (_, i) => i);

  // Map events to day numbers
  const todayDate = new Date();
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#059669]/10 text-[#059669] dark:text-[#69DB7C] flex items-center justify-center">
            <CalendarBlank size={22} />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight">Google Classroom Calendar</h1>
            <p className="text-xs text-black/60 dark:text-white/60">
              Assignments, project deadlines, and scheduled live lectures
            </p>
          </div>
        </div>

        {/* Date Controls & Course Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Course Selector Dropdown */}
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none cursor-pointer ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
              }`}
          >
            <option value="all">All classes</option>
            {courses
              .filter((c) => !c.isArchived)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}: {c.title}
                </option>
              ))}
          </select>

          {/* Month Navigator */}
          <div className="flex items-center gap-1 border border-black/10 dark:border-white/10 rounded-full p-1 text-xs">
            <button
              onClick={handleToday}
              className="px-3 py-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 font-medium cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <CaretLeft size={16} />
            </button>
            <span className="font-medium px-2 min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              title="Next Month"
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <CaretRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Month Grid */}
      <div
        className={`rounded-3xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
          }`}
      >
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 border-b border-black/10 dark:border-white/10 text-center font-mono text-xs font-semibold py-3 text-black/60 dark:text-white/60">
          <span>SUN</span>
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
        </div>

        {/* Days Grid Cells */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {/* Blank Leading Cells */}
          {leadingBlanks.map((b) => (
            <div
              key={`blank_${b}`}
              className={`min-h-[100px] sm:min-h-[120px] p-2 border-r border-b border-black/5 dark:border-white/5 opacity-30 ${isDark ? 'bg-black/10' : 'bg-black/[0.02]'
                }`}
            />
          ))}

          {/* Actual Month Days */}
          {daysArray.map((dayNum) => {
            const isToday = isCurrentMonth && todayDate.getDate() === dayNum;

            // Find events for this day
            const dayAssignments = relevantAssignments.filter((a) => {
              // Parse simple date strings like "Nov 12, 2026" or match dayNum
              const parts = a.dueDate.split(' ');
              if (parts.length >= 2) {
                const num = parseInt(parts[1], 10);
                return num === dayNum;
              }
              return false;
            });

            // Live courses matching day
            const isLiveDay = dayNum === todayDate.getDate() && isCurrentMonth;

            return (
              <div
                key={`day_${dayNum}`}
                className={`min-h-[100px] sm:min-h-[120px] p-2 sm:p-2.5 border-r border-b border-black/10 dark:border-white/10 flex flex-col justify-between transition-colors ${isToday
                    ? isDark
                      ? 'bg-[#69DB7C]/5'
                      : 'bg-emerald-500/5'
                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
              >
                {/* Day Header Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-mono font-medium rounded-full ${isToday
                        ? 'w-6 h-6 bg-[#059669] text-white'
                        : 'text-black/80 dark:text-white/80'
                      }`}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* Day Events Container */}
                <div className="space-y-1.5 mt-1 overflow-y-auto max-h-24">
                  {/* Live class badge if active today */}
                  {isLiveDay &&
                    filteredCourses
                      .filter((c) => c.hasLiveSession)
                      .map((c) => (
                        <Link
                          key={`live_${c.id}`}
                          to={`/studio/${c.liveRoomCode}`}
                          className="block px-2 py-1 rounded-lg text-[10px] font-medium font-mono truncate bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:opacity-80"
                        >
                          <div className="flex items-center gap-1 truncate">
                            <VideoCamera size={11} className="shrink-0 animate-pulse text-emerald-500" />
                            <span className="truncate">{c.code} Live</span>
                          </div>
                        </Link>
                      ))}

                  {/* Assignments due this day */}
                  {dayAssignments.map((asg) => {
                    const c = courses.find((course) => course.id === asg.courseId);
                    return (
                      <Link
                        key={asg.id}
                        to={`/hub/course/${asg.courseId}/assignment/${asg.id}`}
                        className="block px-2 py-1 rounded-lg text-[10px] font-medium truncate border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:border-[#059669] dark:hover:border-[#69DB7C]"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: c?.accentHex || '#2563EB' }}
                          />
                          <span className="truncate">{asg.title}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <div />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ClassroomCalendarPage;

