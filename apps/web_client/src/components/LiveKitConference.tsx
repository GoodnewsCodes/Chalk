import React, { useEffect, useState, useMemo } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useIsSpeaking,
  useConnectionState,
} from '@livekit/components-react';
import { Track, ConnectionState, Participant } from 'livekit-client';
import {
  Microphone,
  MicrophoneSlash,
  VideoCamera,
  VideoCameraSlash,
  Desktop,
  HandPalm,
  PushPin,
  Warning,
  WifiHigh,
  CheckCircle,
  Users,
  Copy,
  Check,
} from '@phosphor-icons/react';
import { MeetParticipant, VideoMode } from '../types/chalk';

export interface LiveKitConferenceProps {
  serverUrl: string;
  token: string | null;
  roomCode: string;
  isMicMuted: boolean;
  videoMode: VideoMode;
  onToggleMic: () => void;
  onSetVideoMode: (mode: VideoMode) => void;
  socketParticipants: MeetParticipant[];
  selfSocketId: string;
  isMeLecturer: boolean;
  onLowerHand?: (socketId: string) => void;
  stageMode: 'whiteboard' | 'speakers';
  children?: React.ReactNode;
}

/**
 * Tile for an individual participant in the Google Meet grid
 */
interface ParticipantTileProps {
  participant: Participant;
  isLocal: boolean;
  cameraTrack?: any;
  screenShareTrack?: any;
  socketPeer?: MeetParticipant;
  isPinned: boolean;
  onTogglePin: () => void;
  isMeLecturer: boolean;
  onLowerHand?: (socketId: string) => void;
}

