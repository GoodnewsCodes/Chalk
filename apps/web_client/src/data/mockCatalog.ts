import {
  CourseModel,
  CourseAnnouncement,
  ClassworkAssignment,
  StrokeData,
  TopicModel,
  StudentSubmission,
  CourseAnnouncementComment,
  StudioPoll,
  StudioQuestion,
  AttendanceRecord,
  CatchUpSessionItem,
  UserProfile,
  QuizModel,
  FlashcardItem,
  ConceptAnimationModel,
} from '../types/chalk';

// Canonical Demo Personas (Alex Okafor & Prof. Adeleke O.)
export const DEMO_STUDENT_USER: UserProfile = {
  id: 'usr_alex_okafor_unilag_edu_ng',
  name: 'Alex Okafor',
  email: 'alex.okafor@unilag.edu.ng',
  role: 'student',
  department: 'Computer Science & Engineering',
  matricOrStaffId: 'CSC/2022/1042',
  avatarTag: 'AO',
  isProfileComplete: true,
  isDemo: true,
};

export const DEMO_LECTURER_USER: UserProfile = {
  id: 'usr_adeleke_prof_unilag_edu_ng',
  name: 'Prof. Adeleke O.',
  email: 'adeleke.prof@unilag.edu.ng',
  role: 'lecturer',
  department: 'Computer Science & Engineering',
  matricOrStaffId: 'STAFF/CS/2018',
  avatarTag: 'PA',
  isProfileComplete: true,
  isDemo: true,
};

const DEMO_EMAILS = new Set([
  'alex.okafor@unilag.edu.ng',
  'adeleke.prof@unilag.edu.ng',
  'usr_alex_okafor_unilag_edu_ng@unilag.edu.ng',
  'usr_adeleke_prof_unilag_edu_ng@unilag.edu.ng',
]);

const DEMO_USER_IDS = new Set([
  'usr_alex_okafor_unilag_edu_ng',
  'usr_adeleke_prof_unilag_edu_ng',
]);

/**
 * Returns true ONLY if the provided user profile belongs to one of the two demo accounts
 * (Alex Okafor or Prof. Adeleke O.). Actual user accounts always return false.
 */
export const isDemoAccount = (user?: Partial<UserProfile> | null): boolean => {
  if (!user) return false;
  if (user.isDemo === true) return true;
  if (user.isDemo === false) return false;
  const email = (user.email || '').trim().toLowerCase();
  const id = (user.id || '').trim().toLowerCase();
  return DEMO_EMAILS.has(email) || DEMO_USER_IDS.has(id);
};

export const DEMO_COURSE_IDS = new Set(['csc401', 'csc412', 'mth304']);

// Empty initial arrays for actual user accounts
export const INITIAL_TOPICS: TopicModel[] = [];
export const INITIAL_COURSES: CourseModel[] = [];
export const INITIAL_ANNOUNCEMENTS: CourseAnnouncement[] = [];
export const INITIAL_ANNOUNCEMENT_COMMENTS: Record<string, CourseAnnouncementComment[]> = {};
export const INITIAL_ASSIGNMENTS: ClassworkAssignment[] = [];
export const INITIAL_SUBMISSIONS: StudentSubmission[] = [];
export const INITIAL_POLLS: StudioPoll[] = [];
export const INITIAL_QUESTIONS: StudioQuestion[] = [];
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
export const DEFAULT_BOARD_STROKES: StrokeData[] = [];
export const CATCHUP_CATALOG: CatchUpSessionItem[] = [];

// Rich Demo Dataset (strictly scoped to Alex Okafor & Prof. Adeleke O.)
export const DEMO_TOPICS: TopicModel[] = [
  { id: 'top_csc401_1', courseId: 'csc401', name: 'Module 1: Graph Theory & Shortest Paths', order: 1 },
  { id: 'top_csc401_2', courseId: 'csc401', name: 'Module 2: Dynamic Programming & Network Flow', order: 2 },
  { id: 'top_csc412_1', courseId: 'csc412', name: 'Module 1: Lexical Analysis & Parsing', order: 1 },
  { id: 'top_csc412_2', courseId: 'csc412', name: 'Module 2: SSA Intermediate Representation & Optimization', order: 2 },
  { id: 'top_mth304_1', courseId: 'mth304', name: 'Module 1: Eigenvalues & Iterative Solvers', order: 1 },
];

