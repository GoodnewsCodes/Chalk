import {
  CourseModel,
  CourseAnnouncement,
  ClassworkAssignment,
  DvrReplayItem,
  QuizQuestionModel,
  StrokeData,
} from '../types/chalk';

export const INITIAL_COURSES: CourseModel[] = [
  {
    id: 'csc401',
    code: 'CSC 401',
    title: 'Advanced Algorithms & Graph Theory',
    lecturerName: 'Prof. Adeleke O.',
    lecturerId: 'usr_lecturer_01',
    accentHex: '#059669',
    hasLiveSession: true,
    liveRoomCode: 'MTH 112',
    enrolledCount: 142,
    scheduleTime: 'Live Now • Voice + Vector Room Active',
    department: 'Computer Science & Engineering',
  },
  {
    id: 'mth301',
    code: 'MTH 301',
    title: 'Numerical Analysis & Differential Modeling',
    lecturerName: 'Dr. Ibrahim K.',
    lecturerId: 'usr_lecturer_02',
    accentHex: '#059669',
    hasLiveSession: false,
    liveRoomCode: 'mth301-num',
    enrolledCount: 118,
    scheduleTime: 'Tue & Thu • 10:00 AM WAT',
    department: 'Mathematics & Statistics',
  },
  {
    id: 'cpe405',
    code: 'CPE 405',
    title: 'Low-Power Embedded Telemetry Systems',
    lecturerName: 'Engr. Fatima B.',
    lecturerId: 'usr_lecturer_03',
    accentHex: '#059669',
    hasLiveSession: false,
    liveRoomCode: 'cpe405-iot',
    enrolledCount: 89,
    scheduleTime: 'Thursday • 2:00 PM WAT',
    department: 'Electrical & Electronics Engineering',
  },
  {
    id: 'gen401',
    code: 'GEN 401',
    title: 'Distributed Systems for Constrained Networks',
    lecturerName: 'Dr. Emeka N.',
    lecturerId: 'usr_lecturer_04',
    accentHex: '#059669',
    hasLiveSession: false,
    liveRoomCode: 'gen401-net',
    enrolledCount: 230,
    scheduleTime: 'Friday • 11:00 AM WAT',
    department: 'Computer Science & Engineering',
  },
];

export const INITIAL_ANNOUNCEMENTS: CourseAnnouncement[] = [
  {
    id: 'ann_1',
    courseId: 'csc401',
    authorName: 'Prof. Adeleke O.',
    authorRole: 'lecturer',
    timestamp: '15 mins ago',
    content:
      'NETWORK ADVISORY: Due to regional grid load-shedding across 4 districts, today\'s lecture runs strictly in Chalk Voice + Vector Whiteboard mode (under 28 kbps). Click "Join Live Class Call" above to enter room MTH 112.',
    isLiveNotice: true,
  },
  {
    id: 'ann_2',
    courseId: 'csc401',
    authorName: 'David Mensah (TA)',
    authorRole: 'ta',
    timestamp: 'Yesterday at 4:30 PM',
    content:
      'The Vector DVR recording for Lecture 04 (Dijkstra Shortest Path & Relaxation Proof) is now published in the Replays tab. Full 1-hour package size is 11.4 MB compared to 320 MB on standard video platforms.',
  },
  {
    id: 'ann_3',
    courseId: 'csc401',
    authorName: 'Prof. Adeleke O.',
    authorRole: 'lecturer',
    timestamp: '2 days ago',
    content:
      'Please review the Fibonacci Heap amortization proof before Friday\'s assessment. A 5-question practice quiz has been generated in the Study Hub.',
  },
  {
    id: 'ann_4',
    courseId: 'mth301',
    authorName: 'Dr. Ibrahim K.',
    authorRole: 'lecturer',
    timestamp: '3 days ago',
    content:
      'Runge-Kutta 4th order vector board derivations have been archived to the course replay library for offline viewing.',
  },
];

