# Chalk
### The Free, Low-Data Virtual Classroom Built for Weak Internet

> **In plain English:** Traditional video apps like Zoom and Google Meet send heavy video streams that freeze and eat up your mobile data in minutes. **Chalk replaces heavy video with a smart digital chalkboard and clear voice calls.** It cuts your data usage by **97.6%**, meaning a 1-hour class uses only **~12.6 MB** instead of 540 MB.

---

## Why Chalk? (The Problem It Solves)

When students and lecturers face slow internet, weak 2G/3G connections, power cuts, or expensive data bundles, normal video calls fail completely:
- Screens freeze into blurry blocks.
- Voices drop and glitch.
- A single lecture drains your weekly data budget.

### How Chalk Fixes This
Instead of capturing millions of pixels of a lecturer's screen and sending heavy video, **Chalk only sends tiny coordinate notes saying where the chalk moved** (for example: *"draw a yellow curve from point A to point B"*). 

Your browser draws that line instantly on its own HTML5 canvas. The result:
- **Whiteboard drawings are always 100% sharp**, even on 2G edge networks.
- **Voice calls stay smooth and clear** using 24 kbps Opus audio that works with just 1 signal bar.
- **Fully responsive React + Tailwind CSS Web App:** Works across mobile browsers, tablets, laptops, and desktop computers with full URL-based navigation flows.

---

## Navigation Flows & Architecture (`apps/web_client`)

Chalk is built with **React 19, TypeScript, Tailwind CSS v4, React Router v7, Phosphor Icons, and Socket.io**:

1. **`/` — Product Landing & Live Interactive Preview**
   - Interactive HTML5 vector chalkboard preview right in the hero section.
   - Real-time Data Savings Calculator comparing weekly lecture hours against standard video calls.
   - Instant Room Code entry (`MTH 112`) to jump straight into an active lecture.
2. **`/auth` — 2-Step Progressive Campus Onboarding**
   - Step 1: Frictionless Google OAuth Sign-In with an interactive account selector (Student, Lecturer, or Custom Institutional Email).
   - Step 2: Campus profile verification (Role selection, Matriculation/Staff ID, Department, and Call-Sign Badge).
3. **`/hub` & `/hub/course/:courseId` — Classroom & Coursework Hub**
   - Search and filter enrolled classes, join a cohort via room code, or create a new course.
   - Course Detail view with dynamic breadcrumbs (`Home / Classroom Hub / CSC 401`) and 3 tabs: **Notice Board (Stream)**, **Replays & Classwork** (with interactive lab submission), and **People Directory**.
4. **`/meet/:roomCode` — Live Low-Data Voice + Smart Chalkboard Room**
   - Real-time HTML5 Vector Chalkboard supporting freehand chalk, highlighter marker, eraser, circle, rectangle, arrow, and live laser pointer across multi-slide decks.
   - **Anti-Lag QoS & Bandwidth Meter HUD** with live network profile simulation (`4G Broad`, `3G Weak`, `Crisis 2G`) and automatic circuit-breaker protection that suspends secondary webcam PiP feeds during 2G packet loss.
   - Stage switcher (`Chalkboard Stage` vs `Opus Voice Speaker Grid`), hand-raise signaling, slide-over room chat, and the **"Catch Me Up!" 10-Second AI Recap Modal**.
5. **`/replays` & `/replays/:replayId` — Vector DVR Class Replays**
   - Dual-track playback engine reconstructing timestamped vector strokes alongside Opus audio (~11.4 MB per hour vs 320 MB MP4).
   - Interactive timeline scrubber, smart chapter jumping, playback speed controls (`1.0x` to `2.0x`), and offline bundle saving.
6. **`/study` — AI Study Hub & Practice Quiz**
   - Auto-generated revision notes, extracted chalkboard equations, and an interactive 5-question comprehension quiz with instant explanations.
7. **`/benchmarks` — Empirical 2G / 3G / 4G Telemetry Benchmarks**
   - Side-by-side comparison of 60-minute bandwidth consumption, offline DVR storage savings, and WebSocket stroke latency.

---

## How to Run Chalk

### 1. Start the Real-Time Telemetry Server
```bash
cd apps/node_backend
pnpm install
pnpm dev
# Server starts on http://localhost:4000
```

### 2. Launch the React + Tailwind CSS Web App
```bash
cd apps/web_client
pnpm install
pnpm dev
# Web app starts on http://localhost:5173
```

---

## For Technical Reviewers & Academic Defense
For the complete engineering proposal, network math, WebSocket protocols, and Chapter 4 benchmark data, see [chalk_final_year_project_proposal_architecture.md](file:///c:/Users/HomePC/Desktop/PROJECTS/Chalk/chalk_final_year_project_proposal_architecture.md).
