import type {
  BlockedHour,
  CourseEntry,
  Schedule,
  ScheduleData,
  SectionInfo,
  SessionData,
  WarningInfo
} from "$lib/types";
import {
  DAYS_OF_WEEK,
  DAY_MAP,
  TERM_SUFFIX,
  TIME_SLOTS,
  MAX_CONFLICT_PAIRS,
  PROGRESS_BATCH_SIZE
} from "$lib/scheduler/constants";
import { WARNING_MESSAGES, WarningCodes } from "$lib/scheduler/errorCodes";

type EligibleSections = Record<string, Array<[string, SessionData[]]>>;

type CourseConflictDetail = {
  day: string;
  slot: string;
  session_time: string;
  classroom: string;
};

type CourseConflictMap = Record<string, CourseConflictDetail[] | Record<string, CourseConflictDetail[]>>;

/**
 * Represents a time conflict between two course sections.
 */
export interface ConflictPair {
  /** First course code */
  course1: string;
  /** First course section */
  section1: string;
  /** First course time range (e.g., "09:40-10:30") */
  time1: string;
  /** Second course code */
  course2: string;
  /** Second course section */
  section2: string;
  /** Second course time range */
  time2: string;
  /** Day of the conflict */
  day: string;
}

export const ensureSuffixes = (suffixes: string[] | string): string[] =>
  Array.isArray(suffixes) ? suffixes : [suffixes];

export const expandSuffixVariants = (suffixes: string[]): string[] => {
  const seen: string[] = [];
  for (const s of suffixes) {
    if (seen.includes(s)) continue;
    seen.push(s);
    if (!s.startsWith("_") && !s.startsWith("-")) {
      for (const v of [s, `_${s}`, `-${s}`]) {
        if (!seen.includes(v)) seen.push(v);
      }
    }
  }
  return seen;
};

export const findMatchingSuffix = (filename: string, suffixes: string[]): string | null => {
  const variants = expandSuffixVariants(ensureSuffixes(suffixes));
  for (const s of variants) {
    if (filename.endsWith(s)) return s;
  }
  return null;
};

export const getTermNameFromFile = (filename: string): string => {
  const match = findMatchingSuffix(filename, TERM_SUFFIX);
  if (match) {
    let base = filename.slice(0, -match.length);
    base = base.replace(/[_-]+$/, "");
    const season = match.replace(".json", "").replace(/^[_-]+/, "");
    const readableBase = base.replace(/_/g, "-").replace(/^-+|-+$/g, "");
    return `${readableBase} ${season.charAt(0).toUpperCase()}${season.slice(1)}`.trim();
  }
  const base = filename.replace(/\.json$/, "");
  return base.replace(/_/g, "-").replace(/^-+|-+$/g, "");
};

export const getFileFromTerm = (term: string): string => {
  const parts = term.trim().split(/\s+/);
  const knownSeasons = new Set(TERM_SUFFIX.map((s) => s.replace(".json", "").toLowerCase()));
  const seasonCandidate = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  const baseParts = seasonCandidate && knownSeasons.has(seasonCandidate) ? parts.slice(0, -1) : parts;
  const season = seasonCandidate && knownSeasons.has(seasonCandidate) ? seasonCandidate : "";
  const base = baseParts.join(" ").toLowerCase().replace(/\s+/g, "").replace(/_/g, "-");
  if (season) {
    return `${base}_${season}.json`;
  }
  return `${base}.json`;
};

export const mapDaysToEnglish = (data: Record<string, SessionData[]>): Record<string, SessionData[]> => {
  for (const sessions of Object.values(data)) {
    for (const session of sessions) {
      const day = session.Day ?? undefined;
      if (day && DAY_MAP[day]) {
        session.Day = DAY_MAP[day];
      }
    }
  }
  return data;
};

export const timeToMinutes = (timeStr: string | null | undefined): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  if (parts.length !== 2) return 0;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
};

