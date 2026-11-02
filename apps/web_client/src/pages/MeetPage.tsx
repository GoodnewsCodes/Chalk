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
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { VectorCanvas } from '../components/VectorCanvas';
import { CatchUpModal } from '../components/CatchUpModal';
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
  const [isCatchUpOpen, setIsCatchUpOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const videoPiPRef = useRef<HTMLVideoElement | null>(null);

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
          {stageMode === 'whiteboard' ? (
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
                        : 'Opus Voice Ready'}
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

              {/* Secondary Camera PiP Window */}
              {videoMode !== 'off' && (
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
          ) : (
            /* Voice Grid Stage */
            <div className="flex-1 rounded-3xl border border-[#3C4043] bg-[#141E19] p-4 sm:p-6 overflow-y-auto space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-medium text-[#E3E3E3]">
                    Connected Participants ({participants.length})
                  </h2>
                  <p className="text-xs text-[#9AA0A6] mt-0.5">
                    Peer-to-peer 24 kbps Opus audio mesh • Crystal clear under weak campus signal
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#69DB7C]/15 text-[#69DB7C] font-mono text-xs font-medium">
                  Audio Stream: ~24 kbps/peer
                </span>
              </div>

              {participants.length === 0 ? (
                <div className="p-12 text-center text-[#9AA0A6] space-y-2">
                  <Broadcast size={32} className="mx-auto text-[#69DB7C] animate-pulse" />
                  <p className="font-medium text-sm">Connecting to room {activeRoomCode}...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {participants.map((peer) => {
                    const isSelf = peer.socketId === selfSocketId;
                    const isSpeaking = speakingMap[peer.socketId];
                    const peerStream = isSelf ? localStream : remoteStreams.get(peer.socketId);
                    const hasVideo = peerStream && peerStream.getVideoTracks().length > 0;

                    return (
                      <div
                        key={peer.socketId || peer.id}
                        className={`p-5 rounded-3xl border bg-[#0F1713] flex flex-col items-center justify-center relative transition-all ${
                          isSpeaking
                            ? 'border-[#69DB7C] ring-2 ring-[#69DB7C]/40'
                            : peer.handRaised
                            ? 'border-[#FDD663]'
                            : 'border-[#3C4043]'
                        }`}
                      >
                        {/* Status Badges */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5">
                          {peer.handRaised && (
                            <span className="px-2 py-0.5 rounded-full bg-[#FDD663]/20 text-[#FDD663] font-mono text-[10px] font-medium flex items-center gap-1">
                              <HandPalm size={12} weight="fill" />
                              <span>HAND UP</span>
                            </span>
                          )}
                          {isMeLecturer && peer.handRaised && !isSelf && (
                            <button
                              type="button"
                              onClick={() => lowerHand(peer.socketId)}
                              title="Lower student's hand"
                              className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] text-[#E3E3E3] cursor-pointer"
                            >
                              Lower
                            </button>
                          )}
                        </div>

                        {/* Peer Avatar / Video Stream */}
                        {hasVideo ? (
                          <div className="w-20 h-20 rounded-2xl overflow-hidden mb-3 border border-[#3C4043]">
                            <video
                              autoPlay
                              playsInline
                              muted={isSelf}
                              ref={(el) => {
                                if (el && peerStream) el.srcObject = peerStream;
                              }}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-14 h-14 rounded-full font-mono font-medium text-base flex items-center justify-center mb-3 ${
                              peer.role === 'lecturer'
                                ? 'bg-[#69DB7C] text-black font-semibold'
                                : 'bg-[#141E19] border border-[#3C4043] text-[#E3E3E3]'
                            }`}
                          >
                            {peer.avatarTag || peer.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div className="font-medium text-sm text-center text-[#E3E3E3] truncate max-w-full px-2">
                          {peer.name} {isSelf ? '(You)' : ''}
                        </div>

                        <div
                          className={`text-xs font-mono mt-1 ${
                            isSpeaking
                              ? 'text-[#69DB7C]'
                              : peer.isMuted
                              ? 'text-[#9AA0A6]'
                              : 'text-[#81C995]'
                          }`}
                        >
                          {peer.isMuted
                            ? 'Muted'
                            : isSpeaking
                            ? 'Speaking (Opus)'
                            : 'Mic Active'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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

        {/* Chat Drawer Toggle */}
        <button
          type="button"
          onClick={() => setIsChatOpen((prev) => !prev)}
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