export const DEMO_COURSES: CourseModel[] = [
  {
    id: 'csc401',
    code: 'CSC 401',
    title: 'Algorithms & Complexity Analysis',
    lecturerName: 'Prof. Adeleke O.',
    lecturerId: DEMO_LECTURER_USER.id,
    accentHex: '#059669',
    hasLiveSession: true,
    liveRoomCode: 'csc401-algo',
    enrolledCount: 4,
    memberIds: [
      DEMO_STUDENT_USER.id,
      'usr_demo_amina',
      'usr_demo_tunde',
      'usr_demo_chisom',
    ],
    members: [
      {
        id: DEMO_LECTURER_USER.id,
        name: DEMO_LECTURER_USER.name,
        avatarTag: DEMO_LECTURER_USER.avatarTag,
        role: 'lecturer',
        matricOrStaffId: DEMO_LECTURER_USER.matricOrStaffId,
      },
      {
        id: DEMO_STUDENT_USER.id,
        name: DEMO_STUDENT_USER.name,
        avatarTag: DEMO_STUDENT_USER.avatarTag,
        role: 'student',
        matricOrStaffId: DEMO_STUDENT_USER.matricOrStaffId,
      },
      {
        id: 'usr_demo_amina',
        name: 'Amina Bello',
        avatarTag: 'AB',
        role: 'student',
        matricOrStaffId: 'CSC/2022/1018',
      },
      {
        id: 'usr_demo_tunde',
        name: 'Tunde Bakare',
        avatarTag: 'TB',
        role: 'student',
        matricOrStaffId: 'CSC/2022/1089',
      },
      {
        id: 'usr_demo_chisom',
        name: 'Chisom Eze',
        avatarTag: 'CE',
        role: 'student',
        matricOrStaffId: 'CSC/2022/1104',
      },
    ],
    scheduleTime: 'Mon & Wed • 10:00 AM',
    department: 'Computer Science & Engineering',
    section: '400 Level • First Semester',
    room: 'LT-02 / Chalk Vector Studio',
    subject: 'Theoretical Computer Science',
    themeColor: '#059669',
    streamPermissions: 'all',
    classworkStreamDisplay: 'detailed',
    gradingSystem: {
      calculationType: 'total_points',
      showToStudents: true,
      categories: [
        { id: 'cat_hw', name: 'Problem Sets', weight: 40 },
        { id: 'cat_lab', name: 'Implementation Labs', weight: 30 },
        { id: 'cat_exam', name: 'Midterm & Final', weight: 30 },
      ],
    },
    studioSettings: {
      studioUrl: '/studio/csc401-algo',
      isVisibleToStudents: true,
    },
  },
  {
    id: 'csc412',
    code: 'CSC 412',
    title: 'Compiler Construction & Optimization',
    lecturerName: 'Prof. Adeleke O.',
    lecturerId: DEMO_LECTURER_USER.id,
    accentHex: '#0D9488',
    hasLiveSession: false,
    liveRoomCode: 'csc412-compilers',
    enrolledCount: 3,
    memberIds: [DEMO_STUDENT_USER.id, 'usr_demo_amina', 'usr_demo_tunde'],
    members: [
      {
        id: DEMO_LECTURER_USER.id,
        name: DEMO_LECTURER_USER.name,
        avatarTag: DEMO_LECTURER_USER.avatarTag,
        role: 'lecturer',
        matricOrStaffId: DEMO_LECTURER_USER.matricOrStaffId,
      },
      {
        id: DEMO_STUDENT_USER.id,
        name: DEMO_STUDENT_USER.name,
        avatarTag: DEMO_STUDENT_USER.avatarTag,
        role: 'student',
        matricOrStaffId: DEMO_STUDENT_USER.matricOrStaffId,
      },
      {
        id: 'usr_demo_amina',
        name: 'Amina Bello',
        avatarTag: 'AB',
        role: 'student',
        matricOrStaffId: 'CSC/2022/1018',
      },
      {
        id: 'usr_demo_tunde',
        name: 'Tunde Bakare',
        avatarTag: 'TB',
        role: 'student',
        matricOrStaffId: 'CSC/2022/1089',
      },
    ],
    scheduleTime: 'Tue & Thu • 2:00 PM',
    department: 'Computer Science & Engineering',
    section: '400 Level • Systems Track',
    room: 'Systems Lab B / Chalk Studio',
    subject: 'Programming Languages & Compilers',
    themeColor: '#0D9488',
    streamPermissions: 'all',
    classworkStreamDisplay: 'detailed',
    studioSettings: {
      studioUrl: '/studio/csc412-compilers',
      isVisibleToStudents: true,
    },
  },
  {
    id: 'mth304',
    code: 'MTH 304',
    title: 'Numerical Analysis & Linear Algebra',
    lecturerName: 'Prof. Adeleke O.',
    lecturerId: DEMO_LECTURER_USER.id,
    accentHex: '#2563EB',
    hasLiveSession: false,
    liveRoomCode: 'mth304-linear',
    enrolledCount: 2,
    memberIds: [DEMO_STUDENT_USER.id, 'usr_demo_chisom'],
    members: [
      {
        id: DEMO_LECTURER_USER.id,
        name: DEMO_LECTURER_USER.name,
        avatarTag: DEMO_LECTURER_USER.avatarTag,
        role: 'lecturer',
        matricOrStaffId: DEMO_LECTURER_USER.matricOrStaffId,
      },
      {
        id: DEMO_STUDENT_USER.id,
        name: DEMO_STUDENT_USER.name,
        avatarTag: DEMO_STUDENT_USER.avatarTag,
        role: 'student',
        matricOrStaffId: DEMO_STUDENT_USER.matricOrStaffId,
      },
      {
        id: 'usr_demo_chisom',
        name: 'Chisom Eze',
        avatarTag: 'CE',
        role: 'student',
        matricOrStaffId: 'CSC/2022/1104',
      },
    ],
    scheduleTime: 'Fri • 9:00 AM',
    department: 'Mathematics & Computer Science',
    section: '300/400 Joint Cohort',
    room: 'Math Auditorium 1',
    subject: 'Numerical Computation',
    themeColor: '#2563EB',
    streamPermissions: 'all',
    classworkStreamDisplay: 'condensed',
    studioSettings: {
      studioUrl: '/studio/mth304-linear',
      isVisibleToStudents: true,
    },
  },
];