export const buildEligibleSections = (data: Record<string, SessionData[]>): EligibleSections => {
  const courses: Record<string, Record<string, SessionData[]>> = {};
  for (const [courseCode, sessions] of Object.entries(data)) {
    for (const session of sessions) {
      const section = session.Section;
      if (!courses[courseCode]) courses[courseCode] = {};
      if (!courses[courseCode][section]) courses[courseCode][section] = [];
      courses[courseCode][section].push(session);
    }
  }

  const eligibleSections: EligibleSections = {};
  for (const [courseCode, sections] of Object.entries(courses)) {
    eligibleSections[courseCode] = [];
    for (const [section, sessions] of Object.entries(sections)) {
      const hasAllSessions = sessions.every(
        (session) => session.Day && session["Start Time"] && session["End Time"]
      );
      if (hasAllSessions) {
        eligibleSections[courseCode].push([section, sessions]);
      }
    }
  }
  return eligibleSections;
};

export const sessionOverlapsBlocked = (session: SessionData, blockedSet: Set<string>): boolean => {
  const sessStart = timeToMinutes(session["Start Time"]);
  const sessEnd = timeToMinutes(session["End Time"]);
  if (!sessStart || !sessEnd) return false;
  for (const entry of blockedSet) {
    const [day, slot] = entry.split("|");
    if (!day || !slot || session.Day !== day) continue;
    const [slotStart, slotEnd] = slot.split("-");
    const slotStartMin = timeToMinutes(slotStart);
    const slotEndMin = timeToMinutes(slotEnd);
    if (!slotStartMin || !slotEndMin) continue;
    if (sessStart < slotEndMin && slotStartMin < sessEnd) return true;
  }
  return false;
};

export const checkNoOverlaps = (allSessions: SessionData[]): boolean => {
  const sessionsByDay: Record<string, Array<[number, number]>> = {};
  for (const session of allSessions) {
    const day = session.Day;
    if (!day) continue;
    const start = timeToMinutes(session["Start Time"]);
    const end = timeToMinutes(session["End Time"]);
    if (!start || !end) continue;
    if (!sessionsByDay[day]) sessionsByDay[day] = [];
    sessionsByDay[day].push([start, end]);
  }

  for (const daySessions of Object.values(sessionsByDay)) {
    daySessions.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < daySessions.length; i += 1) {
      if (daySessions[i][0] < daySessions[i - 1][1]) {
        return false;
      }
    }
  }
  return true;
};

export const identifyConflictingHours = (
  course: string,
  eligibleSections: EligibleSections,
  blockedSet: Set<string>
): Record<string, CourseConflictDetail[]> => {
  const conflicts: Record<string, CourseConflictDetail[]> = {};
  const sections = eligibleSections[course] ?? [];
  for (const [section, sessions] of sections) {
    for (const session of sessions) {
      for (const entry of blockedSet) {
        const [day, slot] = entry.split("|");
        if (!day || !slot || session.Day !== day) continue;
        const [slotStart, slotEnd] = slot.split("-");
        const sessStart = session["Start Time"] ?? "";
        const sessEnd = session["End Time"] ?? "";
        if (!(sessEnd <= slotStart || sessStart >= slotEnd)) {
          if (!conflicts[section]) conflicts[section] = [];
          conflicts[section].push({
            day,
            slot,
            session_time: `${sessStart}-${sessEnd}`,
            classroom: session.Classroom ?? "Unknown"
          });
        }
      }
    }
  }
  return conflicts;
};

