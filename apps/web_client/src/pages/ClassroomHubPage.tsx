import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

export const ClassroomHubPage: React.FC = () => {
  const {
    isDark,
    courses,
    liveRooms,
    currentUser,
    joinCourseByCode,
    createCourse,
    setActiveRoomCode,
  } = useApp();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'live'>('all');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSchedule, setNewSchedule] = useState('');

  const isCourseLive = (course: (typeof courses)[0]) => {
    return liveRooms.some(
      (r) =>
        r.id.toLowerCase() === course.liveRoomCode.toLowerCase() ||
        (r.courseId && r.courseId.toLowerCase() === course.id.toLowerCase()) ||
        r.courseCode.toLowerCase() === course.code.toLowerCase()
    );
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.lecturerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterMode === 'all' || isCourseLive(course);
    return matchesSearch && matchesFilter;
  });

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

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newTitle.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const created = await createCourse({
        code: newCode.trim(),
        title: newTitle.trim(),
        scheduleTime: newSchedule.trim(),
        department: currentUser?.department || 'Computer Science & Engineering',
      });
      setShowCreateModal(false);
      navigate(`/hub/course/${created.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
            My Enrolled Classes
          </h1>
          <p
            className={`text-sm mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
              }`}
          >
            All courses stream in low-data vector mode so you never miss a lecture on weak campus WiFi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowJoinModal(true)}
            className={`btn-google px-4 py-2.5 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${isDark
              ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
              : 'bg-white border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
              }`}
          >
            <Hash size={15} weight="regular" />
            <span>Join with Code</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className={`btn-google px-4 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${isDark
              ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
              : 'bg-[#059669] text-white hover:bg-[#047857]'
              }`}
          >
            <Plus size={15} weight="regular" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

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
            placeholder="Search by course code, title, or lecturer..."
            aria-label="Search enrolled courses"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none ${isDark
              ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
              : 'bg-white border-[#DADCE0] text-[#202124] focus:border-[#059669]'
              }`}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`btn-google px-4 py-2 rounded-full text-xs font-medium border cursor-pointer ${filterMode === 'all'
              ? isDark
                ? 'bg-[#69DB7C]/15 border-[#69DB7C]/30 text-[#69DB7C]'
                : 'bg-[#ECFDF5] border-[#059669]/20 text-[#059669]'
              : isDark
                ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
              }`}
          >
            All Courses ({courses.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('live')}
            className={`btn-google px-4 py-2 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 cursor-pointer ${filterMode === 'live'
              ? isDark
                ? 'bg-[#69DB7C]/15 border-[#69DB7C]/30 text-[#69DB7C]'
                : 'bg-[#ECFDF5] border-[#059669]/20 text-[#059669]'
              : isDark
                ? 'border-[#3C4043] text-[#9AA0A6] hover:text-[#E3E3E3]'
                : 'border-[#DADCE0] text-[#5F6368] hover:text-[#202124]'
              }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#69DB7C]" />
            <span>Live Sessions ({courses.filter(isCourseLive).length})</span>
          </button>
        </div>
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div
          className={`p-10 sm:p-14 rounded-3xl border text-center space-y-4 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
            }`}
        >
          <div className="space-y-1">
            <h2 className="font-display text-lg sm:text-xl font-medium">
              No Enrolled Classes Yet
            </h2>
            <p
              className={`text-xs sm:text-sm max-w-md mx-auto ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
            >
              You haven't joined or created any courses yet. Join a class with a code or create your own to begin teaching.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className={`btn-google flex gap-2 px-6 py-2.5 rounded-full border text-xs font-medium cursor-pointer ${isDark
                ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                : 'border-[#DADCE0] text-[#202124] hover:bg-white'
                }`}
            >
              <Hash size={16} weight="regular" />
              <span>Join with Code</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className={`btn-google px-5 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-2 cursor-pointer ${isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
            >
              <Plus size={16} weight="bold" />
              <span>Create a Class</span>
            </button>
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
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
                No Live Meetings Right Now
              </h2>
              <p
                className={`text-xs sm:text-sm max-w-md mx-auto ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                None of your enrolled courses currently have an active live meeting. You can start a new instant meeting or view all enrolled classes.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/meet')}
                className={`btn-google px-5 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-2 cursor-pointer ${isDark
                  ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
              >
                <VideoCamera size={16} weight="regular" />
                <span>Start Instant Meeting</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`btn-google px-4 py-2.5 rounded-full border text-xs font-medium cursor-pointer ${isDark
                  ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                  : 'border-[#DADCE0] text-[#202124] hover:bg-white'
                  }`}
              >
                View All Courses ({courses.length})
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`p-10 rounded-3xl border text-center space-y-3 ${isDark
              ? 'bg-[#141E19] border-[#3C4043]'
              : 'bg-[#F8F9FA] border-[#DADCE0]'
              }`}
          >
            <p className="font-display text-base font-medium">
              No matching courses found
            </p>
            <p
              className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
            >
              Try clearing your search filter or join a class using a room code.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterMode('all');
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className={`hover-lift rounded-3xl border overflow-hidden flex flex-col justify-between ${isDark
                ? 'bg-[#141E19] border-[#3C4043]'
                : 'bg-white border-[#DADCE0]'
                }`}
            >
              {/* Top Course Header Banner */}
              <div
                className={`p-6 border-b ${isDark
                  ? 'bg-[#0F1713]/60 border-[#3C4043]'
                  : 'bg-[#F8F9FA] border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`font-mono text-sm font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                          }`}
                      >
                        {course.code}
                      </span>
                      {isCourseLive(course) && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-medium ${isDark
                            ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                            : 'bg-[#ECFDF5] text-[#059669]'
                            }`}
                        >
                          <Broadcast size={12} weight="fill" className="animate-pulse" />
                          <span>LIVE MEET</span>
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-lg font-medium mt-1.5 leading-snug">
                      {course.title}
                    </h2>
                    <p
                      className={`text-xs mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                    >
                      {course.lecturerName}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full font-mono text-xs font-medium inline-flex items-center gap-1.5 shrink-0 border ${isDark
                      ? 'bg-[#141E19] border-[#3C4043] text-[#9AA0A6]'
                      : 'bg-white border-[#DADCE0] text-[#5F6368]'
                      }`}
                  >
                    <Users size={14} weight="regular" />
                    <span>{course.enrolledCount}</span>
                  </span>
                </div>
              </div>

              {/* Card Body & Navigation Footer */}
              <div className="p-6 space-y-5">
                <div
                  className={`flex items-center gap-2 text-xs font-mono ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                    }`}
                >
                  <Clock size={15} weight="regular" />
                  <span>{course.scheduleTime}</span>
                </div>

                <div className="flex items-center gap-3">
                  {isCourseLive(course) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRoomCode(course.liveRoomCode);
                        navigate(`/meet/${course.liveRoomCode}`);
                      }}
                      className={`btn-google flex-1 py-2.5 px-4 rounded-full font-medium text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer ${isDark
                        ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                        : 'bg-[#059669] text-white hover:bg-[#047857]'
                        }`}
                    >
                      <VideoCamera size={16} weight="regular" />
                      <span>Join Live Call</span>
                    </button>
                  )}

                  <Link
                    to={`/hub/course/${course.id}`}
                    className={`btn-google flex-1 py-2.5 px-4 rounded-full border font-medium text-xs inline-flex items-center justify-center gap-1.5 ${isDark
                      ? 'border-[#3C4043] text-[#E3E3E3] hover:bg-[#28292A]'
                      : 'border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]'
                      }`}
                  >
                    <span>Open Course</span>
                    <ArrowRight size={14} weight="regular" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
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
              <h2 className="font-display text-lg font-medium">
                Join Class with Code
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
              <code className="font-mono text-[#059669]">MTH 112</code> or{' '}
              <code className="font-mono text-[#059669]">PHY202</code>).
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
                placeholder="e.g. PHY 202"
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
                className={`btn-google px-5 py-2 rounded-full font-medium text-xs cursor-pointer ${isDark
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

      {/* Create Course Modal */}
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
              <h2 className="font-display text-lg font-medium">
                Create New Campus Course
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-google p-1.5 rounded-full opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X size={18} weight="regular" />
              </button>
            </div>

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
                  placeholder="e.g. CSC 412"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border font-mono text-sm ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
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
                  placeholder="e.g. Compiler Construction & Optimization"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
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
                  placeholder="e.g. Wed & Fri • 1:00 PM WAT"
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm ${isDark
                    ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3]'
                    : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
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
                className={`btn-google px-5 py-2 rounded-full font-medium text-xs cursor-pointer ${isDark
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
    </div>
  );
};
