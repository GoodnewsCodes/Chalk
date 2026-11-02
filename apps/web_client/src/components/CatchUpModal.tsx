import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkle,
  X,
  CheckCircle,
  ClockCountdown,
  ArrowRight,
  ChatCircleText,
  Chalkboard,
  Users,
} from '@phosphor-icons/react';
import { CatchUpData } from '../types/chalk';

interface CatchUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
}

export const CatchUpModal: React.FC<CatchUpModalProps> = ({
  isOpen,
  onClose,
  roomCode = 'csc401-algo',
}) => {
  const { isDark } = useApp();
  const [data, setData] = useState<CatchUpData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !roomCode) return;
    let active = true;
    setLoading(true);

    fetch(`http://localhost:4000/api/rooms/${encodeURIComponent(roomCode)}/catch-up`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json) {
          setData(json);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, roomCode]);

  if (!isOpen) return null;

  const formatElapsed = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="catchup-title"
        className="modal-surface w-full max-w-2xl rounded-3xl bg-[#141E19] border border-[#3C4043] text-[#E3E3E3] shadow-[0_24px_64px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85dvh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[#3C4043]/60 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#69DB7C]/15 text-[#69DB7C] flex items-center justify-center shrink-0">
              <Sparkle size={20} weight="regular" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="catchup-title" className="text-lg font-medium text-[#E3E3E3]">
                  Catch Me Up: Live Session Briefing
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-mono font-medium rounded-full bg-[#69DB7C]/15 text-[#69DB7C]">
                  {roomCode}
                </span>
              </div>
              <p className="text-xs text-[#9AA0A6] mt-0.5">
                Joined late due to power cut or weak signal? Here is the real activity in this session so far.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="btn-google p-2 rounded-full text-[#9AA0A6] hover:text-[#E3E3E3] hover:bg-white/10 cursor-pointer"
          >
            <X size={18} weight="regular" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs font-mono text-[#9AA0A6] space-y-2">
              <span className="w-2 h-2 rounded-full bg-[#69DB7C] inline-block animate-ping mr-2" />
              <span>Analyzing live board events & chat history...</span>
            </div>
          ) : data ? (
            <>
              {/* Session Overview Card */}
              <div className="rounded-3xl bg-[#0F1713] border border-[#3C4043]/60 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-medium text-[#69DB7C] flex items-center gap-1.5">
                    <ClockCountdown size={15} weight="regular" />
                    <span>ELAPSED: {formatElapsed(data.elapsedMs)}</span>
                  </span>
                  <span className="text-[#9AA0A6] flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users size={14} /> {data.participantCount} in room
                    </span>
                    <span className="flex items-center gap-1">
                      <Chalkboard size={14} /> {data.strokeCount} strokes
                    </span>
                  </span>
                </div>

                <div className="text-sm font-medium text-white">
                  {data.title}
                  {data.lecturerName ? ` • ${data.lecturerName}` : ''}
                </div>

                {data.slides && data.slides.length > 0 && (
                  <div className="pt-2 border-t border-[#3C4043]/40 flex flex-wrap gap-2 text-xs font-mono">
                    {data.slides.map((s) => (
                      <span
                        key={s.slideIndex}
                        className="px-2.5 py-1 rounded-xl bg-white/5 text-[#E3E3E3] border border-[#3C4043]/50"
                      >
                        Slide {s.slideIndex + 1}: {s.strokeCount} strokes
                        {s.contributors.length ? ` (${s.contributors.slice(0, 2).join(', ')})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Time-sliced timeline segments */}
              <div className="rounded-3xl bg-[#0F1713] border border-[#3C4043]/60 p-5 space-y-3">
                <div className="text-xs font-mono font-medium text-[#69DB7C] flex items-center gap-1.5">
                  <Chalkboard size={16} />
                  <span>SESSION TIMELINE & TOPIC TRANSITIONS</span>
                </div>

                {data.segments && data.segments.length > 0 ? (
                  <div className="space-y-3">
                    {data.segments.map((seg, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-[#69DB7C] font-mono text-[11px] font-medium shrink-0 mt-0.5 tabular-nums">
                          {formatMs(seg.startMs)} - {formatMs(seg.endMs)}
                        </span>
                        <div className="space-y-1">
                          <p className="text-[#E3E3E3]">
                            <strong>Board Activity:</strong> {seg.strokes} vector stroke deltas across Slide(s){' '}
                            {seg.slides.map((n) => n + 1).join(', ')}.
                            {seg.contributors.length ? ` Contributed by: ${seg.contributors.join(', ')}.` : ''}
                          </p>
                          {seg.highlights.map((h, hIdx) => (
                            <p key={hIdx} className="text-[#9AA0A6] italic pl-2 border-l border-[#69DB7C]/40">
                              "{h}"
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#9AA0A6]">
                    The session just started. Live timeline markers will appear automatically as the host annotates the board.
                  </p>
                )}
              </div>

              {/* Lecturer Messages / Notices */}
              {data.lecturerMessages && data.lecturerMessages.length > 0 && (
                <div className="rounded-3xl bg-[#0F1713] border border-[#3C4043]/60 p-5 space-y-2.5">
                  <div className="text-xs font-mono font-medium text-[#69DB7C] flex items-center gap-1.5">
                    <ChatCircleText size={16} />
                    <span>KEY NOTICES FROM LECTURER</span>
                  </div>
                  <div className="space-y-2">
                    {data.lecturerMessages.map((msg) => (
                      <div key={msg.id} className="p-3 rounded-2xl bg-[#141E19] border border-[#3C4043]/40 text-xs">
                        <div className="flex items-center justify-between font-mono text-[10px] text-[#69DB7C] mb-1">
                          <span>{msg.senderName}</span>
                          <span className="text-[#9AA0A6]">
                            {typeof msg.timestamp === 'number'
                              ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : msg.timestamp}
                          </span>
                        </div>
                        <p className="text-[#E3E3E3] leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl bg-[#0F1713] border border-[#3C4043]/60 p-6 text-center text-xs space-y-2">
              <p className="text-[#E3E3E3] font-medium">Session in progress</p>
              <p className="text-[#9AA0A6]">
                You are currently in room <strong className="text-white">{roomCode}</strong>. Drawing strokes and chat notes are synchronized live.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0F1713] border-t border-[#3C4043]/60 shrink-0">
          <span className="text-xs font-mono text-[#9AA0A6] tabular-nums">
            Telemetry overhead: &lt; 2 KB JSON
          </span>
          <button
            onClick={onClose}
            className={`btn-google inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm cursor-pointer ${
              isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
            }`}
          >
            <CheckCircle size={17} weight="regular" />
            <span>Caught up</span>
            <ArrowRight size={15} weight="regular" />
          </button>
        </div>
      </div>
    </div>
  );
};
