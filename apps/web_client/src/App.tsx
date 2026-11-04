import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { ClassroomHubPage } from './pages/ClassroomHubPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { AssignmentDetailPage } from './pages/AssignmentDetailPage';
import { ClassroomCalendarPage } from './pages/ClassroomCalendarPage';
import { ClassroomTodoPage } from './pages/ClassroomTodoPage';
import { ClassroomSettingsPage } from './pages/ClassroomSettingsPage';
import { StudioPage } from './pages/StudioPage';
import { StudioLobbyPage } from './pages/StudioLobbyPage';
import { StudioEndedPage } from './pages/StudioEndedPage';
import { ReplaysPage } from './pages/ReplaysPage';
import { StudyHubPage } from './pages/StudyHubPage';
import { BenchmarksPage } from './pages/BenchmarksPage';
import { NotFoundPage } from './pages/NotFoundPage';

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, currentUser, authLoading, isDark } = useApp();
  const location = useLocation();

  if (authLoading) {
    return (
      <div
        className={`min-h-[100dvh] flex items-center justify-center font-mono text-xs ${isDark ? 'bg-[#0F1713] text-[#69DB7C]' : 'bg-[#F8F9FA] text-[#059669]'
          }`}
      >
        Signing in...
      </div>
    );
  }

  if (!isAuthenticated) {
    const targetPath = `${location.pathname}${location.search}`;
    const mode = currentUser && !currentUser.isProfileComplete ? 'signup' : 'login';
    return (
      <Navigate
        to={`/auth?mode=${mode}&redirect=${encodeURIComponent(targetPath)}`}
        replace
      />
    );
  }

  return children;
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Standalone Full-Viewport Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/studio" element={<StudioPage />} />
          <Route path="/studio/:roomCode" element={<StudioPage />} />
          <Route path="/studio/lobby/:roomCode" element={<StudioLobbyPage />} />
          <Route path="/studio/:roomCode/ended" element={<StudioEndedPage />} />

          {/* Protected Dashboard Routes (inaccessible without signing up / signing in) */}
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/hub" element={<ClassroomHubPage />} />
            <Route path="/hub/archived" element={<ClassroomHubPage />} />
            <Route path="/hub/calendar" element={<ClassroomCalendarPage />} />
            <Route path="/hub/todo" element={<ClassroomTodoPage />} />
            <Route path="/hub/settings" element={<ClassroomSettingsPage />} />
            <Route path="/hub/course/:courseId" element={<CourseDetailPage />} />
            <Route
              path="/hub/course/:courseId/assignment/:assignmentId"
              element={<AssignmentDetailPage />}
            />
            <Route path="/replays" element={<ReplaysPage />} />
            <Route path="/replays/:replayId" element={<ReplaysPage />} />
            <Route path="/study" element={<StudyHubPage />} />
            <Route path="/benchmarks" element={<BenchmarksPage />} />
          </Route>

          {/* Branded 404 Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