export const DEMO_ANNOUNCEMENTS: CourseAnnouncement[] = [
  {
    id: 'ann_demo_1',
    courseId: 'csc401',
    authorName: 'Prof. Adeleke O.',
    authorRole: 'lecturer',
    timestamp: 'Today, 09:30 AM',
    content:
      'Welcome to Week 6 of CSC 401! Today we are covering Dijkstra Shortest Path and Fibonacci Heap amortized complexity on the live vector board. If you are on a 2G/3G connection, keep video off — vector board telemetry uses less than 4 kbps.',
    isLiveNotice: true,
    commentsCount: 2,
  },
  {
    id: 'ann_demo_2',
    courseId: 'csc401',
    authorName: 'Prof. Adeleke O.',
    authorRole: 'lecturer',
    timestamp: 'Yesterday, 04:15 PM',
    content:
      'Problem Set 2 (Shortest Path & Network Flow Proofs) has been posted under Classwork. Please submit your proofs or annotated board snapshots before Friday at 11:59 PM.',
    isLiveNotice: false,
    commentsCount: 1,
  },
  {
    id: 'ann_demo_3',
    courseId: 'csc412',
    authorName: 'Prof. Adeleke O.',
    authorRole: 'lecturer',
    timestamp: '2 days ago',
    content:
      'Lab 1 grades and feedback for the Recursive Descent Parser have been returned. Check the Grades tab or your assignment submission page for inline comments.',
    isLiveNotice: false,
    commentsCount: 0,
  },
];

export const DEMO_ANNOUNCEMENT_COMMENTS: Record<string, CourseAnnouncementComment[]> = {
  ann_demo_1: [
    {
      id: 'cmt_demo_1',
      announcementId: 'ann_demo_1',
      authorId: DEMO_STUDENT_USER.id,
      authorName: 'Alex Okafor',
      authorRole: 'student',
      avatarTag: 'AO',
      content: 'Thank you Prof! The vector board is super smooth even on my mobile hotspot.',
      timestamp: 'Today, 09:38 AM',
    },
    {
      id: 'cmt_demo_2',
      announcementId: 'ann_demo_1',
      authorId: 'usr_demo_amina',
      authorName: 'Amina Bello',
      authorRole: 'student',
      avatarTag: 'AB',
      content: 'Will the DVR replay be available right after the lecture?',
      timestamp: 'Today, 09:42 AM',
    },
  ],
  ann_demo_2: [
    {
      id: 'cmt_demo_3',
      announcementId: 'ann_demo_2',
      authorId: DEMO_LECTURER_USER.id,
      authorName: 'Prof. Adeleke O.',
      authorRole: 'lecturer',
      avatarTag: 'PA',
      content: 'Remember to show the relaxation step clearly for each iteration.',
      timestamp: 'Yesterday, 05:00 PM',
    },
  ],
};

export const DEMO_ASSIGNMENTS: ClassworkAssignment[] = [
  {
    id: 'asg_demo_csc401_1',
    courseId: 'csc401',
    title: 'Problem Set 2: Dijkstra & Bellman-Ford Edge Relaxation',
    dueDate: 'Fri, Nov 13',
    dueTime: '23:59',
    description:
      '1. Prove the loop invariant for Dijkstra shortest-path relaxation on non-negative weighted graphs.\n2. Trace Bellman-Ford on the 6-vertex crisis topology graph from Slide 2 and detect if a negative cycle exists.\n3. Compare binary heap vs. Fibonacci heap decrease-key complexity.',
    isSubmitted: false,
    points: '100 pts',
    type: 'assignment',
    topicId: 'top_csc401_1',
    allowStudentComments: true,
    rubric: [
      {
        id: 'rub_1',
        criteria: [
          { title: 'Correctness of Relaxation Proof', points: 40, description: 'Inductive step and base case clearly proven' },
          { title: 'Bellman-Ford Trace Table', points: 35, description: 'All |V|-1 passes shown accurately' },
          { title: 'Asymptotic Complexity Analysis', points: 25, description: 'Clear derivation of O(E + V log V)' },
        ],
      },
    ],
  },
  {
    id: 'asg_demo_csc401_2',
    courseId: 'csc401',
    title: 'Lab 1: Adjacency List & Priority Queue Telemetry Benchmark',
    dueDate: 'Mon, Nov 9',
    dueTime: '18:00',
    description:
      'Implement a memory-compact adjacency list in TypeScript or Python and benchmark Dijkstra runtime across sparse and dense graphs (V = 10,000). Submit your report and complexity plots.',
    isSubmitted: true,
    points: '100 pts',
    submissionNote: 'Attached TypeScript benchmark implementation and runtime analysis.',
    submittedAt: 'Yesterday, 03:20 PM',
    type: 'assignment',
    topicId: 'top_csc401_1',
  },
  {
    id: 'asg_demo_csc412_1',
    courseId: 'csc412',
    title: 'Lab 1: LL(1) First & Follow Sets + Recursive Descent Parser',
    dueDate: 'Last Fri',
    dueTime: '23:59',
    description:
      'Construct FIRST and FOLLOW tables for the Chalk expression grammar and implement a predictive recursive-descent parser with syntax error recovery.',
    isSubmitted: true,
    points: '100 pts',
    submissionNote: 'Submitted parser source and grammar derivation trees.',
    submittedAt: '4 days ago',
    type: 'assignment',
    topicId: 'top_csc412_1',
  },
  {
    id: 'asg_demo_mth304_1',
    courseId: 'mth304',
    title: 'Worksheet 1: Gauss-Seidel vs. Jacobi Convergence Rate',
    dueDate: 'Next Wed',
    dueTime: '17:00',
    description:
      'Compute the spectral radius of the iteration matrix for the 3x3 diagonally dominant system and determine the number of iterations required for 10^-6 tolerance.',
    isSubmitted: false,
    points: '50 pts',
    type: 'assignment',
    topicId: 'top_mth304_1',
  },
];

