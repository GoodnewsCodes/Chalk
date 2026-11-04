import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChalkboardTeacher,
  GraduationCap,
  VideoCamera,
  PlayCircle,
  BookOpenText,
  ChartBar,
  SignOut,
  CaretRight,
  House,
  UserSwitch,
  Broadcast,
  List,
  CalendarBlank,
  CheckSquareOffset,
  Archive,
  Gear,
  DotsNine,
  X,
} from '@phosphor-icons/react';
import { ThemePreference, useApp } from '../context/AppContext';

export const AppShell: React.FC = () => {
  const {
    isDark,
    themePreference,
    setThemePreference,
    currentUser,
    logout,
    signInWithGoogle,
    activeRoomCode,
    activeRoomInfo,
    liveRooms,
    currentBitrateKbps,
    courses,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();
  const [quickCode, setQuickCode] = useState(activeRoomCode || '');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWaffleOpen, setIsWaffleOpen] = useState(false);

  // Match active course or active live room
  const matchedCourse = courses.find(
    (c) =>
      c.liveRoomCode.toLowerCase() === activeRoomCode.toLowerCase() ||
      c.id.toLowerCase() === activeRoomCode.toLowerCase()
  );

  const matchedLiveRoom =
    liveRooms.find((r) => r.id.toLowerCase() === activeRoomCode.toLowerCase()) || liveRooms[0];

  const calloutTitle =
    matchedCourse?.title ||
    matchedLiveRoom?.title ||
    activeRoomInfo.title ||
    (activeRoomCode ? `Room ${activeRoomCode}` : 'Live Lectures');

  const calloutSubtitle = matchedCourse
    ? `${matchedCourse.code} • ${matchedCourse.lecturerName}`
    : matchedLiveRoom
      ? `${matchedLiveRoom.courseCode || 'Live'} • ${matchedLiveRoom.lecturerName || 'Host'}`
      : activeRoomInfo.lecturerName
        ? `${activeRoomInfo.courseCode || 'Active'} • ${activeRoomInfo.lecturerName}`
        : activeRoomCode;

  const liveRoomsCount = liveRooms.filter((r) => r.participantCount > 0).length;
  const isLecturer = currentUser?.role === 'lecturer';

  // Partition user's courses
  const teachingCourses = courses.filter(
    (c) =>
      !c.isArchived &&
      (c.lecturerId === currentUser?.id ||
        c.lecturerName.toLowerCase().includes(currentUser?.name.toLowerCase() || ''))
  );

  const enrolledCourses = courses.filter(
    (c) =>
      !c.isArchived &&
      (c.memberIds?.includes(currentUser?.id || '') ||
        c.members?.some((m) => m.id === currentUser?.id && m.role === 'student'))
  );

  const archivedCourses = courses.filter((c) => c.isArchived);

  const primaryNavItems = [
    {
      to: '/hub',
      label: 'Classes',
      icon: GraduationCap,
      badge: `${courses.filter((c) => !c.isArchived).length}`,
    },
    {
      to: '/hub/calendar',
      label: 'Calendar',
      icon: CalendarBlank,
    },
    {
      to: '/hub/todo',
      label: isLecturer ? 'To-review' : 'To-do',
      icon: CheckSquareOffset,
    },
    {
      to: '/studio',
      label: 'Studio',
      icon: VideoCamera,
      badge: liveRoomsCount > 0 ? `${liveRoomsCount} LIVE` : undefined,
    },
    {
      to: '/replays',
      label: 'Vector DVR',
      icon: PlayCircle,
    },
    {
      to: '/study',
      label: 'AI Study Hub',
      icon: BookOpenText,
    },
  ];

  const buildBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const crumbs: { label: string; to: string }[] = [{ label: 'Home', to: '/' }];

    if (parts[0] === 'hub') {
      crumbs.push({ label: 'Classroom', to: '/hub' });
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
    } else if (parts[0] === 'replays') {
      crumbs.push({ label: 'Vector DVR Replays', to: '/replays' });
      if (parts[1]) crumbs.push({ label: 'Player', to: `/replays/${parts[1]}` });
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
    if (!quickCode.trim()) return;
    navigate(`/studio/${encodeURIComponent(quickCode.trim())}`);
  };

  const handleSwitchDemoRole = () => {
    if (currentUser?.role === 'lecturer') {
      signInWithGoogle({
        name: 'Alex Okafor',
        email: 'alex.okafor@unilag.edu.ng',
        role: 'student',
        idCode: 'CSC/2022/1042',
        avatarTag: 'AO',
        completeImmediately: true,
      });
    } else {
      signInWithGoogle({
        name: 'Prof. Adeleke O.',
        email: 'adeleke.prof@unilag.edu.ng',
        role: 'lecturer',
        idCode: 'STAFF/CS/2018',
        avatarTag: 'PA',
        completeImmediately: true,
      });
    }
  };

  return (
    <div
      className={`min-h-[100dvh] md:h-screen md:max-h-screen md:overflow-hidden flex flex-col md:flex-row ${isDark ? 'bg-[#0F1713] text-[#E3E3E3]' : 'bg-[#FFFFFF] text-[#202124]'
        }`}
    >
      {/* Slide-Out Google Classroom Navigation Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className={`w-72 max-w-[85vw] h-full shadow-2xl flex flex-col ${isDark ? 'bg-[#141E19] text-[#E3E3E3]' : 'bg-white text-[#202124]'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-black/10 dark:border-white/10 shrink-0">
              <Link
                to="/hub"
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#69DB7C]/15 text-[#69DB7C]' : 'bg-[#ECFDF5] text-[#059669]'
                    }`}
                >
                  <ChalkboardTeacher size={20} />
                </div>
                <span className="font-display font-medium tracking-tight text-lg">Chalkboard</span>
              </Link>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body Nav */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 text-sm font-medium">
              <div className="space-y-1">
                <Link
                  to="/hub"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 ${location.pathname === '/hub'
                    ? isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                    : ''
                    }`}
                >
                  <GraduationCap size={18} />
                  <span>Classes</span>
                </Link>
                <Link
                  to="/hub/calendar"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 ${location.pathname === '/hub/calendar'
                    ? isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                    : ''
                    }`}
                >
                  <CalendarBlank size={18} />
                  <span>Calendar</span>
                </Link>
                <Link
                  to="/hub/todo"
                  onClick={() => setIsDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 ${location.pathname === '/hub/todo'
                    ? isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                    : ''
                    }`}
                >
                  <CheckSquareOffset size={18} />
                  <span>{isLecturer ? 'To-review' : 'To-do'}</span>
                </Link>
              </div>

              {/* Teaching Classes List */}
              {teachingCourses.length > 0 && (
                <div className="pt-2 border-t border-black/10 dark:border-white/10">
                  <div className="px-3.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                    Teaching
                  </div>
                  <div className="space-y-1">
                    {teachingCourses.map((c) => (
                      <Link
                        key={c.id}
                        to={`/hub/course/${c.id}`}
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 truncate"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: c.accentHex || '#059669' }}
                        />
                        <span className="truncate">{c.code}: {c.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Enrolled Classes List */}
              {enrolledCourses.length > 0 && (
                <div className="pt-2 border-t border-black/10 dark:border-white/10">
                  <div className="px-3.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                    Enrolled
                  </div>
                  <div className="space-y-1">
                    {enrolledCourses.map((c) => (
                      <Link
                        key={c.id}
                        to={`/hub/course/${c.id}`}
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 truncate"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: c.accentHex || '#2563EB' }}
                        />
                        <span className="truncate">{c.code}: {c.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Archived Classes & Settings */}
              <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-1">
                <Link
                  to="/hub/archived"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <Archive size={18} />
                  <span>Archived classes ({archivedCourses.length})</span>
                </Link>
                <Link
                  to="/hub/settings"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <Gear size={18} />
                  <span>Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Left Navigation Rail */}
      <aside
        className={`hidden md:flex md:w-64 lg:w-68 shrink-0 flex-col border-r md:h-full md:max-h-full md:overflow-hidden ${isDark ? 'bg-[#141E19] border-[#3C4043]/60' : 'bg-[#F8F9FA] border-[#DADCE0]'
          }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsDrawerOpen(true)}
              title="Main menu"
              className="p-1.5 -ml-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            >
              <List size={20} />
            </button>
            <Link to="/hub" className="flex items-center gap-2 group">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#69DB7C]/15 text-[#69DB7C]' : 'bg-[#ECFDF5] text-[#059669]'
                  }`}
              >
                <ChalkboardTeacher size={18} />
              </div>
              <span className="font-display font-medium tracking-tight text-base">Chalk</span>
            </Link>
          </div>
        </div>

        {/* Live Callout Card */}
        <div className="px-3 pb-3 shrink-0">
          <div
            className={`rounded-3xl p-4 border ${isDark ? 'bg-[#0F1713] border-[#3C4043]/70' : 'bg-white border-[#DADCE0]'
              }`}
          >
            {liveRoomsCount > 0 && matchedLiveRoom ? (
              <>
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
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
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    <VideoCamera size={14} />
                    <span>Studio</span>
                  </span>
                </div>
                <div className="text-sm font-medium">
                  {isLecturer ? 'Host Classroom' : ''}
                </div>
                <div
                  className={`text-xs truncate mb-3 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Low-data + Chalkboard
                </div>
                <Link
                  to="/studio"
                  className={`btn-google w-full py-2 px-4 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <VideoCamera size={15} />
                  <span>{isLecturer ? 'Launch Live Studio' : 'Start or Join Call'}</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto min-h-0">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium ${isActive
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
                        className={`px-2 py-0.5 text-[11px] font-mono rounded-full ${isActive
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

        {/* Profile Footer */}
        <div
          className={`p-4 border-t space-y-3 shrink-0 ${isDark ? 'border-[#3C4043]/60' : 'border-[#DADCE0]'
            }`}
        >
          {currentUser ? (
            <div className="flex items-center justify-between gap-2">
              <Link to="/auth" className="flex items-center gap-2.5 min-w-0 group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-medium text-xs shrink-0 ${isDark ? 'bg-[#69DB7C]/20 text-[#69DB7C]' : 'bg-[#ECFDF5] text-[#059669]'
                    }`}
                >
                  {currentUser.avatarTag}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate group-hover:underline">
                    {currentUser.name}
                  </div>
                  <div
                    className={`text-[10px] font-mono uppercase font-semibold inline-flex items-center gap-1 ${isLecturer
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
          className={`h-16 px-4 lg:px-8 flex items-center justify-between gap-4 border-b shrink-0 z-30 backdrop-blur-md ${isDark ? 'bg-[#0F1713]/90 border-[#3C4043]/60' : 'bg-white/90 border-[#DADCE0]'
            }`}
        >
          {/* Hamburger + Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm min-w-0">
            <button
              onClick={() => setIsDrawerOpen(true)}
              title="Main menu"
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 shrink-0 cursor-pointer"
            >
              <List size={20} />
            </button>
            <Link
              to="/"
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
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
                placeholder="e.g. MTH 112"
                className="w-24 text-xs font-mono bg-transparent focus:outline-none"
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
                    to="/replays"
                    onClick={() => setIsWaffleOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex flex-col items-center gap-1.5"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <PlayCircle size={22} />
                    </div>
                    <span className="text-[11px] font-medium">DVR Replays</span>
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

            {/* Quick Demo Persona Switcher */}
            <button
              onClick={handleSwitchDemoRole}
              title={`Switch role (currently: ${currentUser?.role || 'Guest'})`}
              className={`p-2 rounded-full border text-xs font-mono flex items-center gap-1.5 cursor-pointer ${isDark
                ? 'border-[#3C4043] bg-[#141E19] text-[#E3E3E3]'
                : 'border-[#DADCE0] bg-[#F8F9FA] text-[#202124]'
                }`}
            >
              <UserSwitch size={15} />
              <span className="hidden sm:inline capitalize">{currentUser?.role || 'Guest'}</span>
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main id="main-content" className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
