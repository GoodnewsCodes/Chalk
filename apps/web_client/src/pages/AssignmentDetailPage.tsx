import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  FileText,
  LinkSimple,
  Paperclip,
  PaperPlaneTilt,
  Plus,
  Trash,
  UploadSimple,
  User,
  Users,
  VideoCamera,
  X,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

export const AssignmentDetailPage: React.FC = () => {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const {
    isDark,
    courses,
    assignments,
    submissions,
    currentUser,
    submitWork,
    unsubmitWork,
    gradeSubmission,
    addPrivateComment,
  } = useApp();

  const course = courses.find((c) => c.id === courseId);
  const assignment = assignments.find((a) => a.id === assignmentId);

  const isLecturer =
    currentUser?.role === 'lecturer' ||
    course?.lecturerId === currentUser?.id ||
    Boolean(
      currentUser?.name &&
        course?.lecturerName &&
        course.lecturerName.toLowerCase().includes(currentUser.name.toLowerCase())
    );

  const [activeTab, setActiveTab] = useState<'instructions' | 'student_work'>(
    isLecturer ? 'student_work' : 'instructions'
  );

  // Student Turn-in State
  const mySubmission = submissions.find(
    (s) => s.assignmentId === assignmentId && s.studentId === currentUser?.id
  );
  const [submissionAttachments, setSubmissionAttachments] = useState<
    { name: string; url: string; type: 'file' | 'link' | 'board' }[]
  >(mySubmission?.attachments || []);
  const [submissionNote, setSubmissionNote] = useState('');
  const [answerChoice, setAnswerChoice] = useState<string>(mySubmission?.answerText || '');
  const [shortAnswerText, setShortAnswerText] = useState<string>(mySubmission?.answerText || '');
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachUrl, setAttachUrl] = useState('');
  const [attachName, setAttachName] = useState('');
  const [privateCommentInput, setPrivateCommentInput] = useState('');

  // Lecturer Grading State
  const assignmentSubmissions = submissions.filter((s) => s.assignmentId === assignmentId);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>(
    assignmentSubmissions[0]?.id || ''
  );
  const selectedSubmission =
    assignmentSubmissions.find((s) => s.id === selectedSubmissionId) || assignmentSubmissions[0];
  const [gradeInput, setGradeInput] = useState<string>(
    selectedSubmission?.grade !== undefined ? String(selectedSubmission.grade) : ''
  );
  const [lecturerFeedback, setLecturerFeedback] = useState<string>('');

  if (!course || !assignment) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-medium">Assignment not found</h2>
        <p className="text-sm opacity-70">
          The requested assignment does not exist or may have been removed.
        </p>
        <Link
          to={`/hub/course/${courseId || ''}`}
          className="btn-google inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-[#059669] text-white"
        >
          <ArrowLeft size={16} />
          <span>Return to Class</span>
        </Link>
      </div>
    );
  }

  const handleAddAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachName.trim()) return;
    setSubmissionAttachments((prev) => [
      ...prev,
      {
        name: attachName.trim(),
        url: attachUrl.trim() || '#',
        type: attachUrl.startsWith('http') ? 'link' : 'file',
      },
    ]);
    setAttachName('');
    setAttachUrl('');
    setShowAttachModal(false);
  };

  const handleRemoveAttachment = (idx: number) => {
    setSubmissionAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleTurnIn = async () => {
    const finalAnswer =
      assignment.type === 'question'
        ? assignment.questionType === 'multiple_choice'
          ? answerChoice
          : shortAnswerText
        : undefined;

    await submitWork(assignment.id, submissionAttachments, finalAnswer, submissionNote);
  };

  const handleUnsubmit = async () => {
    await unsubmitWork(assignment.id);
  };

  const handleSendPrivateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateCommentInput.trim() || !mySubmission) return;
    await addPrivateComment(mySubmission.id, privateCommentInput.trim());
    setPrivateCommentInput('');
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    const num = parseFloat(gradeInput);
    if (isNaN(num)) return;
    await gradeSubmission(selectedSubmission.id, num, lecturerFeedback);
    setLecturerFeedback('');
  };

  const turnedInCount = assignmentSubmissions.filter((s) => s.status === 'turned_in').length;
  const gradedCount = assignmentSubmissions.filter((s) => s.status === 'graded').length;
  const assignedCount = Math.max(0, (course.enrolledCount || 0) - turnedInCount - gradedCount);

  return (
    <div className="min-h-full flex flex-col">
      {/* Top Header Bar with Tabs */}
      <header
        className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 ${
          isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/hub/course/${course.id}?tab=classwork`}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
            title="Back to Classwork"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="text-xs font-mono text-[#059669] dark:text-[#69DB7C] truncate">
              {course.code} • {course.title}
            </div>
            <h1 className="text-lg font-medium truncate">{assignment.title}</h1>
          </div>
        </div>

        {/* Tab Switcher for Teacher */}
        {isLecturer && (
          <div className="flex items-center gap-1 p-1 rounded-full border border-black/10 dark:border-white/10 text-xs font-medium">
            <button
              onClick={() => setActiveTab('student_work')}
              className={`px-4 py-1.5 rounded-full cursor-pointer transition-all ${
                activeTab === 'student_work'
                  ? isDark
                    ? 'bg-[#69DB7C]/20 text-[#69DB7C]'
                    : 'bg-[#059669]/10 text-[#059669]'
                  : 'text-black/60 dark:text-white/60'
              }`}
            >
              Student Work ({turnedInCount} Turned in)
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`px-4 py-1.5 rounded-full cursor-pointer transition-all ${
                activeTab === 'instructions'
                  ? isDark
                    ? 'bg-[#69DB7C]/20 text-[#69DB7C]'
                    : 'bg-[#059669]/10 text-[#059669]'
                  : 'text-black/60 dark:text-white/60'
              }`}
            >
              Instructions
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <div className="flex-1 p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto w-full">
        {activeTab === 'instructions' ? (
          /* ======================================================== */
          /* Instructions View (Student Submission or Teacher Preview) */
          /* ======================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Description, Question, Rubric, Attachments */}
            <div className="lg:col-span-2 space-y-6">
              <div
                className={`p-6 rounded-3xl border space-y-4 ${
                  isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono pb-2 border-b border-black/10 dark:border-white/10">
                  <span className="text-black/60 dark:text-white/60">
                    Points: {assignment.points}
                  </span>
                  <span className="text-black/60 dark:text-white/60">
                    Due: {assignment.dueDate} {assignment.dueTime ? `at ${assignment.dueTime}` : ''}
                  </span>
                </div>

                {/* Instructions Text */}
                <div className="text-sm leading-relaxed whitespace-pre-line">
                  {assignment.description || 'No detailed instructions provided.'}
                </div>

                {/* If Question Type: Interactive Answer Box */}
                {assignment.type === 'question' && (
                  <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#059669] dark:text-[#69DB7C]">
                      Your Answer
                    </label>

                    {assignment.questionType === 'multiple_choice' &&
                    assignment.questionOptions ? (
                      <div className="space-y-2">
                        {assignment.questionOptions.map((opt, i) => (
                          <label
                            key={i}
                            className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer text-xs transition-all ${
                              answerChoice === opt
                                ? isDark
                                  ? 'border-[#69DB7C] bg-[#69DB7C]/10 text-white'
                                  : 'border-[#059669] bg-[#059669]/5 text-black'
                                : isDark
                                  ? 'border-[#3C4043] hover:bg-white/5'
                                  : 'border-[#DADCE0] hover:bg-black/5'
                            }`}
                          >
                            <input
                              type="radio"
                              name="question_choice"
                              value={opt}
                              checked={answerChoice === opt}
                              disabled={mySubmission?.status === 'turned_in' || mySubmission?.status === 'graded'}
                              onChange={(e) => setAnswerChoice(e.target.value)}
                              className="accent-[#059669]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        value={shortAnswerText}
                        disabled={mySubmission?.status === 'turned_in' || mySubmission?.status === 'graded'}
                        onChange={(e) => setShortAnswerText(e.target.value)}
                        placeholder="Type your short answer..."
                        className={`w-full p-3 rounded-2xl border text-xs focus:outline-none ${
                          isDark
                            ? 'bg-[#0F1713] border-[#3C4043] focus:border-[#69DB7C]'
                            : 'bg-[#F8F9FA] border-[#DADCE0] focus:border-[#059669]'
                        }`}
                      />
                    )}
                  </div>
                )}

                {/* Assignment Attachments */}
                {assignment.attachments && assignment.attachments.length > 0 && (
                  <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                      Reference Materials ({assignment.attachments.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {assignment.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`p-3 rounded-2xl border flex items-center gap-3 text-xs hover:border-[#059669] dark:hover:border-[#69DB7C] transition-colors ${
                            isDark ? 'border-[#3C4043] bg-[#0F1713]' : 'border-[#DADCE0] bg-[#F8F9FA]'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-[#059669]/10 text-[#059669] dark:text-[#69DB7C] flex items-center justify-center shrink-0">
                            {att.type === 'link' ? <LinkSimple size={16} /> : <FileText size={16} />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{att.title}</div>
                            <div className="text-[11px] opacity-60 uppercase">{att.type}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rubric Criteria if provided */}
                {assignment.rubric && assignment.rubric.length > 0 && (
                  <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                      Grading Rubric
                    </div>
                    <div className="space-y-2">
                      {assignment.rubric.map((rub) =>
                        rub.criteria.map((crit, idx) => (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-4 ${
                              isDark ? 'border-[#3C4043] bg-[#0F1713]' : 'border-[#DADCE0] bg-[#F8F9FA]'
                            }`}
                          >
                            <div>
                              <div className="font-medium">{crit.title}</div>
                              {crit.description && (
                                <div className="text-[11px] opacity-60 mt-0.5">
                                  {crit.description}
                                </div>
                              )}
                            </div>
                            <span className="font-mono font-medium text-[#059669] dark:text-[#69DB7C] shrink-0">
                              {crit.points} pts
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Student "Your Work" Drawer & Private Comments */}
            <div className="space-y-6">
              {/* "Your Work" Card */}
              <div
                className={`p-6 rounded-3xl border space-y-4 shadow-sm ${
                  isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-base">Your work</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-medium capitalize ${
                      mySubmission?.status === 'graded'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : mySubmission?.status === 'turned_in'
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {mySubmission?.status === 'graded'
                      ? `Graded: ${mySubmission.grade}/${mySubmission.maxPoints}`
                      : mySubmission?.status === 'turned_in'
                        ? 'Turned in'
                        : 'Assigned'}
                  </span>
                </div>

                {/* Attached Files List */}
                {submissionAttachments.length > 0 ? (
                  <div className="space-y-2">
                    {submissionAttachments.map((att, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                          isDark ? 'border-[#3C4043] bg-[#0F1713]' : 'border-[#DADCE0] bg-[#F8F9FA]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip size={14} className="shrink-0" />
                          <span className="truncate">{att.name}</span>
                        </div>
                        {mySubmission?.status !== 'turned_in' && mySubmission?.status !== 'graded' && (
                          <button
                            onClick={() => handleRemoveAttachment(idx)}
                            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs opacity-60">No files or links attached yet.</p>
                )}

                {/* Add/Create Attachment Button */}
                {mySubmission?.status !== 'turned_in' && mySubmission?.status !== 'graded' && (
                  <button
                    type="button"
                    onClick={() => setShowAttachModal(true)}
                    className={`w-full py-2.5 px-4 rounded-full border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer ${
                      isDark
                        ? 'border-[#3C4043] hover:bg-white/5'
                        : 'border-[#DADCE0] hover:bg-black/5'
                    }`}
                  >
                    <Plus size={15} />
                    <span>Add or create work</span>
                  </button>
                )}

                {/* Turn In / Unsubmit Action Button */}
                {mySubmission?.status === 'turned_in' ? (
                  <button
                    type="button"
                    onClick={handleUnsubmit}
                    className={`w-full py-3 px-4 rounded-full border text-xs font-medium cursor-pointer ${
                      isDark
                        ? 'border-[#3C4043] hover:bg-white/5 text-amber-400'
                        : 'border-[#DADCE0] hover:bg-black/5 text-amber-600'
                    }`}
                  >
                    Unsubmit
                  </button>
                ) : mySubmission?.status === 'graded' ? (
                  <div className="text-center text-xs font-mono text-emerald-600 dark:text-emerald-400 py-2">
                    Submission complete & returned.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleTurnIn}
                    className="w-full py-3 px-4 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer transition-all active:scale-98 shadow-sm"
                  >
                    Turn in
                  </button>
                )}
              </div>

              {/* Private Comments Thread */}
              <div
                className={`p-6 rounded-3xl border space-y-4 ${
                  isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                  <User size={14} />
                  <span>Private comments</span>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto text-xs">
                  {mySubmission?.privateComments && mySubmission.privateComments.length > 0 ? (
                    mySubmission.privateComments.map((com) => (
                      <div
                        key={com.id}
                        className={`p-3 rounded-2xl ${
                          com.authorRole === 'lecturer'
                            ? isDark
                              ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-200'
                              : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                            : isDark
                              ? 'bg-black/20 text-white/90'
                              : 'bg-black/5 text-black/90'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono text-[10px] opacity-70 mb-1">
                          <span>{com.authorName} ({com.authorRole})</span>
                          <span>{com.timestamp}</span>
                        </div>
                        <p>{com.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs opacity-50">No private comments yet.</p>
                  )}
                </div>

                <form onSubmit={handleSendPrivateComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={privateCommentInput}
                    onChange={(e) => setPrivateCommentInput(e.target.value)}
                    placeholder="Add private comment to teacher..."
                    className={`flex-1 px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#0F1713] border-[#3C4043] focus:border-[#69DB7C]'
                        : 'bg-[#F8F9FA] border-[#DADCE0] focus:border-[#059669]'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!privateCommentInput.trim()}
                    className="p-2 rounded-xl bg-[#059669] text-white disabled:opacity-40"
                  >
                    <PaperPlaneTilt size={16} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* Lecturer View: Student Work, Submissions & Grading Matrix */
          /* ======================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 1 Col: Student Switcher List */}
            <div
              className={`p-6 rounded-3xl border space-y-4 ${
                isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
                <h3 className="font-medium text-sm">Student Submissions</h3>
                <span className="text-xs font-mono opacity-70">
                  {assignmentSubmissions.length} enrolled
                </span>
              </div>

              {/* Roster list */}
              {assignmentSubmissions.length > 0 ? (
                <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                  {assignmentSubmissions.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setSelectedSubmissionId(sub.id);
                        setGradeInput(sub.grade !== undefined ? String(sub.grade) : '');
                      }}
                      className={`w-full p-3 rounded-2xl flex items-center justify-between text-left text-xs transition-all cursor-pointer ${
                        selectedSubmission?.id === sub.id
                          ? isDark
                            ? 'bg-[#69DB7C]/15 border border-[#69DB7C]/40'
                            : 'bg-[#059669]/10 border border-[#059669]/30'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-medium text-[11px] shrink-0 ${
                            isDark ? 'bg-white/10' : 'bg-black/5'
                          }`}
                        >
                          {sub.studentAvatar}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{sub.studentName}</div>
                          <div className="text-[10px] font-mono opacity-60">
                            {sub.matricOrStaffId || 'Student'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {sub.status === 'graded' ? (
                          <span className="font-mono font-medium text-[#059669] dark:text-[#69DB7C]">
                            {sub.grade}/{sub.maxPoints}
                          </span>
                        ) : sub.status === 'turned_in' ? (
                          <span className="text-[10px] font-mono text-blue-500 font-medium">
                            Turned in
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-amber-500 font-medium">
                            Assigned
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs opacity-60 py-4">No submissions received yet.</p>
              )}
            </div>

            {/* Right 2 Cols: Selected Student Work Viewer & Grade Form */}
            <div className="lg:col-span-2 space-y-6">
              {selectedSubmission ? (
                <div
                  className={`p-6 rounded-3xl border space-y-6 ${
                    isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-black/10 dark:border-white/10">
                    <div>
                      <h2 className="text-lg font-medium">{selectedSubmission.studentName}</h2>
                      <div className="text-xs font-mono opacity-60">
                        Submitted: {selectedSubmission.submittedAt || 'Not submitted yet'}
                      </div>
                    </div>

                    {/* Inline Grading Form */}
                    <form onSubmit={handleSaveGrade} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 font-mono text-sm">
                        <input
                          type="number"
                          min="0"
                          max={selectedSubmission.maxPoints}
                          value={gradeInput}
                          onChange={(e) => setGradeInput(e.target.value)}
                          placeholder="Grade"
                          className={`w-20 px-3 py-1.5 rounded-xl border text-center font-mono focus:outline-none ${
                            isDark
                              ? 'bg-[#0F1713] border-[#3C4043] focus:border-[#69DB7C]'
                              : 'bg-[#F8F9FA] border-[#DADCE0] focus:border-[#059669]'
                          }`}
                        />
                        <span className="opacity-50">/ {selectedSubmission.maxPoints}</span>
                      </div>

                      <button
                        type="submit"
                        className="btn-google px-5 py-2 rounded-full bg-[#059669] text-white text-xs font-medium cursor-pointer"
                      >
                        Return Grade
                      </button>
                    </form>
                  </div>

                  {/* Submission Answers / Attachments */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                      Work Content
                    </h4>

                    {selectedSubmission.answerText && (
                      <div
                        className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                          isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                        }`}
                      >
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                          Written Answer:
                        </div>
                        {selectedSubmission.answerText}
                      </div>
                    )}

                    {selectedSubmission.attachments && selectedSubmission.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedSubmission.attachments.map((att, i) => (
                          <div
                            key={i}
                            className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs ${
                              isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                            }`}
                          >
                            <Paperclip size={18} className="shrink-0 text-[#059669]" />
                            <div className="truncate">
                              <div className="font-medium truncate">{att.name}</div>
                              <div className="text-[10px] font-mono opacity-50">{att.type}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !selectedSubmission.answerText && (
                        <p className="text-xs opacity-50">No files uploaded.</p>
                      )
                    )}
                  </div>

                  {/* Lecturer Feedback Comments */}
                  <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
                      Private Feedback
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto text-xs">
                      {selectedSubmission.privateComments.map((c) => (
                        <div
                          key={c.id}
                          className={`p-3 rounded-2xl ${
                            c.authorRole === 'lecturer'
                              ? isDark
                                ? 'bg-emerald-950/40 text-emerald-200'
                                : 'bg-emerald-50 text-emerald-900'
                              : isDark
                                ? 'bg-black/20 text-white/90'
                                : 'bg-black/5 text-black/90'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] opacity-70 mb-1">
                            <span>{c.authorName}</span>
                            <span>{c.timestamp}</span>
                          </div>
                          <div>{c.text}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        value={lecturerFeedback}
                        onChange={(e) => setLecturerFeedback(e.target.value)}
                        placeholder="Add private feedback to this student..."
                        className={`flex-1 px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${
                          isDark
                            ? 'bg-[#0F1713] border-[#3C4043] focus:border-[#69DB7C]'
                            : 'bg-[#F8F9FA] border-[#DADCE0] focus:border-[#059669]'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-10 rounded-3xl border text-center space-y-2 ${
                    isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                  }`}
                >
                  <p className="text-sm opacity-60">Select a student submission to review.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Attachment Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddAttachment}
            className={`w-full max-w-md p-6 rounded-3xl border space-y-4 shadow-2xl ${
              isDark ? 'bg-[#141E19] border-[#3C4043] text-[#E3E3E3]' : 'bg-white border-[#DADCE0] text-[#202124]'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <h3 className="font-medium text-sm">Add File or Link</h3>
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 opacity-70">Item Title / File Name</label>
                <input
                  type="text"
                  required
                  value={attachName}
                  onChange={(e) => setAttachName(e.target.value)}
                  placeholder="e.g. solution_report.pdf"
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                    isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                  }`}
                />
              </div>

              <div>
                <label className="block mb-1 opacity-70">Link URL (optional)</label>
                <input
                  type="text"
                  value={attachUrl}
                  onChange={(e) => setAttachUrl(e.target.value)}
                  placeholder="https://..."
                  className={`w-full p-2.5 rounded-xl border focus:outline-none ${
                    isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="px-4 py-2 rounded-full border text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-google px-5 py-2 rounded-full bg-[#059669] text-white text-xs font-medium"
              >
                Attach
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetailPage;