export const DEMO_SUBMISSIONS: StudentSubmission[] = [
  // Problem Set 2: Assigned to Alex, Turned in by Amina & Tunde (so Prof. Adeleke has items to review!)
  {
    id: 'sub_demo_1',
    assignmentId: 'asg_demo_csc401_1',
    courseId: 'csc401',
    studentId: DEMO_STUDENT_USER.id,
    studentName: DEMO_STUDENT_USER.name,
    studentAvatar: DEMO_STUDENT_USER.avatarTag,
    matricOrStaffId: DEMO_STUDENT_USER.matricOrStaffId,
    status: 'assigned',
    maxPoints: 100,
    attachments: [],
    privateComments: [],
  },
  {
    id: 'sub_demo_2',
    assignmentId: 'asg_demo_csc401_1',
    courseId: 'csc401',
    studentId: 'usr_demo_amina',
    studentName: 'Amina Bello',
    studentAvatar: 'AB',
    matricOrStaffId: 'CSC/2022/1018',
    status: 'turned_in',
    submittedAt: 'Today, 08:15 AM',
    maxPoints: 100,
    answerText:
      'Completed the inductive proof for Dijkstra relaxation and attached the 5-pass Bellman-Ford trace table showing negative cycle detection on edge (v4 -> v2).',
    attachments: [
      {
        name: 'Amina_CSC401_PS2_Proofs.pdf',
        url: '#demo-attachment-amina',
        type: 'file',
        size: '412 KB',
      },
    ],
    privateComments: [
      {
        id: 'pc_1',
        authorId: 'usr_demo_amina',
        authorName: 'Amina Bello',
        authorRole: 'student',
        avatarTag: 'AB',
        text: 'Prof, I included an extra diagram for Question 2.',
        timestamp: 'Today, 08:16 AM',
      },
    ],
  },
  {
    id: 'sub_demo_3',
    assignmentId: 'asg_demo_csc401_1',
    courseId: 'csc401',
    studentId: 'usr_demo_tunde',
    studentName: 'Tunde Bakare',
    studentAvatar: 'TB',
    matricOrStaffId: 'CSC/2022/1089',
    status: 'turned_in',
    submittedAt: 'Yesterday, 10:45 PM',
    maxPoints: 100,
    answerText:
      'Proofs for Q1-Q3 attached. Used amortized potential function Phi(H) = t(H) + 2m(H) for Fibonacci Heap analysis.',
    attachments: [
      {
        name: 'Tunde_PS2_Solutions.pdf',
        url: '#demo-attachment-tunde',
        type: 'file',
        size: '380 KB',
      },
    ],
    privateComments: [],
  },
  // Lab 1 CSC 401: Turned in by Alex (ready for Prof. Adeleke to grade), Graded for Amina
  {
    id: 'sub_demo_4',
    assignmentId: 'asg_demo_csc401_2',
    courseId: 'csc401',
    studentId: DEMO_STUDENT_USER.id,
    studentName: DEMO_STUDENT_USER.name,
    studentAvatar: DEMO_STUDENT_USER.avatarTag,
    matricOrStaffId: DEMO_STUDENT_USER.matricOrStaffId,
    status: 'turned_in',
    submittedAt: 'Yesterday, 03:20 PM',
    maxPoints: 100,
    answerText:
      'Implemented min-heap priority queue in TypeScript. Sparse graph (E = 3V) completed in 4.2ms; dense graph (E = V^2 / 4) completed in 38.6ms.',
    attachments: [
      {
        name: 'Alex_Okafor_Dijkstra_Benchmark.ts',
        url: '#demo-attachment-alex-lab1',
        type: 'file',
        size: '28 KB',
      },
    ],
    privateComments: [],
  },
  {
    id: 'sub_demo_5',
    assignmentId: 'asg_demo_csc401_2',
    courseId: 'csc401',
    studentId: 'usr_demo_amina',
    studentName: 'Amina Bello',
    studentAvatar: 'AB',
    matricOrStaffId: 'CSC/2022/1018',
    status: 'graded',
    submittedAt: '2 days ago',
    grade: 95,
    maxPoints: 100,
    answerText: 'Python heapq benchmark across 10k nodes with memory profiling.',
    attachments: [
      {
        name: 'Amina_Lab1_Report.pdf',
        url: '#demo-attachment-amina-lab1',
        type: 'file',
        size: '520 KB',
      },
    ],
    privateComments: [],
  },
  // Lab 1 CSC 412: Graded for Alex (so Alex sees graded work & feedback!)
  {
    id: 'sub_demo_6',
    assignmentId: 'asg_demo_csc412_1',
    courseId: 'csc412',
    studentId: DEMO_STUDENT_USER.id,
    studentName: DEMO_STUDENT_USER.name,
    studentAvatar: DEMO_STUDENT_USER.avatarTag,
    matricOrStaffId: DEMO_STUDENT_USER.matricOrStaffId,
    status: 'graded',
    submittedAt: '4 days ago',
    grade: 92,
    maxPoints: 100,
    answerText:
      'Constructed LL(1) parse table with epsilon-productions resolved and panic-mode synchronization tokens.',
    attachments: [
      {
        name: 'Alex_Okafor_LL1_Parser.zip',
        url: '#demo-attachment-alex-csc412',
        type: 'file',
        size: '115 KB',
      },
    ],
    privateComments: [
      {
        id: 'pc_2',
        authorId: DEMO_LECTURER_USER.id,
        authorName: 'Prof. Adeleke O.',
        authorRole: 'lecturer',
        avatarTag: 'PA',
        text: 'Excellent handling of left-recursion elimination and clean AST output, Alex! (92/100)',
        timestamp: '2 days ago',
      },
    ],
  },
  // MTH 304 Worksheet 1: Assigned to Alex
  {
    id: 'sub_demo_7',
    assignmentId: 'asg_demo_mth304_1',
    courseId: 'mth304',
    studentId: DEMO_STUDENT_USER.id,
    studentName: DEMO_STUDENT_USER.name,
    studentAvatar: DEMO_STUDENT_USER.avatarTag,
    matricOrStaffId: DEMO_STUDENT_USER.matricOrStaffId,
    status: 'assigned',
    maxPoints: 50,
    attachments: [],
    privateComments: [],
  },
];

