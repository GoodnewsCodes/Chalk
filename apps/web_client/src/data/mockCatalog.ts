import {
  CourseModel,
  CourseAnnouncement,
  ClassworkAssignment,
  StrokeData,
  TopicModel,
  StudentSubmission,
  CourseAnnouncementComment,
  StudioPoll,
  StudioQuestion,
  AttendanceRecord,
  DvrReplayItem,
} from '../types/chalk';

export const INITIAL_TOPICS: TopicModel[] = [];
export const INITIAL_COURSES: CourseModel[] = [];
export const INITIAL_ANNOUNCEMENTS: CourseAnnouncement[] = [];
export const INITIAL_ANNOUNCEMENT_COMMENTS: Record<string, CourseAnnouncementComment[]> = {};
export const INITIAL_ASSIGNMENTS: ClassworkAssignment[] = [];
export const INITIAL_SUBMISSIONS: StudentSubmission[] = [];
export const INITIAL_POLLS: StudioPoll[] = [];
export const INITIAL_QUESTIONS: StudioQuestion[] = [];
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
export const DEFAULT_BOARD_STROKES: StrokeData[] = [];
export const REPLAY_CATALOG: DvrReplayItem[] = [];
