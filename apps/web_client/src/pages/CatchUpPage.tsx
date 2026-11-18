import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Sparkle,
  CheckCircle,
  ClockCountdown,
  ChatCircleText,
  Users,
  ArrowsClockwise,
  Copy,
  Check,
  FloppyDisk,
  PaperPlaneTilt,
  Key,
  WarningCircle,
  ListBullets,
  Function as FunctionIcon,
  Compass,
  VideoCamera,
  BookOpenText,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { DEMO_CATCHUP_CATALOG, DEMO_NOTES } from '../data/mockCatalog';
import { AiCatchUpSummary, CatchUpSessionItem } from '../types/chalk';
import { getCurrentFirebaseIdToken } from '../lib/firebase';

const GEMINI_KEY_STORAGE = 'chalk_gemini_api_key_v1';

export const CatchUpPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { isDark, isDemoMode, courses, currentUser, topics, announcements, assignments } = useApp();
  const navigate = useNavigate();

  const isLecturer = currentUser?.role === 'lecturer';
  const userCourses = useMemo(
    () =>
      courses.filter((c) => {
        if (c.isArchived || !currentUser) return false;
        const uidLower = (currentUser.id || '').toLowerCase();
        if (isLecturer) {
          return (
            (c.lecturerId || '').toLowerCase() === uidLower ||
            (Boolean(currentUser.name) &&
              c.lecturerName.toLowerCase() === currentUser.name.toLowerCase()) ||
            Boolean(
              c.members?.some(
                (m) => (m.id || '').toLowerCase() === uidLower && m.role === 'lecturer'
              )
            )
          );
        }
        return (
          Boolean(
            c.members?.some(
              (m) =>
                (m.id || '').toLowerCase() === uidLower ||
                (Boolean(m.matricOrStaffId) &&
                  Boolean(currentUser.matricOrStaffId) &&
                  m.matricOrStaffId === currentUser.matricOrStaffId)
            )
          ) || Boolean(c.memberIds?.some((id) => id.toLowerCase() === uidLower))
        );
      }),
    [courses, currentUser, isLecturer]
  );

  const [sessions, setSessions] = useState<CatchUpSessionItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<CatchUpSessionItem | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);

  const [copiedSummary, setCopiedSummary] = useState(false);
  const [savingToNotes, setSavingToNotes] = useState(false);
  const [savedToNotes, setSavedToNotes] = useState(false);

  const [apiKeyInput, setApiKeyInput] = useState<string>(() => {
    try {
      return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
    } catch {
      return '';
    }
  });

  // Follow-up Q&A state per selected session
  const [followUpInput, setFollowUpInput] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [qaThread, setQaThread] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const qaEndRef = useRef<HTMLDivElement | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = await getCurrentFirebaseIdToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (currentUser?.id) {
      headers.Authorization = `Bearer mock_firebase_token_${currentUser.id.replace(
        /[^a-zA-Z0-9_-]/g,
        ''
      )}`;
    }
    return headers;
  }, [currentUser?.id]);

  // Fetch recorded sessions list
  useEffect(() => {
    let active = true;
    const fetchSessions = async () => {
      setIsLoadingList(true);
      if (isDemoMode) {
        if (active) {
          setSessions(DEMO_CATCHUP_CATALOG);
          const match =
            DEMO_CATCHUP_CATALOG.find((s) => s.id === sessionId) ||
            DEMO_CATCHUP_CATALOG[0] ||
            null;
          setSelectedSession(match);
          setIsLoadingList(false);
        }
        return;
      }

      try {
        const headers = await getAuthHeaders();
        const res = await fetch('http://localhost:4000/api/catch-up/sessions', { headers });
        if (res.ok && active) {
          const json = await res.json();
          if (Array.isArray(json.sessions) && json.sessions.length > 0) {
            const mapped: CatchUpSessionItem[] = json.sessions
              .filter((r: any) =>
                userCourses.some(
                  (c) =>
                    c.id === r.courseId ||
                    c.liveRoomCode.toLowerCase() === String(r.roomId || '').toLowerCase()
                )
              )
              .map((r: any) => ({
                id: r.id,
                roomId: r.roomId,
                courseId: r.courseId,
                courseCode: r.courseCode || 'Lecture',
                title: r.title,
                lecturerName: r.lecturerName,
                recordedAt: r.recordedAt,
                endedAt: r.endedAt,
                durationMs: r.durationMs || 180000,
                strokeCount: r.strokeCount,
                chatCount: r.chatCount,
                participantCount: r.participantCount,
                aiSummary: r.aiSummary,
              }));
            setSessions(mapped);
            const match = mapped.find((m) => m.id === sessionId) || mapped[0] || null;
            setSelectedSession(match);
          } else {
            setSessions([]);
            setSelectedSession(null);
          }
        } else if (active) {
          setSessions([]);
          setSelectedSession(null);
        }
      } catch {
        if (active) {
          setSessions([]);
          setSelectedSession(null);
        }
      } finally {
        if (active) {
          setIsLoadingList(false);
        }
      }
    };

    fetchSessions();
    return () => {
      active = false;
    };
  }, [currentUser?.id, getAuthHeaders, isDemoMode, sessionId, userCourses]);

  const buildCourseContextForSession = useCallback(
    (session: CatchUpSessionItem) => {
      const matchedCourse = courses.find(
        (c) =>
          c.id === session.courseId ||
          (session.roomId && c.liveRoomCode.toLowerCase() === session.roomId.toLowerCase())
      );
      const cid = matchedCourse?.id;
      return {
        department: matchedCourse?.department,
        subject: matchedCourse?.subject,
        topics: cid
          ? topics
            .filter((t) => t.courseId === cid)
            .sort((a, b) => a.order - b.order)
            .map((t) => t.name)
          : [],
        recentAnnouncements: cid
          ? announcements
            .filter((a) => a.courseId === cid)
            .slice(0, 3)
            .map((a) => `${a.authorName}: ${a.content}`)
          : [],
        assignments: cid
          ? assignments
            .filter((a) => a.courseId === cid)
            .slice(0, 3)
            .map((a) => `${a.title} (Due: ${a.dueDate})`)
          : [],
      };
    },
    [announcements, assignments, courses, topics]
  );

  const synthesizeSession = useCallback(
    async (session: CatchUpSessionItem, options?: { regenerate?: boolean; overrideKey?: string }) => {
      if (!session) return;
      const effectiveKey = (options?.overrideKey ?? apiKeyInput).trim();
      if (effectiveKey) {
        try {
          localStorage.setItem(GEMINI_KEY_STORAGE, effectiveKey);
        } catch {
          // ignore
        }
      }

      setSynthesizing(true);
      setFollowUpError(null);

      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `http://localhost:4000/api/catch-up/sessions/${encodeURIComponent(session.id)}/synthesize`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              regenerate: Boolean(options?.regenerate),
              courseContext: buildCourseContextForSession(session),
              sessionSnapshot: {
                title: session.title,
                courseCode: session.courseCode,
                courseId: session.courseId,
                lecturerName: session.lecturerName,
                elapsedMs: session.durationMs,
                participantCount: session.participantCount || 1,
                strokes: [],
                chat: [],
                transcript: [],
                polls: [],
                questions: [],
              },
              ...(effectiveKey ? { geminiApiKey: effectiveKey } : {}),
            }),
          }
        );

        if (res.ok) {
          const json = await res.json();
          const updated: CatchUpSessionItem = {
            ...session,
            aiSummary: json.aiSummary as AiCatchUpSummary | undefined,
            aiError: json.aiError,
            aiErrorCode: json.aiErrorCode,
          };
          setSelectedSession(updated);
          setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        } else {
          const errJson = await res.json().catch(() => null);
          const updated: CatchUpSessionItem = {
            ...session,
            aiSummary: undefined,
            aiError: errJson?.aiError || errJson?.error || 'Could not generate AI synthesis.',
            aiErrorCode: errJson?.aiErrorCode,
          };
          setSelectedSession(updated);
        }
      } catch {
        setSelectedSession((prev) =>
          prev
            ? {
              ...prev,
              aiSummary: undefined,
              aiError:
                'Could not reach the Chalk backend server on port 4000. Ensure apps/node_backend is running.',
            }
            : prev
        );
      } finally {
        setSynthesizing(false);
      }
    },
    [apiKeyInput, buildCourseContextForSession, getAuthHeaders]
  );

  // Synthesize on demand as soon as the page opens or a session is selected
  useEffect(() => {
    setQaThread([]);
    setFollowUpError(null);
    setSavedToNotes(false);
    setCopiedSummary(false);

    if (selectedSession) {
      synthesizeSession(selectedSession);
    }
  }, [selectedSession?.id]);

  useEffect(() => {
    if (qaThread.length > 0) {
      qaEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [qaThread, followUpLoading]);

  const formatMs = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDurationLabel = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const buildMarkdownSummary = (): string => {
    if (!selectedSession) return '';
    const ai = selectedSession.aiSummary;
    const lines: string[] = [];
    const timeWindow = `00:00 → ${formatMs(selectedSession.durationMs)}`;
    lines.push(
      `## Catch Up! AI Session Summary (${selectedSession.courseCode ? `${selectedSession.courseCode} • ` : ''}${selectedSession.title})`
    );
    lines.push(
      `*Session window: ${timeWindow} • Lecturer: ${selectedSession.lecturerName || 'Instructor'}*\n`
    );

    if (ai) {
      lines.push(`### Executive Overview`);
      lines.push(`${ai.overview}\n`);

      if (ai.takeaways.length > 0) {
        lines.push(`### Key Takeaways`);
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
      lines.push(`### Follow-Up AI Q&A`);
      for (const item of qaThread) {
        lines.push(`- **${item.role === 'user' ? 'Question' : 'Chalk AI'}**: ${item.text}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  };

  const handleSaveToStudyNotes = async () => {
    const md = buildNoteSummary();
    if (!md || !selectedSession) return;
    const targetCourseId = selectedSession.courseId || userCourses[0]?.id || 'csc401';
    setSavingToNotes(true);

    try {
      if (isDemoMode) {
        const demoSavedKey = `chalk_demo_notes_${targetCourseId}`;
        const existing =
          localStorage.getItem(demoSavedKey) ?? DEMO_NOTES[targetCourseId] ?? '';
        const updated = existing.trim() ? `${existing.trim()}\n\n---\n\n${md}` : md;
        localStorage.setItem(demoSavedKey, updated);
        setSavedToNotes(true);
        setTimeout(() => setSavedToNotes(false), 3000);
        return;
      }

      const headers = await getAuthHeaders();
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

      await fetch(`http://localhost:4000/api/notes/${encodeURIComponent(targetCourseId)}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: updatedContent }),
      });

      setSavedToNotes(true);
      setTimeout(() => setSavedToNotes(false), 3000);
    } catch {
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
    if (!trimmed || followUpLoading || !selectedSession) return;

    const nextHistory = [...qaThread, { role: 'user' as const, text: trimmed }];
    setQaThread(nextHistory);
    setFollowUpInput('');
    setFollowUpLoading(true);
    setFollowUpError(null);

    try {
      const headers = await getAuthHeaders();
      const effectiveKey = apiKeyInput.trim();
      const res = await fetch(
        `http://localhost:4000/api/catch-up/sessions/${encodeURIComponent(selectedSession.id)}/ask`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            question: trimmed,
            history: qaThread,
            courseContext: buildCourseContextForSession(selectedSession),
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

  const handleLoadDemoCatalog = () => {
    setSessions(DEMO_CATCHUP_CATALOG);
    setSelectedSession(DEMO_CATCHUP_CATALOG[0]);
  };

  if (isLoadingList) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center text-xs opacity-60">
        Loading AI Catch Up syntheses...
      </div>
    );
  }

  if (!selectedSession || sessions.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
              AI Catch Up Library
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
              AI syntheses, key takeaways, chronological walkthroughs, and Q&amp;A from past studio classes.
            </p>
          </div>
        </div>

        <div
          className={`rounded-3xl border p-12 text-center space-y-4 ${isDark ? 'bg-[#141E19] border-[#3C4043]/60' : 'bg-[#F8F9FA] border-[#DADCE0]'
            }`}
        >
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-[#059669]/10 text-[#059669] dark:text-[#69DB7C]">
            <Sparkle size={32} weight="fill" />
          </div>
          <h2 className="font-display text-xl font-medium">No Catch Up Syntheses Yet</h2>
          <p className="text-xs opacity-70 max-w-md mx-auto leading-relaxed">
            When a live studio session ends, Chalk saves its transcript, board activity, and chat log so you can generate a full Catch Me Up AI synthesis anytime.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/studio"
              className="btn-google px-5 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium inline-flex items-center gap-2"
            >
              <VideoCamera size={16} />
              <span>Open Live Studio</span>
            </Link>
            {isDemoMode && (
              <button
                onClick={handleLoadDemoCatalog}
                className={`btn-google px-5 py-2.5 rounded-full border text-xs font-medium cursor-pointer ${isDark
                  ? 'border-[#3C4043] hover:bg-white/5 text-[#E3E3E3]'
                  : 'border-[#DADCE0] hover:bg-black/5 text-[#202124]'
                  }`}
              >
                + Load Sample Catch Up
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const ai = selectedSession.aiSummary;
  const elapsedWindowLabel = `00:00 → ${formatMs(selectedSession.durationMs)}`;

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#059669]/10 text-[#059669] dark:bg-[#69DB7C]/15 dark:text-[#69DB7C]">
              <Sparkle size={12} weight="fill" />
              <span>AI Catch Up</span>
            </span>
            <span className="text-xs opacity-60">
              {selectedSession.courseCode} • {selectedSession.lecturerName} •{' '}
              {new Date(selectedSession.recordedAt).toLocaleDateString()}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
            {selectedSession.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => synthesizeSession(selectedSession, { regenerate: true })}
            disabled={synthesizing}
            className={`btn-google px-3.5 py-2 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${isDark
              ? 'border-[#3C4043] hover:bg-white/5 text-[#E3E3E3]'
              : 'border-[#DADCE0] hover:bg-black/5 text-[#202124]'
              }`}
          >
            <ArrowsClockwise size={14} className={synthesizing ? 'animate-spin' : ''} />
            <span>{synthesizing ? 'Synthesizing...' : 'Regenerate'}</span>
          </button>

          <button
            onClick={handleSaveToStudyNotes}
            disabled={!ai || savingToNotes}
            className="btn-google px-4 py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {savedToNotes ? <Check size={14} /> : <FloppyDisk size={14} />}
            <span>{savedToNotes ? 'Saved to Notes!' : 'Save to Notes'}</span>
          </button>
        </div>
      </div>

      {/* Session Selector Strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {sessions.map((item) => {
          const isCurrent = item.id === selectedSession.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setSelectedSession(item);
                navigate(`/catch-up/${item.id}`);
              }}
              className={`shrink-0 px-4 py-3 rounded-2xl border text-left transition-all cursor-pointer max-w-xs ${isCurrent
                ? isDark
                  ? 'bg-[#182920] border-[#69DB7C] text-[#E3E3E3]'
                  : 'bg-[#ECFDF5] border-[#059669] text-[#202124]'
                : isDark
                  ? 'bg-[#141E19] border-[#3C4043]/60 text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'bg-white border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
                }`}
            >
              <div className="flex items-center justify-between gap-3 text-[11px] font-mono mb-0.5">
                <span className="font-semibold text-[#059669] dark:text-[#69DB7C]">
                  {item.courseCode}
                </span>
                <span className="opacity-70">{formatDurationLabel(item.durationMs)}</span>
              </div>
              <p className="text-xs font-medium truncate">{item.title}</p>
            </button>
          );
        })}
      </div>

      {/* Main Catch Up Synthesis Card */}
      <div
        className={`rounded-3xl border p-5 sm:p-7 space-y-6 ${isDark ? 'bg-[#141E19] border-[#3C4043]/70' : 'bg-white border-[#DADCE0]'
          }`}
      >
        {/* AI API Key Warning Bar if missing */}
        {selectedSession.aiErrorCode === 'GEMINI_API_KEY_MISSING' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <WarningCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-medium text-amber-500">AI API Key Required</p>
                <p className="opacity-80 mt-0.5">
                  {selectedSession.aiError} You can paste your API key below to synthesize this session right now:
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pl-6">
              <div className="relative flex-1">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste AI API key..."
                  className={`w-full pl-8 pr-3 py-2 rounded-xl border text-xs outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
                    }`}
                />
              </div>
              <button
                onClick={() =>
                  synthesizeSession(selectedSession, {
                    regenerate: true,
                    overrideKey: apiKeyInput,
                  })
                }
                disabled={!apiKeyInput.trim() || synthesizing}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0F1713] text-xs font-medium cursor-pointer disabled:opacity-40"
              >
                Synthesize with Key
              </button>
            </div>
          </div>
        )}

        {/* Generic AI Error */}
        {selectedSession.aiError &&
          selectedSession.aiErrorCode !== 'GEMINI_API_KEY_MISSING' &&
          !synthesizing && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs flex items-start gap-2.5">
              <WarningCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-500">AI Synthesis Error</p>
                <p className="opacity-80 mt-0.5">{selectedSession.aiError}</p>
              </div>
            </div>
          )}

        {synthesizing ? (
          <div className="py-16 text-center space-y-3">
            <Sparkle size={28} weight="fill" className="mx-auto text-[#059669] dark:text-[#69DB7C] animate-pulse" />
            <p className="text-sm font-medium">
              Synthesizing session from 00:00 → {formatMs(selectedSession.durationMs)} with Chalk AI...
            </p>
            <p className="text-xs opacity-60">
              Analyzing speech transcript, chalkboard strokes, lecturer chat, and Q&amp;A.
            </p>
          </div>
        ) : ai ? (
          <>
            {/* Executive Overview */}
            <div
              className={`p-5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-[#0F1713] border-[#3C4043]/60' : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-[#059669] dark:text-[#69DB7C]">
                  <Sparkle size={15} weight="fill" />
                  <span>Executive Overview ({elapsedWindowLabel})</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] opacity-60 font-mono">
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} /> {selectedSession.participantCount || 1}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClockCountdown size={12} /> {formatDurationLabel(selectedSession.durationMs)}
                  </span>
                </div>
              </div>
              <p className="text-sm leading-relaxed">{ai.overview}</p>
            </div>

            {/* Key Takeaways + Key Concepts & Formulas */}
            {(ai.takeaways.length > 0 || ai.keyConceptsOrFormulas.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {ai.takeaways.length > 0 && (
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-70">
                      <ListBullets size={15} />
                      <span>Key Takeaways</span>
                    </div>
                    <ul className="space-y-2.5">
                      {ai.takeaways.map((item, idx) => (
                        <li
                          key={idx}
                          className={`p-3.5 rounded-2xl border text-xs leading-relaxed flex items-start gap-2.5 ${isDark
                            ? 'bg-[#0F1713]/70 border-[#3C4043]/50'
                            : 'bg-[#F8F9FA] border-[#DADCE0]'
                            }`}
                        >
                          <CheckCircle
                            size={16}
                            weight="fill"
                            className="text-[#059669] dark:text-[#69DB7C] shrink-0 mt-0.5"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {ai.keyConceptsOrFormulas.length > 0 && (
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-70">
                      <FunctionIcon size={15} />
                      <span>Key Concepts &amp; Formulas</span>
                    </div>
                    <div className="space-y-2">
                      {ai.keyConceptsOrFormulas.map((formula, idx) => (
                        <div
                          key={idx}
                          className={`px-3.5 py-2.5 rounded-2xl border font-mono text-xs ${isDark
                            ? 'bg-[#0F1713] border-[#69DB7C]/30 text-[#69DB7C]'
                            : 'bg-[#ECFDF5] border-[#059669]/30 text-[#059669]'
                            }`}
                        >
                          {formula}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chronological Session Walkthrough */}
            {ai.walkthrough.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-70">
                  <Compass size={15} />
                  <span>Chronological Session Walkthrough</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ai.walkthrough.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border space-y-2 ${isDark
                        ? 'bg-[#0F1713]/70 border-[#3C4043]/50'
                        : 'bg-[#F8F9FA] border-[#DADCE0]'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="px-2 py-0.5 rounded-full bg-[#059669]/15 text-[#059669] dark:text-[#69DB7C]">
                          {step.timeRange}
                        </span>
                        {typeof step.slideIndex === 'number' && (
                          <span className="opacity-60">Slide {step.slideIndex + 1}</span>
                        )}
                      </div>
                      <h3 className="text-xs font-semibold">{step.title}</h3>
                      <p className="text-xs opacity-75 leading-relaxed">{step.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Follow-Up Q&A */}
            <div
              className={`pt-5 border-t space-y-3 ${isDark ? 'border-[#3C4043]/60' : 'border-[#DADCE0]'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-70">
                  <ChatCircleText size={15} />
                  <span>Ask Chalk AI About This Session</span>
                </div>
                <Link
                  to="/study"
                  className="text-xs text-[#059669] dark:text-[#69DB7C] hover:underline inline-flex items-center gap-1"
                >
                  <BookOpenText size={14} />
                  <span>Open Study Hub</span>
                </Link>
              </div>

              {qaThread.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {[
                    'Summarize the main proof or derivation in 3 bullets',
                    'What formulas should I memorize for exams?',
                    'Explain the trickiest part of this session simply',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => askFollowUpQuestion(prompt)}
                      className={`px-3 py-1.5 rounded-full border text-[11px] cursor-pointer transition-colors ${isDark
                        ? 'border-[#3C4043] hover:bg-white/5 text-[#9AA0A6] hover:text-[#E3E3E3]'
                        : 'border-[#DADCE0] hover:bg-black/5 text-[#5F6368] hover:text-[#202124]'
                        }`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {qaThread.length > 0 && (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {qaThread.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user'
                        ? isDark
                          ? 'bg-[#182920] border border-[#69DB7C]/30 ml-8'
                          : 'bg-[#ECFDF5] border border-[#059669]/20 ml-8'
                        : isDark
                          ? 'bg-[#0F1713] border border-[#3C4043]/60 mr-8'
                          : 'bg-[#F8F9FA] border border-[#DADCE0] mr-8'
                        }`}
                    >
                      <span className="font-semibold block mb-1 text-[10px] uppercase tracking-wider opacity-60">
                        {msg.role === 'user' ? 'You' : 'Chalk AI'}
                      </span>
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))}
                  {followUpLoading && (
                    <div className="text-xs opacity-60 pl-2">Chalk AI is thinking...</div>
                  )}
                  <div ref={qaEndRef} />
                </div>
              )}

              {followUpError && (
                <p className="text-xs text-red-500">{followUpError}</p>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  askFollowUpQuestion(followUpInput);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={followUpInput}
                  onChange={(e) => setFollowUpInput(e.target.value)}
                  placeholder={`Ask a follow-up question about "${selectedSession.title}"...`}
                  className={`flex-1 px-4 py-2.5 rounded-full border text-xs outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                />
                <button
                  type="submit"
                  disabled={!followUpInput.trim() || followUpLoading}
                  className="btn-google px-4 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  <PaperPlaneTilt size={14} weight="fill" />
                  <span>Ask</span>
                </button>
              </form>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

