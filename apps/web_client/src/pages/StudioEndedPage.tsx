import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowClockwise,
  Star,
  CheckCircle,
  PlayCircle,
  DownloadSimple,
  VideoCamera,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

export const StudioEndedPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDark, isDemoMode, courses, currentUser, exportAttendanceReport } = useApp();

  const isEnded = searchParams.get('ended') === '1';
  const endedByLecturer = searchParams.get('by') === 'lecturer';

  const uidLower = (currentUser?.id || '').toLowerCase();

  const myTeachingCourses = courses.filter(
    (c) =>
      !c.isArchived &&
      currentUser &&
      ((c.lecturerId || '').toLowerCase() === uidLower ||
        (Boolean(currentUser.name) &&
          c.lecturerName.toLowerCase() === currentUser.name.toLowerCase()) ||
        Boolean(
          c.members?.some(
            (m) => (m.id || '').toLowerCase() === uidLower && m.role === 'lecturer'
          )
        ))
  );

  const myEnrolledCourses = courses.filter(
    (c) =>
      !c.isArchived &&
      currentUser &&
      (Boolean(c.memberIds?.some((id) => id.toLowerCase() === uidLower)) ||
        Boolean(
          c.members?.some(
            (m) =>
              (m.id || '').toLowerCase() === uidLower ||
              (Boolean(m.matricOrStaffId) &&
                Boolean(currentUser.matricOrStaffId) &&
                m.matricOrStaffId === currentUser.matricOrStaffId)
          )
        ))
  );

  const roleScopedCourses =
    currentUser?.role === 'lecturer' ? myTeachingCourses : myEnrolledCourses;

  const code =
    roomCode ||
    roleScopedCourses[0]?.liveRoomCode ||
    (isDemoMode ? 'csc401-algo' : '');
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>('');
  const [submittedFeedback, setSubmittedFeedback] = useState<boolean>(false);

  const handleRejoin = () => {
    navigate(`/studio/${encodeURIComponent(code)}`);
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedFeedback(true);
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 sm:p-6 ${isDark ? 'bg-[#0F1713] text-[#E3E3E3]' : 'bg-[#FFFFFF] text-[#202124]'
        }`}
    >
      <div
        className={`w-full max-w-lg p-8 sm:p-10 rounded-3xl border shadow-xl text-center space-y-6 ${isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
          }`}
      >
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <VideoCamera size={28} />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-medium tracking-tight">
            {isEnded ? 'The studio session has ended' : 'You left the meeting'}
          </h1>
          <p className="text-xs opacity-60">
            {isEnded
              ? endedByLecturer
                ? 'You ended the studio session for all participants.'
                : 'The lecturer has ended this studio session.'
              : `Room code: ${code}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleRejoin}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium cursor-pointer shadow-sm flex items-center justify-center gap-2"
          >
            <ArrowClockwise size={16} />
            <span>Rejoin Call</span>
          </button>

          <Link
            to="/hub"
            className={`w-full sm:w-auto px-6 py-3 rounded-full border text-xs font-medium cursor-pointer flex items-center justify-center gap-2 ${isDark ? 'border-[#3C4043] hover:bg-white/5' : 'border-[#DADCE0] hover:bg-black/5'
              }`}
          >
            <ArrowLeft size={16} />
            <span>Return to Classroom</span>
          </Link>
        </div>

        {/* Resources / Catch Up / Attendance */}
        <div className="pt-4 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
          <Link
            to="/catch-up"
            className="inline-flex items-center gap-1.5 text-blue-500 hover:underline"
          >
            <PlayCircle size={16} />
            <span>View AI Catch Up</span>
          </Link>

          <button
            onClick={exportAttendanceReport}
            className="inline-flex items-center gap-1.5 text-[#059669] dark:text-[#69DB7C] hover:underline cursor-pointer"
          >
            <DownloadSimple size={16} />
            <span>Download Attendance Report</span>
          </button>
        </div>

        {/* Quality Rating */}
        <div className="pt-4 border-t border-black/10 dark:border-white/10 space-y-3">
          <div className="text-xs font-medium opacity-80">How was the call quality?</div>
          {submittedFeedback ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle size={16} />
              <span>Thank you for your feedback!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="space-y-3">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      size={22}
                      weight={star <= rating ? 'fill' : 'regular'}
                      className={star <= rating ? 'text-amber-400' : 'text-gray-400'}
                    />
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional notes on audio or vector strokes..."
                className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${isDark ? 'bg-[#0F1713] border-[#3C4043]' : 'bg-[#F8F9FA] border-[#DADCE0]'
                  }`}
              />

              <button
                type="submit"
                className="px-4 py-1.5 rounded-full border text-xs opacity-80 hover:opacity-100 cursor-pointer"
              >
                Submit Feedback
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioEndedPage;