const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isLocal,
  cameraTrack,
  screenShareTrack,
  socketPeer,
  isPinned,
  onTogglePin,
  isMeLecturer,
  onLowerHand,
}) => {
  const isSpeaking = useIsSpeaking(participant);

  // Metadata parsing
  let role = socketPeer?.role || 'student';
  let avatarTag = socketPeer?.avatarTag || '';
  try {
    if (participant.metadata) {
      const parsed = JSON.parse(participant.metadata);
      if (parsed.role) role = parsed.role;
      if (parsed.avatarTag) avatarTag = parsed.avatarTag;
    }
  } catch {
    // ignore
  }

  const displayName = participant.name || socketPeer?.name || participant.identity || 'Participant';
  if (!avatarTag) {
    avatarTag = displayName
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  const isMuted = !participant.isMicrophoneEnabled;
  const isHandRaised = Boolean(socketPeer?.handRaised);
  const activeVideoTrack = screenShareTrack || cameraTrack;

  return (
    <div
      className={`relative rounded-3xl overflow-hidden bg-[#0F1713] border flex flex-col items-center justify-center min-h-[220px] transition-all duration-200 shadow-md ${
        isSpeaking
          ? 'border-[#69DB7C] ring-2 ring-[#69DB7C]/50'
          : isHandRaised
          ? 'border-[#FDD663] ring-1 ring-[#FDD663]/40'
          : 'border-[#3C4043]'
      }`}
    >
      {/* Real Video Track Stream (Camera or Screen Share) */}
      {activeVideoTrack ? (
        <div className="absolute inset-0 w-full h-full bg-black">
          <VideoTrack
            trackRef={activeVideoTrack}
            className={`w-full h-full ${
              screenShareTrack ? 'object-contain' : 'object-cover'
            }`}
          />
        </div>
      ) : (
        /* Initials Avatar Tile (when camera is off) */
        <div className="flex flex-col items-center justify-center p-6 space-y-3 z-10">
          <div
            className={`w-20 h-20 rounded-full font-mono font-semibold text-xl flex items-center justify-center transition-all ${
              role === 'lecturer'
                ? 'bg-[#69DB7C] text-[#0F1713]'
                : 'bg-[#141E19] border border-[#3C4043] text-[#E3E3E3]'
            } ${isSpeaking ? 'scale-105 ring-4 ring-[#69DB7C]/40 animate-pulse' : ''}`}
          >
            {avatarTag}
          </div>
        </div>
      )}

      {/* Top Overlay Badges: Hand Raise + Pin */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {role === 'lecturer' && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#69DB7C]/20 border border-[#69DB7C]/40 text-[#69DB7C] font-mono text-[10px] font-semibold tracking-wider">
              LECTURER
            </span>
          )}
          {screenShareTrack && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 font-mono text-[10px] flex items-center gap-1">
              <Desktop size={12} weight="fill" />
              <span>PRESENTING</span>
            </span>
          )}
          {isHandRaised && (
            <span className="px-2 py-0.5 rounded-full bg-[#FDD663]/20 border border-[#FDD663]/40 text-[#FDD663] font-mono text-[10px] font-medium flex items-center gap-1 animate-pulse">
              <HandPalm size={12} weight="fill" />
              <span>HAND UP</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 pointer-events-auto">
          {isMeLecturer && isHandRaised && socketPeer && (
            <button
              type="button"
              onClick={() => onLowerHand?.(socketPeer.socketId)}
              className="px-2 py-0.5 rounded-full bg-black/60 hover:bg-black/90 text-[10px] text-[#E3E3E3] border border-[#3C4043] cursor-pointer"
              title="Lower hand"
            >
              Lower Hand
            </button>
          )}

          <button
            type="button"
            onClick={onTogglePin}
            className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
              isPinned
                ? 'bg-[#69DB7C] text-[#0F1713]'
                : 'bg-black/50 hover:bg-black/80 text-[#9AA0A6] hover:text-[#E3E3E3]'
            }`}
            title={isPinned ? 'Unpin' : 'Pin to main view'}
          >
            <PushPin size={13} weight={isPinned ? 'fill' : 'regular'} />
          </button>
        </div>
      </div>

      {/* Bottom Name & Audio State Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-xs text-[#E3E3E3] truncate">
            {displayName} {isLocal ? '(You)' : ''}
          </span>
          {isSpeaking && (
            <span className="inline-flex items-end gap-0.5 h-3 shrink-0">
              <span className="w-0.5 h-2 bg-[#69DB7C] rounded-full animate-pulse" />
              <span className="w-0.5 h-3.5 bg-[#69DB7C] rounded-full animate-pulse" />
              <span className="w-0.5 h-1.5 bg-[#69DB7C] rounded-full animate-pulse" />
            </span>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {isMuted ? (
            <div className="w-5 h-5 rounded-full bg-[#D93025]/20 flex items-center justify-center text-[#F28B82]">
              <MicrophoneSlash size={12} weight="regular" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-full bg-[#69DB7C]/20 flex items-center justify-center text-[#69DB7C]">
              <Microphone size={12} weight="regular" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Inner conference content inside LiveKitRoom context
 */
const LiveKitConferenceInner: React.FC<{
  isMicMuted: boolean;
  videoMode: VideoMode;
  socketParticipants: MeetParticipant[];
  selfSocketId: string;
  isMeLecturer: boolean;
  onLowerHand?: (socketId: string) => void;
  stageMode: 'whiteboard' | 'speakers';
  children?: React.ReactNode;
}> = ({
  isMicMuted,
  videoMode,
  socketParticipants,
  selfSocketId,
  isMeLecturer,
  onLowerHand,
  stageMode,
  children,
}) => {
  const { localParticipant } = useLocalParticipant();
  const connectionState = useConnectionState();
  const participants = useParticipants();

  // Screen share & Camera tracks
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync mic mute state to LiveKit
  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMicMuted).catch((err) => {
        console.warn('[LiveKit] Mic toggle error:', err);
      });
    }
  }, [isMicMuted, localParticipant]);

  // Sync camera state to LiveKit
  useEffect(() => {
    if (localParticipant) {
      localParticipant.setCameraEnabled(videoMode !== 'off').catch((err) => {
        console.warn('[LiveKit] Camera toggle error:', err);
      });
    }
  }, [videoMode, localParticipant]);

  // Map participants with their camera and screen share tracks
  const participantList = useMemo(() => {
    return participants.map((p) => {
      const cameraTrack = tracks.find(
        (t) =>
          t.participant.identity === p.identity &&
          t.source === Track.Source.Camera &&
          !t.publication?.isMuted
      );
      const screenShareTrack = tracks.find(
        (t) =>
          t.participant.identity === p.identity &&
          t.source === Track.Source.ScreenShare &&
          !t.publication?.isMuted
      );
      const socketPeer = socketParticipants.find(
        (sp) => sp.id === p.identity || sp.name === p.name
      );

      return {
        participant: p,
        isLocal: p === localParticipant,
        cameraTrack,
        screenShareTrack,
        socketPeer,
      };
    });
  }, [participants, tracks, socketParticipants, localParticipant]);

  // Find active screen share if any
  const activeScreenShare = participantList.find((p) => p.screenShareTrack);

  // If in whiteboard mode, render children (whiteboard stage) + floating PiP camera
  if (stageMode === 'whiteboard') {
    const localUserTile = participantList.find((p) => p.isLocal);
    const lecturerTile = participantList.find((p) => p.socketPeer?.role === 'lecturer');
    const pipTarget = localUserTile?.cameraTrack ? localUserTile : lecturerTile;

    return (
      <div className="relative w-full h-full flex flex-col">
        {/* Real LiveKit Audio Renderer (all participants hear each other) */}
        <RoomAudioRenderer />

        {/* Chalkboard Stage Children */}
        {children}

        {/* LiveKit Camera PiP Window when camera is on */}
        {videoMode !== 'off' && pipTarget?.cameraTrack && (
          <div className="absolute bottom-20 right-4 w-48 sm:w-56 h-32 rounded-2xl overflow-hidden bg-[#141E19] border border-[#3C4043] shadow-2xl z-30">
            <VideoTrack
              trackRef={pipTarget.cameraTrack}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded bg-black/70 font-mono text-[9px] text-[#E3E3E3] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#69DB7C] animate-pulse" />
              <span>LiveKit WebRTC ({videoMode === 'low' ? '180p' : '480p'})</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Google Meet Voice & Video Grid Stage
  return (
    <div className="flex-1 rounded-3xl border border-[#3C4043] bg-[#141E19] p-4 sm:p-6 overflow-y-auto space-y-5">
      {/* Real LiveKit Audio Renderer */}
      <RoomAudioRenderer />

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-medium text-[#E3E3E3] flex items-center gap-2">
            <span>Video & Voice Stage ({participantList.length})</span>
            {connectionState === ConnectionState.Connected ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#69DB7C]/15 text-[#69DB7C] font-mono text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#69DB7C] animate-pulse" />
                LiveKit SFU Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-mono text-[11px] font-medium">
                Connecting WebRTC...
              </span>
            )}
          </h2>
          <p className="text-xs text-[#9AA0A6] mt-0.5">
            Real-time LiveKit SFU media mesh • Opus 24 kbps Voice & Adaptive Camera Feeds
          </p>
        </div>

        <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-[#69DB7C]/15 text-[#69DB7C] font-mono text-xs font-medium">
          SFU WebRTC: Live
        </span>
      </div>

      {/* Spotlight Screen Share Stage if someone is presenting */}
      {activeScreenShare && activeScreenShare.screenShareTrack && (
        <div className="relative rounded-3xl overflow-hidden bg-black border border-[#3C4043] h-72 sm:h-96 flex items-center justify-center">
          <VideoTrack
            trackRef={activeScreenShare.screenShareTrack}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 font-mono text-xs text-[#E3E3E3] flex items-center gap-2">
            <Desktop size={14} weight="fill" className="text-blue-400" />
            <span>{activeScreenShare.participant.name} is presenting screen</span>
          </div>
        </div>
      )}

      {/* Responsive Google Meet Grid */}
      {participantList.length === 0 ? (
        <div className="p-12 text-center text-[#9AA0A6] space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#69DB7C]/10 flex items-center justify-center text-[#69DB7C] animate-pulse">
            <WifiHigh size={24} weight="bold" />
          </div>
          <p className="font-medium text-sm text-[#E3E3E3]">Connecting to LiveKit Room...</p>
          <p className="text-xs text-[#9AA0A6]">Establishing WebRTC SFU peer connection</p>
        </div>
      ) : (
        <div
          className={`grid gap-4 ${
            participantList.length === 1
              ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
              : participantList.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : participantList.length <= 4
              ? 'grid-cols-2'
              : participantList.length <= 6
              ? 'grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          }`}
        >
          {participantList.map(
            ({ participant, isLocal, cameraTrack, screenShareTrack, socketPeer }) => (
              <ParticipantTile
                key={participant.identity}
                participant={participant}
                isLocal={isLocal}
                cameraTrack={cameraTrack}
                screenShareTrack={screenShareTrack}
                socketPeer={socketPeer}
                isPinned={pinnedIdentity === participant.identity}
                onTogglePin={() =>
                  setPinnedIdentity((prev) =>
                    prev === participant.identity ? null : participant.identity
                  )
                }
                isMeLecturer={isMeLecturer}
                onLowerHand={onLowerHand}
              />
            )
          )}

          {participantList.length === 1 && (
            <div className="rounded-3xl border border-dashed border-[#3C4043] bg-[#0F1713]/80 p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
              <div className="w-12 h-12 rounded-full bg-[#69DB7C]/15 border border-[#69DB7C]/30 flex items-center justify-center text-[#69DB7C]">
                <Users size={22} weight="regular" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-medium text-[#E3E3E3]">
                  You're the only one here
                </h3>
                <p className="text-xs text-[#9AA0A6] max-w-xs leading-relaxed">
                  Share this meeting link to invite classmates or students to join this session.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="btn-google px-4 py-2 rounded-full bg-[#141E19] border border-[#3C4043] hover:border-[#69DB7C] text-xs font-mono text-[#69DB7C] flex items-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} className="text-[#69DB7C]" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Meeting Link</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Top-Level LiveKit Room Wrapper
 */
export const LiveKitConference: React.FC<LiveKitConferenceProps> = ({
  serverUrl,
  token,
  roomCode,
  isMicMuted,
  videoMode,
  socketParticipants,
  selfSocketId,
  isMeLecturer,
  onLowerHand,
  stageMode,
  children,
}) => {
  // If no LiveKit token is available yet, render children cleanly with fallback
  if (!token || !serverUrl) {
    return <>{children}</>;
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      audio={!isMicMuted}
      video={videoMode !== 'off'}
      onError={(err) => {
        console.warn('[LiveKit Conference] Connection error:', err);
      }}
    >
      <LiveKitConferenceInner
        isMicMuted={isMicMuted}
        videoMode={videoMode}
        socketParticipants={socketParticipants}
        selfSocketId={selfSocketId}
        isMeLecturer={isMeLecturer}
        onLowerHand={onLowerHand}
        stageMode={stageMode}
      >
        {children}
      </LiveKitConferenceInner>
    </LiveKitRoom>
  );
};

