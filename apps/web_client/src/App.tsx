import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/AppShell';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { ClassroomHubPage } from './pages/ClassroomHubPage';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { MeetPage } from './pages/MeetPage';
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
          <Route path="/meet" element={<Navigate to="/meet/csc401-algo" replace />} />
          <Route path="/meet/:roomCode" element={<MeetPage />} />

          {/* Protected Dashboard Routes (inaccessible without signing up / signing in) */}
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/hub" element={<ClassroomHubPage />} />
            <Route path="/hub/course/:courseId" element={<CourseDetailPage />} />
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