export const filterEligibleCourses = (
  selectedCourses: CourseEntry[],
  eligibleSections: EligibleSections,
  blockedSet: Set<string>
): {
  validCourses: string[];
  filteredSections: EligibleSections;
  excludedCourses: string[];
  courseConflicts: CourseConflictMap;
} => {
  const validCourses: string[] = [];
  const filteredSections: EligibleSections = {};
  const excludedCourses: string[] = [];
  const courseConflicts: CourseConflictMap = {};

  for (const courseEntry of selectedCourses) {
    const course = courseEntry.course;
    const sectionChoice = courseEntry.section ?? undefined;
    if (!eligibleSections[course]) {
      excludedCourses.push(course);
      continue;
    }
    const filtered: Array<[string, SessionData[]]> = [];
    const conflicts = identifyConflictingHours(course, eligibleSections, blockedSet);

    if (sectionChoice) {
      for (const [section, sessions] of eligibleSections[course]) {
        if (section === sectionChoice) {
          if (!sessions.some((session) => sessionOverlapsBlocked(session, blockedSet))) {
            filtered.push([section, sessions]);
          } else {
            courseConflicts[course] = conflicts[section] ?? [];
          }
          break;
        }
      }
    } else {
      let hasConflicts = false;
      for (const [section, sessions] of eligibleSections[course]) {
        if (!sessions.some((session) => sessionOverlapsBlocked(session, blockedSet))) {
          filtered.push([section, sessions]);
        } else {
          hasConflicts = true;
        }
      }
      if (hasConflicts && filtered.length === 0) {
        courseConflicts[course] = conflicts;
      }
    }

    if (filtered.length > 0) {
      validCourses.push(course);
      filteredSections[course] = filtered;
    } else {
      excludedCourses.push(course);
    }
  }

  return { validCourses, filteredSections, excludedCourses, courseConflicts };
};

