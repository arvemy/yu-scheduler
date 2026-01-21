export interface CourseEntry {
  course: string;
  section?: string | null;
}

export interface BlockedHour {
  day: string;
  slot: string;
}

export interface GenerateScheduleRequest {
  courses: CourseEntry[];
  /**
   * Optional groups of alternative courses.
   * For each group, exactly one option will be included in a generated schedule.
   * Order matters: options are treated as preferences (first is most preferred).
   */
  course_option_groups?: { options: CourseEntry[] }[];
  blocked_hours: BlockedHour[];
  term?: string | null;
}

export interface SessionData {
  "Start Time": string | null;
  "End Time": string | null;
  Day: string | null;
  Classroom?: string | null;
  Section: string;
  course?: string;
  section?: string;
}

export interface SectionInfo {
  course: string;
  section: string;
  sessions: SessionData[];
}

export interface Schedule {
  sections: SectionInfo[];
}

export interface WarningInfo {
  code: string;
  message: string;
  params?: Record<string, unknown>;
}

export interface ScheduleData {
  schedules: Schedule[];
  warnings: string[];
  warning_codes: WarningInfo[];
  time_slots: string[];
  days_of_week: string[];
}

export interface SavedSchedule {
  id: string;
  name: string;
  term: string;
  selectedCourses: string[];
  /** Optional "OR" groups saved with the schedule (ordered preferences). */
  courseOptionGroups?: string[][];
  scheduleData: ScheduleData;
  blockedHours: BlockedHour[];
  activeScheduleIndex: number;
  savedAt: number;
}

export type TermCourseData = Record<string, SessionData[]>;

export interface TermManifestEntry {
  term: string;
  file: string;
}

export interface GenerateScheduleWorkerRequest {
  id: string;
  type: "generate";
  payload: {
    request: GenerateScheduleRequest;
    data?: TermCourseData;
  };
}

export interface GenerateScheduleWorkerSetTermData {
  id: string;
  type: "setTermData";
  payload: {
    term: string;
    data: TermCourseData;
  };
}

export interface GenerateScheduleWorkerResponse {
  id: string;
  type: "result";
  payload: ScheduleData;
}

export interface GenerateScheduleWorkerProgress {
  id: string;
  type: "progress";
  payload: {
    processed: number;
    total: number;
  };
}

export interface GenerateScheduleWorkerError {
  id: string;
  type: "error";
  payload: {
    message: string;
  };
}

export interface GenerateScheduleWorkerCancel {
  id: string;
  type: "cancel";
}

export type GenerateScheduleWorkerMessage =
  | GenerateScheduleWorkerRequest
  | GenerateScheduleWorkerSetTermData
  | GenerateScheduleWorkerResponse
  | GenerateScheduleWorkerProgress
  | GenerateScheduleWorkerError
  | GenerateScheduleWorkerCancel;
