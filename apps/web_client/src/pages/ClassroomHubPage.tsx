import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MagnifyingGlass,
  Plus,
  VideoCamera,
  ArrowRight,
  Clock,
  Users,
  Broadcast,
  Hash,
  X,
  ChalkboardTeacher,
  GraduationCap,
  FolderOpen,
  CheckCircle,
  Copy,
  Check,
  BookOpenText,
  Sparkle,
  DotsThreeVertical,
  Archive,
  ArrowCounterClockwise,
  Trash,
  PencilSimple,
  LinkSimple,
  ClipboardText,
  Medal,
  CalendarBlank,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { CourseModel } from '../types/chalk';

export const ClassroomHubPage: React.FC = () => {
  const {
    isDark,
    isDemoMode,
    courses,
    liveRooms,
    currentUser,
    assignments,
    submissions,
    refreshCourses,
    joinCourseByCode,
    createCourse,
    setActiveRoomCode,
    archiveCourse,
    restoreCourse,
    deleteCoursePermanently,
    updateCourseSettings,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isArchivedView = location.pathname.includes('/archived');

  const isLecturer = currentUser?.role === 'lecturer';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'primary' | 'live'>('primary');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [studioCourseRequiredNotice, setStudioCourseRequiredNotice] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (searchParams.get('create') === '1' && isLecturer) {
      setStudioCourseRequiredNotice(true);
      setShowCreateModal(true);
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      setSearchParams(next, { replace: true });
    } else if (searchParams.get('join') && !isLecturer) {
      const joinVal = searchParams.get('join') || '';
      if (joinVal === '1') {
        setStudioCourseRequiredNotice(true);
      } else {
        setJoinCodeInput(joinVal);
        setStudioCourseRequiredNotice(false);
      }
      setShowJoinModal(true);
      const next = new URLSearchParams(searchParams);
      next.delete('join');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, isLecturer, setSearchParams]);

  // Card Kebab Menu & Edit State
  const [openMenuCourseId, setOpenMenuCourseId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<CourseModel | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSchedule, setEditSchedule] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinModalError, setJoinModalError] = useState<string | null>(null);
  const [quickJoinInput, setQuickJoinInput] = useState('');
  const [quickJoinError, setQuickJoinError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (showJoinModal) {
      setJoinModalError(null);
      refreshCourses();
    }
  }, [showJoinModal, refreshCourses]);

  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSchedule, setNewSchedule] = useState('');

  // Filter courses by archived status
  const currentViewCourses = courses.filter((c) =>
    isArchivedView ? Boolean(c.isArchived) : !c.isArchived
  );

  // Check if a course is currently streaming a live meeting
  const isCourseLive = (course: CourseModel) => {
    return liveRooms.some(
      (r) =>
        r.id.toLowerCase() === course.liveRoomCode.toLowerCase() ||
        (r.courseId && r.courseId.toLowerCase() === course.id.toLowerCase()) ||
        r.courseCode.toLowerCase() === course.code.toLowerCase()
    );
  };

  // Check if current user teaches this course
  const isLecturerCourse = (course: CourseModel) => {
    if (!currentUser) return false;
    const uidLower = (currentUser.id || '').toLowerCase();
    return (
      (course.lecturerId || '').toLowerCase() === uidLower ||
      (currentUser.name &&
        course.lecturerName.toLowerCase() === currentUser.name.toLowerCase()) ||
      Boolean(
        course.members?.some(
          (m) => (m.id || '').toLowerCase() === uidLower && m.role === 'lecturer'
        )
      )
    );
  };

  // Check if current student is enrolled in this course
  const isStudentEnrolled = (course: CourseModel) => {
    if (!currentUser) return false;
    const uidLower = (currentUser.id || '').toLowerCase();
    if (
      course.members?.some(
        (m) =>
          (m.id || '').toLowerCase() === uidLower ||
          (Boolean(m.matricOrStaffId) &&
            Boolean(currentUser.matricOrStaffId) &&
            m.matricOrStaffId === currentUser.matricOrStaffId)
      )
    ) {
      return true;
    }
    if (course.memberIds?.some((id) => id.toLowerCase() === uidLower)) {
      return true;
    }
    return false;
  };

  // Strictly role-scoped course lists
  const myTeachingCourses = currentViewCourses.filter(isLecturerCourse);
  const myEnrolledCourses = currentViewCourses.filter(isStudentEnrolled);

  const liveTeachingCourses = myTeachingCourses.filter(isCourseLive);
  const liveEnrolledCourses = myEnrolledCourses.filter(isCourseLive);

  // Lecturer metrics & grading queue
  const totalEnrolledStudents = myTeachingCourses.reduce(
    (sum, c) => sum + (c.enrolledCount || 0),
    0
  );
  const lecturerAssignments = assignments.filter((a) =>
    myTeachingCourses.some((c) => c.id === a.courseId)
  );
  const lecturerSubmissionsToReview = submissions.filter(
    (s) =>
      myTeachingCourses.some((c) => c.id === s.courseId) &&
      s.status === 'turned_in'
  );

  // Student metrics, deadlines & grades
  const studentAssignments = assignments.filter((a) =>
    myEnrolledCourses.some((c) => c.id === a.courseId)
  );
  const myStudentSubmissions = submissions.filter(
    (s) =>
      myEnrolledCourses.some((c) => c.id === s.courseId) &&
      s.status !== 'assigned' &&
      s.status !== 'missing' &&
      (s.studentId === currentUser?.id ||
        (Boolean(currentUser?.matricOrStaffId) &&
          s.matricOrStaffId === currentUser?.matricOrStaffId))
  );

  const isAssignmentSubmittedByMe = (assignmentId: string, fallbackFlag?: boolean) => {
    if (myStudentSubmissions.some((s) => s.assignmentId === assignmentId)) {
      return true;
    }
    return Boolean(fallbackFlag && isDemoMode);
  };

  const studentPendingAssignments = studentAssignments.filter(
    (a) => !isAssignmentSubmittedByMe(a.id, a.isSubmitted)
  );
  const studentCompletedAssignments = studentAssignments.filter((a) =>
    isAssignmentSubmittedByMe(a.id, a.isSubmitted)
  );

  // Active course list for current role
  const baseCourseList = isLecturer
    ? filterMode === 'live'
      ? liveTeachingCourses
      : myTeachingCourses
    : filterMode === 'live'
      ? liveEnrolledCourses
      : myEnrolledCourses;

  const filteredCourses = baseCourseList.filter((course) => {
    const matchesSearch =
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.lecturerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCopyInviteLink = (course: CourseModel) => {
    const link = `${window.location.origin}/hub?join=${encodeURIComponent(course.code)}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(course.code);
    setTimeout(() => setCopiedCode(null), 2500);
    setOpenMenuCourseId(null);
  };

  const handleArchiveCourse = async (courseId: string) => {
    setOpenMenuCourseId(null);
    await archiveCourse(courseId);
  };

  const handleRestoreCourse = async (courseId: string) => {
    setOpenMenuCourseId(null);
    await restoreCourse(courseId);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this course permanently? This cannot be undone.'
      )
    ) {
      setOpenMenuCourseId(null);
      await deleteCoursePermanently(courseId);
    }
  };

  const openEditModal = (course: CourseModel) => {
    setEditingCourse(course);
    setEditTitle(course.title);
    setEditSchedule(course.scheduleTime || '');
    setEditSection(course.section || '');
    setEditRoom(course.room || '');
    setEditSubject(course.subject || '');
    setOpenMenuCourseId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !editTitle.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await updateCourseSettings(editingCourse.id, {
        title: editTitle.trim(),
        scheduleTime: editSchedule.trim(),
        section: editSection.trim(),
        room: editRoom.trim(),
        subject: editSubject.trim(),
      });
      setEditingCourse(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || isJoining) return;
    setIsJoining(true);
    setJoinModalError(null);
    try {
      const course = await joinCourseByCode(joinCodeInput.trim());
      if (course) {
        setShowJoinModal(false);
        setStudioCourseRequiredNotice(false);
        setJoinCodeInput('');
        navigate(`/hub/course/${course.id}`);
      } else {
        setJoinModalError(
          'No course found matching that code. Check the code with your lecturer and try again.'
        );
      }
    } catch {
      setJoinModalError('Could not join course right now. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleQuickJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickJoinInput.trim() || isJoining) return;
    setIsJoining(true);
    setQuickJoinError(null);
    try {
      const course = await joinCourseByCode(quickJoinInput.trim());
      setQuickJoinInput('');
      if (course) {
        navigate(`/hub/course/${course.id}`);
      } else {
        setQuickJoinError('No class found matching that code.');
      }
    } catch {
      setQuickJoinError('Failed to join course.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newTitle.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const created = await createCourse({
        code: newCode.trim(),
        title: newTitle.trim(),
        scheduleTime: newSchedule.trim() || 'Schedule TBD',
        department: currentUser?.department || 'Academic Cohort',
      });
      setNewCode('');
      setNewTitle('');
      setNewSchedule('');
      setShowCreateModal(false);
      navigate(`/hub/course/${created.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const firstLiveEnrolled = liveEnrolledCourses[0];

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      {/* =====================================================================
          HEADER BANNER: ARCHIVED VIEW vs LECTURER DASHBOARD vs STUDENT DASHBOARD
         ===================================================================== */}
      {isArchivedView ? (
        <div
          className={`rounded-3xl border p-6 sm:p-8 space-y-4 ${isDark
            ? 'bg-[#141E19] border-[#3C4043]'
            : 'bg-amber-50/70 border-amber-200'
            }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDark
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-amber-100 text-amber-700'
                  }`}
              >
                <Archive size={24} weight="duotone" />
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-medium">
                  Archived {isLecturer ? 'Teaching Cohorts' : 'Classes'}
                </h1>
                <p
                  className={`text-xs sm:text-sm ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Archived classes are preserved as read-only.{' '}
                  {isLecturer
                    ? 'You can restore any cohort at any time to resume live lectures and grading.'
                    : 'You can still review past coursework and notes.'}
                </p>
              </div>
            </div>
            <Link
              to="/hub"
              className={`btn-google px-4 py-2 rounded-full border text-xs font-medium inline-flex items-center gap-2 shrink-0 ${isDark
                ? 'border-[#3C4043] bg-[#0F1713] text-[#E3E3E3] hover:bg-[#28292A]'
                : 'border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F8F9FA]'
                }`}
            >
              <ArrowRight size={14} className="rotate-180" />
              <span>Back to {isLecturer ? 'Lecturer' : 'Student'} Dashboard</span>
            </Link>
          </div>
        </div>
      ) : isLecturer ? (
        /* LECTURER DASHBOARD HERO */
        <div
          className={`rounded-3xl border p-6 sm:p-8 space-y-5 transition-all ${isDark
            ? 'bg-gradient-to-br from-[#141E19] via-[#121c17] to-[#0d1410] border-[#3C4043]'
            : 'bg-gradient-to-br from-[#ECFDF5]/80 via-white to-[#F0FDF4] border-[#A7F3D0]'
            }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center">
                {isDemoMode && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${isDark
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                  >
                    <Sparkle size={11} weight="fill" />
                    <span>Demo Faculty Account</span>
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight">
                Welcome back, {currentUser?.name || 'Lecturer'}
              </h1>
              <p
                className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Manage your teaching cohorts, publish assignments, grade student submissions, and host ultra-low bandwidth vector chalkboard lectures.
              </p>
              <div
                className={`flex flex-wrap items-center gap-3 pt-1 text-xs ${isDark ? 'text-[#81C995]' : 'text-[#059669]'
                  }`}
              >
                {currentUser?.matricOrStaffId && (
                  <>
                    <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                      Staff ID: {currentUser.matricOrStaffId}
                    </span>
                    <span>•</span>
                  </>
                )}
                <span>{currentUser?.department || 'Faculty Member'}</span>
                {currentUser?.email && (
                  <>
                    <span>•</span>
                    <span className="opacity-80">{currentUser.email}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStudioCourseRequiredNotice(false);
                  setShowCreateModal(true);
                }}
                className={`btn-google px-5 py-3 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-md transition-transform active:scale-95 ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                <Plus size={16} weight="bold" />
                <span>Create New Course</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const firstCourseRoom = myTeachingCourses[0]?.liveRoomCode;
                  if (!firstCourseRoom) {
                    setStudioCourseRequiredNotice(true);
                    setShowCreateModal(true);
                    return;
                  }
                  setActiveRoomCode(firstCourseRoom);
                  navigate(`/studio/${firstCourseRoom}`);
                }}
                title={
                  myTeachingCourses.length === 0
                    ? 'Create a course first before launching Live Studio'
                    : 'Launch Live Studio for your course'
                }
                className={`btn-google px-4 py-3 rounded-full border text-xs font-medium inline-flex items-center gap-2 cursor-pointer ${isDark
                  ? 'border-[#3C4043] bg-[#0F1713] text-[#E3E3E3] hover:bg-[#28292A]'
                  : 'border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F8F9FA]'
                  }`}
              >
                <VideoCamera size={16} weight="regular" />
                <span>Host Live Studio</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* STUDENT DASHBOARD HERO */
        <div
          className={`rounded-3xl border p-6 sm:p-8 space-y-5 transition-all ${isDark
            ? 'bg-gradient-to-br from-[#141E19] via-[#101915] to-[#0A120E] border-[#3C4043]'
            : 'bg-gradient-to-br from-[#EFF6FF] via-white to-[#F0FDF4] border-[#BFDBFE]'
            }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center">
                {isDemoMode && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${isDark
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                  >
                    <Sparkle size={11} weight="fill" />
                    <span>Demo Student Account</span>
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight">
                Welcome back, {currentUser?.name || 'Student'}
              </h1>
              <p
                className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Attend live vector chalkboard classes under 30 kbps, track your upcoming assignments, check your grades, and replay past lectures offline.
              </p>
              <div
                className={`flex flex-wrap items-center gap-3 pt-1 text-xs ${isDark ? 'text-[#8AB4F8]' : 'text-[#1A73E8]'
                  }`}
              >
                {currentUser?.matricOrStaffId && (
                  <>
                    <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                      Matric No: {currentUser.matricOrStaffId}
                    </span>
                    <span>•</span>
                  </>
                )}
                <span>{currentUser?.department || 'Student Portal'}</span>

              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setStudioCourseRequiredNotice(false);
                  setShowJoinModal(true);
                }}
                className={`btn-google px-5 py-3 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-md transition-transform active:scale-95 ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                <Hash size={16} weight="bold" />
                <span>Join Class with Code</span>
              </button>

              <Link
                to="/study"
                className={`btn-google px-4 py-3 rounded-full border text-xs font-medium inline-flex items-center gap-2 ${isDark
                  ? 'border-[#3C4043] bg-[#0F1713] text-[#E3E3E3] hover:bg-[#28292A]'
                  : 'border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F8F9FA]'
                  }`}
              >
                <BookOpenText size={16} weight="regular" />
                <span>Study Hub & Quizzes</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ROLE-SPECIFIC KPI SUMMARY CARDS
         ===================================================================== */}
      {!isArchivedView && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLecturer ? (
            <>
              <div
                className={`p-5 rounded-2xl border transition-all ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]'
                  : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Teaching Cohorts
                  </span>
                  <ChalkboardTeacher
                    size={20}
                    className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'}
                  />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                  {myTeachingCourses.length}
                </div>
                <p
                  className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Active courses managed by you
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border transition-all ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]'
                  : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Enrolled Students
                  </span>
                  <Users
                    size={20}
                    className={isDark ? 'text-[#81C995]' : 'text-[#10B981]'}
                  />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                  {totalEnrolledStudents}
                </div>
                <p
                  className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Across all your cohorts
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border transition-all ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]'
                  : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Needs Grading
                  </span>
                  <ClipboardText
                    size={20}
                    className={
                      lecturerSubmissionsToReview.length > 0
                        ? isDark
                          ? 'text-[#FDD663]'
                          : 'text-[#D97706]'
                        : isDark
                          ? 'text-[#81C995]'
                          : 'text-[#10B981]'
                    }
                  />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                  {lecturerSubmissionsToReview.length}
                </div>
                <p
                  className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  {lecturerSubmissionsToReview.length > 0
                    ? `${lecturerAssignments.length} active assignments`
                    : 'All submissions reviewed'}
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border transition-all ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]'
                  : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Live Broadcasts
                  </span>
                  <Broadcast
                    size={20}
                    className={
                      liveTeachingCourses.length > 0
                        ? 'text-[#69DB7C] animate-pulse'
                        : isDark
                          ? 'text-[#9AA0A6]'
                          : 'text-[#5F6368]'
                    }
                  />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                  {liveTeachingCourses.length}
                </div>
                <p
                  className={`text-[11px] mt-1 ${liveTeachingCourses.length > 0
                    ? isDark
                      ? 'text-[#69DB7C]'
                      : 'text-[#059669]'
                    : isDark
                      ? 'text-[#9AA0A6]'
                      : 'text-[#5F6368]'
                    }`}
                >
                  {liveTeachingCourses.length > 0
                    ? 'Streaming live now'
                    : myTeachingCourses.length > 0
                      ? 'Ready to host studio'
                      : 'Create a course to host'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div
                className={`p-5 rounded-2xl border transition-all ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]'
                  : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Enrolled Classes
                  </span>
                  <GraduationCap
                    size={20}
                    className={isDark ? 'text-[#8AB4F8]' : 'text-[#1A73E8]'}
                  />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                  {myEnrolledCourses.length}
                </div>
                <p
                  className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Active courses this semester
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border transition-all ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]'
                  : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Assignments Due
                  </span>
                  <FolderOpen
                    size={20}
                    className={
                      studentPendingAssignments.length > 0
                        ? isDark
                          ? 'text-[#FDD663]'
                          : 'text-[#D97706]'
                        : isDark
                          ? 'text-[#81C995]'
                          : 'text-[#10B981]'
                    }
                  />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                  {studentPendingAssignments.length}
                </div>
                <p
                  className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  {studentPendingAssignments.length > 0
                    ? 'Awaiting your submission'
                    : 'All caught up!'}
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border transition-all ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]'
                  : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Completed Work
                  </span>
                  <CheckCircle
                    size={20}
                    className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'}
                  />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                  {studentCompletedAssignments.length}
                </div>
                <p
                  className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Submitted or graded
                </p>
              </div>

              <div
                className={`p-5 rounded-2xl border transition-all ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]'
                  : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Live Lectures
                  </span>
                  <Broadcast
                    size={20}
                    className={
                      liveEnrolledCourses.length > 0
                        ? 'text-[#69DB7C] animate-pulse'
                        : isDark
                          ? 'text-[#9AA0A6]'
                          : 'text-[#5F6368]'
                    }
                  />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                  {liveEnrolledCourses.length}
                </div>
                <p
                  className={`text-[11px] mt-1 ${liveEnrolledCourses.length > 0
                    ? isDark
                      ? 'text-[#69DB7C]'
                      : 'text-[#059669]'
                    : isDark
                      ? 'text-[#9AA0A6]'
                      : 'text-[#5F6368]'
                    }`}
                >
                  {liveEnrolledCourses.length > 0
                    ? 'Class streaming live!'
                    : myEnrolledCourses.length > 0
                      ? 'No live stream right now'
                      : 'Enroll in a class first'}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          DEDICATED ROLE WORKSPACE WIDGETS (LECTURER vs STUDENT)
         ===================================================================== */}
      {!isArchivedView &&
        (isLecturer ? (
          /* LECTURER WORKSPACE: GRADING QUEUE + COHORT INVITE DISTRIBUTION */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lecturer Panel 1: Needs Grading Queue */}
            <div
              className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between space-y-4 ${isDark
                ? 'bg-[#141E19] border-[#3C4043]'
                : 'bg-white border-[#DADCE0]'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                      }`}
                  >
                    <ClipboardText size={18} weight="bold" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm sm:text-base font-medium">
                      Submissions Awaiting Review
                    </h2>
                    <p
                      className={`text-[11px] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                    >
                      Student coursework turned in across your cohorts
                    </p>
                  </div>
                </div>
                <Link
                  to="/hub/todo"
                  className={`text-xs font-medium inline-flex items-center gap-1 ${isDark
                    ? 'text-[#69DB7C] hover:underline'
                    : 'text-[#059669] hover:underline'
                    }`}
                >
                  <span>Grading Center</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              {lecturerSubmissionsToReview.length === 0 ? (
                <div
                  className={`p-6 rounded-2xl border text-center space-y-1.5 ${isDark
                    ? 'bg-[#0F1713]/60 border-[#3C4043]'
                    : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                >
                  <CheckCircle
                    size={24}
                    className="mx-auto text-[#059669] dark:text-[#69DB7C]"
                  />
                  <p className="text-xs font-medium">
                    No ungraded submissions in queue
                  </p>
                  <p
                    className={`text-[11px] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    When students turn in assignments in your courses, they will appear here for grading.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {lecturerSubmissionsToReview.slice(0, 3).map((sub) => {
                    const course = myTeachingCourses.find(
                      (c) => c.id === sub.courseId
                    );
                    const assignment = assignments.find(
                      (a) => a.id === sub.assignmentId
                    );
                    return (
                      <div
                        key={sub.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${isDark
                          ? 'bg-[#0F1713]/70 border-[#3C4043]'
                          : 'bg-[#F8F9FA] border-[#DADCE0]'
                          }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDark
                                ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                                : 'bg-[#ECFDF5] text-[#059669]'
                                }`}
                            >
                              {course?.code || 'Course'}
                            </span>
                            <span className="text-xs font-medium truncate">
                              {sub.studentName}
                            </span>
                          </div>
                          <p
                            className={`text-[11px] truncate mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                              }`}
                          >
                            {assignment?.title || 'Coursework Submission'} •{' '}
                            {sub.submittedAt}
                          </p>
                        </div>

                        <Link
                          to={`/hub/course/${sub.courseId}`}
                          className={`btn-google px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 ${isDark
                            ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                            : 'bg-[#059669] text-white hover:bg-[#047857]'
                            }`}
                        >
                          Review
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lecturer Panel 2: Cohort Invite Codes & Quick Broadcast */}
            <div
              className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between space-y-4 ${isDark
                ? 'bg-[#141E19] border-[#3C4043]'
                : 'bg-white border-[#DADCE0]'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark
                      ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                      : 'bg-[#ECFDF5] text-[#059669]'
                      }`}
                  >
                    <Hash size={18} weight="bold" />
                  </div>
                  <div>
                    <h2 className="font-display text-sm sm:text-base font-medium">
                      Student Enrollment Codes
                    </h2>
                    <p
                      className={`text-[11px] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                    >
                      Share these course codes with your students so they can enroll
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className={`text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${isDark
                    ? 'text-[#69DB7C] hover:underline'
                    : 'text-[#059669] hover:underline'
                    }`}
                >
                  <Plus size={13} weight="bold" />
                  <span>New Cohort</span>
                </button>
              </div>

              {myTeachingCourses.length === 0 ? (
                <div
                  className={`p-6 rounded-2xl border text-center space-y-2 ${isDark
                    ? 'bg-[#0F1713]/60 border-[#3C4043]'
                    : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                >
                  <p className="text-xs font-medium">
                    No active teaching cohorts yet
                  </p>
                  <p
                    className={`text-[11px] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    Create a course to generate an enrollment code for your students.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myTeachingCourses.slice(0, 3).map((course) => (
                    <div
                      key={course.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${isDark
                        ? 'bg-[#0F1713]/70 border-[#3C4043]'
                        : 'bg-[#F8F9FA] border-[#DADCE0]'
                        }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[#059669] dark:text-[#69DB7C]">
                            {course.code}
                          </span>
                          <span className="text-xs font-medium truncate">
                            {course.title}
                          </span>
                        </div>
                        <p
                          className={`text-[11px] mt-0.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                            }`}
                        >
                          {course.enrolledCount} students enrolled •{' '}
                          {course.scheduleTime}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(course.code)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors ${copiedCode === course.code
                          ? 'bg-[#69DB7C]/20 border-[#69DB7C] text-[#69DB7C]'
                          : isDark
                            ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3] hover:border-[#69DB7C]'
                            : 'bg-white border-[#DADCE0] text-[#202124] hover:border-[#059669]'
                          }`}
                      >
                        {copiedCode === course.code ? (
                          <>
                            <Check size={13} weight="bold" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>{course.code}</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STUDENT WORKSPACE: LIVE STREAM ALERT + FAST ENROLL BAR + DEADLINES & GRADES */
          <div className="space-y-6">
            {firstLiveEnrolled && (
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isDark
                  ? 'bg-[#69DB7C]/10 border-[#69DB7C]/40 text-[#E3E3E3]'
                  : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#69DB7C] animate-ping shrink-0" />
                  <div>
                    <span className="font-semibold text-xs sm:text-sm">
                      {firstLiveEnrolled.code} ({firstLiveEnrolled.title}) is Live Right Now!
                    </span>
                    <p className="text-xs opacity-80">
                      {firstLiveEnrolled.lecturerName} is broadcasting on the vector chalkboard.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveRoomCode(firstLiveEnrolled.liveRoomCode);
                    navigate(`/studio/${firstLiveEnrolled.liveRoomCode}`);
                  }}
                  className={`btn-google px-4 py-2 rounded-full font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <VideoCamera size={15} weight="bold" />
                  <span>Join Live Class Now</span>
                </button>
              </div>
            )}

            {/* Student Fast Inline Course Enrollment Bar */}
            <form
              onSubmit={handleQuickJoinSubmit}
              className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs ${isDark
                ? 'bg-[#141E19] border-[#3C4043]'
                : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
            >
              <div className="flex items-center gap-2 px-2 shrink-0">
                <Hash
                  size={16}
                  className={isDark ? 'text-[#8AB4F8]' : 'text-[#1A73E8]'}
                />
                <span className="font-medium">Enroll with Course Code:</span>
              </div>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={quickJoinInput}
                  onChange={(e) => setQuickJoinInput(e.target.value)}
                  placeholder={
                    isDemoMode
                      ? 'Enter a course code from your lecturer (try demo code: CSC 401 or MTH 304)...'
                      : 'Enter the course code shared by your lecturer...'
                  }
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-white border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                />
                {quickJoinError && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#EA4335]">
                    {quickJoinError}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={!quickJoinInput.trim() || isJoining}
                className={`btn-google px-4 py-2 rounded-full font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                <span>Enroll in Class</span>
              </button>
            </form>

            {/* Student 2-Column Overview: Upcoming Deadlines + Recent Grades */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Student Panel 1: Upcoming Deadlines */}
              <div
                className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between space-y-4 ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]'
                  : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark
                        ? 'bg-[#1A73E8]/20 text-[#8AB4F8]'
                        : 'bg-[#EFF6FF] text-[#1A73E8]'
                        }`}
                    >
                      <CalendarBlank size={18} weight="bold" />
                    </div>
                    <div>
                      <h2 className="font-display text-sm sm:text-base font-medium">
                        Upcoming Deadlines
                      </h2>
                      <p
                        className={`text-[11px] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                          }`}
                      >
                        Assignments due in your enrolled classes
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/hub/todo"
                    className={`text-xs font-medium inline-flex items-center gap-1 ${isDark
                      ? 'text-[#8AB4F8] hover:underline'
                      : 'text-[#1A73E8] hover:underline'
                      }`}
                  >
                    <span>View All</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                {studentPendingAssignments.length === 0 ? (
                  <div
                    className='p-6 text-center space-y-1.5'
                  >
                    <CheckCircle
                      size={24}
                      className="mx-auto text-[#059669] dark:text-[#69DB7C]"
                    />
                    <p className="text-xs font-medium">
                      No pending assignments due
                    </p>
                    <p
                      className={`text-[11px] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                    >
                      {myEnrolledCourses.length === 0
                        ? 'Enroll in a class with a course code to see your coursework.'
                        : 'You have submitted all assigned coursework so far.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {studentPendingAssignments.slice(0, 3).map((item) => {
                      const course = myEnrolledCourses.find(
                        (c) => c.id === item.courseId
                      );
                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${isDark
                            ? 'bg-[#0F1713]/70 border-[#3C4043]'
                            : 'bg-[#F8F9FA] border-[#DADCE0]'
                            }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDark
                                  ? 'bg-[#1A73E8]/20 text-[#8AB4F8]'
                                  : 'bg-[#EFF6FF] text-[#1A73E8]'
                                  }`}
                              >
                                {course?.code || 'Class'}
                              </span>
                              <span className="text-xs font-medium truncate">
                                {item.title}
                              </span>
                            </div>
                            <p
                              className={`text-[11px] mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                                }`}
                            >
                              Due: {item.dueDate} • {item.points} pts
                            </p>
                          </div>

                          <Link
                            to={`/hub/course/${item.courseId}`}
                            className={`btn-google px-3 py-1.5 rounded-full text-[11px] font-semibold shrink-0 ${isDark
                              ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                              : 'bg-[#059669] text-white hover:bg-[#047857]'
                              }`}
                          >
                            Submit
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Student Panel 2: Recent Grades & Submissions */}
              <div
                className={`p-5 sm:p-6 rounded-3xl border flex flex-col justify-between space-y-4 ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]'
                  : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark
                        ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                        : 'bg-[#ECFDF5] text-[#059669]'
                        }`}
                    >
                      <Medal size={18} weight="bold" />
                    </div>
                    <div>
                      <h2 className="font-display text-sm sm:text-base font-medium">
                        My Submissions & Grades
                      </h2>
                      <p
                        className={`text-[11px] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                          }`}
                      >
                        Feedback and scores from your lecturers
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/hub/todo"
                    className={`text-xs font-medium inline-flex items-center gap-1 ${isDark
                      ? 'text-[#69DB7C] hover:underline'
                      : 'text-[#059669] hover:underline'
                      }`}
                  >
                    <span>All Work</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                {myStudentSubmissions.length === 0 ? (
                  <div
                    className='p-6 text-center space-y-1.5'
                  >
                    <p className="text-xs font-medium">
                      No graded or submitted work yet
                    </p>
                    <p
                      className={`text-[11px] ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                    >
                      Once you submit assignments and your lecturer grades them, your scores will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {myStudentSubmissions.slice(0, 3).map((sub) => {
                      const course = myEnrolledCourses.find(
                        (c) => c.id === sub.courseId
                      );
                      const assignment = assignments.find(
                        (a) => a.id === sub.assignmentId
                      );
                      const lecturerFeedback = sub.privateComments?.find(
                        (c) => c.authorRole === 'lecturer'
                      )?.text;
                      return (
                        <div
                          key={sub.id}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${isDark
                            ? 'bg-[#0F1713]/70 border-[#3C4043]'
                            : 'bg-[#F8F9FA] border-[#DADCE0]'
                            }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDark
                                  ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                                  : 'bg-[#ECFDF5] text-[#059669]'
                                  }`}
                              >
                                {course?.code || 'Course'}
                              </span>
                              <span className="text-xs font-medium truncate">
                                {assignment?.title || 'Assignment'}
                              </span>
                            </div>
                            <p
                              className={`text-[11px] truncate mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                                }`}
                            >
                              {lecturerFeedback
                                ? `Feedback: "${lecturerFeedback}"`
                                : `Turned in ${sub.submittedAt || 'recently'}`}
                            </p>
                          </div>

                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 ${sub.status === 'graded'
                              ? isDark
                                ? 'bg-[#69DB7C]/20 text-[#69DB7C]'
                                : 'bg-[#ECFDF5] text-[#059669]'
                              : isDark
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-amber-50 text-amber-700'
                              }`}
                          >
                            {sub.status === 'graded' && sub.grade !== undefined
                              ? `${sub.grade}/${assignment?.points || 100}`
                              : 'Turned In'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

      {/* =====================================================================
          SEARCH & ROLE-SCOPED FILTER BAR
         ===================================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isLecturer
                ? 'Search your teaching cohorts by code or title...'
                : 'Search your enrolled classes by code, title, or lecturer...'
            }
            aria-label="Search courses"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none ${isDark
              ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
              : 'bg-white border-[#DADCE0] text-[#202124] focus:border-[#059669]'
              }`}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterMode('primary')}
            className={`btn-google px-4 py-2 rounded-full text-xs font-medium border cursor-pointer whitespace-nowrap ${filterMode === 'primary'
              ? isDark
                ? 'bg-[#69DB7C]/15 border-[#69DB7C]/30 text-[#69DB7C]'
                : 'bg-[#ECFDF5] border-[#059669]/20 text-[#059669]'
              : isDark
                ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
              }`}
          >
            {isLecturer
              ? `Teaching Cohorts (${myTeachingCourses.length})`
              : `My Enrolled Classes (${myEnrolledCourses.length})`}
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('live')}
            className={`btn-google px-4 py-2 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${filterMode === 'live'
              ? isDark
                ? 'bg-[#69DB7C]/15 border-[#69DB7C]/30 text-[#69DB7C]'
                : 'bg-[#ECFDF5] border-[#059669]/20 text-[#059669]'
              : isDark
                ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#69DB7C]" />
            <span>
              Live Now (
              {isLecturer
                ? liveTeachingCourses.length
                : liveEnrolledCourses.length}
              )
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          ROLE-SCOPED COURSES GRID OR EMPTY STATES
         ===================================================================== */}
      {filteredCourses.length === 0 ? (
        filterMode === 'live' ? (
          <div
            className={`p-10 sm:p-14 rounded-3xl border text-center space-y-4 ${isDark
              ? 'bg-[#141E19] border-[#3C4043]'
              : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-[#69DB7C]/15 border border-[#69DB7C]/30 flex items-center justify-center text-[#69DB7C]">
              <Broadcast size={28} weight="regular" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg sm:text-xl font-medium">
                No Active Live Streams Right Now
              </h2>
              <p
                className={`text-xs sm:text-sm max-w-md mx-auto ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                {isLecturer
                  ? myTeachingCourses.length === 0
                    ? 'You have not created a teaching cohort yet. Create a course first before launching a live studio broadcast.'
                    : 'None of your teaching cohorts currently have an active live broadcast. You can start a live studio session anytime.'
                  : myEnrolledCourses.length === 0
                    ? 'You are not enrolled in any classes yet. Join a class with your lecturer’s course code first to access live studio lectures.'
                    : 'None of your enrolled classes are currently broadcasting live. You can review your course materials or study notes.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {isLecturer ? (
                <button
                  type="button"
                  onClick={() => {
                    const code = myTeachingCourses[0]?.liveRoomCode;
                    if (!code) {
                      setStudioCourseRequiredNotice(true);
                      setShowCreateModal(true);
                      return;
                    }
                    setActiveRoomCode(code);
                    navigate(`/studio/${code}`);
                  }}
                  className={`btn-google px-5 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-2 cursor-pointer ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  {myTeachingCourses.length === 0 ? (
                    <>
                      <Plus size={16} weight="bold" />
                      <span>Create Course to Host Studio</span>
                    </>
                  ) : (
                    <>
                      <VideoCamera size={16} weight="bold" />
                      <span>Start Instant Lecture</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (myEnrolledCourses.length === 0) {
                      setStudioCourseRequiredNotice(true);
                      setShowJoinModal(true);
                      return;
                    }
                    setFilterMode('primary');
                  }}
                  className={`btn-google px-5 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-2 cursor-pointer ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  {myEnrolledCourses.length === 0 ? (
                    <>
                      <Hash size={16} weight="bold" />
                      <span>Join Class with Code</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap size={16} weight="bold" />
                      <span>Back to Enrolled Classes</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : isLecturer ? (
          /* Empty Lecturer Cohorts */
          <div
            className={`p-10 sm:p-14 rounded-3xl border text-center space-y-4 ${isDark
              ? 'bg-[#141E19] border-[#3C4043]'
              : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#69DB7C]/15 border border-[#69DB7C]/30 flex items-center justify-center text-[#69DB7C]">
              <ChalkboardTeacher size={32} weight="regular" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg sm:text-xl font-medium">
                {searchQuery
                  ? 'No matching teaching cohorts'
                  : 'No Teaching Cohorts Created Yet'}
              </h2>
              <p
                className={`text-xs sm:text-sm max-w-md mx-auto ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                {searchQuery
                  ? 'Try clearing your search filter.'
                  : 'Create your first course cohort to generate a join code for students, post assignments, and host live vector chalkboard lectures.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className={`btn-google px-6 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                <Plus size={16} weight="bold" />
                <span>Create Your First Course</span>
              </button>
            </div>
          </div>
        ) : (
          /* Empty Student Enrolled Classes */
          <div
            className={`p-10 sm:p-14 rounded-3xl border text-center space-y-2 ${isDark
              ? 'bg-[#141E19] border-[#3C4043]'
              : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <div className="w-16 h-16 mx-auto flex items-center justify-center text-black/80 dark:text-white/80">
              <GraduationCap size={48} weight="regular" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg sm:text-xl font-medium">
                {searchQuery
                  ? 'No matching enrolled classes'
                  : 'No Enrolled Classes Yet'}
              </h2>
              <p
                className={`text-xs sm:text-sm max-w-md mx-auto ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                {searchQuery
                  ? 'Try clearing your search filter.'
                  : 'Enter the course invite code shared by your lecturer to enroll in your class and access live sessions, assignments, and study notes.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowJoinModal(true)}
                className={`btn-google px-6 py-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                <Hash size={16} weight="bold" />
                <span>Join Class with Code</span>
              </button>
            </div>
          </div>
        )
      ) : (
        /* Render Role-Differentiated Course Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCourses.map((course) => {
            const courseLive = isCourseLive(course);
            const userTeaches = isLecturerCourse(course);
            const ungradedForCourse = submissions.filter(
              (s) => s.courseId === course.id && s.status === 'turned_in'
            ).length;
            const dueForCourse = studentPendingAssignments.filter(
              (a) => a.courseId === course.id
            ).length;

            return (
              <div
                key={course.id}
                className={`hover-lift rounded-3xl border overflow-hidden flex flex-col justify-between transition-all ${isDark
                  ? 'bg-[#141E19] border-[#3C4043]'
                  : 'bg-white border-[#DADCE0]'
                  }`}
              >
                {/* Course Header Banner */}
                <div
                  className={`p-6 border-b ${isDark
                    ? 'bg-[#0F1713]/60 border-[#3C4043]'
                    : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-mono text-sm font-semibold ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                            }`}
                        >
                          {course.code}
                        </span>

                        {isLecturer ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${isDark
                              ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                              : 'bg-[#ECFDF5] text-[#059669]'
                              }`}
                          >
                            <ChalkboardTeacher size={12} weight="bold" />
                            <span>Instructor</span>
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${isDark
                              ? 'bg-[#1A73E8]/20 text-[#8AB4F8]'
                              : 'bg-[#EFF6FF] text-[#1A73E8]'
                              }`}
                          >
                            <GraduationCap size={12} weight="bold" />
                            <span>Enrolled</span>
                          </span>
                        )}

                        {courseLive && (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${isDark
                              ? 'bg-[#EA4335]/15 text-[#F28B82]'
                              : 'bg-[#FCE8E6] text-[#C5221F]'
                              }`}
                          >
                            <Broadcast
                              size={12}
                              weight="fill"
                              className="animate-pulse"
                            />
                            <span>LIVE</span>
                          </span>
                        )}

                        {isLecturer && ungradedForCourse > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${isDark
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-amber-50 text-amber-700'
                              }`}
                          >
                            <span>{ungradedForCourse} to grade</span>
                          </span>
                        )}

                        {!isLecturer && dueForCourse > 0 && (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${isDark
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-amber-50 text-amber-700'
                              }`}
                          >
                            <span>{dueForCourse} due</span>
                          </span>
                        )}
                      </div>

                      <h2 className="font-display text-lg font-medium mt-2 leading-snug">
                        {course.title}
                      </h2>

                      <p
                        className={`text-xs mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                          }`}
                      >
                        {isLecturer
                          ? `${course.department || 'Teaching Cohort'}`
                          : `Lecturer: ${course.lecturerName}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 shrink-0 border ${isDark
                          ? 'bg-[#141E19] border-[#3C4043] text-[#9AA0A6]'
                          : 'bg-white border-[#DADCE0] text-[#5F6368]'
                          }`}
                        title={`${course.enrolledCount} students enrolled`}
                      >
                        <Users size={14} weight="regular" />
                        <span>{course.enrolledCount}</span>
                      </span>

                      {/* 3-Dots Kebab Action Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuCourseId(
                              openMenuCourseId === course.id ? null : course.id
                            );
                          }}
                          title="Course options"
                          className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                        >
                          <DotsThreeVertical size={18} weight="bold" />
                        </button>

                        {openMenuCourseId === course.id && (
                          <div
                            className={`absolute right-0 top-8 w-48 rounded-2xl py-1.5 shadow-xl border z-30 text-xs font-medium ${isDark
                              ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
                              : 'bg-white border-[#DADCE0] text-[#202124]'
                              }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleCopyInviteLink(course)}
                              className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                            >
                              <LinkSimple size={15} />
                              <span>Copy invite link</span>
                            </button>

                            {userTeaches && !course.isArchived && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(course)}
                                  className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                                >
                                  <PencilSimple size={15} />
                                  <span>Edit details</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleArchiveCourse(course.id)}
                                  className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                                >
                                  <Archive size={15} />
                                  <span>Archive class</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                >
                                  <Trash size={15} />
                                  <span>Delete course</span>
                                </button>
                              </>
                            )}

                            {userTeaches && course.isArchived && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreCourse(course.id)}
                                  className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                >
                                  <ArrowCounterClockwise size={15} />
                                  <span>Restore class</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCourse(course.id)}
                                  className="w-full px-3.5 py-2 text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                >
                                  <Trash size={15} />
                                  <span>Delete permanently</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Course Card Body & Role Controls */}
                <div className="p-6 space-y-5">
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock size={15} weight="regular" />
                      <span>{course.scheduleTime}</span>
                    </div>

                    {/* Invite Code Box for Lecturer */}
                    {isLecturer && (
                      <div className="flex items-center gap-1.5">
                        <span>Invite Code:</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(course.code)}
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${copiedCode === course.code
                            ? 'bg-[#69DB7C]/20 text-[#69DB7C]'
                            : isDark
                              ? 'bg-[#0F1713] text-[#E3E3E3] hover:text-[#69DB7C]'
                              : 'bg-[#F1F3F4] text-[#202124] hover:text-[#059669]'
                            }`}
                          title="Copy student join code"
                        >
                          {copiedCode === course.code ? (
                            <>
                              <Check size={12} weight="bold" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} weight="regular" />
                              <span>{course.code}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions Tailored to Role */}
                  <div className="flex flex-wrap items-center gap-3">
                    {course.isArchived ? (
                      <>
                        {userTeaches && (
                          <button
                            type="button"
                            onClick={() => handleRestoreCourse(course.id)}
                            className={`btn-google flex-1 py-2.5 px-4 rounded-full font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer ${isDark
                              ? 'bg-[#69DB7C]/15 text-[#69DB7C] border border-[#69DB7C]/30 hover:bg-[#69DB7C]/25'
                              : 'bg-[#ECFDF5] text-[#059669] border border-[#059669]/30 hover:bg-[#D1FAE5]'
                              }`}
                          >
                            <ArrowCounterClockwise size={15} weight="bold" />
                            <span>Restore Course</span>
                          </button>
                        )}
                        <Link
                          to={`/hub/course/${course.id}`}
                          className={`btn-google flex-1 py-2.5 px-4 rounded-full border font-medium text-xs inline-flex items-center justify-center gap-1.5 ${isDark
                            ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                            : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                            }`}
                        >
                          <span>View Archived Class</span>
                          <ArrowRight size={14} weight="regular" />
                        </Link>
                      </>
                    ) : isLecturer ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRoomCode(course.liveRoomCode);
                            navigate(`/studio/${course.liveRoomCode}`);
                          }}
                          className={`btn-google flex-1 py-2.5 px-4 rounded-full font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${courseLive
                            ? isDark
                              ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                              : 'bg-[#059669] text-white hover:bg-[#047857]'
                            : isDark
                              ? 'bg-[#69DB7C]/15 text-[#69DB7C] border border-[#69DB7C]/30 hover:bg-[#69DB7C]/25'
                              : 'bg-[#ECFDF5] text-[#059669] border border-[#059669]/30 hover:bg-[#D1FAE5]'
                            }`}
                        >
                          <VideoCamera size={16} weight="bold" />
                          <span>
                            {courseLive
                              ? 'Resume Live Stream'
                              : 'Host Live Lecture'}
                          </span>
                        </button>

                        <Link
                          to={`/hub/course/${course.id}`}
                          className={`btn-google flex-1 py-2.5 px-4 rounded-full border font-medium text-xs inline-flex items-center justify-center gap-1.5 ${isDark
                            ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                            : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                            }`}
                        >
                          <span>Manage Class & Grades</span>
                          <ArrowRight size={14} weight="regular" />
                        </Link>
                      </>
                    ) : (
                      /* Student Actions */
                      <>
                        {courseLive && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRoomCode(course.liveRoomCode);
                              navigate(`/studio/${course.liveRoomCode}`);
                            }}
                            className={`btn-google flex-1 py-2.5 px-4 rounded-full font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${isDark
                              ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                              : 'bg-[#059669] text-white hover:bg-[#047857]'
                              }`}
                          >
                            <VideoCamera size={16} weight="bold" />
                            <span>Join Live Class</span>
                          </button>
                        )}

                        <Link
                          to={`/hub/course/${course.id}`}
                          className={`btn-google flex-1 py-2.5 px-4 rounded-full border font-medium text-xs inline-flex items-center justify-center gap-1.5 ${isDark
                            ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                            : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                            }`}
                        >
                          <span>Enter Classroom</span>
                          <ArrowRight size={14} weight="regular" />
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join Course Modal (Student) */}
      {showJoinModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleJoinByCode}
            className={`modal-surface w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl ${isDark
              ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
              : 'bg-white border-[#DADCE0] text-[#202124]'
              }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-medium flex items-center gap-2">
                <Hash
                  size={20}
                  className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'}
                />
                <span>Join Class with Code</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setStudioCourseRequiredNotice(false);
                  setShowJoinModal(false);
                }}
                className="btn-google p-1.5 rounded-full opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X size={18} weight="regular" />
              </button>
            </div>
            {studioCourseRequiredNotice && (
              <div
                className={`p-3 rounded-2xl border text-xs leading-relaxed ${isDark
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
              >
                You must enroll in a class with a course code first before entering Live Studio. Enter the course invite code shared by your lecturer below.
              </div>
            )}
            <p
              className={`text-xs leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
            >
              Ask your lecturer for the course code and enter it below to enroll in the class.
            </p>
            <div>
              <label
                htmlFor="join-code-input"
                className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Course Invite Code
              </label>
              <input
                id="join-code-input"
                type="text"
                value={joinCodeInput}
                onChange={(e) => {
                  setJoinCodeInput(e.target.value);
                  if (joinModalError) setJoinModalError(null);
                }}
                placeholder="Enter course code (e.g. PHY 222)"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none ${isDark
                  ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                  : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                  }`}
              />
              {joinModalError && (
                <p className="text-xs text-rose-500 mt-1.5">{joinModalError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className={`btn-google px-4 py-2 rounded-full text-xs font-medium cursor-pointer ${isDark
                  ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!joinCodeInput.trim() || isJoining}
                className={`btn-google px-5 py-2 rounded-full font-medium text-xs cursor-pointer disabled:opacity-50 ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                Enroll & Open
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Course Modal (Lecturer) */}
      {showCreateModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateCourse}
            className={`modal-surface w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl ${isDark
              ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
              : 'bg-white border-[#DADCE0] text-[#202124]'
              }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-medium flex items-center gap-2">
                <ChalkboardTeacher
                  size={20}
                  className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'}
                />
                <span>Create New Teaching Cohort</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setStudioCourseRequiredNotice(false);
                  setShowCreateModal(false);
                }}
                className="btn-google p-1.5 rounded-full opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X size={18} weight="regular" />
              </button>
            </div>

            {studioCourseRequiredNotice && (
              <div
                className={`p-3 rounded-2xl border text-xs leading-relaxed ${isDark
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
              >
                You must create or add a course cohort first before launching Live Studio. Create your course below to generate its dedicated studio room.
              </div>
            )}

            <p
              className={`text-xs leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
            >
              Create a new course cohort. Students can enroll using the course code you define below.
            </p>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="new-course-code"
                  className={`block text-xs font-medium mb-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Course Code
                </label>
                <input
                  id="new-course-code"
                  type="text"
                  placeholder="Enter course code"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                />
              </div>

              <div>
                <label
                  htmlFor="new-course-title"
                  className={`block text-xs font-medium mb-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Course Title
                </label>
                <input
                  id="new-course-title"
                  type="text"
                  placeholder="Enter course title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                />
              </div>

              <div>
                <label
                  htmlFor="new-course-schedule"
                  className={`block text-xs font-medium mb-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Lecture Schedule
                </label>
                <input
                  id="new-course-schedule"
                  type="text"
                  placeholder="Enter weekly schedule"
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className={`btn-google px-4 py-2 rounded-full text-xs font-medium cursor-pointer ${isDark
                  ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                  : 'text-[#5F6368] hover:text-[#202124]'
                  }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newCode.trim() || !newTitle.trim() || isCreating}
                className={`btn-google px-5 py-2 rounded-full font-medium text-xs cursor-pointer disabled:opacity-50 ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                Create & Open
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveEdit}
            className={`modal-surface w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl ${isDark
              ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
              : 'bg-white border-[#DADCE0] text-[#202124]'
              }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-medium flex items-center gap-2">
                <PencilSimple
                  size={20}
                  className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'}
                />
                <span>Edit Class Details</span>
              </h2>
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="btn-google p-1.5 rounded-full opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X size={18} weight="regular" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 opacity-70">
                  Course Name (required)
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 opacity-70">
                  Section
                </label>
                <input
                  type="text"
                  placeholder="Section or Cohort"
                  value={editSection}
                  onChange={(e) => setEditSection(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 opacity-70">
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="Academic subject"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 opacity-70">
                  Room
                </label>
                <input
                  type="text"
                  placeholder="Room or Online"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 opacity-70">
                  Lecture Schedule
                </label>
                <input
                  type="text"
                  placeholder="Schedule time"
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                    }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  const idToDelete = editingCourse.id;
                  setEditingCourse(null);
                  await handleDeleteCourse(idToDelete);
                }}
                className="btn-google px-3.5 py-2 rounded-full text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash size={14} />
                <span>Delete Course</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className={`btn-google px-4 py-2 rounded-full text-xs font-medium cursor-pointer ${isDark
                    ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
                    : 'text-[#5F6368] hover:text-[#202124]'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editTitle.trim() || isSavingEdit}
                  className={`btn-google px-5 py-2 rounded-full font-medium text-xs cursor-pointer disabled:opacity-50 ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
