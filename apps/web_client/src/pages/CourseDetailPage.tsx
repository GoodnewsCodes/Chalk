import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  VideoCamera,
  Megaphone,
  FolderOpen,
  Users,
  PlayCircle,
  CheckCircle,
  PaperPlaneTilt,
  BookOpenText,
  UploadSimple,
  Plus,
  Copy,
  Check,
  X,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { getCurrentFirebaseIdToken } from '../lib/firebase';
import { DvrReplayItem } from '../types/chalk';

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const {
    isDark,
    courses,
    liveRooms,
    currentUser,
    announcements,
    assignments,
    addAnnouncement,
    submitAssignment,
    createAssignment,
    setActiveRoomCode,
  } = useApp();
  const navigate = useNavigate();

  const course = courses.find((c) => c.id === courseId);
  const isCourseLive = course
    ? liveRooms.some(
        (r) =>
          r.id.toLowerCase() === course.liveRoomCode.toLowerCase() ||
          r.courseId === course.id ||
          r.courseCode.toLowerCase() === course.code.toLowerCase()
      )
    : false;
  const activeRoom = course
    ? liveRooms.find(
        (r) =>
          r.id.toLowerCase() === course.liveRoomCode.toLowerCase() ||
          r.courseId === course.id ||
          r.courseCode.toLowerCase() === course.code.toLowerCase()
      )
    : undefined;
  const [activeTab, setActiveTab] = useState<'stream' | 'classwork' | 'people'>('stream');
  const [postInput, setPostInput] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submissionNote, setSubmissionNote] = useState('');
  const [serverReplays, setServerReplays] = useState<DvrReplayItem[]>([]);
  const [showCreateAsgModal, setShowCreateAsgModal] = useState(false);
  const [newAsgTitle, setNewAsgTitle] = useState('');
  const [newAsgDesc, setNewAsgDesc] = useState('');
  const [newAsgDue, setNewAsgDue] = useState('');
  const [newAsgPoints, setNewAsgPoints] = useState('100 points');
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch real replays for this course from backend
  useEffect(() => {
    let active = true;
    if (!course) return;
    const fetchReplays = async () => {
      try {
        const token = await getCurrentFirebaseIdToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        } else if (currentUser?.id) {
          headers.Authorization = `Bearer mock_firebase_token_${currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
        }
        const res = await fetch('http://localhost:4000/api/replays', { headers });
        if (res.ok) {
          const json = await res.json();
          if (active && Array.isArray(json.replays)) {
            const matched = json.replays.filter(
              (r: any) =>
                r.courseId === course.id ||
                r.courseCode?.toLowerCase() === course.code.toLowerCase() ||
                r.roomId?.toLowerCase() === course.liveRoomCode.toLowerCase()
            );
            setServerReplays(matched);
          }
        }
      } catch {
        // ignore
      }
    };
    fetchReplays();
    return () => {
      active = false;
    };
  }, [course?.id, course?.code, course?.liveRoomCode, currentUser?.id]);

  const courseAnnouncements = course
    ? announcements.filter((a) => a.courseId === course.id)
    : [];
  const courseAssignments = course
    ? assignments.filter((a) => a.courseId === course.id)
    : [];

  const lecturerInitials =
    course?.lecturerName
      ?.split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'L';

  const courseMembers =
    course?.members && course.members.length > 0
      ? course.members
      : currentUser
      ? [
          {
            id: currentUser.id,
            name: `${currentUser.name} (You)`,
            avatarTag: currentUser.avatarTag,
            role: currentUser.role,
            matricOrStaffId: currentUser.matricOrStaffId,
          },
        ]
      : [];

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || !postInput.trim()) return;
    addAnnouncement(course.id, postInput.trim());
    setPostInput('');
  };

  const handleConfirmSubmission = (asgId: string) => {
    submitAssignment(asgId, submissionNote.trim() || 'Submitted solution archive.');
    setSubmittingId(null);
    setSubmissionNote('');
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || !newAsgTitle.trim() || !newAsgDesc.trim()) return;
    await createAssignment({
      courseId: course.id,
      title: newAsgTitle.trim(),
      description: newAsgDesc.trim(),
      dueDate: newAsgDue.trim() || 'No due date',
      points: newAsgPoints.trim() || '100 points',
    });
    setNewAsgTitle('');
    setNewAsgDesc('');
    setShowCreateAsgModal(false);
  };

  const handleCopyCode = () => {
    if (!course) return;
    navigator.clipboard.writeText(course.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!course) {
    return (
      <div className="p-8 sm:p-16 max-w-2xl mx-auto text-center space-y-4 min-h-[50vh] flex flex-col items-center justify-center">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
            isDark
              ? 'bg-[#141E19] border-[#3C4043] text-[#9AA0A6]'
              : 'bg-white border-[#DADCE0] text-[#5F6368]'
          }`}
        >
          <FolderOpen size={32} weight="regular" />
        </div>
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight">Course not found</h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
            This course does not exist or has not been created yet.
          </p>
        </div>
        <Link
          to="/hub"
          className={`btn-google px-5 py-2.5 rounded-full font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer ${
            isDark
              ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
              : 'bg-[#059669] text-white hover:bg-[#047857]'
          }`}
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Return to Classroom Hub</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Top Back Link */}
      <div className="flex items-center justify-between">
        <Link
          to="/hub"
          className={`btn-google inline-flex items-center gap-2 text-xs font-medium ${isDark
            ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
            : 'text-[#5F6368] hover:text-[#202124]'
            }`}
        >
          <ArrowLeft size={16} weight="regular" />
          <span>Back to All Enrolled Courses</span>
        </Link>

        <span
          className={`font-mono text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
            }`}
        >
          Room Code: <strong className={isDark ? 'text-[#E3E3E3]' : 'text-[#202124]'}>{course.liveRoomCode}</strong>
        </span>
      </div>

      {/* Course Hero Banner */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 ${isDark
          ? 'bg-[#141E19] border-[#3C4043]'
          : 'bg-[#F8F9FA] border-[#DADCE0]'
          }`}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span
              className={`px-3 py-1 rounded-full font-mono text-xs font-medium ${isDark
                ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                : 'bg-[#ECFDF5] text-[#059669]'
                }`}
            >
              {course.code}
            </span>
            <span
              className={`text-xs font-mono ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                }`}
            >
              {course.department}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
            {course.title}
          </h1>
          <p
            className={`text-sm ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
              }`}
          >
            Lecturer: <strong className={isDark ? 'text-[#E3E3E3]' : 'text-[#202124]'}>{course.lecturerName}</strong> • {course.enrolledCount} Classmates Enrolled
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveRoomCode(course.liveRoomCode);
              navigate(`/meet/${course.liveRoomCode}`);
            }}
            className={`btn-google px-5 py-3 rounded-full font-medium text-sm inline-flex items-center justify-center gap-2 cursor-pointer ${isDark
              ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
              : 'bg-[#059669] text-white hover:bg-[#047857]'
              }`}
          >
            <VideoCamera size={18} weight={isCourseLive ? "fill" : "regular"} />
            <span>
              {isCourseLive
                ? `Join Live Call (${activeRoom?.participantCount || 1})`
                : 'Start / Join Class Meeting'}
            </span>
          </button>

          <Link
            to="/study"
            className={`btn-google px-5 py-3 rounded-full border font-medium text-sm inline-flex items-center justify-center gap-2 ${isDark
              ? 'border-[#3C4043] bg-[#0F1713] text-[#E3E3E3] hover:bg-[#28292A]'
              : 'border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F1F3F4]'
              }`}
          >
            <BookOpenText size={18} weight="regular" />
            <span>AI Study Notes</span>
          </Link>
        </div>
      </div>

      {/* Course Navigation Tabs */}
      <div
        className={`flex items-center gap-2 border-b pb-3 ${isDark ? 'border-[#3C4043]' : 'border-[#DADCE0]'
          }`}
      >
        <button
          type="button"
          onClick={() => setActiveTab('stream')}
          className={`btn-google px-4 py-2 rounded-full text-xs sm:text-sm font-medium inline-flex items-center gap-2 cursor-pointer ${activeTab === 'stream'
            ? isDark
              ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
              : 'bg-[#ECFDF5] text-[#059669]'
            : isDark
              ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
              : 'text-[#5F6368] hover:text-[#202124]'
            }`}
        >
          <Megaphone size={17} weight="regular" />
          <span>Notice Board ({courseAnnouncements.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('classwork')}
          className={`btn-google px-4 py-2 rounded-full text-xs sm:text-sm font-medium inline-flex items-center gap-2 cursor-pointer ${activeTab === 'classwork'
            ? isDark
              ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
              : 'bg-[#ECFDF5] text-[#059669]'
            : isDark
              ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
              : 'text-[#5F6368] hover:text-[#202124]'
            }`}
        >
          <FolderOpen size={17} weight="regular" />
          <span>Replays & Classwork</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('people')}
          className={`btn-google px-4 py-2 rounded-full text-xs sm:text-sm font-medium inline-flex items-center gap-2 cursor-pointer ${activeTab === 'people'
            ? isDark
              ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
              : 'bg-[#ECFDF5] text-[#059669]'
            : isDark
              ? 'text-[#9AA0A6] hover:text-[#E3E3E3]'
              : 'text-[#5F6368] hover:text-[#202124]'
            }`}
        >
          <Users size={17} weight="regular" />
          <span>People ({course.enrolledCount})</span>
        </button>
      </div>

      {/* Tab 1: Notice Board (Stream) */}
      {activeTab === 'stream' && (
        <div className="space-y-4">
          <form
            onSubmit={handlePostAnnouncement}
            className={`p-3.5 rounded-3xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${isDark
              ? 'bg-[#141E19] border-[#3C4043]'
              : 'bg-white border-[#DADCE0]'
              }`}
          >
            <input
              type="text"
              value={postInput}
              onChange={(e) => setPostInput(e.target.value)}
              placeholder={`Post a question or network update to ${course.code}...`}
              aria-label="Post announcement to course stream"
              className="flex-1 bg-transparent text-sm px-3 py-1.5 focus:outline-none"
            />
            <button
              type="submit"
              className={`btn-google px-4 py-2 rounded-full text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer ${isDark
                ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
            >
              <PaperPlaneTilt size={15} weight="regular" />
              <span>Post to Stream</span>
            </button>
          </form>

          {courseAnnouncements.length === 0 ? (
            <div
              className={`p-8 rounded-3xl border text-center text-xs space-y-1 ${
                isDark
                  ? 'bg-[#141E19] border-[#3C4043] text-[#9AA0A6]'
                  : 'bg-white border-[#DADCE0] text-[#5F6368]'
              }`}
            >
              <p className="font-medium text-sm">No announcements posted yet</p>
              <p>Share an update, schedule note, or question with the class above.</p>
            </div>
          ) : (
            courseAnnouncements.map((ann) => (
              <div
                key={ann.id}
                className={`p-6 rounded-3xl border space-y-3 ${ann.isLiveNotice
                  ? isDark
                    ? 'bg-[#69DB7C]/10 border-[#69DB7C]/40'
                    : 'bg-[#ECFDF5]/60 border-[#059669]/30'
                  : isDark
                    ? 'bg-[#141E19] border-[#3C4043]'
                    : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full font-mono text-xs font-medium flex items-center justify-center ${isDark
                        ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                        : 'bg-[#ECFDF5] text-[#059669]'
                        }`}
                    >
                      {ann.authorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{ann.authorName}</div>
                      <div
                        className={`text-[11px] font-mono ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                          }`}
                      >
                        {ann.timestamp}
                      </div>
                    </div>
                  </div>

                  {ann.isLiveNotice && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRoomCode(course.liveRoomCode);
                        navigate(`/meet/${course.liveRoomCode}`);
                      }}
                      className={`btn-google px-3.5 py-1.5 rounded-full font-mono text-[11px] font-medium cursor-pointer ${isDark
                        ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                        : 'bg-[#059669] text-white hover:bg-[#047857]'
                        }`}
                    >
                      JOIN LIVE ROOM
                    </button>
                  )}
                </div>

                <p
                  className={`text-sm leading-relaxed ${isDark ? 'text-[#E3E3E3]' : 'text-[#202124]'
                    }`}
                >
                  {ann.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Replays & Classwork */}
      {activeTab === 'classwork' && (
        <div className="space-y-8">
          {/* Vector DVR Replays Section */}
          <div className="space-y-3">
            <h2 className="font-display text-lg font-medium">
              Recorded Vector DVR Lectures (Tiny Offline Bundles)
            </h2>
            {serverReplays.length === 0 ? (
              <div
                className={`p-8 rounded-3xl border text-center text-xs ${
                  isDark
                    ? 'bg-[#141E19] border-[#3C4043] text-[#9AA0A6]'
                    : 'bg-white border-[#DADCE0] text-[#5F6368]'
                }`}
              >
                No sessions recorded yet for {course.code}. Live lecture recordings are archived automatically into low-data DVR packages when rooms conclude.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {serverReplays.map((rep) => (
                  <div
                    key={rep.id}
                    className={`p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isDark
                        ? 'bg-[#141E19] border-[#3C4043]'
                        : 'bg-white border-[#DADCE0]'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium ${
                            isDark
                              ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                              : 'bg-[#ECFDF5] text-[#059669]'
                          }`}
                        >
                          {rep.eventsSizeKb ? `${rep.eventsSizeKb} KB DVR` : 'Vector DVR'}
                        </span>
                        <span
                          className={`text-xs font-mono ${
                            isDark ? 'text-[#81C995]' : 'text-[#188038]'
                          }`}
                        >
                          {rep.strokeCount ?? 0} strokes • {rep.participantCount ?? 1} attendees
                        </span>
                      </div>
                      <h3 className="font-display text-base font-medium">{rep.title}</h3>
                      <p
                        className={`text-xs ${
                          isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                      >
                        Recorded {new Date(rep.recordedAt).toLocaleDateString()} •{' '}
                        {rep.chapters?.length || 1} Smart Chapters
                      </p>
                    </div>

                    <Link
                      to={`/replays/${rep.id}`}
                      className={`btn-google px-4 py-2.5 rounded-full font-medium text-xs inline-flex items-center justify-center gap-1.5 shrink-0 ${
                        isDark
                          ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                          : 'bg-[#059669] text-white hover:bg-[#047857]'
                      }`}
                    >
                      <PlayCircle size={17} weight="regular" />
                      <span>Play Lesson Replay</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignments & Labs Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-medium">
                  Coursework & Lab Assignments
                </h2>
                <p className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                  Submit your work, lab reports, and repository links
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateAsgModal(true)}
                className={`btn-google px-4 py-2 rounded-full font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto ${
                  isDark
                    ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                    : 'bg-[#059669] text-white hover:bg-[#047857]'
                }`}
              >
                <Plus size={15} weight="bold" />
                <span>Create Assignment</span>
              </button>
            </div>
            {courseAssignments.length === 0 ? (
              <div
                className={`p-8 rounded-3xl border text-center text-xs space-y-1 ${
                  isDark
                    ? 'bg-[#141E19] border-[#3C4043] text-[#9AA0A6]'
                    : 'bg-white border-[#DADCE0] text-[#5F6368]'
                }`}
              >
                <p className="font-medium text-sm">No coursework or assignments posted yet</p>
                <p>New assignments, problem sets, and lab tasks will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseAssignments.map((asg) => (
                  <div
                    key={asg.id}
                    className={`p-6 rounded-3xl border space-y-3 ${isDark
                      ? 'bg-[#141E19] border-[#3C4043]'
                      : 'bg-white border-[#DADCE0]'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-base font-medium">
                            {asg.title}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] border ${isDark
                              ? 'border-[#3C4043] text-[#9AA0A6]'
                              : 'border-[#DADCE0] text-[#5F6368]'
                              }`}
                          >
                            {asg.points}
                          </span>
                        </div>
                        <p
                          className={`text-xs font-mono mt-0.5 ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                            }`}
                        >
                          {asg.dueDate}
                        </p>
                      </div>

                      {asg.isSubmitted ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isDark
                            ? 'bg-[#81C995]/15 text-[#81C995]'
                            : 'bg-[#E6F4EA] text-[#188038]'
                            }`}
                        >
                          <CheckCircle size={16} weight="fill" />
                          <span>Submitted</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSubmittingId(asg.id)}
                          className={`btn-google px-4 py-2 rounded-full font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer ${isDark
                            ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                            : 'bg-[#059669] text-white hover:bg-[#047857]'
                            }`}
                        >
                          <UploadSimple size={15} weight="regular" />
                          <span>Submit Work</span>
                        </button>
                      )}
                    </div>

                    <p
                      className={`text-sm ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                        }`}
                    >
                      {asg.description}
                    </p>

                    {asg.submissionNote && (
                      <div
                        className={`text-xs font-mono px-3.5 py-2 rounded-xl border ${isDark
                          ? 'bg-[#0F1713] border-[#3C4043] text-[#81C995]'
                          : 'bg-[#F8F9FA] border-[#DADCE0] text-[#188038]'
                          }`}
                      >
                        Submission receipt: {asg.submissionNote}
                      </div>
                    )}

                    {submittingId === asg.id && (
                      <div
                        className={`pt-3 border-t flex flex-col sm:flex-row gap-2 ${isDark ? 'border-[#3C4043]' : 'border-[#DADCE0]'
                          }`}
                      >
                        <input
                          type="text"
                          value={submissionNote}
                          onChange={(e) => setSubmissionNote(e.target.value)}
                          placeholder="Paste repository URL or solution summary..."
                          className={`flex-1 px-3.5 py-2 rounded-xl border text-xs font-mono focus:outline-none ${isDark
                            ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3]'
                            : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
                            }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleConfirmSubmission(asg.id)}
                          className={`btn-google px-4 py-2 rounded-full font-medium text-xs cursor-pointer ${isDark
                            ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                            : 'bg-[#059669] text-white hover:bg-[#047857]'
                            }`}
                        >
                          Confirm Turn-In
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: People Directory */}
      {activeTab === 'people' && (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-3xl border space-y-3 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
              }`}
          >
            <h2
              className={`text-xs font-mono uppercase tracking-wider font-medium ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                }`}
            >
              Course Lecturer
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#69DB7C] text-black font-mono font-bold text-xs flex items-center justify-center">
                  {lecturerInitials}
                </div>
                <div>
                  <div className="font-medium text-sm">{course.lecturerName}</div>
                  <div
                    className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                      }`}
                  >
                    {course.department}
                  </div>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full font-mono text-xs font-medium ${isDark
                  ? 'bg-[#69DB7C]/15 text-[#69DB7C]'
                  : 'bg-[#ECFDF5] text-[#059669]'
                  }`}
              >
                HOST
              </span>
            </div>
          </div>

          <div
            className={`p-6 rounded-3xl border space-y-4 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
              }`}
          >
            <div className="flex items-center justify-between">
              <h2
                className={`text-xs font-mono uppercase tracking-wider font-medium ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                  }`}
              >
                Enrolled Classmates ({courseMembers.length || course.enrolledCount})
              </h2>

              <button
                type="button"
                onClick={handleCopyCode}
                className={`btn-google px-3 py-1.5 rounded-full text-xs font-mono font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
                  isDark
                    ? 'border-[#3C4043] bg-[#0F1713] text-[#E3E3E3] hover:bg-[#28292A]'
                    : 'border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F1F3F4]'
                }`}
                title="Copy Course Code to Invite Classmates"
              >
                {copiedCode ? (
                  <>
                    <Check size={14} className="text-[#69DB7C]" />
                    <span className="text-[#69DB7C]">Copied {course.code}!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Invite: {course.code}</span>
                  </>
                )}
              </button>
            </div>
            {courseMembers.length === 0 ? (
              <p className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                No other classmates enrolled in this cohort yet. Share course code <strong className="font-mono text-white">{course.code}</strong> to invite peers.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {courseMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between ${isDark
                      ? 'bg-[#0F1713] border-[#3C4043]'
                      : 'bg-[#F8F9FA] border-[#DADCE0]'
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white/10 font-mono text-xs font-medium flex items-center justify-center shrink-0">
                        {member.avatarTag || member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{member.name}</div>
                        <div
                          className={`text-xs font-mono truncate ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'
                            }`}
                        >
                          {member.matricOrStaffId || member.role}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`font-mono text-[11px] ${isDark ? 'text-[#69DB7C]' : 'text-[#059669]'
                        }`}
                    >
                      Enrolled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Assignment Modal (Google Classroom Feature) */}
      {showCreateAsgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 space-y-5 shadow-2xl ${
              isDark
                ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]'
                : 'bg-white border-[#DADCE0] text-[#202124]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-medium">Create Coursework Assignment</h3>
                <p className={`text-xs ${isDark ? 'text-[#9AA0A6]' : 'text-[#5F6368]'}`}>
                  Post a new assignment or lab for {course.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateAsgModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-mono mb-1 text-[#9AA0A6]">
                  Assignment Title
                </label>
                <input
                  type="text"
                  required
                  value={newAsgTitle}
                  onChange={(e) => setNewAsgTitle(e.target.value)}
                  placeholder="e.g. Lab 04: Minimum Spanning Tree & Kruskal Proof"
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm focus:outline-none ${
                    isDark
                      ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                      : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono mb-1 text-[#9AA0A6]">
                  Instructions & Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={newAsgDesc}
                  onChange={(e) => setNewAsgDesc(e.target.value)}
                  placeholder="Detailed assignment guidelines, grading rubrics, or repository submission instructions..."
                  className={`w-full px-3.5 py-2.5 rounded-2xl border text-sm focus:outline-none resize-none ${
                    isDark
                      ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3] focus:border-[#69DB7C]'
                      : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124] focus:border-[#059669]'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono mb-1 text-[#9AA0A6]">Due Date</label>
                  <input
                    type="text"
                    value={newAsgDue}
                    onChange={(e) => setNewAsgDue(e.target.value)}
                    placeholder="e.g. Due Friday at 11:59 PM WAT"
                    className={`w-full px-3.5 py-2 rounded-2xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3]'
                        : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono mb-1 text-[#9AA0A6]">Grading Points</label>
                  <input
                    type="text"
                    value={newAsgPoints}
                    onChange={(e) => setNewAsgPoints(e.target.value)}
                    placeholder="e.g. 100 points"
                    className={`w-full px-3.5 py-2 rounded-2xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#0F1713] border-[#3C4043] text-[#E3E3E3]'
                        : 'bg-[#F8F9FA] border-[#DADCE0] text-[#202124]'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAsgModal(false)}
                  className="btn-google px-4 py-2 rounded-full text-xs font-medium text-[#9AA0A6] hover:text-[#E3E3E3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn-google px-5 py-2.5 rounded-full font-medium text-xs cursor-pointer ${
                    isDark
                      ? 'bg-[#69DB7C] text-[#0F1713] hover:bg-[#51CF66]'
                      : 'bg-[#059669] text-white hover:bg-[#047857]'
                  }`}
                >
                  Publish Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
