import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  LockKey,
  UserPlus,
  ChalkboardTeacher,
  GraduationCap,
  IdentificationBadge,
  Buildings,
  ArrowRight,
  VideoCamera,
  ShieldCheck,
  SignOut,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electrical & Electronics Engineering',
  'Mathematics & Statistics',
  'Mechanical Engineering',
  'Medicine & Surgery',
  'Economics & Social Sciences',
  'Physics & Applied Sciences',
];

const AVATAR_TAGS = ['AO', 'PA', 'CN', 'TB', 'IK', 'FB', 'EN', 'CS'];

const getDestinationLabel = (path: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('/hub/course')) return 'Course Workspace';
  if (path.startsWith('/hub')) return 'Classroom Hub Dashboard';
  if (path.startsWith('/study')) return 'Study Hub & AI Notes';
  if (path.startsWith('/replays')) return 'Recorded Replays Dashboard';
  if (path.startsWith('/benchmarks')) return 'Data Savings Dashboard';
  if (path.startsWith('/studio')) return 'Live Classroom Session';
  return 'Classroom Dashboard';
};

export const AuthPage: React.FC = () => {
  const {
    isDark,
    currentUser,
    isAuthenticated,
    firebaseReady,
    authenticateWithGoogle,
    signInWithGoogle,
    completeProfileSetup,
    logout,
  } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawRedirect = searchParams.get('redirect');
  const redirectPath = rawRedirect || '/hub';
  const destinationLabel = getDestinationLabel(rawRedirect);

  const initialMode =
    searchParams.get('mode') === 'signup' ||
      (currentUser && !currentUser.isProfileComplete)
      ? 'signup'
      : 'login';

  const [authMode, setAuthMode] = useState<'login' | 'signup'>(initialMode);
  const [step, setStep] = useState<1 | 2>(
    currentUser && !currentUser.isProfileComplete ? 2 : 1
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Step 2 Campus Profile State (persisted to Cloud Firestore `users/{uid}`)
  const [email, setEmail] = useState(
    currentUser?.email || 'alex.okafor@unilag.edu.ng'
  );
  const [name, setName] = useState(currentUser?.name || 'Alex Okafor');
  const [role, setRole] = useState<'student' | 'lecturer'>(
    currentUser?.role || 'student'
  );
  const [matricOrStaffId, setMatricOrStaffId] = useState(
    currentUser?.matricOrStaffId || 'CSC/2022/1042'
  );
  const [department, setDepartment] = useState(
    currentUser?.department || DEPARTMENTS[0]
  );
  const [avatarTag, setAvatarTag] = useState(currentUser?.avatarTag || 'AO');
  const [customEmailInput, setCustomEmailInput] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync mode when query parameter changes
  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'signup') {
      setAuthMode('signup');
    } else if (modeParam === 'login') {
      setAuthMode('login');
      if (isAuthenticated) {
        setStep(1);
      }
    }
  }, [searchParams, isAuthenticated]);

  // Sync Step 2 fields when currentUser changes from Firebase Auth
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setRole(currentUser.role);
      setMatricOrStaffId(currentUser.matricOrStaffId);
      setDepartment(currentUser.department || DEPARTMENTS[0]);
      setAvatarTag(currentUser.avatarTag || 'AO');
    }
  }, [currentUser]);

  const switchAuthMode = (nextMode: 'login' | 'signup') => {
    setFormError(null);
    setAuthMode(nextMode);
    setStep(1);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('mode', nextMode);
    setSearchParams(nextParams, { replace: true });
  };

  /**
   * Primary Google OAuth Handler via Firebase Auth (`signInWithPopup`)
   */
  const handleGoogleAuthClick = async () => {
    setFormError(null);

    if (firebaseReady) {
      setIsAuthenticating(true);
      try {
        const { user, isNewUser } = await authenticateWithGoogle();
        setName(user.name);
        setEmail(user.email);
        setRole(user.role);
        setMatricOrStaffId(user.matricOrStaffId);
        setDepartment(user.department || DEPARTMENTS[0]);
        setAvatarTag(user.avatarTag || 'AO');

        if (isNewUser || authMode === 'signup' || !user.isProfileComplete) {
          setStep(2);
        } else {
          navigate(redirectPath, { replace: true });
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Google authentication failed. Please check your Firebase configuration.';
        setFormError(message);
      } finally {
        setIsAuthenticating(false);
      }
    } else {
      // Fallback account picker if Firebase keys are not yet configured
      setShowAccountModal(true);
    }
  };

  const handleSelectAccount = (acct: {
    name: string;
    email: string;
    role: 'student' | 'lecturer';
    idCode: string;
    tag: string;
  }) => {
    setShowAccountModal(false);
    setFormError(null);

    if (authMode === 'login') {
      signInWithGoogle({
        name: acct.name,
        email: acct.email,
        role: acct.role,
        idCode: acct.idCode,
        avatarTag: acct.tag,
        completeImmediately: true,
      });
      navigate(redirectPath, { replace: true });
    } else {
      signInWithGoogle({
        name: acct.name,
        email: acct.email,
        role: acct.role,
        idCode: acct.idCode,
        avatarTag: acct.tag,
        completeImmediately: false,
      });
      setName(acct.name);
      setEmail(acct.email);
      setRole(acct.role);
      setMatricOrStaffId(acct.idCode);
      setAvatarTag(acct.tag);
      setStep(2);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !matricOrStaffId.trim()) {
      setFormError('Please provide both your display name and campus ID number.');
      return;
    }
    setFormError(null);
    setIsSavingProfile(true);
    try {
      await completeProfileSetup({
        role,
        name: name.trim(),
        matricOrStaffId: matricOrStaffId.trim(),
        department,
        avatarTag,
      });
      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to save profile to Cloud Firestore.';
      setFormError(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div
      className={`min-h-[100dvh] flex flex-col justify-center items-center p-4 sm:p-6 ${isDark ? 'bg-[#0F1713] text-[#E3E3E3]' : 'bg-[#F8F9FA] text-[#202124]'
        }`}
    >
      <div
        className={`w-full max-w-lg rounded-3xl border p-6 sm:p-10 ${isDark
          ? 'bg-[#141E19] border-[#3C4043]'
          : 'bg-white border-[#DADCE0] shadow-sm'
          }`}
      >
        {/* Top Navigation & Mode/Step Indicator */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            type="button"
            onClick={() => {
              if (step === 2) {
                setStep(1);
              } else {
                navigate('/');
              }
            }}
            className={`btn-google inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer ${isDark
              ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
              : 'text-[#5F6368] hover:text-[#202124]'
              }`}
          >
            <ArrowLeft size={16} weight="regular" />
            <span>{step === 2 ? 'Back to Step 1' : 'Back to Landing'}</span>
          </button>


        </div>

        {/* Redirect Guard Banner when user tried to open a protected dashboard */}
        {destinationLabel && !isAuthenticated && (
          <div
            className={`mb-6 p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs ${isDark
              ? 'bg-[#69DB7C]/10 border-[#69DB7C]/30 text-[#E3E3E3]'
              : 'bg-[#ECFDF5] border-[#059669]/25 text-[#202124]'
              }`}
          >
            <ShieldCheck
              size={18}
              weight="fill"
              className={`shrink-0 mt-0.5 ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                }`}
            />
            <div>
              <div className="font-medium">
                Sign in required for {destinationLabel}
              </div>
              <div
                className={`mt-0.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Authenticate with Google to unlock your courses, study notes, and dashboards.
              </div>
            </div>
          </div>
        )}

        {/* Active Session Banner if already signed in */}
        {isAuthenticated && currentUser && step === 1 && (
          <div
            className={`mb-6 p-4 rounded-2xl border space-y-3 ${isDark
              ? 'bg-[#0F1713] border-[#3C4043]'
              : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full font-mono font-medium text-xs flex items-center justify-center shrink-0 ${isDark
                    ? 'bg-[#69DB7C]/20 text-[#69DB7C]'
                    : 'bg-[#ECFDF5] text-[#059669]'
                    }`}
                >
                  {currentUser.avatarTag}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    Signed in as {currentUser.name}
                  </div>
                  <div
                    className={`text-xs font-mono truncate ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    {currentUser.role.toUpperCase()} • {currentUser.matricOrStaffId}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="btn-google px-3 py-1.5 rounded-full text-xs font-medium text-[#D93025] hover:bg-[#D93025]/10 inline-flex items-center gap-1 cursor-pointer shrink-0"
              >
                <SignOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate(redirectPath)}
              className={`btn-google w-full py-2.5 px-4 rounded-full text-xs font-medium inline-flex items-center justify-center gap-2 cursor-pointer ${isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
            >
              <span>Continue to Dashboard</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-6">
            {/* Segmented Login / Sign Up Switcher */}
            <div
              className={`grid grid-cols-2 p-1 rounded-full border ${isDark
                ? 'bg-[#0F1713] border-[#3C4043]'
                : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
            >
              <button
                type="button"
                onClick={() => switchAuthMode('login')}
                className={`btn-google py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${authMode === 'login'
                  ? isDark
                    ? 'bg-[#69DB7C] text-[#0F1713]'
                    : 'bg-[#059669] text-white'
                  : isDark
                    ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                    : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
              >
                Log In with Google
              </button>
              <button
                type="button"
                onClick={() => switchAuthMode('signup')}
                className={`btn-google py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${authMode === 'signup'
                  ? isDark
                    ? 'bg-[#69DB7C] text-[#0F1713]'
                    : 'bg-[#059669] text-white'
                  : isDark
                    ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                    : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
              >
                Sign Up with Google
              </button>
            </div>

            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
                {authMode === 'login'
                  ? 'Sign in with Google'
                  : 'Sign up with Google'}
              </h1>
              <p
                className={`mt-1.5 text-sm leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                {authMode === 'login'
                  ? 'Authenticate with your university or personal Google account to sync your courses, notes, and offline DVR lectures.'
                  : 'Sign up in one click, then complete your campus profile.'}
              </p>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-[#D93025]/10 border border-[#D93025] text-xs text-[#D93025] font-medium">
                {formError}
              </div>
            )}

            {/* Primary Google-Only Firebase Auth Button */}
            <button
              type="button"
              disabled={isAuthenticating}
              onClick={handleGoogleAuthClick}
              className={`btn-google w-full py-4 px-5 rounded-full font-medium text-sm flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 ${isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>
                {isAuthenticating
                  ? 'Hold on...'
                  : authMode === 'login'
                    ? 'Continue with Google'
                    : 'Sign up with Google'}
              </span>
            </button>

            {/* Instant Campus Test Profiles (Also persisted to Firestore) */}
            <div
              className={`pt-5 border-t space-y-3 ${isDark ? 'border-[#3C4043]' : 'border-[#DADCE0]'
                }`}
            >
              <div
                className={`text-xs font-medium text-center ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Or use a pre-verified Google Workspace campus account
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    handleSelectAccount({
                      name: 'Alex Okafor',
                      email: 'alex.okafor@unilag.edu.ng',
                      role: 'student',
                      idCode: 'CSC/2022/1042',
                      tag: 'AO',
                    })
                  }
                  className={`btn-google p-3.5 rounded-2xl border text-left cursor-pointer ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] hover:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] hover:border-[#059669]'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap
                      size={20}
                      weight="regular"
                      className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'}
                    />
                    <div>
                      <div className="text-sm font-medium">Alex Okafor</div>
                      <div
                        className={`text-[11px] font-mono ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                          }`}
                      >
                        Student • Google Auth
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSelectAccount({
                      name: 'Prof. Adeleke O.',
                      email: 'adeleke.prof@unilag.edu.ng',
                      role: 'lecturer',
                      idCode: 'STAFF/CS/2018',
                      tag: 'PA',
                    })
                  }
                  className={`btn-google p-3.5 rounded-2xl border text-left cursor-pointer ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] hover:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] hover:border-[#059669]'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ChalkboardTeacher
                      size={20}
                      weight="regular"
                      className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'}
                    />
                    <div>
                      <div className="text-sm font-medium">Prof. Adeleke O.</div>
                      <div
                        className={`text-[11px] font-mono ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                          }`}
                      >
                        Lecturer • Google Auth
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer Link to Try Live Class without account */}
            <div
              className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs ${isDark
                ? 'border-[#3C4043] text-[#9AA0A6]'
                : 'border-[#DADCE0] text-[#5F6368]'
                }`}
            >
              <span>Want to preview the live chalkboard first?</span>
              <Link
                to="/studio/csc401-algo?trial=1"
                className={`inline-flex items-center gap-1.5 font-medium hover:underline ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                  }`}
              >
                <VideoCamera size={14} weight="regular" />
                <span>Try a live sample class</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Step 2: Campus Profile Form (Saved to Cloud Firestore `users/{uid}`) */
          <form onSubmit={handleCompleteSubmit} className="space-y-5">
            <div>
              <h1 className="font-display text-2xl font-medium">
                Complete Campus Profile
              </h1>
              <p
                className={`text-xs mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Your profile and course enrollments are stored in Firebase Cloud Firestore.
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-[#D93025]/10 border border-[#D93025] text-xs text-[#D93025] font-medium">
                {formError}
              </div>
            )}

            {/* 1. Role Selector */}
            <div className="space-y-2">
              <label
                className={`block text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                1. Campus Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRole('student');
                    setMatricOrStaffId('CSC/2022/1042');
                  }}
                  className={`btn-google p-3.5 rounded-2xl border text-left cursor-pointer ${role === 'student'
                    ? isDark
                      ? 'bg-[#69DB7C]/15 border-[#69DB7C] text-[#69DB7C]'
                      : 'bg-[#ECFDF5] border-[#059669] text-[#059669]'
                    : isDark
                      ? 'border-[#3C4043] text-[#9AA0A6]'
                      : 'border-[#DADCE0] text-[#5F6368]'
                    }`}
                >
                  <div className="font-medium text-sm flex items-center gap-2">
                    <GraduationCap size={18} weight="regular" />
                    <span>Student</span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Join calls & submit labs
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole('lecturer');
                    setMatricOrStaffId('STAFF/CS/2018');
                  }}
                  className={`btn-google p-3.5 rounded-2xl border text-left cursor-pointer ${role === 'lecturer'
                    ? isDark
                      ? 'bg-[#69DB7C]/15 border-[#69DB7C] text-[#69DB7C]'
                      : 'bg-[#ECFDF5] border-[#059669] text-[#059669]'
                    : isDark
                      ? 'border-[#3C4043] text-[#9AA0A6]'
                      : 'border-[#DADCE0] text-[#5F6368]'
                    }`}
                >
                  <div className="font-medium text-sm flex items-center gap-2">
                    <ChalkboardTeacher size={18} weight="regular" />
                    <span>Lecturer</span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Host classes & draw notes
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Display Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-name"
                className={`block text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                2. Full Display Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-normal focus:outline-none ${isDark
                  ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                  : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                  }`}
              />
            </div>

            {/* 3. Matriculation or Staff ID */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-id"
                className={`block text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                {role === 'lecturer'
                  ? '3. University Staff ID'
                  : '3. Matriculation Number'}
              </label>
              <div className="relative">
                <IdentificationBadge
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50"
                />
                <input
                  id="profile-id"
                  type="text"
                  value={matricOrStaffId}
                  onChange={(e) => setMatricOrStaffId(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border font-mono text-sm font-medium focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                />
              </div>
            </div>

            {/* 4. Department */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-dept"
                className={`block text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                4. Academic Department
              </label>
              <div className="relative">
                <Buildings
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50"
                />
                <select
                  id="profile-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-normal focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Badge Monogram */}
            <div className="space-y-1.5">
              <span
                className={`block text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                5. Chalkboard Call-Sign Badge
              </span>
              <div className="flex flex-wrap gap-2">
                {AVATAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setAvatarTag(tag)}
                    className={`btn-google w-10 h-10 rounded-full font-mono text-xs font-medium border cursor-pointer ${avatarTag === tag
                      ? isDark
                        ? 'bg-[#69DB7C] text-[#0F1713] border-[#69DB7C]'
                        : 'bg-[#059669] text-white border-[#059669]'
                      : isDark
                        ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                        : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
                      }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className={`btn-google w-full py-3.5 px-5 rounded-full font-medium text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
            >
              <span>
                {isSavingProfile
                  ? 'Saving to Firebase Firestore...'
                  : 'Save Profile & Enter Dashboard'}
              </span>
              <ArrowRight size={17} weight="regular" />
            </button>
          </form>
        )}
      </div>

      {/* Google Account Picker Modal (when testing without external Firebase popup) */}
      {showAccountModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`modal-surface w-full max-w-md rounded-3xl border p-6 space-y-5 shadow-2xl ${isDark
              ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
              : 'bg-white border-[#DADCE0] text-[#202124]'
              }`}
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <div>
                <h2 className="font-display font-medium text-base">
                  Choose a Google account
                </h2>
                <p
                  className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  to continue to Chalk Classroom
                </p>
              </div>
            </div>

            <div
              className={`divide-y ${isDark ? 'divide-[#3C4043]' : 'divide-[#DADCE0]'
                }`}
            >
              <button
                type="button"
                onClick={() =>
                  handleSelectAccount({
                    name: 'Alex Okafor',
                    email: 'alex.okafor@unilag.edu.ng',
                    role: 'student',
                    idCode: 'CSC/2022/1042',
                    tag: 'AO',
                  })
                }
                className={`btn-google w-full py-3 flex items-center justify-between px-3 rounded-xl cursor-pointer ${isDark ? 'hover:bg-[#28292A]' : 'hover:bg-[#F8F9FA]'
                  }`}
              >
                <div className="text-left">
                  <div className="font-medium text-sm">Alex Okafor</div>
                  <div
                    className={`text-xs font-mono ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    alex.okafor@unilag.edu.ng
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-medium ${isDark
                    ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                    : 'bg-[#ECFDF5] text-[#059669]'
                    }`}
                >
                  STUDENT
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSelectAccount({
                    name: 'Prof. Adeleke O.',
                    email: 'adeleke.prof@unilag.edu.ng',
                    role: 'lecturer',
                    idCode: 'STAFF/CS/2018',
                    tag: 'PA',
                  })
                }
                className={`btn-google w-full py-3 flex items-center justify-between px-3 rounded-xl cursor-pointer ${isDark ? 'hover:bg-[#28292A]' : 'hover:bg-[#F8F9FA]'
                  }`}
              >
                <div className="text-left">
                  <div className="font-medium text-sm">Prof. Adeleke O.</div>
                  <div
                    className={`text-xs font-mono ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    adeleke.prof@unilag.edu.ng
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-medium ${isDark
                    ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                    : 'bg-[#ECFDF5] text-[#059669]'
                    }`}
                >
                  LECTURER
                </span>
              </button>
            </div>

            {/* Custom Google Account Entry */}
            <div
              className={`pt-4 border-t space-y-2.5 ${isDark ? 'border-[#3C4043]' : 'border-[#DADCE0]'
                }`}
            >
              <div
                className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                <UserPlus size={15} weight="regular" />
                <span>Use another Google Workspace account</span>
              </div>
              <input
                type="text"
                placeholder="Your Full Name"
                value={customNameInput}
                onChange={(e) => setCustomNameInput(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${isDark
                  ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3]'
                  : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
                  }`}
              />
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="name@university.edu"
                  value={customEmailInput}
                  onChange={(e) => setCustomEmailInput(e.target.value)}
                  className={`flex-1 px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!customEmailInput.trim()) return;
                    const derivedName =
                      customNameInput.trim() || customEmailInput.split('@')[0];
                    handleSelectAccount({
                      name: derivedName,
                      email: customEmailInput.trim(),
                      role: 'student',
                      idCode: 'CSC/2026/0198',
                      tag: derivedName.slice(0, 2).toUpperCase(),
                    });
                  }}
                  className={`btn-google px-4 py-2 rounded-full font-medium text-xs cursor-pointer ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  Continue
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className={`btn-google px-4 py-1.5 rounded-full text-xs font-medium cursor-pointer ${isDark
                  ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