export const INITIAL_ASSIGNMENTS: ClassworkAssignment[] = [
  {
    id: 'asg_1',
    courseId: 'csc401',
    title: 'Lab 04: Memory-Compact Adjacency Vector Graph',
    dueDate: 'Due Friday, 11:59 PM',
    description:
      'Implement a sparse adjacency vector representation optimized for 2G packet serialization and verify edge relaxation in O(E + V log V).',
    isSubmitted: false,
    points: '100 pts',
  },
  {
    id: 'asg_2',
    courseId: 'csc401',
    title: 'Problem Set 03: Bandwidth QoS & Priority Queues',
    dueDate: 'Submitted • Graded 50/50',
    description:
      'Analyze packet arrival jitter under 15% loss and derive why coordinate telemetry remains deterministic.',
    isSubmitted: true,
    points: '50 pts',
    submissionNote: 'Submitted git commit 8f3a19d with benchmark logs.',
  },
  {
    id: 'asg_3',
    courseId: 'mth301',
    title: 'Worksheet 02: Newton-Raphson Convergence Bounds',
    dueDate: 'Due Next Tuesday, 5:00 PM',
    description:
      'Compute error bounds for non-linear root approximation over 6 iterations.',
    isSubmitted: false,
    points: '75 pts',
  },
];

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

export const STUDY_QUIZ_QUESTIONS: QuizQuestionModel[] = [
  {
    id: 1,
    question:
      'What is the primary condition for relaxing a directed edge (u, v) with weight w(u, v) in Dijkstra\'s algorithm?',
    options: [
      'd[v] > d[u] + w(u, v)',
      'd[v] < d[u] - w(u, v)',
      'd[v] == d[u] * w(u, v)',
      'd[u] > d[v] + w(u, v)',
    ],
    correctIndex: 0,
    explanation:
      'Edge relaxation updates the shortest-path estimate d[v] whenever passing through vertex u yields a strictly shorter path: d[u] + w(u, v) < d[v].',
  },
  {
    id: 2,
    question:
      'How does Chalk achieve a 97.6% bandwidth reduction during live lectures compared to conventional screen-sharing video calls?',
    options: [
      'By muting all students and lowering audio sample rate to 4 kHz',
      'By streaming normalized (x, y) vector coordinates over WebSockets alongside 24 kbps Opus voice instead of 1080p pixel frames',
      'By sending static JPEG screenshots once every 60 seconds',
      'By restricting the chalkboard to monochrome text only',
    ],
    correctIndex: 1,
    explanation:
      'Conventional video streams millions of pixels (~1,200 kbps). Chalk transmits lightweight mathematical stroke coordinates (~2 to 4 kbps) paired with clear Opus voice (~24 kbps).',
  },
  {
    id: 3,
    question:
      'What happens automatically when Chalk\'s Anti-Lag QoS Shield detects packet loss exceeding 8% or a drop to 2G edge connectivity?',
    options: [
      'The student is disconnected from the lecture room',
      'The circuit breaker suspends secondary webcam video feeds so voice audio and blackboard strokes never stutter',
      'All previous blackboard drawings are erased to save memory',
      'The lecture pauses for everyone in the room',
    ],
    correctIndex: 1,
    explanation:
      'Priority 1 (Vector Telemetry) and Priority 2 (Opus Voice) are protected by shedding Priority 3 (Secondary Video PiP) whenever network congestion spikes.',
  },
  {
    id: 4,
    question:
      'What is the asymptotic time complexity of Dijkstra\'s algorithm when backed by a Fibonacci Heap min-priority queue?',
    options: [
      'O(V^2)',
      'O(E log V)',
      'O(E + V log V)',
      'O(V^3)',
    ],
    correctIndex: 2,
    explanation:
      'Fibonacci Heaps support amortized O(1) decrease-key operations and O(log V) extract-min operations, giving O(E + V log V) total time.',
  },
  {
    id: 5,
    question:
      'Why does a 1-hour Chalk Vector DVR recording require only ~11.4 MB of storage compared to ~320 MB for a standard MP4 video recording?',
    options: [
      'It stores an Opus mono voice track (~10.8 MB/hr) paired with a timestamped JSON vector event log (~0.6 MB/hr)',
      'It deletes all pauses and silence from the lecture',
      'It only records the last 5 minutes of the class',
      'It requires an active fiber internet connection to decompress',
    ],
    correctIndex: 0,
    explanation:
      'Dual-track Vector DVR reconstructs the exact chalkboard strokes deterministically on the client device while syncing with compact Opus audio.',
  },
];