export const generateValidSchedules = (
  validCourses: string[],
  filteredSections: EligibleSections,
  onProgress?: (processed: number, total: number) => void,
  shouldCancel?: () => boolean
): { validSchedules: Schedule[]; conflictPairs: ConflictPair[] } => {
  const validSchedules: Schedule[] = [];
  const conflictPairs: ConflictPair[] = [];

  if (validCourses.length === 0) {
    return { validSchedules, conflictPairs };
  }

  type SessionInterval = {
    day: string;
    start: number;
    end: number;
    startStr: string;
    endStr: string;
  };

  type SectionOption = {
    section: string;
    sessions: SessionData[];
    intervals: SessionInterval[];
  };

  type CourseOptions = {
    course: string;
    originalIndex: number;
    options: SectionOption[];
  };

  type OccupiedInterval = SessionInterval & { course: string; section: string };

  const courseOptions: CourseOptions[] = validCourses
    .map((course, originalIndex) => {
      const options: SectionOption[] = (filteredSections[course] ?? []).map(([section, sessions]) => {
        const intervals: SessionInterval[] = [];
        for (const session of sessions) {
          const day = session.Day ?? "";
          const startStr = session["Start Time"] ?? "";
          const endStr = session["End Time"] ?? "";
          if (!day || !startStr || !endStr) continue;
          const start = timeToMinutes(startStr);
          const end = timeToMinutes(endStr);
          if (!start || !end || end <= start) continue;
          intervals.push({ day, start, end, startStr, endStr });
        }
        return { section, sessions, intervals };
      });
      return { course, originalIndex, options };
    })
    .sort((a, b) => a.options.length - b.options.length || a.originalIndex - b.originalIndex);

  const counts = courseOptions.map((entry) => entry.options.length);
  const totalCombinations = counts.reduce((acc, count) => acc * count, 1);

  const tailProducts: number[] = Array.from({ length: counts.length }, () => 1);
  for (let i = counts.length - 2; i >= 0; i -= 1) {
    tailProducts[i] = tailProducts[i + 1] * counts[i + 1];
  }

  const occupiedByDay: Record<string, OccupiedInterval[]> = {};
  const chosenByOriginalIndex: Array<{ course: string; section: string; sessions: SessionData[] } | null> =
    Array.from({ length: validCourses.length }, () => null);

  const conflictKeys = new Set<string>();

  const recordConflict = (
    existing: OccupiedInterval,
    course2: string,
    section2: string,
    interval2: SessionInterval
  ) => {
    if (conflictPairs.length >= MAX_CONFLICT_PAIRS) return;

    const time1 = `${existing.startStr}-${existing.endStr}`;
    const time2 = `${interval2.startStr}-${interval2.endStr}`;
    const left = `${existing.course}|${existing.section}|${time1}`;
    const right = `${course2}|${section2}|${time2}`;
    const [a, b] = left < right ? [left, right] : [right, left];
    const key = `${a}__${b}__${existing.day}`;
    if (conflictKeys.has(key)) return;
    conflictKeys.add(key);

    conflictPairs.push({
      course1: existing.course,
      section1: existing.section,
      time1,
      course2,
      section2,
      time2,
      day: existing.day
    });
  };

  let processed = 0;
  let lastProgress = 0;
  const maybeReportProgress = () => {
    if (!onProgress) return;
    if (processed === totalCombinations) {
      onProgress(processed, totalCombinations);
      return;
    }
    if (processed - lastProgress >= PROGRESS_BATCH_SIZE) {
      lastProgress = processed;
      onProgress(processed, totalCombinations);
    }
  };

  const overlaps = (a: SessionInterval, b: SessionInterval): boolean =>
    a.start < b.end && b.start < a.end;

  const hasConflict = (course: string, option: SectionOption): boolean => {
    for (const interval of option.intervals) {
      const list = occupiedByDay[interval.day];
      if (!list || list.length === 0) continue;
      for (const existing of list) {
        if (existing.course === course) continue;
        if (!overlaps(existing, interval)) continue;
        recordConflict(existing, course, option.section, interval);
        return true;
      }
    }
    return false;
  };

  const addOption = (course: string, option: SectionOption) => {
    for (const interval of option.intervals) {
      const list = occupiedByDay[interval.day] ?? (occupiedByDay[interval.day] = []);
      list.push({ ...interval, course, section: option.section });
    }
  };

  const removeOption = (option: SectionOption) => {
    for (const interval of option.intervals) {
      const list = occupiedByDay[interval.day];
      if (!list || list.length === 0) continue;
      list.pop();
      if (list.length === 0) delete occupiedByDay[interval.day];
    }
  };

  const dfs = (depth: number): boolean => {
    if (shouldCancel && shouldCancel()) return false;

    if (depth >= courseOptions.length) {
      const sections: SectionInfo[] = [];
      for (const entry of chosenByOriginalIndex) {
        if (!entry) continue;
        sections.push({
          course: entry.course,
          section: entry.section,
          sessions: entry.sessions
        });
      }
      validSchedules.push({ sections });
      processed += 1;
      maybeReportProgress();
      return true;
    }

    const { course, originalIndex, options } = courseOptions[depth];
    for (const option of options) {
      if (shouldCancel && shouldCancel()) return false;

      if (hasConflict(course, option)) {
        processed += tailProducts[depth] ?? 1;
        maybeReportProgress();
        continue;
      }

      addOption(course, option);
      chosenByOriginalIndex[originalIndex] = {
        course,
        section: option.section,
        sessions: option.sessions
      };

      const ok = dfs(depth + 1);

      chosenByOriginalIndex[originalIndex] = null;
      removeOption(option);

      if (!ok) return false;
    }

    return true;
  };

  dfs(0);

  if (onProgress) {
    onProgress(processed, totalCombinations);
  }

  return { validSchedules, conflictPairs };
};

const formatWarningMessage = (code: string, params: Record<string, unknown>): string => {
  const template = WARNING_MESSAGES[code] ?? "Unknown warning";
  try {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = params[key];
      return value === undefined || value === null ? match : String(value);
    });
  } catch {
    return template;
  }
};

export const createWarning = (code: string, params: Record<string, unknown> = {}): WarningInfo => ({
  code,
  message: formatWarningMessage(code, params),
  params
});

export const createCourseNotAvailableWarning = (course: string): WarningInfo =>
  createWarning(WarningCodes.COURSE_NOT_AVAILABLE, { course });

export const createCourseBlockedHoursSpecificWarning = (course: string): WarningInfo =>
  createWarning(WarningCodes.TIME_CONFLICT_WITH_BLOCKED_HOURS, { course });

export const createCourseBlockedHoursDetailedWarning = (course: string, blockedHours: string): WarningInfo =>
  createWarning(WarningCodes.TIME_CONFLICT_WITH_SPECIFIC_BLOCKED_HOURS, {
    course,
    blocked_hours: blockedHours
  });

