# Chalk: Crisis-Resilient Virtual Classroom Architecture
**Academic Title:** *Design and Implementation of an Ultra-Low-Bandwidth Virtual Classroom Using Synchronized Vector Telemetry, Adaptive WebRTC Media, and Automated AI Lecture Synthesis (A Case Study of Election-Period Academic Continuity)*

---

## 1. Executive Summary & Problem Statement

### 1.1 Background
During sensitive national periods—such as general elections, curfews, or regional security alerts—universities are frequently forced to suspend physical classes and transition rapidly to remote learning. However, conventional video conferencing platforms (e.g., Zoom, Microsoft Teams, Google Meet) are engineered for high-speed broadband environments. They transmit continuous pixel-based video streams for screen sharing and lecturer feeds, consuming between $500\text{ MB}$ and $1.2\text{ GB}$ of data per hour.

### 1.2 Problem Statement
When students are displaced across diverse geographical areas with unstable power grids, high cellular data costs, and degraded 2G/3G/edge network coverage, pixel-based video streaming fails. Students experience severe packet loss, frozen screens, audio desynchronization, and prohibitive data expenses. Furthermore, missed live sessions require downloading massive `.mp4` video recordings, compounding the accessibility barrier.

### 1.3 Proposed Solution (Chalk)
**Chalk** is a cross-platform (Flutter Mobile & Web) real-time virtual classroom engineered specifically for network-constrained and crisis-affected academic environments. Instead of streaming heavy screen-share video pixels, Chalk transmits:
1. **Primary Mode (Ultra-Low-Bandwidth):** Opus-compressed real-time voice paired with a **Synchronized Vector Whiteboard & PDF Annotation Canvas**, streaming only lightweight mathematical coordinate telemetry $(x, y, pressure, color)$ over WebSockets.
2. **Secondary Mode (Adaptive Video Toggle):** An on-demand, low-bitrate WebRTC video stream (Simulcast/SVC) that lecturers can toggle on for physical demonstrations or sign-ins, and students can selectively enable or disable based on their local network health.
3. **Event-Log Call Recording (DVR):** Instead of recording $500\text{ MB}$ video files, lectures are recorded as **Time-Stamped Vector Event Logs + Compressed Audio ($\approx 8\text{--}15\text{ MB}$ per hour)**, playable interactively like a live canvas.
4. **AI Pedagogical Assistant:** Automated post-lecture transcription, structured note generation, timestamped topic indexing, and context-aware Q&A powered by speech-to-text and LLMs.

---

## 2. Aim and Objectives

### 2.1 Aim
To design, implement, and evaluate a cross-platform, bandwidth-adaptive virtual classroom system that reduces real-time e-learning data consumption by over $85\%$ while providing automated AI lecture synthesis and lightweight event-stream recording.

### 2.2 Specific Objectives
1. **Design a Real-Time Vector Telemetry Protocol** using Node.js and Socket.io to synchronize freehand whiteboard strokes, geometric shapes, LaTeX formulas, and PDF slide annotations across Flutter Web and Mobile clients with sub-$100\text{ ms}$ latency.
2. **Implement an Adaptive WebRTC Media Pipeline** (using LiveKit or Mediasoup with Node.js) that prioritizes continuous Opus audio ($16\text{--}32\text{ kbps}$) and provides an optional, congestion-aware secondary video channel.
3. **Engineer a Lightweight "Timeline Replay" Call Recorder** that serializes synchronized audio tracks and timestamped JSON vector events, enabling full lecture playback at a fraction of standard video file sizes.
4. **Integrate an AI Lecture Intelligence Pipeline** that transcribes recorded lecture audio, correlates spoken explanations with whiteboard snapshots, and generates downloadable revision summaries and practice quizzes.
5. **Evaluate System Performance** by benchmarking bandwidth consumption ($\text{MB/hr}$), stroke synchronization latency ($\text{ms}$), and packet-loss resilience against traditional screen-sharing platforms under simulated 3G network throttling.

---

## 3. System Architecture & Technology Stack

### 3.1 High-Level Architecture Diagram

