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
  WifiHigh,
  CaretRight,
  House,
  UserSwitch,
  Broadcast,
  Desktop,
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
    savingsPercentage,
    courses,
  } = useApp();

  const location = useLocation();
  const navigate = useNavigate();
  const [quickCode, setQuickCode] = useState(activeRoomCode || 'csc401-algo');

  // Match active course or active live room
  const matchedCourse = courses.find(
    (c) =>
      c.liveRoomCode.toLowerCase() === activeRoomCode.toLowerCase() ||
      c.id.toLowerCase() === activeRoomCode.toLowerCase()
  );

  const matchedLiveRoom = liveRooms.find(
    (r) => r.id.toLowerCase() === activeRoomCode.toLowerCase()
  ) || liveRooms[0];

  const calloutTitle =
    matchedCourse?.title ||
    matchedLiveRoom?.title ||
    activeRoomInfo.title ||
    `Room ${activeRoomCode}`;

  const calloutSubtitle = matchedCourse
    ? `${matchedCourse.code} • ${matchedCourse.lecturerName}`
    : matchedLiveRoom
    ? `${matchedLiveRoom.courseCode || 'Live'} • ${matchedLiveRoom.lecturerName || 'Host'}`
    : activeRoomInfo.lecturerName
    ? `${activeRoomInfo.courseCode || 'Active'} • ${activeRoomInfo.lecturerName}`
    : activeRoomCode;

  const liveRoomsCount = liveRooms.filter((r) => r.participantCount > 0).length;

  const navItems = [
    {
      to: '/hub',
      label: 'Classroom Hub',
      shortLabel: 'Classes',
      icon: GraduationCap,
      badge: `${courses.length}`,
    },
    {
      to: `/meet/${activeRoomCode || 'csc401-algo'}`,
      label: 'Live Meet',
      shortLabel: 'Meet',
      icon: VideoCamera,
      isLive: true,
      badge: liveRoomsCount > 0 ? `${liveRoomsCount} LIVE` : undefined,
    },
    {
      to: '/replays',
      label: 'Vector DVR',
      shortLabel: 'Replays',
      icon: PlayCircle,
    },
    {
      to: '/study',
      label: 'Study Hub',
      shortLabel: 'Study',
      icon: BookOpenText,
    },
    {
      to: '/benchmarks',
      label: 'Telemetry Proof',
      shortLabel: 'Data',
      icon: ChartBar,
      badge: `${savingsPercentage.toFixed(0)}%`,
    },
  ];

  const buildBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    const crumbs: { label: string; to: string }[] = [{ label: 'Home', to: '/' }];

    if (parts[0] === 'hub') {
      crumbs.push({ label: 'Classroom', to: '/hub' });
      if (parts[1] === 'course' && parts[2]) {
        const matched = courses.find((c) => c.id === parts[2]);
        crumbs.push({
          label: matched ? `${matched.code}: ${matched.title}` : parts[2].toUpperCase(),
          to: `/hub/course/${parts[2]}`,
        });
      }
    } else if (parts[0] === 'replays') {
      crumbs.push({ label: 'Vector DVR Replays', to: '/replays' });
      if (parts[1]) {
        crumbs.push({ label: 'Player', to: `/replays/${parts[1]}` });
      }
    } else if (parts[0] === 'study') {
      crumbs.push({ label: 'Study Hub', to: '/study' });
    } else if (parts[0] === 'benchmarks') {
      crumbs.push({ label: 'Telemetry Benchmarks', to: '/benchmarks' });
    }

    return crumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = quickCode.trim() || 'MTH 112';
    navigate(`/meet/${cleaned}`);
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
      className={`min-h-[100dvh] flex flex-col md:flex-row ${isDark ? 'bg-[#0F1713] text-[#E3E3E3]' : 'bg-[#FFFFFF] text-[#202124]'
        }`}
    >
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-[#69DB7C] focus:text-white focus:text-xs focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Desktop Left Navigation Rail (Google Workspace / Classroom Style) */}
      <aside
        className={`hidden md:flex md:w-64 lg:w-68 shrink-0 flex-col border-r ${isDark
          ? 'bg-[#141E19] border-[#3C4043]/60'
          : 'bg-[#F8F9FA] border-[#DADCE0]'
          }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark
                ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                : 'bg-[#ECFDF5] text-[#059669]'
                }`}
            >
              <ChalkboardTeacher size={20} weight="regular" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-medium tracking-tight text-lg">
                Chalk
              </span>
            </div>
          </Link>
        </div>

        {/* Active Session Callout Card */}
        <div className="px-3 pb-3">
          <div
            className={`rounded-3xl p-4 border ${isDark
              ? 'bg-[#0F1713] border-[#3C4043]/70'
              : 'bg-white border-[#DADCE0]'
              }`}
          >
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span
                className={`inline-flex items-center gap-1.5 font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  }`}
              >
                <Broadcast size={14} weight="regular" />
                <span>Active Room</span>
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
              {calloutSubtitle} • {activeRoomCode}
            </div>
            <Link
              to={`/meet/${activeRoomCode || 'csc401-algo'}`}
              className={`btn-google w-full py-2 px-4 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 ${isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
            >
              <VideoCamera size={15} weight="regular" />
              <span>Join Live Meet</span>
            </Link>
          </div>
        </div>

        {/* Navigation Pill Items */}
        <nav className="flex-1 px-3 space-y-1" aria-label="Workspace navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `btn-google flex items-center justify-between px-4 py-2.5 rounded-full text-sm font-medium ${isActive
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

        {/* Bottom Telemetry & Profile Footer */}
        <div
          className={`p-4 border-t space-y-3 ${isDark ? 'border-[#3C4043]/60' : 'border-[#DADCE0]'
            }`}
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span
              className={`inline-flex items-center gap-1.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
            >
              <WifiHigh size={14} weight="regular" />
              <span>Bandwidth reduction</span>
            </span>
            <span
              className={`font-medium tabular-nums ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                }`}
            >
              {savingsPercentage.toFixed(1)}%
            </span>
          </div>

          {currentUser ? (
            <div className="pt-2 border-t border-inherit flex items-center justify-between gap-2">
              <Link to="/auth" className="flex items-center gap-2.5 min-w-0 group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-medium text-xs shrink-0 ${isDark
                    ? 'bg-[#69DB7C]/20 text-[#69DB7C]'
                    : 'bg-[#ECFDF5] text-[#059669]'
                    }`}
                >
                  {currentUser.avatarTag}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate group-hover:underline">
                    {currentUser.name}
                  </div>
                  <div
                    className={`text-[10px] font-mono uppercase ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    {currentUser.role} • {currentUser.matricOrStaffId}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleSwitchDemoRole}
                  title="Switch between Student & Lecturer role"
                  className="btn-google p-1.5 rounded-full opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <UserSwitch size={16} weight="regular" />
                </button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  title="Sign Out"
                  className="btn-google p-1.5 rounded-full opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                >
                  <SignOut size={16} weight="regular" />
                </button>
              </div>
            </div>
          ) : (
            <Link
              to="/auth"
              className={`btn-google block w-full text-center py-2 rounded-full text-xs font-medium ${isDark
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
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Minimalist Google Header Bar (64px) */}
        <header
          className={`h-16 px-4 lg:px-8 flex items-center justify-between gap-4 border-b sticky top-0 z-30 backdrop-blur-md ${isDark
            ? 'bg-[#0F1713]/90 border-[#3C4043]/60'
            : 'bg-white/90 border-[#DADCE0]'
            }`}
        >
          {/* Breadcrumb Trail */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
            <Link
              to="/"
              className="btn-google p-1.5 rounded-full opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
              title="Product overview"
            >
              <House size={17} weight="regular" />
            </Link>
            {breadcrumbs.slice(1).map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 2;
              return (
                <React.Fragment key={crumb.to}>
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
          </nav>

          {/* Right Controls: Room Code Input + Appearance Selector Dropdown */}
          <div className="flex items-center gap-2.5 shrink-0">
            <form
              onSubmit={handleQuickJoin}
              className={`hidden sm:flex items-center rounded-xl border px-3 py-1 ${isDark
                ? 'bg-[#141E19] border-[#3C4043]'
                : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
            >
              <span
                className={`font-mono text-[11px] mr-1.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Code:
              </span>
              <input
                type="text"
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value)}
                aria-label="Room code"
                placeholder="MTH 112"
                className="w-24 bg-transparent font-mono text-xs font-medium focus:outline-none"
              />
              <button
                type="submit"
                className={`btn-google ml-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                Join
              </button>
            </form>

            {/* Appearance Dropdown (Light / Dark / System per redesignSKILL.md) */}
            <div
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs ${isDark
                ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
                : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
                }`}
            >
              <Desktop size={14} weight="regular" className="opacity-65" />
              <select
                aria-label="Appearance theme"
                value={themePreference}
                onChange={(e) => setThemePreference(e.target.value as ThemePreference)}
                className="bg-transparent font-medium focus:outline-none cursor-pointer"
              >
                <option value="light" className="bg-white text-[#202124]">
                  Light
                </option>
                <option value="dark" className="bg-[#141E19] text-[#E3E3E3]">
                  Dark
                </option>
                <option value="system" className="bg-white text-[#202124]">
                  System
                </option>
              </select>
            </div>
          </div>
        </header>

        {/* Main View */}
        <main id="main-content" className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <nav
        aria-label="Mobile Navigation"
        className={`md:hidden fixed bottom-0 inset-x-0 z-40 h-16 border-t flex items-center justify-around px-2 ${isDark
          ? 'bg-[#141E19] border-[#3C4043]/70'
          : 'bg-white border-[#DADCE0]'
          }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `btn-google flex flex-col items-center justify-center py-1 px-3 rounded-full text-[11px] font-medium ${isActive
                  ? isDark
                    ? 'text-[#69DB7C] bg-[#69DB7C]/15'
                    : 'text-[#059669] bg-[#ECFDF5]'
                  : isDark
                    ? 'text-[#9AA0A6]'
                    : 'text-[#5F6368]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  <span className="mt-0.5">{item.shortLabel}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
