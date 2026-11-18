import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpenText,
  Exam,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  ArrowCounterClockwise,
  Lightbulb,
  VideoCamera,
  FloppyDisk,
  Plus,
  Trash,
  Cards,
  Play,
  Pause,
  Shuffle,
  Sparkle,
  ArrowsClockwise,
  FilmSlate,
  Key,
  WarningCircle,
  Check,
  X,
  FileText,
  Article,
  Megaphone,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import {
  QuizModel,
  QuizQuestionModel,
  FlashcardItem,
  ConceptAnimationModel,
  ConceptAnimationStep,
} from '../types/chalk';
import { getCurrentFirebaseIdToken } from '../lib/firebase';
import {
  DEMO_NOTES,
  DEMO_QUIZZES,
  DEMO_FLASHCARDS,
  DEMO_CONCEPT_ANIMATIONS,
} from '../data/mockCatalog';

export const StudyHubPage: React.FC = () => {
  const { isDark, isDemoMode, courses, currentUser, topics, assignments, announcements } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLecturer = currentUser?.role === 'lecturer';

  const userCourses = courses.filter((c) => {
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
  });

  const [activeTab, setActiveTab] = useState<
    'notes' | 'flashcards' | 'animations' | 'quiz'
  >('notes');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    userCourses[0]?.id || ''
  );

  useEffect(() => {
    if (
      (!selectedCourseId || !userCourses.some((c) => c.id === selectedCourseId)) &&
      userCourses.length > 0
    ) {
      setSelectedCourseId(userCourses[0].id);
    }
  }, [userCourses, selectedCourseId]);

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const urlCourse = searchParams.get('course');
    const urlAi = searchParams.get('ai');
    if (urlTab === 'notes' || urlTab === 'flashcards' || urlTab === 'animations' || urlTab === 'quiz') {
      setActiveTab(urlTab);
    }
    if (urlCourse && userCourses.some((c) => c.id === urlCourse)) {
      setSelectedCourseId(urlCourse);
    }
    if (urlAi === '1' || urlAi === 'true') {
      setActiveTab('flashcards');
      setShowAiModal(true);
    }
  }, [searchParams, userCourses]);

  // Notes state
  const [notesContent, setNotesContent] = useState<string>('');
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);

  // Flashcards state
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [showCardHint, setShowCardHint] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Record<string, boolean>>({});
  const [reviewIds, setReviewIds] = useState<Record<string, boolean>>({});
  const [cardFilter, setCardFilter] = useState<'all' | 'review'>('all');
  const [showCreateCardModal, setShowCreateCardModal] = useState(false);
  const [newCardTopic, setNewCardTopic] = useState('');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [newCardHint, setNewCardHint] = useState('');

  // Gemini AI Flashcard Generation State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);
  const [aiPromptFocus, setAiPromptFocus] = useState<string>('');
  const [aiSelectedTopic, setAiSelectedTopic] = useState<string>('all');
  const [aiCardCount, setAiCardCount] = useState<number>(6);
  const [aiMergeMode, setAiMergeMode] = useState<'append' | 'replace'>('append');
  const [aiGeneratedPreview, setAiGeneratedPreview] = useState<FlashcardItem[] | null>(null);
  const [showApiKeyConfig, setShowApiKeyConfig] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>(() => {
    try {
      return localStorage.getItem('chalk_gemini_api_key_v1') || '';
    } catch {
      return '';
    }
  });

  // Concept Animations state
  const [animations, setAnimations] = useState<ConceptAnimationModel[]>([]);
  const [activeAnimationId, setActiveAnimationId] = useState<string | null>(null);
  const [animStepIdx, setAnimStepIdx] = useState(0);
  const [isAnimPlaying, setIsAnimPlaying] = useState(false);
  const [animSpeed, setAnimSpeed] = useState<0.5 | 1 | 2>(1);
  const [showCreateAnimModal, setShowCreateAnimModal] = useState(false);
  const [newAnimTitle, setNewAnimTitle] = useState('');
  const [newAnimCategory, setNewAnimCategory] = useState('Algorithm Walkthrough');
  const [newAnimSteps, setNewAnimSteps] = useState<ConceptAnimationStep[]>([
    {
      label: 'Step 1: Initialization',
      formula: 'State(0) = Init',
      description: 'Initialize input state and invariants.',
      values: { Phase: 'Init', Status: 'Ready' },
    },
    {
      label: 'Step 2: Iterative Update',
      formula: 'State(k+1) = Transition(State(k))',
      description: 'Apply transition operator and update state values.',
      values: { Phase: 'Step k', Status: 'Converging' },
    },
  ]);

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
    if (!isDemoMode) {
      const token = await getCurrentFirebaseIdToken();
      if (token) return { Authorization: `Bearer ${token}` };
    }
    if (currentUser?.id) {
      return {
        Authorization: `Bearer mock_firebase_token_${currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '')}`,
      };
    }
    return {};
  };

  // Load Flashcards for selected course
  useEffect(() => {
    const storageKey = isDemoMode
      ? `chalk_demo_flashcards_${selectedCourseId || 'all'}`
      : `chalk_real_flashcards_${selectedCourseId || 'all'}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFlashcards(parsed);
          setCurrentCardIdx(0);
          setIsCardFlipped(false);
          setShowCardHint(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    if (isDemoMode) {
      const relevant = selectedCourseId
        ? DEMO_FLASHCARDS.filter((f) => f.courseId === selectedCourseId)
        : DEMO_FLASHCARDS;
      setFlashcards(relevant.length > 0 ? relevant : DEMO_FLASHCARDS);
    } else {
      const defaultForCourse: FlashcardItem[] = selectedCourseId
        ? [
            {
              id: `fc_default_${selectedCourseId}_1`,
              courseId: selectedCourseId,
              topic: 'Core Concept',
              front: 'What is the primary invariant covered in this week’s lecture?',
              back: 'Review your course notes or add custom flashcards for this cohort using the "+ Add Flashcard" button.',
              hint: 'Click Flip Card or press Spacebar to reveal the answer.',
            },
          ]
        : [];
      setFlashcards(defaultForCourse);
    }
    setCurrentCardIdx(0);
    setIsCardFlipped(false);
    setShowCardHint(false);
  }, [selectedCourseId, isDemoMode]);

  // Load Concept Animations for selected course
  useEffect(() => {
    const storageKey = isDemoMode
      ? `chalk_demo_animations_${selectedCourseId || 'all'}`
      : `chalk_real_animations_${selectedCourseId || 'all'}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAnimations(parsed);
          setActiveAnimationId(parsed[0].id);
          setAnimStepIdx(0);
          setIsAnimPlaying(false);
          return;
        }
      }
    } catch {
      // ignore
    }

    const scoped = selectedCourseId
      ? DEMO_CONCEPT_ANIMATIONS.filter((a) => a.courseId === selectedCourseId)
      : DEMO_CONCEPT_ANIMATIONS;
    const list = scoped.length > 0 ? scoped : DEMO_CONCEPT_ANIMATIONS;
    setAnimations(list);
    setActiveAnimationId(list[0]?.id || null);
    setAnimStepIdx(0);
    setIsAnimPlaying(false);
  }, [selectedCourseId, isDemoMode]);

  // Auto-advance Concept Animation when playing
  const currentAnimation =
    animations.find((a) => a.id === activeAnimationId) || animations[0] || null;
  const totalAnimSteps = currentAnimation?.steps.length || 0;

  useEffect(() => {
    if (!isAnimPlaying || totalAnimSteps === 0) return;
    const intervalMs = Math.round(2400 / animSpeed);
    const timer = setInterval(() => {
      setAnimStepIdx((prev) => {
        if (prev < totalAnimSteps - 1) {
          return prev + 1;
        }
        setIsAnimPlaying(false);
        return prev;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isAnimPlaying, totalAnimSteps, animSpeed]);

  // Filtered flashcards
  const visibleFlashcards =
    cardFilter === 'review'
      ? flashcards.filter((c) => reviewIds[c.id] || !masteredIds[c.id])
      : flashcards;
  const activeFlashcard =
    visibleFlashcards[currentCardIdx] || visibleFlashcards[0] || null;

  // Keyboard shortcuts for flashcards (Space to flip, Left/Right arrows to navigate)
  useEffect(() => {
    if (activeTab !== 'flashcards' || showCreateCardModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsCardFlipped((f) => !f);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (visibleFlashcards.length > 0) {
          setIsCardFlipped(false);
          setShowCardHint(false);
          setCurrentCardIdx((i) => (i + 1) % visibleFlashcards.length);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (visibleFlashcards.length > 0) {
          setIsCardFlipped(false);
          setShowCardHint(false);
          setCurrentCardIdx(
            (i) => (i - 1 + visibleFlashcards.length) % visibleFlashcards.length
          );
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, showCreateCardModal, visibleFlashcards.length]);

  // Fetch course notes from backend (or Demo Catalog when in demo mode)
  useEffect(() => {
    let active = true;
    if (!selectedCourseId) {
      setNotesContent('');
      setNotesLoaded(true);
      return;
    }
    setNotesLoaded(false);

    if (isDemoMode) {
      const demoSavedKey = `chalk_demo_notes_${selectedCourseId}`;
      const localSaved = localStorage.getItem(demoSavedKey);
      setNotesContent(localSaved !== null ? localSaved : DEMO_NOTES[selectedCourseId] || '');
      setNotesLoaded(true);
      return;
    }

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
            setNotesContent(json.content || '');
          }
        }
      } catch {
        if (active) {
          setNotesContent('');
        }
      } finally {
        if (active) setNotesLoaded(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedCourseId, currentUser?.id, isDemoMode]);

  // Fetch quizzes from backend (or Demo Catalog when in demo mode)
  const fetchQuizzes = async () => {
    if (isDemoMode) {
      const relevantDemo = selectedCourseId
        ? DEMO_QUIZZES.filter((q) => !q.courseId || q.courseId === selectedCourseId)
        : DEMO_QUIZZES;
      setQuizzes(relevantDemo);
      if (relevantDemo.length > 0) {
        setActiveQuizId(relevantDemo[0].id);
      } else {
        setActiveQuizId(null);
      }
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('http://localhost:4000/api/quizzes', { headers });
      if (res.ok) {
        const json = await res.json();
        const rawList: QuizModel[] = Array.isArray(json.quizzes) ? json.quizzes : [];
        const scopedList = rawList.filter(
          (q) =>
            userCourses.some((c) => c.id === q.courseId) &&
            (!selectedCourseId || q.courseId === selectedCourseId)
        );
        if (scopedList.length > 0) {
          setQuizzes(scopedList);
          if (!activeQuizId || !scopedList.some((q) => q.id === activeQuizId)) {
            setActiveQuizId(scopedList[0].id);
          }
        } else {
          setQuizzes([]);
          setActiveQuizId(null);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [currentUser?.id, isDemoMode, selectedCourseId, userCourses.length]);

  // Save notes
  const handleSaveNotes = async () => {
    if (!selectedCourseId) return;
    setIsSavingNotes(true);
    try {
      if (isDemoMode) {
        localStorage.setItem(`chalk_demo_notes_${selectedCourseId}`, notesContent);
        setNotesSavedNotice(true);
        setTimeout(() => setNotesSavedNotice(false), 2500);
        return;
      }
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

  // Course materials available for synthesis
  const currentCourse =
    userCourses.find((c) => c.id === selectedCourseId) ||
    courses.find((c) => c.id === selectedCourseId);

  const currentCourseTopics = useMemo(() => {
    return (topics || []).filter((t) => t.courseId === selectedCourseId);
  }, [topics, selectedCourseId]);

  const currentCourseAssignments = useMemo(() => {
    return (assignments || []).filter((a) => a.courseId === selectedCourseId);
  }, [assignments, selectedCourseId]);

  const currentCourseAnnouncements = useMemo(() => {
    return (announcements || []).filter((a) => a.courseId === selectedCourseId);
  }, [announcements, selectedCourseId]);

  const notesWordCount = useMemo(() => {
    const raw =
      notesContent ||
      (isDemoMode && selectedCourseId ? DEMO_NOTES[selectedCourseId] : '');
    if (!raw) return 0;
    return raw.trim().split(/\s+/).filter(Boolean).length;
  }, [notesContent, isDemoMode, selectedCourseId]);

  // Flashcard handlers
  const persistFlashcards = async (nextCards: FlashcardItem[]) => {
    setFlashcards(nextCards);
    const storageKey = isDemoMode
      ? `chalk_demo_flashcards_${selectedCourseId || 'all'}`
      : `chalk_real_flashcards_${selectedCourseId || 'all'}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextCards));
    } catch {
      // ignore
    }

    if (!isDemoMode && selectedCourseId) {
      try {
        const headers = await getAuthHeaders();
        headers['Content-Type'] = 'application/json';
        await fetch(
          `http://localhost:4000/api/courses/${encodeURIComponent(selectedCourseId)}/flashcards`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ flashcards: nextCards }),
          }
        );
      } catch {
        // silent fail to local storage
      }
    }
  };

  const handleShuffleFlashcards = () => {
    const copy = [...flashcards];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setFlashcards(copy);
    setCurrentCardIdx(0);
    setIsCardFlipped(false);
    setShowCardHint(false);
  };

  const handleMarkCardMastered = (cardId: string) => {
    setMasteredIds((prev) => ({ ...prev, [cardId]: true }));
    setReviewIds((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
    setIsCardFlipped(false);
    setShowCardHint(false);
    if (visibleFlashcards.length > 1) {
      setCurrentCardIdx((i) => (i + 1) % visibleFlashcards.length);
    }
  };

  const handleMarkCardReview = (cardId: string) => {
    setReviewIds((prev) => ({ ...prev, [cardId]: true }));
    setMasteredIds((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
    setIsCardFlipped(false);
    setShowCardHint(false);
    if (visibleFlashcards.length > 1) {
      setCurrentCardIdx((i) => (i + 1) % visibleFlashcards.length);
    }
  };

  const handleCreateFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardFront.trim() || !newCardBack.trim()) return;
    const created: FlashcardItem = {
      id: `fc_${Date.now()}`,
      courseId: selectedCourseId || 'general',
      topic: newCardTopic.trim() || 'Key Concept',
      front: newCardFront.trim(),
      back: newCardBack.trim(),
      ...(newCardHint.trim() ? { hint: newCardHint.trim() } : {}),
    };
    const updated = [...flashcards, created];
    persistFlashcards(updated);
    setNewCardTopic('');
    setNewCardFront('');
    setNewCardBack('');
    setNewCardHint('');
    setShowCreateCardModal(false);
    setCardFilter('all');
    setCurrentCardIdx(updated.length - 1);
    setIsCardFlipped(false);
  };

  const generateDemoFallbackCards = (
    courseId: string,
    courseCode: string,
    topicFilter: string,
    count: number
  ): FlashcardItem[] => {
    const cLower = (courseId || '').toLowerCase();
    const now = Date.now();
    let baseCards: Array<{ topic: string; front: string; back: string; hint: string }> = [];

    if (cLower.includes('401') || cLower.includes('algo')) {
      baseCards = [
        {
          topic: 'Graph Relaxation',
          front: 'What is the fundamental edge relaxation condition in Dijkstra and Bellman-Ford algorithms?',
          back: 'If d[v] > d[u] + w(u, v), then update d[v] = d[u] + w(u, v) and predecessor π[v] = u.',
          hint: 'Compare current shortest estimate to v with candidate path through u.',
        },
        {
          topic: 'Priority Queues',
          front: 'Why does an indexed Fibonacci Heap achieve O(E + V log V) time complexity for Dijkstra?',
          back: 'Decrease-key runs in amortized O(1) time across all E relaxations, while V extract-min operations take O(V log V).',
          hint: 'Contrast the amortized cost of extract-min with decrease-key.',
        },
        {
          topic: 'Negative Weight Cycles',
          front: 'How does the Bellman-Ford algorithm reliably detect negative cycles reachable from the source?',
          back: 'After |V| - 1 passes over all edges, it performs a |V|-th pass: if any edge still allows d[v] > d[u] + w(u, v), a negative cycle exists.',
          hint: 'A simple path in a graph with |V| vertices has at most |V| - 1 edges.',
        },
        {
          topic: 'Network Flow',
          front: 'State the Max-Flow Min-Cut Theorem (Ford-Fulkerson).',
          back: 'The maximum value of an s-t flow in a flow network equals the minimum capacity over all s-t cuts.',
          hint: 'Relates residual augmenting paths to bottleneck cuts in the network.',
        },
        {
          topic: 'Dynamic Programming',
          front: 'What two essential properties must a problem exhibit for Dynamic Programming to apply?',
          back: '1. Optimal Substructure (optimal solution contains optimal subsolutions), and 2. Overlapping Subproblems (subproblems recur instead of branching infinitely).',
          hint: 'Think about memoization tables and recurrence equations.',
        },
        {
          topic: 'Topological Sort',
          front: 'What condition is necessary and sufficient for a directed graph to admit a valid topological ordering?',
          back: 'The directed graph must be a DAG (Directed Acyclic Graph) containing no directed cycles.',
          hint: 'Can be computed in O(V + E) using DFS finishing times or Kahn’s in-degree algorithm.',
        },
      ];
    } else if (cLower.includes('412') || cLower.includes('compil')) {
      baseCards = [
        {
          topic: 'LL(1) Grammars',
          front: 'What two disjointness conditions are required for a grammar production A → α | β to be LL(1)?',
          back: '1. FIRST(α) ∩ FIRST(β) = ∅. 2. If ε ∈ FIRST(α), then FIRST(β) ∩ FOLLOW(A) = ∅.',
          hint: 'Predictive parse table cells M[A, a] must contain at most one production.',
        },
        {
          topic: 'SSA Form',
          front: 'Where are Φ (Phi) functions placed when constructing minimal SSA representation for a Control Flow Graph?',
          back: 'At the Iterated Dominance Frontier (IDF) of the basic blocks containing definitions of the target variable.',
          hint: 'Look for control-flow convergence points where multiple definitions meet.',
        },
        {
          topic: 'Lexical Analysis',
          front: 'How does a scanner resolve ambiguity when multiple lexical rules match overlapping input prefixes?',
          back: '1. Longest match (maximal munch rule). 2. Rule priority (the rule declared first in the grammar specification wins ties).',
          hint: 'Differentiates identifiers from keywords like "while" vs "whileTrue".',
        },
        {
          topic: 'Optimization',
          front: 'Explain the difference between Local Value Numbering (LVN) and Global Value Numbering (GVN).',
          back: 'LVN performs common subexpression elimination within a single basic block (DAG), whereas GVN operates across the entire Dominator Tree across basic blocks.',
          hint: 'Scope of redundant expression detection across control flow boundaries.',
        },
      ];
    } else if (cLower.includes('304') || cLower.includes('math') || cLower.includes('linear')) {
      baseCards = [
        {
          topic: 'Stationary Iteration',
          front: 'What is the necessary and sufficient condition for iterative solver x^(k+1) = G x^(k) + c to converge for any initial guess?',
          back: 'The spectral radius of the iteration matrix must be strictly less than one: ρ(G) = max |λ_i(G)| < 1.',
          hint: 'Consider the asymptotic magnitude of error vector e^(k) = G^k e^(0).',
        },
        {
          topic: 'Jacobi vs Gauss-Seidel',
          front: 'How does Gauss-Seidel differ from Jacobi iteration when updating coordinate components?',
          back: 'Jacobi uses all values from iteration k simultaneously, whereas Gauss-Seidel immediately incorporates freshly computed components x_i^(k+1) as soon as available.',
          hint: 'Notice the difference between strictly diagonal splitting vs lower-triangular inversion.',
        },
        {
          topic: 'Condition Number',
          front: 'How does the condition number κ(A) = ||A|| · ||A⁻¹|| bound relative error in linear system Ax = b?',
          back: '||δx|| / ||x|| ≤ κ(A) · (||δb|| / ||b||). Large condition numbers amplify input perturbations into large solution errors.',
          hint: 'Measures sensitivity to numerical round-off and measurement noise.',
        },
      ];
    } else {
      baseCards = [
        {
          topic: `${courseCode} Core Concept`,
          front: `What is the primary theorem or theoretical foundation introduced in ${courseCode}?`,
          back: `Review the syllabus and lesson notes for this cohort. Core theorems provide the invariant guarantees required for assignments and exam questions.`,
          hint: `Consult Module 1 lecture notes or classwork readings.`,
        },
        {
          topic: `${courseCode} Methodologies`,
          front: `Explain how the analytical frameworks of ${courseCode} apply to real-world engineering or scientific problems.`,
          back: `By breaking complex systems into formal mathematical or computational models with well-defined state transitions and constraints.`,
          hint: `Focus on the problem-solving pipeline emphasized by the lecturer.`,
        },
      ];
    }

    let filtered = baseCards;
    if (topicFilter && topicFilter !== 'all') {
      const matched = baseCards.filter((c) =>
        c.topic.toLowerCase().includes(topicFilter.toLowerCase())
      );
      if (matched.length > 0) filtered = matched;
    }

    return filtered.slice(0, count).map((c, i) => ({
      id: `fc_gemini_demo_${now}_${i + 1}`,
      courseId,
      topic: c.topic,
      front: c.front,
      back: c.back,
      hint: c.hint,
    }));
  };

  const handleGenerateWithGemini = async () => {
    if (!selectedCourseId) return;
    setAiGenerating(true);
    setAiError(null);
    setAiGeneratedPreview(null);

    const effectiveKey = geminiApiKeyInput.trim();
    if (effectiveKey) {
      try {
        localStorage.setItem('chalk_gemini_api_key_v1', effectiveKey);
      } catch {
        // ignore
      }
    }

    const topicNames = currentCourseTopics.map((t) => t.name);
    const materialsPayload = currentCourseAssignments.map((a) => ({
      title: a.title,
      description: a.description,
      type: a.type || 'material',
      attachments: a.attachments,
    }));
    const announcementsPayload = currentCourseAnnouncements.map(
      (a) => `${a.authorName}: ${a.content}`
    );
    const effectiveNotes =
      notesContent || (selectedCourseId ? DEMO_NOTES[selectedCourseId] : '') || '';

    let promptFocus = '';
    if (aiSelectedTopic !== 'all') {
      promptFocus += `Priority topic: ${aiSelectedTopic}. `;
    }
    if (aiPromptFocus.trim()) {
      promptFocus += aiPromptFocus.trim();
    }

    try {
      const headers = await getAuthHeaders();
      headers['Content-Type'] = 'application/json';

      const response = await fetch('http://localhost:4000/api/ai/flashcards/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          courseId: selectedCourseId,
          courseCode: currentCourse?.code,
          courseTitle: currentCourse?.title,
          department: currentCourse?.department,
          topics: topicNames,
          notes: effectiveNotes,
          materials: materialsPayload,
          announcements: announcementsPayload,
          userPrompt: promptFocus || undefined,
          count: aiCardCount,
          ...(effectiveKey ? { geminiApiKey: effectiveKey } : {}),
        }),
      });

      if (response.ok) {
        const json = await response.json();
        if (Array.isArray(json.flashcards) && json.flashcards.length > 0) {
          setAiGeneratedPreview(json.flashcards);
          return;
        }
      }

      const errJson = await response.json().catch(() => null);
      if (errJson?.errorCode === 'GEMINI_API_KEY_MISSING') {
        setShowApiKeyConfig(true);
        setAiError(
          'GEMINI_API_KEY is not configured on the backend server. Please paste your Gemini API key below to generate live flashcards.'
        );
        return;
      }
      throw new Error(errJson?.error || 'Gemini API failed to generate flashcards.');
    } catch (err: any) {
      if (isDemoMode) {
        const fallbackCards = generateDemoFallbackCards(
          selectedCourseId,
          currentCourse?.code || 'Course',
          aiSelectedTopic,
          aiCardCount
        );
        setAiGeneratedPreview(fallbackCards);
        return;
      }
      setAiError(
        err?.message ||
          'Could not connect to Gemini AI backend. Verify node_backend is running on port 4000.'
      );
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyGeneratedCards = () => {
    if (!aiGeneratedPreview || aiGeneratedPreview.length === 0) return;
    const nextCards =
      aiMergeMode === 'replace'
        ? aiGeneratedPreview
        : [...flashcards, ...aiGeneratedPreview];
    persistFlashcards(nextCards);
    setCurrentCardIdx(0);
    setIsCardFlipped(false);
    setShowCardHint(false);
    setAiGeneratedPreview(null);
    setShowAiModal(false);
    setAiSuccessMsg(
      `✨ Added ${aiGeneratedPreview.length} Gemini AI flashcards to ${currentCourse?.code || 'course'} deck!`
    );
    setTimeout(() => setAiSuccessMsg(null), 4000);
  };

  // Concept Animation creation handler
  const handleCreateAnimation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnimTitle.trim() || newAnimSteps.length === 0) return;
    const created: ConceptAnimationModel = {
      id: `anim_${Date.now()}`,
      courseId: selectedCourseId || 'general',
      title: newAnimTitle.trim(),
      category: newAnimCategory.trim() || 'Interactive Walkthrough',
      visualType: 'custom_pipeline',
      steps: newAnimSteps.map((s, idx) => ({
        label: s.label.trim() || `Step ${idx + 1}`,
        formula: s.formula?.trim() || undefined,
        description: s.description.trim() || 'Step transition details.',
        values: s.values || { Step: `${idx + 1}` },
      })),
    };
    const updated = [created, ...animations];
    setAnimations(updated);
    setActiveAnimationId(created.id);
    setAnimStepIdx(0);
    setIsAnimPlaying(false);
    const storageKey = isDemoMode
      ? `chalk_demo_animations_${selectedCourseId || 'all'}`
      : `chalk_real_animations_${selectedCourseId || 'all'}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setShowCreateAnimModal(false);
    setNewAnimTitle('');
  };

  // Resolve questions for the currently selected quiz
  const currentQuiz = quizzes.find((q) => q.id === activeQuizId);
  const quizQuestions: QuizQuestionModel[] = currentQuiz?.questions || [];

  const currentQuestion = quizQuestions[currentIdx] || null;

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !currentQuestion) return;
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
      explanation: currentQuestion.explanation || '',
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
      if (activeQuizId && !isDemoMode) {
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
  const [newQuizTitle, setNewQuizTitle] = useState(
    isDemoMode ? 'Graph Theory & Vectors Quick Quiz' : ''
  );
  const [newQuizQuestions, setNewQuizQuestions] = useState<
    {
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }[]
  >(
    isDemoMode
      ? [
          {
            question:
              'Why does vector coordinate telemetry operate effectively at 24 kbps?',
            options: [
              'It streams mathematical coordinates rather than full pixel video frames',
              'It stops voice streaming during live classes',
              'It runs on 1-bit monochrome resolution',
            ],
            correctIndex: 0,
            explanation:
              'Coordinates (x, y) serialize to small JSON packets under 200 bytes, avoiding 1,200 kbps pixel video bandwidth.',
          },
        ]
      : [
          {
            question: '',
            options: ['', '', ''],
            correctIndex: 0,
            explanation: '',
          },
        ]
  );

  const handleAddQuestionToDraft = () => {
    setNewQuizQuestions((prev) => [
      ...prev,
      {
        question: '',
        options: ['', '', ''],
        correctIndex: 0,
        explanation: '',
      },
    ]);
  };

  const handleSaveCreatedQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuizTitle.trim()) return;
    if (isDemoMode) {
      const created: QuizModel = {
        id: `quiz_demo_${Date.now()}`,
        courseId: selectedCourseId,
        title: newQuizTitle.trim(),
        authorId: currentUser?.id || 'demo_lecturer',
        authorName: currentUser?.name || 'Lecturer',
        createdAt: new Date().toISOString(),
        myBestScore: null,
        myAttempts: 0,
        questions: newQuizQuestions.map((q, idx) => ({
          id: `q_${idx + 1}`,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        })),
      };
      setQuizzes((prev) => [created, ...prev]);
      setActiveQuizId(created.id);
      setShowCreateQuizModal(false);
      return;
    }
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

  const masteredCount = flashcards.filter((c) => masteredIds[c.id]).length;
  const masteryPercentage =
    flashcards.length > 0 ? Math.round((masteredCount / flashcards.length) * 100) : 0;

  const activeAnimStep =
    currentAnimation?.steps[animStepIdx] || currentAnimation?.steps[0] || null;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header & Primary Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight mt-2">
            Study Hub: Notes, Flashcards, Animations & Quizzes
          </h1>
          <p
            className={`text-xs mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}
          >
            Review offline-friendly notes, flip 3D flashcards, step through interactive concept animations, and test mastery with instant quizzes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            onClick={() => setActiveTab('flashcards')}
            className={`btn-google px-4 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
              activeTab === 'flashcards'
                ? isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white border-[#059669] hover:bg-[#047857]'
                : isDark
                  ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
            }`}
          >
            <Cards size={16} weight="regular" />
            <span>Flashcards ({flashcards.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('animations')}
            className={`btn-google px-4 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
              activeTab === 'animations'
                ? isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white border-[#059669] hover:bg-[#047857]'
                : isDark
                  ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
            }`}
          >
            <FilmSlate size={16} weight="regular" />
            <span>Animations ({animations.length})</span>
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
            <span>Practice Quizzes ({quizzes.length})</span>
          </button>
        </div>
      </div>

      {/* Course Selector Dropdown & Contextual Action Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="study-course-select"
            className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}
          >
            Course:
          </label>
          {userCourses.length > 0 ? (
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
              {userCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}: {c.title}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={`text-xs italic ${
                isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
              }`}
            >
              {isLecturer ? 'No teaching cohorts yet' : 'No enrolled courses yet'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'flashcards' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAiModal(true);
                  setAiError(null);
                  setAiGeneratedPreview(null);
                }}
                className="btn-google px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-sm bg-gradient-to-r from-[#059669] via-[#047857] to-[#0f766e] text-white hover:brightness-110 border border-[#69DB7C]/30"
              >
                <Sparkle size={15} weight="fill" className="text-amber-300" />
                <span>Generate with Gemini AI</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreateCardModal(true)}
                className={`btn-google px-3.5 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
                  isDark
                    ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                    : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                }`}
              >
                <Plus size={15} weight="bold" />
                <span>Add Flashcard</span>
              </button>
            </div>
          )}

          {activeTab === 'animations' && isLecturer && (
            <button
              type="button"
              onClick={() => setShowCreateAnimModal(true)}
              className={`btn-google px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
              }`}
            >
              <Plus size={15} weight="bold" />
              <span>Create Animation</span>
            </button>
          )}

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
      </div>

      {/* ============================================================ */}
      {/* TAB 1: LESSON NOTES                                          */}
      {/* ============================================================ */}
      {activeTab === 'notes' && (
        <div key="tab-notes" className="space-y-6 animate-study-fade">
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
                disabled={isSavingNotes || !notesLoaded || !selectedCourseId}
                className={`btn-google px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
              >
                <FloppyDisk size={16} weight="regular" />
                <span>
                  {isSavingNotes ? 'Saving...' : notesSavedNotice ? 'Saved!' : 'Save Notes'}
                </span>
              </button>
            </div>

            <textarea
              rows={7}
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              placeholder={
                selectedCourseId
                  ? 'Record handwritten derivations, equations, and questions...'
                  : 'Enroll in or create a course to start recording notes.'
              }
              disabled={!selectedCourseId}
              className={`w-full p-4 rounded-2xl border text-xs leading-relaxed focus:outline-none resize-y ${
                isDark
                  ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                  : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
              }`}
            />
          </div>

          {/* Quick Shortcuts */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('flashcards')}
                className={`btn-google px-5 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                  isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
              >
                <Cards size={16} weight="regular" />
                <span>Study Flashcards</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('flashcards');
                  setShowAiModal(true);
                  setAiError(null);
                  setAiGeneratedPreview(null);
                }}
                className="btn-google px-4 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-[#059669] via-[#047857] to-[#0f766e] text-white hover:brightness-110 shadow-xs"
              >
                <Sparkle size={15} weight="fill" className="text-amber-300" />
                <span>Generate Flashcards from Notes</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('animations')}
                className={`btn-google px-5 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                  isDark
                    ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                    : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                }`}
              >
                <FilmSlate size={16} weight="regular" />
                <span>Explore Animations</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('quiz')}
                className={`btn-google px-5 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                  isDark
                    ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                    : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                }`}
              >
                <span>Take Practice Quiz</span>
                <ArrowRight size={15} weight="regular" />
              </button>
            </div>
            <Link
              to={
                userCourses.find((c) => c.id === selectedCourseId)?.liveRoomCode
                  ? `/studio/${userCourses.find((c) => c.id === selectedCourseId)?.liveRoomCode}`
                  : !isDemoMode && userCourses.length === 0
                    ? isLecturer
                      ? '/hub?create=1'
                      : '/hub?join=1'
                    : '/studio'
              }
              className={`btn-google px-5 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-1.5 ${
                isDark
                  ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                  : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
              }`}
            >
              <VideoCamera size={16} weight="regular" />
              <span>
                {!isDemoMode && userCourses.length === 0
                  ? isLecturer
                    ? 'Create Course to Host'
                    : 'Join Class First'
                  : 'Enter Live Room'}
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: INTERACTIVE 3D FLASHCARDS                             */}
      {/* ============================================================ */}
      {activeTab === 'flashcards' && (
        <div key="tab-flashcards" className="space-y-6 animate-study-fade">
          {/* Mastery Progress & Deck Controls Bar */}
          <div
            className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
            }`}
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium flex items-center gap-1.5">
                  <Sparkle
                    size={15}
                    weight="fill"
                    className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'}
                  />
                  <span>Deck Mastery Progress</span>
                </span>
                <span className="font-mono font-semibold">
                  {masteredCount} / {flashcards.length} Mastered ({masteryPercentage}%)
                </span>
              </div>
              <div
                className={`w-full h-2 rounded-full overflow-hidden ${
                  isDark ? 'bg-[#0F1713]' : 'bg-[#F1F3F4]'
                }`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isDark ? 'bg-[#69DB7C]' : 'bg-[#059669]'
                  }`}
                  style={{ width: `${masteryPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCardFilter((prev) => (prev === 'all' ? 'review' : 'all'));
                  setCurrentCardIdx(0);
                  setIsCardFlipped(false);
                }}
                className={`btn-google px-3.5 py-2 rounded-full text-xs font-medium border cursor-pointer ${
                  cardFilter === 'review'
                    ? isDark
                      ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                      : 'bg-amber-50 border-amber-500 text-amber-700'
                    : isDark
                      ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                      : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                {cardFilter === 'review' ? 'Showing Unmastered' : 'Filter: Unmastered'}
              </button>

              <button
                type="button"
                onClick={handleShuffleFlashcards}
                className={`btn-google px-3.5 py-2 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 cursor-pointer ${
                  isDark
                    ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                    : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                }`}
              >
                <Shuffle size={14} />
                <span>Shuffle</span>
              </button>

              {(Object.keys(masteredIds).length > 0 ||
                Object.keys(reviewIds).length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setMasteredIds({});
                    setReviewIds({});
                    setCardFilter('all');
                    setCurrentCardIdx(0);
                    setIsCardFlipped(false);
                  }}
                  className={`btn-google px-3.5 py-2 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 cursor-pointer ${
                    isDark
                      ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                      : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
                  }`}
                >
                  <ArrowCounterClockwise size={14} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {!activeFlashcard ? (
            <div
              className={`max-w-xl mx-auto p-10 rounded-3xl border text-center space-y-4 ${
                isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border ${
                  isDark
                    ? 'bg-[#69DB7C]/15 border-[#69DB7C]/30 text-[#69DB7C]'
                    : 'bg-[#ECFDF5] border-[#059669]/30 text-[#059669]'
                }`}
              >
                <CheckCircle size={30} weight="fill" />
              </div>
              <h3 className="font-display text-xl font-medium">
                {cardFilter === 'review'
                  ? 'All flashcards in this deck are mastered!'
                  : 'No flashcards in this deck yet'}
              </h3>
              <p
                className={`text-xs max-w-md mx-auto ${
                  isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
              >
                {cardFilter === 'review'
                  ? 'Switch back to All Cards or reset deck progress to review them again.'
                  : 'Create your first flashcard to practice active recall with 3D flip animations.'}
              </p>
              <div className="flex justify-center gap-2 pt-2">
                {cardFilter === 'review' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCardFilter('all');
                      setCurrentCardIdx(0);
                    }}
                    className={`btn-google px-5 py-2.5 rounded-full text-xs font-medium cursor-pointer ${
                      isDark
                        ? 'bg-[#69DB7C] text-[#0F1713]'
                        : 'bg-[#059669] text-white'
                    }`}
                  >
                    Show All Cards
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAiModal(true);
                        setAiError(null);
                        setAiGeneratedPreview(null);
                      }}
                      className="btn-google px-5 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm bg-gradient-to-r from-[#059669] via-[#047857] to-[#0f766e] text-white hover:brightness-110 border border-[#69DB7C]/30"
                    >
                      <Sparkle size={15} weight="fill" className="text-amber-300" />
                      <span>Generate Deck with Gemini AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateCardModal(true)}
                      className={`btn-google px-4 py-2.5 rounded-full text-xs font-medium border cursor-pointer ${
                        isDark
                          ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                          : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                      }`}
                    >
                      + Add Manually
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-5">
              {/* 3D Flip Card Stage */}
              <div
                onClick={() => setIsCardFlipped((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsCardFlipped((prev) => !prev);
                }}
                className="perspective-1000 w-full h-80 sm:h-96 cursor-pointer select-none"
              >
                <div
                  className={`relative w-full h-full transform-style-3d ${
                    isCardFlipped ? 'rotate-y-180' : ''
                  }`}
                >
                  {/* FRONT OF FLASHCARD */}
                  <div
                    className={`absolute inset-0 w-full h-full rounded-3xl border p-6 sm:p-10 flex flex-col justify-between backface-hidden shadow-lg transition-colors ${
                      isDark
                        ? 'bg-[#141E19] border-[#3C4043] hover:border-[#69DB7C]/60'
                        : 'bg-white border-[#DADCE0] hover:border-[#059669]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`px-3 py-1 rounded-full font-medium ${
                          isDark
                            ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                            : 'bg-[#ECFDF5] text-[#059669]'
                        }`}
                      >
                        {activeFlashcard.topic}
                      </span>
                      <div className="flex items-center gap-2">
                        {masteredIds[activeFlashcard.id] && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                            Mastered
                          </span>
                        )}
                        {reviewIds[activeFlashcard.id] && (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-medium">
                            Needs Review
                          </span>
                        )}
                        <span
                          className={`font-mono ${
                            isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                          }`}
                        >
                          Card {currentCardIdx + 1} of {visibleFlashcards.length}
                        </span>
                      </div>
                    </div>

                    <div className="my-auto text-center space-y-4 px-2">
                      <span
                        className={`text-[11px] uppercase tracking-widest font-semibold block ${
                          isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                      >
                        Prompt / Question
                      </span>
                      <h2 className="font-display text-xl sm:text-2xl font-medium leading-snug">
                        {activeFlashcard.front}
                      </h2>

                      {activeFlashcard.hint && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCardHint((h) => !h);
                          }}
                          className="inline-block pt-1"
                        >
                          {showCardHint ? (
                            <p
                              className={`text-xs px-3.5 py-1.5 rounded-xl border inline-flex items-center gap-1.5 ${
                                isDark
                                  ? 'bg-[#0F1713] border-[#3C4043] text-[#FDD663]'
                                  : 'bg-amber-50 border-amber-200 text-amber-800'
                              }`}
                            >
                              <Lightbulb size={14} weight="fill" />
                              <span>{activeFlashcard.hint}</span>
                            </p>
                          ) : (
                            <span
                              className={`text-xs underline inline-flex items-center gap-1 ${
                                isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                              }`}
                            >
                              <Lightbulb size={14} />
                              <span>Show Hint</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex items-center justify-center gap-1.5 text-xs ${
                        isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                    >
                      <ArrowsClockwise size={15} />
                      <span>Click card or press Spacebar to flip answer</span>
                    </div>
                  </div>

                  {/* BACK OF FLASHCARD */}
                  <div
                    className={`absolute inset-0 w-full h-full rounded-3xl border p-6 sm:p-10 flex flex-col justify-between backface-hidden rotate-y-180 shadow-lg ${
                      isDark
                        ? 'bg-[#0F1713] border-[#69DB7C]'
                        : 'bg-[#ECFDF5]/70 border-[#059669]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`px-3 py-1 rounded-full font-semibold ${
                          isDark
                            ? 'bg-[#69DB7C] text-[#0F1713]'
                            : 'bg-[#059669] text-white'
                        }`}
                      >
                        Answer & Key Takeaway
                      </span>
                      <span
                        className={`font-mono ${
                          isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                      >
                        Card {currentCardIdx + 1} of {visibleFlashcards.length}
                      </span>
                    </div>

                    <div className="my-auto text-center px-2 space-y-3">
                      <p className="font-display text-lg sm:text-xl font-medium leading-relaxed">
                        {activeFlashcard.back}
                      </p>
                    </div>

                    <div
                      className={`flex items-center justify-center gap-1.5 text-xs ${
                        isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                    >
                      <ArrowsClockwise size={15} />
                      <span>Click card or press Spacebar to flip back</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation & Self-Grading Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCardFlipped(false);
                    setShowCardHint(false);
                    setCurrentCardIdx(
                      (i) => (i - 1 + visibleFlashcards.length) % visibleFlashcards.length
                    );
                  }}
                  className={`btn-google px-4 py-2.5 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    isDark
                      ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                      : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                  }`}
                >
                  <ArrowLeft size={15} />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMarkCardReview(activeFlashcard.id)}
                    className="btn-google px-4 py-2.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowCounterClockwise size={15} />
                    <span>Still Learning</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkCardMastered(activeFlashcard.id)}
                    className={`btn-google px-4 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                      isDark
                        ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                        : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                  >
                    <CheckCircle size={16} weight="fill" />
                    <span>Got It (Mastered)</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCardFlipped(false);
                    setShowCardHint(false);
                    setCurrentCardIdx((i) => (i + 1) % visibleFlashcards.length);
                  }}
                  className={`btn-google px-4 py-2.5 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    isDark
                      ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                      : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                  }`}
                >
                  <span>Next</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              {/* Bottom Quick-Action Bar */}
              <div className="flex items-center justify-between pt-2 px-1 text-xs opacity-75 hover:opacity-100 transition-opacity">
                <span className={isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}>
                  Deck based on materials for <strong className="font-semibold">{currentCourse?.code}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowAiModal(true);
                    setAiError(null);
                    setAiGeneratedPreview(null);
                  }}
                  className={`inline-flex items-center gap-1.5 font-medium cursor-pointer ${
                    isDark ? 'text-[#69DB7C] hover:underline' : 'text-[#059669] hover:underline'
                  }`}
                >
                  <Sparkle size={14} weight="fill" />
                  <span>Generate more cards with Gemini AI</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: INTERACTIVE CONCEPT ANIMATIONS                        */}
      {/* ============================================================ */}
      {activeTab === 'animations' && currentAnimation && activeAnimStep && (
        <div key="tab-animations" className="space-y-6 animate-study-fade">
          {/* Animation Selector Pills */}
          {animations.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {animations.map((anim) => (
                <button
                  key={anim.id}
                  type="button"
                  onClick={() => {
                    setActiveAnimationId(anim.id);
                    setAnimStepIdx(0);
                    setIsAnimPlaying(false);
                  }}
                  className={`btn-google px-4 py-2 rounded-full text-xs font-medium border cursor-pointer ${
                    currentAnimation.id === anim.id
                      ? isDark
                        ? 'bg-[#69DB7C]/20 border-[#69DB7C] text-[#69DB7C]'
                        : 'bg-[#ECFDF5] border-[#059669] text-[#059669]'
                      : isDark
                        ? 'border-[#3C4043] text-[#9AA0A6]'
                        : 'border-[#DADCE0] text-[#5F6368]'
                  }`}
                >
                  {anim.title}
                </button>
              ))}
            </div>
          )}

          {/* Main Interactive Animation Player Card */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
              isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span
                  className={`text-[11px] uppercase tracking-wider font-semibold ${
                    isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  }`}
                >
                  {currentAnimation.category}
                </span>
                <h2 className="font-display text-xl font-medium mt-0.5">
                  {currentAnimation.title}
                </h2>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (animStepIdx >= totalAnimSteps - 1 && !isAnimPlaying) {
                      setAnimStepIdx(0);
                    }
                    setIsAnimPlaying((p) => !p);
                  }}
                  className={`btn-google px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                    isDark
                      ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                      : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
                >
                  {isAnimPlaying ? (
                    <>
                      <Pause size={15} weight="fill" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play size={15} weight="fill" />
                      <span>Play Animation</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={animStepIdx === 0}
                  onClick={() => {
                    setIsAnimPlaying(false);
                    setAnimStepIdx((s) => Math.max(0, s - 1));
                  }}
                  className={`btn-google p-2 rounded-full border disabled:opacity-40 cursor-pointer ${
                    isDark ? 'border-[#3C4043]' : 'border-[#DADCE0]'
                  }`}
                  title="Previous step"
                >
                  <ArrowLeft size={15} />
                </button>

                <button
                  type="button"
                  disabled={animStepIdx >= totalAnimSteps - 1}
                  onClick={() => {
                    setIsAnimPlaying(false);
                    setAnimStepIdx((s) => Math.min(totalAnimSteps - 1, s + 1));
                  }}
                  className={`btn-google p-2 rounded-full border disabled:opacity-40 cursor-pointer ${
                    isDark ? 'border-[#3C4043]' : 'border-[#DADCE0]'
                  }`}
                  title="Next step"
                >
                  <ArrowRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAnimPlaying(false);
                    setAnimStepIdx(0);
                  }}
                  className={`btn-google p-2 rounded-full border cursor-pointer ${
                    isDark ? 'border-[#3C4043]' : 'border-[#DADCE0]'
                  }`}
                  title="Restart animation"
                >
                  <ArrowCounterClockwise size={15} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAnimSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))
                  }
                  className={`px-2.5 py-1.5 rounded-full border text-[11px] font-mono cursor-pointer ${
                    isDark ? 'border-[#3C4043] text-[#E3E3E3]' : 'border-[#DADCE0]'
                  }`}
                  title="Playback speed"
                >
                  {animSpeed}x
                </button>
              </div>
            </div>

            {/* Animated Visual Stage (SVG Diagram + Live State Telemetry) */}
            <div className="rounded-2xl bg-[#0F1713] border border-[#3C4043] p-5 sm:p-6 text-[#E3E3E3] space-y-5">
              {currentAnimation.visualType === 'dijkstra' ? (
                <svg
                  viewBox="0 0 600 210"
                  className="w-full h-48 sm:h-56 select-none"
                >
                  {/* Directed Weighted Edges */}
                  {[
                    { id: 'u-v', x1: 100, y1: 105, x2: 300, y2: 50, label: 'w=4' },
                    { id: 'u-x', x1: 100, y1: 105, x2: 300, y2: 165, label: 'w=2' },
                    { id: 'x-v', x1: 300, y1: 165, x2: 300, y2: 50, label: 'w=1' },
                    { id: 'v-t', x1: 300, y1: 50, x2: 500, y2: 105, label: 'w=2' },
                    { id: 'x-t', x1: 300, y1: 165, x2: 500, y2: 105, label: 'w=6' },
                  ].map((edge) => {
                    const isActive = activeAnimStep.activeEdges?.includes(edge.id);
                    const mx = (edge.x1 + edge.x2) / 2;
                    const my = (edge.y1 + edge.y2) / 2;
                    return (
                      <g key={edge.id}>
                        <line
                          x1={edge.x1}
                          y1={edge.y1}
                          x2={edge.x2}
                          y2={edge.y2}
                          stroke={isActive ? '#69DB7C' : '#3C4043'}
                          strokeWidth={isActive ? 4 : 2}
                          strokeDasharray={isActive ? '6 4' : undefined}
                          className="transition-all duration-500"
                        />
                        <rect
                          x={mx - 20}
                          y={my - 10}
                          width={40}
                          height={18}
                          rx={6}
                          fill="#141E19"
                          stroke={isActive ? '#69DB7C' : '#3C4043'}
                        />
                        <text
                          x={mx}
                          y={my + 3}
                          textAnchor="middle"
                          fill={isActive ? '#69DB7C' : '#9AA0A6'}
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          {edge.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Graph Vertices */}
                  {[
                    { id: 'u', cx: 100, cy: 105 },
                    { id: 'v', cx: 300, cy: 50 },
                    { id: 'x', cx: 300, cy: 165 },
                    { id: 't', cx: 500, cy: 105 },
                  ].map((node) => {
                    const isHighlighted = activeAnimStep.highlightNodes?.includes(node.id);
                    const distVal = activeAnimStep.values?.[node.id] ?? '∞';
                    return (
                      <g key={node.id} className="transition-all duration-500">
                        {isHighlighted && (
                          <circle
                            cx={node.cx}
                            cy={node.cy}
                            r={34}
                            fill="rgba(105, 219, 124, 0.16)"
                            className="animate-pulse-ring"
                          />
                        )}
                        <circle
                          cx={node.cx}
                          cy={node.cy}
                          r={25}
                          fill={isHighlighted ? '#69DB7C' : '#141E19'}
                          stroke={isHighlighted ? '#FFFFFF' : '#69DB7C'}
                          strokeWidth={2.5}
                        />
                        <text
                          x={node.cx}
                          y={node.cy - 2}
                          textAnchor="middle"
                          fill={isHighlighted ? '#0F1713' : '#E3E3E3'}
                          fontWeight="bold"
                          fontSize="13"
                          fontFamily="monospace"
                        >
                          {node.id}
                        </text>
                        <text
                          x={node.cx}
                          y={node.cy + 12}
                          textAnchor="middle"
                          fill={isHighlighted ? '#0F1713' : '#FDD663'}
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          d={distVal}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                /* General Animated Block & State Pipeline Visualizer */
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-2">
                  {Object.entries(activeAnimStep.values || {}).map(([key, val], idx) => (
                    <div
                      key={key}
                      className="p-4 rounded-2xl border border-[#69DB7C]/40 bg-[#141E19] flex flex-col justify-between transition-all duration-500 animate-study-fade"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <span className="text-[11px] font-mono text-[#9AA0A6] uppercase">
                        {key}
                      </span>
                      <span className="font-mono text-base sm:text-lg font-semibold text-[#69DB7C] mt-1">
                        {String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Step Explanation & Formula Callout */}
              <div
                key={`step-info-${animStepIdx}`}
                className="p-4 rounded-2xl bg-[#141E19] border border-[#3C4043] space-y-2 animate-study-fade"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#69DB7C]">
                    {activeAnimStep.label}
                  </span>
                  {activeAnimStep.formula && (
                    <code className="px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-xs text-[#FDD663] font-mono">
                      {activeAnimStep.formula}
                    </code>
                  )}
                </div>
                <p className="text-xs text-[#E3E3E3]/90 leading-relaxed">
                  {activeAnimStep.description}
                </p>
              </div>

              {/* Interactive Step Scrubber Pills */}
              <div className="flex items-center gap-2 pt-1">
                {currentAnimation.steps.map((step, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsAnimPlaying(false);
                      setAnimStepIdx(idx);
                    }}
                    className={`flex-1 h-2 rounded-full transition-all cursor-pointer ${
                      idx === animStepIdx
                        ? 'bg-[#69DB7C]'
                        : idx < animStepIdx
                          ? 'bg-[#69DB7C]/40'
                          : 'bg-white/15'
                    }`}
                    title={step.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: PRACTICE QUIZZES                                      */}
      {/* ============================================================ */}
      {activeTab === 'quiz' &&
        (quizQuestions.length === 0 ? (
          /* Empty State: No quizzes authored */
          <div
            className={`max-w-xl mx-auto p-8 sm:p-12 rounded-3xl border text-center space-y-4 animate-study-fade ${
              isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border ${
                isDark
                  ? 'bg-[#69DB7C]/10 border-[#69DB7C]/30 text-[#69DB7C]'
                  : 'bg-[#ECFDF5] border-[#059669]/30 text-[#059669]'
              }`}
            >
              <Exam size={32} weight="regular" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-xl font-medium tracking-tight">
                No quizzes authored by lecturer yet
              </h2>
              <p
                className={`text-xs max-w-md mx-auto ${
                  isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
              >
                Assessment quizzes for this course will appear here once authored by the course lecturer.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              {isLecturer ? (
                <button
                  type="button"
                  onClick={() => setShowCreateQuizModal(true)}
                  className={`btn-google px-5 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                    isDark
                      ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                      : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
                >
                  <Plus size={16} weight="bold" />
                  <span>Create First Quiz</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('flashcards')}
                  className={`btn-google px-5 py-2.5 rounded-full border font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                    isDark
                      ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                      : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                  }`}
                >
                  <Cards size={16} weight="regular" />
                  <span>Practice Flashcards</span>
                </button>
              )}
            </div>
          </div>
        ) : completed ? (
          /* Quiz Completed Summary Card */
          <div
            className={`max-w-lg mx-auto p-8 rounded-3xl border text-center space-y-5 animate-study-fade ${
              isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
            }`}
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto animate-pulse-ring ${
                isDark
                  ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                  : 'bg-[#ECFDF5] text-[#059669]'
              }`}
            >
              <CheckCircle size={36} weight="fill" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-medium">Quiz Completed</h2>
              <p
                className={`text-lg font-medium mt-1 ${
                  isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                }`}
              >
                You scored {score} out of {quizQuestions.length}
              </p>
              <p
                className={`text-xs mt-2 ${
                  isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
              >
                {score >= Math.ceil(quizQuestions.length * 0.75)
                  ? 'Strong mastery of the lecture principles and telemetry invariants.'
                  : 'Review the flashcards and concept animations, then try the quiz again.'}
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
                to={selectedCourseId ? `/hub/course/${selectedCourseId}` : '/hub'}
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
            key={`quiz-q-${currentIdx}`}
            className={`max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl border space-y-6 animate-study-fade ${
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
                    className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${
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

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-medium ${
                    isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  }`}
                >
                  QUESTION {currentIdx + 1} OF {quizQuestions.length}
                </span>
                <span
                  className={`px-3 py-1 rounded-full font-medium ${
                    isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                  }`}
                >
                  Score: {score}
                </span>
              </div>
              <div
                className={`w-full h-1.5 rounded-full overflow-hidden ${
                  isDark ? 'bg-[#0F1713]' : 'bg-[#F1F3F4]'
                }`}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isDark ? 'bg-[#69DB7C]' : 'bg-[#059669]'
                  }`}
                  style={{
                    width: `${Math.round(((currentIdx + 1) / quizQuestions.length) * 100)}%`,
                  }}
                />
              </div>
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
                        className={`w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center shrink-0 border ${
                          isDark ? 'border-[#3C4043]' : 'border-[#DADCE0]'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm font-normal">{opt}</span>
                    </div>
                    {submitted && isCorrectAnswer && (
                      <CheckCircle
                        size={20}
                        weight="fill"
                        className="text-[#188038] shrink-0"
                      />
                    )}
                    {submitted && isSelected && !checkResult?.correct && (
                      <XCircle
                        size={20}
                        weight="fill"
                        className="text-[#D93025] shrink-0"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {submitted && checkResult && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-2.5 text-xs leading-relaxed animate-study-fade ${
                  isDark
                    ? 'bg-[#69DB7C]/10 border-[#69DB7C]/30 text-[#E3E3E3]'
                    : 'bg-[#ECFDF5]/60 border-[#059669]/25 text-[#202124]'
                }`}
              >
                <Lightbulb
                  size={18}
                  weight="fill"
                  className={`shrink-0 mt-0.5 ${
                    isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  }`}
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
        ))}

      {/* Toast Notification */}
      {aiSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#059669] text-white text-xs font-medium shadow-2xl animate-study-fade border border-[#69DB7C]/30">
          <Sparkle size={16} weight="fill" className="text-amber-300" />
          <span>{aiSuccessMsg}</span>
        </div>
      )}

      {/* Modal: Generate Flashcards with Gemini AI */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div
            className={`modal-surface w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl transition-all ${
              isDark
                ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
                : 'bg-white border-[#DADCE0] text-[#202124]'
            }`}
          >
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-[#059669] to-[#047857] text-white shadow-sm">
                  <Sparkle size={20} weight="fill" className="text-amber-300" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-medium flex items-center gap-2">
                    <span>Generate Flashcards with Gemini AI</span>
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                    Active recall synthesis powered by Gemini based on all available course materials.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAiModal(false);
                  setAiError(null);
                  setAiGeneratedPreview(null);
                }}
                className="btn-google p-2 rounded-full opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Course & Detected Materials Analysis Card */}
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#059669] dark:text-[#69DB7C]">
                      Target Course:
                    </span>
                    <span className="font-display text-xs font-medium">
                      {currentCourse?.code}: {currentCourse?.title}
                    </span>
                  </div>
                  <span className={`text-[11px] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                    {currentCourse?.department || 'Academic Department'}
                  </span>
                </div>

                <div className="pt-1">
                  <span className={`text-[11px] font-medium uppercase tracking-wider block mb-2 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                    Course Materials Detected For Synthesis:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'}`}>
                      <div className="flex items-center gap-1.5 font-medium opacity-80">
                        <FileText size={14} className="text-[#059669] dark:text-[#69DB7C]" />
                        <span>Lecture Notes</span>
                      </div>
                      <span className="text-[11px] font-mono">
                        {notesWordCount > 0 ? `${notesWordCount} words` : 'None yet'}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'}`}>
                      <div className="flex items-center gap-1.5 font-medium opacity-80">
                        <BookOpenText size={14} className="text-[#059669] dark:text-[#69DB7C]" />
                        <span>Syllabus</span>
                      </div>
                      <span className="text-[11px] font-mono">
                        {currentCourseTopics.length} modules
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'}`}>
                      <div className="flex items-center gap-1.5 font-medium opacity-80">
                        <Article size={14} className="text-[#059669] dark:text-[#69DB7C]" />
                        <span>Classwork</span>
                      </div>
                      <span className="text-[11px] font-mono">
                        {currentCourseAssignments.length} items
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'}`}>
                      <div className="flex items-center gap-1.5 font-medium opacity-80">
                        <Megaphone size={14} className="text-[#059669] dark:text-[#69DB7C]" />
                        <span>Notices</span>
                      </div>
                      <span className="text-[11px] font-mono">
                        {currentCourseAnnouncements.length} notices
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* If preview is ready, display preview */}
              {aiGeneratedPreview && aiGeneratedPreview.length > 0 ? (
                <div className="space-y-4 animate-study-fade">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-sm font-semibold flex items-center gap-1.5 text-[#059669] dark:text-[#69DB7C]">
                        <CheckCircle size={16} weight="fill" />
                        <span>Generated {aiGeneratedPreview.length} Flashcards</span>
                      </h3>
                      <p className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                        Review the generated cards below before saving to your active deck.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiGeneratedPreview(null)}
                      className={`btn-google px-3 py-1.5 rounded-full text-xs border cursor-pointer ${
                        isDark ? 'border-[#3C4043] text-[#9AA0A6]' : 'border-[#DADCE0] text-[#5F6368]'
                      }`}
                    >
                      Back to Settings
                    </button>
                  </div>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {aiGeneratedPreview.map((card, idx) => (
                      <div
                        key={card.id || idx}
                        className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                          isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] dark:text-[#69DB7C] text-[11px] font-medium">
                            {card.topic}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setAiGeneratedPreview((prev) =>
                                prev ? prev.filter((_, i) => i !== idx) : []
                              )
                            }
                            className="text-red-400 hover:text-red-500 p-1 rounded-full cursor-pointer opacity-70 hover:opacity-100"
                            title="Remove card"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                        <div>
                          <span className="font-semibold block opacity-80 mb-0.5">Q: {card.front}</span>
                          <p className="opacity-90 pl-3 border-l-2 border-[#059669]/40 leading-relaxed">
                            {card.back}
                          </p>
                        </div>
                        {card.hint && (
                          <div className="flex items-center gap-1.5 text-[11px] opacity-70 italic text-amber-500">
                            <Lightbulb size={12} weight="fill" />
                            <span>Hint: {card.hint}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Destination Mode */}
                  <div className="flex items-center gap-4 text-xs pt-1">
                    <span className="font-medium opacity-80">Deck Action:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="aiMergeMode"
                        checked={aiMergeMode === 'append'}
                        onChange={() => setAiMergeMode('append')}
                        className="accent-[#059669]"
                      />
                      <span>Append to current ({flashcards.length} cards)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="aiMergeMode"
                        checked={aiMergeMode === 'replace'}
                        onChange={() => setAiMergeMode('replace')}
                        className="accent-[#059669]"
                      />
                      <span>Replace current deck</span>
                    </label>
                  </div>
                </div>
              ) : (
                /* Configuration Controls */
                <div className="space-y-4">
                  {/* Topic focus */}
                  {currentCourseTopics.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium opacity-80">
                        Topic Focus (Optional):
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAiSelectedTopic('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                            aiSelectedTopic === 'all'
                              ? isDark
                                ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C]'
                                : 'bg-[#059669] text-white border-[#059669]'
                              : isDark
                                ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                                : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
                          }`}
                        >
                          All Available Materials
                        </button>
                        {currentCourseTopics.map((top) => (
                          <button
                            key={top.id}
                            type="button"
                            onClick={() => setAiSelectedTopic(top.name)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                              aiSelectedTopic === top.name
                                ? isDark
                                  ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C]'
                                  : 'bg-[#059669] text-white border-[#059669]'
                                : isDark
                                  ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                                  : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
                            }`}
                          >
                            {top.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Free-form instructions */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium opacity-80">
                      Specific Instructions or Focus (Optional):
                    </label>
                    <input
                      type="text"
                      value={aiPromptFocus}
                      onChange={(e) => setAiPromptFocus(e.target.value)}
                      placeholder="e.g., Focus on Dijkstra invariants, memory cache locality, or asymptotic bounds..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none ${
                        isDark
                          ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                          : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                      }`}
                    />
                  </div>

                  {/* Card count selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium opacity-80">
                      Number of Flashcards:
                    </label>
                    <div className="flex gap-2">
                      {[4, 6, 8, 12].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setAiCardCount(num)}
                          className={`flex-1 py-2 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                            aiCardCount === num
                              ? isDark
                                ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C]'
                                : 'bg-[#059669] text-white border-[#059669]'
                              : isDark
                                ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                                : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
                          }`}
                        >
                          {num} Cards
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gemini API Key Collapsible / Indicator */}
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-2 ${
                      isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Key size={14} className="text-[#059669] dark:text-[#69DB7C]" />
                        <span>Gemini Engine: <strong className="font-mono">gemini-3.1-flash-lite</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowApiKeyConfig((prev) => !prev)}
                        className="text-[11px] underline opacity-70 hover:opacity-100 cursor-pointer"
                      >
                        {showApiKeyConfig ? 'Hide API Key' : 'Configure Custom Key'}
                      </button>
                    </div>

                    {showApiKeyConfig && (
                      <div className="space-y-2 pt-1 border-t border-black/10 dark:border-white/10">
                        <input
                          type="password"
                          value={geminiApiKeyInput}
                          onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                          placeholder="Paste GEMINI_API_KEY (or configure in apps/node_backend/.env)..."
                          className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                            isDark
                              ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
                              : 'bg-white border-[#DADCE0] text-[#202124]'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {aiError && (
                <div className="p-3.5 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-500 text-xs flex items-start gap-2 animate-study-fade">
                  <WarningCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Loading State Animation */}
              {aiGenerating && (
                <div
                  className={`p-6 rounded-2xl border text-center space-y-3 animate-pulse ${
                    isDark ? 'bg-[#0F1713] border-[#69DB7C]/40' : 'bg-[#ECFDF5] border-[#059669]/40'
                  }`}
                >
                  <Sparkle
                    size={28}
                    weight="fill"
                    className="mx-auto text-[#059669] dark:text-[#69DB7C] animate-spin"
                  />
                  <div className="space-y-1">
                    <h4 className="font-display text-sm font-semibold">
                      Gemini AI is Synthesizing Study Flashcards...
                    </h4>
                    <p className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                      Analyzing lecture notes, syllabus concepts, and classwork materials for {currentCourse?.code}.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAiModal(false);
                  setAiError(null);
                  setAiGeneratedPreview(null);
                }}
                disabled={aiGenerating}
                className={`btn-google px-4 py-2.5 rounded-full text-xs font-medium border cursor-pointer ${
                  isDark
                    ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                    : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                Cancel
              </button>

              {aiGeneratedPreview && aiGeneratedPreview.length > 0 ? (
                <button
                  type="button"
                  onClick={handleApplyGeneratedCards}
                  className={`btn-google px-6 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm ${
                    isDark
                      ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                      : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
                >
                  <Check size={16} weight="bold" />
                  <span>
                    Add {aiGeneratedPreview.length} Flashcards to Deck & Start Studying
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={aiGenerating || !selectedCourseId}
                  onClick={handleGenerateWithGemini}
                  className="btn-google px-6 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm bg-gradient-to-r from-[#059669] via-[#047857] to-[#0f766e] text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed border border-[#69DB7C]/30"
                >
                  <Sparkle size={16} weight="fill" className="text-amber-300" />
                  <span>
                    {aiGenerating ? 'Generating with Gemini...' : 'Generate Flashcards with Gemini AI'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Flashcard */}
      {showCreateCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateFlashcard}
            className={`modal-surface w-full max-w-lg rounded-3xl border p-6 space-y-4 shadow-2xl ${
              isDark
                ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
                : 'bg-white border-[#DADCE0] text-[#202124]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-medium">Add New Study Flashcard</h2>
              <button
                type="button"
                onClick={() => setShowCreateCardModal(false)}
                className="btn-google p-1.5 rounded-full opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">
                Topic / Module Tag
              </label>
              <input
                type="text"
                value={newCardTopic}
                onChange={(e) => setNewCardTopic(e.target.value)}
                placeholder="e.g., Graph Theory, Dynamic Programming..."
                className={`w-full px-3.5 py-2 rounded-xl border text-xs ${
                  isDark
                    ? 'bg-[#0F1713] border-[#3C4043]'
                    : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">
                Front (Question / Term)
              </label>
              <textarea
                rows={2}
                required
                value={newCardFront}
                onChange={(e) => setNewCardFront(e.target.value)}
                placeholder="Enter the prompt or concept question..."
                className={`w-full px-3.5 py-2 rounded-xl border text-xs ${
                  isDark
                    ? 'bg-[#0F1713] border-[#3C4043]'
                    : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">
                Back (Answer / Derivation)
              </label>
              <textarea
                rows={3}
                required
                value={newCardBack}
                onChange={(e) => setNewCardBack(e.target.value)}
                placeholder="Enter the definition, formula, or explanation..."
                className={`w-full px-3.5 py-2 rounded-xl border text-xs ${
                  isDark
                    ? 'bg-[#0F1713] border-[#3C4043]'
                    : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">
                Optional Hint
              </label>
              <input
                type="text"
                value={newCardHint}
                onChange={(e) => setNewCardHint(e.target.value)}
                placeholder="Short recall clue..."
                className={`w-full px-3.5 py-2 rounded-xl border text-xs ${
                  isDark
                    ? 'bg-[#0F1713] border-[#3C4043]'
                    : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateCardModal(false)}
                className="px-4 py-2 rounded-full text-xs font-medium opacity-70 hover:opacity-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-full font-medium text-xs cursor-pointer ${
                  isDark ? 'bg-[#69DB7C] text-black' : 'bg-[#059669] text-white'
                }`}
              >
                Save Flashcard
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create Concept Animation */}
      {showCreateAnimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateAnimation}
            className={`modal-surface w-full max-w-xl max-h-[85dvh] overflow-y-auto rounded-3xl border p-6 space-y-4 shadow-2xl ${
              isDark
                ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
                : 'bg-white border-[#DADCE0] text-[#202124]'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-medium">
                Create Step-by-Step Concept Animation
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateAnimModal(false)}
                className="btn-google p-1.5 rounded-full opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">
                  Animation Title
                </label>
                <input
                  type="text"
                  required
                  value={newAnimTitle}
                  onChange={(e) => setNewAnimTitle(e.target.value)}
                  placeholder="e.g., Bellman-Ford Pass Trace"
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs ${
                    isDark
                      ? 'bg-[#0F1713] border-[#3C4043]'
                      : 'bg-[#F8F9FA] border-[#DADCE0]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 opacity-80">
                  Category
                </label>
                <input
                  type="text"
                  value={newAnimCategory}
                  onChange={(e) => setNewAnimCategory(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs ${
                    isDark
                      ? 'bg-[#0F1713] border-[#3C4043]'
                      : 'bg-[#F8F9FA] border-[#DADCE0]'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {newAnimSteps.map((step, sIdx) => (
                <div
                  key={sIdx}
                  className={`p-3.5 rounded-2xl border space-y-2 ${
                    isDark
                      ? 'bg-[#0F1713] border-[#3C4043]'
                      : 'bg-[#F8F9FA] border-[#DADCE0]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#69DB7C]">
                      Step {sIdx + 1}
                    </span>
                    {newAnimSteps.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewAnimSteps((prev) => prev.filter((_, i) => i !== sIdx))
                        }
                        className="text-[#D93025] hover:underline"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={step.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewAnimSteps((prev) =>
                        prev.map((item, i) => (i === sIdx ? { ...item, label: val } : item))
                      );
                    }}
                    placeholder="Step heading..."
                    className="w-full px-3 py-1.5 rounded-lg border border-inherit bg-transparent text-xs"
                  />
                  <input
                    type="text"
                    value={step.formula || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewAnimSteps((prev) =>
                        prev.map((item, i) =>
                          i === sIdx ? { ...item, formula: val } : item
                        )
                      );
                    }}
                    placeholder="Formula / invariant (optional)..."
                    className="w-full px-3 py-1.5 rounded-lg border border-inherit bg-transparent text-xs font-mono"
                  />
                  <textarea
                    rows={2}
                    value={step.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewAnimSteps((prev) =>
                        prev.map((item, i) =>
                          i === sIdx ? { ...item, description: val } : item
                        )
                      );
                    }}
                    placeholder="Step explanation..."
                    className="w-full px-3 py-1.5 rounded-lg border border-inherit bg-transparent text-xs"
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setNewAnimSteps((prev) => [
                  ...prev,
                  {
                    label: `Step ${prev.length + 1}`,
                    formula: '',
                    description: '',
                    values: { Step: `${prev.length + 1}` },
                  },
                ])
              }
              className="text-xs text-[#69DB7C] hover:underline"
            >
              + Add Animation Step
            </button>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowCreateAnimModal(false)}
                className="px-4 py-2 rounded-full text-xs font-medium opacity-70 hover:opacity-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-full font-medium text-xs cursor-pointer ${
                  isDark ? 'bg-[#69DB7C] text-black' : 'bg-[#059669] text-white'
                }`}
              >
                Publish Animation
              </button>
            </div>
          </form>
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
              <h2 className="font-display text-lg font-medium">
                Create Interactive Practice Quiz
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateQuizModal(false)}
                className="btn-google p-1.5 rounded-full opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">
                Quiz Title
              </label>
              <input
                type="text"
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                  isDark
                    ? 'bg-[#0F1713] border-[#3C4043]'
                    : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
              />
            </div>

            <div className="space-y-4 pt-2">
              {newQuizQuestions.map((q, qIndex) => (
                <div
                  key={qIndex}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDark
                      ? 'bg-[#0F1713] border-[#3C4043]'
                      : 'bg-[#F8F9FA] border-[#DADCE0]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#69DB7C]">
                      Question {qIndex + 1}
                    </span>
                    {newQuizQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewQuizQuestions((prev) =>
                            prev.filter((_, i) => i !== qIndex)
                          )
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
                        prev.map((item, i) =>
                          i === qIndex ? { ...item, question: text } : item
                        )
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
                        prev.map((item, i) =>
                          i === qIndex ? { ...item, explanation: expl } : item
                        )
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
              className="text-xs text-[#69DB7C] hover:underline"
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
