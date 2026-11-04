import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChalkboardTeacher,
  WifiHigh,
  ArrowRight,
  Microphone,
  Sparkle,
  PlayCircle,
  GraduationCap,
  SlidersHorizontal,
  Eraser,
  ChartBar,
  Desktop,
  VideoCamera,
  CheckCircle,
  MicrophoneSlash,
  LockKey,
  UserPlus,
  SignIn,
  X,
} from '@phosphor-icons/react';
import { ThemePreference, useApp } from '../context/AppContext';
import { VectorCanvas } from '../components/VectorCanvas';
import { DEFAULT_BOARD_STROKES } from '../data/mockCatalog';
import { StrokeData } from '../types/chalk';

export const LandingPage: React.FC = () => {
  const {
    isDark,
    themePreference,
    setThemePreference,
    currentUser,
    isAuthenticated,
    guestName,
    setGuestName,
    setActiveRoomCode,
  } = useApp();
  const navigate = useNavigate();

  const [roomInput, setRoomInput] = useState('csc401-algo');
  const [weeklyHours, setWeeklyHours] = useState<number>(12);
  const [heroStrokes, setHeroStrokes] = useState<StrokeData[]>(DEFAULT_BOARD_STROKES);
  const [heroColor, setHeroColor] = useState<string>('#69DB7C');

  // Pre-join transition modal state for "Try a live class" / Room join
  const [pendingLiveRoom, setPendingLiveRoom] = useState<string | null>(null);
  const [prejoinGuestName, setPrejoinGuestName] = useState<string>(
    guestName || 'Guest Student'
  );
  const [prejoinMicMuted, setPrejoinMicMuted] = useState<boolean>(true);

  const openLiveClassTransition = (code = 'csc401-algo') => {
    const cleaned = code.trim() || 'csc401-algo';
    setPendingLiveRoom(cleaned);
  };

  const handleLaunchLiveClass = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = pendingLiveRoom || 'csc401-algo';
    if (!isAuthenticated && prejoinGuestName.trim()) {
      setGuestName(prejoinGuestName.trim());
    }
    setActiveRoomCode(targetRoom);
    setPendingLiveRoom(null);
    navigate(
      `/studio/${targetRoom}?trial=${isAuthenticated ? '0' : '1'}&muted=${prejoinMicMuted ? '1' : '0'
      }`
    );
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = roomInput.trim() || 'csc401-algo';
    openLiveClassTransition(cleaned);
  };

  const zoomWeeklyMb = Math.round(weeklyHours * 540);
  const chalkWeeklyMb = Math.round(weeklyHours * 12.6);
  const savedMonthlyGb = (((zoomWeeklyMb - chalkWeeklyMb) * 4) / 1024).toFixed(1);

  return (
    <div
      className={`min-h-[100dvh] flex flex-col ${isDark ? 'bg-[#0F1713] text-[#E3E3E3]' : 'bg-[#FFFFFF] text-[#202124]'
        }`}
    >
      {/* Accessibility Skip Link */}
      <a
        href="#main-landing"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-[#69DB7C] focus:text-white focus:text-xs focus:font-medium"
      >
        Skip to main content
      </a>

      {/* 1. Minimalist Google Workspace Style Top Navigation (64px height, single line) */}
      <header
        className={`sticky top-0 z-40 h-16 border-b backdrop-blur-md ${isDark
          ? 'bg-[#0F1713]/90 border-[#3C4043]/60'
          : 'bg-white/90 border-[#DADCE0]'
          }`}
      >
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark
                ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                : 'bg-[#ECFDF5] text-[#059669]'
                }`}
            >
              <ChalkboardTeacher size={20} weight="regular" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-medium tracking-tight text-xl">
                Chalk
              </span>
            </div>
          </Link>

          {/* Desktop Anchor Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
            <a
              href="#calculator"
              className={
                isDark
                  ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'text-[#5F6368] hover:text-[#202124]'
              }
            >
              Data Savings
            </a>
            <a
              href="#how-it-works"
              className={
                isDark
                  ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'text-[#5F6368] hover:text-[#202124]'
              }
            >
              How It Works
            </a>
            <a
              href="#workflows"
              className={
                isDark
                  ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'text-[#5F6368] hover:text-[#202124]'
              }
            >
              Features
            </a>
            <a
              href="#reviews"
              className={
                isDark
                  ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'text-[#5F6368] hover:text-[#202124]'
              }
            >
              Student Stories
            </a>
          </nav>

          {/* Right Controls: Appearance Select + Sign In + Open Classroom CTA */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs ${isDark
                ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
                : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
                }`}
            >
              <Desktop size={14} weight="regular" className="opacity-65" />
              <select
                aria-label="Appearance theme"
                value={themePreference}
                onChange={(e) =>
                  setThemePreference(e.target.value as ThemePreference)
                }
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

            {isAuthenticated && currentUser ? (
              <>
                <Link
                  to="/auth"
                  className={`btn-google px-3.5 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2 ${isDark
                    ? 'text-[#69DB7C] hover:bg-[#69DB7C]/10'
                    : 'text-[#059669] hover:bg-[#ECFDF5]/60'
                    }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full font-mono text-[11px] flex items-center justify-center ${isDark
                      ? 'bg-[#69DB7C]/20 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                      }`}
                  >
                    {currentUser.avatarTag}
                  </span>
                  <span className="hidden sm:inline">
                    {currentUser.name.split(' ')[0]}
                  </span>
                </Link>

                <Link
                  to="/hub"
                  className={`btn-google px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <span>Open Dashboard</span>
                  <ArrowRight size={15} weight="regular" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/auth?mode=login"
                  className={`btn-google px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-1.5 ${isDark
                    ? 'text-[#E3E3E3] hover:bg-white/10'
                    : 'text-[#202124] hover:bg-black/5'
                    }`}
                >
                  <SignIn size={16} weight="regular" />
                  <span>Log in</span>
                </Link>

                <Link
                  to="/auth?mode=signup"
                  className={`btn-google px-5 py-2.5 rounded-full text-sm font-medium inline-flex items-center gap-2 ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <UserPlus size={16} weight="regular" />
                  <span>Sign up</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-landing">
        {/* 2. Asymmetric Split Hero Section */}
        <section className="pt-12 pb-16 lg:pt-20 lg:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column: 4-Element Stack */}
            <div className="lg:col-span-6 space-y-6">


              {/* Element 2: Headline */}
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] font-medium tracking-[-0.025em] leading-[1.12] pb-1">
                Online classes that{' '}
                <span
                  className={`italic pb-1 ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                    }`}
                >
                  never freeze
                </span>{' '}
                on weak signal.
              </h1>
              {/* Element 1: Eyebrow */}
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-[0.12em] ${isDark
                  ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                  : 'bg-[#ECFDF5] text-[#059669]'
                  }`}
              >
                <span>Built for slow campus WiFi and mobile data</span>
              </div>

              {/* Element 3: Subtext */}
              <p
                className={`text-base sm:text-lg leading-relaxed max-w-[52ch] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Hear your lecturer clearly and watch every note appear live on the board while using 97% less mobile data than a regular video call.
              </p>

              {/* Element 4: Google Studio Style Action Row */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => openLiveClassTransition('csc401-algo')}
                  className={`btn-google px-6 py-3.5 rounded-full font-medium text-sm inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <VideoCamera size={18} weight="regular" />
                  <span>Try a live class</span>
                </button>

                <form
                  onSubmit={handleJoinRoom}
                  className="flex-1 flex items-center gap-2"
                >
                  <div
                    className={`flex-1 flex items-center rounded-xl border px-3.5 py-2.5 ${isDark
                      ? 'bg-[#141E19] border-[#3C4043] focus-within:border-[#69DB7C]'
                      : 'bg-white border-[#DADCE0] focus-within:border-[#059669]'
                      }`}
                  >
                    <label htmlFor="hero-room-code" className="sr-only">
                      Enter a class code
                    </label>
                    <input
                      id="hero-room-code"
                      type="text"
                      value={roomInput}
                      onChange={(e) => setRoomInput(e.target.value)}
                      placeholder="Enter class code (e.g. csc401-algo)"
                      className="w-full bg-transparent font-mono text-sm focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className={`btn-google px-4 py-3 rounded-full text-sm font-medium cursor-pointer ${isDark
                      ? 'text-[#69DB7C] hover:bg-[#69DB7C]/10'
                      : 'text-[#059669] hover:bg-[#ECFDF5]'
                      }`}
                  >
                    Join
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Interactive Chalkboard Stage */}
            <div className="lg:col-span-6">
              <div
                className={`rounded-3xl border overflow-hidden ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]/80 shadow-[0_20px_50px_rgba(0,0,0,0.45)]'
                  : 'bg-[#F8F9FA] border-[#DADCE0] shadow-[0_20px_50px_rgba(5,150,105,0.08)]'
                  }`}
              >
                {/* Minimal Top Status Bar */}
                <div
                  className={`px-5 py-3 border-b flex items-center justify-between gap-2 text-xs ${isDark
                    ? 'bg-[#141E19] border-[#3C4043]/60 text-[#E3E3E3]'
                    : 'bg-white border-[#DADCE0] text-[#202124]'
                    }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <span
                      className={`w-2 h-2 rounded-full ${isDark ? 'bg-[#69DB7C]' : 'bg-[#69DB7C]'
                        }`}
                    />
                    <span>Live Class • CSC 401 Algorithms</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium inline-flex items-center gap-1.5 ${isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                      }`}
                  >
                    <WifiHigh size={13} weight="regular" />
                    <span>Low-Data Mode On</span>
                  </span>
                </div>

                {/* Interactive Canvas Stage */}
                <div className="relative h-[300px] sm:h-[340px] w-full">
                  <VectorCanvas
                    strokes={heroStrokes}
                    interactive={true}
                    currentTool="pen"
                    currentColor={heroColor}
                    currentWidth={3.5}
                    onCommitStroke={(s) => setHeroStrokes((prev) => [...prev, s])}
                  />

                  {/* Floating Minimalist Chalk Controls */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                    <div className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141E19]/90 border border-white/15 text-white text-xs backdrop-blur-md">
                      <span className="text-[11px] text-white/70 mr-1">
                        Try drawing on the board:
                      </span>
                      {['#69DB7C', '#FFE066', '#81C995', '#F28B82', '#F8F9FA'].map(
                        (hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setHeroColor(hex)}
                            aria-label={`Select chalk color ${hex}`}
                            className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${heroColor === hex
                              ? 'scale-125 border-white'
                              : 'border-black/40 opacity-75'
                              }`}
                            style={{ backgroundColor: hex }}
                          />
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => setHeroStrokes(DEFAULT_BOARD_STROKES)}
                        title="Reset board"
                        className="btn-google ml-1 p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                      >
                        <Eraser size={13} weight="regular" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => openLiveClassTransition('csc401-algo')}
                      className={`btn-google pointer-events-auto px-4 py-1.5 rounded-full font-medium text-xs cursor-pointer ${isDark
                        ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                        : 'bg-[#059669] text-white hover:bg-[#047857]'
                        }`}
                    >
                      Join full room
                    </button>
                  </div>
                </div>

                {/* Friendly Bottom Bar */}
                <div
                  className={`px-5 py-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043]/60 text-[#9AA0A6]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#5F6368]'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <Microphone size={13} weight="regular" />
                      <span>Clear voice + live handwriting</span>
                    </span>
                  </div>
                  <span className="font-mono tabular-nums">
                    Uses only ~13 MB per hour
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Academic Logo Wall Under Hero */}
        <section
          aria-label="Partner Universities and Research Cohorts"
          className={`py-8 border-y ${isDark
            ? 'bg-[#141E19]/40 border-[#3C4043]/50 text-[#9AA0A6]'
            : 'bg-[#F8F9FA] border-[#DADCE0] text-[#5F6368]'
            }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-around gap-8">
            <svg className="h-7 w-auto fill-current" viewBox="0 0 160 36" role="img" aria-label="UNILAG Engineering Cohort">
              <rect x="2" y="4" width="28" height="28" rx="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M10 12v10a6 6 0 0012 0V12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <text x="40" y="23" fontFamily="Google Sans, Plus Jakarta Sans, sans-serif" fontWeight="600" fontSize="15" letterSpacing="1">UNILAG CS</text>
            </svg>

            <svg className="h-7 w-auto fill-current" viewBox="0 0 165 36" role="img" aria-label="Makerere Research Lab">
              <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M11 23l7-11 7 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <text x="42" y="23" fontFamily="Google Sans, Plus Jakarta Sans, sans-serif" fontWeight="600" fontSize="15" letterSpacing="1">MAKERERE</text>
            </svg>

            <svg className="h-7 w-auto fill-current" viewBox="0 0 150 36" role="img" aria-label="KNUST Kumasi">
              <polygon points="18,4 32,18 18,32 4,18" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="18" cy="18" r="3.5" />
              <text x="42" y="23" fontFamily="Google Sans, Plus Jakarta Sans, sans-serif" fontWeight="600" fontSize="15" letterSpacing="1">KNUST LAB</text>
            </svg>

            <svg className="h-7 w-auto fill-current" viewBox="0 0 160 36" role="img" aria-label="OAU Ife Campus">
              <rect x="4" y="6" width="24" height="24" rx="12" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M10 18h12M16 12v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <text x="38" y="23" fontFamily="Google Sans, Plus Jakarta Sans, sans-serif" fontWeight="600" fontSize="15" letterSpacing="1">OAU IFE</text>
            </svg>

            <svg className="h-7 w-auto fill-current" viewBox="0 0 175 36" role="img" aria-label="Nairobi Tech Hub">
              <path d="M6 28V8l10 12 10-12v20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <text x="38" y="23" fontFamily="Google Sans, Plus Jakarta Sans, sans-serif" fontWeight="600" fontSize="15" letterSpacing="1">UON NAIROBI</text>
            </svg>
          </div>
        </section>

        {/* 4. Everyday Mobile Data Savings Calculator */}
        <section
          id="calculator"
          className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
        >
          <div
            className={`rounded-3xl p-8 sm:p-12 border ${isDark
              ? 'bg-[#141E19] border-[#3C4043]/60'
              : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <div className="max-w-2xl mb-10">
              <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.02em]">
                Spend less on mobile data every week
              </h2>
              <p
                className={`mt-2.5 text-base ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Slide to match how many hours of class you attend each week and see how much mobile data you keep compared to standard video calls.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Slider Control */}
              <div className="lg:col-span-5 space-y-5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="hours-slider"
                    className="text-sm font-medium inline-flex items-center gap-2"
                  >
                    <SlidersHorizontal size={18} weight="regular" />
                    <span>Hours of class per week</span>
                  </label>
                  <span
                    className={`px-3.5 py-1 rounded-full font-mono text-sm font-medium tabular-nums ${isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                      }`}
                  >
                    {weeklyHours} hours / week
                  </span>
                </div>

                <input
                  id="hours-slider"
                  type="range"
                  min={2}
                  max={30}
                  step={1}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  className={`w-full h-1.5 rounded-lg cursor-pointer ${isDark ? 'accent-[#69DB7C]' : 'accent-[#059669]'
                    }`}
                />

                <div
                  className={`flex justify-between text-xs font-mono ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  <span>2 hrs</span>
                  <span>15 hrs</span>
                  <span>30 hrs</span>
                </div>
              </div>

              {/* Clean Divided Metrics Row */}
              <div
                className={`lg:col-span-7 rounded-3xl border grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x ${isDark
                  ? 'bg-[#0F1713] border-[#3C4043]/70 divide-[#3C4043]/60'
                  : 'bg-white border-[#DADCE0] divide-[#DADCE0]'
                  }`}
              >
                <div className="p-6">
                  <div
                    className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Regular Video Calls
                  </div>
                  <div className="text-2xl sm:text-3xl font-display font-medium mt-2 tabular-nums">
                    {(zoomWeeklyMb / 1024).toFixed(1)} GB
                  </div>
                  <div
                    className={`text-xs mt-1 tabular-nums ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Used every week
                  </div>
                </div>

                <div className="p-6">
                  <div
                    className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    With Chalk
                  </div>
                  <div className="text-2xl sm:text-3xl font-display font-medium mt-2 tabular-nums">
                    {chalkWeeklyMb} MB
                  </div>
                  <div
                    className={`text-xs mt-1 tabular-nums ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Used for the whole week
                  </div>
                </div>

                <div className="p-6">
                  <div
                    className={`text-xs font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                      }`}
                  >
                    Data You Save Monthly
                  </div>
                  <div
                    className={`text-2xl sm:text-3xl font-display font-medium mt-2 tabular-nums ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                      }`}
                  >
                    {savedMonthlyGb} GB
                  </div>
                  <div
                    className={`text-xs mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    97% less data used
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Plain-English "How It Works" Section (2-Column Zig-Zag) */}
        <section
          id="how-it-works"
          className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-24"
        >
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.02em]">
              Why Chalk stays clear when your internet is slow
            </h2>
            <p
              className={`mt-2.5 text-base leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
            >
              Regular video apps send a heavy video of the teacher's screen. Chalk only sends the teacher's voice and pen strokes, so it works smoothly even on 1 bar of signal.
            </p>
          </div>

          {/* Split 1: Always-Sharp Board vs Blurry Video */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 space-y-4">
              <h3 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
                Handwriting that never turns blurry
              </h3>
              <p
                className={`text-base leading-relaxed max-w-[54ch] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                When your internet slows down on a normal video call, the board turns into blurry blocks and you can't read what the teacher wrote. Chalk draws every word and diagram fresh on your screen, keeping notes crystal clear.
              </p>
              <button
                type="button"
                onClick={() => openLiveClassTransition('csc401-algo')}
                className={`btn-google inline-flex items-center gap-2 text-sm font-medium cursor-pointer ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  } hover:underline`}
              >
                <span>See the live board in action</span>
                <ArrowRight size={15} weight="regular" />
              </button>
            </div>

            <div className="lg:col-span-6">
              <div
                className={`rounded-3xl border p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]/70'
                  : 'bg-[#F8F9FA] border-[#DADCE0]'
                  }`}
              >
                {/* Left Comparison Card: Regular Video */}
                <div
                  className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043]/60'
                    : 'bg-white border-[#DADCE0]'
                    }`}
                >
                  <div className="space-y-1">
                    <span
                      className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                    >
                      Regular Video Call on Slow WiFi
                    </span>
                    <div className="text-sm font-medium">
                      Blurry screen & frozen audio
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-xl border text-center font-mono text-sm select-none blur-[2px] opacity-50 ${isDark
                      ? 'bg-[#141E19] border-[#3C4043]'
                      : 'bg-[#F8F9FA] border-[#DADCE0]'
                      }`}
                  >
                    f(x) = d[u] + w(u, v)
                  </div>

                  <div
                    className={`text-xs font-mono ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Uses ~540 MB every hour
                  </div>
                </div>

                {/* Right Comparison Card: Chalk Board */}
                <div
                  className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 ${isDark
                    ? 'bg-[#69DB7C]/10 border-[#69DB7C]/40'
                    : 'bg-[#ECFDF5]/70 border-[#059669]/30'
                    }`}
                >
                  <div className="space-y-1">
                    <span
                      className={`text-xs font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                        }`}
                    >
                      Chalk on the Same Slow WiFi
                    </span>
                    <div className="text-sm font-medium">
                      Sharp notes & clear voice
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-xl border text-center font-mono text-sm font-medium ${isDark
                      ? 'bg-[#0F1713] border-[#69DB7C]/40 text-[#69DB7C]'
                      : 'bg-white border-[#059669]/30 text-[#059669]'
                      }`}
                  >
                    f(x) = d[u] + w(u, v)
                  </div>

                  <div
                    className={`text-xs font-mono font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                      }`}
                  >
                    Uses only ~13 MB per hour
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Split 2: Smart Signal Protection */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-6 lg:order-2 space-y-4">
              <h3 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
                Voice and notes always come first
              </h3>
              <p
                className={`text-base leading-relaxed max-w-[54ch] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                If your mobile network suddenly drops during a storm or power cut, Chalk automatically pauses optional webcams so you never lose the teacher's voice or the live chalkboard.
              </p>
              <Link
                to="/benchmarks"
                className={`btn-google inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  } hover:underline`}
              >
                <span>See how Chalk performs on weak networks</span>
                <ArrowRight size={15} weight="regular" />
              </Link>
            </div>

            <div className="lg:col-span-6 lg:order-1">
              <div
                className={`rounded-3xl border divide-y ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]/70 divide-[#3C4043]/60'
                  : 'bg-[#F8F9FA] border-[#DADCE0] divide-[#DADCE0]'
                  }`}
              >
                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">
                      1. Live Chalkboard & Slides
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                    >
                      Every note appears right as the teacher writes it
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 shrink-0 ${isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                      }`}
                  >
                    <CheckCircle size={14} weight="fill" />
                    <span>Always On</span>
                  </span>
                </div>

                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">
                      2. Lecturer & Student Voice
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                    >
                      Clear audio that stays connected on 1 bar of signal
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 shrink-0 ${isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                      }`}
                  >
                    <CheckCircle size={14} weight="fill" />
                    <span>Always On</span>
                  </span>
                </div>

                <div className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">
                      3. Optional Camera Video
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                    >
                      Turns off automatically if your internet gets weak
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs shrink-0 ${isDark
                      ? 'bg-white/5 text-[#9AA0A6]'
                      : 'bg-black/5 text-[#5F6368]'
                      }`}
                  >
                    Pauses on Weak Signal
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. 5-Cell Bento Grid of Everyday Features */}
        <section
          id="workflows"
          className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
        >
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.02em]">
              Everything you need for class in one place
            </h2>
            <p
              className={`mt-2.5 text-base ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
            >
              Join live lessons, catch up when you arrive late, or download tiny class recordings for exam revision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Cell 1: Live Classroom */}
            <button
              type="button"
              onClick={() => openLiveClassTransition('csc401-algo')}
              className="hover-lift md:col-span-7 group relative rounded-3xl p-8 overflow-hidden bg-[#14261D] text-white flex flex-col justify-between min-h-[260px] text-left cursor-pointer"
            >
              <img
                src="https://picsum.photos/seed/chalk-university-lecture/1200/800"
                alt="University lecture hall background"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover opacity-15 mix-blend-luminosity pointer-events-none"
              />
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#69DB7C]/20 text-[#69DB7C] flex items-center justify-center">
                    <ChalkboardTeacher size={22} weight="regular" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#69DB7C]/20 text-[#69DB7C] font-mono text-[11px] font-medium">
                    Instant Trial Available
                  </span>
                </div>
                <h3 className="font-display text-2xl font-medium">
                  Live Voice & Chalkboard Classes
                </h3>
                <p className="text-sm text-white/80 max-w-[50ch] leading-relaxed">
                  Listen to your lecturer, raise your hand to ask questions, and watch diagrams drawn live on the board using very little mobile data.
                </p>
              </div>
              <div className="relative z-10 mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#69DB7C]">
                <span>Try a live sample class</span>
                <ArrowRight size={16} weight="regular" />
              </div>
            </button>

            {/* Cell 2: Catch Me Up AI */}
            <Link
              to="/study"
              className={`hover-lift md:col-span-5 group rounded-3xl p-8 flex flex-col justify-between min-h-[260px] ${isDark
                ? 'bg-[#69DB7C]/12 border border-[#69DB7C]/30 text-[#E3E3E3]'
                : 'bg-[#ECFDF5] border border-[#059669]/20 text-[#202124]'
                }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark
                      ? 'bg-[#69DB7C]/20 text-[#69DB7C]'
                      : 'bg-white text-[#059669]'
                      }`}
                  >
                    <Sparkle size={22} weight="regular" />
                  </div>
                  {!isAuthenticated && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-medium ${isDark
                        ? 'bg-white/10 text-[#E3E3E3]'
                        : 'bg-black/5 text-[#5F6368]'
                        }`}
                    >
                      <LockKey size={12} weight="regular" />
                      <span>Sign in required</span>
                    </span>
                  )}
                </div>
                <h3 className="font-display text-2xl font-medium">
                  Joined late? Catch up in 10 seconds
                </h3>
                <p
                  className={`text-sm leading-relaxed ${isDark ? 'text-[#E3E3E3]/80' : 'text-[#202124]/80'
                    }`}
                >
                  If a power cut or bad network makes you miss the start of class, get an instant summary of what the teacher covered plus a quick practice quiz.
                </p>
              </div>
              <div
                className={`mt-8 inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  }`}
              >
                <span>
                  {isAuthenticated
                    ? 'Open Study Notes & Quiz'
                    : 'Sign in for Study Notes & Quiz'}
                </span>
                <ArrowRight size={16} weight="regular" />
              </div>
            </Link>

            {/* Cell 3: Recorded Replays */}
            <Link
              to="/replays"
              className={`hover-lift md:col-span-4 group rounded-3xl p-7 border flex flex-col justify-between ${isDark
                ? 'bg-[#141E19] border-[#3C4043]/70'
                : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                      }`}
                  >
                    <PlayCircle size={20} weight="regular" />
                  </div>
                  {!isAuthenticated && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] ${isDark
                        ? 'bg-white/5 text-[#9AA0A6]'
                        : 'bg-black/5 text-[#5F6368]'
                        }`}
                    >
                      <LockKey size={11} weight="regular" />
                      <span>Account</span>
                    </span>
                  )}
                </div>
                <h3 className="font-display text-xl font-medium">
                  Download 1-hour classes in 11 MB
                </h3>
                <p
                  className={`text-sm leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Save full recorded lessons to your phone for offline exam revision without filling up your storage.
                </p>
              </div>
              <div
                className={`mt-6 inline-flex items-center gap-1.5 text-xs font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  }`}
              >
                <span>
                  {isAuthenticated
                    ? 'Watch recorded classes'
                    : 'Sign in to watch replays'}
                </span>
                <ArrowRight size={14} weight="regular" />
              </div>
            </Link>

            {/* Cell 4: Classroom Hub */}
            <Link
              to="/hub"
              className={`hover-lift md:col-span-4 group rounded-3xl p-7 border flex flex-col justify-between ${isDark
                ? 'bg-[#141E19] border-[#3C4043]/70'
                : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                      }`}
                  >
                    <GraduationCap size={20} weight="regular" />
                  </div>
                  {!isAuthenticated && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] ${isDark
                        ? 'bg-white/5 text-[#9AA0A6]'
                        : 'bg-black/5 text-[#5F6368]'
                        }`}
                    >
                      <LockKey size={11} weight="regular" />
                      <span>Account</span>
                    </span>
                  )}
                </div>
                <h3 className="font-display text-xl font-medium">
                  All your courses in one hub
                </h3>
                <p
                  className={`text-sm leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Check class announcements, join live rooms with a code, and turn in assignments from any phone or laptop.
                </p>
              </div>
              <div
                className={`mt-6 inline-flex items-center gap-1.5 text-xs font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  }`}
              >
                <span>
                  {isAuthenticated
                    ? 'View enrolled classes'
                    : 'Sign up to access Hub'}
                </span>
                <ArrowRight size={14} weight="regular" />
              </div>
            </Link>

            {/* Cell 5: Data Comparison */}
            <Link
              to="/benchmarks"
              className={`hover-lift md:col-span-4 group rounded-3xl p-7 border flex flex-col justify-between ${isDark
                ? 'bg-[#141E19] border-[#3C4043]/70'
                : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                      }`}
                  >
                    <ChartBar size={20} weight="regular" />
                  </div>
                  {!isAuthenticated && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] ${isDark
                        ? 'bg-white/5 text-[#9AA0A6]'
                        : 'bg-black/5 text-[#5F6368]'
                        }`}
                    >
                      <LockKey size={11} weight="regular" />
                      <span>Account</span>
                    </span>
                  )}
                </div>
                <h3 className="font-display text-xl font-medium">
                  See the data comparison
                </h3>
                <p
                  className={`text-sm leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Compare how much mobile data Chalk saves over a 1-hour class versus standard video calling apps.
                </p>
              </div>
              <div
                className={`mt-6 inline-flex items-center gap-1.5 text-xs font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  }`}
              >
                <span>
                  {isAuthenticated
                    ? 'View data comparison'
                    : 'Sign in for full telemetry'}
                </span>
                <ArrowRight size={14} weight="regular" />
              </div>
            </Link>
          </div>
        </section>

        {/* 7. Student & Lecturer Stories */}
        <section
          id="reviews"
          className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.02em] mb-10">
            Loved by students and lecturers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <blockquote
              className={`p-8 rounded-3xl border flex flex-col justify-between ${isDark
                ? 'bg-[#141E19] border-[#3C4043]/70'
                : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
            >
              <p className="text-base sm:text-lg leading-relaxed">
                “When rainstorms slowed our hostel WiFi down to a crawl, regular video calls froze right away. With Chalk, I could still hear Prof. Adeleke clearly and see every step he wrote on the board.”
              </p>
              <footer className="mt-6 flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-full font-mono font-medium text-xs flex items-center justify-center ${isDark
                    ? 'bg-[#69DB7C]/20 text-[#69DB7C]'
                    : 'bg-[#ECFDF5] text-[#059669]'
                    }`}
                >
                  CN
                </div>
                <div>
                  <div className="font-medium text-sm">Chioma Nwosu</div>
                  <div
                    className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Final Year Computer Science Student, UNILAG
                  </div>
                </div>
              </footer>
            </blockquote>

            <blockquote
              className={`p-8 rounded-3xl border flex flex-col justify-between ${isDark
                ? 'bg-[#141E19] border-[#3C4043]/70'
                : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
            >
              <p className="text-base sm:text-lg leading-relaxed">
                “My students used to burn through their weekly mobile data plan after just two video classes. Switching our department to Chalk cut their data costs by more than 95 percent.”
              </p>
              <footer className="mt-6 flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-full font-mono font-medium text-xs flex items-center justify-center ${isDark
                    ? 'bg-[#69DB7C]/20 text-[#69DB7C]'
                    : 'bg-[#ECFDF5] text-[#059669]'
                    }`}
                >
                  AO
                </div>
                <div>
                  <div className="font-medium text-sm">Prof. Adeleke O.</div>
                  <div
                    className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Senior Lecturer, Department of Computer Science
                  </div>
                </div>
              </footer>
            </blockquote>
          </div>

          {/* Ready to Join CTA Banner */}
          <div
            className={`mt-14 rounded-3xl border p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${isDark
              ? 'bg-[#141E19] border-[#69DB7C]/30'
              : 'bg-[#ECFDF5]/80 border-[#059669]/25'
              }`}
          >
            <div className="space-y-2 max-w-xl">
              <h3 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
                Ready for classes that never drop on weak network?
              </h3>
              <p
                className={`text-sm sm:text-base ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Create your student or lecturer profile in under a minute, or jump straight into a live sample lecture to test the chalkboard.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <Link
                  to="/hub"
                  className={`btn-google px-6 py-3.5 rounded-full text-sm font-medium inline-flex items-center gap-2 ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <span>Go to Classroom Dashboard</span>
                  <ArrowRight size={16} weight="regular" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth?mode=signup"
                    className={`btn-google px-6 py-3.5 rounded-full text-sm font-medium inline-flex items-center gap-2 ${isDark
                      ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                      : 'bg-[#059669] text-white hover:bg-[#047857]'
                      }`}
                  >
                    <UserPlus size={17} weight="regular" />
                    <span>Sign up free</span>
                  </Link>
                  <Link
                    to="/auth?mode=login"
                    className={`btn-google px-5 py-3.5 rounded-full border text-sm font-medium inline-flex items-center gap-2 ${isDark
                      ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                      : 'bg-white border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                      }`}
                  >
                    <SignIn size={17} weight="regular" />
                    <span>Log in</span>
                  </Link>
                </>
              )}
              <button
                type="button"
                onClick={() => openLiveClassTransition('csc401-algo')}
                className={`btn-google px-5 py-3.5 rounded-full text-sm font-medium inline-flex items-center gap-2 cursor-pointer ${isDark
                  ? 'text-[#69DB7C] hover:bg-[#69DB7C]/10'
                  : 'text-[#059669] hover:bg-[#69DB7C]/10'
                  }`}
              >
                <VideoCamera size={17} weight="regular" />
                <span>Try a live class</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 8. Minimalist Google-Style Footer */}
      <footer
        className={`mt-auto py-8 px-4 sm:px-6 lg:px-8 border-t ${isDark
          ? 'bg-[#0F1713] border-[#3C4043]/60 text-[#9AA0A6]'
          : 'bg-[#F8F9FA] border-[#DADCE0] text-[#5F6368]'
          }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-medium text-sm text-current">
              Chalk
            </span>
            <span>•</span>
            <span>Low-Data Virtual Classroom</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
            <button
              type="button"
              onClick={() => openLiveClassTransition('csc401-algo')}
              className="hover:underline cursor-pointer"
            >
              Try a Live Class
            </button>
            {isAuthenticated ? (
              <>
                <Link to="/hub" className="hover:underline">
                  Classroom Hub
                </Link>
                <Link to="/replays" className="hover:underline">
                  Recorded Classes
                </Link>
                <Link to="/study" className="hover:underline">
                  Study Notes
                </Link>
                <Link to="/benchmarks" className="hover:underline">
                  Data Savings
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth?mode=login" className="hover:underline">
                  Log In
                </Link>
                <Link to="/auth?mode=signup" className="hover:underline">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Live Class Pre-Join Transition Modal */}
      {pendingLiveRoom && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div
            className={`modal-surface w-full max-w-md rounded-3xl border p-6 sm:p-7 space-y-5 shadow-2xl ${isDark
              ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
              : 'bg-white border-[#DADCE0] text-[#202124]'
              }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium ${isDark
                    ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                    : 'bg-[#ECFDF5] text-[#059669]'
                    }`}
                >
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  <span>LIVE CLASS LOBBY • {pendingLiveRoom.toUpperCase()}</span>
                </span>
                <h2 className="font-display text-xl font-medium">
                  Ready to join live class?
                </h2>
                <p
                  className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  CSC 401: Algorithms & Data Structures • Prof. Adeleke O.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingLiveRoom(null)}
                aria-label="Close modal"
                className="btn-google p-1.5 rounded-full opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <X size={18} weight="regular" />
              </button>
            </div>

            <form onSubmit={handleLaunchLiveClass} className="space-y-4">
              {!isAuthenticated ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor="prejoin-guest-name"
                    className={`block text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Your Display Name (Guest Trial)
                  </label>
                  <input
                    id="prejoin-guest-name"
                    type="text"
                    value={prejoinGuestName}
                    onChange={(e) => setPrejoinGuestName(e.target.value)}
                    placeholder="Enter your name"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${isDark
                      ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                      : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                      }`}
                  />
                </div>
              ) : (
                <div
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043]'
                    : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                >
                  <span>
                    Joining as <strong>{currentUser?.name}</strong>
                  </span>
                  <span className="font-mono uppercase opacity-75">
                    {currentUser?.role}
                  </span>
                </div>
              )}

              {/* Pre-join Audio Setting */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${isDark
                  ? 'bg-[#0F1713] border-[#3C4043]'
                  : 'bg-[#F8F9FA] border-[#DADCE0]'
                  }`}
              >
                <div className="text-xs">
                  <div className="font-medium">Microphone status on entry</div>
                  <div
                    className={`mt-0.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Opus 24 kbps low-data voice stream
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPrejoinMicMuted((prev) => !prev)}
                  className={`btn-google px-3.5 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${prejoinMicMuted
                    ? 'bg-[#D93025]/15 text-[#D93025] border border-[#D93025]/30'
                    : isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C] border border-[#69DB7C]/30'
                      : 'bg-[#ECFDF5] text-[#059669] border border-[#059669]/30'
                    }`}
                >
                  {prejoinMicMuted ? (
                    <>
                      <MicrophoneSlash size={15} weight="regular" />
                      <span>Muted</span>
                    </>
                  ) : (
                    <>
                      <Microphone size={15} weight="regular" />
                      <span>Mic On</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="submit"
                className={`btn-google w-full py-3.5 px-5 rounded-full font-medium text-sm flex items-center justify-center gap-2 cursor-pointer ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                <VideoCamera size={18} weight="regular" />
                <span>
                  {isAuthenticated
                    ? 'Enter Live Classroom'
                    : 'Continue as Guest to Live Class'}
                </span>
              </button>
            </form>

            {!isAuthenticated && (
              <div
                className={`pt-4 border-t space-y-2.5 ${isDark ? 'border-[#3C4043]' : 'border-[#DADCE0]'
                  }`}
              >
                <div
                  className={`text-xs text-center ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Want full access to course dashboards, notes & replays?
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    to={`/auth?mode=login&redirect=${encodeURIComponent(
                      `/studio/${pendingLiveRoom}`
                    )}`}
                    className={`btn-google py-2.5 px-3 rounded-full border text-xs font-medium flex items-center justify-center gap-1.5 ${isDark
                      ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                      : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                      }`}
                  >
                    <SignIn size={14} weight="regular" />
                    <span>Log in</span>
                  </Link>
                  <Link
                    to={`/auth?mode=signup&redirect=${encodeURIComponent(
                      `/studio/${pendingLiveRoom}`
                    )}`}
                    className={`btn-google py-2.5 px-3 rounded-full border text-xs font-medium flex items-center justify-center gap-1.5 ${isDark
                      ? 'border-[#69DB7C]/40 text-[#69DB7C] hover:bg-[#69DB7C]/10'
                      : 'border-[#059669]/40 text-[#059669] hover:bg-[#ECFDF5]'
                      }`}
                  >
                    <UserPlus size={14} weight="regular" />
                    <span>Sign up</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
