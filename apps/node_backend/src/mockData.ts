import { DvrRecording, AiSummaryResponse } from './types';

export const SAMPLE_DVR_RECORDING: DvrRecording = {
  id: 'rec_chalk_csc401_01',
  roomId: 'MTH 112',
  courseCode: 'CSC 401',
  title: 'Graph Theory & Dijkstra Shortest Path (Crisis Session)',
  lecturerName: 'Prof. Adeleke O.',
  durationMs: 180000, // 3 minutes demo timeline
  totalEvents: 42,
  audioSizeKb: 540, // 540 KB for 3 min at 24kbps Opus!
  eventsSizeKb: 28,  // 28 KB vector event stream
  totalSizeKb: 568,
  zoomEquivalentSizeKb: 27000, // 27 MB for Zoom 3 min video
  savingsPercentage: 97.9,
  chapters: [
    { timestampMs: 0, title: 'Introduction & Crisis Network Setup', slideIndex: 0 },
    { timestampMs: 45000, title: 'Defining the Weighted Graph Nodes', slideIndex: 0 },
    { timestampMs: 90000, title: 'Relaxation Formula & Vector Proof', slideIndex: 1 },
    { timestampMs: 135000, title: 'Priority Queue Complexity & Q&A', slideIndex: 1 }
  ],
  events: [
    // Pre-recorded vector strokes simulating lecture blackboard work
    {
      t: 1200,
      type: 'stroke',
      data: {
        id: 'rec_s1',
        roomId: 'MTH 112',
        userId: 'prof_adeleke',
        userName: 'Prof. Adeleke O.',
        timestamp: 1200,
        tool: 'pen',
        color: '#FFE066',
        width: 3.5,
        points: [
          { x: 0.12, y: 0.22 },
          { x: 0.14, y: 0.24 },
          { x: 0.17, y: 0.22 },
          { x: 0.19, y: 0.26 }
        ]
      }
    },
    {
      t: 3500,
      type: 'stroke',
      data: {
        id: 'rec_s2',
        roomId: 'MTH 112',
        userId: 'prof_adeleke',
        userName: 'Prof. Adeleke O.',
        timestamp: 3500,
        tool: 'circle',
        color: '#74C0FC',
        width: 3.0,
        points: [
          { x: 0.25, y: 0.35 },
          { x: 0.32, y: 0.42 }
        ]
      }
    },
    {
      t: 6000,
      type: 'stroke',
      data: {
        id: 'rec_s3',
        roomId: 'MTH 112',
        userId: 'prof_adeleke',
        userName: 'Prof. Adeleke O.',
        timestamp: 6000,
        tool: 'line',
        color: '#FFA8A8',
        width: 2.8,
        points: [
          { x: 0.32, y: 0.38 },
          { x: 0.50, y: 0.38 }
        ]
      }
    },
    {
      t: 8500,
      type: 'stroke',
      data: {
        id: 'rec_s4',
        roomId: 'MTH 112',
        userId: 'prof_adeleke',
        userName: 'Prof. Adeleke O.',
        timestamp: 8500,
        tool: 'circle',
        color: '#74C0FC',
        width: 3.0,
        points: [
          { x: 0.50, y: 0.35 },
          { x: 0.57, y: 0.42 }
        ]
      }
    },
    {
      t: 12000,
      type: 'stroke',
      data: {
        id: 'rec_s5',
        roomId: 'MTH 112',
        userId: 'prof_adeleke',
        userName: 'Prof. Adeleke O.',
        timestamp: 12000,
        tool: 'pen',
        color: '#F8F9FA',
        width: 2.5,
        points: [
          { x: 0.27, y: 0.39 },
          { x: 0.28, y: 0.40 },
          { x: 0.29, y: 0.38 }
        ]
      }
    },
    {
      t: 16000,
      type: 'stroke',
      data: {
        id: 'rec_s6',
        roomId: 'MTH 112',
        userId: 'prof_adeleke',
        userName: 'Prof. Adeleke O.',
        timestamp: 16000,
        tool: 'highlighter',
        color: '#69DB7C',
        width: 14.0,
        points: [
          { x: 0.20, y: 0.20 },
          { x: 0.45, y: 0.20 }
        ]
      }
    }
  ]
};

