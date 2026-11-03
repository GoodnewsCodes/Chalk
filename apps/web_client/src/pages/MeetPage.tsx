import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Microphone,
  MicrophoneSlash,
  HandPalm,
  ChatCircleText,
  Users,
  Chalkboard,
  VideoCamera,
  VideoCameraSlash,
  PhoneDisconnect,
  Sparkle,
  CaretLeft,
  CaretRight,
  PencilSimple,
  HighlighterCircle,
  Eraser,
  Circle,
  Square,
  ArrowUpRight,
  Crosshair,
  ArrowCounterClockwise,
  ArrowClockwise,
  Trash,
  WifiHigh,
  Warning,
  PaperPlaneTilt,
  X,
  Broadcast,
  Desktop,
  Copy,
  Check,
  Keyboard,
  Plus,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { VectorCanvas } from '../components/VectorCanvas';
import { CatchUpModal } from '../components/CatchUpModal';
import { LiveKitConference } from '../components/LiveKitConference';
import { fetchLiveKitToken } from '../lib/livekit';
import { NetworkProfile, StrokeTool, VideoMode } from '../types/chalk';

const CHALK_PALETTE = [
  '#69DB7C',
  '#E3E3E3',
  '#81C995',
  '#FDD663',
  '#F28B82',
  '#C58AF9',
];

