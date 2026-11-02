import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  DownloadSimple,
  BookmarkSimple,
  BookOpenText,
  CheckCircle,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { REPLAY_CATALOG } from '../data/mockCatalog';
import { VectorCanvas } from '../components/VectorCanvas';
import { DvrReplayItem, StrokeData } from '../types/chalk';
import { getCurrentFirebaseIdToken } from '../lib/firebase';

export const ReplaysPage: React.FC = () => {
  const { replayId } = useParams<{ replayId: string }>();
  const { isDark, currentUser } = useApp();
  const navigate = useNavigate();

  const [replays, setReplays] = useState<DvrReplayItem[]>(REPLAY_CATALOG);
  const [selectedReplay, setSelectedReplay] = useState<DvrReplayItem>(() => {
    return REPLAY_CATALOG.find((r) => r.id === replayId) || REPLAY_CATALOG[0];
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentPositionMs, setCurrentPositionMs] = useState<number>(30000);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  // Fetch real recordings list from backend
  useEffect(() => {
    let active = true;
    const fetchList = async () => {
      try {
        const token = await getCurrentFirebaseIdToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        } else if (currentUser?.id) {
          headers.Authorization = `Bearer mock_firebase_token_${currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
        }
        const res = await fetch('http://localhost:4000/api/replays', { headers });
        if (res.ok) {
          const json = await res.json();
          if (active && Array.isArray(json.replays) && json.replays.length > 0) {
            const mapped: DvrReplayItem[] = json.replays.map((r: any) => ({
              id: r.id,
              roomId: r.roomId,
              courseId: r.courseId,
              courseCode: r.courseCode || 'CSC 401',
              title: r.title,
              lecturerName: r.lecturerName,
              recordedAt: new Date(r.recordedAt).toLocaleDateString(),
              durationMs: r.durationMs || 180000,
              totalSizeKb: r.eventsSizeKb || 450,
              mp4EquivalentMb: Math.max(12, Math.round(((r.durationMs || 180000) / 1000 / 60) * 12)),
              savingsPercent: 97.4,
              chapters: (r.chapters || []).map((ch: any) => ({
                timeMs: ch.timestampMs,
                timestampMs: ch.timestampMs,
                label: ch.title || `Section ${ch.slideIndex + 1}`,
                slideIndex: ch.slideIndex,
              })),
              events: [],
            }));
            setReplays([...mapped, ...REPLAY_CATALOG]);
          }
        }
      } catch {
        // fallback to catalog
      }
    };
    fetchList();
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  // Fetch specific recording full events if selected from server
  useEffect(() => {
    let active = true;
    const targetId = replayId || replays[0]?.id;
    if (!targetId) return;

    // Check if it's in local catalog
    const local = REPLAY_CATALOG.find((r) => r.id === targetId);
    if (local) {
      setSelectedReplay(local);
      return;
    }

    // Otherwise fetch details from server
    const fetchDetails = async () => {
      try {
        const token = await getCurrentFirebaseIdToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        } else if (currentUser?.id) {
          headers.Authorization = `Bearer mock_firebase_token_${currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
        }
        const res = await fetch(`http://localhost:4000/api/replays/${encodeURIComponent(targetId)}`, { headers });
        if (res.ok) {
          const json = await res.json();
          if (active && json.replay) {
            const r = json.replay;
            const fullItem: DvrReplayItem = {
              id: r.id,
              roomId: r.roomId,
              courseId: r.courseId,
              courseCode: r.courseCode || 'CSC 401',
              title: r.title,
              lecturerName: r.lecturerName,
              recordedAt: new Date(r.recordedAt).toLocaleDateString(),
              durationMs: r.durationMs,
              totalSizeKb: r.eventsSizeKb || 512,
              mp4EquivalentMb: Math.max(12, Math.round((r.durationMs / 1000 / 60) * 12)),
              savingsPercent: 97.6,
              chapters: (r.chapters || []).map((ch: any) => ({
                timeMs: ch.timestampMs,
                timestampMs: ch.timestampMs,
                label: ch.title || `Slide ${ch.slideIndex + 1}`,
                slideIndex: ch.slideIndex,
              })),
              events: (r.events || []).map((e: any) => ({
                t: e.t,
                stroke: e.data as StrokeData,
              })),
            };
            setSelectedReplay(fullItem);
          }
        }
      } catch {
        // fallback
      }
    };
    fetchDetails();
    return () => {
      active = false;
    };
  }, [replayId, replays, currentUser?.id]);

  // Timeline playback ticker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentPositionMs((prev) => {
        const next = prev + 250 * playbackSpeed;
        if (next >= selectedReplay.durationMs) {
          setIsPlaying(false);
          return selectedReplay.durationMs;
        }
        return next;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, selectedReplay.durationMs]);

  const activeStrokes = selectedReplay.events
    .filter((ev) => ev.t <= currentPositionMs && ev.stroke)
    .map((ev) => ev.stroke);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const sec = String(totalSec % 60).padStart(2, '0');
    return `${min}:${sec}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header & Recording Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-0.5 rounded-full font-mono text-xs font-medium ${
                isDark
                  ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                  : 'bg-[#ECFDF5] text-[#059669]'
              }`}
            >
              Vector DVR Player
            </span>
            <span
              className={`font-mono text-xs font-medium ${
                isDark ? 'text-[#81C995]' : 'text-[#188038]'
              }`}
            >
              {selectedReplay.totalSizeKb} KB vs {selectedReplay.mp4EquivalentMb} MB MP4 ({selectedReplay.savingsPercent}% Saved)
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight mt-2">
            {selectedReplay.title}
          </h1>
          <p
            className={`text-xs mt-1 ${
              isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
            }`}
          >
            {selectedReplay.courseCode} • {selectedReplay.lecturerName} • Recorded {selectedReplay.recordedAt}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setDownloadedId(selectedReplay.id)}
            className={`btn-google px-4 py-2.5 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
              downloadedId === selectedReplay.id
                ? isDark
                  ? 'bg-[#81C995]/15 border-[#81C995]/40 text-[#81C995]'
                  : 'bg-[#E6F4EA] border-[#188038]/30 text-[#188038]'
                : isDark
                ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                : 'bg-white border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
            }`}
          >
            {downloadedId === selectedReplay.id ? (
              <>
                <CheckCircle size={16} weight="fill" />
                <span>Saved Offline ({selectedReplay.totalSizeKb} KB)</span>
              </>
            ) : (
              <>
                <DownloadSimple size={16} weight="regular" />
                <span>Download DVR ({selectedReplay.totalSizeKb} KB)</span>
              </>
            )}
          </button>

          <Link
            to="/study"
            className={`btn-google px-4 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-1.5 ${
              isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
            }`}
          >
            <BookOpenText size={16} weight="regular" />
            <span>Practice Quiz</span>
          </Link>
        </div>
      </div>

      {/* Recording Switcher Pills */}
      <div className="flex flex-wrap gap-2">
        {replays.map((item) => {
          const isCurrent = item.id === selectedReplay.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setCurrentPositionMs(15000);
                setIsPlaying(true);
                navigate(`/replays/${item.id}`);
              }}
              className={`btn-google px-4 py-2 rounded-full border text-xs font-medium cursor-pointer ${
                isCurrent
                  ? isDark
                    ? 'bg-[#69DB7C]/15 border-[#69DB7C]/30 text-[#69DB7C]'
                    : 'bg-[#ECFDF5] border-[#059669]/20 text-[#059669]'
                  : isDark
                  ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
              }`}
            >
              {item.courseCode}: {item.title.split(':')[0]}
            </button>
          );
        })}
      </div>

      {/* Main Player Grid: Vector Stage + Smart Chapters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 cols: Vector Canvas + Timeline Scrubber */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative h-[340px] sm:h-[420px] rounded-3xl border border-[#3C4043] overflow-hidden bg-[#0F1713]">
            <VectorCanvas
              strokes={activeStrokes}
              interactive={false}
              activeSlideIndex={0}
            />

            <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-[#141E19]/90 border border-[#3C4043] text-xs font-mono text-[#E3E3E3] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#69DB7C]" />
              <span>
                {selectedReplay.lecturerName} • Vector Events Rendered: {activeStrokes.length}/{selectedReplay.events.length || activeStrokes.length}
              </span>
            </div>
          </div>

          {/* Scrubber Control Bar */}
          <div
            className={`p-5 rounded-3xl border space-y-3 ${
              isDark
                ? 'bg-[#141E19] border-[#3C4043]'
                : 'bg-white border-[#DADCE0]'
            }`}
          >
            <input
              type="range"
              aria-label="Replay timeline scrubber"
              min={0}
              max={selectedReplay.durationMs}
              value={currentPositionMs}
              onChange={(e) => setCurrentPositionMs(Number(e.target.value))}
              className="w-full accent-[#059669] h-1.5 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-xs sm:text-sm font-medium tabular-nums">
                {formatTime(currentPositionMs)} / {formatTime(selectedReplay.durationMs)}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPositionMs((p) => Math.max(0, p - 15000))
                  }
                  title="Rewind 15s"
                  className={`btn-google p-2 rounded-full cursor-pointer ${
                    isDark ? 'hover:bg-[#28292A]' : 'hover:bg-[#F1F3F4]'
                  }`}
                >
                  <Rewind size={18} weight="regular" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  className={`btn-google w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
                    isDark
                      ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                      : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
                >
                  {isPlaying ? (
                    <Pause size={18} weight="fill" />
                  ) : (
                    <Play size={18} weight="fill" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPositionMs((p) =>
                      Math.min(selectedReplay.durationMs, p + 15000)
                    )
                  }
                  title="Forward 15s"
                  className={`btn-google p-2 rounded-full cursor-pointer ${
                    isDark ? 'hover:bg-[#28292A]' : 'hover:bg-[#F1F3F4]'
                  }`}
                >
                  <FastForward size={18} weight="regular" />
                </button>
              </div>

              <select
                aria-label="Playback speed"
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className={`px-3 py-1.5 rounded-full border font-mono text-xs font-medium cursor-pointer ${
                  isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#059669]'
                }`}
              >
                <option value={1}>1.0x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right 4 cols: Smart Chapters List */}
        <div
          className={`lg:col-span-4 rounded-3xl border p-6 flex flex-col justify-between ${
            isDark
              ? 'bg-[#141E19] border-[#3C4043]'
              : 'bg-white border-[#DADCE0]'
          }`}
        >
          <div className="space-y-4">
            <div
              className={`flex items-center gap-2 font-display font-medium text-base ${
                isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
              }`}
            >
              <BookmarkSimple size={19} weight="regular" />
              <span>Smart Lecture Chapters</span>
            </div>

            <div className="space-y-2.5">
              {selectedReplay.chapters.map((ch, idx) => {
                const nextCh = selectedReplay.chapters[idx + 1];
                const markerTime = ch.timestampMs ?? ch.timeMs ?? 0;
                const nextMarker = nextCh ? (nextCh.timestampMs ?? nextCh.timeMs ?? Infinity) : Infinity;
                const isActive =
                  currentPositionMs >= markerTime && currentPositionMs < nextMarker;

                return (
                  <button
                    key={`${markerTime}_${idx}`}
                    type="button"
                    onClick={() => setCurrentPositionMs(markerTime)}
                    className={`btn-google w-full text-left p-3.5 rounded-2xl border text-xs font-medium cursor-pointer ${
                      isActive
                        ? isDark
                          ? 'bg-[#69DB7C]/15 border-[#69DB7C]/40 text-[#69DB7C]'
                          : 'bg-[#ECFDF5] border-[#059669]/30 text-[#059669]'
                        : isDark
                        ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                        : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
                    }`}
                  >
                    {ch.label || ch.title || `Chapter ${idx + 1}`}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`pt-4 mt-4 border-t text-xs space-y-2 ${
              isDark ? 'border-[#3C4043] text-[#9AA0A6]' : 'border-[#DADCE0] text-[#5F6368]'
            }`}
          >
            <div
              className={`font-mono font-medium ${
                isDark ? 'text-[#E3E3E3]' : 'text-[#202124]'
              }`}
            >
              Dual-Track Vector DVR Format
            </div>
            <p className="leading-relaxed">
              Stores a 24 kbps Opus audio track synced with timestamped mathematical vector coordinates. Students replay hours of lectures offline with only ~11 MB of storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