export const SAMPLE_AI_SUMMARY: AiSummaryResponse = {
  lectureId: 'rec_chalk_csc401_01',
  topic: 'Dijkstra Shortest Path & Crisis Vector Telemetry',
  catchUpBullets: [
    'Graph Representation: Represented vertices V and edge weights w(u,v) using adjacency vectors rather than heavy bitmapped visuals.',
    'Relaxation Invariant: If d[u] + w(u,v) < d[v], then d[v] = d[u] + w(u,v).',
    'Min-Priority Queue: Fibonacci Heap achieves O(E + V log V) optimal runtime.',
    'Crisis Bandwidth Note: Real-time telemetry consumed 18.2 kbps vs 1200 kbps on conventional video platforms.'
  ],
  keyFormulas: [
    '\\text{Relax}(u, v, w): \\text{if } d[v] > d[u] + w(u, v) \\implies d[v] \\leftarrow d[u] + w(u, v)',
    'T(V, E) = O(|E| + |V| \\log |V|)',
    '\\text{Bandwidth Savings} = 1 - \\frac{B_{\\text{Chalk}}}{B_{\\text{Zoom}}} \\approx 97.6\\%'
  ],
  smartChapters: [
    { timestamp: '00:00', title: 'Session Init & Low-Bandwidth Mode', timestampMs: 0 },
    { timestamp: '00:45', title: 'Graph Node Coordinates & Vectors', timestampMs: 45000 },
    { timestamp: '01:30', title: 'Edge Relaxation Formula Proof', timestampMs: 90000 },
    { timestamp: '02:15', title: 'Priority Queue Optimizations', timestampMs: 135000 }
  ],
  quizQuestions: [
    {
      id: 1,
      question: 'What is the primary condition for relaxing an edge (u, v) with weight w in Dijkstra\'s algorithm?',
      options: [
        'd[v] > d[u] + w(u, v)',
        'd[v] < d[u] - w(u, v)',
        'd[v] == d[u] + w(u, v)',
        'd[u] > d[v] + w(u, v)'
      ],
      correctIndex: 0,
      explanation: 'Edge relaxation updates d[v] whenever a shorter path through u is discovered, i.e., d[v] > d[u] + w(u, v).'
    },
    {
      id: 2,
      question: 'How does Chalk achieve over 90% bandwidth reduction during lectures compared to Zoom?',
      options: [
        'By disabling student audio and lowering speaker volume',
        'By streaming normalized vector telemetry coordinates instead of screen video pixels',
        'By only allowing black and white images',
        'By compressing MP4 screen shares at 5 frames per minute'
      ],
      correctIndex: 1,
      explanation: 'Chalk streams lightweight (x, y, pressure, color) mathematical coordinates over WebSockets (~2-5 kbps) rather than high-bitrate 1080p video pixels (~1200 kbps).'
    },
    {
      id: 3,
      question: 'What is the theoretical time complexity of Dijkstra when implemented with a Fibonacci Heap?',
      options: [
        'O(V^2)',
        'O(E log V)',
        'O(E + V log V)',
        'O(V^3)'
      ],
      correctIndex: 2,
      explanation: 'Fibonacci Heaps allow decrease-key operations in amortized O(1) time, yielding O(E + V log V).'
    },
    {
      id: 4,
      question: 'In Chalk\'s QoS hierarchy, which data stream has Priority 1 during crisis network congestion?',
      options: [
        'Secondary 480p Lecturer Webcam Feed',
        'Real-Time Vector & Slide Telemetry',
        'Background AI Notes Download',
        'Student Video Feeds'
      ],
      correctIndex: 1,
      explanation: 'Vector and Slide Telemetry has Priority 1 (guaranteed under 5 kbps), followed by Opus Voice Stream (Priority 2).'
    },
    {
      id: 5,
      question: 'How does Chalk\'s "Vector DVR" record a 1-hour lecture in ~12 MB instead of 400 MB?',
      options: [
        'By saving a zip of low-res PNG screenshots every 10 seconds',
        'By pairing a 24 kbps Opus mono audio track with an append-only JSON event stream of vector strokes',
        'By converting video to animated GIFs',
        'By using standard YouTube compression'
      ],
      correctIndex: 1,
      explanation: 'Dual-Track Replay combines compressed audio (~10.8 MB/hr) with compact timestamped vector events (~1 MB/hr).'
    }
  ]
};
