import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  VideoCamera,
  Sparkle,
  BookOpenText,
  SignOut,
  CaretRight,
  House,
  UserSwitch,
  Broadcast,
  CalendarBlank,
  CheckSquareOffset,
  Archive,
  Gear,
  DotsNine,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { ChalkLogo } from './ChalkLogo';
import { ThemeToggle } from './ThemeToggle';

export const AppShell: React.FC = () => {
  const {
    isDark,
    currentUser,
    isDemoMode,
    switchDemoPersona,
    logout,
    activeRoomCode,
    activeRoomInfo,
    liveRooms,
    currentBitrateKbps,
    courses,
    assignments,
    submissions,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();
  const [quickCode, setQuickCode] = useState(activeRoomCode || '');
  const [isWaffleOpen, setIsWaffleOpen] = useState(false);

  const isLecturer = currentUser?.role === 'lecturer';

  const uidLower = (currentUser?.id || '').toLowerCase();

  // Partition user's courses strictly by role
  const teachingCourses = courses.filter(
    (c) =>
      !c.isArchived &&
      ((c.lecturerId || '').toLowerCase() === uidLower ||
        (Boolean(currentUser?.name) &&
          c.lecturerName.toLowerCase() === currentUser?.name.toLowerCase()) ||
        Boolean(
          c.members?.some(
            (m) => (m.id || '').toLowerCase() === uidLower && m.role === 'lecturer'
          )
        ))
  );

  const enrolledCourses = courses.filter(
    (c) =>
      !c.isArchived &&
      (Boolean(c.memberIds?.some((id) => id.toLowerCase() === uidLower)) ||
        Boolean(
          c.members?.some(
            (m) =>
              (m.id || '').toLowerCase() === uidLower ||
              (Boolean(m.matricOrStaffId) &&
                Boolean(currentUser?.matricOrStaffId) &&
                m.matricOrStaffId === currentUser?.matricOrStaffId)
          )
        ))
  );

  const myActiveCourses = isLecturer ? teachingCourses : enrolledCourses;
  const myCourseIds = new Set(myActiveCourses.map((c) => c.id));

  // Scope live rooms strictly to the user's active courses
  const scopedLiveRooms = liveRooms.filter((r) =>
    myActiveCourses.some(
      (c) =>
        r.id.toLowerCase() === c.liveRoomCode.toLowerCase() ||
        (r.courseId && r.courseId.toLowerCase() === c.id.toLowerCase()) ||
        r.courseCode.toLowerCase() === c.code.toLowerCase()
    )
  );

  // Match active course or active live room within user's scoped courses
  const matchedCourse =
    myActiveCourses.find(
      (c) =>
        c.liveRoomCode.toLowerCase() === activeRoomCode.toLowerCase() ||
        c.id.toLowerCase() === activeRoomCode.toLowerCase()
    ) || myActiveCourses[0];

  const matchedLiveRoom =
    scopedLiveRooms.find((r) => r.id.toLowerCase() === activeRoomCode.toLowerCase()) ||
    scopedLiveRooms[0];

  const calloutTitle =
    matchedCourse?.title ||
    matchedLiveRoom?.title ||
    (isDemoMode && activeRoomInfo.title ? activeRoomInfo.title : '') ||
    'Live Lectures';

  const calloutSubtitle = matchedCourse
    ? `${matchedCourse.code} • ${matchedCourse.lecturerName}`
    : matchedLiveRoom
      ? `${matchedLiveRoom.courseCode || 'Live'} • ${matchedLiveRoom.lecturerName || 'Host'}`
      : isDemoMode && activeRoomInfo.lecturerName
        ? `${activeRoomInfo.courseCode || 'Active'} • ${activeRoomInfo.lecturerName}`
        : '';

  const liveRoomsCount = scopedLiveRooms.filter((r) => r.participantCount > 0).length;

  const archivedCourses = courses.filter(
    (c) =>
      c.isArchived &&
      (isLecturer
        ? c.lecturerId === currentUser?.id ||
        (Boolean(currentUser?.name) &&
          c.lecturerName.toLowerCase() === currentUser?.name.toLowerCase())
        : c.memberIds?.includes(currentUser?.id || '') ||
        c.members?.some((m) => m.id === currentUser?.id))
  );

  const pendingCount = isLecturer
    ? submissions.filter(
      (s) => myCourseIds.has(s.courseId) && s.status === 'turned_in'
    ).length
    : assignments.filter((a) => {
      if (!myCourseIds.has(a.courseId)) return false;
      const sub = submissions.find(
        (s) => s.assignmentId === a.id && s.studentId === currentUser?.id
      );
      return !sub || sub.status === 'assigned';
    }).length;

  const primaryNavItems = [
    {
      to: '/hub',
      label: isLecturer ? 'Lecturer Dashboard' : 'Student Dashboard',
      icon: GraduationCap,
      badge: `${myActiveCourses.length}`,
      end: true,
    },
    {
      to: '/hub/todo',
      label: isLecturer ? 'Grading & Review' : 'My Assignments',
      icon: CheckSquareOffset,
      badge: pendingCount > 0 ? `${pendingCount}` : undefined,
    },
    {
      to: '/hub/calendar',
      label: isLecturer ? 'Teaching Schedule' : 'Class Calendar',
      icon: CalendarBlank,
    },
    {
      to: '/studio',
      label: isLecturer ? 'Host Studio' : 'Live Studio',
      icon: VideoCamera,
      badge: liveRoomsCount > 0 ? `${liveRoomsCount} LIVE` : undefined,
    },
    {
      to: '/catch-up',
      label: 'AI Catch Up',
      icon: Sparkle,
    },
    {
      to: '/study',
      label: isLecturer ? 'Quizzes & Cohort Notes' : 'Study Hub & Quizzes',
      icon: BookOpenText,
    },
  ];

  const buildBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const crumbs: { label: string; to: string }[] = [{ label: 'Home', to: '/' }];

    if (parts[0] === 'hub') {
      crumbs.push({
        label: isLecturer ? 'Lecturer Dashboard' : 'Student Dashboard',
        to: '/hub',
      });
      if (parts[1] === 'calendar') {
        crumbs.push({ label: 'Calendar', to: '/hub/calendar' });
      } else if (parts[1] === 'todo') {
        crumbs.push({ label: isLecturer ? 'To-review' : 'To-do', to: '/hub/todo' });
      } else if (parts[1] === 'archived') {
        crumbs.push({ label: 'Archived Classes', to: '/hub/archived' });
      } else if (parts[1] === 'settings') {
        crumbs.push({ label: 'Settings', to: '/hub/settings' });
      } else if (parts[1] === 'course' && parts[2]) {
        const matched = courses.find((c) => c.id === parts[2]);
        crumbs.push({
          label: matched ? `${matched.code}: ${matched.title}` : parts[2].toUpperCase(),
          to: `/hub/course/${parts[2]}`,
        });
        if (parts[3] === 'assignment' && parts[4]) {
          crumbs.push({ label: 'Assignment Details', to: location.pathname });
        }
      }
    } else if (parts[0] === 'catch-up' || parts[0] === 'replays') {
      crumbs.push({ label: 'AI Catch Up', to: '/catch-up' });
      if (parts[1]) crumbs.push({ label: 'Synthesis', to: `/catch-up/${parts[1]}` });
    } else if (parts[0] === 'study') {
      crumbs.push({ label: 'Study Hub', to: '/study' });
    } else if (parts[0] === 'benchmarks') {
      crumbs.push({ label: 'Benchmarks', to: '/benchmarks' });
    }

    return crumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDemoMode && myActiveCourses.length === 0) {
      navigate(isLecturer ? '/hub?create=1' : '/hub?join=1');
      return;
    }
    if (!quickCode.trim()) return;
    navigate(`/studio/${encodeURIComponent(quickCode.trim())}`);
  };

  return (
    <div
      className={`min-h-[100dvh] md:h-screen md:max-h-screen md:overflow-hidden flex flex-col md:flex-row ${isDark ? 'bg-[#0F1713] text-[#E3E3E3]' : 'bg-[#FFFFFF] text-[#202124]'
        }`}
    >
      {/* Desktop Left Navigation Rail (Contains ALL navigation & classroom features) */}
      <aside
        className={`hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col border-r md:h-full md:max-h-full md:overflow-hidden ${isDark ? 'bg-[#141E19] border-[#3C4043]/60' : 'bg-[#F8F9FA] border-[#DADCE0]'
          }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-5 flex items-center justify-between shrink-0 border-b border-black/5 dark:border-white/5">
          <Link to="/hub" className="flex items-center gap-2 group">
            <ChalkLogo className="h-9 w-auto" />
          </Link>
        </div>

        {/* Live Callout Card */}
        <div className="p-3 shrink-0">
          <div
            className={`rounded-2xl p-3.5 border ${isDark ? 'bg-[#0F1713] border-[#3C4043]/70' : 'bg-white border-[#DADCE0]'
              }`}
          >
            {liveRoomsCount > 0 && matchedLiveRoom ? (
              <>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                      }`}
                  >
                    <Broadcast size={14} className="animate-pulse" />
                    <span>Live Studio</span>
                  </span>
                  <span className={isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}>
                    {currentBitrateKbps.toFixed(1)} kbps
                  </span>
                </div>
                <div className="text-sm font-medium truncate">{calloutTitle}</div>
                <div
                  className={`text-xs truncate mb-3 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  {calloutSubtitle}
                </div>
                <Link
                  to={`/studio/${matchedLiveRoom.id}`}
                  className={`btn-google w-full py-2 px-4 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <VideoCamera size={15} />
                  <span>Join Live Studio ({matchedLiveRoom.participantCount})</span>
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    <VideoCamera size={14} />
                    <span>Studio</span>
                  </span>
                </div>
                <div className="text-sm font-medium">
                  {isLecturer ? 'Host Classroom' : 'Attend Class'}
                </div>
                <div
                  className={`text-xs truncate mb-3 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  {myActiveCourses.length === 0 && !isDemoMode
                    ? isLecturer
                      ? 'Create a course first to host'
                      : 'Join a class first to attend'
                    : 'Low-data + Chalkboard'}
                </div>
                <Link
                  to={
                    myActiveCourses.length > 0
                      ? `/studio/${myActiveCourses[0].liveRoomCode}`
                      : !isDemoMode
                        ? isLecturer
                          ? '/hub?create=1'
                          : '/hub?join=1'
                        : '/studio'
                  }
                  className={`btn-google w-full py-2 px-4 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <VideoCamera size={15} />
                  <span>
                    {myActiveCourses.length === 0 && !isDemoMode
                      ? isLecturer
                        ? 'Create Course to Host'
                        : 'Join Class to Attend'
                      : isLecturer
                        ? 'Launch Live Studio'
                        : 'Start or Join Call'}
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Comprehensive AppShell Nav Rail: Primary + Teaching + Enrolled + Utilities */}
        <div className="flex-1 px-3 space-y-4 overflow-y-auto min-h-0 text-sm">
          {/* Primary Navigation Items */}
          <nav className="space-y-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={Boolean((item as { end?: boolean }).end)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-medium transition-colors ${isActive
                      ? isDark
                        ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                        : 'bg-[#ECFDF5] text-[#059669]'
                      : isDark
                        ? 'text-[#9AA0A6] hover:text-[#E3E3E3] hover:bg-white/5'
                        : 'text-[#5F6368] hover:text-[#202124] hover:bg-black/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 text-[11px] rounded-full ${isActive
                            ? isDark
                              ? 'bg-[#69DB7C]/20 text-[#69DB7C]'
                              : 'bg-[#69DB7C]/15 text-[#059669]'
                            : isDark
                              ? 'text-[#9AA0A6]'
                              : 'text-[#5F6368]'
                            }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Role-Specific Courses Section: Lecturers see Teaching Cohorts, Students see Enrolled Classes */}
          {isLecturer ? (
            <div className="pt-2 border-t border-black/10 dark:border-white/10">
              <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                Teaching Cohorts ({teachingCourses.length})
              </div>
              {teachingCourses.length > 0 ? (
                <div className="space-y-1">
                  {teachingCourses.map((c) => {
                    const isActive = location.pathname === `/hub/course/${c.id}`;
                    return (
                      <Link
                        key={c.id}
                        to={`/hub/course/${c.id}`}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium truncate transition-colors ${isActive
                          ? isDark
                            ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                            : 'bg-[#ECFDF5] text-[#059669]'
                          : isDark
                            ? 'text-[#9AA0A6] hover:text-[#E3E3E3] hover:bg-white/5'
                            : 'text-[#5F6368] hover:text-[#202124] hover:bg-black/5'
                          }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.accentHex || '#059669' }}
                        />
                        <span className="truncate">{c.code}: {c.title}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-2 text-[11px] opacity-60">
                  No courses created yet.
                </div>
              )}
            </div>
          ) : (
            <div className="pt-2 border-t border-black/10 dark:border-white/10">
              <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                Enrolled Classes ({enrolledCourses.length})
              </div>
              {enrolledCourses.length > 0 ? (
                <div className="space-y-1">
                  {enrolledCourses.map((c) => {
                    const isActive = location.pathname === `/hub/course/${c.id}`;
                    return (
                      <Link
                        key={c.id}
                        to={`/hub/course/${c.id}`}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium truncate transition-colors ${isActive
                          ? isDark
                            ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                            : 'bg-[#ECFDF5] text-[#059669]'
                          : isDark
                            ? 'text-[#9AA0A6] hover:text-[#E3E3E3] hover:bg-white/5'
                            : 'text-[#5F6368] hover:text-[#202124] hover:bg-black/5'
                          }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.accentHex || '#2563EB' }}
                        />
                        <span className="truncate">{c.code}: {c.title}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-2 text-[11px] opacity-60">
                  Not enrolled in any classes yet.
                </div>
              )}
            </div>
          )}

          {/* Archived Classes & Settings */}
          <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-1">
            <NavLink
              to="/hub/archived"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${isActive
                  ? isDark
                    ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                    : 'bg-[#ECFDF5] text-[#059669]'
                  : isDark
                    ? 'text-[#9AA0A6] hover:text-[#E3E3E3] hover:bg-white/5'
                    : 'text-[#5F6368] hover:text-[#202124] hover:bg-black/5'
                }`
              }
            >
              <Archive size={16} />
              <span>Archived classes ({archivedCourses.length})</span>
            </NavLink>
            <NavLink
              to="/hub/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${isActive
                  ? isDark
                    ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                    : 'bg-[#ECFDF5] text-[#059669]'
                  : isDark
                    ? 'text-[#9AA0A6] hover:text-[#E3E3E3] hover:bg-white/5'
                    : 'text-[#5F6368] hover:text-[#202124] hover:bg-black/5'
                }`
              }
            >
              <Gear size={16} />
              <span>Settings</span>
            </NavLink>
          </div>
        </div>

        {/* Profile Footer */}
        <div
          className={`p-3 border-t space-y-3 shrink-0 ${isDark ? 'border-[#3C4043]/60' : 'border-[#DADCE0]'
            }`}
        >
          {currentUser ? (
            <div className="flex items-center justify-between gap-2">
              <Link to="/auth" className="flex items-center gap-2.5 min-w-0 group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs shrink-0 ${isDark ? 'bg-[#69DB7C]/20 text-[#69DB7C]' : 'bg-[#ECFDF5] text-[#059669]'
                    }`}
                >
                  {currentUser.avatarTag}
                </div>
                <div className="min-w-0">
                  <div className="-mb-2 text-xs font-medium truncate group-hover:underline">
                    {currentUser.name}
                  </div>
                  <div
                    className={`text-[10px] uppercase font-semibold inline-flex items-center gap-1 ${isLecturer
                      ? isDark
                        ? 'text-[#69DB7C]'
                        : 'text-[#059669]'
                      : isDark
                        ? 'text-[#8AB4F8]'
                        : 'text-[#1A73E8]'
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isLecturer ? 'bg-[#69DB7C]' : 'bg-[#1A73E8]'
                        }`}
                    />
                    <span>{currentUser.role}</span>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title="Sign Out"
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <SignOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className={`block w-full text-center py-2 rounded-full text-xs font-medium ${isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
            >
              Sign in
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 md:h-full md:max-h-full md:overflow-hidden">
        {/* Minimalist Google Header Bar */}
        <header
          className={`h-14 px-4 lg:px-8 flex items-center justify-between gap-4 border-b shrink-0 z-30 backdrop-blur-md ${isDark ? 'bg-[#0F1713]/90 border-[#3C4043]/60' : 'bg-white/90 border-[#DADCE0]'
            }`}
        >
          {/* Brand & Breadcrumbs (No hamburger icon needed) */}
          <div className="flex items-center gap-2 text-sm min-w-0">

            <Link
              to="/"
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 shrink-0 hidden md:inline-flex"
              title="Home"
            >
              <House size={18} />
            </Link>
            {breadcrumbs.slice(1).map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 2;
              return (
                <React.Fragment key={crumb.to + idx}>
                  <CaretRight size={13} className="opacity-40 shrink-0" />
                  <Link
                    to={crumb.to}
                    className={`truncate ${isLast
                      ? 'font-medium'
                      : isDark
                        ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                        : 'text-[#5F6368] hover:text-[#202124]'
                      }`}
                  >
                    {crumb.label}
                  </Link>
                </React.Fragment>
              );
            })}
          </div>

          {/* Right Controls: Quick Join + Waffle Menu + Switch Demo Role */}
          <div className="flex items-center gap-2.5 shrink-0 relative">
            <form
              onSubmit={handleQuickJoin}
              className={`hidden sm:flex items-center rounded-xl border px-3 py-1 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
            >
              <span
                className={`font-mono text-[11px] mr-1.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Studio Code:
              </span>
              <input
                type="text"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value)}
                placeholder={isDemoMode ? 'e.g. csc401-algo' : 'Enter room code'}
                className="w-24 text-xs bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                className="text-xs font-medium text-[#059669] dark:text-[#69DB7C] hover:underline ml-1"
              >
                Join
              </button>
            </form>

            {/* Google Apps "Waffle" Icon Launcher */}
            <div className="relative">
              <button
                onClick={() => setIsWaffleOpen((prev) => !prev)}
                title="Google Apps"
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <DotsNine size={22} />
              </button>

              {/* Waffle Dropdown */}
              {isWaffleOpen && (
                <div
                  className={`absolute right-0 top-12 w-72 rounded-2xl p-4 shadow-2xl border z-50 grid grid-cols-3 gap-3 text-center ${isDark
                    ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
                    : 'bg-white border-[#DADCE0] text-[#202124]'
                    }`}
                >
                  <Link
                    to="/hub"
                    onClick={() => setIsWaffleOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex flex-col items-center gap-1.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <GraduationCap size={22} />
                    </div>
                    <span className="text-[11px] font-medium">Classroom</span>
                  </Link>

                  <Link
                    to="/studio"
                    onClick={() => setIsWaffleOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex flex-col items-center gap-1.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <VideoCamera size={22} />
                    </div>
                    <span className="text-[11px] font-medium">Studio</span>
                  </Link>

                  <Link
                    to="/hub/calendar"
                    onClick={() => setIsWaffleOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex flex-col items-center gap-1.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <CalendarBlank size={22} />
                    </div>
                    <span className="text-[11px] font-medium">Calendar</span>
                  </Link>

                  <Link
                    to="/hub/todo"
                    onClick={() => setIsWaffleOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex flex-col items-center gap-1.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <CheckSquareOffset size={22} />
                    </div>
                    <span className="text-[11px] font-medium">To-do</span>
                  </Link>

                  <Link
                    to="/catch-up"
                    onClick={() => setIsWaffleOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex flex-col items-center gap-1.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Sparkle size={22} />
                    </div>
                    <span className="text-[11px] font-medium">Catch Up</span>
                  </Link>

                  <Link
                    to="/study"
                    onClick={() => setIsWaffleOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex flex-col items-center gap-1.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <BookOpenText size={22} />
                    </div>
                    <span className="text-[11px] font-medium">Study Hub</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Theme Toggle (Day & Night) */}
            <ThemeToggle size="sm" />

            {/* Quick Demo Persona Switcher — strictly available ONLY to Demo Accounts (Alex & Prof. Adeleke) */}
            {isDemoMode && (
              <button
                onClick={switchDemoPersona}
                title={`Demo Account Switcher: Switch to ${isLecturer ? 'Student' : 'Lecturer'}`}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors ${isDark
                  ? 'border-[#69DB7C]/50 bg-[#69DB7C]/10 text-[#69DB7C] hover:bg-[#69DB7C]/20'
                  : 'border-[#059669]/40 bg-[#ECFDF5] text-[#059669] hover:bg-[#D1FAE5]'
                  }`}
              >
                <UserSwitch size={16} weight="bold" />
                <span className="hidden sm:inline">
                  Demo: Switch to {isLecturer ? 'Student' : 'Lecturer'}
                </span>
                <span className="sm:hidden">Switch Role</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Outlet */}
        <main id="main-content" className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (No hamburger needed on phones/tablets) */}
      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 h-16 border-t z-40 px-2 flex items-center justify-around backdrop-blur-lg ${isDark
          ? 'bg-[#141E19]/95 border-[#3C4043]/80 text-[#9AA0A6]'
          : 'bg-white/95 border-[#DADCE0] text-[#5F6368]'
          }`}
      >
        <NavLink
          to="/hub"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${isActive ? (isDark ? 'text-[#69DB7C]' : 'text-[#059669]') : ''
            }`
          }
        >
          {({ isActive }) => (
            <>
              <GraduationCap size={20} weight={isActive ? 'fill' : 'regular'} />
              <span>Classes</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/studio"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors relative ${isActive ? (isDark ? 'text-[#69DB7C]' : 'text-[#059669]') : ''
            }`
          }
        >
          {({ isActive }) => (
            <>
              <VideoCamera size={20} weight={isActive ? 'fill' : 'regular'} />
              <span>Studio</span>
              {liveRoomsCount > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#EA4335] animate-ping" />
              )}
            </>
          )}
        </NavLink>

        <NavLink
          to="/hub/todo"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${isActive ? (isDark ? 'text-[#69DB7C]' : 'text-[#059669]') : ''
            }`
          }
        >
          {({ isActive }) => (
            <>
              <CheckSquareOffset size={20} weight={isActive ? 'fill' : 'regular'} />
              <span>{isLecturer ? 'To-review' : 'To-do'}</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/catch-up"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${isActive ? (isDark ? 'text-[#69DB7C]' : 'text-[#059669]') : ''
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Sparkle size={20} weight={isActive ? 'fill' : 'regular'} />
              <span>Catch Up</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/study"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors ${isActive ? (isDark ? 'text-[#69DB7C]' : 'text-[#059669]') : ''
            }`
          }
        >
          {({ isActive }) => (
            <>
              <BookOpenText size={20} weight={isActive ? 'fill' : 'regular'} />
              <span>Study</span>
            </>
          )}
        </NavLink>
      </nav>
    </div>
  );
};

export default AppShell;
