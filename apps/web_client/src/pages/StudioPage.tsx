import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Microphone,
  MicrophoneSlash,
  HandPalm,
  ChatCircleText,
  Users,
  Chalkboard,
  ChalkboardTeacher,
  Lock,
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
  ExportIcon,
  Desktop,
  Copy,
  Check,
  Plus,
  Info,
  Shapes,
  GearSixIcon,
  PushPin,
  DotsThreeVertical,
  ThumbsUp,
  DownloadSimple,
  Waveform,
  Record,
  ChartBar,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { VectorCanvas } from '../components/VectorCanvas';
import { CatchUpModal } from '../components/CatchUpModal';
import { LiveKitConference } from '../components/LiveKitConference';
import { fetchLiveKitToken } from '../lib/livekit';
import { StudioParticipant, NetworkProfile, StrokeTool, VideoMode } from '../types/chalk';

const CHALK_PALETTE = [
  '#69DB7C',
  '#E3E3E3',
  '#81C995',
  '#FDD663',
  '#F28B82',
  '#C58AF9',
];

export const StudioPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    isDark,
    isAuthenticated,
    currentUser,
    guestName,
    guestId,
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
    lowerAllHands,
    muteAllParticipants,
    localStream,
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
    addSlide,
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
    currentBitrateKbps,
    rttMs,
    packetLoss,
    chalkDataUsedMb,
    zoomDataUsedMb,
    savingsPercentage,
    stageLayout,
    setStageLayout,
    broadcastStageLayout,
    grantParticipantPermission,
    floatingReactions,
    sendReaction,
    isCaptionsOn,
    toggleCaptions,
    activeCaptions,
    polls,
    createPoll,
    votePoll,
    closePoll,
    questions,
    askQuestion,
    upvoteQuestion,
    markQuestionAnswered,
    breakoutSession,
    createBreakouts,
    broadcastBreakout,
    closeBreakouts,
    attendanceRecords,
    exportAttendanceReport,
    hostSettings,
    updateHostSettings,
  } = useApp();

  const code = roomCode || activeRoomCode || 'csc401-algo';

  useEffect(() => {
    if (code && code !== activeRoomCode) {
      setActiveRoomCode(code);
    }
  }, [code, activeRoomCode, setActiveRoomCode]);

  // Initial mute preference
  useEffect(() => {
    if (searchParams.get('muted') === '0' && isMicMuted) {
      toggleMic();
    }
  }, []);

  // Panel State: which side panel is currently open
  const [activeSidePanel, setActiveSidePanel] = useState<
    'none' | 'details' | 'people' | 'chat' | 'activities' | 'host_controls'
  >('none');

  // Activities Sub-view: 'list' | 'polls' | 'qa' | 'breakouts' | 'attendance'
  const [activityView, setActivityView] = useState<
    'list' | 'polls' | 'qa' | 'breakouts' | 'attendance'
  >('list');

  // Popups & Modals
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [isCatchUpOpen, setIsCatchUpOpen] = useState(false);
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Inputs
  const [chatInput, setChatInput] = useState('');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [newPollQ, setNewPollQ] = useState('');
  const [newPollOptions, setNewPollOptions] = useState<string[]>(['', '']);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [breakoutRoomsCount, setBreakoutRoomsCount] = useState(2);
  const [breakoutDurationMins, setBreakoutDurationMins] = useState(15);
  const [breakoutMsg, setBreakoutMsg] = useState('');

  // LiveKit WebRTC state
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitUrl, setLiveKitUrl] = useState<string>('ws://127.0.0.1:7880');
  const [liveKitConnected, setLiveKitConnected] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const displayStreamRef = useRef<MediaStream | null>(null);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (displayStreamRef.current) {
        displayStreamRef.current.getTracks().forEach((t) => t.stop());
        displayStreamRef.current = null;
      }
      setIsScreenSharing(false);
    } else {
      try {
        if (!liveKitToken) {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          displayStreamRef.current = stream;
          stream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            displayStreamRef.current = null;
          };
        }
        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share canceled or denied:', err);
        setIsScreenSharing(false);
      }
    }
  };

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const videoPiPRef = useRef<HTMLVideoElement | null>(null);

  // Auto-hide bottom controls when mouse leaves the bottom region
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track whether lecturer has currently opened chalkboard for the room
  const [lecturerStageLayout, setLecturerStageLayout] = useState<'whiteboard' | 'tiled'>(
    stageLayout === 'whiteboard' ? 'whiteboard' : 'tiled'
  );

  useEffect(() => {
    if (stageLayout === 'whiteboard') {
      setLecturerStageLayout('whiteboard');
    }
  }, [stageLayout]);

  useEffect(() => {
    // Show initially for 3 seconds on load
    controlsTimeoutRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 3000);

    const handleMouseMove = (e: MouseEvent) => {
      // Reveal when mouse is within 130px from bottom of viewport
      const isNearBottom = window.innerHeight - e.clientY <= 130;
      setIsControlsVisible(isNearBottom);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Ensure current user is in participants list so audio conferencing UI is never blank
  const displayParticipants: StudioParticipant[] =
    participants.length > 0
      ? participants.map((p) =>
          p.socketId === selfSocketId || (currentUser?.id && p.id === currentUser.id)
            ? { ...p, handRaised: isHandRaised }
            : p
        )
      : [
        {
          id: currentUser?.id || 'me',
          socketId: selfSocketId || 'local',
          name: currentUser?.name || guestName || 'You',
          role: currentUser?.role || 'student',
          avatarTag: currentUser?.avatarTag || 'ME',
          isGuest: !currentUser,
          videoMode: videoMode,
          isMuted: isMicMuted,
          handRaised: isHandRaised,
          joinedAt: Date.now(),
        },
      ];

  // Recording timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // LiveKit Token
  useEffect(() => {
    let active = true;
    const fetchToken = async () => {
      try {
        const res = await fetchLiveKitToken({
          roomName: code,
          identity: currentUser?.id || guestId,
          name: currentUser?.name || guestName || 'Campus User',
          role: currentUser?.role || 'student',
          avatarTag: currentUser?.avatarTag,
          socketId: selfSocketId,
        });
        if (active && res?.token) {
          setLiveKitToken(res.token);
          setLiveKitUrl(res.url);
          setLiveKitConnected(true);
        }
      } catch (err) {
        console.warn('[LiveKit Studio] Token init fallback:', err);
      }
    };
    fetchToken();
    return () => {
      active = false;
    };
  }, [code, currentUser?.id, currentUser?.name, guestName, guestId, selfSocketId]);

  // PiP local video
  useEffect(() => {
    if (videoPiPRef.current && localStream) {
      videoPiPRef.current.srcObject = localStream;
    }
  }, [localStream, videoMode]);

  // Scroll chat
  useEffect(() => {
    if (activeSidePanel === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeSidePanel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        toggleMic();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setVideoMode(videoMode === 'off' ? 'standard' : 'off');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMic, videoMode, setVideoMode]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (!hostSettings.sendChatAllowed && currentUser?.role !== 'lecturer') return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreatePollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPollQ.trim()) return;
    const validOptions = newPollOptions.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) return;
    createPoll(newPollQ.trim(), validOptions, true);
    setNewPollQ('');
    setNewPollOptions(['', '']);
    setActivityView('polls');
  };

  const handleAskQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    askQuestion(newQuestionText.trim());
    setNewQuestionText('');
  };

  const handleCreateBreakoutsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBreakouts(breakoutRoomsCount, breakoutDurationMins);
    setActivityView('breakouts');
  };

  const handleLeaveCall = () => {
    navigate(`/studio/${encodeURIComponent(code)}/ended`);
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

  const activeLecturer = participants.find((p) => p.role === 'lecturer');
  const activeSpeaker =
    participants.find((p) => speakingMap[p.socketId]) || activeLecturer || participants[0];

  const effectiveTitle = activeRoomInfo.title || `Room ${code}`;
  const isMeLecturer =
    currentUser?.role === 'lecturer' ||
    (Boolean(currentUser?.name) &&
      activeRoomInfo.lecturerName?.toLowerCase() === currentUser?.name?.toLowerCase()) ||
    Boolean(
      displayParticipants.find(
        (p) =>
          (p.socketId === selfSocketId || p.id === currentUser?.id) &&
          p.role === 'lecturer'
      )
    ) ||
    (displayParticipants.length > 0 &&
      displayParticipants[0]?.socketId === selfSocketId &&
      !displayParticipants.some((p) => p.role === 'lecturer'));
  const myParticipant = displayParticipants.find(
    (p) => p.socketId === selfSocketId || p.id === currentUser?.id
  );
  const hasChalkboardAccess =
    isMeLecturer || hostSettings.useChalkboardAllowed || Boolean(myParticipant?.canDraw);
  const hasMicAccess =
    isMeLecturer || hostSettings.turnMicAllowed || Boolean(myParticipant?.canSpeak);

  // Filtered attendees for people panel
  const filteredParticipants = displayParticipants.filter((p) =>
    p.name.toLowerCase().includes(attendeeSearch.toLowerCase())
  );
  const raisedHandsQueue = displayParticipants.filter((p) => p.handRaised);

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden flex flex-col select-none ${isDark ? 'bg-[#121614] text-[#E3E3E3]' : 'bg-[#1E2320] text-white'
        }`}
    >
      {/* Floating Animated Reaction Bubbles */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map((rx) => (
          <div
            key={rx.id}
            className="absolute bottom-24 flex flex-col items-center animate-bounce duration-1000"
            style={{ left: `${rx.x}%` }}
          >
            <span className="text-4xl filter drop-shadow-md">{rx.emoji}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/70 text-white/90 backdrop-blur-xs mt-1">
              {rx.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* TOP HEADER BAR */}
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-white/10 shrink-0 z-30 bg-black/40 backdrop-blur-md">
        {/* Left: Room Title & Live Recording Pill */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/hub"
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 shrink-0"
            title="Leave and return to classroom"
          >
            <CaretLeft size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-medium truncate text-white">{effectiveTitle}</h1>
            <div className="text-[11px] font-mono opacity-60 truncate">
              {activeRoomInfo.courseCode ? `${activeRoomInfo.courseCode} • ` : ''}
              {code}
            </div>
          </div>

          {/* Recording Badge */}
          {isRecording && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/20 text-red-400 text-xs font-mono font-medium border border-red-500/30 animate-pulse ml-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>
                REC {Math.floor(recordingSeconds / 60)}:
                {String(recordingSeconds % 60).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>

        {/* Center: Chalk Anti-Lag QoS & Bandwidth Meter HUD */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-mono text-[11px]">
          <span className="flex items-center gap-1.5 text-[#69DB7C] font-medium">
            <WifiHigh size={14} />
            <span>Chalk</span>
          </span>
          <span className="opacity-40">•</span>
          <span className="text-[#69DB7C] font-semibold">{savingsPercentage.toFixed(1)}% saved</span>
        </div>

        {/* Right: "Catch Me Up!" Pill + Panel Toggle Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsCatchUpOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#69DB7C]/15 text-[#69DB7C] hover:bg-[#69DB7C]/25 border border-[#69DB7C]/30 cursor-pointer"
          >
            <Sparkle size={14} />
            <span>Catch Me Up!</span>
          </button>

          {/* Details Button */}
          <button
            onClick={() =>
              setActiveSidePanel(activeSidePanel === 'details' ? 'none' : 'details')
            }
            className={`p-2 rounded-full hover:bg-white/10 ${activeSidePanel === 'details' ? 'bg-white/20 text-[#69DB7C]' : 'text-white/80'
              }`}
            title="Studio details"
          >
            <Info size={19} />
          </button>

          {/* People Button */}
          <button
            onClick={() =>
              setActiveSidePanel(activeSidePanel === 'people' ? 'none' : 'people')
            }
            className={`p-2 cursor-pointer rounded-full hover:bg-white/10 relative ${activeSidePanel === 'people' ? 'bg-white/20 text-[#69DB7C]' : 'text-white/80'
              }`}
            title="People & Host Controls"
          >
            <Users size={19} />
            {raisedHandsQueue.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          {/* Chat Button */}
          <button
            onClick={() =>
              setActiveSidePanel(activeSidePanel === 'chat' ? 'none' : 'chat')
            }
            className={`p-2 cursor-pointer rounded-full hover:bg-white/10 ${activeSidePanel === 'chat' ? 'bg-white/20 text-[#69DB7C]' : 'text-white/80'
              }`}
            title="In-call messages"
          >
            <ChatCircleText size={19} />
          </button>

          {/* Activities Button */}
          <button
            onClick={() =>
              setActiveSidePanel(activeSidePanel === 'activities' ? 'none' : 'activities')
            }
            className={`p-2 rounded-full hover:bg-white/10 ${activeSidePanel === 'activities' ? 'bg-white/20 text-[#69DB7C]' : 'text-white/80'
              }`}
            title="Activities (Polls, Q&A, Breakouts)"
          >
            <Shapes size={19} />
          </button>

          {/* Host Controls Button */}
          {isMeLecturer && (
            <button
              onClick={() =>
                setActiveSidePanel(
                  activeSidePanel === 'host_controls' ? 'none' : 'host_controls'
                )
              }
              className={`p-2 cursor-pointer rounded-full hover:bg-white/10 ${activeSidePanel === 'host_controls'
                ? 'bg-white/20 text-[#69DB7C]'
                : 'text-white/80'
                }`}
              title="Host Controls"
            >
              <GearSixIcon size={19} />
            </button>
          )}
        </div>
      </header>

      {/* MAIN MEETING STAGE & SIDE PANELS */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Stage Content */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {liveKitToken ? (
            <LiveKitConference
              serverUrl={liveKitUrl}
              token={liveKitToken}
              roomCode={code}
              isMicMuted={isMicMuted}
              videoMode={videoMode}
              onToggleMic={toggleMic}
              onSetVideoMode={setVideoMode}
              isScreenSharing={isScreenSharing}
              onScreenShareChange={setIsScreenSharing}
              socketParticipants={displayParticipants}
              selfSocketId={selfSocketId}
              isMeLecturer={isMeLecturer}
              onLowerHand={lowerHand}
              onGrantPermission={grantParticipantPermission}
              stageMode={stageLayout === 'whiteboard' ? 'whiteboard' : 'speakers'}
              isHandRaised={isHandRaised}
              onStageModeChange={(mode) => {
                const targetLayout = mode === 'whiteboard' ? 'whiteboard' : 'tiled';
                setStageLayout(targetLayout);
                setLecturerStageLayout(targetLayout);
              }}
            >
              {/* STAGE: CHALKBOARD VIEW (Rendered inside LiveKitConference when in whiteboard mode) */}
              <div className="flex-1 relative bg-[#0B0F0D] w-full h-full">
                <VectorCanvas
                  strokes={strokes}
                  currentTool={currentTool}
                  currentColor={currentColor}
                  currentWidth={currentWidth}
                  activeSlideIndex={activeSlideIndex}
                  interactive={hasChalkboardAccess}
                  laser={laser}
                  onCommitStroke={commitStroke}
                  onEmitLaser={emitLaser}
                />

                {/* Multi-Slide Navigation Deck Controller */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 p-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-xs font-mono text-white">
                  <button
                    onClick={prevSlide}
                    disabled={activeSlideIndex === 0 || !hasChalkboardAccess}
                    title="Previous slide"
                    className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                  >
                    <CaretLeft size={16} />
                  </button>
                  <span className="px-1">
                    Slide {activeSlideIndex + 1} / {totalSlides}
                  </span>
                  <button
                    onClick={nextSlide}
                    disabled={activeSlideIndex >= totalSlides - 1 || !hasChalkboardAccess}
                    title="Next slide"
                    className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                  >
                    <CaretRight size={16} />
                  </button>
                  {hasChalkboardAccess && (
                    <>
                      <div className="w-px h-3.5 bg-white/20" />
                      <button
                        onClick={addSlide}
                        title="Add slide"
                        className="p-1 rounded-full hover:bg-white/20 text-[#69DB7C] hover:text-white cursor-pointer transition-colors flex items-center justify-center"
                      >
                        <Plus size={16} weight="bold" />
                      </button>
                    </>
                  )}
                </div>

                {/* Chalkboard Floating Drawing Toolbar (or View-Only indicator) */}
                {hasChalkboardAccess ? (
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 p-2 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 text-white shadow-xl">
                    {tools.map((t) => {
                      const Icon = t.icon;
                      const isActive = currentTool === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setCurrentTool(t.id)}
                          className={`p-2.5 rounded-xl transition-all cursor-pointer ${isActive
                            ? 'bg-[#69DB7C] text-black shadow-md'
                            : 'hover:bg-white/10 text-white/80'
                            }`}
                          title={t.label}
                        >
                          <Icon size={18} />
                        </button>
                      );
                    })}

                    <div className="w-full h-px bg-white/15 my-1" />

                    {/* Color Palette */}
                    <div className="flex flex-col gap-1.5 items-center">
                      {CHALK_PALETTE.map((hex) => (
                        <button
                          key={hex}
                          onClick={() => setCurrentColor(hex)}
                          className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${currentColor === hex ? 'scale-125 ring-2 ring-white' : 'opacity-80'
                            }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>

                    <div className="w-full h-px bg-white/15 my-1" />

                    {/* Undo / Redo / Clear */}
                    <button
                      onClick={undoStroke}
                      disabled={!canUndo}
                      title="Undo stroke"
                      className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowCounterClockwise size={16} />
                    </button>
                    <button
                      onClick={redoStroke}
                      disabled={!canRedo}
                      title="Redo stroke"
                      className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowClockwise size={16} />
                    </button>
                    <button
                      onClick={clearCanvas}
                      title="Clear blackboard"
                      className="p-2 rounded-xl hover:bg-red-500/30 text-red-400 cursor-pointer"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 text-white/80 text-xs font-mono shadow-xl">
                    <Lock size={15} className="text-amber-400 shrink-0" />
                    <span>View Only • Lecturer controls board</span>
                  </div>
                )}
              </div>
            </LiveKitConference>
          ) : stageLayout === 'whiteboard' ? (
            /* Fallback Native Chalkboard View when LiveKit is not active */
            <div className="flex-1 relative bg-[#0B0F0D] w-full h-full">
              <VectorCanvas
                strokes={strokes}
                currentTool={currentTool}
                currentColor={currentColor}
                currentWidth={currentWidth}
                activeSlideIndex={activeSlideIndex}
                interactive={hasChalkboardAccess}
                laser={laser}
                onCommitStroke={commitStroke}
                onEmitLaser={emitLaser}
              />

              {/* Multi-Slide Navigation Deck Controller */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 p-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-xs font-mono text-white">
                <button
                  onClick={prevSlide}
                  disabled={activeSlideIndex === 0 || !hasChalkboardAccess}
                  title="Previous slide"
                  className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                >
                  <CaretLeft size={16} />
                </button>
                <span className="px-1">
                  Slide {activeSlideIndex + 1} / {totalSlides}
                </span>
                <button
                  onClick={nextSlide}
                  disabled={activeSlideIndex >= totalSlides - 1 || !hasChalkboardAccess}
                  title="Next slide"
                  className="p-1 rounded-full hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                >
                  <CaretRight size={16} />
                </button>
                {hasChalkboardAccess && (
                  <>
                    <div className="w-px h-3.5 bg-white/20" />
                    <button
                      onClick={addSlide}
                      title="Add slide"
                      className="p-1 rounded-full hover:bg-white/20 text-[#69DB7C] hover:text-white cursor-pointer transition-colors flex items-center justify-center"
                    >
                      <Plus size={16} weight="bold" />
                    </button>
                  </>
                )}
              </div>

              {/* Chalkboard Floating Drawing Toolbar (or View-Only indicator) */}
              {hasChalkboardAccess ? (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 p-2 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 text-white shadow-xl">
                  {tools.map((t) => {
                    const Icon = t.icon;
                    const isActive = currentTool === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setCurrentTool(t.id)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer ${isActive
                          ? 'bg-[#69DB7C] text-black shadow-md'
                          : 'hover:bg-white/10 text-white/80'
                          }`}
                        title={t.label}
                      >
                        <Icon size={18} />
                      </button>
                    );
                  })}

                  <div className="w-full h-px bg-white/15 my-1" />

                  {/* Color Palette */}
                  <div className="flex flex-col gap-1.5 items-center">
                    {CHALK_PALETTE.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setCurrentColor(hex)}
                        className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${currentColor === hex ? 'scale-125 ring-2 ring-white' : 'opacity-80'
                          }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>

                  <div className="w-full h-px bg-white/15 my-1" />

                  {/* Undo / Redo / Clear */}
                  <button
                    onClick={undoStroke}
                    disabled={!canUndo}
                    title="Undo stroke"
                    className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowCounterClockwise size={16} />
                  </button>
                  <button
                    onClick={redoStroke}
                    disabled={!canRedo}
                    title="Redo stroke"
                    className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowClockwise size={16} />
                  </button>
                  <button
                    onClick={clearCanvas}
                    title="Clear blackboard"
                    className="p-2 rounded-xl hover:bg-red-500/30 text-red-400 cursor-pointer"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ) : (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 text-white/80 text-xs font-mono shadow-xl">
                  <Lock size={15} className="text-amber-400 shrink-0" />
                  <span>View Only • Lecturer controls board</span>
                </div>
              )}
            </div>
          ) : (
            /* Fallback Native Grid Layout for up to 49 participants */
            <div className="flex-1 p-4 sm:p-6 flex flex-col justify-center overflow-y-auto space-y-4">
              {isScreenSharing && displayStreamRef.current && (
                <div className="relative rounded-3xl overflow-hidden bg-black border border-[#3C4043] h-72 sm:h-96 flex items-center justify-center">
                  <video
                    autoPlay
                    playsInline
                    muted
                    ref={(el) => {
                      if (el && displayStreamRef.current && el.srcObject !== displayStreamRef.current) {
                        el.srcObject = displayStreamRef.current;
                      }
                    }}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 font-mono text-xs text-[#E3E3E3] flex items-center gap-2">
                    <Desktop size={14} weight="fill" className="text-blue-400" />
                    <span>You are presenting screen</span>
                  </div>
                </div>
              )}
              <div
                className={`grid gap-4 w-full h-full max-h-[80vh] ${stageLayout === 'spotlight'
                  ? 'grid-cols-1'
                  : displayParticipants.length <= 1
                    ? 'grid-cols-1'
                    : displayParticipants.length <= 4
                      ? 'grid-cols-2'
                      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                  }`}
              >
                {displayParticipants.map((p) => {
                  const isSpeaking = speakingMap[p.socketId];
                  const isPinned = pinnedParticipantId === p.id;

                  return (
                    <div
                      key={p.socketId || p.id}
                      className={`relative rounded-3xl bg-[#18201B] border overflow-hidden flex flex-col items-center justify-center transition-all ${isSpeaking
                        ? 'border-[#69DB7C] shadow-[0_0_20px_rgba(105,219,124,0.3)]'
                        : 'border-white/10'
                        }`}
                    >
                      {/* Avatar */}
                      <div className="w-20 h-20 rounded-full bg-white/10 text-white flex items-center justify-center font-mono text-2xl font-semibold shadow-inner">
                        {p.avatarTag}
                      </div>

                      {/* Name & Role Pill */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-xs font-medium text-white border border-white/10">
                        <span>{p.name}</span>
                        {p.role === 'lecturer' && (
                          <span className="text-[10px] font-mono text-[#69DB7C] uppercase font-bold">
                            Host
                          </span>
                        )}
                        {p.isMuted && <MicrophoneSlash size={14} className="text-red-400" />}
                      </div>

                      {/* Hand Raised Queue Badge */}
                      {p.handRaised && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-black text-xs font-bold font-mono shadow-md animate-bounce">
                          <HandPalm size={14} weight="fill" />
                          <span>#1 in queue</span>
                        </div>
                      )}

                      {/* Lecturer Control Action Pills */}
                      {isMeLecturer && p.id !== currentUser?.id && (
                        <div className="absolute top-3 left-3 flex items-center gap-1 z-20">
                          <button
                            type="button"
                            onClick={() =>
                              grantParticipantPermission(p.socketId, {
                                canDraw: !p.canDraw,
                              })
                            }
                            className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${p.canDraw
                              ? 'bg-[#69DB7C] text-[#0F1713]'
                              : 'bg-black/50 hover:bg-black/80 text-[#9AA0A6] hover:text-[#E3E3E3]'
                              }`}
                            title={p.canDraw ? 'Revoke Chalkboard' : 'Grant Chalkboard'}
                          >
                            <ChalkboardTeacher size={13} weight={p.canDraw ? 'fill' : 'regular'} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              grantParticipantPermission(p.socketId, {
                                canSpeak: !p.canSpeak,
                              })
                            }
                            className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${p.canSpeak
                              ? 'bg-[#69DB7C] text-[#0F1713]'
                              : 'bg-black/50 hover:bg-black/80 text-[#9AA0A6] hover:text-[#E3E3E3]'
                              }`}
                            title={p.canSpeak ? 'Revoke Mic' : 'Grant Mic'}
                          >
                            <Microphone size={13} weight={p.canSpeak ? 'fill' : 'regular'} />
                          </button>
                        </div>
                      )}

                      {/* Pin Button */}
                      <button
                        onClick={() =>
                          setPinnedParticipantId(isPinned ? null : p.id)
                        }
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/80 text-white opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
                      >
                        <PushPin size={14} weight={isPinned ? 'fill' : 'regular'} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live Closed Captions Banner */}
          {isCaptionsOn && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-2xl w-full px-6 py-2.5 rounded-2xl bg-black/80 text-white text-xs font-mono backdrop-blur-md border border-white/15 z-30 space-y-1">
              {activeCaptions.length > 0 ? (
                activeCaptions.map((cap, i) => (
                  <div key={i} className="truncate">
                    <span className="text-[#69DB7C] font-semibold">{cap.speaker}: </span>
                    <span>{cap.text}</span>
                  </div>
                ))
              ) : (
                <div className="opacity-60 text-center">
                  Captions active (English) • Transcribing speech...
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* RIGHT DOCKABLE SIDE PANELS                               */}
        {/* ======================================================== */}
        {activeSidePanel !== 'none' && (
          <aside
            className={`w-80 sm:w-96 border-l flex flex-col shrink-0 z-30 transition-all ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0] text-[#202124]'
              }`}
          >
            {/* Panel Header */}
            <div className="h-14 px-5 flex items-center justify-between border-b border-black/10 dark:border-white/10 shrink-0">
              <h2 className="font-medium text-sm capitalize">
                {activeSidePanel === 'details'
                  ? 'Studio details'
                  : activeSidePanel === 'people'
                    ? `People (${participants.length})`
                    : activeSidePanel === 'chat'
                      ? 'In-call messages'
                      : activeSidePanel === 'activities'
                        ? 'Activities'
                        : 'Host controls'}
              </h2>
              <button
                onClick={() => setActiveSidePanel('none')}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* PANEL 1: MEETING DETAILS */}
            {activeSidePanel === 'details' && (
              <div className="flex-1 p-5 space-y-6 overflow-y-auto text-xs">
                <div className="space-y-2">
                  <div className="font-medium text-sm">Joining info</div>
                  <p className="opacity-70 font-mono text-[11px] break-all select-all">
                    {window.location.href}
                  </p>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 text-[#059669] dark:text-[#69DB7C] hover:underline font-medium cursor-pointer"
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copied link!' : 'Copy joining info'}</span>
                  </button>
                </div>

                <div className="space-y-2 pt-4 border-t border-black/10 dark:border-white/10">
                  <div className="font-medium text-sm">Dial-in Information</div>
                  <p className="opacity-70">
                    Dial-in PIN: <strong className="font-mono">842 910#</strong>
                  </p>
                  <p className="opacity-60 text-[11px]">
                    24kbps Low-bandwidth voice conference active.
                  </p>
                </div>
              </div>
            )}

            {/* PANEL 2: PEOPLE */}
            {activeSidePanel === 'people' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search & Host Controls */}
                <div className="p-3 border-b border-black/10 dark:border-white/10 space-y-2 shrink-0">
                  <input
                    type="text"
                    value={attendeeSearch}
                    onChange={(e) => setAttendeeSearch(e.target.value)}
                    placeholder="Search for people..."
                    className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                      }`}
                  />

                  {isMeLecturer && (
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <button
                        onClick={muteAllParticipants}
                        className="px-3 py-1 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 cursor-pointer"
                      >
                        Mute all
                      </button>
                      {raisedHandsQueue.length > 0 && (
                        <button
                          onClick={lowerAllHands}
                          className="px-3 py-1 rounded-full border border-amber-500/30 text-amber-500 hover:bg-amber-50 cursor-pointer"
                        >
                          Lower all hands ({raisedHandsQueue.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Raised Hands Section */}
                {raisedHandsQueue.length > 0 && (
                  <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 shrink-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                      Hands raised ({raisedHandsQueue.length})
                    </div>
                    <div className="space-y-1.5">
                      {raisedHandsQueue.map((p) => (
                        <div
                          key={p.socketId}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <span className="font-medium truncate max-w-[120px]">{p.name}</span>
                          {isMeLecturer && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  grantParticipantPermission(p.socketId, {
                                    canSpeak: !p.canSpeak,
                                  })
                                }
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono cursor-pointer transition-colors ${p.canSpeak
                                  ? 'bg-[#69DB7C]/20 text-[#69DB7C] border border-[#69DB7C]/40'
                                  : 'bg-black/10 dark:bg-white/10 hover:bg-[#69DB7C]/15 text-white/80'
                                  }`}
                              >
                                {p.canSpeak ? 'Revoke Mic' : 'Allow Mic'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  grantParticipantPermission(p.socketId, {
                                    canDraw: !p.canDraw,
                                  })
                                }
                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono cursor-pointer transition-colors ${p.canDraw
                                  ? 'bg-[#69DB7C]/20 text-[#69DB7C] border border-[#69DB7C]/40'
                                  : 'bg-black/10 dark:bg-white/10 hover:bg-[#69DB7C]/15 text-white/80'
                                  }`}
                              >
                                {p.canDraw ? 'Revoke Board' : 'Allow Board'}
                              </button>
                              <button
                                type="button"
                                onClick={() => lowerHand(p.socketId)}
                                className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                              >
                                Lower
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attendee Roster */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                  {filteredParticipants.map((p) => (
                    <div
                      key={p.socketId}
                      className="p-2 rounded-2xl flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-mono font-medium text-[11px]">
                          {p.avatarTag}
                        </div>
                        <div>
                          <div className="font-medium">{p.name}</div>
                          {p.role === 'lecturer' && (
                            <span className="text-[10px] font-mono text-[#059669] dark:text-[#69DB7C] uppercase font-bold">
                              Host
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isMeLecturer && p.role !== 'lecturer' && (
                          <div className="flex items-center gap-1 mr-1">
                            {/* Toggle Chalkboard Access */}
                            <button
                              type="button"
                              onClick={() =>
                                grantParticipantPermission(p.socketId, {
                                  canDraw: !p.canDraw,
                                })
                              }
                              className={`p-1 rounded-lg border text-xs cursor-pointer transition-colors ${p.canDraw
                                ? 'bg-[#69DB7C]/20 border-[#69DB7C]/40 text-[#69DB7C]'
                                : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/10'
                                }`}
                              title={
                                p.canDraw
                                  ? 'Revoke Chalkboard Access'
                                  : 'Grant Chalkboard Access'
                              }
                            >
                              <ChalkboardTeacher size={15} weight={p.canDraw ? 'fill' : 'regular'} />
                            </button>

                            {/* Toggle Mic Access */}
                            <button
                              type="button"
                              onClick={() =>
                                grantParticipantPermission(p.socketId, {
                                  canSpeak: !p.canSpeak,
                                })
                              }
                              className={`p-1 rounded-lg border text-xs cursor-pointer transition-colors ${p.canSpeak
                                ? 'bg-[#69DB7C]/20 border-[#69DB7C]/40 text-[#69DB7C]'
                                : 'border-transparent text-white/40 hover:text-white/80 hover:bg-white/10'
                                }`}
                              title={
                                p.canSpeak
                                  ? 'Revoke Microphone Access'
                                  : 'Grant Microphone Access'
                              }
                            >
                              <Microphone size={15} weight={p.canSpeak ? 'fill' : 'regular'} />
                            </button>
                          </div>
                        )}

                        {p.isMuted ? (
                          <MicrophoneSlash size={14} className="text-red-400" />
                        ) : (
                          <Microphone size={14} className="text-emerald-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PANEL 3: CHAT */}
            {activeSidePanel === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Host Control Toggle on Chat */}
                {isMeLecturer && (
                  <div className="p-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between text-xs shrink-0">
                    <span>Let participants send messages</span>
                    <input
                      type="checkbox"
                      checked={hostSettings.sendChatAllowed}
                      onChange={(e) =>
                        updateHostSettings({ sendChatAllowed: e.target.checked })
                      }
                      className="accent-[#059669]"
                    />
                  </div>
                )}

                {/* Chat Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="space-y-0.5">
                        <div className="flex items-baseline gap-2 font-mono text-[10px] opacity-60">
                          <span className="font-bold">{msg.senderName}</span>
                          <span>
                            {typeof msg.timestamp === 'number'
                              ? new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                              : msg.timestamp}
                          </span>
                        </div>
                        <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs opacity-50 text-center py-6">
                      Messages can be seen only by people in the call and are deleted when the call ends.
                    </p>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-black/10 dark:border-white/10 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={chatInput}
                    disabled={!hostSettings.sendChatAllowed && !isMeLecturer}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      hostSettings.sendChatAllowed || isMeLecturer
                        ? 'Send a message to everyone...'
                        : 'Host has turned off chat.'
                    }
                    className={`flex-1 px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                      }`}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2 rounded-xl bg-[#69DB7C] text-black disabled:opacity-40 cursor-pointer"
                  >
                    <PaperPlaneTilt size={16} />
                  </button>
                </form>
              </div>
            )}

            {/* PANEL 4: ACTIVITIES */}
            {activeSidePanel === 'activities' && (
              <div className="flex-1 p-4 space-y-4 overflow-y-auto text-xs">
                {activityView === 'list' ? (
                  /* Activities Menu */
                  <div className="space-y-2">
                    <button
                      onClick={() => setActivityView('polls')}
                      className="w-full p-4 rounded-2xl border flex items-center gap-3 text-left hover:border-[#059669] transition-colors"
                    >
                      <ChartBar size={22} className="text-blue-500" />
                      <div>
                        <div className="font-medium text-sm">Polls</div>
                        <div className="text-[11px] opacity-60">
                          Create and vote on instant questions
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setActivityView('qa')}
                      className="w-full p-4 rounded-2xl border flex items-center gap-3 text-left hover:border-[#059669] transition-colors"
                    >
                      <ChatCircleText size={22} className="text-emerald-500" />
                      <div>
                        <div className="font-medium text-sm">Q&A</div>
                        <div className="text-[11px] opacity-60">
                          Ask and upvote questions during lecture
                        </div>
                      </div>
                    </button>

                    {isMeLecturer && (
                      <button
                        onClick={() => setActivityView('breakouts')}
                        className="w-full p-4 rounded-2xl border flex items-center gap-3 text-left hover:border-[#059669] transition-colors"
                      >
                        <Shapes size={22} className="text-purple-500" />
                        <div>
                          <div className="font-medium text-sm">Breakout Rooms</div>
                          <div className="text-[11px] opacity-60">
                            Split class into small discussion groups
                          </div>
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => setActivityView('attendance')}
                      className="w-full p-4 rounded-2xl border flex items-center gap-3 text-left hover:border-[#059669] transition-colors"
                    >
                      <DownloadSimple size={22} className="text-amber-500" />
                      <div>
                        <div className="font-medium text-sm">Attendance Report</div>
                        <div className="text-[11px] opacity-60">
                          View active participants & export log
                        </div>
                      </div>
                    </button>
                  </div>
                ) : activityView === 'polls' ? (
                  /* Polls Sub-view */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <button
                        onClick={() => setActivityView('list')}
                        className="flex items-center gap-1 font-medium"
                      >
                        <CaretLeft size={14} />
                        <span>All Activities</span>
                      </button>
                    </div>

                    {/* Create Poll Form for Lecturer */}
                    {isMeLecturer && (
                      <form
                        onSubmit={handleCreatePollSubmit}
                        className="p-4 rounded-2xl border space-y-3"
                      >
                        <div className="font-medium">Launch a Poll</div>
                        <input
                          type="text"
                          required
                          value={newPollQ}
                          onChange={(e) => setNewPollQ(e.target.value)}
                          placeholder="Ask a question..."
                          className="w-full p-2 rounded-xl border text-xs"
                        />
                        {newPollOptions.map((opt, i) => (
                          <input
                            key={i}
                            type="text"
                            required={i < 2}
                            value={opt}
                            onChange={(e) => {
                              const copy = [...newPollOptions];
                              copy[i] = e.target.value;
                              setNewPollOptions(copy);
                            }}
                            placeholder={`Option ${i + 1}`}
                            className="w-full p-2 rounded-xl border text-xs"
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => setNewPollOptions([...newPollOptions, ''])}
                          className="text-[11px] text-[#059669] hover:underline"
                        >
                          + Add Option
                        </button>
                        <button
                          type="submit"
                          className="w-full py-2 rounded-full bg-[#059669] text-white font-medium"
                        >
                          Launch Poll
                        </button>
                      </form>
                    )}

                    {/* Active Polls List */}
                    <div className="space-y-4">
                      {polls.map((poll) => {
                        const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0);
                        return (
                          <div key={poll.id} className="p-4 rounded-2xl border space-y-3">
                            <div className="font-medium">{poll.question}</div>
                            <div className="space-y-2">
                              {poll.options.map((opt) => {
                                const pct =
                                  totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => votePoll(poll.id, opt.id)}
                                    disabled={!poll.isOpen}
                                    className="w-full p-2.5 rounded-xl border text-left relative overflow-hidden"
                                  >
                                    <div
                                      className="absolute left-0 top-0 bottom-0 bg-emerald-500/20"
                                      style={{ width: `${pct}%` }}
                                    />
                                    <div className="relative flex justify-between">
                                      <span>{opt.text}</span>
                                      <span className="font-mono font-bold">{pct}% ({opt.votes})</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            {isMeLecturer && poll.isOpen && (
                              <button
                                onClick={() => closePoll(poll.id)}
                                className="text-[11px] text-red-500 hover:underline"
                              >
                                End Poll
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : activityView === 'qa' ? (
                  /* Q&A Sub-view */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <button
                        onClick={() => setActivityView('list')}
                        className="flex items-center gap-1 font-medium"
                      >
                        <CaretLeft size={14} />
                        <span>All Activities</span>
                      </button>
                    </div>

                    <form onSubmit={handleAskQuestionSubmit} className="space-y-2">
                      <input
                        type="text"
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="Ask a question..."
                        className="w-full p-2.5 rounded-xl border text-xs"
                      />
                      <button
                        type="submit"
                        disabled={!newQuestionText.trim()}
                        className="w-full py-2 rounded-full bg-[#059669] text-white font-medium disabled:opacity-40"
                      >
                        Submit Question
                      </button>
                    </form>

                    <div className="space-y-3 pt-2">
                      {questions.map((q) => (
                        <div key={q.id} className="p-3.5 rounded-2xl border space-y-2">
                          <div className="flex justify-between font-mono text-[10px] opacity-60">
                            <span>{q.authorName}</span>
                            {q.isAnswered && (
                              <span className="text-emerald-500 font-bold">Answered</span>
                            )}
                          </div>
                          <p>{q.text}</p>
                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => upvoteQuestion(q.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px]"
                            >
                              <ThumbsUp size={12} />
                              <span>{q.upvotes.length}</span>
                            </button>
                            {isMeLecturer && !q.isAnswered && (
                              <button
                                onClick={() => markQuestionAnswered(q.id)}
                                className="text-[11px] text-[#059669] hover:underline"
                              >
                                Mark as Answered
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : activityView === 'breakouts' ? (
                  /* Breakout Rooms Sub-view */
                  <div className="space-y-4">
                    <button
                      onClick={() => setActivityView('list')}
                      className="flex items-center gap-1 font-medium pb-2 border-b w-full"
                    >
                      <CaretLeft size={14} />
                      <span>All Activities</span>
                    </button>

                    {breakoutSession?.isActive ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                          <div className="font-medium text-purple-600 dark:text-purple-400">
                            Breakout Sessions Active
                          </div>
                          <p className="opacity-70">
                            {breakoutSession.rooms.length} rooms running.
                          </p>
                          <button
                            onClick={closeBreakouts}
                            className="w-full py-2 rounded-full border border-red-500/30 text-red-500 font-medium"
                          >
                            Close All Rooms
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleCreateBreakoutsSubmit} className="space-y-3">
                        <div className="font-medium">Setup Breakout Rooms</div>
                        <div>
                          <label className="block mb-1 opacity-70">Number of rooms</label>
                          <input
                            type="number"
                            min="2"
                            max="8"
                            value={breakoutRoomsCount}
                            onChange={(e) => setBreakoutRoomsCount(parseInt(e.target.value) || 2)}
                            className="w-full p-2 rounded-xl border text-xs"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2.5 rounded-full bg-[#059669] text-white font-medium"
                        >
                          Open Breakout Rooms
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  /* Attendance Report Sub-view */
                  <div className="space-y-4">
                    <button
                      onClick={() => setActivityView('list')}
                      className="flex items-center gap-1 font-medium pb-2 border-b w-full"
                    >
                      <CaretLeft size={14} />
                      <span>All Activities</span>
                    </button>

                    <div className="flex justify-between items-center">
                      <span className="font-medium">Attendance Records</span>
                      <button
                        onClick={exportAttendanceReport}
                        className="inline-flex items-center gap-1 text-[#059669] hover:underline"
                      >
                        <DownloadSimple size={14} />
                        <span>Export CSV</span>
                      </button>
                    </div>

                    <div className="divide-y text-xs">
                      {attendanceRecords.map((r, i) => (
                        <div key={i} className="py-2.5 flex justify-between">
                          <div>
                            <div className="font-medium">{r.name}</div>
                            <div className="text-[10px] opacity-60">
                              Joined {new Date(r.joinTime).toLocaleTimeString()}
                            </div>
                          </div>
                          <span className="font-mono">{r.durationMinutes}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PANEL 5: HOST CONTROLS */}
            {activeSidePanel === 'host_controls' && (
              <div className="flex-1 p-5 space-y-5 overflow-y-auto text-xs">
                <div className="space-y-3">
                  <div className="font-medium text-sm">Studio access</div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="font-medium">Quick access</div>
                      <div className="opacity-60 text-[11px]">
                        When turned on, anyone with the link can join directly
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={hostSettings.quickAccess}
                      onChange={(e) =>
                        updateHostSettings({ quickAccess: e.target.checked })
                      }
                      className="accent-[#059669]"
                    />
                  </label>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="font-medium text-sm">Let participants</div>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Share their screen</span>
                    <input
                      type="checkbox"
                      checked={hostSettings.shareScreenAllowed}
                      onChange={(e) =>
                        updateHostSettings({ shareScreenAllowed: e.target.checked })
                      }
                      className="accent-[#059669]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Send chat messages</span>
                    <input
                      type="checkbox"
                      checked={hostSettings.sendChatAllowed}
                      onChange={(e) =>
                        updateHostSettings({ sendChatAllowed: e.target.checked })
                      }
                      className="accent-[#059669]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Send reactions</span>
                    <input
                      type="checkbox"
                      checked={hostSettings.sendReactionsAllowed}
                      onChange={(e) =>
                        updateHostSettings({ sendReactionsAllowed: e.target.checked })
                      }
                      className="accent-[#059669]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Turn on their microphone</span>
                    <input
                      type="checkbox"
                      checked={hostSettings.turnMicAllowed}
                      onChange={(e) =>
                        updateHostSettings({ turnMicAllowed: e.target.checked })
                      }
                      className="accent-[#059669]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Turn on their video</span>
                    <input
                      type="checkbox"
                      checked={hostSettings.turnVideoAllowed}
                      onChange={(e) =>
                        updateHostSettings({ turnVideoAllowed: e.target.checked })
                      }
                      className="accent-[#059669]"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Use the chalkboard</span>
                    <input
                      type="checkbox"
                      checked={hostSettings.useChalkboardAllowed}
                      onChange={(e) =>
                        updateHostSettings({ useChalkboardAllowed: e.target.checked })
                      }
                      className="accent-[#059669]"
                    />
                  </label>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Hover detection trigger area at bottom edge */}
      <div
        className="fixed bottom-0 inset-x-0 h-6 z-30 pointer-events-auto"
        onMouseEnter={() => setIsControlsVisible(true)}
      />

      {/* 3. Bottom Call Control Dock (Auto-hides when mouse is not in bottom region) */}
      <footer
        onMouseEnter={() => setIsControlsVisible(true)}
        className={`fixed bottom-0 inset-x-0 mx-auto w-fit mb-2 h-20 px-4 bg-[#141E19]/15 backdrop-blur-md rounded-full flex items-center justify-center gap-2 sm:gap-3 z-40 transition-all duration-300 ease-in-out shadow-2xl ${isControlsVisible || showReactionsMenu || showLeaveModal || showLayoutMenu
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-full opacity-0 pointer-events-none'
          }`}
      >
        {/* Mic Toggle Button */}
        <button
          type="button"
          onClick={toggleMic}
          disabled={isMicMuted && !hasMicAccess}
          title={
            isMicMuted && !hasMicAccess
              ? 'Microphone access is restricted by lecturer. Raise your hand to speak.'
              : isMicMuted
                ? 'Unmute'
                : 'Mic On'
          }
          className={`btn-google px-4 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-2 cursor-pointer transition-all ${isMicMuted
            ? !hasMicAccess
              ? 'bg-[#1E2320]/60 text-[#71767B] border border-[#3C4043] opacity-60 cursor-not-allowed'
              : 'bg-[#D93025] text-white'
            : 'bg-[#28292A] text-[#E3E3E3] border border-[#3C4043] hover:bg-[#3C4043]'
            }`}
        >
          {isMicMuted ? (
            <MicrophoneSlash size={18} weight="regular" />
          ) : (
            <Microphone size={18} weight="regular" />
          )}
          <span className="hidden sm:inline">
            {isMicMuted ? (!hasMicAccess ? 'Mic Locked' : 'Unmute') : 'Mic On'}
          </span>
          {isMicMuted && !hasMicAccess && <Lock size={12} className="text-amber-400" />}
        </button>

        {/* Raise Hand Button */}
        <button
          type="button"
          onClick={toggleHandRaised}
          className={`btn-google px-4 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-2 border cursor-pointer ${isHandRaised
            ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C]'
            : 'bg-[#28292A] text-[#E3E3E3] border-[#3C4043] hover:bg-[#3C4043]'
            }`}
        >
          <HandPalm size={18} weight="regular" />
          <span className="hidden sm:inline">
            {isHandRaised ? 'Hand Raised' : 'Raise Hand'}
          </span>
        </button>

        {/* Stage Switcher (Chalkboard only openable by lecturer) */}
        {isMeLecturer ? (
          <button
            type="button"
            onClick={() => {
              const next = stageLayout === 'whiteboard' ? 'tiled' : 'whiteboard';
              setStageLayout(next);
              setLecturerStageLayout(next);
              broadcastStageLayout(next, code);
            }}
            title={
              stageLayout === 'whiteboard'
                ? 'Switch classroom to Voice Grid'
                : 'Open Chalkboard for Classroom'
            }
            className="btn-google px-4 py-2.5 rounded-full border border-[#3C4043] font-medium text-xs inline-flex items-center gap-2 cursor-pointer transition-all bg-[#28292A] text-[#E3E3E3] hover:bg-[#3C4043]"
          >
            {stageLayout === 'whiteboard' ? (
              <>
                <Users size={18} weight="regular" />
                <span className="hidden sm:inline">Voice Grid ({displayParticipants.length})</span>
              </>
            ) : (
              <>
                <Chalkboard size={18} weight="regular" />
                <span className="hidden sm:inline">Open Chalkboard</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (stageLayout === 'whiteboard') {
                setStageLayout('tiled');
              } else if (lecturerStageLayout === 'whiteboard') {
                setStageLayout('whiteboard');
              }
            }}
            disabled={stageLayout !== 'whiteboard' && lecturerStageLayout !== 'whiteboard'}
            title={
              stageLayout === 'whiteboard'
                ? 'Switch to Voice Grid'
                : lecturerStageLayout === 'whiteboard'
                  ? 'Return to Chalkboard'
                  : 'Only the lecturer can open the chalkboard'
            }
            className={`btn-google px-4 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-2 transition-all ${
              stageLayout !== 'whiteboard' && lecturerStageLayout !== 'whiteboard'
                ? 'bg-[#1E2320]/60 border-[#3C4043] text-[#71767B] opacity-60 cursor-not-allowed'
                : 'bg-[#28292A] border-[#3C4043] text-[#E3E3E3] hover:bg-[#3C4043] cursor-pointer'
            }`}
          >
            {stageLayout === 'whiteboard' ? (
              <>
                <Users size={18} weight="regular" />
                <span className="hidden sm:inline">Voice Grid ({displayParticipants.length})</span>
              </>
            ) : (
              <>
                <Chalkboard size={18} weight="regular" />
                <span className="hidden sm:inline">
                  {lecturerStageLayout === 'whiteboard' ? 'View Chalkboard' : 'Chalkboard'}
                </span>
                {lecturerStageLayout !== 'whiteboard' && <Lock size={12} className="text-amber-400" />}
              </>
            )}
          </button>
        )}

        {/* Video Mode Toggle (720p HD Default) */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setVideoMode(videoMode === 'off' ? 'standard' : 'off')}
            className={`btn-google px-4 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-2 cursor-pointer transition-all ${videoMode !== 'off'
              ? 'bg-[#69DB7C]/20 border-[#69DB7C] text-[#69DB7C]'
              : 'bg-[#28292A] border-[#3C4043] text-[#E3E3E3] hover:bg-[#3C4043]'
              }`}
            title={videoMode === 'off' ? 'Turn On Camera (720p HD)' : 'Turn Off Camera'}
          >
            {videoMode === 'off' ? (
              <VideoCameraSlash size={18} weight="regular" />
            ) : (
              <VideoCamera size={18} weight="regular" />
            )}
            <span className="hidden sm:inline">
              {videoMode === 'off' ? 'Cam Off' : videoMode === 'low' ? 'Cam 360p' : 'Cam 720p HD'}
            </span>
          </button>
          {videoMode !== 'off' && (
            <button
              type="button"
              onClick={() => setVideoMode(videoMode === 'standard' ? 'low' : 'standard')}
              className="px-2 py-1 rounded-full bg-black/60 border border-[#3C4043] hover:border-[#69DB7C] text-[10px] font-mono text-[#E3E3E3] cursor-pointer"
              title="Toggle between HD 720p and Low 360p"
            >
              {videoMode === 'standard' ? '720p' : '360p'}
            </button>
          )}
        </div>

        {/* Present Now (Screen Share) */}
        <button
          type="button"
          onClick={toggleScreenShare}
          className={`btn-google px-4 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-2 cursor-pointer transition-all ${isScreenSharing
            ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C] shadow-md font-semibold'
            : 'bg-[#28292A] border-[#3C4043] text-[#E3E3E3] hover:bg-[#3C4043]'
            }`}
          title={isScreenSharing ? 'Stop presenting screen' : 'Present now (Share screen)'}
        >
          <ExportIcon size={18} weight={isScreenSharing ? 'fill' : 'regular'} />
          <span className="hidden sm:inline">
            {isScreenSharing ? 'Stop Presenting' : 'Present'}
          </span>
        </button>

        {/* Chat Drawer Toggle */}
        <button
          type="button"
          onClick={() => {
            setActiveSidePanel((prev) => (prev === 'chat' ? 'none' : 'chat'));
          }}
          className={`btn-google px-4 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-2 cursor-pointer ${activeSidePanel === 'chat'
            ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C]'
            : 'bg-[#28292A] border-[#3C4043] text-[#E3E3E3] hover:bg-[#3C4043]'
            }`}
        >
          <ChatCircleText size={18} weight="regular" />
          <span className="hidden sm:inline">Chat ({chatMessages.length})</span>
        </button>

        {/* Activities Drawer Toggle */}
        <button
          type="button"
          onClick={() => {
            setActiveSidePanel((prev) => (prev === 'activities' ? 'none' : 'activities'));
          }}
          className={`btn-google px-4 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-2 cursor-pointer ${activeSidePanel === 'activities'
            ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C]'
            : 'bg-[#28292A] border-[#3C4043] text-[#E3E3E3] hover:bg-[#3C4043]'
            }`}
        >
          <Shapes size={18} weight="regular" />
          <span className="hidden sm:inline">Activities</span>
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

      {/* Host Leave Call Options Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-[#141E19] border border-white/20 text-white space-y-4 shadow-2xl">
            <h3 className="font-medium text-base">Leave Call</h3>
            <p className="text-xs opacity-70">
              Do you want to leave the call, or end the meeting for everyone?
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={handleLeaveCall}
                className="w-full py-2.5 rounded-full border border-white/20 text-xs font-medium hover:bg-white/10"
              >
                Just leave call
              </button>
              <button
                onClick={() => {
                  handleLeaveCall();
                }}
                className="w-full py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
              >
                End call for everyone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catch Me Up AI Modal */}
      <CatchUpModal
        isOpen={isCatchUpOpen}
        onClose={() => setIsCatchUpOpen(false)}
        roomCode={code}
      />
    </div>
  );
};

export default StudioPage;
