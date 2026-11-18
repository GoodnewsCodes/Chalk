import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ArrowsClockwise,
  Copy,
  Check,
  FloppyDisk,
  PaperPlaneTilt,
  Key,
  WarningCircle,
  ListBullets,
  Function,
  Compass,
} from '@phosphor-icons/react';
import { CatchUpData } from '../types/chalk';
import { getCurrentFirebaseIdToken } from '../lib/firebase';
import { DEMO_NOTES } from '../data/mockCatalog';

interface CatchUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode?: string;
}

const GEMINI_KEY_STORAGE = 'chalk_gemini_api_key_v1';

export const CatchUpModal: React.FC<CatchUpModalProps> = ({
  isOpen,
  onClose,
  roomCode = 'csc401-algo',
}) => {
  const {
    isDark,
    isDemoMode,
    currentUser,
    courses,
    announcements,
    assignments,
    topics,
    activeRoomInfo,
    participants,
    strokes,
    chatMessages,
    polls,
    questions,
    transcriptLog,
    sessionStartedAt,
    activeSlideIndex,
    totalSlides,
  } = useApp();

  const [data, setData] = useState<CatchUpData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [savingToNotes, setSavingToNotes] = useState(false);
  const [savedToNotes, setSavedToNotes] = useState(false);

  // Optional user-supplied Gemini API key if backend .env doesn't have GEMINI_API_KEY set yet
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => {
    try {
      return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });

  // Follow-up Q&A inside the Catch Me Up modal
  const [followUpInput, setFollowUpInput] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [qaThread, setQaThread] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const qaEndRef = useRef<HTMLDivElement | null>(null);

  const matchedCourse = useMemo(() => {
    const codeLower = (roomCode || '').toLowerCase();
    return (
      courses.find(
        (c) =>
          (activeRoomInfo.courseId && c.id === activeRoomInfo.courseId) ||
          c.liveRoomCode.toLowerCase() === codeLower ||
          c.id.toLowerCase() === codeLower
      ) || courses[0]
    );
  }, [activeRoomInfo.courseId, courses, roomCode]);

  const buildClientSnapshot = useCallback(() => {
    const now = Date.now();
    const startMs =
      sessionStartedAt && sessionStartedAt > 0 && sessionStartedAt <= now
        ? sessionStartedAt
        : now;
    const elapsedMs = Math.max(0, now - startMs);

    const courseId = matchedCourse?.id || activeRoomInfo.courseId || undefined;
    const courseTopics = courseId
      ? topics
        .filter((t) => t.courseId === courseId)
        .sort((a, b) => a.order - b.order)
        .map((t) => t.name)
      : [];
    const courseAnnouncements = courseId
      ? announcements
        .filter((a) => a.courseId === courseId)
        .slice(0, 3)
        .map((a) => `${a.authorName}: ${a.content}`)
      : [];
    const courseAssignments = courseId
      ? assignments
        .filter((a) => a.courseId === courseId)
        .slice(0, 3)
        .map((a) => `${a.title} (Due: ${a.dueDate})`)
      : [];

    return {
      title: activeRoomInfo.title || matchedCourse?.title || `Room ${roomCode}`,
      courseCode: activeRoomInfo.courseCode || matchedCourse?.code || '',
      courseId,
      lecturerName:
        activeRoomInfo.lecturerName || matchedCourse?.lecturerName || 'Lecturer',
      sessionStartedAt: startMs,
      elapsedMs,
      participantCount: Math.max(1, participants.length),
      activeSlideIndex,
      totalSlides,
      strokes,
      chat: chatMessages,
      transcript: transcriptLog,
      polls: polls.filter((p) => !p.roomId || p.roomId === roomCode),
      questions: questions.filter((q) => !q.roomId || q.roomId === roomCode),
      courseContext: {
        department: matchedCourse?.department,
        subject: matchedCourse?.subject,
        topics: courseTopics,
        recentAnnouncements: courseAnnouncements,
        assignments: courseAssignments,
      },
    };
  }, [
    activeRoomInfo.courseCode,
    activeRoomInfo.courseId,
    activeRoomInfo.lecturerName,
    activeRoomInfo.title,
    activeSlideIndex,
    announcements,
    assignments,
    chatMessages,
    matchedCourse,
    participants.length,
    polls,
    questions,
    roomCode,
    sessionStartedAt,
    strokes,
    topics,
    totalSlides,
    transcriptLog,
  ]);

  const generateCatchUp = useCallback(
    async (overrideKey?: string) => {
      if (!roomCode) return;
      setLoading(true);
      setFollowUpError(null);

      const snapshot = buildClientSnapshot();
      const effectiveKey = (overrideKey ?? apiKeyInput).trim();
      if (effectiveKey) {
        try {
          localStorage.setItem(GEMINI_KEY_STORAGE, effectiveKey);
        } catch {
          // ignore
        }
      }

      try {
        const res = await fetch(
          `http://localhost:4000/api/rooms/${encodeURIComponent(roomCode)}/catch-up`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...snapshot,
              ...(effectiveKey ? { geminiApiKey: effectiveKey } : {}),
            }),
          }
        );
        if (res.ok) {
          const json = (await res.json()) as CatchUpData;
          setData(json);
        } else {
          const errJson = await res.json().catch(() => null);
          setData({
            roomId: roomCode,
            title: snapshot.title,
            courseCode: snapshot.courseCode,
            courseId: snapshot.courseId,
            lecturerName: snapshot.lecturerName,
            isLive: true,
            sessionStartedAt: snapshot.sessionStartedAt,
            elapsedMs: snapshot.elapsedMs,
            participantCount: snapshot.participantCount,
            strokeCount: snapshot.strokes.length,
            chatCount: snapshot.chat.length,
            activeSlideIndex: snapshot.activeSlideIndex,
            totalSlides: snapshot.totalSlides,
            segments: [],
            slides: [],
            lecturerMessages: [],
            recentMessages: [],
            aiError: errJson?.aiError || errJson?.error || 'Could not generate AI summary.',
            aiErrorCode: errJson?.aiErrorCode,
          });
        }
      } catch {
        setData({
          roomId: roomCode,
          title: snapshot.title,
          courseCode: snapshot.courseCode,
          courseId: snapshot.courseId,
          lecturerName: snapshot.lecturerName,
          isLive: true,
          sessionStartedAt: snapshot.sessionStartedAt,
          elapsedMs: snapshot.elapsedMs,
          participantCount: snapshot.participantCount,
          strokeCount: snapshot.strokes.length,
          chatCount: snapshot.chat.length,
          activeSlideIndex: snapshot.activeSlideIndex,
          totalSlides: snapshot.totalSlides,
          segments: [],
          slides: [],
          lecturerMessages: [],
          recentMessages: [],
          aiError:
            'Could not reach the Chalk backend server on port 4000. Ensure apps/node_backend is running.',
        });
      } finally {
        setLoading(false);
      }
    },
    [apiKeyInput, buildClientSnapshot, roomCode]
  );

  // Trigger AI summary generation at the exact moment the modal opens
  useEffect(() => {
    if (!isOpen || !roomCode) return;
    setSavedToNotes(false);
    setCopiedSummary(false);
    generateCatchUp();
  }, [isOpen, roomCode]);

  useEffect(() => {
    if (qaThread.length > 0) {
      qaEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [qaThread, followUpLoading]);

  if (!isOpen) return null;

  const formatElapsed = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const formatMs = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const buildMarkdownSummary = (): string => {
    if (!data) return '';
    const ai = data.aiSummary;
    const lines: string[] = [];
    const timeWindow = `00:00 → ${formatMs(data.elapsedMs)}`;
    lines.push(
      `## Catch Me Up! AI Session Summary (${data.courseCode ? `${data.courseCode} • ` : ''}${data.title})`
    );
    lines.push(
      `*Captured at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Session window: ${timeWindow} • Lecturer: ${data.lecturerName || 'Instructor'}*\n`
    );

    if (ai) {
      lines.push(`### Executive Overview`);
      lines.push(`${ai.overview}\n`);

      if (ai.takeaways.length > 0) {
        lines.push(`### Key Takeaways (00:00 – ${formatMs(data.elapsedMs)})`);
        ai.takeaways.forEach((t) => lines.push(`- ${t}`));
        lines.push('');
      }

      if (ai.keyConceptsOrFormulas.length > 0) {
        lines.push(`### Key Concepts & Formulas`);
        ai.keyConceptsOrFormulas.forEach((f) => lines.push(`- \`${f}\``));
        lines.push('');
      }

      if (ai.walkthrough.length > 0) {
        lines.push(`### Chronological Session Walkthrough`);
        ai.walkthrough.forEach((w) => {
          const slideLabel =
            typeof w.slideIndex === 'number' ? ` (Slide ${w.slideIndex + 1})` : '';
          lines.push(`- **[${w.timeRange}] ${w.title}${slideLabel}**: ${w.summary}`);
        });
        lines.push('');
      }
    }

    if (qaThread.length > 0) {
      lines.push(`### In-Session AI Q&A`);
      for (const item of qaThread) {
        lines.push(
          `- **${item.role === 'user' ? 'Question' : 'Chalk AI'}**: ${item.text}`
        );
      }
      lines.push('');
    }

    return lines.join('\n');
  };

  const handleCopySummary = () => {
    const md = buildMarkdownSummary();
    if (!md) return;
    navigator.clipboard.writeText(md);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleSaveToStudyNotes = async () => {
    const md = buildMarkdownSummary();
    if (!md) return;
    const targetCourseId = data?.courseId || matchedCourse?.id || 'csc401';
    setSavingToNotes(true);

    try {
      if (isDemoMode) {
        const demoSavedKey = `chalk_demo_notes_${targetCourseId}`;
        const existing =
          localStorage.getItem(demoSavedKey) ?? DEMO_NOTES[targetCourseId] ?? '';
        const updated = existing.trim()
          ? `${existing.trim()}\n\n---\n\n${md}`
          : md;
        localStorage.setItem(demoSavedKey, updated);
        setSavedToNotes(true);
        setTimeout(() => setSavedToNotes(false), 3000);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const fbToken = await getCurrentFirebaseIdToken();
      if (fbToken) {
        headers.Authorization = `Bearer ${fbToken}`;
      } else if (currentUser?.id) {
        headers.Authorization = `Bearer mock_firebase_token_${currentUser.id.replace(
          /[^a-zA-Z0-9_-]/g,
          ''
        )}`;
      }

      let existingContent = '';
      const getRes = await fetch(
        `http://localhost:4000/api/notes/${encodeURIComponent(targetCourseId)}`,
        { headers }
      );
      if (getRes.ok) {
        const getJson = await getRes.json();
        if (typeof getJson?.content === 'string') {
          existingContent = getJson.content;
        }
      }

      const updatedContent = existingContent.trim()
        ? `${existingContent.trim()}\n\n---\n\n${md}`
        : md;

      await fetch(
        `http://localhost:4000/api/notes/${encodeURIComponent(targetCourseId)}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: updatedContent }),
        }
      );

      setSavedToNotes(true);
      setTimeout(() => setSavedToNotes(false), 3000);
    } catch {
      // Fallback to localStorage note persistence if offline
      const fallbackKey = `chalk_demo_notes_${targetCourseId}`;
      const existing = localStorage.getItem(fallbackKey) || '';
      localStorage.setItem(
        fallbackKey,
        existing.trim() ? `${existing.trim()}\n\n---\n\n${md}` : md
      );
      setSavedToNotes(true);
      setTimeout(() => setSavedToNotes(false), 3000);
    } finally {
      setSavingToNotes(false);
    }
  };

  const askFollowUpQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || followUpLoading) return;

    const nextHistory = [...qaThread, { role: 'user' as const, text: trimmed }];
    setQaThread(nextHistory);
    setFollowUpInput('');
    setFollowUpLoading(true);
    setFollowUpError(null);

    try {
      const snapshot = buildClientSnapshot();
      const effectiveKey = apiKeyInput.trim();
      const res = await fetch(
        `http://localhost:4000/api/rooms/${encodeURIComponent(roomCode)}/catch-up/ask`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: trimmed,
            history: qaThread,
            contextSnapshot: snapshot,
            ...(effectiveKey ? { geminiApiKey: effectiveKey } : {}),
          }),
        }
      );
      const json = await res.json().catch(() => null);
      if (res.ok && json?.answer) {
        setQaThread((prev) => [...prev, { role: 'assistant', text: json.answer }]);
      } else {
        setFollowUpError(
          json?.error || 'Could not get an answer from Chalk AI. Please verify your API key.'
        );
      }
    } catch {
      setFollowUpError('Failed to connect to the Chalk AI backend endpoint.');
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    askFollowUpQuestion(followUpInput);
  };

  const elapsedWindowLabel = data
    ? `00:00 → ${formatMs(data.elapsedMs)}`
    : '00:00 → Now';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="catchup-title"
        className="modal-surface w-full max-w-3xl rounded-3xl bg-[#141E19] border border-[#3C4043] text-[#E3E3E3] shadow-[0_24px_64px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col max-h-[88dvh]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[#3C4043]/60 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="catchup-title" className="text-base sm:text-lg font-medium text-[#E3E3E3]">
                  Catch Me Up! AI Session Summary
                </h2>
                {data?.aiSummary && !data?.aiError ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#69DB7C]/15 text-[#69DB7C] text-[11px] font-mono font-medium">
                    {elapsedWindowLabel}
                  </span>
                ) : data?.aiError ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-mono font-medium">
                    Unavailable
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-[#9AA0A6] mt-0.5 truncate">
                AI synthesis of live speech, chalkboard vectors, chat &amp; Q&amp;A.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => generateCatchUp()}
              disabled={loading}
              title="Refresh AI summary up to the current moment"
              className="btn-google px-3 py-1.5 rounded-full text-xs font-medium text-[#E3E3E3] bg-white/5 hover:bg-white/10 border border-[#3C4043] inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <ArrowsClockwise size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="btn-google p-2 rounded-full text-[#9AA0A6] hover:text-[#E3E3E3] hover:bg-white/10 cursor-pointer"
            >
              <X size={18} weight="regular" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-14 text-center text-xs text-[#9AA0A6] space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#69DB7C]/15 flex items-center justify-center text-[#69DB7C]">
                <Sparkle size={24} weight="fill" className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#E3E3E3]">
                  AI is synthesizing your live session briefing...
                </p>
                <p className="text-xs text-[#9AA0A6]">
                  Analyzing spoken transcript, {strokes.length} chalkboard strokes, slide transitions &amp; class discussion from 00:00 to now.
                </p>
              </div>
            </div>
          ) : data && (data.aiError || !data.aiSummary) ? (
            /* Dedicated Error State Screen - Strictly No Fallback Pseudo-Summary */
            <div className="py-8 px-4 text-center max-w-lg mx-auto space-y-6">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/5">
                <WarningCircle size={32} weight="duotone" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white tracking-tight">
                  {data.aiErrorCode === 'GEMINI_API_KEY_MISSING'
                    ? 'AI API Key Required'
                    : 'AI Session Summary Unavailable'}
                </h3>
                <p className="text-xs sm:text-sm text-[#9AA0A6] leading-relaxed">
                  {data.aiError ||
                    'Chalk AI was unable to synthesize the session summary for this class. Please ensure the AI service is configured and accessible.'}
                </p>
              </div>

              {/* AI API Key Configuration Input */}
              <div className="rounded-2xl bg-[#0F1713] border border-[#3C4043] p-4 text-left space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-[#E3E3E3]">
                  <Key size={16} className="text-[#69DB7C]" />
                  <span>Configure AI API Key</span>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (apiKeyInput.trim()) {
                      generateCatchUp(apiKeyInput.trim());
                    }
                  }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Paste AI API key..."
                      className="w-full pl-3.5 pr-3 py-2 rounded-xl bg-[#141E19] border border-[#3C4043] text-xs text-white placeholder-[#9AA0A6] focus:outline-none focus:border-[#69DB7C]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!apiKeyInput.trim() || loading}
                    className="btn-google px-4 py-2 rounded-xl bg-[#69DB7C] text-[#0F1713] font-semibold text-xs disabled:opacity-40 cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5"
                  >
                    <Sparkle size={14} weight="fill" />
                    <span>Save &amp; Generate</span>
                  </button>
                </form>
                <p className="text-[11px] text-[#9AA0A6]">
                  Keys are securely used by the Chalk backend to synthesize session summaries.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => generateCatchUp()}
                  disabled={loading}
                  className="btn-google px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-[#3C4043] inline-flex items-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <ArrowsClockwise size={15} className={loading ? 'animate-spin' : ''} />
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-google px-5 py-2.5 rounded-full text-xs font-semibold text-[#9AA0A6] hover:text-white hover:bg-white/5 border border-transparent hover:border-[#3C4043] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : data && data.aiSummary ? (
            <>
              {/* Session Overview Telemetry Strip */}
              <div className="rounded-3xl bg-[#0F1713] border border-[#3C4043]/60 p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-[#69DB7C] flex items-center gap-1.5">
                    <ClockCountdown size={15} weight="regular" />
                    <span>
                      COVERED: 00:00 → {formatMs(data.elapsedMs)} ({formatElapsed(data.elapsedMs)} elapsed)
                    </span>
                  </span>
                  <span className="text-[#9AA0A6] flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Users size={14} /> {data.participantCount} in room
                    </span>
                    <span className="flex items-center gap-1">
                      <Chalkboard size={14} /> Slide {data.activeSlideIndex + 1}/{data.totalSlides} • {data.strokeCount} strokes
                    </span>
                    <span className="flex items-center gap-1">
                      <ChatCircleText size={14} /> {data.chatCount} chats
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-white">
                    {data.courseCode ? `${data.courseCode} • ` : ''}
                    {data.title}
                    {data.lecturerName ? ` (${data.lecturerName})` : ''}
                  </div>
                </div>
              </div>

              {/* 1. AI Executive Summary & Key Takeaways */}
              <div className="rounded-3xl bg-[#0F1713] border border-[#69DB7C]/30 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#69DB7C] flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkle size={15} weight="fill" />
                    <span>Executive Summary &amp; Key Takeaways</span>
                  </div>
                  <span className="text-[11px] text-[#9AA0A6]">
                    00:00 – {formatMs(data.elapsedMs)}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#E3E3E3] leading-relaxed">
                  {data.aiSummary.overview}
                </p>

                {data.aiSummary.takeaways.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#3C4043]/50">
                    <div className="text-[11px] font-medium text-[#9AA0A6] flex items-center gap-1.5">
                      <ListBullets size={14} className="text-[#69DB7C]" />
                      <span>What you need to know right now:</span>
                    </div>
                    <ul className="space-y-2">
                      {data.aiSummary.takeaways.map((bullet, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-xs text-[#E3E3E3] leading-relaxed"
                        >
                          <span className="w-5 h-5 rounded-full bg-[#69DB7C]/15 text-[#69DB7C] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.aiSummary.keyConceptsOrFormulas.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#3C4043]/50">
                    <div className="text-[11px] font-medium text-[#9AA0A6] flex items-center gap-1.5">
                      <Function size={14} className="text-[#69DB7C]" />
                      <span>Key Concepts, Formulas &amp; Invariants Covered:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.aiSummary.keyConceptsOrFormulas.map((concept, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-xl bg-[#141E19] border border-[#3C4043] text-xs text-[#69DB7C] font-mono"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Chronological AI Walkthrough (00:00 -> Moment Pressed) */}
              {data.aiSummary.walkthrough.length > 0 && (
                <div className="rounded-3xl bg-[#0F1713] border border-[#3C4043]/60 p-5 space-y-3.5">
                  <div className="text-xs font-semibold text-[#69DB7C] flex items-center gap-1.5 uppercase tracking-wider">
                    <Compass size={16} />
                    <span>Chronological AI Walkthrough (00:00 → {formatMs(data.elapsedMs)})</span>
                  </div>

                  <div className="space-y-3">
                    {data.aiSummary.walkthrough.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-[#141E19] border border-[#3C4043]/50 flex flex-col sm:flex-row sm:items-start gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2.5 py-1 rounded-lg bg-[#69DB7C]/15 text-[#69DB7C] text-[11px] font-mono font-semibold tabular-nums">
                            {step.timeRange}
                          </span>
                          {typeof step.slideIndex === 'number' && (
                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-[#3C4043] text-[10px] text-[#9AA0A6]">
                              Slide {step.slideIndex + 1}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="font-medium text-white">{step.title}</div>
                          <p className="text-[#9AA0A6] leading-relaxed">{step.summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Interactive "Ask a Follow-Up Question" inside the Modal */}
              <div className="rounded-3xl bg-[#0F1713] border border-[#3C4043]/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#69DB7C] flex items-center gap-1.5 uppercase tracking-wider">
                    <ChatCircleText size={16} />
                    <span>Ask a Follow-Up Question About What You Missed</span>
                  </div>
                </div>

                {/* Quick Prompt Pills */}
                {qaThread.length === 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Explain the main concept on the chalkboard so far',
                      'Were any assignment deadlines or announcements mentioned?',
                      'Give me a 30-second recap of the formulas covered',
                    ].map((promptText) => (
                      <button
                        key={promptText}
                        type="button"
                        onClick={() => askFollowUpQuestion(promptText)}
                        disabled={followUpLoading}
                        className="px-3 py-1 rounded-full bg-[#141E19] hover:bg-white/10 border border-[#3C4043] text-[11px] text-[#9AA0A6] hover:text-white transition-colors cursor-pointer"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                )}

                {/* Q&A Conversation History */}
                {qaThread.length > 0 && (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {qaThread.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user'
                          ? 'bg-[#69DB7C]/15 border border-[#69DB7C]/30 text-white ml-6'
                          : 'bg-[#141E19] border border-[#3C4043]/60 text-[#E3E3E3] mr-4'
                          }`}
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#69DB7C] mb-1">
                          {msg.role === 'user' ? 'You' : 'Chalk AI'}
                        </div>
                        <p className="whitespace-pre-line">{msg.text}</p>
                      </div>
                    ))}
                    {followUpLoading && (
                      <div className="p-3 rounded-2xl bg-[#141E19] border border-[#3C4043]/60 text-xs text-[#9AA0A6] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#69DB7C] animate-ping" />
                        <span>Chalk AI is checking the live session log...</span>
                      </div>
                    )}
                    <div ref={qaEndRef} />
                  </div>
                )}

                {followUpError && (
                  <p className="text-xs text-amber-400">{followUpError}</p>
                )}

                <form onSubmit={handleFollowUpSubmit} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    disabled={followUpLoading}
                    placeholder="Ask Chalk AI about anything said or drawn in this session so far..."
                    className="flex-1 px-3.5 py-2.5 rounded-2xl bg-[#141E19] border border-[#3C4043] text-xs text-white placeholder-[#9AA0A6] focus:outline-none focus:border-[#69DB7C]"
                  />
                  <button
                    type="submit"
                    disabled={!followUpInput.trim() || followUpLoading}
                    className="btn-google px-4 py-2.5 rounded-2xl bg-[#69DB7C] text-[#0F1713] font-medium text-xs inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    <PaperPlaneTilt size={14} weight="fill" />
                    <span>Ask AI</span>
                  </button>
                </form>
              </div>

              {/* 4. Raw Live Session Signals (Lecturer Notices & Slide Breakdown) */}
              {((data.lecturerMessages && data.lecturerMessages.length > 0) ||
                (data.slides && data.slides.length > 0)) && (
                  <div className="rounded-3xl bg-[#0F1713] border border-[#3C4043]/60 p-5 space-y-3">
                    <div className="text-xs font-medium text-[#9AA0A6] flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#69DB7C]">
                        <Chalkboard size={15} />
                        <span>RAW STUDIO TELEMETRY &amp; NOTICES</span>
                      </span>
                      <span>{data.strokeCount} vector strokes</span>
                    </div>

                    {data.slides && data.slides.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {data.slides.map((s) => (
                          <span
                            key={s.slideIndex}
                            className="px-2.5 py-1 rounded-xl bg-white/5 text-[#E3E3E3] border border-[#3C4043]/50"
                          >
                            Slide {s.slideIndex + 1}: {s.strokeCount} strokes
                            {s.contributors.length
                              ? ` (${s.contributors.slice(0, 2).join(', ')})`
                              : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {data.lecturerMessages && data.lecturerMessages.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {data.lecturerMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className="p-3 rounded-2xl bg-[#141E19] border border-[#3C4043]/40 text-xs"
                          >
                            <div className="flex items-center justify-between text-[10px] text-[#69DB7C] mb-1">
                              <span>{msg.senderName} (Lecturer)</span>
                              <span className="text-[#9AA0A6]">
                                {typeof msg.timestamp === 'number'
                                  ? new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                  : msg.timestamp}
                              </span>
                            </div>
                            <p className="text-[#E3E3E3] leading-relaxed">{msg.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </>
          ) : null}
        </div>

        {/* Footer Actions: Save to Study Hub Notes, Copy Summary, Close */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-[#3C4043]/60 shrink-0 bg-[#0F1713]/60">
          {data?.aiSummary && !data?.aiError ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveToStudyNotes}
                  disabled={savingToNotes}
                  className="btn-google inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-[#141E19] hover:bg-white/10 text-[#E3E3E3] border border-[#3C4043] disabled:opacity-40 cursor-pointer"
                >
                  {savedToNotes ? (
                    <>
                      <Check size={14} className="text-[#69DB7C]" />
                      <span className="text-[#69DB7C]">Saved to Study Hub Notes!</span>
                    </>
                  ) : (
                    <>
                      <FloppyDisk size={14} className="text-[#69DB7C]" />
                      <span>{savingToNotes ? 'Saving...' : 'Save to Study Hub Notes'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="btn-google inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-[#141E19] hover:bg-white/10 text-[#E3E3E3] border border-[#3C4043] cursor-pointer"
                >
                  {copiedSummary ? (
                    <>
                      <Check size={14} className="text-[#69DB7C]" />
                      <span className="text-[#69DB7C]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className={`btn-google inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-xs sm:text-sm cursor-pointer ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                <CheckCircle size={17} weight="regular" />
                <span>Caught up</span>
                <ArrowRight size={15} weight="regular" />
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="btn-google px-5 py-2 rounded-full text-xs font-medium text-[#9AA0A6] hover:text-white hover:bg-white/10 cursor-pointer border border-[#3C4043]"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
