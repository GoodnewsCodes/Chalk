import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquareOffset,
  CheckCircle,
  WarningCircle,
  Clock,
  ArrowRight,
  FolderOpen,
} from '@phosphor-icons/react';
import { useApp } from '../context/AppContext';

export const ClassroomTodoPage: React.FC = () => {
  const { isDark, courses, assignments, submissions, currentUser } = useApp();

  const isLecturer = currentUser?.role === 'lecturer';
  const [studentTab, setStudentTab] = useState<'assigned' | 'missing' | 'done'>('assigned');
  const [teacherTab, setTeacherTab] = useState<'to_review' | 'reviewed'>('to_review');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

  const activeCourses = courses.filter((c) => !c.isArchived);

  // Filter assignments by course
  const filteredAssignments = assignments.filter((a) => {
    if (selectedCourseId !== 'all' && a.courseId !== selectedCourseId) return false;
    const c = courses.find((course) => course.id === a.courseId);
    return c && !c.isArchived;
  });

  // Student partition
  const assignedList = filteredAssignments.filter((a) => {
    const sub = submissions.find(
      (s) => s.assignmentId === a.id && s.studentId === currentUser?.id
    );
    return !sub || sub.status === 'assigned';
  });

  const missingList = filteredAssignments.filter((a) => {
    const sub = submissions.find(
      (s) => s.assignmentId === a.id && s.studentId === currentUser?.id
    );
    return sub?.status === 'missing';
  });

  const doneList = filteredAssignments.filter((a) => {
    const sub = submissions.find(
      (s) => s.assignmentId === a.id && s.studentId === currentUser?.id
    );
    return sub && (sub.status === 'turned_in' || sub.status === 'graded');
  });

  // Teacher partition
  const toReviewList = filteredAssignments.filter((a) => {
    const subs = submissions.filter((s) => s.assignmentId === a.id);
    return subs.some((s) => s.status === 'turned_in');
  });

  const reviewedList = filteredAssignments.filter((a) => {
    const subs = submissions.filter((s) => s.assignmentId === a.id);
    return subs.length > 0 && subs.every((s) => s.status === 'graded');
  });

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#059669]/10 text-[#059669] dark:text-[#69DB7C] flex items-center justify-center">
            <CheckSquareOffset size={22} />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight">
              {isLecturer ? 'To-review Work' : 'Your To-do List'}
            </h1>
            <p className="text-xs text-black/60 dark:text-white/60">
              {isLecturer
                ? 'Student assignment submissions ready for evaluation'
                : 'Keep track of upcoming deadlines, submitted work, and grades'}
            </p>
          </div>
        </div>

        {/* Filter by course dropdown */}
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className={`px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none cursor-pointer ${
            isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
          }`}
        >
          <option value="all">All classes</option>
          {activeCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}: {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      {isLecturer ? (
        <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/10 text-sm font-medium">
          <button
            onClick={() => setTeacherTab('to_review')}
            className={`pb-3 px-4 border-b-2 cursor-pointer transition-all ${
              teacherTab === 'to_review'
                ? 'border-[#059669] text-[#059669] dark:text-[#69DB7C] dark:border-[#69DB7C]'
                : 'border-transparent text-black/60 dark:text-white/60'
            }`}
          >
            To review ({toReviewList.length})
          </button>
          <button
            onClick={() => setTeacherTab('reviewed')}
            className={`pb-3 px-4 border-b-2 cursor-pointer transition-all ${
              teacherTab === 'reviewed'
                ? 'border-[#059669] text-[#059669] dark:text-[#69DB7C] dark:border-[#69DB7C]'
                : 'border-transparent text-black/60 dark:text-white/60'
            }`}
          >
            Reviewed ({reviewedList.length})
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/10 text-sm font-medium">
          <button
            onClick={() => setStudentTab('assigned')}
            className={`pb-3 px-4 border-b-2 cursor-pointer transition-all ${
              studentTab === 'assigned'
                ? 'border-[#059669] text-[#059669] dark:text-[#69DB7C] dark:border-[#69DB7C]'
                : 'border-transparent text-black/60 dark:text-white/60'
            }`}
          >
            Assigned ({assignedList.length})
          </button>
          <button
            onClick={() => setStudentTab('missing')}
            className={`pb-3 px-4 border-b-2 cursor-pointer transition-all ${
              studentTab === 'missing'
                ? 'border-[#059669] text-[#059669] dark:text-[#69DB7C] dark:border-[#69DB7C]'
                : 'border-transparent text-black/60 dark:text-white/60'
            }`}
          >
            Missing ({missingList.length})
          </button>
          <button
            onClick={() => setStudentTab('done')}
            className={`pb-3 px-4 border-b-2 cursor-pointer transition-all ${
              studentTab === 'done'
                ? 'border-[#059669] text-[#059669] dark:text-[#69DB7C] dark:border-[#69DB7C]'
                : 'border-transparent text-black/60 dark:text-white/60'
            }`}
          >
            Done ({doneList.length})
          </button>
        </div>
      )}

      {/* List Content */}
      <div className="space-y-3">
        {isLecturer ? (
          /* Teacher List */
          teacherTab === 'to_review' ? (
            toReviewList.length > 0 ? (
              toReviewList.map((asg) => {
                const c = courses.find((course) => course.id === asg.courseId);
                const subs = submissions.filter((s) => s.assignmentId === asg.id);
                const turnedIn = subs.filter((s) => s.status === 'turned_in').length;
                const graded = subs.filter((s) => s.status === 'graded').length;
                return (
                  <Link
                    key={asg.id}
                    to={`/hub/course/${asg.courseId}/assignment/${asg.id}`}
                    className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#059669] dark:hover:border-[#69DB7C] ${
                      isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono font-medium text-[#059669] dark:text-[#69DB7C]">
                        {c?.code || 'Course'} • Due: {asg.dueDate}
                      </div>
                      <h3 className="text-base font-medium mt-1">{asg.title}</h3>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-500">{turnedIn}</div>
                        <div className="text-[10px] opacity-60">Turned in</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-emerald-500">{graded}</div>
                        <div className="text-[10px] opacity-60">Graded</div>
                      </div>
                      <ArrowRight size={18} className="opacity-40" />
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="p-12 text-center text-sm opacity-60">
                All caught up! No submissions currently waiting for review.
              </div>
            )
          ) : (
            reviewedList.length > 0 ? (
              reviewedList.map((asg) => {
                const c = courses.find((course) => course.id === asg.courseId);
                return (
                  <Link
                    key={asg.id}
                    to={`/hub/course/${asg.courseId}/assignment/${asg.id}`}
                    className={`p-5 rounded-3xl border flex items-center justify-between gap-4 ${
                      isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {c?.code} • Completed
                      </div>
                      <h3 className="text-base font-medium mt-1">{asg.title}</h3>
                    </div>
                    <CheckCircle size={22} className="text-emerald-500" />
                  </Link>
                );
              })
            ) : (
              <div className="p-12 text-center text-sm opacity-60">
                No reviewed assignments yet.
              </div>
            )
          )
        ) : (
          /* Student List */
          studentTab === 'assigned' ? (
            assignedList.length > 0 ? (
              assignedList.map((asg) => {
                const c = courses.find((course) => course.id === asg.courseId);
                return (
                  <Link
                    key={asg.id}
                    to={`/hub/course/${asg.courseId}/assignment/${asg.id}`}
                    className={`p-5 rounded-3xl border flex items-center justify-between gap-4 transition-all hover:border-[#059669] dark:hover:border-[#69DB7C] ${
                      isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono font-medium text-[#059669] dark:text-[#69DB7C]">
                        {c?.code} • {asg.dueDate}
                      </div>
                      <h3 className="text-base font-medium mt-1">{asg.title}</h3>
                      <p className="text-xs opacity-60 mt-0.5 line-clamp-1">{asg.description}</p>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs opacity-70 shrink-0">
                      <span>{asg.points}</span>
                      <ArrowRight size={16} />
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="p-12 text-center text-sm opacity-60">
                Woohoo, no work due soon!
              </div>
            )
          ) : studentTab === 'missing' ? (
            missingList.length > 0 ? (
              missingList.map((asg) => (
                <Link
                  key={asg.id}
                  to={`/hub/course/${asg.courseId}/assignment/${asg.id}`}
                  className={`p-5 rounded-3xl border flex items-center justify-between gap-4 border-red-500/30 ${
                    isDark ? 'bg-red-950/10' : 'bg-red-50/50'
                  }`}
                >
                  <div>
                    <div className="text-xs font-mono font-medium text-red-500">
                      Missing • Past Due
                    </div>
                    <h3 className="text-base font-medium mt-1">{asg.title}</h3>
                  </div>
                  <WarningCircle size={22} className="text-red-500" />
                </Link>
              ))
            ) : (
              <div className="p-12 text-center text-sm opacity-60">
                You have no missing assignments.
              </div>
            )
          ) : (
            doneList.length > 0 ? (
              doneList.map((asg) => {
                const sub = submissions.find(
                  (s) => s.assignmentId === asg.id && s.studentId === currentUser?.id
                );
                return (
                  <Link
                    key={asg.id}
                    to={`/hub/course/${asg.courseId}/assignment/${asg.id}`}
                    className={`p-5 rounded-3xl border flex items-center justify-between gap-4 ${
                      isDark ? 'bg-[#141E19] border-[#3C4043]' : 'bg-white border-[#DADCE0]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {sub?.status === 'graded'
                          ? `Graded: ${sub.grade}/${sub.maxPoints}`
                          : 'Turned in'}
                      </div>
                      <h3 className="text-base font-medium mt-1">{asg.title}</h3>
                    </div>
                    <CheckCircle size={22} className="text-emerald-500" />
                  </Link>
                );
              })
            ) : (
              <div className="p-12 text-center text-sm opacity-60">
                No completed work yet.
              </div>
            )
          )
        )}
      </div>
    </div>
  );
};

export default ClassroomTodoPage;

