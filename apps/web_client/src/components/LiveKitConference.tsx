import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useIsSpeaking,
  useConnectionState,
  useRoomContext,
} from '@livekit/components-react';
import { Track, ConnectionState, Participant, VideoPresets, ParticipantEvent, RoomEvent, RemoteParticipant } from 'livekit-client';
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
  ChalkboardTeacher,
} from '@phosphor-icons/react';
import { StudioParticipant, VideoMode } from '../types/chalk';

export interface LiveKitConferenceProps {
  serverUrl: string;
  token: string | null;
  roomCode: string;
  isMicMuted: boolean;
  videoMode: VideoMode;
  onToggleMic: () => void;
  onSetVideoMode: (mode: VideoMode) => void;
  isScreenSharing?: boolean;
  onScreenShareChange?: (isSharing: boolean) => void;
  socketParticipants: StudioParticipant[];
  selfSocketId: string;
  isMeLecturer: boolean;
  onLowerHand?: (socketId: string) => void;
  onGrantPermission?: (socketId: string, permissions: { canDraw?: boolean; canSpeak?: boolean }) => void;
  stageMode: 'whiteboard' | 'speakers';
  isHandRaised?: boolean;
  onStageModeChange?: (mode: 'whiteboard' | 'speakers') => void;
  onDisconnected?: () => void;
  children?: React.ReactNode;
}

/**
 * Tile for an individual participant in the Studio grid
 */
interface ParticipantTileProps {
  participant: Participant;
  isLocal: boolean;
  cameraTrack?: any;
  screenShareTrack?: any;
  socketPeer?: StudioParticipant;
  isHandRaisedLocal?: boolean;
  isHandRaisedRemote?: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  isMeLecturer: boolean;
  onLowerHand?: (socketId: string) => void;
  onGrantPermission?: (socketId: string, permissions: { canDraw?: boolean; canSpeak?: boolean }) => void;
}