export const DEMO_BOARD_STROKES: StrokeData[] = [
  {
    id: 'demo_stroke_1',
    roomId: 'csc401-algo',
    userId: DEMO_LECTURER_USER.id,
    userName: DEMO_LECTURER_USER.name,
    timestamp: Date.now() - 120000,
    tool: 'circle',
    color: '#69DB7C',
    width: 3.5,
    points: [
      { x: 0.22, y: 0.35 },
      { x: 0.30, y: 0.45 },
    ],
    slideIndex: 0,
  },
  {
    id: 'demo_stroke_2',
    roomId: 'csc401-algo',
    userId: DEMO_LECTURER_USER.id,
    userName: DEMO_LECTURER_USER.name,
    timestamp: Date.now() - 115000,
    tool: 'arrow',
    color: '#FFD43B',
    width: 3.5,
    points: [
      { x: 0.31, y: 0.40 },
      { x: 0.52, y: 0.40 },
    ],
    slideIndex: 0,
  },
  {
    id: 'demo_stroke_3',
    roomId: 'csc401-algo',
    userId: DEMO_LECTURER_USER.id,
    userName: DEMO_LECTURER_USER.name,
    timestamp: Date.now() - 110000,
    tool: 'circle',
    color: '#4DABF7',
    width: 3.5,
    points: [
      { x: 0.53, y: 0.35 },
      { x: 0.61, y: 0.45 },
    ],
    slideIndex: 0,
  },
];

export const DEMO_CATCHUP_CATALOG: CatchUpSessionItem[] = [
  {
    id: 'rec_demo_csc401_dijkstra',
    roomId: 'csc401-algo',
    courseId: 'csc401',
    courseCode: 'CSC 401',
    title: 'Graph Theory & Dijkstra Shortest Path',
    lecturerName: 'Prof. Adeleke O.',
    recordedAt: new Date(Date.now() - 86400000).toISOString(),
    endedAt: new Date(Date.now() - 86220000).toISOString(),
    durationMs: 180000,
    strokeCount: 5,
    chatCount: 2,
    participantCount: 4,
  },
  {
    id: 'rec_demo_csc412_ssa',
    roomId: 'csc412-compilers',
    courseId: 'csc412',
    courseCode: 'CSC 412',
    title: 'SSA Form & Dominance Frontiers in Optimizing Compilers',
    lecturerName: 'Prof. Adeleke O.',
    recordedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    endedAt: new Date(Date.now() - 3 * 86400000 + 240000).toISOString(),
    durationMs: 240000,
    strokeCount: 4,
    chatCount: 1,
    participantCount: 3,
  },
];