export const MeetPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    isDark,
    currentUser,
    isAuthenticated,
    guestName,
    courses,
    liveRooms,
    activeRoomCode,
    setActiveRoomCode,
    activeRoomInfo,
    selfSocketId,
    participants,
    chatMessages,
    sendChatMessage,
    isMicMuted,
    toggleMic,
    isHandRaised,
    toggleHandRaised,
    lowerHand,
    localStream,
    remoteStreams,
    speakingMap,
    strokes,
    currentTool,
    setCurrentTool,
    currentColor,
    setCurrentColor,
    currentWidth,
    setCurrentWidth,
    activeSlideIndex,
    totalSlides,
    nextSlide,
    prevSlide,
    laser,
    emitLaser,
    commitStroke,
    canUndo,
    canRedo,
    undoStroke,
    redoStroke,
    clearCanvas,
    networkProfile,
    setNetworkProfile,
    videoMode,
    setVideoMode,
    circuitBreakerMessage,
    dismissCircuitBreaker,
    currentBitrateKbps,
    rttMs,
    packetLoss,
    chalkDataUsedMb,
    zoomDataUsedMb,
    savingsPercentage,
  } = useApp();

  useEffect(() => {
    if (roomCode && roomCode !== activeRoomCode) {
      setActiveRoomCode(roomCode);
    }
  }, [roomCode, activeRoomCode, setActiveRoomCode]);

  // Initial mute preference from query params
  useEffect(() => {
    if (searchParams.get('muted') === '0' && isMicMuted) {
      toggleMic();
    }
  }, []);

  const [stageMode, setStageMode] = useState<'whiteboard' | 'speakers'>('whiteboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAttendeesOpen, setIsAttendeesOpen] = useState(false);
  const [isCatchUpOpen, setIsCatchUpOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [copiedMeetLink, setCopiedMeetLink] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitUrl, setLiveKitUrl] = useState<string>('ws://127.0.0.1:7880');
  const [liveKitConnected, setLiveKitConnected] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [dismissSoloBanner, setDismissSoloBanner] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const videoPiPRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateInstantMeeting = () => {
    const code = `meet-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
    setActiveRoomCode(code);
    navigate(`/meet/${code}`);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInput.trim()) return;
    const cleaned = joinInput.trim().replace(/^https?:\/\/[^/]+\/meet\//, '');
    setActiveRoomCode(cleaned);
    navigate(`/meet/${cleaned}`);
  };

  // Fetch LiveKit WebRTC Access Token for real audio & video conferencing
  useEffect(() => {
    let active = true;
    const fetchToken = async () => {
      const room = roomCode || activeRoomCode;
      if (!room) return;
      try {
        const res = await fetchLiveKitToken({
          roomName: room,
          identity: currentUser?.id,
          name: currentUser?.name || guestName || 'Campus User',
          role: currentUser?.role || 'student',
          avatarTag: currentUser?.avatarTag,
        });
        if (active && res?.token) {
          setLiveKitToken(res.token);
          setLiveKitUrl(res.url);
          setLiveKitConnected(true);
        }
      } catch (err) {
        console.warn('[LiveKit Meet] Token initialization fallback:', err);
      }
    };
    fetchToken();
    return () => {
      active = false;
    };
  }, [roomCode, activeRoomCode, currentUser?.id, currentUser?.name, guestName]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedMeetLink(true);
    setTimeout(() => setCopiedMeetLink(false), 2000);
  };

  // Attach local camera video stream to PiP window
  useEffect(() => {
    if (videoPiPRef.current && localStream) {
      videoPiPRef.current.srcObject = localStream;
    }
  }, [localStream, videoMode]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const tools: { id: StrokeTool; label: string; icon: React.ElementType }[] = [
    { id: 'pen', label: 'Pen', icon: PencilSimple },
    { id: 'highlighter', label: 'Marker', icon: HighlighterCircle },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'circle', label: 'Circle', icon: Circle },
    { id: 'rect', label: 'Box', icon: Square },
    { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
    { id: 'laser', label: 'Laser', icon: Crosshair },
  ];

  // Active lecturer or active speaker lookup
  const activeLecturer = participants.find((p) => p.role === 'lecturer');
  const activeSpeaker =
    participants.find((p) => speakingMap[p.socketId]) ||
    activeLecturer ||
    participants[0];

  const effectiveRoomTitle =
    activeRoomInfo.title && activeRoomInfo.title !== `Room ${activeRoomCode}`
      ? activeRoomInfo.title
      : activeRoomCode;

  const effectiveCourseSubtitle = activeRoomInfo.courseCode
    ? `${activeRoomInfo.courseCode}${activeRoomInfo.lecturerName ? ` • ${activeRoomInfo.lecturerName}` : ''}`
    : activeRoomInfo.lecturerName
    ? `Host: ${activeRoomInfo.lecturerName}`
    : 'Chalk Live Classroom';

  const isMeLecturer = currentUser?.role === 'lecturer';

  if (!roomCode) {
    const formattedDate = currentTime.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = currentTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="min-h-[100dvh] bg-[#0F1713] text-[#E3E3E3] flex flex-col overflow-y-auto">
        {/* Google Meet Navigation Bar */}
        <header className="h-16 px-4 sm:px-8 border-b border-[#3C4043] flex items-center justify-between shrink-0 bg-[#141E19]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#69DB7C]/15 border border-[#69DB7C]/30 flex items-center justify-center text-[#69DB7C]">
              <VideoCamera size={22} weight="fill" />
            </div>
            <span className="font-display text-xl font-medium tracking-tight text-[#E3E3E3]">
              Chalk Meet
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline-block font-mono text-xs text-[#9AA0A6]">
              {formattedDate} • {formattedTime}
            </span>

            <Link
              to={isAuthenticated ? '/hub' : '/'}
              className="btn-google px-4 py-2 rounded-full border border-[#3C4043] hover:border-[#69DB7C] text-xs font-medium text-[#E3E3E3]"
            >
              {isAuthenticated ? 'Classroom Hub' : 'Home'}
            </Link>

            {currentUser && (
              <div
                className="w-9 h-9 rounded-full bg-[#69DB7C] text-[#0F1713] font-mono text-xs font-bold flex items-center justify-center shadow"
                title={`${currentUser.name} (${currentUser.role})`}
              >
                {currentUser.avatarTag || currentUser.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Hero & Action Area */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-16 max-w-7xl mx-auto w-full py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Col: Hero Pitch & Instant Actions */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#69DB7C]/15 border border-[#69DB7C]/30 text-[#69DB7C] font-mono text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#69DB7C] animate-pulse" />
                  <span>Ultra Low-Bandwidth Meetings • Under 28 kbps</span>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[#E3E3E3] leading-tight">
                  Video calls and vector whiteboard meetings for everyone
                </h1>
                <p className="text-sm sm:text-base text-[#9AA0A6] leading-relaxed max-w-xl">
                  Chalk delivers real-time Opus audio, adaptive LiveKit video, and ultra-low bandwidth vector chalkboards running at 28 kbps. Never miss a lecture on weak campus WiFi or 2G connections.
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreateInstantMeeting}
                  className="btn-google px-6 py-3.5 rounded-full bg-[#69DB7C] hover:bg-[#51CF66] text-[#0F1713] font-medium text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#69DB7C]/20 cursor-pointer shrink-0"
                >
                  <VideoCamera size={19} weight="bold" />
                  <span>New meeting</span>
                </button>

                <form onSubmit={handleJoinSubmit} className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Keyboard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA0A6]" />
                    <input
                      type="text"
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value)}
                      placeholder="Enter a code or link"
                      aria-label="Enter meeting code or link"
                      className="w-full pl-11 pr-4 py-3.5 rounded-full bg-[#141E19] border border-[#3C4043] text-sm text-[#E3E3E3] placeholder-[#9AA0A6] focus:outline-none focus:border-[#69DB7C]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!joinInput.trim()}
                    className="btn-google px-6 py-3.5 rounded-full border border-[#3C4043] hover:border-[#69DB7C] disabled:opacity-40 font-medium text-sm text-[#E3E3E3] hover:text-[#69DB7C] disabled:hover:text-[#E3E3E3] disabled:cursor-not-allowed cursor-pointer"
                  >
                    Join
                  </button>
                </form>
              </div>

              {/* Status pill row */}
              <div className="pt-2 border-t border-[#3C4043]/50 flex flex-wrap items-center gap-3 text-xs text-[#9AA0A6] font-mono">
                <span className="flex items-center gap-1.5 text-[#69DB7C]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#69DB7C]" />
                  LiveKit WebRTC SFU Mesh
                </span>
                <span>•</span>
                <span>97.6% bandwidth saved vs standard video</span>
              </div>
            </div>

            {/* Right Col: Live Sessions OR Empty State Card */}
            <div className="lg:col-span-5">
              {liveRooms.length === 0 ? (
                <div className="rounded-3xl border border-[#3C4043] bg-[#141E19] p-8 sm:p-10 text-center space-y-6 shadow-2xl">
                  <div className="w-20 h-20 mx-auto rounded-full bg-[#69DB7C]/15 border border-[#69DB7C]/30 flex items-center justify-center text-[#69DB7C]">
                    <Broadcast size={36} weight="regular" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="font-display text-xl font-medium text-[#E3E3E3]">
                      No live meetings right now
                    </h2>
                    <p className="text-xs sm:text-sm text-[#9AA0A6] leading-relaxed">
                      There are no live meetings currently streaming across campus courses. Start a new instant meeting to share your screen or collaborate on the blackboard.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateInstantMeeting}
                    className="btn-google w-full py-3.5 rounded-full bg-[#69DB7C] hover:bg-[#51CF66] text-[#0F1713] font-medium text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} weight="bold" />
                    <span>Start Instant Meeting</span>
                  </button>
                </div>
              ) : (
                <div className="rounded-3xl border border-[#3C4043] bg-[#141E19] p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-base font-medium text-[#E3E3E3] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#69DB7C] animate-pulse" />
                      <span>Active Live Meetings ({liveRooms.length})</span>
                    </h2>
                    <span className="text-[11px] font-mono text-[#69DB7C]">In-Progress</span>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {liveRooms.map((room) => (
                      <div
                        key={room.id}
                        className="p-4 rounded-2xl bg-[#0F1713] border border-[#3C4043] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-[#69DB7C]">
                              {room.courseCode || room.id}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-[#9AA0A6]">
                              {room.participantCount} in call
                            </span>
                          </div>
                          <div className="text-sm font-medium text-[#E3E3E3] truncate mt-0.5">
                            {room.title}
                          </div>
                          {room.lecturerName && (
                            <div className="text-xs text-[#9AA0A6] truncate">
                              Host: {room.lecturerName}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveRoomCode(room.id);
                            navigate(`/meet/${room.id}`);
                          }}
                          className="btn-google px-4 py-2 rounded-full bg-[#69DB7C] hover:bg-[#51CF66] text-[#0F1713] font-medium text-xs shrink-0 cursor-pointer"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Course Classroom Rooms Grid */}
          {courses.length > 0 && (
            <div className="mt-14 pt-8 border-t border-[#3C4043]/60 space-y-4">
              <div>
                <h2 className="font-display text-lg font-medium text-[#E3E3E3]">
                  Campus Course Classrooms
                </h2>
                <p className="text-xs text-[#9AA0A6]">
                  Dedicated low-bandwidth virtual classrooms for your enrolled courses
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-[#141E19] border border-[#3C4043] flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <span className="font-mono text-xs font-semibold text-[#69DB7C]">
                        {c.code}
                      </span>
                      <h3 className="font-display text-sm font-medium text-[#E3E3E3] line-clamp-1 mt-1">
                        {c.title}
                      </h3>
                      <p className="text-xs text-[#9AA0A6] line-clamp-1">
                        {c.lecturerName}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#3C4043]/40">
                      <span className="font-mono text-[11px] text-[#9AA0A6]">
                        Room: {c.liveRoomCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveRoomCode(c.liveRoomCode);
                          navigate(`/meet/${c.liveRoomCode}`);
                        }}
                        className="btn-google px-3 py-1 rounded-full border border-[#3C4043] hover:border-[#69DB7C] text-xs font-mono text-[#E3E3E3] hover:text-[#69DB7C] cursor-pointer"
                      >
                        Enter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] h-[100dvh] bg-[#0F1713] text-[#E3E3E3] flex flex-col overflow-hidden">
      {/* 1. Top Meeting Header Bar */}
      <header className="h-16 px-3 sm:px-5 bg-[#141E19] border-b border-[#3C4043] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? '/hub' : '/')}
            className="btn-google p-2 rounded-full bg-[#0F1713] hover:bg-[#28292A] text-[#9AA0A6] hover:text-[#E3E3E3] border border-[#3C4043] cursor-pointer"
            title={isAuthenticated ? 'Return to Classroom Hub' : 'Return to Home'}
          >
            <CaretLeft size={16} weight="regular" />
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#69DB7C]/15 text-[#69DB7C] font-mono text-[11px] font-medium shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#69DB7C] animate-pulse" />
            <span>LIVE MEET</span>
          </span>

          {/* Share Meeting Link Pill */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="btn-google hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F1713] border border-[#3C4043] text-xs font-mono text-[#9AA0A6] hover:text-[#E3E3E3] cursor-pointer"
            title="Copy meeting link to share"
          >
            {copiedMeetLink ? (
              <>
                <Check size={13} className="text-[#69DB7C]" />
                <span className="text-[#69DB7C]">Link Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Share Link</span>
              </>
            )}
          </button>

          {/* LiveKit SFU Status Badge */}
          <span
            className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-medium shrink-0 ${
              liveKitConnected
                ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                : 'bg-amber-500/15 text-amber-400'
            }`}
            title={
              liveKitConnected
                ? `LiveKit WebRTC SFU connected (${liveKitUrl})`
                : 'Connecting to LiveKit WebRTC SFU'
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                liveKitConnected ? 'bg-[#69DB7C] animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{liveKitConnected ? 'LIVEKIT SFU' : 'WEBRTC READY'}</span>
          </span>

          <div className="min-w-0">
            <div className="font-display text-sm sm:text-base font-medium text-[#E3E3E3] truncate">
              {effectiveRoomTitle}
            </div>
            <div className="hidden sm:block text-xs text-[#9AA0A6] truncate">
              {effectiveCourseSubtitle}
            </div>
          </div>
        </div>

        {/* Center Slide Deck Switcher */}
        <div className="flex items-center gap-1.5 bg-[#0F1713] border border-[#3C4043] rounded-full px-2.5 py-1">
          <button
            type="button"
            onClick={prevSlide}
            disabled={activeSlideIndex === 0}
            aria-label="Previous slide"
            className="btn-google p-1 rounded-full hover:bg-[#28292A] disabled:opacity-30 cursor-pointer"
          >
            <CaretLeft size={14} weight="regular" />
          </button>
          <span className="font-mono text-xs font-medium text-[#E3E3E3] px-2 tabular-nums">
            Slide {activeSlideIndex + 1}/{totalSlides}
          </span>
          <button
            type="button"
            onClick={nextSlide}
            disabled={activeSlideIndex === totalSlides - 1}
            aria-label="Next slide"
            className="btn-google p-1 rounded-full hover:bg-[#28292A] disabled:opacity-30 cursor-pointer"
          >
            <CaretRight size={14} weight="regular" />
          </button>
        </div>

        {/* Right: Catch Me Up AI Button + Guest Auth Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!isAuthenticated && (
            <div className="hidden lg:flex items-center gap-2 mr-1">
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-[#3C4043] font-mono text-[11px] text-[#9AA0A6]">
                Guest ({guestName})
              </span>
              <Link
                to={`/auth?mode=login&redirect=${encodeURIComponent(
                  `/meet/${roomCode || activeRoomCode}`
                )}`}
                className="btn-google px-3.5 py-1.5 rounded-full border border-[#3C4043] text-xs font-medium text-[#E3E3E3] hover:bg-[#28292A]"
              >
                Log in
              </Link>
              <Link
                to="/auth?mode=signup&redirect=/hub"
                className={`btn-google px-3.5 py-1.5 rounded-full text-xs font-medium ${
                  isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
              >
                Sign up
              </Link>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsCatchUpOpen(true)}
            className={`btn-google px-4 py-2 rounded-full font-medium text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
              isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
            }`}
          >
            <Sparkle size={15} weight="fill" />
            <span>Catch Me Up</span>
          </button>
        </div>
      </header>

      {/* 2. Main Stage Area */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        <div className="flex-1 relative flex flex-col min-w-0 p-2 sm:p-3">
          <LiveKitConference
            serverUrl={liveKitUrl}
            token={liveKitToken}
            roomCode={roomCode || activeRoomCode}
            isMicMuted={isMicMuted}
            videoMode={videoMode}
            onToggleMic={toggleMic}
            onSetVideoMode={setVideoMode}
            socketParticipants={participants}
            selfSocketId={selfSocketId}
            isMeLecturer={isMeLecturer}
            onLowerHand={lowerHand}
            stageMode={stageMode}
          >
            {/* Whiteboard Stage */}
            <div className="relative flex-1 rounded-3xl border border-[#3C4043] overflow-hidden bg-[#0F1713]">
              {/* Interactive Vector Canvas */}
              <VectorCanvas
                strokes={strokes}
                activeSlideIndex={activeSlideIndex}
                interactive={true}
                currentTool={currentTool}
                currentColor={currentColor}
                currentWidth={currentWidth}
                roomId={roomCode || activeRoomCode}
                userId={currentUser?.id || 'usr_guest'}
                userName={currentUser?.name || guestName || 'Campus User'}
                laser={laser}
                onCommitStroke={commitStroke}
                onEmitLaser={emitLaser}
              />

              {/* Google Meet Solo / Waiting For Classmates Banner */}
              {participants.length <= 1 && !dismissSoloBanner && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-[#141E19]/95 border border-[#3C4043] backdrop-blur-md shadow-2xl flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#69DB7C] animate-pulse" />
                  <span className="text-xs text-[#E3E3E3] font-medium hidden sm:inline">
                    You're the only one here
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="btn-google px-3 py-1 rounded-full bg-[#0F1713] border border-[#3C4043] hover:border-[#69DB7C] font-mono text-[11px] text-[#69DB7C] flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedMeetLink ? (
                      <>
                        <Check size={12} className="text-[#69DB7C]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Invite Link</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissSoloBanner(true)}
                    className="text-[#9AA0A6] hover:text-[#E3E3E3] p-1 rounded-full cursor-pointer"
                    aria-label="Dismiss banner"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* Top-Left: Active Speaker Pill */}
              {activeSpeaker && (
                <div
                  className={`absolute top-4 left-4 px-3.5 py-2 rounded-full bg-[#141E19]/95 border backdrop-blur-md flex items-center gap-3 shadow-lg ${
                    speakingMap[activeSpeaker.socketId]
                      ? 'border-[#69DB7C] ring-1 ring-[#69DB7C]/50'
                      : 'border-[#3C4043]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full font-mono font-medium text-xs flex items-center justify-center ${
                      activeSpeaker.role === 'lecturer'
                        ? 'bg-[#69DB7C] text-black font-semibold'
                        : 'bg-[#059669] text-white'
                    }`}
                  >
                    {activeSpeaker.avatarTag || activeSpeaker.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="pr-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[#E3E3E3]">
                        {activeSpeaker.name}
                        {activeSpeaker.socketId === selfSocketId ? ' (You)' : ''}
                      </span>
                      {speakingMap[activeSpeaker.socketId] && (
                        <span className="inline-flex items-end gap-0.5 h-3">
                          <span className="w-1 h-2 bg-[#69DB7C] rounded-full animate-pulse" />
                          <span className="w-1 h-3 bg-[#69DB7C] rounded-full animate-pulse" />
                          <span className="w-1 h-1.5 bg-[#69DB7C] rounded-full animate-pulse" />
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-[#69DB7C]">
                      {activeSpeaker.isMuted
                        ? 'Muted'
                        : speakingMap[activeSpeaker.socketId]
                        ? 'Speaking (Opus)'
                        : 'LiveKit Voice Ready'}
                    </div>
                  </div>
                </div>
              )}

              {/* Top-Right: Anti-Lag QoS & Bandwidth Meter HUD */}
              <div className="absolute top-4 right-4 flex flex-col items-end gap-2 max-w-xs">
                <div className="p-4 rounded-3xl bg-[#141E19]/95 border border-[#3C4043] backdrop-blur-md shadow-xl space-y-2.5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#9AA0A6] flex items-center gap-1.5">
                      <WifiHigh size={13} weight="regular" className="text-[#69DB7C]" />
                      <span>TELEMETRY HUD</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#69DB7C]/15 text-[#69DB7C] font-mono text-[10px] font-medium tabular-nums">
                      {savingsPercentage.toFixed(1)}% SAVED
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-lg font-medium text-[#E3E3E3] tabular-nums">
                      {currentBitrateKbps.toFixed(1)} kbps
                    </span>
                    <span className="text-[11px] text-[#9AA0A6] tabular-nums">
                      • {rttMs}ms • {packetLoss}% loss
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                    <span className="text-[#69DB7C]">
                      Chalk: {chalkDataUsedMb.toFixed(2)} MB
                    </span>
                    <span className="text-[#9AA0A6] line-through">
                      Zoom: {zoomDataUsedMb.toFixed(1)} MB
                    </span>
                  </div>

                  {/* Network Simulator & Video Mode Selectors */}
                  <div className="pt-2 border-t border-[#3C4043] flex items-center gap-2">
                    <select
                      aria-label="Simulate network condition"
                      value={networkProfile}
                      onChange={(e) =>
                        setNetworkProfile(e.target.value as NetworkProfile)
                      }
                      className="bg-[#0F1713] border border-[#3C4043] rounded-xl px-2.5 py-1 font-mono text-[11px] text-[#E3E3E3] focus:outline-none cursor-pointer"
                    >
                      <option value="fast4G">4G Broad</option>
                      <option value="unstable3G">3G Weak</option>
                      <option value="crisis2G">Crisis 2G (14% Loss)</option>
                    </select>

                    <select
                      aria-label="Select secondary video mode"
                      value={videoMode}
                      onChange={(e) => setVideoMode(e.target.value as VideoMode)}
                      className="bg-[#0F1713] border border-[#3C4043] rounded-xl px-2.5 py-1 font-mono text-[11px] text-[#69DB7C] focus:outline-none cursor-pointer"
                    >
                      <option value="off">Cam: Off (18 kbps)</option>
                      <option value="low">Cam: 180p (90 kbps)</option>
                      <option value="standard">Cam: 480p (280 kbps)</option>
                    </select>
                  </div>
                </div>

                {/* Circuit Breaker Toast Alert */}
                {circuitBreakerMessage && (
                  <div className="modal-surface p-3.5 rounded-2xl bg-[#141E19] text-[#E3E3E3] text-xs font-normal shadow-xl flex items-start gap-2.5 border border-[#69DB7C]">
                    <Warning size={18} weight="fill" className="text-[#69DB7C] shrink-0 mt-0.5" />
                    <span className="flex-1 leading-snug">{circuitBreakerMessage}</span>
                    <button
                      type="button"
                      onClick={dismissCircuitBreaker}
                      className="p-0.5 hover:bg-white/10 rounded-full cursor-pointer"
                    >
                      <X size={14} weight="regular" />
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary Camera PiP Window fallback when LiveKit is not active */}
              {!liveKitToken && videoMode !== 'off' && (
                <div className="absolute bottom-20 right-4 w-44 sm:w-52 rounded-2xl overflow-hidden bg-[#141E19] border border-[#3C4043] shadow-2xl z-10">
                  <div className="h-28 bg-[#0F1713] flex flex-col items-center justify-center relative overflow-hidden">
                    {localStream && localStream.getVideoTracks().length > 0 ? (
                      <video
                        ref={videoPiPRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#69DB7C]/15 border border-[#69DB7C]/40 flex items-center justify-center font-mono font-medium text-sm text-[#69DB7C]">
                        {currentUser?.avatarTag || 'CAM'}
                      </div>
                    )}
                    <span className="absolute bottom-1 left-2 px-1.5 py-0.5 rounded bg-black/60 font-mono text-[9px] text-[#E3E3E3]">
                      Your Cam ({videoMode === 'low' ? '180p' : '480p'})
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Floating Chalkboard Toolbar */}
              <div className="absolute bottom-4 inset-x-4 flex justify-center pointer-events-none">
                <div className="pointer-events-auto max-w-full overflow-x-auto px-3 py-2 rounded-full bg-[#141E19]/95 border border-[#3C4043] backdrop-blur-md shadow-2xl flex items-center gap-2">
                  {/* Drawing Tools */}
                  <div className="flex items-center gap-1">
                    {tools.map((t) => {
                      const Icon = t.icon;
                      const isSelected = currentTool === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setCurrentTool(t.id)}
                          className={`btn-google px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-[#69DB7C] text-[#0F1713]'
                              : 'text-[#9AA0A6] hover:text-[#E3E3E3] hover:bg-[#28292A]'
                          }`}
                        >
                          <Icon size={15} weight="regular" />
                          <span className="hidden md:inline">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-5 w-px bg-[#3C4043] shrink-0" />

                  {/* Color Swatches */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {CHALK_PALETTE.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setCurrentColor(hex)}
                        aria-label={`Chalk color ${hex}`}
                        className={`btn-google w-5 h-5 rounded-full border cursor-pointer ${
                          currentColor === hex
                            ? 'scale-110 border-white ring-2 ring-white/40'
                            : 'border-black/40 opacity-80'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>

                  <div className="h-5 w-px bg-[#3C4043] shrink-0" />

                  {/* Width Selector */}
                  <select
                    aria-label="Stroke width"
                    value={currentWidth}
                    onChange={(e) => setCurrentWidth(Number(e.target.value))}
                    className="bg-[#0F1713] border border-[#3C4043] rounded-full px-2.5 py-1 font-mono text-xs text-[#E3E3E3] focus:outline-none cursor-pointer shrink-0"
                  >
                    <option value={2}>2px Fine</option>
                    <option value={4}>4px Medium</option>
                    <option value={8}>8px Bold</option>
                    <option value={14}>14px Marker</option>
                  </select>

                  {/* Undo / Redo / Clear */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={undoStroke}
                      disabled={!canUndo}
                      title="Undo stroke"
                      className="btn-google p-1.5 rounded-full hover:bg-[#28292A] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowCounterClockwise size={16} weight="regular" />
                    </button>
                    <button
                      type="button"
                      onClick={redoStroke}
                      disabled={!canRedo}
                      title="Redo stroke"
                      className="btn-google p-1.5 rounded-full hover:bg-[#28292A] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowClockwise size={16} weight="regular" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      title="Wipe chalkboard"
                      className="btn-google p-1.5 rounded-full text-[#F28B82] hover:bg-[#F28B82]/15 cursor-pointer"
                    >
                      <Trash size={16} weight="regular" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </LiveKitConference>
        </div>

        {/* Slide-Over In-Call Chat Sidebar */}
        {isChatOpen && (
          <aside className="drawer-surface w-full sm:w-80 md:w-96 bg-[#141E19] border-l border-[#3C4043] flex flex-col z-20">
            <div className="p-4 border-b border-[#3C4043] flex items-center justify-between">
              <div>
                <h2 className="font-display font-medium text-sm text-[#E3E3E3]">
                  In-Call Messages
                </h2>
                <p className="text-[11px] text-[#9AA0A6]">
                  Zero-overhead text questions & live notes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="btn-google p-1.5 rounded-full text-[#9AA0A6] hover:text-[#E3E3E3] hover:bg-[#28292A] cursor-pointer"
              >
                <X size={18} weight="regular" />
              </button>
            </div>

            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12 text-[#9AA0A6] text-xs space-y-1">
                  <p>No messages yet in this session.</p>
                  <p className="text-[11px] opacity-75">
                    Ask a question or share a note below.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                      msg.senderRole === 'lecturer'
                        ? 'bg-[#69DB7C]/10 border-[#69DB7C]/30'
                        : 'bg-[#0F1713] border-[#3C4043]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="font-medium text-[#69DB7C]">
                        {msg.senderName}
                        {msg.senderRole === 'lecturer' ? ' (Lecturer)' : ''}
                      </span>
                      <span className="text-[#9AA0A6]">
                        {typeof msg.timestamp === 'number'
                          ? new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : msg.timestamp}
                      </span>
                    </div>
                    <p className="text-[#E3E3E3] leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-[#3C4043] flex items-center gap-2 bg-[#0F1713]"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send a message to everyone..."
                className="flex-1 px-3.5 py-2 rounded-full bg-[#141E19] border border-[#3C4043] text-xs text-[#E3E3E3] focus:outline-none focus:border-[#69DB7C]"
              />
              <button
                type="submit"
                aria-label="Send message"
                className={`btn-google p-2.5 rounded-full cursor-pointer ${
                  isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
              >
                <PaperPlaneTilt size={15} weight="fill" />
              </button>
            </form>
          </aside>
        )}

        {/* Slide-Over Attendees Drawer (Google Meet Feature) */}
        {isAttendeesOpen && (
          <aside className="drawer-surface w-full sm:w-80 md:w-96 bg-[#141E19] border-l border-[#3C4043] flex flex-col z-20">
            <div className="p-4 border-b border-[#3C4043] flex items-center justify-between">
              <div>
                <h2 className="font-display font-medium text-sm text-[#E3E3E3]">
                  People ({participants.length})
                </h2>
                <p className="text-[11px] text-[#9AA0A6]">
                  Connected attendees in {effectiveRoomTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAttendeesOpen(false)}
                className="btn-google p-1.5 rounded-full text-[#9AA0A6] hover:text-[#E3E3E3] hover:bg-[#28292A] cursor-pointer"
              >
                <X size={18} weight="regular" />
              </button>
            </div>

            <div className="p-3 border-b border-[#3C4043]">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full btn-google py-2 px-3 rounded-2xl bg-[#0F1713] border border-[#3C4043] text-xs font-mono text-[#E3E3E3] hover:bg-[#28292A] flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedMeetLink ? (
                  <>
                    <Check size={14} className="text-[#69DB7C]" />
                    <span className="text-[#69DB7C]">Meeting Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Meeting Invite Link</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 p-4 space-y-2.5 overflow-y-auto">
              {participants.map((p) => {
                const isSelf = p.socketId === selfSocketId;
                const isSpeaking = speakingMap[p.socketId];
                return (
                  <div
                    key={p.socketId || p.id}
                    className="p-3 rounded-2xl border border-[#3C4043] bg-[#0F1713] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full font-mono text-xs font-medium flex items-center justify-center shrink-0 ${
                          p.role === 'lecturer'
                            ? 'bg-[#69DB7C] text-[#0F1713] font-bold'
                            : 'bg-[#141E19] border border-[#3C4043] text-[#E3E3E3]'
                        }`}
                      >
                        {p.avatarTag || p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#E3E3E3] truncate flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {isSelf && <span className="text-[10px] text-[#9AA0A6]">(You)</span>}
                        </div>
                        <div className="text-[10px] font-mono text-[#9AA0A6]">
                          {p.role === 'lecturer' ? 'Host / Lecturer' : 'Student'}
                          {isSpeaking && ' • Speaking'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {p.handRaised && (
                        <span className="p-1 rounded-full bg-[#FDD663]/20 text-[#FDD663]" title="Hand Raised">
                          <HandPalm size={14} weight="fill" />
                        </span>
                      )}
                      {isMeLecturer && p.handRaised && !isSelf && (
                        <button
                          type="button"
                          onClick={() => lowerHand(p.socketId)}
                          className="px-2 py-0.5 rounded text-[10px] bg-white/10 hover:bg-white/20 text-[#E3E3E3] cursor-pointer"
                        >
                          Lower
                        </button>
                      )}
                      <div
                        className={`p-1 rounded-full ${
                          p.isMuted
                            ? 'bg-[#D93025]/20 text-[#F28B82]'
                            : 'bg-[#69DB7C]/20 text-[#69DB7C]'
                        }`}
                      >
                        {p.isMuted ? (
                          <MicrophoneSlash size={14} />
                        ) : (
                          <Microphone size={14} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {/* 3. Bottom Call Control Dock */}
      <footer className="h-20 px-4 bg-[#141E19] border-t border-[#3C4043] flex items-center justify-center gap-2 sm:gap-3 shrink-0">
        {/* Mic Toggle Button */}
        <button
          type="button"
          onClick={toggleMic}
          className={`btn-google px-4 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-2 cursor-pointer ${
            isMicMuted
              ? 'bg-[#D93025] text-white'
              : 'bg-[#28292A] text-[#E3E3E3] border border-[#3C4043] hover:bg-[#3C4043]'
          }`}
        >
          {isMicMuted ? (
            <MicrophoneSlash size={18} weight="regular" />
          ) : (
            <Microphone size={18} weight="regular" />
          )}
          <span className="hidden sm:inline">{isMicMuted ? 'Unmute' : 'Mic On'}</span>
        </button>

        {/* Raise Hand Button */}
        <button
          type="button"
          onClick={toggleHandRaised}
          className={`btn-google px-4 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-2 border cursor-pointer ${
            isHandRaised
              ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C]'
              : 'bg-[#28292A] text-[#E3E3E3] border-[#3C4043] hover:bg-[#3C4043]'
          }`}
        >
          <HandPalm size={18} weight="regular" />
          <span className="hidden sm:inline">
            {isHandRaised ? 'Hand Raised' : 'Raise Hand'}
          </span>
        </button>

        {/* Stage Switcher */}
        <button
          type="button"
          onClick={() =>
            setStageMode((prev) => (prev === 'whiteboard' ? 'speakers' : 'whiteboard'))
          }
          className="btn-google px-4 py-2.5 rounded-full bg-[#28292A] border border-[#3C4043] text-[#E3E3E3] font-medium text-xs inline-flex items-center gap-2 hover:bg-[#3C4043] cursor-pointer"
        >
          {stageMode === 'whiteboard' ? (
            <>
              <Users size={18} weight="regular" />
              <span className="hidden sm:inline">Voice Grid ({participants.length})</span>
            </>
          ) : (
            <>
              <Chalkboard size={18} weight="regular" />
              <span className="hidden sm:inline">Chalkboard</span>
            </>
          )}
        </button>

        {/* Video Mode Toggle */}
        <button
          type="button"
          onClick={() => setVideoMode(videoMode === 'off' ? 'low' : 'off')}
          className={`btn-google px-4 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-2 cursor-pointer ${
            videoMode !== 'off'
              ? 'bg-[#69DB7C]/20 border-[#69DB7C] text-[#69DB7C]'
              : 'bg-[#28292A] border-[#3C4043] text-[#E3E3E3] hover:bg-[#3C4043]'
          }`}
        >
          {videoMode === 'off' ? (
            <VideoCameraSlash size={18} weight="regular" />
          ) : (
            <VideoCamera size={18} weight="regular" />
          )}
          <span className="hidden sm:inline">
            {videoMode === 'off' ? 'Cam Off' : 'Cam 180p'}
          </span>
        </button>

        {/* People / Attendees Drawer Toggle */}
        <button
          type="button"
          onClick={() => {
            setIsAttendeesOpen((prev) => !prev);
            setIsChatOpen(false);
          }}
          className={`btn-google px-4 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-2 cursor-pointer ${
            isAttendeesOpen
              ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C]'
              : 'bg-[#28292A] border-[#3C4043] text-[#E3E3E3] hover:bg-[#3C4043]'
          }`}
        >
          <Users size={18} weight="regular" />
          <span className="hidden sm:inline">People ({participants.length})</span>
        </button>

        {/* Chat Drawer Toggle */}
        <button
          type="button"
          onClick={() => {
            setIsChatOpen((prev) => !prev);
            setIsAttendeesOpen(false);
          }}
          className={`btn-google px-4 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-2 cursor-pointer ${
            isChatOpen
              ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C]'
              : 'bg-[#28292A] border-[#3C4043] text-[#E3E3E3] hover:bg-[#3C4043]'
          }`}
        >
          <ChatCircleText size={18} weight="regular" />
          <span className="hidden sm:inline">Chat ({chatMessages.length})</span>
        </button>

        {/* Leave Call Button */}
        <button
          type="button"
          onClick={() => {
            const courseTarget = activeRoomInfo.courseId
              ? `/hub/course/${activeRoomInfo.courseId}`
              : '/hub';
            navigate(isAuthenticated ? courseTarget : '/');
          }}
          className="btn-google px-5 py-2.5 rounded-full bg-[#D93025] text-white font-medium text-xs inline-flex items-center gap-2 hover:bg-[#B3261E] cursor-pointer"
        >
          <PhoneDisconnect size={18} weight="fill" />
          <span>{isAuthenticated ? 'Leave' : 'Exit Trial'}</span>
        </button>
      </footer>

      {/* Catch Me Up Modal */}
      <CatchUpModal
        isOpen={isCatchUpOpen}
        onClose={() => setIsCatchUpOpen(false)}
        roomCode={roomCode || activeRoomCode}
      />

      {/* Wipe Chalkboard Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="modal-surface w-full max-w-sm rounded-3xl bg-[#141E19] border border-[#3C4043] p-6 space-y-4 text-[#E3E3E3] shadow-2xl">
            <h3 className="font-display text-lg font-medium">Clear the Chalkboard?</h3>
            <p className="text-xs text-[#9AA0A6] leading-relaxed">
              This will clear all active vector strokes on the board for everyone in the room.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="btn-google px-4 py-2 rounded-full text-xs font-medium text-[#9AA0A6] hover:text-[#E3E3E3] cursor-pointer"
              >
                Keep Drawing
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCanvas();
                  setShowClearConfirm(false);
                }}
                className="btn-google px-5 py-2 rounded-full bg-[#D93025] text-white font-medium text-xs cursor-pointer"
              >
                Erase All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
