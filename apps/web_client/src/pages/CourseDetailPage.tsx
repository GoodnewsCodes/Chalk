import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  Gear,
  Trash,
  PencilSimple,
  DotsThreeVertical,
  LinkSimple,
  Eye,
  ChatCircleText,
  UserPlus,
  SpeakerHigh,
  SpeakerSlash,
  ChartBar,
  Article,
  Question,
  FileText,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';
import { CourseModel, TopicModel, ClassworkAssignment } from '../types/chalk';

export const CourseDetailPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    isDark,
    courses,
    liveRooms,
    currentUser,
    announcements,
    assignments,
    topics,
    submissions,
    announcementComments,
    addAnnouncement,
    deleteAnnouncement,
    addAnnouncementComment,
    deleteAnnouncementComment,
    createAssignment,
    deleteAssignment,
    createTopic,
    deleteTopic,
    updateCourseSettings,
    muteStudent,
    removeStudentFromCourse,
    inviteStudentToCourse,
    gradeSubmission,
    setActiveRoomCode,
  } = useApp();

  const course = courses.find((c) => c.id === courseId);

  // Tab State
  const initialTab = (searchParams.get('tab') as 'stream' | 'classwork' | 'people' | 'grades') || 'stream';
  const [activeTab, setActiveTab] = useState<'stream' | 'classwork' | 'people' | 'grades'>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && ['stream', 'classwork', 'people', 'grades'].includes(t)) {
      setActiveTab(t as any);
    }
  }, [searchParams]);

  const handleTabChange = (t: 'stream' | 'classwork' | 'people' | 'grades') => {
    setActiveTab(t);
    setSearchParams({ tab: t });
  };

  const isCourseLive = course
    ? liveRooms.some(
      (r) =>
        r.id.toLowerCase() === course.liveRoomCode.toLowerCase() ||
        r.courseId === course.id ||
        r.courseCode.toLowerCase() === course.code.toLowerCase()
    )
    : false;

  const isLecturer =
    currentUser?.role === 'lecturer' ||
    course?.lecturerId === currentUser?.id ||
    Boolean(
      currentUser?.name &&
      course?.lecturerName &&
      course.lecturerName.toLowerCase().includes(currentUser.name.toLowerCase())
    );

  // Stream Announcement State
  const [postInput, setPostInput] = useState('');
  const [postAttachUrl, setPostAttachUrl] = useState('');
  const [postAttachName, setPostAttachName] = useState('');
  const [showAttachInput, setShowAttachInput] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showExpandCodeModal, setShowExpandCodeModal] = useState(false);

  // Announcement Comments State
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Classwork Create Menu & Modals State
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'assignment' | 'quiz' | 'question' | 'material'>('assignment');
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>('all');

  // New Classwork Form
  const [newAsgTitle, setNewAsgTitle] = useState('');
  const [newAsgDesc, setNewAsgDesc] = useState('');
  const [newAsgDue, setNewAsgDue] = useState('');
  const [newAsgDueTime, setNewAsgDueTime] = useState('11:59 PM');
  const [newAsgPoints, setNewAsgPoints] = useState('100 points');
  const [newAsgTopicId, setNewAsgTopicId] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'short_answer' | 'multiple_choice'>('short_answer');
  const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>(['', '']);

  // People State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Course Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsSection, setSettingsSection] = useState(course?.section || '');
  const [settingsRoom, setSettingsRoom] = useState(course?.room || '');
  const [settingsSubject, setSettingsSubject] = useState(course?.subject || '');
  const [settingsTheme, setSettingsTheme] = useState(course?.themeColor || course?.accentHex || '#059669');

  if (!course) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-medium">Course not found</h2>
        <p className="text-sm opacity-70">The requested course does not exist.</p>
        <Link
          to="/hub"
          className="btn-google inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-[#059669] text-white"
        >
          <ArrowLeft size={16} />
          <span>Return to Classes</span>
        </Link>
      </div>
    );
  }

  const courseAnnouncements = announcements.filter((a) => a.courseId === course.id);
  const courseAssignments = assignments.filter((a) => a.courseId === course.id);
  const courseTopics = topics.filter((t) => t.courseId === course.id);
  const courseSubmissions = submissions.filter((s) => s.courseId === course.id);
  const studentsList = course.members?.filter((m) => m.role === 'student') || [];
  const teachersList = course.members?.filter((m) => m.role === 'lecturer') || [];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(course.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postInput.trim()) return;
    const attachments = postAttachName.trim()
      ? [
        {
          id: `att_${Date.now()}`,
          title: postAttachName.trim(),
          url: postAttachUrl.trim() || '#',
          type: postAttachUrl.startsWith('http') ? 'link' : 'file',
        },
      ]
      : [];

    addAnnouncement(course.id, postInput.trim(), false, attachments);
    setPostInput('');
    setPostAttachName('');
    setPostAttachUrl('');
    setShowAttachInput(false);
  };

  const handleAddComment = async (announcementId: string, e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInputs[announcementId]?.trim();
    if (!text) return;
    await addAnnouncementComment(announcementId, text);
    setCommentInputs((prev) => ({ ...prev, [announcementId]: '' }));
  };

  const handleCreateTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    await createTopic(course.id, newTopicName.trim());
    setNewTopicName('');
    setShowTopicModal(false);
  };

  const handleCreateAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsgTitle.trim()) return;

    await createAssignment({
      courseId: course.id,
      title: newAsgTitle.trim(),
      description: newAsgDesc.trim(),
      dueDate: newAsgDue.trim() || 'No due date',
      dueTime: newAsgDueTime,
      points: createType === 'material' ? 'Ungraded' : newAsgPoints,
      type: createType,
      topicId: newAsgTopicId || undefined,
      questionType: createType === 'question' ? newQuestionType : undefined,
      questionOptions:
        createType === 'question' && newQuestionType === 'multiple_choice'
          ? newQuestionOptions.filter((opt) => opt.trim().length > 0)
          : undefined,
    });

    setNewAsgTitle('');
    setNewAsgDesc('');
    setNewAsgDue('');
    setShowCreateModal(false);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmailInput.trim()) return;
    await inviteStudentToCourse(course.id, inviteEmailInput.trim());
    setInviteEmailInput('');
    setShowInviteModal(false);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCourseSettings(course.id, {
      section: settingsSection,
      room: settingsRoom,
      subject: settingsSubject,
      themeColor: settingsTheme,
    });
    setShowSettingsModal(false);
  };

  // Bulk actions on selected students
  const handleBulkMute = async () => {
    for (const id of selectedStudentIds) {
      await muteStudent(course.id, id, true);
    }
    setSelectedStudentIds([]);
  };

  const handleBulkRemove = async () => {
    for (const id of selectedStudentIds) {
      await removeStudentFromCourse(course.id, id);
    }
    setSelectedStudentIds([]);
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Google Classroom Top Tabs Bar */}
      <nav
        aria-label="Course Sections"
        className={`px-6 border-b flex items-center justify-between shrink-0 sticky top-0 z-20 backdrop-blur-md ${isDark ? 'bg-[#141E19]/90 border-[#3C4043]' : 'bg-white/90 border-[#DADCE0]'
          }`}
      >
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
          <button
            onClick={() => handleTabChange('stream')}
            className={`py-3.5 px-3 sm:px-4 border-b-2 cursor-pointer transition-all ${activeTab === 'stream'
              ? 'border-[#059669] text-[#059669] dark:text-[#69DB7C] dark:border-[#69DB7C]'
              : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
          >
            Stream
          </button>
          <button
            onClick={() => handleTabChange('classwork')}
            className={`py-3.5 px-3 sm:px-4 border-b-2 cursor-pointer transition-all ${activeTab === 'classwork'
              ? 'border-[#059669] text-[#059669] dark:text-[#69DB7C] dark:border-[#69DB7C]'
              : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
          >
            Classwork
          </button>
          <button
            onClick={() => handleTabChange('people')}
            className={`py-3.5 px-3 sm:px-4 border-b-2 cursor-pointer transition-all ${activeTab === 'people'
              ? 'border-[#059669] text-[#059669] dark:text-[#69DB7C] dark:border-[#69DB7C]'
              : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
          >
            People
          </button>
          <button
            onClick={() => handleTabChange('grades')}
            className={`py-3.5 px-3 sm:px-4 border-b-2 cursor-pointer transition-all ${activeTab === 'grades'
              ? 'border-[#059669] text-[#059669] dark:text-[#69DB7C] dark:border-[#69DB7C]'
              : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
              }`}
          >
            {isLecturer ? 'Grades' : 'Your Work'}
          </button>
        </div>

        {/* Course Settings Gear Icon */}
        <button
          onClick={() => setShowSettingsModal(true)}
          title="Class Settings"
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
        >
          <Gear size={20} />
        </button>
      </nav>

      {/* Main Tab Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto w-full space-y-8">
        {/* ======================================================== */}
        {/* TAB 1: STREAM                                            */}
        {/* ======================================================== */}
        {activeTab === 'stream' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div
              className="rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[160px]"
              style={{
                backgroundColor: course.themeColor || course.accentHex || '#059669',
              }}
            >
              <div className="space-y-1 relative z-10">
                <span className="font-mono text-xs uppercase tracking-wider bg-black/20 px-2.5 py-1 rounded-full">
                  {course.code}
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
                  {course.title}
                </h1>
                {course.section && (
                  <p className="text-xs opacity-90 font-mono">{course.section}</p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-mono opacity-90 pt-4 relative z-10">
                <span>Instructor: {course.lecturerName}</span>
                {course.room && <span>Room: {course.room}</span>}
              </div>
            </div>

            {/* Stream Grid: Left Sidebar (Class Code, Studio, Upcoming) + Right Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Rail (1 Col) */}
              <div className="space-y-4">
                {/* Class Code Card with Projector Expand */}
                <div
                  className={`p-4 rounded-3xl border space-y-2 shadow-xs ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                    }`}
                >
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-black/60 dark:text-white/60">Class Code</span>
                    <button
                      onClick={() => setShowExpandCodeModal(true)}
                      title="Display class code on projector"
                      className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-lg text-[#059669] dark:text-[#69DB7C]">
                      {course.code}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-mono flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Google Studio Quick-Join Card */}
                <div
                  className={`p-4 rounded-3xl border space-y-3 shadow-xs ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                    }`}
                >
                  <div className="flex items-center justify-between text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <VideoCamera size={16} className="text-[#059669] dark:text-[#69DB7C]" />
                      <span>Studio</span>
                    </div>
                    {isCourseLive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500/10 text-red-500 font-semibold animate-pulse">
                        LIVE
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/studio/lobby/${course.liveRoomCode}`}
                    className="w-full py-2.5 px-4 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <VideoCamera size={15} />
                    <span>Join Class Studio</span>
                  </Link>
                </div>

                {/* Upcoming Due Dates Card */}
                <div
                  className={`p-4 rounded-3xl border space-y-3 shadow-xs ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                    }`}
                >
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span>Upcoming</span>
                    <Link
                      to="/hub/todo"
                      className="text-[#059669] dark:text-[#69DB7C] hover:underline"
                    >
                      View all
                    </Link>
                  </div>
                  {courseAssignments.filter((a) => a.dueDate !== 'No due date').slice(0, 3).length > 0 ? (
                    <div className="space-y-2 text-xs">
                      {courseAssignments
                        .filter((a) => a.dueDate !== 'No due date')
                        .slice(0, 3)
                        .map((a) => (
                          <Link
                            key={a.id}
                            to={`/hub/course/${course.id}/assignment/${a.id}`}
                            className="block hover:underline truncate"
                          >
                            <span className="text-black/50 dark:text-white/50 font-mono">
                              {a.dueDate}:{' '}
                            </span>
                            <span>{a.title}</span>
                          </Link>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs opacity-60">Woohoo, no work due soon!</p>
                  )}
                </div>
              </div>

              {/* Right Feed (3 Cols: Announce Composer + Stream Items) */}
              <div className="lg:col-span-3 space-y-4">
                {/* Announcement Composer */}
                <form
                  onSubmit={handlePostAnnouncement}
                  className={`p-4 rounded-3xl border space-y-3 shadow-xs ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-medium text-xs shrink-0 ${isDark ? 'bg-[#69DB7C]/20 text-[#69DB7C]' : 'bg-[#ECFDF5] text-[#059669]'
                        }`}
                    >
                      {currentUser?.avatarTag || 'CU'}
                    </div>
                    <input
                      type="text"
                      value={postInput}
                      onChange={(e) => setPostInput(e.target.value)}
                      placeholder={`Announce something to your class...`}
                      className="w-full bg-transparent text-sm focus:outline-none"
                    />
                  </div>

                  {showAttachInput && (
                    <div className="p-3 rounded-2xl border border-black/10 dark:border-white/10 space-y-2 text-xs">
                      <input
                        type="text"
                        value={postAttachName}
                        onChange={(e) => setPostAttachName(e.target.value)}
                        placeholder="Attachment label (e.g. Lecture Slide Deck)"
                        className="w-full p-2 rounded-xl border focus:outline-none"
                      />
                      <input
                        type="text"
                        value={postAttachUrl}
                        onChange={(e) => setPostAttachUrl(e.target.value)}
                        placeholder="File URL or Link"
                        className="w-full p-2 rounded-xl border focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-black/10 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowAttachInput(!showAttachInput)}
                      className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer opacity-70 hover:opacity-100"
                    >
                      <UploadSimple size={16} />
                      <span>Add attachment</span>
                    </button>

                    <button
                      type="submit"
                      disabled={!postInput.trim()}
                      className="btn-google px-5 py-2 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer disabled:opacity-40"
                    >
                      Post
                    </button>
                  </div>
                </form>

                {/* Announcement Stream List */}
                <div className="space-y-4">
                  {courseAnnouncements.map((ann) => {
                    const comments = announcementComments[ann.id] || [];
                    return (
                      <div
                        key={ann.id}
                        className={`p-5 rounded-3xl border space-y-4 shadow-xs ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                          }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-mono font-medium text-xs">
                              {ann.authorName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{ann.authorName}</div>
                              <div className="text-[11px] font-mono opacity-60">
                                {ann.timestamp}
                              </div>
                            </div>
                          </div>

                          {(isLecturer || currentUser?.name === ann.authorName) && (
                            <button
                              onClick={() => deleteAnnouncement(ann.id)}
                              title="Delete Announcement"
                              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100"
                            >
                              <Trash size={16} />
                            </button>
                          )}
                        </div>

                        {/* Content */}
                        <p className="text-sm leading-relaxed whitespace-pre-line">{ann.content}</p>

                        {/* Attachments if any */}
                        {ann.attachments && ann.attachments.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                            {ann.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2.5 rounded-2xl border flex items-center gap-2.5 text-xs hover:border-[#059669]"
                              >
                                <LinkSimple size={16} className="text-[#059669]" />
                                <span className="truncate">{att.title}</span>
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Class Comments Thread */}
                        <div className="pt-3 border-t border-black/10 dark:border-white/10 space-y-3">
                          <div className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50 flex items-center gap-1.5">
                            <ChatCircleText size={14} />
                            <span>Class comments ({comments.length})</span>
                          </div>

                          {comments.map((com) => (
                            <div key={com.id} className="flex items-start gap-2.5 text-xs">
                              <div className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-mono font-medium text-[10px] shrink-0">
                                {com.avatarTag}
                              </div>
                              <div className="flex-1">
                                <span className="font-medium mr-2">{com.authorName}</span>
                                <span className="opacity-50 text-[10px] mr-2 font-mono">
                                  {com.timestamp}
                                </span>
                                <div>{com.content}</div>
                              </div>
                              {(isLecturer || currentUser?.name === com.authorName) && (
                                <button
                                  onClick={() => deleteAnnouncementComment(ann.id, com.id)}
                                  className="opacity-40 hover:opacity-100"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Add comment input */}
                          <form
                            onSubmit={(e) => handleAddComment(ann.id, e)}
                            className="flex items-center gap-2 pt-1"
                          >
                            <input
                              type="text"
                              value={commentInputs[ann.id] || ''}
                              onChange={(e) =>
                                setCommentInputs({ ...commentInputs, [ann.id]: e.target.value })
                              }
                              placeholder="Add class comment..."
                              className={`flex-1 px-3.5 py-1.5 rounded-full border text-xs focus:outline-none ${isDark
                                ? 'bg-[#0F1713] border-[#3C4043] focus:border-[#69DB7C]'
                                : 'bg-[#F8F9FA] border-[#DADCE0] focus:border-[#059669]'
                                }`}
                            />
                            <button
                              type="submit"
                              disabled={!commentInputs[ann.id]?.trim()}
                              className="p-2 rounded-full bg-[#059669] text-white disabled:opacity-40"
                            >
                              <PaperPlaneTilt size={14} />
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CLASSWORK                                         */}
        {/* ======================================================== */}
        {activeTab === 'classwork' && (
          <div className="space-y-6">
            {/* Top Action Row: "+ Create" Button & Topic Filter */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {isLecturer && (
                <div className="relative">
                  <button
                    onClick={() => setShowCreateMenu(!showCreateMenu)}
                    className="btn-google px-5 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Plus size={16} weight="bold" />
                    <span>Create</span>
                  </button>

                  {/* Create Dropdown Menu */}
                  {showCreateMenu && (
                    <div
                      className={`absolute left-0 top-12 w-56 rounded-2xl p-2 shadow-2xl border z-30 space-y-1 text-xs ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                        }`}
                    >
                      <button
                        onClick={() => {
                          setCreateType('assignment');
                          setShowCreateModal(true);
                          setShowCreateMenu(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5"
                      >
                        <Article size={16} />
                        <span>Assignment</span>
                      </button>
                      <button
                        onClick={() => {
                          setCreateType('quiz');
                          setShowCreateModal(true);
                          setShowCreateMenu(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5"
                      >
                        <CheckCircle size={16} />
                        <span>Quiz assignment</span>
                      </button>
                      <button
                        onClick={() => {
                          setCreateType('question');
                          setShowCreateModal(true);
                          setShowCreateMenu(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5"
                      >
                        <Question size={16} />
                        <span>Question</span>
                      </button>
                      <button
                        onClick={() => {
                          setCreateType('material');
                          setShowCreateModal(true);
                          setShowCreateMenu(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5"
                      >
                        <FileText size={16} />
                        <span>Material</span>
                      </button>
                      <div className="border-t border-black/10 dark:border-white/10 my-1" />
                      <button
                        onClick={() => {
                          setShowTopicModal(true);
                          setShowCreateMenu(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl text-left hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5"
                      >
                        <FolderOpen size={16} />
                        <span>Topic</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Topic Filters */}
              <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium">
                <button
                  onClick={() => setSelectedTopicFilter('all')}
                  className={`px-3.5 py-1.5 rounded-full border cursor-pointer whitespace-nowrap ${selectedTopicFilter === 'all'
                    ? isDark
                      ? 'bg-[#69DB7C]/20 border-[#69DB7C] text-[#69DB7C]'
                      : 'bg-[#059669]/10 border-[#059669] text-[#059669]'
                    : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100'
                    }`}
                >
                  All topics
                </button>
                {courseTopics.map((top) => (
                  <button
                    key={top.id}
                    onClick={() => setSelectedTopicFilter(top.id)}
                    className={`px-3.5 py-1.5 rounded-full border cursor-pointer whitespace-nowrap ${selectedTopicFilter === top.id
                      ? isDark
                        ? 'bg-[#69DB7C]/20 border-[#69DB7C] text-[#69DB7C]'
                        : 'bg-[#059669]/10 border-[#059669] text-[#059669]'
                      : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100'
                      }`}
                  >
                    {top.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Classwork Items Grouped by Topic */}
            {courseAssignments.length > 0 ? (
              <div className="space-y-8">
                {courseTopics
                  .filter((t) => selectedTopicFilter === 'all' || selectedTopicFilter === t.id)
                  .map((topic) => {
                    const topicAssignments = courseAssignments.filter((a) => a.topicId === topic.id);
                    return (
                      <div key={topic.id} className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[#059669]/30">
                          <h2 className="text-lg font-medium text-[#059669] dark:text-[#69DB7C]">
                            {topic.name}
                          </h2>
                          {isLecturer && (
                            <button
                              onClick={() => deleteTopic(topic.id)}
                              title="Delete Topic"
                              className="text-xs opacity-50 hover:opacity-100 hover:text-red-500"
                            >
                              <Trash size={15} />
                            </button>
                          )}
                        </div>

                        {topicAssignments.length > 0 ? (
                          <div className="space-y-3">
                            {topicAssignments.map((asg) => renderAssignmentCard(asg))}
                          </div>
                        ) : (
                          <p className="text-xs opacity-50 py-2">No items in this topic yet.</p>
                        )}
                      </div>
                    );
                  })}

                {/* Items Without Topic */}
                {(selectedTopicFilter === 'all' || selectedTopicFilter === 'none') && (
                  <div className="space-y-3">
                    <h2 className="text-lg font-medium opacity-80 pb-2 border-b border-black/10 dark:border-white/10">
                      General Classwork
                    </h2>
                    <div className="space-y-3">
                      {courseAssignments
                        .filter((a) => !a.topicId)
                        .map((asg) => renderAssignmentCard(asg))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-sm opacity-60">
                This is where you'll assign work. You can add assignments and questions, and organize them into topics.
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PEOPLE                                            */}
        {/* ======================================================== */}
        {activeTab === 'people' && (
          <div className="space-y-8">
            {/* Teachers Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#059669]/40">
                <h2 className="text-xl font-medium text-[#059669] dark:text-[#69DB7C]">Teachers</h2>
                {isLecturer && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                    title="Invite Teachers"
                  >
                    <UserPlus size={18} />
                  </button>
                )}
              </div>

              <div className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                <div className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#059669]/15 text-[#059669] dark:text-[#69DB7C] flex items-center justify-center font-mono font-medium text-xs">
                      {course.lecturerName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium">{course.lecturerName}</span>
                  </div>
                  <span className="text-xs font-mono opacity-60">Course Creator</span>
                </div>
                {teachersList.map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-mono font-medium text-xs">
                        {t.avatarTag}
                      </div>
                      <span>{t.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Students Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#059669]/40">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-medium text-[#059669] dark:text-[#69DB7C]">
                    Students
                  </h2>
                  <span className="text-xs font-mono opacity-60">
                    {studentsList.length} students
                  </span>
                </div>
                {isLecturer && (
                  <div className="flex items-center gap-2">
                    {selectedStudentIds.length > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          onClick={handleBulkMute}
                          className="px-3 py-1 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5"
                        >
                          Mute ({selectedStudentIds.length})
                        </button>
                        <button
                          onClick={handleBulkRemove}
                          className="px-3 py-1 rounded-full border border-red-500/30 text-red-500 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                      title="Invite Students"
                    >
                      <UserPlus size={18} />
                    </button>
                  </div>
                )}
              </div>

              {studentsList.length > 0 ? (
                <div className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                  {studentsList.map((stu) => (
                    <div key={stu.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isLecturer && (
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(stu.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, stu.id]);
                              } else {
                                setSelectedStudentIds(
                                  selectedStudentIds.filter((id) => id !== stu.id)
                                );
                              }
                            }}
                            className="accent-[#059669]"
                          />
                        )}
                        <div className="w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-mono font-medium text-xs">
                          {stu.avatarTag}
                        </div>
                        <span className="font-medium">{stu.name}</span>
                        {stu.isMuted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            <SpeakerSlash size={12} />
                            <span>Muted</span>
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-mono opacity-50">{stu.matricOrStaffId}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs opacity-60 py-4">No students enrolled yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: GRADES / GRADEBOOK MATRIX                         */}
        {/* ======================================================== */}
        {activeTab === 'grades' && (
          <div className="space-y-6">
            {isLecturer ? (
              /* Teacher Gradebook Spreadsheet Matrix */
              <div
                className={`rounded-3xl border overflow-x-auto shadow-sm ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                  }`}
              >
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 font-mono">
                      <th className="p-4 font-semibold min-w-[180px]">Student Name</th>
                      <th className="p-4 font-semibold text-center min-w-[110px]">
                        Overall Grade
                      </th>
                      {courseAssignments.map((a) => (
                        <th key={a.id} className="p-4 font-semibold text-center min-w-[140px]">
                          <div className="truncate font-medium">{a.title}</div>
                          <div className="text-[10px] opacity-60">Out of {a.points}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {studentsList.map((stu) => {
                      const stuSubs = courseSubmissions.filter((s) => s.studentId === stu.id);
                      const totalEarned = stuSubs.reduce((sum, s) => sum + (s.grade || 0), 0);
                      const totalPossible = stuSubs.reduce((sum, s) => sum + (s.maxPoints || 100), 0);
                      const percent = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

                      return (
                        <tr key={stu.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                          <td className="p-4 font-medium flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center font-mono text-[10px]">
                              {stu.avatarTag}
                            </span>
                            <span>{stu.name}</span>
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-[#059669] dark:text-[#69DB7C]">
                            {percent !== null ? `${percent}%` : '—'}
                          </td>
                          {courseAssignments.map((a) => {
                            const sub = stuSubs.find((s) => s.assignmentId === a.id);
                            return (
                              <td key={a.id} className="p-4 text-center font-mono">
                                {sub?.grade !== undefined ? (
                                  <span className="font-semibold">{sub.grade}</span>
                                ) : sub?.status === 'turned_in' ? (
                                  <span className="text-blue-500 font-semibold">Turned in</span>
                                ) : (
                                  <span className="opacity-40">Missing</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Student "Your Work" Tab */
              <div className="space-y-6">
                <div
                  className={`p-6 rounded-3xl border flex items-center justify-between ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                    }`}
                >
                  <div className="space-y-1">
                    <h2 className="text-xl font-medium">{currentUser?.name}</h2>
                    <p className="text-xs font-mono opacity-60">
                      ID: {currentUser?.matricOrStaffId} • {course.code}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono text-[#059669] dark:text-[#69DB7C]">
                      Coursework Active
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {courseAssignments.map((asg) => {
                    const sub = courseSubmissions.find(
                      (s) => s.assignmentId === asg.id && s.studentId === currentUser?.id
                    );
                    return (
                      <Link
                        key={asg.id}
                        to={`/hub/course/${course.id}/assignment/${asg.id}`}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all hover:border-[#059669] ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                          }`}
                      >
                        <div>
                          <div className="text-xs font-mono opacity-60">Due: {asg.dueDate}</div>
                          <div className="text-sm font-medium mt-0.5">{asg.title}</div>
                        </div>

                        <div className="text-right font-mono text-xs">
                          {sub?.grade !== undefined ? (
                            <span className="font-bold text-[#059669] dark:text-[#69DB7C]">
                              {sub.grade} / {asg.points}
                            </span>
                          ) : sub?.status === 'turned_in' ? (
                            <span className="text-blue-500">Turned in</span>
                          ) : (
                            <span className="text-amber-500">Assigned</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Projector Code Expand Modal */}
      {showExpandCodeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 backdrop-blur-md"
          onClick={() => setShowExpandCodeModal(false)}
        >
          <div
            className={`p-10 rounded-3xl border shadow-2xl text-center space-y-6 max-w-lg w-full ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-mono uppercase tracking-widest text-[#059669] dark:text-[#69DB7C]">
              Classroom Invite Code
            </div>
            <div className="font-mono text-6xl font-bold tracking-wider py-4 select-all">
              {course.code}
            </div>
            <p className="text-xs opacity-70">
              Students can join instantly by going to Chalk and typing this code into their dashboard.
            </p>
            <button
              onClick={() => setShowExpandCodeModal(false)}
              className="btn-google px-6 py-2 rounded-full bg-[#059669] text-white text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Topic Modal */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateTopicSubmit}
            className={`w-full max-w-md p-6 rounded-3xl border space-y-4 shadow-2xl ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
              }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <h3 className="font-medium text-sm">Add Topic</h3>
              <button
                type="button"
                onClick={() => setShowTopicModal(false)}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              required
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="Topic name (e.g. Unit 1: Graph Theory)"
              className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                }`}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTopicModal(false)}
                className="px-4 py-2 rounded-full border text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-google px-5 py-2 rounded-full bg-[#059669] text-white text-xs font-medium"
              >
                Add Topic
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Classwork Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAssignmentSubmit}
            className={`w-full max-w-lg p-6 sm:p-8 rounded-3xl border space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
              }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <h3 className="font-medium text-sm capitalize">New {createType}</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 opacity-70">Title</label>
                <input
                  type="text"
                  required
                  value={newAsgTitle}
                  onChange={(e) => setNewAsgTitle(e.target.value)}
                  placeholder="e.g. Lab 4: Binary Trees"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                />
              </div>

              <div>
                <label className="block mb-1 opacity-70">Instructions (optional)</label>
                <textarea
                  rows={3}
                  value={newAsgDesc}
                  onChange={(e) => setNewAsgDesc(e.target.value)}
                  placeholder="Provide instructions or background..."
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 opacity-70">Due Date</label>
                  <input
                    type="text"
                    value={newAsgDue}
                    onChange={(e) => setNewAsgDue(e.target.value)}
                    placeholder="e.g. Nov 14, 2026"
                    className={`w-full p-2.5 rounded-xl border focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                      }`}
                  />
                </div>
                <div>
                  <label className="block mb-1 opacity-70">Topic</label>
                  <select
                    value={newAsgTopicId}
                    onChange={(e) => setNewAsgTopicId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                      }`}
                  >
                    <option value="">No Topic</option>
                    {courseTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-full border text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-google px-6 py-2 rounded-full bg-[#059669] text-white text-xs font-medium cursor-pointer"
              >
                Assign
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleInviteSubmit}
            className={`w-full max-w-md p-6 rounded-3xl border space-y-4 shadow-2xl ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
              }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <h3 className="font-medium text-sm">Invite Students / Teachers</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="opacity-70">
                Share this course invite code with your students, or invite directly by name/email:
              </p>
              <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 font-mono text-center text-lg font-bold">
                {course.code}
              </div>
              <div>
                <label className="block mb-1 opacity-70">Email or Student Name</label>
                <input
                  type="text"
                  required
                  value={inviteEmailInput}
                  onChange={(e) => setInviteEmailInput(e.target.value)}
                  placeholder="student@institution.edu.ng"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 rounded-full border text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-google px-5 py-2 rounded-full bg-[#059669] text-white text-xs font-medium cursor-pointer"
              >
                Send Invite
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Course Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSettings}
            className={`w-full max-w-md p-6 rounded-3xl border space-y-4 shadow-2xl ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
              }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <h3 className="font-medium text-sm">Course Settings</h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 opacity-70">Section</label>
                <input
                  type="text"
                  value={settingsSection}
                  onChange={(e) => setSettingsSection(e.target.value)}
                  placeholder="e.g. Year 4 • Batch A"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                />
              </div>
              <div>
                <label className="block mb-1 opacity-70">Room</label>
                <input
                  type="text"
                  value={settingsRoom}
                  onChange={(e) => setSettingsRoom(e.target.value)}
                  placeholder="e.g. Lab 2B / Remote"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                />
              </div>
              <div>
                <label className="block mb-1 opacity-70">Subject</label>
                <input
                  type="text"
                  value={settingsSubject}
                  onChange={(e) => setSettingsSubject(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                    }`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-full border text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-google px-5 py-2 rounded-full bg-[#059669] text-white text-xs font-medium cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  function renderAssignmentCard(asg: ClassworkAssignment) {
    const subs = courseSubmissions.filter((s) => s.assignmentId === asg.id);
    const turnedIn = subs.filter((s) => s.status === 'turned_in').length;
    const graded = subs.filter((s) => s.status === 'graded').length;
    const mySub = subs.find((s) => s.studentId === currentUser?.id);

    return (
      <div
        key={asg.id}
        className={`p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-xs ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
          }`}
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#059669]/10 text-[#059669] dark:text-[#69DB7C] flex items-center justify-center shrink-0">
            {asg.type === 'question' ? (
              <Question size={20} />
            ) : asg.type === 'material' ? (
              <FileText size={20} />
            ) : (
              <Article size={20} />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium truncate">{asg.title}</h3>
            <div className="flex items-center gap-2 text-xs font-mono opacity-60 mt-0.5">
              <span>Due: {asg.dueDate}</span>
              <span>•</span>
              <span>{asg.points}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {isLecturer ? (
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-center">
                <span className="text-sm font-bold text-blue-500">{turnedIn}</span>
                <span className="block text-[10px] opacity-60">Turned in</span>
              </div>
              <div className="text-center">
                <span className="text-sm font-bold text-emerald-500">{graded}</span>
                <span className="block text-[10px] opacity-60">Graded</span>
              </div>
            </div>
          ) : (
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-medium ${mySub?.status === 'graded'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : mySub?.status === 'turned_in'
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                }`}
            >
              {mySub?.status === 'graded'
                ? `Graded: ${mySub.grade}`
                : mySub?.status === 'turned_in'
                  ? 'Turned in'
                  : 'Assigned'}
            </span>
          )}

          <Link
            to={`/hub/course/${course?.id || courseId}/assignment/${asg.id}`}
            className="btn-google px-4 py-2 rounded-full border border-black/10 dark:border-white/10 text-xs font-medium hover:border-[#059669] dark:hover:border-[#69DB7C]"
          >
            View
          </Link>
        </div>
      </div>
    );
  }
};

export default CourseDetailPage;