export const DEMO_QUIZZES: QuizModel[] = [
  {
    id: 'quiz_demo_csc401_1',
    courseId: 'csc401',
    title: 'Week 6 Checkpoint: Shortest Paths & Heap Complexity',
    authorId: DEMO_LECTURER_USER.id,
    authorName: 'Prof. Adeleke O.',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    myBestScore: 2,
    myAttempts: 1,
    attemptCount: 4,
    averageScore: 83.3,
    questions: [
      {
        id: 'q1',
        question: 'What is the primary condition for relaxing a directed edge (u, v) with weight w(u, v) in Dijkstra\'s algorithm?',
        options: [
          'd[v] > d[u] + w(u, v)',
          'd[v] < d[u] - w(u, v)',
          'd[u] == d[v] + w(u, v)',
          'w(u, v) < 0',
        ],
        correctIndex: 0,
        explanation: 'An edge (u, v) is relaxed whenever going through u yields a strictly shorter path to v: d[v] > d[u] + w(u, v).',
      },
      {
        id: 'q2',
        question: 'What is the asymptotic time complexity of Dijkstra\'s algorithm using a Fibonacci Heap?',
        options: [
          'O(V^2)',
          'O(E + V log V)',
          'O(V E)',
          'O(E log E)',
        ],
        correctIndex: 1,
        explanation: 'Fibonacci Heaps support O(1) amortized decrease-key and O(log V) extract-min, giving O(E + V log V).',
      },
      {
        id: 'q3',
        question: 'Which shortest-path algorithm correctly handles graphs with negative-weight edges and detects negative cycles?',
        options: [
          'Dijkstra\'s Algorithm',
          'Prim\'s Algorithm',
          'Bellman-Ford Algorithm',
          'Kruskal\'s Algorithm',
        ],
        correctIndex: 2,
        explanation: 'Bellman-Ford relaxes all E edges |V| - 1 times and checks for a |V|-th relaxation to detect negative-weight cycles.',
      },
    ],
  },
  {
    id: 'quiz_demo_csc412_1',
    courseId: 'csc412',
    title: 'Lexical Analysis & LL(1) Parsing Fundamentals',
    authorId: DEMO_LECTURER_USER.id,
    authorName: 'Prof. Adeleke O.',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    myBestScore: null,
    myAttempts: 0,
    attemptCount: 2,
    averageScore: 90.0,
    questions: [
      {
        id: 'q1',
        question: 'Why must left recursion be eliminated before constructing a predictive recursive-descent parser?',
        options: [
          'To reduce memory usage of the lexer',
          'Because immediate left recursion causes infinite recursion in top-down leftmost derivations',
          'Because LL(1) parsers cannot read tokens from left to right',
          'To convert the grammar into Chomsky Normal Form',
        ],
        correctIndex: 1,
        explanation: 'A top-down recursive-descent procedure for A -> A alpha would call itself indefinitely without consuming input tokens.',
      },
      {
        id: 'q2',
        question: 'In Static Single Assignment (SSA) form, what is the purpose of a Phi (Φ) node?',
        options: [
          'To allocate registers on the stack',
          'To select a variable version based on the control-flow predecessor block taken',
          'To strip dead comments from source code',
          'To inline recursive functions',
        ],
        correctIndex: 1,
        explanation: 'At control-flow join points, a Φ-function merges distinct SSA variable definitions from incoming basic blocks.',
      },
    ],
  },
];

export const DEMO_NOTES: Record<string, string> = {
  csc401: `# CSC 401 — Lecture Notes (Alex Okafor)\n\n## Week 6: Dijkstra & Priority Queues\n- **Relaxation Invariant**: If \`d[v] > d[u] + w(u, v)\`, update \`d[v] = d[u] + w(u, v)\` and \`pi[v] = u\`.\n- **Binary Heap**: \`O((V + E) log V)\` — great cache locality in practice.\n- **Fibonacci Heap**: \`O(E + V log V)\` — amortized \`O(1)\` decrease-key.\n- **Todo before Friday**: Finish Problem Set 2 Question 2 trace table.`,
  csc412: `# CSC 412 — Compiler Construction Notes\n\n## LL(1) Grammar Conditions\n1. No ambiguity\n2. No left recursion\n3. Left-factored productions so \`FIRST(alpha) ∩ FIRST(beta) = ∅\`.`,
  mth304: `# MTH 304 — Numerical Linear Algebra\n\n- **Jacobi Method**: Updates all components simultaneously using values from iteration \`k\`.\n- **Gauss-Seidel**: Uses updated \`x_i^{(k+1)}\` immediately as soon as computed.`,
};

export const DEMO_FLASHCARDS: FlashcardItem[] = [
  {
    id: 'fc_csc401_1',
    courseId: 'csc401',
    topic: 'Shortest Paths',
    front: 'What is the edge relaxation condition in Dijkstra and Bellman-Ford?',
    back: 'If d[v] > d[u] + w(u, v), then update d[v] = d[u] + w(u, v) and predecessor π[v] = u.',
    hint: 'Compare current shortest estimate to v with the path through u.',
  },
  {
    id: 'fc_csc401_2',
    courseId: 'csc401',
    topic: 'Priority Queues',
    front: 'Why does a Fibonacci Heap improve Dijkstra complexity to O(E + V log V)?',
    back: 'Because decrease-key runs in O(1) amortized time across all E edge relaxations, while V extract-min operations take O(V log V).',
    hint: 'Think about the amortized cost of decrease-key vs. extract-min.',
  },
  {
    id: 'fc_csc401_3',
    courseId: 'csc401',
    topic: 'Negative Cycles',
    front: 'How does Bellman-Ford detect a negative-weight cycle reachable from the source?',
    back: 'After |V| - 1 full relaxation passes over all edges, it performs one additional check: if any edge (u, v) still satisfies d[v] > d[u] + w(u, v), a negative cycle exists.',
    hint: 'A simple path in a graph with |V| vertices has at most |V| - 1 edges.',
  },
  {
    id: 'fc_csc401_4',
    courseId: 'csc401',
    topic: 'Network Flow',
    front: 'State the Max-Flow Min-Cut Theorem (Ford-Fulkerson).',
    back: 'The maximum value of an s-t flow in a flow network equals the minimum capacity over all s-t cuts in the network.',
    hint: 'Relates residual augmenting paths to bottleneck cut capacity.',
  },
  {
    id: 'fc_csc412_1',
    courseId: 'csc412',
    topic: 'LL(1) Parsing',
    front: 'What two conditions must hold for a production A → α | β in an LL(1) grammar?',
    back: '1) FIRST(α) ∩ FIRST(β) = ∅, and 2) if ε ∈ FIRST(α), then FIRST(β) ∩ FOLLOW(A) = ∅ (and at most one alternative can derive ε).',
    hint: 'Predictive parsing table cells M[A, a] must have at most one production.',
  },
  {
    id: 'fc_csc412_2',
    courseId: 'csc412',
    topic: 'SSA Form',
    front: 'Where are Φ (Phi) functions placed when converting a Control Flow Graph into minimal SSA form?',
    back: 'At the Iterated Dominance Frontier (IDF) of the basic blocks where each variable is assigned.',
    hint: 'Look at where distinct reaching definitions first converge.',
  },
  {
    id: 'fc_mth304_1',
    courseId: 'mth304',
    topic: 'Iterative Solvers',
    front: 'What is the necessary and sufficient condition for stationary iterative methods x^(k+1) = G x^(k) + c to converge for any initial guess?',
    back: 'The spectral radius ρ(G) = max |λ_i(G)| of the iteration matrix G must be strictly less than 1 (ρ(G) < 1).',
    hint: 'Consider the eigenvalues of the iteration matrix G.',
  },
  {
    id: 'fc_mth304_2',
    courseId: 'mth304',
    topic: 'Matrix Conditioning',
    front: 'How does the condition number κ(A) = ||A|| · ||A⁻¹|| affect linear system sensitivity?',
    back: 'A large condition number κ(A) >> 1 (ill-conditioned) amplifies small relative perturbations in b or A into large relative errors in the solution x.',
    hint: 'Bounds the relative error magnification in Ax = b.',
  },
];