```
+-----------------------------------------------------------------------+
|                     CLIENT TIER (Flutter Universal)                   |
|  +--------------------+  +--------------------+  +-----------------+  |
|  | CustomPainter      |  | flutter_webrtc     |  | Offline Replay  |  |
|  | Vector Canvas      |  | Opus Audio +       |  | & AI Summary    |  |
|  | & PDF Sync Engine  |  | Optional Video     |  | Viewer (Hive)   |  |
|  +---------+----------+  +---------+----------+  +--------+--------+  |
+------------|-----------------------|----------------------|-----------+
             | WebSockets (JSON/Bin) | WebRTC (SRTP/UDP)    | REST / HTTPS
             v                       v                      v
+-----------------------------------------------------------------------+
|                      BACKEND TIER (Node.js Core)                      |
|  +--------------------+  +--------------------+  +-----------------+  |
|  | Socket.io Room &   |  | WebRTC SFU         |  | AI & Recording  |  |
|  | Vector State       |  | (Mediasoup /       |  | Worker Queue    |  |
|  | Synchronizer       |  |  LiveKit Server)   |  | (BullMQ + FFmpeg|  |
|  +---------+----------+  +---------+----------+  +--------+--------+  |
+------------|-----------------------|----------------------|-----------+
             |                       |                      |
             v                       v                      v
+-----------------------------------------------------------------------+
|                    DATA, STORAGE & AI SERVICES TIER                   |
|  [Redis (Live Canvas State)]   [PostgreSQL (Users/Courses/Logs)]      |
|  [S3 / Cloudflare R2 (Audio & PDFs)]   [Whisper STT + Gemini/LLM API] |
+-----------------------------------------------------------------------+
```

### 3.2 Technology Stack Breakdown

| Layer | Technology | Role & Justification |
| :--- | :--- | :--- |
| **Frontend (Mobile & Web)** | **Flutter (Dart)** | Single codebase compiling to Android, iOS, and Web (CanvasKit renderer ensures identical 60fps vector drawing across mobile and browser). |
| **Vector Rendering** | `CustomPainter` + `perfect_freehand` | Hardware-accelerated 2D canvas rendering smooth, pressure-sensitive Bezier curves from raw $(x,y)$ coordinates. |
| **Real-Time Media** | `flutter_webrtc` / `livekit_client` | Handles Opus voice transmission, echo cancellation, and optional secondary video tracks. |
| **Local Persistence** | `Hive` or `Isar` (NoSQL) | Caches lecture vector logs, PDF slides, and AI summaries on the student's device for offline study. |
| **Backend Runtime** | **Node.js (TypeScript) + Express/Fastify** | Non-blocking, event-driven architecture ideal for handling thousands of concurrent WebSocket stroke packets. |
| **Real-Time Signaling** | **Socket.io + Redis Adapter** | Broadcasts whiteboard deltas, slide page turns, laser pointer coordinates, and room states. |
| **Media Server (SFU)** | **Mediasoup** (Node.js native) or **LiveKit** | Selective Forwarding Unit (SFU) that routes voice and optional video without expensive server-side transcoding. |
| **Database & Cache** | **PostgreSQL (Prisma) + Redis** | PostgreSQL stores users, courses, and metadata; Redis caches in-memory canvas strokes for late-joining students. |
| **AI Pipeline** | **Whisper (Groq/OpenAI) + Gemini 2.5 Flash** | Fast audio transcription, LaTeX/diagram OCR from canvas snapshots, and structured academic note generation. |

---

## 4. Core Functional Modules & Engineering Design

### 4.1 Module 1: Synchronized Vector Whiteboard & Slide Engine
Instead of transmitting a $1920 \times 1080$ video stream at $30\text{ frames per second}$, the whiteboard transmits **normalized geometric vectors**.

* **Coordinate Normalization:** Because students use screens of varying aspect ratios (e.g., an Android phone vs. a 15-inch laptop), all coordinates are normalized to the unit interval $[0.0, 1.0]$:
  $$\hat{x} = \frac{x_{\text{pixel}}}{W_{\text{canvas}}}, \quad \hat{y} = \frac{y_{\text{pixel}}}{H_{\text{canvas}}}$$
* **Compact Packet Structure:** Each drawing stroke delta sent over Socket.io is serialized as a compact JSON/MessagePack payload:
  ```json
  {
    "e": "stroke_delta",
    "id": "st_9081",
    "t": 14250,
    "tool": "pen",
    "c": "#1E88E5",
    "w": 2.5,
    "pts": [[0.234, 0.512, 0.6], [0.238, 0.515, 0.7], [0.242, 0.519, 0.7]]
  }
  ```
* **Late-Joiner & Drop-Out State Recovery:** Redis maintains an ordered list (`RPUSH`) of all vector commands for the active slide. If a student's network drops during a curfew and reconnects 4 minutes later, the Node.js server sends a compressed state snapshot of the missed strokes, instantly reconstructing the board.