export const createTimeConflictsWarning = (conflicts: Record<string, string>[] = []): WarningInfo =>
  createWarning(WarningCodes.TIME_CONFLICTS, conflicts.length ? { conflicts } : {});

export const createSpecificCourseConflictWarning = (course1: string, course2: string): WarningInfo =>
  createWarning(WarningCodes.TIME_CONFLICT_BETWEEN_COURSES, { course1, course2 });

export const buildWarnings = (
  excludedCourses: string[],
  courseConflicts: CourseConflictMap,
  blockedHours: BlockedHour[],
  conflictPairs: ConflictPair[],
  eligibleSections: EligibleSections
): { warnings: string[]; warningCodes: WarningInfo[] } => {
  const warnings: string[] = [];
  const warningCodes: WarningInfo[] = [];

  const summarizeBlockedHours = (
    conflicts: CourseConflictDetail[] | Record<string, CourseConflictDetail[]>
  ): string | null => {
    const dayConflicts: Record<string, string[]> = {};
    const entries = Array.isArray(conflicts) ? [conflicts] : Object.values(conflicts);
    for (const sectionConflicts of entries) {
      for (const conflict of sectionConflicts) {
        if (!dayConflicts[conflict.day]) dayConflicts[conflict.day] = [];
        dayConflicts[conflict.day].push(conflict.slot);
      }
    }

    const conflictDetails: string[] = [];
    for (const [day, slots] of Object.entries(dayConflicts)) {
      const uniqueSlots = Array.from(new Set(slots)).sort();
      conflictDetails.push(`${day} ${uniqueSlots.join(", ")}`);
    }

    return conflictDetails.length ? conflictDetails.join(", ") : null;
  };

  if (excludedCourses.length > 0) {
    for (const course of excludedCourses) {
      if (!eligibleSections[course] || eligibleSections[course].length === 0) {
        warningCodes.push(createCourseNotAvailableWarning(course));
      } else {
        const courseConflictInfo = courseConflicts[course];
        if (courseConflictInfo) {
          const blockedHoursText = summarizeBlockedHours(courseConflictInfo);
          if (blockedHoursText) {
            warningCodes.push(createCourseBlockedHoursDetailedWarning(course, blockedHoursText));
          } else {
            warningCodes.push(createCourseBlockedHoursSpecificWarning(course));
          }
        }
      }
    }
  }

  return { warnings, warningCodes };
};

export const buildAllCoursesExcludedWarning = (blockedSet: Set<string>): WarningInfo => {
  if (blockedSet.size === 0) {
    return createWarning(WarningCodes.ALL_COURSES_EXCLUDED);
  }

  const blockedByDay: Record<string, string[]> = {};
  for (const entry of blockedSet) {
    const [day, slot] = entry.split("|");
    if (!day || !slot) continue;
    if (!blockedByDay[day]) blockedByDay[day] = [];
    blockedByDay[day].push(slot);
  }

  const blockedSummary = Object.entries(blockedByDay).map(([day, slots]) =>
    `${day}: ${Array.from(new Set(slots)).sort().join(", ")}`
  );

  return createWarning(WarningCodes.ALL_COURSES_EXCLUDED, {
    blocked_summary: blockedSummary.join("; ")
  });
};

export const createScheduleData = (
  schedules: Schedule[],
  warnings: string[],
  warningCodes: WarningInfo[]
): ScheduleData => ({
  schedules,
  warnings: warnings.length ? warnings : warningCodes.map((warning) => warning.message),
  warning_codes: warningCodes,
  time_slots: TIME_SLOTS,
  days_of_week: DAYS_OF_WEEK
});

export const normalizeBlockedHours = (blockedHours: BlockedHour[]): Set<string> => {
  const blockedSet = new Set<string>();
  for (const block of blockedHours) {
    if (DAYS_OF_WEEK.includes(block.day) && TIME_SLOTS.includes(block.slot)) {
      blockedSet.add(`${block.day}|${block.slot}`);
    }
  }
  return blockedSet;
};