export const DEMO_CONCEPT_ANIMATIONS: ConceptAnimationModel[] = [
  {
    id: 'anim_csc401_dijkstra',
    courseId: 'csc401',
    title: 'Dijkstra Edge Relaxation & Priority Queue Walkthrough',
    category: 'Graph Algorithms',
    visualType: 'dijkstra',
    steps: [
      {
        label: 'Step 1: Initialize Source Distances',
        formula: 'd[u] = 0,  d[v] = ∞,  d[x] = ∞,  d[t] = ∞',
        description:
          'Set source vertex u distance to 0 and all other vertices to ∞. Push all vertices into the min-priority queue Q ordered by d[·].',
        highlightNodes: ['u'],
        activeEdges: [],
        values: { u: '0', v: '∞', x: '∞', t: '∞' },
      },
      {
        label: 'Step 2: Extract u & Relax Outgoing Edges (u,v) and (u,x)',
        formula: 'd[v] = min(∞, 0 + 4) = 4,   d[x] = min(∞, 0 + 2) = 2',
        description:
          'Extract min vertex u (d=0). Relax edge (u, v) of weight 4 → d[v] = 4, and edge (u, x) of weight 2 → d[x] = 2.',
        highlightNodes: ['u', 'v', 'x'],
        activeEdges: ['u-v', 'u-x'],
        values: { u: '0', v: '4', x: '2', t: '∞' },
      },
      {
        label: 'Step 3: Extract x (d=2) & Tighten Path to v via (x,v)',
        formula: 'd[v] > d[x] + w(x, v)  ⇒  4 > 2 + 1  ⇒  d[v] = 3',
        description:
          'Extract x (d=2) from Q. Edge (x, v) has weight 1: since 2 + 1 = 3 < 4, decrease-key updates d[v] from 4 down to 3! Also relax (x, t) of weight 6 → d[t] = 8.',
        highlightNodes: ['x', 'v', 't'],
        activeEdges: ['x-v', 'x-t'],
        values: { u: '0', v: '3', x: '2', t: '8' },
      },
      {
        label: 'Step 4: Extract v (d=3) & Relax Final Edge (v,t)',
        formula: 'd[t] > d[v] + w(v, t)  ⇒  8 > 3 + 2  ⇒  d[t] = 5',
        description:
          'Extract v (d=3). Relax edge (v, t) of weight 2: since 3 + 2 = 5 < 8, update d[t] = 5. Shortest path u → x → v → t (total cost 5) is locked in!',
        highlightNodes: ['u', 'x', 'v', 't'],
        activeEdges: ['u-x', 'x-v', 'v-t'],
        values: { u: '0', v: '3', x: '2', t: '5' },
      },
    ],
  },
  {
    id: 'anim_csc412_ssa',
    courseId: 'csc412',
    title: 'SSA Dominance Frontier & Φ-Function Insertion',
    category: 'Compiler Optimization',
    visualType: 'ssa_cfg',
    steps: [
      {
        label: 'Step 1: Identify Variable Assignments in CFG',
        formula: 'Defs(y) = { B1, B2 }',
        description:
          'Entry block B0 branches into B1 (then-branch: y = x + 1) and B2 (else-branch: y = x * 2), which both merge at join block B3.',
        highlightNodes: ['B0', 'B1', 'B2'],
        activeEdges: ['B0-B1', 'B0-B2'],
        values: { B0: 'x₀ = input()', B1: 'y = x₀ + 1', B2: 'y = x₀ * 2', B3: 'return y' },
      },
      {
        label: 'Step 2: Rename Local Definitions to Unique SSA Versions',
        formula: 'B1: y₁ = x₀ + 1,   B2: y₂ = x₀ * 2',
        description:
          'Each static assignment receives a fresh version subscript so every variable version is defined exactly once.',
        highlightNodes: ['B1', 'B2'],
        activeEdges: ['B1-B3', 'B2-B3'],
        values: { B0: 'x₀ = input()', B1: 'y₁ = x₀ + 1', B2: 'y₂ = x₀ * 2', B3: 'return y_?' },
      },
      {
        label: 'Step 3: Place Φ-Function at Dominance Frontier B3',
        formula: 'B3: y₃ = Φ(y₁ : B1, y₂ : B2)',
        description:
          'Because B3 is in the dominance frontier DF(B1) ∪ DF(B2), insert y₃ = Φ(y₁, y₂) at the top of B3 and rewrite the return use to y₃.',
        highlightNodes: ['B1', 'B2', 'B3'],
        activeEdges: ['B1-B3', 'B2-B3'],
        values: { B0: 'x₀ = input()', B1: 'y₁ = x₀ + 1', B2: 'y₂ = x₀ * 2', B3: 'y₃ = Φ(y₁, y₂)' },
      },
    ],
  },
  {
    id: 'anim_mth304_gauss',
    courseId: 'mth304',
    title: 'Gauss-Seidel Immediate Relaxation vs. Jacobi Iteration',
    category: 'Numerical Linear Algebra',
    visualType: 'gauss_seidel',
    steps: [
      {
        label: 'Step 1: Initial Guess x^(0) = [0, 0]',
        formula: '4x₁ - x₂ = 7,   -x₁ + 4x₂ = 2',
        description:
          'Consider the diagonally dominant 2×2 system with exact solution x* = [2, 1]. Start from initial vector x^(0) = (0.000, 0.000).',
        highlightNodes: ['x1', 'x2'],
        activeEdges: [],
        values: { 'x₁^(k)': '0.000', 'x₂^(k)': '0.000', Residual: '7.280' },
      },
      {
        label: 'Step 2: Iteration 1 — Immediate Substitution',
        formula: 'x₁^(1) = (7 + 0)/4 = 1.750  →  x₂^(1) = (2 + 1.750)/4 = 0.938',
        description:
          'Gauss-Seidel computes x₁^(1) = 1.750 and immediately uses 1.750 to compute x₂^(1) = 0.938 in the same sweep, cutting error in half compared to Jacobi.',
        highlightNodes: ['x1', 'x2'],
        activeEdges: ['x1-x2'],
        values: { 'x₁^(k)': '1.750', 'x₂^(k)': '0.938', Residual: '0.944' },
      },
      {
        label: 'Step 3: Iteration 2 — Rapid Spectral Convergence',
        formula: 'x₁^(2) = (7 + 0.938)/4 = 1.984  →  x₂^(2) = (2 + 1.984)/4 = 0.996',
        description:
          'Using x₂^(1) = 0.938 yields x₁^(2) = 1.984 and x₂^(2) = 0.996 — within 0.8% of the exact solution [2.000, 1.000] in just two sweeps!',
        highlightNodes: ['x1', 'x2'],
        activeEdges: ['x1-x2'],
        values: { 'x₁^(k)': '1.984', 'x₂^(k)': '0.996', Residual: '0.059' },
      },
    ],
  },
];