const ParticipantTile: React.FC<ParticipantTileProps> = ({
  participant,
  isLocal,
  cameraTrack,
  screenShareTrack,
  socketPeer,
  isHandRaisedLocal,
  isHandRaisedRemote,
  isPinned,
  onTogglePin,
  isMeLecturer,
  onLowerHand,
  onGrantPermission,
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
  const isHandRaised = isLocal
    ? Boolean(isHandRaisedLocal)
    : Boolean(isHandRaisedRemote || socketPeer?.handRaised);
  const activeVideoTrack = screenShareTrack || cameraTrack;

  return (
    <div
      className={`relative rounded-3xl overflow-hidden bg-[#0F1713] border flex flex-col items-center justify-center min-h-[220px] transition-all duration-200 shadow-md ${isSpeaking
        ? 'border-[#69DB7C] ring-2 ring-[#69DB7C]/50'
        : isHandRaised
          ? 'border-[#FDD663] ring-2 ring-[#FDD663]/60 shadow-[0_0_20px_rgba(253,214,99,0.3)]'
          : 'border-[#3C4043]'
        }`}
    >
      {/* Real Video Track Stream (Camera or Screen Share) */}
      {activeVideoTrack ? (
        <div className="absolute inset-0 w-full h-full bg-black">
          <VideoTrack
            trackRef={activeVideoTrack}
            className={`w-full h-full ${screenShareTrack ? 'object-contain' : 'object-cover'
              }`}
          />
        </div>
      ) : (
        /* Initials Avatar Tile (when camera is off) */
        <div className="flex flex-col items-center justify-center p-6 space-y-3 z-10">
          <div
            className={`w-20 h-20 rounded-full font-semibold text-xl flex items-center justify-center transition-all ${role === 'lecturer'
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
            <span className="px-2.5 py-0.5 rounded-full bg-[#69DB7C]/20 text-[#69DB7C] text-[10px] font-semibold tracking-wider">
              LECTURER
            </span>
          )}
          {screenShareTrack && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[10px] flex items-center gap-1">
              <Desktop size={12} weight="fill" />
              <span>PRESENTING</span>
            </span>
          )}
          {isHandRaised && (
            <span className="px-2.5 py-1 rounded-full bg-amber-400 text-black text-[11px] font-bold flex items-center gap-1.5 shadow-lg animate-bounce">
              <HandPalm size={13} weight="fill" />
              <span>HAND UP</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 pointer-events-auto">
          {isMeLecturer && isHandRaised && (
            <button
              type="button"
              onClick={() => onLowerHand?.(socketPeer?.socketId || participant.identity)}
              className="px-2 py-0.5 rounded-full bg-black/60 hover:bg-black/90 text-[10px] text-[#E3E3E3] border border-[#3C4043] cursor-pointer"
              title="Lower hand"
            >
              Lower Hand
            </button>
          )}

          {isMeLecturer && !isLocal && (
            <>
              <button
                type="button"
                onClick={() =>
                  onGrantPermission?.(socketPeer?.socketId || participant.identity, {
                    canDraw: !socketPeer?.canDraw,
                  })
                }
                className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${socketPeer?.canDraw
                  ? 'bg-[#69DB7C] text-[#0F1713]'
                  : 'bg-black/50 hover:bg-black/80 text-[#9AA0A6] hover:text-[#E3E3E3]'
                  }`}
                title={socketPeer?.canDraw ? 'Revoke Chalkboard Access' : 'Grant Chalkboard Access'}
              >
                <ChalkboardTeacher size={13} weight={socketPeer?.canDraw ? 'fill' : 'regular'} />
              </button>
              <button
                type="button"
                onClick={() =>
                  onGrantPermission?.(socketPeer?.socketId || participant.identity, {
                    canSpeak: !socketPeer?.canSpeak,
                  })
                }
                className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${socketPeer?.canSpeak
                  ? 'bg-[#69DB7C] text-[#0F1713]'
                  : 'bg-black/50 hover:bg-black/80 text-[#9AA0A6] hover:text-[#E3E3E3]'
                  }`}
                title={socketPeer?.canSpeak ? 'Revoke Mic Access' : 'Grant Mic Access'}
              >
                <Microphone size={13} weight={socketPeer?.canSpeak ? 'fill' : 'regular'} />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onTogglePin}
            className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${isPinned
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
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between px-3 py-1.5 z-20">
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
 * Fallback/Socket participant tile when peer is in Socket.io room or LiveKit is connecting
 */
const SocketParticipantTile: React.FC<{
  peer: StudioParticipant;
  isLocal: boolean;
  isHandRaisedLocal?: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  isMeLecturer: boolean;
  onLowerHand?: (socketId: string) => void;
  onGrantPermission?: (socketId: string, permissions: { canDraw?: boolean; canSpeak?: boolean }) => void;
}> = ({
  peer,
  isLocal,
  isHandRaisedLocal,
  isPinned,
  onTogglePin,
  isMeLecturer,
  onLowerHand,
  onGrantPermission,
}) => {
    const role = peer.role || 'student';
    const displayName = peer.name || 'Participant';
    const avatarTag =
      peer.avatarTag ||
      displayName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    const isMuted = Boolean(peer.isMuted);
    const isHandRaised = isLocal ? Boolean(isHandRaisedLocal) : Boolean(peer.handRaised);

    return (
      <div
        className={`relative rounded-3xl overflow-hidden bg-[#0F1713] border flex flex-col items-center justify-center min-h-[220px] transition-all duration-200 shadow-md ${isHandRaised
          ? 'border-[#FDD663] ring-2 ring-[#FDD663]/60 shadow-[0_0_20px_rgba(253,214,99,0.3)]'
          : 'border-[#3C4043]'
          }`}
      >
        <div className="flex flex-col items-center justify-center p-6 space-y-3 z-10">
          <div
            className={`w-20 h-20 rounded-full font-semibold text-xl flex items-center justify-center transition-all ${role === 'lecturer'
              ? 'bg-[#69DB7C] text-[#0F1713]'
              : 'bg-[#141E19] border border-[#3C4043] text-[#E3E3E3]'
              }`}
          >
            {avatarTag}
          </div>
        </div>

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {role === 'lecturer' && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#69DB7C]/20 text-[#69DB7C] text-[10px] font-semibold tracking-wider">
                LECTURER
              </span>
            )}
            {isHandRaised && (
              <span className="px-2.5 py-1 rounded-full bg-amber-400 text-black text-[11px] font-bold flex items-center gap-1.5 shadow-lg animate-bounce">
                <HandPalm size={13} weight="fill" />
                <span>HAND UP</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 pointer-events-auto">
            {isMeLecturer && isHandRaised && (
              <button
                type="button"
                onClick={() => onLowerHand?.(peer.socketId || peer.id)}
                className="px-2 py-0.5 rounded-full bg-black/60 hover:bg-black/90 text-[10px] text-[#E3E3E3] border border-[#3C4043] cursor-pointer"
                title="Lower hand"
              >
                Lower Hand
              </button>
            )}

            {isMeLecturer && !isLocal && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onGrantPermission?.(peer.socketId || peer.id, {
                      canDraw: !peer.canDraw,
                    })
                  }
                  className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${peer.canDraw
                    ? 'bg-[#69DB7C] text-[#0F1713]'
                    : 'bg-black/50 hover:bg-black/80 text-[#9AA0A6] hover:text-[#E3E3E3]'
                    }`}
                  title={peer.canDraw ? 'Revoke Chalkboard Access' : 'Grant Chalkboard Access'}
                >
                  <ChalkboardTeacher size={13} weight={peer.canDraw ? 'fill' : 'regular'} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onGrantPermission?.(peer.socketId || peer.id, {
                      canSpeak: !peer.canSpeak,
                    })
                  }
                  className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${peer.canSpeak
                    ? 'bg-[#69DB7C] text-[#0F1713]'
                    : 'bg-black/50 hover:bg-black/80 text-[#9AA0A6] hover:text-[#E3E3E3]'
                    }`}
                  title={peer.canSpeak ? 'Revoke Mic Access' : 'Grant Mic Access'}
                >
                  <Microphone size={13} weight={peer.canSpeak ? 'fill' : 'regular'} />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onTogglePin}
              className={`p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${isPinned
                ? 'bg-[#69DB7C] text-[#0F1713]'
                : 'bg-black/50 hover:bg-black/80 text-[#9AA0A6] hover:text-[#E3E3E3]'
                }`}
              title={isPinned ? 'Unpin' : 'Pin to main view'}
            >
              <PushPin size={13} weight={isPinned ? 'fill' : 'regular'} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between px-3 py-1.5 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-xs text-[#E3E3E3] truncate">
              {displayName} {isLocal ? '(You)' : ''}
            </span>
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
  isScreenSharing?: boolean;
  onScreenShareChange?: (isSharing: boolean) => void;
  socketParticipants: StudioParticipant[];
  selfSocketId: string;
  isMeLecturer: boolean;
  onLowerHand?: (socketId: string) => void;
  onGrantPermission?: (socketId: string, permissions: { canDraw?: boolean; canSpeak?: boolean }) => void;
  stageMode: 'whiteboard' | 'speakers';
  isHandRaised?: boolean;
  onStageModeChange?: (mode: 'whiteboard' | 'speakers') => void;
  onDisconnected?: () => void;
  children?: React.ReactNode;
}> = ({
  isMicMuted,
  videoMode,
  isScreenSharing,
  onScreenShareChange,
  socketParticipants,
  selfSocketId,
  isMeLecturer,
  onLowerHand,
  onGrantPermission,
  stageMode,
  isHandRaised,
  onStageModeChange,
  children,
}) => {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const connectionState = useConnectionState();
    const participants = useParticipants();
    const [liveKitHandsRaised, setLiveKitHandsRaised] = useState<Record<string, boolean>>({});

    const isMeLecturerRef = useRef(isMeLecturer);
    isMeLecturerRef.current = isMeLecturer;
    const stageModeRef = useRef(stageMode);
    stageModeRef.current = stageMode;
    const onStageModeChangeRef = useRef(onStageModeChange);
    onStageModeChangeRef.current = onStageModeChange;

    const handleLowerHandInternal = (targetId: string, lkIdentity?: string) => {
      setLiveKitHandsRaised((prev) => {
        const next = { ...prev };
        if (lkIdentity) next[lkIdentity] = false;
        if (targetId) next[targetId] = false;
        return next;
      });
      onLowerHand?.(targetId);
    };

    // 1. Broadcast stageMode changes from Lecturer to all participants via LiveKit Data Channel
    useEffect(() => {
      if (isMeLecturer && room && room.state === ConnectionState.Connected && localParticipant) {
        try {
          const payload = new TextEncoder().encode(
            JSON.stringify({
              type: 'chalk_stage_layout',
              stageLayout: stageMode,
              senderIdentity: localParticipant.identity,
            })
          );
          room.localParticipant.publishData(payload, { reliable: true });
        } catch (err) {
          console.warn('[LiveKit DataChannel] Error publishing stage layout:', err);
        }
      }
    }, [stageMode, isMeLecturer, room, localParticipant, connectionState]);

    // 2. Broadcast local hand raise to all participants via LiveKit Data Channel
    useEffect(() => {
      if (room && room.state === ConnectionState.Connected && localParticipant) {
        try {
          const payload = new TextEncoder().encode(
            JSON.stringify({
              type: 'chalk_hand_raised',
              identity: localParticipant.identity,
              handRaised: Boolean(isHandRaised),
            })
          );
          room.localParticipant.publishData(payload, { reliable: true });
        } catch (err) {
          console.warn('[LiveKit DataChannel] Error publishing hand raise:', err);
        }
      }
    }, [isHandRaised, room, localParticipant, connectionState]);

    // 3. Listen to incoming LiveKit Data Channel messages from peers & relay chalkboard telemetry
    useEffect(() => {
      if (!room) return;

      const handleOutgoingBoardTx = (e: Event) => {
        if (room.state !== ConnectionState.Connected || !localParticipant) return;
        const detail = (e as CustomEvent).detail;
        if (!detail?.event) return;
        try {
          const encoded = new TextEncoder().encode(
            JSON.stringify({
              type: 'chalk_board_tx',
              event: detail.event,
              payload: detail.payload,
              senderIdentity: localParticipant.identity,
            })
          );
          room.localParticipant.publishData(encoded, {
            reliable: detail.reliable !== false,
          });
        } catch (err) {
          console.warn('[LiveKit DataChannel] Error publishing chalkboard packet:', err);
        }
      };

      window.addEventListener('chalk:board:tx', handleOutgoingBoardTx);

      const handleData = (payload: Uint8Array, participant?: RemoteParticipant) => {
        try {
          const decoded = JSON.parse(new TextDecoder().decode(payload));
          if (decoded.type === 'chalk_board_tx' && decoded.event) {
            if (decoded.event === 'lower_hand' || decoded.event === 'hand_lowered') {
              const targetSocketId = decoded.payload?.socketId;
              const targetUserId = decoded.payload?.userId;
              setLiveKitHandsRaised((prev) => {
                const next = { ...prev };
                if (targetSocketId) next[targetSocketId] = false;
                if (targetUserId) next[targetUserId] = false;
                return next;
              });
            } else if (decoded.event === 'lower_all_hands') {
              setLiveKitHandsRaised({});
            }
            window.dispatchEvent(
              new CustomEvent('chalk:board:rx', {
                detail: {
                  event: decoded.event,
                  payload: decoded.payload,
                },
              })
            );
          }
          if (
            decoded.type === 'chalk_stage_layout' &&
            decoded.senderIdentity !== localParticipant?.identity &&
            (decoded.stageLayout === 'whiteboard' || decoded.stageLayout === 'speakers' || decoded.stageLayout === 'tiled')
          ) {
            const mappedLayout = decoded.stageLayout === 'whiteboard' ? 'whiteboard' : 'speakers';
            onStageModeChangeRef.current?.(mappedLayout);
          }
          if (decoded.type === 'chalk_hand_raised' && decoded.identity) {
            setLiveKitHandsRaised((prev) => ({
              ...prev,
              [decoded.identity]: Boolean(decoded.handRaised),
            }));
          }
          if (decoded.type === 'chalk_request_state' && localParticipant) {
            if (isMeLecturerRef.current) {
              try {
                const reply = new TextEncoder().encode(
                  JSON.stringify({
                    type: 'chalk_stage_layout',
                    stageLayout: stageModeRef.current,
                    senderIdentity: localParticipant.identity,
                  })
                );
                room.localParticipant.publishData(reply, { reliable: true });
              } catch (err) {
                console.warn('[LiveKit DataChannel] Error replying with stage layout:', err);
              }
            }
            window.dispatchEvent(
              new CustomEvent('chalk:board:rx', {
                detail: {
                  event: 'request_board_snapshot',
                  payload: {},
                },
              })
            );
          }
        } catch (err) {
          console.warn('[LiveKit DataChannel] Error processing peer data:', err);
        }
      };

      room.on(RoomEvent.DataReceived, handleData);

      // When a new participant joins, lecturer syncs current chalkboard stage & board snapshot to them
      const handlePeerConnected = () => {
        if (room.state === ConnectionState.Connected && localParticipant) {
          const sendLayoutAndSnapshot = () => {
            if (isMeLecturerRef.current) {
              try {
                const payload = new TextEncoder().encode(
                  JSON.stringify({
                    type: 'chalk_stage_layout',
                    stageLayout: stageModeRef.current,
                    senderIdentity: localParticipant.identity,
                  })
                );
                room.localParticipant.publishData(payload, { reliable: true });
              } catch (err) {
                console.warn('[LiveKit DataChannel] Error syncing layout to peer:', err);
              }
            }
            window.dispatchEvent(
              new CustomEvent('chalk:board:rx', {
                detail: {
                  event: 'request_board_snapshot',
                  payload: {},
                },
              })
            );
          };
          sendLayoutAndSnapshot();
          setTimeout(sendLayoutAndSnapshot, 500);
        }
      };

      room.on(RoomEvent.ParticipantConnected, handlePeerConnected);

      // On initial connect, request stage & chalkboard state from peers
      if (room.state === ConnectionState.Connected && localParticipant) {
        try {
          const req = new TextEncoder().encode(
            JSON.stringify({
              type: 'chalk_request_state',
              identity: localParticipant.identity,
            })
          );
          room.localParticipant.publishData(req, { reliable: true });
        } catch { }
      }

      return () => {
        window.removeEventListener('chalk:board:tx', handleOutgoingBoardTx);
        room.off(RoomEvent.DataReceived, handleData);
        room.off(RoomEvent.ParticipantConnected, handlePeerConnected);
      };
    }, [room, localParticipant, connectionState]);

    // Screen share & Camera tracks
    const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
    const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);

    // Sync mic mute state to LiveKit
    useEffect(() => {
      if (localParticipant && connectionState === ConnectionState.Connected) {
        localParticipant.setMicrophoneEnabled(!isMicMuted).catch((err) => {
          console.warn('[LiveKit] Mic toggle error:', err);
        });
      }
    }, [isMicMuted, localParticipant, connectionState]);

    // Sync screen share state to LiveKit
    useEffect(() => {
      if (localParticipant && connectionState === ConnectionState.Connected) {
        if (isScreenSharing && !localParticipant.isScreenShareEnabled) {
          localParticipant.setScreenShareEnabled(true).catch((err) => {
            console.warn('[LiveKit] Screen share enable error:', err);
            onScreenShareChange?.(false);
          });
        } else if (!isScreenSharing && localParticipant.isScreenShareEnabled) {
          localParticipant.setScreenShareEnabled(false).catch((err) => {
            console.warn('[LiveKit] Screen share disable error:', err);
          });
        }
      }
    }, [isScreenSharing, localParticipant, onScreenShareChange, connectionState]);

    // Listen to local screen share stoppage from native browser controls
    useEffect(() => {
      if (!localParticipant) return;
      const onTrackUnpub = (pub: any) => {
        if (pub.source === Track.Source.ScreenShare) {
          onScreenShareChange?.(false);
        }
      };
      localParticipant.on(ParticipantEvent.TrackUnpublished, onTrackUnpub);
      localParticipant.on(ParticipantEvent.LocalTrackUnpublished, onTrackUnpub);
      return () => {
        localParticipant.off(ParticipantEvent.TrackUnpublished, onTrackUnpub);
        localParticipant.off(ParticipantEvent.LocalTrackUnpublished, onTrackUnpub);
      };
    }, [localParticipant, onScreenShareChange]);

    // Sync camera state to LiveKit with High Quality (720p HD / 1080p)
    useEffect(() => {
      if (localParticipant && connectionState === ConnectionState.Connected) {
        if (videoMode !== 'off') {
          const preset =
            videoMode === 'low'
              ? VideoPresets.h360
              : videoMode === 'hd'
                ? VideoPresets.h1080
                : VideoPresets.h720;
          localParticipant
            .setCameraEnabled(true, {
              resolution: preset.resolution,
            })
            .catch((err) => {
              console.warn('[LiveKit] Camera toggle error:', err);
            });
        } else {
          localParticipant.setCameraEnabled(false).catch((err) => {
            console.warn('[LiveKit] Camera disable error:', err);
          });
        }
      }
    }, [videoMode, localParticipant, connectionState]);

    // Map participants with their camera and screen share tracks
    const participantList = useMemo(() => {
      if (connectionState !== ConnectionState.Connected) return [];
      return participants
        .filter((p) => Boolean(p.identity))
        .map((p) => {
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

          let parsedMeta: any = null;
          try {
            if (p.metadata) parsedMeta = JSON.parse(p.metadata);
          } catch {
            // ignore
          }

          const isLocal = p === localParticipant;

          const socketPeer = socketParticipants.find((sp) => {
            if (isLocal && (sp.socketId === selfSocketId || sp.id === selfSocketId)) return true;
            if (parsedMeta?.socketId && sp.socketId === parsedMeta.socketId) return true;
            if (parsedMeta?.userId && (sp.id === parsedMeta.userId || sp.socketId === parsedMeta.userId)) return true;
            if (p.identity && (sp.id === p.identity || sp.socketId === p.identity)) return true;
            if (p.name && sp.name && p.name.trim().toLowerCase() === sp.name.trim().toLowerCase()) return true;
            return false;
          });

          const isHandRaisedRemote = Boolean(
            (socketPeer ? socketPeer.handRaised : false) || liveKitHandsRaised[p.identity]
          );

          return {
            participant: p,
            isLocal,
            cameraTrack,
            screenShareTrack,
            socketPeer,
            isHandRaisedRemote,
          };
        });
    }, [participants, tracks, socketParticipants, localParticipant, selfSocketId, liveKitHandsRaised, connectionState]);

    // Include any Socket.io / Demo participants not currently represented in LiveKit participantList
    const unmatchedSocketParticipants = useMemo(() => {
      const matchedSocketIds = new Set(
        participantList
          .map((item) => item.socketPeer?.socketId || item.socketPeer?.id)
          .filter(Boolean)
      );
      return socketParticipants.filter((sp) => {
        const key = sp.socketId || sp.id;
        if (matchedSocketIds.has(key) || matchedSocketIds.has(sp.socketId) || matchedSocketIds.has(sp.id)) {
          return false;
        }
        if (
          participantList.some(
            (item) =>
              (item.participant.identity &&
                (item.participant.identity === sp.id || item.participant.identity === sp.socketId)) ||
              (item.participant.name &&
                sp.name &&
                item.participant.name.trim().toLowerCase() === sp.name.trim().toLowerCase())
          )
        ) {
          return false;
        }
        return true;
      });
    }, [participantList, socketParticipants]);

    const totalTileCount = participantList.length + unmatchedSocketParticipants.length;

    // Find active screen share if any
    const activeScreenShare = participantList.find((p) => p.screenShareTrack);
    const hasActiveScreenShare = Boolean(activeScreenShare || isScreenSharing);
    const prevScreenShareRef = useRef(false);

    // Hide chalkboard automatically when screen share starts
    useEffect(() => {
      if (hasActiveScreenShare && !prevScreenShareRef.current && stageMode === 'whiteboard') {
        onStageModeChangeRef.current?.('speakers');
      }
      prevScreenShareRef.current = hasActiveScreenShare;
    }, [hasActiveScreenShare, stageMode]);

    // If in whiteboard mode, render children (whiteboard stage) + floating PiP camera
    if (stageMode === 'whiteboard' && !hasActiveScreenShare) {
      const localUserTile = participantList.find((p) => p.isLocal);
      const lecturerTile = participantList.find((p) => p.socketPeer?.role === 'lecturer');
      const pipTarget = localUserTile?.cameraTrack ? localUserTile : lecturerTile;

      const raisedHandsEntries = [
        ...participantList
          .filter((p) => (p.isLocal ? isHandRaised : p.isHandRaisedRemote))
          .map((p) => ({
            id: p.socketPeer?.socketId || p.participant.identity,
            lkIdentity: p.participant.identity,
            name: p.participant.name || p.socketPeer?.name || 'Participant',
          })),
        ...unmatchedSocketParticipants
          .filter((sp) => {
            const isLocalPeer = sp.socketId === selfSocketId || sp.id === selfSocketId;
            return isLocalPeer ? Boolean(isHandRaised) : Boolean(sp.handRaised);
          })
          .map((sp) => ({
            id: sp.socketId || sp.id,
            lkIdentity: sp.id,
            name: sp.name || 'Participant',
          })),
      ];

      return (
        <div className="relative w-full h-full flex flex-col">
          {/* Real LiveKit Audio Renderer (all participants hear each other) */}
          <RoomAudioRenderer />

          {/* Raised Hands Banner on Chalkboard (placed top-left so top-right stays free for Slide Navigation) */}
          {raisedHandsEntries.length > 0 && (
            <div className="absolute top-4 left-4 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400 text-black text-xs font-semibold shadow-xl border border-amber-500">
              <HandPalm size={16} weight="fill" />
              <span>
                {raisedHandsEntries.length === 1
                  ? `${raisedHandsEntries[0].name} raised hand`
                  : `${raisedHandsEntries.length} participants raised hand`}
              </span>
              {isMeLecturer && (
                <button
                  type="button"
                  onClick={() =>
                    raisedHandsEntries.forEach((entry) =>
                      handleLowerHandInternal(entry.id, entry.lkIdentity)
                    )
                  }
                  className="ml-1 px-2 py-0.5 rounded-full bg-black/80 hover:bg-black text-white text-[10px] font-medium cursor-pointer"
                >
                  Lower
                </button>
              )}
            </div>
          )}

          {/* Active Screen Share Spotlight Banner if someone is presenting */}
          {activeScreenShare && activeScreenShare.screenShareTrack && (
            <div className="relative w-full h-64 sm:h-80 bg-black border-b border-[#3C4043] flex items-center justify-center shrink-0">
              <VideoTrack
                trackRef={activeScreenShare.screenShareTrack}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-xs text-[#E3E3E3] flex items-center gap-2">
                <Desktop size={14} weight="fill" className="text-blue-400" />
                <span>{activeScreenShare.participant.name} is presenting screen</span>
              </div>
            </div>
          )}

          {/* Chalkboard Stage Children */}
          {children}

          {/* LiveKit Camera PiP Window when camera is on */}
          {videoMode !== 'off' && pipTarget?.cameraTrack && (
            <div className="absolute bottom-20 right-4 w-48 sm:w-56 h-32 rounded-2xl overflow-hidden bg-[#141E19] border border-[#3C4043] shadow-2xl z-30">
              <VideoTrack
                trackRef={pipTarget.cameraTrack}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded bg-black/70 text-[9px] text-[#E3E3E3] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#69DB7C] animate-pulse" />
                <span>LiveKit WebRTC ({videoMode === 'low' ? '360p' : videoMode === 'hd' ? '1080p FHD' : '720p HD'})</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Google Studio Voice & Video Grid Stage
    return (
      <div className="flex-1 w-full h-full bg-[#141E19] p-4 sm:p-6 overflow-y-auto space-y-5">
        {/* Real LiveKit Audio Renderer */}
        <RoomAudioRenderer />

        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-medium text-[#E3E3E3] flex items-center gap-2">
              <span>Video & Voice Stage ({totalTileCount})</span>
              {connectionState === ConnectionState.Connected || totalTileCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#69DB7C]/15 text-[#69DB7C] text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#69DB7C] animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-medium">
                  Connecting...
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Spotlight Screen Share Stage if someone is presenting */}
        {activeScreenShare && activeScreenShare.screenShareTrack && (
          <div className="relative rounded-3xl overflow-hidden bg-black border border-[#3C4043] h-72 sm:h-96 flex items-center justify-center">
            <VideoTrack
              trackRef={activeScreenShare.screenShareTrack}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-xs text-[#E3E3E3] flex items-center gap-2">
              <Desktop size={14} weight="fill" className="text-blue-400" />
              <span>{activeScreenShare.participant.name} is presenting screen</span>
            </div>
          </div>
        )}

        {/* Responsive Google Studio Grid */}
        {totalTileCount === 0 ? (
          <div className="p-12 text-center text-[#9AA0A6] space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#69DB7C]/10 flex items-center justify-center text-[#69DB7C] animate-pulse">
              <WifiHigh size={24} weight="bold" />
            </div>
            <p className="font-medium text-sm text-[#E3E3E3]">Connecting to Room...</p>
            <p className="text-xs text-[#9AA0A6]">Establishing connection</p>
          </div>
        ) : (
          <div
            className={`grid gap-4 ${totalTileCount === 1
              ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
              : totalTileCount === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : totalTileCount <= 4
                  ? 'grid-cols-2'
                  : totalTileCount <= 6
                    ? 'grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              }`}
          >
            {participantList.map(
              ({ participant, isLocal, cameraTrack, screenShareTrack, socketPeer, isHandRaisedRemote }) => (
                <ParticipantTile
                  key={participant.identity}
                  participant={participant}
                  isLocal={isLocal}
                  cameraTrack={cameraTrack}
                  screenShareTrack={screenShareTrack}
                  socketPeer={socketPeer}
                  isHandRaisedLocal={isHandRaised}
                  isHandRaisedRemote={isHandRaisedRemote}
                  isPinned={pinnedIdentity === participant.identity}
                  onTogglePin={() =>
                    setPinnedIdentity((prev) =>
                      prev === participant.identity ? null : participant.identity
                    )
                  }
                  isMeLecturer={isMeLecturer}
                  onLowerHand={(targetId) => handleLowerHandInternal(targetId, participant.identity)}
                  onGrantPermission={onGrantPermission}
                />
              )
            )}

            {unmatchedSocketParticipants.map((peer) => {
              const peerKey = peer.socketId || peer.id;
              const isLocalPeer =
                peer.socketId === selfSocketId || peer.id === selfSocketId || peer.socketId === 'local';
              return (
                <SocketParticipantTile
                  key={peerKey}
                  peer={peer}
                  isLocal={isLocalPeer}
                  isHandRaisedLocal={isHandRaised}
                  isPinned={pinnedIdentity === peerKey}
                  onTogglePin={() =>
                    setPinnedIdentity((prev) => (prev === peerKey ? null : peerKey))
                  }
                  isMeLecturer={isMeLecturer}
                  onLowerHand={(targetId) => handleLowerHandInternal(targetId, peer.id)}
                  onGrantPermission={onGrantPermission}
                />
              );
            })}

            {totalTileCount === 1 && (
              <div className="rounded-3xl border border-dashed border-[#3C4043] p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]">
                <div className="w-12 h-12 rounded-full bg-[#69DB7C]/15 flex items-center justify-center text-[#69DB7C]">
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
                  className="btn-google px-4 py-2 rounded-full bg-[#141E19] border border-[#3C4043] hover:border-[#69DB7C] text-xs text-[#69DB7C] flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check size={14} className="text-[#69DB7C]" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Studio Link</span>
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
  onToggleMic,
  onSetVideoMode,
  isScreenSharing,
  onScreenShareChange,
  socketParticipants,
  selfSocketId,
  isMeLecturer,
  onLowerHand,
  onGrantPermission,
  stageMode,
  isHandRaised,
  onStageModeChange,
  onDisconnected,
  children,
}) => {
  // If no LiveKit token is available yet, render children cleanly with fallback
  if (!token || !serverUrl) {
    return <>{children}</>;
  }

  return (
    <LiveKitRoom
      className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden"
      serverUrl={serverUrl}
      token={token}
      connect={true}
      onDisconnected={onDisconnected}
      audio={!isMicMuted}
      video={videoMode !== 'off'}
      options={{
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
        },
        publishDefaults: {
          videoEncoding: VideoPresets.h720.encoding,
          videoSimulcastLayers: [VideoPresets.h720, VideoPresets.h360],
        },
      }}
      onError={(err) => {
        console.warn('[LiveKit Conference] Connection error:', err);
      }}
    >
      <LiveKitConferenceInner
        isMicMuted={isMicMuted}
        videoMode={videoMode}
        isScreenSharing={isScreenSharing}
        onScreenShareChange={onScreenShareChange}
        socketParticipants={socketParticipants}
        selfSocketId={selfSocketId}
        isMeLecturer={isMeLecturer}
        onLowerHand={onLowerHand}
        onGrantPermission={onGrantPermission}
        stageMode={stageMode}
        isHandRaised={isHandRaised}
        onStageModeChange={onStageModeChange}
      >
        {children}
      </LiveKitConferenceInner>
    </LiveKitRoom>
  );
};

