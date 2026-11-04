import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  PlayCircle,
  Sparkle,
  DotsThreeVertical,
  Archive,
  ArrowCounterClockwise,
  Trash,
  PencilSimple,
  LinkSimple,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { CourseModel } from '../types/chalk';

export const ClassroomHubPage: React.FC = () => {
  const {
    isDark,
    courses,
    liveRooms,
    currentUser,
    assignments,
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
  const isArchivedView = location.pathname.includes('/archived');

  const isLecturer = currentUser?.role === 'lecturer';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'primary' | 'live' | 'all'>('primary');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
  const [quickJoinInput, setQuickJoinInput] = useState('');
  const [quickJoinError, setQuickJoinError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
    return (
      course.lecturerId === currentUser.id ||
      course.lecturerName.toLowerCase().includes(currentUser.name.toLowerCase()) ||
      currentUser.name.toLowerCase().includes(course.lecturerName.toLowerCase()) ||
      Boolean(
        course.members?.some(
          (m) => m.id === currentUser.id && m.role === 'lecturer'
        )
      )
    );
  };

  // Check if current student is enrolled in this course
  const isStudentEnrolled = (course: CourseModel) => {
    if (!currentUser) return false;
    if (
      course.members?.some(
        (m) =>
          m.id === currentUser.id ||
          (m.matricOrStaffId &&
            m.matricOrStaffId === currentUser.matricOrStaffId)
      )
    ) {
      return true;
    }
    if (course.memberIds?.includes(currentUser.id)) {
      return true;
    }
    return false;
  };

  // Course collections partitioned by persona
  const myTeachingCourses = currentViewCourses.filter(isLecturerCourse);
  const myEnrolledCourses = currentViewCourses.filter(isStudentEnrolled);
  const liveCourses = currentViewCourses.filter(isCourseLive);

  // Stats for Lecturer
  const totalEnrolledStudents = myTeachingCourses.reduce(
    (sum, c) => sum + (c.enrolledCount || 0),
    0
  );
  const lecturerAssignmentsCount = assignments.filter((a) =>
    myTeachingCourses.some((c) => c.id === a.courseId)
  ).length;
  const liveTeachingCount = myTeachingCourses.filter(isCourseLive).length;

  // Stats for Student
  const studentPendingAssignments = assignments.filter(
    (a) =>
      myEnrolledCourses.some((c) => c.id === a.courseId) && !a.isSubmitted
  ).length;
  const liveEnrolledCount = myEnrolledCourses.filter(isCourseLive).length;

  // Active list based on active role filter
  const baseCourseList = isLecturer
    ? filterMode === 'primary'
      ? myTeachingCourses
      : filterMode === 'live'
        ? liveCourses
        : currentViewCourses
    : filterMode === 'primary'
      ? myEnrolledCourses
      : filterMode === 'live'
        ? liveCourses
        : currentViewCourses;

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
    if (window.confirm('Are you sure you want to delete this course permanently? This cannot be undone.')) {
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
    try {
      const course = await joinCourseByCode(joinCodeInput.trim());
      setShowJoinModal(false);
      setJoinCodeInput('');
      if (course) {
        navigate(`/hub/course/${course.id}`);
      }
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

  const handleDirectEnroll = async (code: string) => {
    setIsJoining(true);
    try {
      const course = await joinCourseByCode(code);
      if (course) {
        navigate(`/hub/course/${course.id}`);
      }
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
        scheduleTime: newSchedule.trim() || 'Mon & Wed • 10:00 AM WAT',
        department: currentUser?.department || 'Computer Science & Engineering',
      });
      setShowCreateModal(false);
      navigate(`/hub/course/${created.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  const firstLiveEnrolled = myEnrolledCourses.find(isCourseLive);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      {/* Role-Specific or Archived Hero Header */}
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
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700'
                  }`}
              >
                <Archive size={24} weight="duotone" />
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-medium">
                  Archived Classes
                </h1>
                <p
                  className={`text-xs sm:text-sm ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Archived classes are preserved as read-only. Instructors can restore them at any time to resume live sessions and grading.
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
              <span>Back to Active Classes</span>
            </Link>
          </div>
        </div>
      ) : isLecturer ? (
        /* Lecturer / Faculty Hero Banner */
        <div
          className={`rounded-3xl border p-6 sm:p-8 space-y-5 transition-all ${isDark
            ? 'bg-gradient-to-br from-[#141E19] via-[#121c17] to-[#0d1410] border-[#3C4043]'
            : 'bg-gradient-to-br from-[#ECFDF5]/80 via-white to-[#F0FDF4] border-[#A7F3D0]'
            }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight">
                Welcome back, {currentUser?.name || 'Professor'}
              </h1>
              <p
                className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Manage your lecture cohorts, distribute invite codes to students, and broadcast ultra-low bandwidth vector chalkboards running under 28 kbps.
              </p>
              <div
                className={`flex flex-wrap items-center gap-3 pt-1 text-xs font-mono ${isDark ? 'text-[#81C995]' : 'text-[#059669]'
                  }`}
              >
                <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                  Staff ID: {currentUser?.matricOrStaffId || 'STAFF/CS/2018'}
                </span>
                <span>•</span>
                <span>{currentUser?.department || 'Computer Science & Engineering'}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
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
                  const instantCode = `class-${Math.floor(100 + Math.random() * 900)}`;
                  setActiveRoomCode(instantCode);
                  navigate(`/studio/${instantCode}`);
                }}
                className={`btn-google px-4 py-3 rounded-full border text-xs font-medium inline-flex items-center gap-2 cursor-pointer ${isDark
                  ? 'border-[#3C4043] bg-[#0F1713] text-[#E3E3E3] hover:bg-[#28292A]'
                  : 'border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F8F9FA]'
                  }`}
              >
                <VideoCamera size={16} weight="regular" />
                <span>Launch Studio</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Student Learning Hero Banner */
        <div
          className={`rounded-3xl border p-6 sm:p-8 space-y-5 transition-all ${isDark
            ? 'bg-gradient-to-br from-[#141E19] via-[#101915] to-[#0A120E] border-[#3C4043]'
            : 'bg-gradient-to-br from-[#EFF6FF] via-white to-[#F0FDF4] border-[#BFDBFE]'
            }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-medium tracking-tight">
                Welcome back, {currentUser?.name || 'Student'}
              </h1>
              <p
                className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Stream live chalkboard lectures under 30 kbps Opus voice, replay past blackboard lessons offline, and submit your homework solutions.
              </p>
              <div
                className={`flex flex-wrap items-center gap-3 pt-1 text-xs font-mono ${isDark ? 'text-[#8AB4F8]' : 'text-[#1A73E8]'
                  }`}
              >
                <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5">
                  Matric No: {currentUser?.matricOrStaffId || 'CSC/2022/1042'}
                </span>
                <span>•</span>
                <span>{currentUser?.department || 'Computer Science & Engineering'}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowJoinModal(true)}
                className={`btn-google px-5 py-3 rounded-full text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-md transition-transform active:scale-95 ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                <Hash size={16} weight="bold" />
                <span>Join with Code</span>
              </button>

              <Link
                to="/study"
                className={`btn-google px-4 py-3 rounded-full border text-xs font-medium inline-flex items-center gap-2 ${isDark
                  ? 'border-[#3C4043] bg-[#0F1713] text-[#E3E3E3] hover:bg-[#28292A]'
                  : 'border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F8F9FA]'
                  }`}
              >
                <BookOpenText size={16} weight="regular" />
                <span>AI Study Notes</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Role-Specific KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLecturer ? (
          <>
            <div
              className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Courses Teaching
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
                className={`text-[11px] font-mono mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Active Teaching Cohorts
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Total Students
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
                className={`text-[11px] font-mono mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Enrolled across classes
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Live Classrooms
                </span>
                <Broadcast
                  size={20}
                  className={
                    liveTeachingCount > 0
                      ? 'text-[#69DB7C] animate-pulse'
                      : isDark
                        ? 'text-[#9AA0A6]'
                        : 'text-[#5F6368]'
                  }
                />
              </div>
              <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                {liveTeachingCount}
              </div>
              <p
                className={`text-[11px] font-mono mt-1 ${liveTeachingCount > 0
                  ? isDark
                    ? 'text-[#69DB7C]'
                    : 'text-[#059669]'
                  : isDark
                    ? 'text-[#9AA0A6]'
                    : 'text-[#5F6368]'
                  }`}
              >
                {liveTeachingCount > 0 ? 'Live in-progress' : 'Ready to broadcast'}
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Assignments Set
                </span>
                <FolderOpen
                  size={20}
                  className={isDark ? 'text-[#FDD663]' : 'text-[#D97706]'}
                />
              </div>
              <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                {lecturerAssignmentsCount}
              </div>
              <p
                className={`text-[11px] font-mono mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Coursework active
              </p>
            </div>
          </>
        ) : (
          <>
            <div
              className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
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
                  className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'}
                />
              </div>
              <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                {myEnrolledCourses.length}
              </div>
              <p
                className={`text-[11px] font-mono mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Joined this term
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
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
                    liveEnrolledCount > 0
                      ? 'text-[#69DB7C] animate-pulse'
                      : isDark
                        ? 'text-[#9AA0A6]'
                        : 'text-[#5F6368]'
                  }
                />
              </div>
              <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                {liveEnrolledCount}
              </div>
              <p
                className={`text-[11px] font-mono mt-1 ${liveEnrolledCount > 0
                  ? isDark
                    ? 'text-[#69DB7C]'
                    : 'text-[#059669]'
                  : isDark
                    ? 'text-[#9AA0A6]'
                    : 'text-[#5F6368]'
                  }`}
              >
                {liveEnrolledCount > 0 ? 'Live in-progress!' : 'No live streams now'}
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Assignments Due
                </span>
                <CheckCircle
                  size={20}
                  className={
                    studentPendingAssignments > 0
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
                {studentPendingAssignments}
              </div>
              <p
                className={`text-[11px] font-mono mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                {studentPendingAssignments > 0 ? 'Pending submission' : 'All caught up!'}
              </p>
            </div>

            <div
              className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  DVR Replays
                </span>
                <PlayCircle
                  size={20}
                  className={isDark ? 'text-[#8AB4F8]' : 'text-[#1A73E8]'}
                />
              </div>
              <div className="font-display text-2xl sm:text-3xl font-semibold mt-2">
                Vector DVR
              </div>
              <p
                className={`text-[11px] font-mono mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Offline-ready recordings
              </p>
            </div>
          </>
        )}
      </div>

      {/* Role-Specific Quick Action Widget */}
      {isLecturer ? (
        /* Lecturer Quick Code Sharing Bar */
        myTeachingCourses.length > 0 && (
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${isDark
              ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
              : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
              }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold flex items-center gap-1.5 text-[#059669] dark:text-[#69DB7C]">
                <Sparkle size={15} weight="fill" />
                <span>Distribute Course Join Codes to Students:</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {myTeachingCourses.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCopyCode(c.code)}
                  className={`px-3 py-1.5 rounded-xl border font-mono font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${copiedCode === c.code
                    ? 'bg-[#69DB7C]/20 border-[#69DB7C] text-[#69DB7C]'
                    : isDark
                      ? 'bg-[#0F1713] border-[#3C4043] hover:border-[#69DB7C]'
                      : 'bg-white border-[#DADCE0] hover:border-[#059669]'
                    }`}
                  title="Click to copy invite code for students"
                >
                  {copiedCode === c.code ? (
                    <>
                      <Check size={14} weight="bold" />
                      <span>{c.code} Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} weight="regular" />
                      <span>{c.code}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      ) : (
        /* Student Live Alert & Quick Join Bar */
        <div className="space-y-3">
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
                    {firstLiveEnrolled.code} is Live Right Now!
                  </span>
                  <p className="text-xs opacity-80">
                    {firstLiveEnrolled.lecturerName} is currently broadcasting on the chalkboard.
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

          {/* Student Fast Inline Join Bar */}
          <form
            onSubmit={handleQuickJoinSubmit}
            className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs ${isDark
              ? 'bg-[#141E19] border-[#3C4043]'
              : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <div className="flex items-center gap-2 px-2 text-muted shrink-0">
              <Hash size={16} className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'} />
              <span className="font-medium">Have a Course Code?</span>
            </div>

            <div className="flex-1 relative">
              <input
                type="text"
                value={quickJoinInput}
                onChange={(e) => setQuickJoinInput(e.target.value)}
                placeholder="Enter course code from your lecturer (e.g. MTH 112)..."
                className={`w-full px-3.5 py-1.5 rounded-xl border font-mono text-xs focus:outline-none ${isDark
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
              className={`btn-google px-4 py-2 rounded-full font-medium text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
            >
              <span>Enroll in Class</span>
            </button>
          </form>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
                ? 'Search your courses by code, title, or department...'
                : 'Search enrolled courses, lecturers, or subject...'
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
              ? `My Courses (${myTeachingCourses.length})`
              : `Enrolled Classes (${myEnrolledCourses.length})`}
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
            <span>Live Sessions ({liveCourses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`btn-google px-4 py-2 rounded-full text-xs font-medium border cursor-pointer whitespace-nowrap ${filterMode === 'all'
              ? isDark
                ? 'bg-[#69DB7C]/15 border-[#69DB7C]/30 text-[#69DB7C]'
                : 'bg-[#ECFDF5] border-[#059669]/20 text-[#059669]'
              : isDark
                ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
              }`}
          >
            {isLecturer
              ? `All Campus Courses (${courses.length})`
              : `Campus Catalog (${courses.length})`}
          </button>
        </div>
      </div>

      {/* Courses Grid or Role Empty States */}
      {filteredCourses.length === 0 ? (
        filterMode === 'live' ? (
          /* Empty Live Sessions */
          <div
            className={`p-10 sm:p-14 rounded-3xl border text-center space-y-4 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <div className="w-14 h-14 mx-auto rounded-full bg-[#69DB7C]/15 border border-[#69DB7C]/30 flex items-center justify-center text-[#69DB7C]">
              <Broadcast size={28} weight="regular" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg sm:text-xl font-medium">
                No Live Studios Right Now
              </h2>
              <p
                className={`text-xs sm:text-sm max-w-md mx-auto ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                {isLecturer
                  ? 'None of your courses currently have an active live meeting streaming. You can launch an instant session anytime.'
                  : 'None of your enrolled classes currently have an active live stream. You can view course materials or study notes.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {isLecturer ? (
                <button
                  type="button"
                  onClick={() => {
                    const code = `lecture-${Math.floor(100 + Math.random() * 900)}`;
                    setActiveRoomCode(code);
                    navigate(`/studio/${code}`);
                  }}
                  className={`btn-google px-5 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-2 cursor-pointer ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <VideoCamera size={16} weight="bold" />
                  <span>Start Instant Lecture</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setFilterMode('primary')}
                  className={`btn-google px-5 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-2 cursor-pointer ${isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                    }`}
                >
                  <GraduationCap size={16} weight="bold" />
                  <span>View Enrolled Classes</span>
                </button>
              )}
            </div>
          </div>
        ) : isLecturer && filterMode === 'primary' ? (
          /* Empty Lecturer Courses */
          <div
            className={`p-10 sm:p-14 rounded-3xl border text-center space-y-4 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#69DB7C]/15 border border-[#69DB7C]/30 flex items-center justify-center text-[#69DB7C]">
              <ChalkboardTeacher size={32} weight="regular" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg sm:text-xl font-medium">
                No Courses Created Yet
              </h2>
              <p
                className={`text-xs sm:text-sm max-w-md mx-auto ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                You haven't set up any course cohorts yet. Create your first syllabus to distribute join codes to students and broadcast ultra-low bandwidth vector chalkboards.
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
        ) : !isLecturer && filterMode === 'primary' ? (
          /* Empty Student Courses */
          <div
            className={`p-10 sm:p-14 rounded-3xl border text-center space-y-5 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1A73E8]/15 border border-[#1A73E8]/30 flex items-center justify-center text-[#1A73E8] dark:text-[#8AB4F8]">
              <GraduationCap size={32} weight="regular" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg sm:text-xl font-medium">
                No Enrolled Classes Yet
              </h2>
              <p
                className={`text-xs sm:text-sm max-w-md mx-auto ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                You haven't joined any classes yet. Enter a course code shared by your lecturer (e.g.{' '}
                <code className="font-mono text-[#059669]">MTH 112</code>) or enroll in available campus courses.
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
                <span>Join with Course Code</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`btn-google px-5 py-2.5 rounded-full border text-xs font-medium cursor-pointer ${isDark
                  ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                  : 'border-[#DADCE0] text-[#202124] hover:bg-white'
                  }`}
              >
                <span>Browse Campus Catalog ({courses.length})</span>
              </button>
            </div>
          </div>
        ) : (
          /* General No Matches Found */
          <div
            className={`p-10 rounded-3xl border text-center space-y-3 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <p className="font-display text-base font-medium">
              No matching courses found
            </p>
            <p
              className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}
            >
              Try clearing your search query or reset your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterMode('primary');
              }}
              className={`btn-google px-4 py-2 rounded-full text-xs font-medium cursor-pointer ${isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
            >
              Reset Filters
            </button>
          </div>
        )
      ) : (
        /* Render Role-Differentiated Course Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCourses.map((course) => {
            const courseLive = isCourseLive(course);
            const userTeaches = isLecturerCourse(course);
            const studentEnrolled = isStudentEnrolled(course);

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
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-sm font-semibold ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                            }`}
                        >
                          {course.code}
                        </span>

                        {/* Role Indicator Pill on the Card */}
                        {userTeaches ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase ${isDark
                              ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                              : 'bg-[#ECFDF5] text-[#059669]'
                              }`}
                          >
                            <ChalkboardTeacher size={12} weight="bold" />
                            <span>Instructor (You)</span>
                          </span>
                        ) : studentEnrolled ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase ${isDark
                              ? 'bg-[#1A73E8]/20 text-[#8AB4F8]'
                              : 'bg-[#EFF6FF] text-[#1A73E8]'
                              }`}
                          >
                            <GraduationCap size={12} weight="bold" />
                            <span>Enrolled</span>
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase ${isDark
                              ? 'bg-white/5 text-[#9AA0A6]'
                              : 'bg-black/5 text-[#5F6368]'
                              }`}
                          >
                            <span>Campus Catalog</span>
                          </span>
                        )}

                        {courseLive && (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase ${isDark
                              ? 'bg-[#EA4335]/15 text-[#F28B82]'
                              : 'bg-[#FCE8E6] text-[#C5221F]'
                              }`}
                          >
                            <Broadcast size={12} weight="fill" className="animate-pulse" />
                            <span>LIVE</span>
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
                        {userTeaches ? 'Taught by you' : `Lecturer: ${course.lecturerName}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full font-mono text-xs font-medium inline-flex items-center gap-1.5 shrink-0 border ${isDark
                          ? 'bg-[#141E19] border-[#3C4043] text-[#9AA0A6]'
                          : 'bg-white border-[#DADCE0] text-[#5F6368]'
                          }`}
                        title={`${course.enrolledCount} students in class`}
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
                            setOpenMenuCourseId(openMenuCourseId === course.id ? null : course.id);
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
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock size={15} weight="regular" />
                      <span>{course.scheduleTime}</span>
                    </div>

                    {/* Invite Code Box for Lecturer */}
                    {isLecturer && (
                      <div className="flex items-center gap-1.5">
                        <span>Code:</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(course.code)}
                          className={`px-2 py-0.5 rounded-md font-mono text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors ${copiedCode === course.code
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

                  {/* Actions Tailored to Role & Enrollment */}
                  <div className="flex flex-wrap items-center gap-3">
                    {course.isArchived ? (
                      <>
                        {userTeaches ? (
                          <>
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
                            <Link
                              to={`/hub/course/${course.id}`}
                              className={`btn-google flex-1 py-2.5 px-4 rounded-full border font-medium text-xs inline-flex items-center justify-center gap-1.5 ${isDark
                                ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                                : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                                }`}
                            >
                              <span>View Coursework</span>
                              <ArrowRight size={14} weight="regular" />
                            </Link>
                          </>
                        ) : (
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
                        )}
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
                          <span>{courseLive ? 'Join Live Stream' : 'Host Live Lecture'}</span>
                        </button>

                        <Link
                          to={`/hub/course/${course.id}`}
                          className={`btn-google flex-1 py-2.5 px-4 rounded-full border font-medium text-xs inline-flex items-center justify-center gap-1.5 ${isDark
                            ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                            : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                            }`}
                        >
                          <span>Manage Course</span>
                          <ArrowRight size={14} weight="regular" />
                        </Link>
                      </>
                    ) : (
                      /* Student Actions */
                      <>
                        {studentEnrolled ? (
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
                        ) : (
                          /* Not Enrolled: Browse Mode */
                          <>
                            <button
                              type="button"
                              onClick={() => handleDirectEnroll(course.code)}
                              className={`btn-google flex-1 py-2.5 px-4 rounded-full font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer ${isDark
                                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                                : 'bg-[#059669] text-white hover:bg-[#047857]'
                                }`}
                            >
                              <Plus size={15} weight="bold" />
                              <span>Enroll in Class</span>
                            </button>

                            <Link
                              to={`/hub/course/${course.id}`}
                              className={`btn-google flex-1 py-2.5 px-4 rounded-full border font-medium text-xs inline-flex items-center justify-center gap-1.5 ${isDark
                                ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                                : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                                }`}
                            >
                              <span>Preview</span>
                              <ArrowRight size={14} weight="regular" />
                            </Link>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join Course Modal */}
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
                <Hash size={20} className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'} />
                <span>Join Class with Code</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="btn-google p-1.5 rounded-full opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X size={18} weight="regular" />
              </button>
            </div>
            <p
              className={`text-xs leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
            >
              Enter the course code shared by your lecturer (for example:{' '}
              <code className="font-mono text-[#059669] dark:text-[#69DB7C]">MTH 112</code> or{' '}
              <code className="font-mono text-[#059669] dark:text-[#69DB7C]">PHY 202</code>).
            </p>
            <div>
              <label
                htmlFor="join-code-input"
                className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Course or Room Code
              </label>
              <input
                id="join-code-input"
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                placeholder="e.g. MTH 112"
                className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm focus:outline-none ${isDark
                  ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                  : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                  }`}
              />
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

      {/* Create Course Modal (Only for Lecturer) */}
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
                <ChalkboardTeacher size={20} className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'} />
                <span>Create New Campus Course</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-google p-1.5 rounded-full opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X size={18} weight="regular" />
              </button>
            </div>

            <p
              className={`text-xs leading-relaxed ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
            >
              Create a lecture cohort. Students can join using the course code to attend live vector chalkboard classes under 28 kbps.
            </p>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="new-course-code"
                  className={`block text-xs font-medium mb-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  Course Code (e.g. CSC 401)
                </label>
                <input
                  id="new-course-code"
                  type="text"
                  placeholder="e.g. CSC 401"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border font-mono text-sm focus:outline-none ${isDark
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
                  placeholder="e.g. Graph Theory & Network Optimization"
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
                  placeholder="e.g. Mon & Wed • 9:00 AM WAT"
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
                Create & Launch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Course Modal (Google Classroom Details Edit) */}
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
                <PencilSimple size={20} className={isDark ? 'text-[#69DB7C]' : 'text-[#059669]'} />
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
                  placeholder="e.g. Cohort A"
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
                  placeholder="e.g. Discrete Mathematics"
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
                  placeholder="e.g. Room 204 or Online"
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
                  placeholder="e.g. Mon & Wed • 9:00 AM WAT"
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
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
                onClick={() => setEditingCourse(null)}
                className={`btn-google px-4 py-2 rounded-full text-xs font-medium cursor-pointer ${isDark ? 'text-[#9AA0A6] hover:text-[#E3E3E3]' : 'text-[#5F6368] hover:text-[#202124]'
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
          </form>
        </div>
      )}
    </div>
  );
};