export const DEMO_POLLS: StudioPoll[] = [
  {
    id: 'poll_demo_1',
    roomId: 'csc401-algo',
    question: 'Which priority queue structure gives O(1) amortized decrease-key in Dijkstra?',
    options: [
      { id: 'opt_1', text: 'Binary Min-Heap', votes: 1 },
      { id: 'opt_2', text: 'Fibonacci Heap', votes: 3 },
      { id: 'opt_3', text: 'Unsorted Linked List', votes: 0 },
    ],
    voters: {
      usr_demo_amina: 'opt_2',
      usr_demo_tunde: 'opt_2',
      usr_demo_chisom: 'opt_1',
    },
    isOpen: true,
    showResults: true,
    createdAt: Date.now() - 600000,
    createdBy: DEMO_LECTURER_USER.name,
  },
];

export const DEMO_QUESTIONS: StudioQuestion[] = [
  {
    id: 'q_demo_1',
    roomId: 'csc401-algo',
    authorId: 'usr_demo_amina',
    authorName: 'Amina Bello',
    authorAvatar: 'AB',
    text: 'Prof, does Dijkstra fail on all graphs with negative edges or only when there is a negative cycle reachable from the source?',
    upvotes: [DEMO_STUDENT_USER.id, 'usr_demo_tunde'],
    isAnswered: false,
    timestamp: Date.now() - 300000,
  },
];

export const DEMO_ATTENDANCE: AttendanceRecord[] = [
  {
    participantId: DEMO_LECTURER_USER.id,
    name: DEMO_LECTURER_USER.name,
    email: DEMO_LECTURER_USER.email,
    role: 'lecturer',
    joinTime: Date.now() - 1800000,
    durationMinutes: 30,
  },
  {
    participantId: DEMO_STUDENT_USER.id,
    name: DEMO_STUDENT_USER.name,
    email: DEMO_STUDENT_USER.email,
    role: 'student',
    joinTime: Date.now() - 1680000,
    durationMinutes: 28,
  },
  {
    participantId: 'usr_demo_amina',
    name: 'Amina Bello',
    email: 'amina.bello@unilag.edu.ng',
    role: 'student',
    joinTime: Date.now() - 1500000,
    durationMinutes: 25,
  },
];
