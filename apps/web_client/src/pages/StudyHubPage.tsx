import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpenText,
  Exam,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowCounterClockwise,
  Lightbulb,
  VideoCamera,
  FloppyDisk,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { STUDY_QUIZ_QUESTIONS } from '../data/mockCatalog';
import { QuizModel, QuizQuestionModel } from '../types/chalk';
import { getCurrentFirebaseIdToken } from '../lib/firebase';

export const StudyHubPage: React.FC = () => {
  const { isDark, courses, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'notes' | 'quiz'>('notes');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    courses[0]?.id || 'csc401'
  );

  // Notes state
  const [notesContent, setNotesContent] = useState<string>('');
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);

  // Quizzes state
  const [quizzes, setQuizzes] = useState<QuizModel[]>([]);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);

  // Active quiz attempt state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    correct: boolean;
    correctIndex: number;
    explanation: string;
  } | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});

  // Helper to make authenticated backend requests
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const token = await getCurrentFirebaseIdToken();
    if (token) return { Authorization: `Bearer ${token}` };
    if (currentUser?.id) {
      return {
        Authorization: `Bearer mock_firebase_token_${currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
      };
    }
    return {};
  };

  // Fetch course notes from backend
  useEffect(() => {
    let active = true;
    setNotesLoaded(false);

    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `http://localhost:4000/api/notes/${encodeURIComponent(selectedCourseId)}`,
          { headers }
        );
        if (res.ok) {
          const json = await res.json();
          if (active) {
            setNotesContent(
              json.content ||
                `# Study Notes: ${courses.find((c) => c.id === selectedCourseId)?.code || 'Course'}\n\n- Write your lecture insights and formulas here.\n- Syncs automatically to your student account across devices.`
            );
          }
        }
      } catch {
        if (active) {
          setNotesContent(
            `# Study Notes\n\n- Key formulas and lecture insights are persisted per course.`
          );
        }
      } finally {
        if (active) setNotesLoaded(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedCourseId, currentUser?.id]);

  // Fetch quizzes from backend
  const fetchQuizzes = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('http://localhost:4000/api/quizzes', { headers });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.quizzes) && json.quizzes.length > 0) {
          setQuizzes(json.quizzes);
          if (!activeQuizId) {
            setActiveQuizId(json.quizzes[0].id);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [currentUser?.id]);

  // Save notes
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const headers = await getAuthHeaders();
      headers['Content-Type'] = 'application/json';
      await fetch(
        `http://localhost:4000/api/notes/${encodeURIComponent(selectedCourseId)}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: notesContent }),
        }
      );
      setNotesSavedNotice(true);
      setTimeout(() => setNotesSavedNotice(false), 2500);
    } catch {
      // ignore
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Resolve questions for the currently selected quiz
  const currentQuiz = quizzes.find((q) => q.id === activeQuizId);
  const quizQuestions: QuizQuestionModel[] =
    currentQuiz?.questions && currentQuiz.questions.length > 0
      ? currentQuiz.questions
      : STUDY_QUIZ_QUESTIONS;

  const currentQuestion = quizQuestions[currentIdx] || quizQuestions[0];

  const handleSubmitAnswer = async () => {
    if (selectedOption === null) return;
    setSubmitted(true);

    const qId = String(currentQuestion.id);
    setUserAnswers((prev) => ({ ...prev, [qId]: selectedOption }));

    // Check with server if backend quiz exists
    if (activeQuizId) {
      try {
        const headers = await getAuthHeaders();
        headers['Content-Type'] = 'application/json';
        const res = await fetch(
          `http://localhost:4000/api/quizzes/${encodeURIComponent(activeQuizId)}/check`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              questionId: qId,
              selectedIndex: selectedOption,
            }),
          }
        );
        if (res.ok) {
          const result = await res.json();
          setCheckResult(result);
          if (result.correct) {
            setScore((s) => s + 1);
          }
          return;
        }
      } catch {
        // fallback to client-side check
      }
    }

    // Fallback check
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    setCheckResult({
      correct: isCorrect,
      correctIndex: currentQuestion.correctIndex ?? 0,
      explanation:
        currentQuestion.explanation ||
        'Standard graph relaxation condition: d[u] + w(u,v) < d[v].',
    });
    if (isCorrect) setScore((s) => s + 1);
  };

  const handleNextQuestion = async () => {
    if (currentIdx < quizQuestions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
      setSubmitted(false);
      setCheckResult(null);
    } else {
      setCompleted(true);
      // Record completed score on server
      if (activeQuizId) {
        try {
          const headers = await getAuthHeaders();
          headers['Content-Type'] = 'application/json';
          await fetch(
            `http://localhost:4000/api/quizzes/${encodeURIComponent(activeQuizId)}/attempts`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ answers: userAnswers }),
            }
          );
          fetchQuizzes();
        } catch {
          // ignore
        }
      }
    }
  };

  const handleResetQuiz = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setSubmitted(false);
    setScore(0);
    setCompleted(false);
    setCheckResult(null);
    setUserAnswers({});
  };

  // Lecturer: Create Quiz modal state
  const [newQuizTitle, setNewQuizTitle] = useState('Graph Theory & Vectors Quick Quiz');
  const [newQuizQuestions, setNewQuizQuestions] = useState<
    {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }[]
  >([
    {
      question: 'Why does vector coordinate telemetry operate effectively at 24 kbps?',
      options: [
        'It streams mathematical coordinates rather than full pixel video frames',
        'It stops voice streaming during live classes',
        'It runs on 1-bit monochrome resolution',
      ],
      correctIndex: 0,
      explanation:
        'Coordinates (x, y) serialize to small JSON packets under 200 bytes, avoiding 1,200 kbps pixel video bandwidth.',
    },
  ]);

  const handleAddQuestionToDraft = () => {
    setNewQuizQuestions((prev) => [
      ...prev,
      {
        question: `Question ${prev.length + 1}`,
        options: ['Option A', 'Option B', 'Option C'],
        correctIndex: 0,
        explanation: 'Key conceptual explanation.',
      },
    ]);
  };

  const handleSaveCreatedQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = await getAuthHeaders();
      headers['Content-Type'] = 'application/json';
      const res = await fetch('http://localhost:4000/api/quizzes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          courseId: selectedCourseId,
          title: newQuizTitle,
          questions: newQuizQuestions,
        }),
      });
      if (res.ok) {
        setShowCreateQuizModal(false);
        fetchQuizzes();
      }
    } catch {
      // ignore
    }
  };

  const isLecturer = currentUser?.role === 'lecturer';

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header & Primary Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span
            className={`px-3 py-0.5 rounded-full font-mono text-xs font-medium ${
              isDark
                ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                : 'bg-[#ECFDF5] text-[#059669]'
            }`}
          >
            Study Hub & Practice
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight mt-2">
            Revision Notes & Interactive Practice Quizzes
          </h1>
          <p
            className={`text-xs mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}
          >
            Study offline-friendly notes and take interactive quizzes with instant server-checked explanations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`btn-google px-4 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
              activeTab === 'notes'
                ? isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white border-[#059669] hover:bg-[#047857]'
                : isDark
                ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
            }`}
          >
            <BookOpenText size={16} weight="regular" />
            <span>Lesson Notes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            className={`btn-google px-4 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
              activeTab === 'quiz'
                ? isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white border-[#059669] hover:bg-[#047857]'
                : isDark
                ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
            }`}
          >
            <Exam size={16} weight="regular" />
            <span>Practice Quizzes ({quizzes.length || 1})</span>
          </button>
        </div>
      </div>

      {/* Course Selector Dropdown */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="study-course-select"
            className={`text-xs font-mono ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}
          >
            Course:
          </label>
          <select
            id="study-course-select"
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              handleResetQuiz();
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
              isDark
                ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
                : 'bg-white border-[#DADCE0] text-[#202124]'
            }`}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}: {c.title}
              </option>
            ))}
          </select>
        </div>

        {activeTab === 'quiz' && isLecturer && (
          <button
            type="button"
            onClick={() => setShowCreateQuizModal(true)}
            className={`btn-google px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
            }`}
          >
            <Plus size={15} weight="bold" />
            <span>Create Quiz</span>
          </button>
        )}
      </div>

      {activeTab === 'notes' ? (
        <div className="space-y-6">
          {/* Notes Editor Card */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border space-y-4 ${
              isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className={`font-display text-lg font-medium ${
                    isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  }`}
                >
                  Course Revision & Handwritten Takeaways
                </h2>
                <p className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                  Personal notebook synced to your campus account across devices.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes || !notesLoaded}
                className={`btn-google px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                  isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
              >
                <FloppyDisk size={16} weight="regular" />
                <span>{isSavingNotes ? 'Saving...' : notesSavedNotice ? 'Saved!' : 'Save Notes'}</span>
              </button>
            </div>

            <textarea
              rows={14}
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              placeholder="Record handwritten derivations, equations, and questions..."
              className={`w-full p-4 rounded-2xl border font-mono text-xs leading-relaxed focus:outline-none resize-y ${
                isDark
                  ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                  : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
              }`}
            />
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('quiz')}
              className={`btn-google px-5 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
              }`}
            >
              <span>Take Practice Quiz</span>
              <ArrowRight size={15} weight="regular" />
            </button>
            <Link
              to={`/meet/${courses.find((c) => c.id === selectedCourseId)?.liveRoomCode || 'csc401-algo'}`}
              className={`btn-google px-5 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-1.5 ${
                isDark
                  ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                  : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
              }`}
            >
              <VideoCamera size={16} weight="regular" />
              <span>Enter Live Room</span>
            </Link>
          </div>
        </div>
      ) : completed ? (
        /* Quiz Completed Summary Card */
        <div
          className={`max-w-lg mx-auto p-8 rounded-3xl border text-center space-y-5 ${
            isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              isDark ? 'bg-[#69DB7C]/15 text-[#69DB7C]' : 'bg-[#ECFDF5] text-[#059669]'
            }`}
          >
            <CheckCircle size={36} weight="fill" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-medium">Quiz Completed</h2>
            <p
              className={`text-lg font-mono font-medium mt-1 ${
                isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
              }`}
            >
              You scored {score} out of {quizQuestions.length}
            </p>
            <p
              className={`text-xs mt-2 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}
            >
              {score >= Math.ceil(quizQuestions.length * 0.75)
                ? 'Strong mastery of the lecture principles and telemetry invariants.'
                : 'Review the lesson notes and try the questions again.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleResetQuiz}
              className={`btn-google px-5 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
              }`}
            >
              <ArrowCounterClockwise size={16} weight="regular" />
              <span>Retry Quiz</span>
            </button>
            <Link
              to={`/hub/course/${selectedCourseId}`}
              className={`btn-google px-5 py-2.5 rounded-full border font-medium text-xs ${
                isDark
                  ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                  : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
              }`}
            >
              Back to Course
            </Link>
          </div>
        </div>
      ) : (
        /* Active Quiz Question Card */
        <div
          className={`max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl border space-y-6 ${
            isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
          }`}
        >
          {/* Quiz Selector Pills */}
          {quizzes.length > 1 && (
            <div className="flex flex-wrap gap-2 pb-2 border-b border-[#3C4043]/40">
              {quizzes.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setActiveQuizId(q.id);
                    handleResetQuiz();
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-medium border cursor-pointer ${
                    activeQuizId === q.id
                      ? isDark
                        ? 'bg-[#69DB7C]/20 border-[#69DB7C] text-[#69DB7C]'
                        : 'bg-[#ECFDF5] border-[#059669] text-[#059669]'
                      : 'border-[#3C4043] text-[#9AA0A6]'
                  }`}
                >
                  {q.title}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between font-mono text-xs">
            <span
              className={`font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'}`}
            >
              QUESTION {currentIdx + 1} OF {quizQuestions.length}
            </span>
            <span
              className={`px-3 py-1 rounded-full font-medium ${
                isDark ? 'bg-[#69DB7C]/15 text-[#69DB7C]' : 'bg-[#ECFDF5] text-[#059669]'
              }`}
            >
              Score: {score}
            </span>
          </div>

          <h2 className="font-display text-lg sm:text-xl font-medium leading-snug">
            {currentQuestion?.question}
          </h2>

          <div className="space-y-2.5">
            {currentQuestion?.options.map((opt, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectAnswer =
                checkResult !== null && idx === checkResult.correctIndex;

              let cardStyle = isDark
                ? 'bg-[#0F1713] border-[#3C4043] hover:border-[#69DB7C]'
                : 'bg-[#F8F9FA] border-[#DADCE0] hover:border-[#059669]';

              if (submitted && checkResult) {
                if (isCorrectAnswer) {
                  cardStyle = isDark
                    ? 'bg-[#81C995]/15 border-[#81C995] text-[#81C995]'
                    : 'bg-[#E6F4EA] border-[#188038] text-[#188038]';
                } else if (isSelected && !checkResult.correct) {
                  cardStyle = 'bg-[#D93025]/15 border-[#D93025] text-[#D93025]';
                }
              } else if (isSelected) {
                cardStyle = isDark
                  ? 'bg-[#69DB7C]/15 border-[#69DB7C] text-[#69DB7C]'
                  : 'bg-[#ECFDF5] border-[#059669] text-[#059669]';
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={submitted}
                  onClick={() => setSelectedOption(idx)}
                  className={`btn-google w-full text-left p-4 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer ${cardStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full font-mono text-xs font-medium flex items-center justify-center shrink-0 border ${
                        isDark ? 'border-[#3C4043]' : 'border-[#DADCE0]'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm font-normal">{opt}</span>
                  </div>
                  {submitted && isCorrectAnswer && (
                    <CheckCircle size={20} weight="fill" className="text-[#188038] shrink-0" />
                  )}
                  {submitted && isSelected && !checkResult?.correct && (
                    <XCircle size={20} weight="fill" className="text-[#D93025] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {submitted && checkResult && (
            <div
              className={`p-4 rounded-2xl border flex items-start gap-2.5 text-xs leading-relaxed ${
                isDark
                  ? 'bg-[#69DB7C]/10 border-[#69DB7C]/30 text-[#E3E3E3]'
                  : 'bg-[#ECFDF5]/60 border-[#059669]/25 text-[#202124]'
              }`}
            >
              <Lightbulb
                size={18}
                weight="fill"
                className={`shrink-0 mt-0.5 ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'}`}
              />
              <span>{checkResult.explanation}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              disabled={selectedOption === null}
              onClick={submitted ? handleNextQuestion : handleSubmitAnswer}
              className={`btn-google w-full py-3.5 rounded-full font-medium text-sm disabled:opacity-40 cursor-pointer ${
                isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
              }`}
            >
              {submitted
                ? currentIdx === quizQuestions.length - 1
                  ? 'View Final Score'
                  : 'Next Question'
                : 'Check Answer'}
            </button>
          </div>
        </div>
      )}

      {/* Lecturer Create Quiz Modal */}
      {showCreateQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveCreatedQuiz}
            className={`modal-surface w-full max-w-xl max-h-[85dvh] overflow-y-auto rounded-3xl border p-6 space-y-4 shadow-2xl ${
              isDark
                ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
                : 'bg-white border-[#DADCE0] text-[#202124]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-medium">Create Interactive Practice Quiz</h2>
              <button
                type="button"
                onClick={() => setShowCreateQuizModal(false)}
                className="btn-google p-1.5 rounded-full opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Quiz Title</label>
              <input
                type="text"
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                  isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
              />
            </div>

            <div className="space-y-4 pt-2">
              {newQuizQuestions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-medium text-[#69DB7C]">Question {qIndex + 1}</span>
                    {newQuizQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewQuizQuestions((prev) => prev.filter((_, i) => i !== qIndex))
                        }
                        className="text-[#D93025] hover:underline"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => {
                      const text = e.target.value;
                      setNewQuizQuestions((prev) =>
                        prev.map((item, i) => (i === qIndex ? { ...item, question: text } : item))
                      );
                    }}
                    placeholder="Enter question..."
                    className="w-full px-3 py-1.5 rounded-lg border border-inherit bg-transparent text-xs"
                  />

                  <div className="space-y-1.5">
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct_${qIndex}`}
                          checked={q.correctIndex === optIndex}
                          onChange={() =>
                            setNewQuizQuestions((prev) =>
                              prev.map((item, i) =>
                                i === qIndex ? { ...item, correctIndex: optIndex } : item
                              )
                            )
                          }
                          title="Mark as correct answer"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewQuizQuestions((prev) =>
                              prev.map((item, i) =>
                                i === qIndex
                                  ? {
                                      ...item,
                                      options: item.options.map((o, idx) =>
                                        idx === optIndex ? val : o
                                      ),
                                    }
                                  : item
                              )
                            );
                          }}
                          className="flex-1 px-2.5 py-1 rounded-md border border-inherit bg-transparent text-xs"
                        />
                      </div>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={q.explanation}
                    onChange={(e) => {
                      const expl = e.target.value;
                      setNewQuizQuestions((prev) =>
                        prev.map((item, i) => (i === qIndex ? { ...item, explanation: expl } : item))
                      );
                    }}
                    placeholder="Explanation for student feedback..."
                    className="w-full px-2.5 py-1 rounded-md border border-inherit bg-transparent text-xs opacity-80"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddQuestionToDraft}
              className="text-xs font-mono text-[#69DB7C] hover:underline"
            >
              + Add another question
            </button>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateQuizModal(false)}
                className="px-4 py-2 rounded-full text-xs font-medium opacity-70 hover:opacity-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-full font-medium text-xs ${
                  isDark ? 'bg-[#69DB7C] text-black' : 'bg-[#059669] text-white'
                }`}
              >
                Publish Quiz
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