### 4.2 Module 2: Voice-First Audio + Secondary Video Option
The media architecture enforces a **strict QoS (Quality of Service) hierarchy**:
1. **Priority 1 (Vector & Slide Telemetry):** Reliable WebSocket channel ($\approx 2\text{--}5\text{ kbps}$).
2. **Priority 2 (Opus Voice Stream):** Configured at $16\text{--}24\text{ kbps}$ mono with Forward Error Correction (FEC) and Discontinuous Transmission (DTX) so silence consumes near-zero bytes.
3. **Priority 3 (Secondary Video Stream - Optional):**
   * **Lecturer Side:** The lecturer can toggle on a secondary camera feed (e.g., to show face, demonstrate a hardware circuit, or build rapport).
   * **Student Side ("Data-Saver Mode"):** Students have a three-state toggle for the secondary video:
     * `Off (Audio + Whiteboard Only)` — Default for low-data mode.
     * `Low (180p @ 15fps, ~80 kbps)` — Picture-in-Picture corner thumbnail.
     * `Standard (480p @ 24fps, ~300 kbps)` — For Wi-Fi users.
   * **Automatic Circuit Breaker:** If `flutter_webrtc` detects round-trip time ($\text{RTT} > 450\text{ ms}$) or packet loss $> 8\%$, the client automatically pauses the incoming secondary video stream and displays a toast: *"Network unstable: Switched to Audio + Vector Mode to keep lecture live."*

### 4.3 Module 3: Lightweight Call Recording Engine ("Vector DVR")
Traditional server-side video recording (Composite MP4) is CPU-heavy on the server and produces massive files ($300\text{--}600\text{ MB}$) that students cannot afford to download on mobile data. Chalk implements a **Dual-Track Replay Engine** (inspired by BigBlueButton and interactive coding platforms):

1. **Track A (Audio Stream):** The Node.js media worker records the incoming Opus audio stream and transcodes it via `FFmpeg` into a single mono `.ogg` or `.m4a` file at $24\text{ kbps}$ ($\approx 10.8\text{ MB}$ for a 1-hour lecture).
2. **Track B (Timestamped Event Log):** Every whiteboard stroke, eraser action, PDF slide change, and optional low-fps video keyframe is appended to an append-only log file (`events.json.gz`) with a relative millisecond offset $t_i = T_{\text{event}} - T_{\text{start}}$.
3. **Client-Side Interactive Playback:** When a student opens a recorded lecture in Flutter:
   * The app streams or downloads the $12\text{ MB}$ bundle (`.m4a` + `events.json.gz`).
   * As the audio player's position $t_{\text{audio}}$ advances, the Flutter canvas renders all strokes where $t_i \le t_{\text{audio}}$ in real time.
   * Students can scrub the timeline, zoom into the vector canvas at infinite resolution, and even copy text/formulas directly from the recording.

### 4.4 Module 4: AI Pedagogical Features
Once a lecturer ends a session and the recording is finalized, a background job in **BullMQ** triggers the AI pipeline:

