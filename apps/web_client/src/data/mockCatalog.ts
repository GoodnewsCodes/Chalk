import {
  CourseModel,
  CourseAnnouncement,
  ClassworkAssignment,
  DvrReplayItem,
  QuizQuestionModel,
  StrokeData,
} from '../types/chalk';

export const INITIAL_COURSES: CourseModel[] = [];

export const INITIAL_ANNOUNCEMENTS: CourseAnnouncement[] = [];

export const INITIAL_ASSIGNMENTS: ClassworkAssignment[] = [];

export const DEFAULT_BOARD_STROKES: StrokeData[] = [
  // Node A circle
  {
    id: 'seed_1',
    roomId: 'MTH 112',
    userId: 'prof_adeleke',
    userName: 'Prof. Adeleke O.',
    timestamp: 1000,
    tool: 'circle',
    color: '#69DB7C',
    width: 3.5,
    slideIndex: 0,
    points: [
      { x: 0.14, y: 0.28 },
      { x: 0.24, y: 0.44 },
    ],
  },
  // Node B circle
  {
    id: 'seed_2',
    roomId: 'MTH 112',
    userId: 'prof_adeleke',
    userName: 'Prof. Adeleke O.',
    timestamp: 2500,
    tool: 'circle',
    color: '#81C995',
    width: 3.5,
    slideIndex: 0,
    points: [
      { x: 0.44, y: 0.18 },
      { x: 0.54, y: 0.34 },
    ],
  },
  // Node C circle
  {
    id: 'seed_3',
    roomId: 'MTH 112',
    userId: 'prof_adeleke',
    userName: 'Prof. Adeleke O.',
    timestamp: 4000,
    tool: 'circle',
    color: '#FDD663',
    width: 3.5,
    slideIndex: 0,
    points: [
      { x: 0.72, y: 0.30 },
      { x: 0.82, y: 0.46 },
    ],
  },
  // Directed edge A -> B
  {
    id: 'seed_4',
    roomId: 'MTH 112',
    userId: 'prof_adeleke',
    userName: 'Prof. Adeleke O.',
    timestamp: 5500,
    tool: 'arrow',
    color: '#E3E3E3',
    width: 3,
    slideIndex: 0,
    points: [
      { x: 0.24, y: 0.34 },
      { x: 0.44, y: 0.26 },
    ],
  },
  // Directed edge B -> C
  {
    id: 'seed_5',
    roomId: 'MTH 112',
    userId: 'prof_adeleke',
    userName: 'Prof. Adeleke O.',
    timestamp: 7000,
    tool: 'arrow',
    color: '#E3E3E3',
    width: 3,
    slideIndex: 0,
    points: [
      { x: 0.54, y: 0.26 },
      { x: 0.72, y: 0.36 },
    ],
  },
  // Direct edge A -> C
  {
    id: 'seed_6',
    roomId: 'MTH 112',
    userId: 'prof_adeleke',
    userName: 'Prof. Adeleke O.',
    timestamp: 9000,
    tool: 'arrow',
    color: '#69DB7C',
    width: 3,
    slideIndex: 0,
    points: [
      { x: 0.24, y: 0.40 },
      { x: 0.72, y: 0.41 },
    ],
  },
  // Highlight bar at bottom
  {
    id: 'seed_7',
    roomId: 'MTH 112',
    userId: 'prof_adeleke',
    userName: 'Prof. Adeleke O.',
    timestamp: 12000,
    tool: 'rect',
    color: '#69DB7C',
    width: 2,
    slideIndex: 0,
    points: [
      { x: 0.14, y: 0.62 },
      { x: 0.82, y: 0.80 },
    ],
  },
];

export const REPLAY_CATALOG: DvrReplayItem[] = [
  {
    id: 'rec_chalk_csc401_01',
    courseId: 'csc401',
    courseCode: 'CSC 401',
    title: 'Lecture 04: Dijkstra Shortest Path & Relaxation Proof',
    lecturerName: 'Prof. Adeleke O.',
    recordedAt: 'Oct 30, 2026',
    durationMs: 180000,
    totalSizeKb: 568,
    mp4EquivalentMb: 27.0,
    savingsPercent: 97.9,
    chapters: [
      { timeMs: 0, label: '00:00 • Session Init & 2G Telemetry Setup', slideIndex: 0 },
      { timeMs: 45000, label: '00:45 • Weighted Graph Nodes V & Edges E', slideIndex: 0 },
      { timeMs: 90000, label: '01:30 • Edge Relaxation Invariant Proof', slideIndex: 0 },
      { timeMs: 135000, label: '02:15 • Priority Queue Complexity O(E + V log V)', slideIndex: 0 },
    ],
    events: [
      { t: 2000, stroke: DEFAULT_BOARD_STROKES[0] },
      { t: 18000, stroke: DEFAULT_BOARD_STROKES[1] },
      { t: 38000, stroke: DEFAULT_BOARD_STROKES[2] },
      { t: 55000, stroke: DEFAULT_BOARD_STROKES[3] },
      { t: 82000, stroke: DEFAULT_BOARD_STROKES[4] },
      { t: 108000, stroke: DEFAULT_BOARD_STROKES[5] },
      { t: 142000, stroke: DEFAULT_BOARD_STROKES[6] },
    ],
  },
  {
    id: 'rec_chalk_mth301_02',
    courseId: 'mth301',
    courseCode: 'MTH 301',
    title: 'Lecture 03: Runge-Kutta 4th Order Vector Derivations',
    lecturerName: 'Dr. Ibrahim K.',
    recordedAt: 'Oct 28, 2026',
    durationMs: 180000,
    totalSizeKb: 492,
    mp4EquivalentMb: 24.5,
    savingsPercent: 98.0,
    chapters: [
      { timeMs: 0, label: '00:00 • Initial Value Problem Formulation', slideIndex: 0 },
      { timeMs: 60000, label: '01:00 • Slope Weights k1, k2, k3, k4', slideIndex: 0 },
      { timeMs: 120000, label: '02:00 • Local Truncation Error Analysis', slideIndex: 0 },
    ],
    events: [
      { t: 3000, stroke: DEFAULT_BOARD_STROKES[0] },
      { t: 45000, stroke: DEFAULT_BOARD_STROKES[3] },
      { t: 90000, stroke: DEFAULT_BOARD_STROKES[1] },
      { t: 130000, stroke: DEFAULT_BOARD_STROKES[6] },
    ],
  },
];

export const STUDY_QUIZ_QUESTIONS: QuizQuestionModel[] = [];