1. **Timestamped Transcription & Topic Segmentation:**
   * The recorded `.m4a` audio is passed to the **Whisper API** (or Groq's Whisper-large-v3) to produce a word-level timestamped transcript.
2. **Multimodal Whiteboard Context Fusion:**
   * Whenever a slide change occurs or the board reaches peak ink density before an "Erase All" event, the server captures a lightweight PNG snapshot of the canvas state.
   * The transcript + canvas snapshots are sent to **Gemini 2.5 Flash** to synthesize:
     * **Structured Lecture Notes:** Markdown summary with properly formatted $\LaTeX$ equations extracted from handwritten board work.
     * **Smart Replay Chapters:** Clickable timestamps (e.g., `[14:22] Derivation of Dijkstra's Shortest Path`) that jump the Vector DVR player directly to that exact board state.
     * **Auto-Generated Self-Assessment Quiz:** 5 multiple-choice questions generated from that specific lecture to test student comprehension.
3. **"Ask the Lecture" (In-Class & Post-Class AI Tutor):**
   * If a student joins 15 minutes late due to power/network restoration, they can tap **"Catch Me Up"**—an AI button that summarizes everything the lecturer has said and drawn in the first 15 minutes in 4 bullet points without interrupting the class.

---

## 5. Project Folder Structure (Monorepo Layout)

```text
Chalk/
├── apps/
│   ├── flutter_client/                 # Universal Flutter App (Mobile + Web)
│   │   ├── lib/
│   │   │   ├── core/                   # Network monitor, WebRTC config, constants
│   │   │   ├── features/
│   │   │   │   ├── auth/               # Matric number / JWT authentication
│   │   │   │   ├── classroom/          # Live session screen
│   │   │   │   │   ├── canvas/         # CustomPainter, stroke normalizer, PDF layer
│   │   │   │   │   ├── media/          # Opus audio controller & PiP secondary video
│   │   │   │   │   └── catchup_ai/     # "Catch Me Up" live transcript assistant
│   │   │   │   ├── replay_dvr/         # Timeline scrubber & synchronized event player
│   │   │   │   └── study_hub/          # Offline AI notes, LaTeX viewer, quizzes
│   │   └── pubspec.yaml
│   │
│   └── node_backend/                   # Node.js + TypeScript Server
│       ├── src/
│       │   ├── config/                 # Redis, Postgres, LiveKit/Mediasoup setup
│       │   ├── sockets/                # Socket.io namespaces (stroke sync, room state)
│       │   ├── media/                  # SFU token generation & audio recording hooks
│       │   ├── recorder/               # Event-log serializer & FFmpeg audio muxer
│       │   ├── ai_worker/              # Whisper STT + Gemini prompt pipelines
│       │   └── routes/                 # REST APIs for courses, replays, and quizzes
│       └── package.json
└── docs/
    └── bandwidth_benchmarks.csv        # Data for Chapter 4 Thesis Evaluation
```

---

## 6. Chapter 4 Evaluation & Benchmarking Plan (How to Get an 'A')

During your project defense, examiners look for **empirical validation**. You can easily generate data for Chapter 4 using Chrome DevTools Network Throttling and Android Emulator Network Shaping:

### 6.1 Bandwidth Consumption Comparison (60-Minute Lecture)
| Mode / Platform | Average Bitrate | Total Data Used (1 Hour) | Savings vs. Zoom |
| :--- | :--- | :--- | :--- |
| **Zoom / Google Meet (Screen Share + Video)** | $\approx 1,200\text{ kbps}$ | $\approx 540.0\text{ MB}$ | Baseline ($0\%$) |
| **Chalk (Audio + Vector Canvas + Secondary Video Low)** | $\approx 110\text{ kbps}$ | $\approx 49.5\text{ MB}$ | **$90.8\%$ Reduction** |
| **Chalk (Voice + Vector Canvas Only - Crisis Mode)** | $\approx 28\text{ kbps}$ | $\approx 12.6\text{ MB}$ | **$97.6\%$ Reduction** |

### 6.2 Recording Storage Size Comparison (60-Minute Lecture)
* **Standard MP4 Screen Recording (720p):** $\approx 320\text{ MB}$
* **Chalk DVR Bundle (Opus Audio + Compressed JSON Vector Log):** $\approx 11.4\text{ MB}$ (**$96.4\%$ smaller download for students**).

### 6.3 Latency & Resilience Metrics to Plot in Your Thesis
1. **Stroke Propagation Latency:** Measure the round-trip time (in $\text{ms}$) from the lecturer's stylus touching the Flutter canvas to the stroke appearing on a student's screen under **Fast 4G**, **Regular 3G**, and **Edge/2G ($15\%$ packet loss)**.
2. **AI Summary Accuracy:** Evaluate Word Error Rate (WER) of the transcription and lecturer satisfaction rating of the auto-generated post-class notes.

---

## 7. Phased 10-Week Implementation Roadmap

* **Weeks 1–2: Foundation & Auth**
  * Set up Node.js + TypeScript + PostgreSQL backend and Flutter multi-platform project.
  * Build course rooms, role-based access (`Lecturer` vs. `Student`), and JWT authentication.
* **Weeks 3–4: Real-Time Vector Whiteboard & PDF Layer**
  * Implement Flutter `CustomPainter` with `perfect_freehand` for smooth ink rendering.
  * Build Socket.io stroke broadcasting, coordinate normalization, and Redis state caching for late joiners.
* **Weeks 5–6: Voice + Adaptive Secondary Video (WebRTC)**
  * Integrate LiveKit or Mediasoup with `flutter_webrtc`.
  * Implement the Student "Data-Saver Toggle" (Audio-Only vs. PiP Secondary Video) and automatic network-degradation fallback.
* **Weeks 7–8: Call Recording Engine (Vector DVR)**
  * Build the Node.js event-logger that saves timestamped canvas commands alongside recorded `.m4a` audio.
  * Build the Flutter DVR Replay Player that scrubs audio and reconstructs the whiteboard synchronously.
* **Weeks 9–10: AI Integration & Thesis Benchmarking**
  * Connect the post-recording webhook to Whisper STT and Gemini API for automated lecture notes, "Catch Me Up" summaries, and quiz generation.
  * Run 3G network throttling benchmarks and export graphs for Chapter 4 of your thesis.