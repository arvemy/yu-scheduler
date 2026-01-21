import type { GenerateScheduleRequest, ScheduleData, SessionData, Schedule } from "$lib/types";
import { ErrorCodes, WarningCodes, ERROR_MESSAGES } from "$lib/scheduler/errorCodes";
import {
  buildAllCoursesExcludedWarning,
  buildEligibleSections,
  buildWarnings,
  createScheduleData,
  createSpecificCourseConflictWarning,
  createTimeConflictsWarning,
  createWarning,
  filterEligibleCourses,
  generateValidSchedules,
  normalizeBlockedHours
} from "$lib/scheduler/helpers";
import { CONFLICT_SAMPLE_LIMIT } from "$lib/scheduler/constants";

const eligibleSectionsCache = new WeakMap<object, ReturnType<typeof buildEligibleSections>>();

const getEligibleSections = (data: Record<string, SessionData[]>): ReturnType<typeof buildEligibleSections> => {
  const cached = eligibleSectionsCache.get(data);
  if (cached) return cached;
  const built = buildEligibleSections(data);
  eligibleSectionsCache.set(data, built);
  return built;
};

export type GenerateScheduleOptions = {
  onProgress?: (processed: number, total: number) => void;
  shouldCancel?: () => boolean;
};

export const generateScheduleFromData = (
  req: GenerateScheduleRequest,
  data: Record<string, SessionData[]>,
  options: GenerateScheduleOptions = {}
): ScheduleData => {
  const selectedCourses = req.courses ?? [];
  const optionGroups = Array.isArray(req.course_option_groups) ? req.course_option_groups : [];

  const runForCourses = (courses: typeof selectedCourses): ScheduleData => {
    if (courses.length === 0) {
      return createScheduleData(
        [],
        [ERROR_MESSAGES[ErrorCodes.NO_COURSES_SELECTED]],
        []
      );
    }

    const eligibleSections = getEligibleSections(data);
    const blockedHours = req.blocked_hours ?? [];
    const blockedSet = normalizeBlockedHours(blockedHours);

    const { validCourses, filteredSections, excludedCourses, courseConflicts } =
      filterEligibleCourses(courses, eligibleSections, blockedSet);

    if (validCourses.length === 0) {
      const { warnings, warningCodes } = buildWarnings(
        excludedCourses,
        courseConflicts,
        blockedHours,
        [],
        eligibleSections
      );
      warningCodes.push(buildAllCoursesExcludedWarning(blockedSet));

      return createScheduleData([], warnings, warningCodes);
    }

    const { validSchedules, conflictPairs } = generateValidSchedules(
      validCourses,
      filteredSections,
      options.onProgress,
      options.shouldCancel
    );

    const { warnings, warningCodes } = buildWarnings(
      excludedCourses,
      courseConflicts,
      blockedHours,
      conflictPairs,
      eligibleSections
    );

    if (validSchedules.length === 0) {
      if (conflictPairs.length > 0) {
        const conflictDetails: Record<string, string>[] = [];
        const seenCoursePairs = new Set<string>();

        for (const conflict of conflictPairs.slice(0, CONFLICT_SAMPLE_LIMIT)) {
          const { course1, section1, time1, course2, section2, time2, day } = conflict;
          const coursePairKey = [course1, course2].sort().join("|");
          if (!seenCoursePairs.has(coursePairKey)) {
            warningCodes.push(createSpecificCourseConflictWarning(course1, course2));
            seenCoursePairs.add(coursePairKey);
          }
          conflictDetails.push({
            course1,
            section1,
            time1,
            course2,
            section2,
            time2,
            day
          });
        }

        warningCodes.push(createTimeConflictsWarning(conflictDetails));

        warningCodes.push(createWarning(WarningCodes.NO_VALID_SCHEDULE_CONFLICTS));
      } else if (blockedHours.length > 0) {
        warningCodes.push(createWarning(WarningCodes.NO_VALID_SCHEDULE_BLOCKED_HOURS));
      } else {
        warningCodes.push(createWarning(WarningCodes.NO_VALID_SCHEDULE_GENERAL));
      }
    }

    return createScheduleData(validSchedules, warnings, warningCodes);
  };

  // No option groups: keep existing behavior.
  if (optionGroups.length === 0) {
    return runForCourses(selectedCourses);
  }

  // Normalize option groups (remove empty/invalid entries).
  const normalizedGroups = optionGroups
    .map((group) => ({
      options: (Array.isArray(group?.options) ? group.options : []).filter(
        (entry) => entry && typeof entry.course === "string" && entry.course.trim().length > 0
      )
    }))
    .filter((group) => group.options.length > 0);

  if (normalizedGroups.length === 0) {
    return runForCourses(selectedCourses);
  }

  // Avoid treating grouped courses as mandatory even if the caller includes them.
  const groupedCourses = new Set<string>();
  for (const group of normalizedGroups) {
    for (const opt of group.options) groupedCourses.add(opt.course);
  }
  const baseCourses = selectedCourses.filter((entry) => !groupedCourses.has(entry.course));

  // Explore combinations to find all valid schedules across the option groups.
  const MAX_OPTION_COMBINATIONS = 96;
  let explored = 0;

  let bestResult: ScheduleData | null = null;
  let bestPick: typeof selectedCourses = [];

  const allValidSchedules: Schedule[] = [];
  const successfulOptionCourses = new Set<string>();

  const pick: typeof selectedCourses = normalizedGroups.map((g) => g.options[0]);
  const dfs = (depth: number) => {
    if (options.shouldCancel?.()) return;
    if (explored >= MAX_OPTION_COMBINATIONS) return;

    if (depth >= normalizedGroups.length) {
      explored += 1;
      const result = runForCourses([...baseCourses, ...pick]);
      
      if (result.schedules.length > 0) {
        allValidSchedules.push(...result.schedules);
        for (const p of pick) successfulOptionCourses.add(p.course);
      }

      // Keep the first result (most preferred) as a fallback/reference
      // or if it's the best one we've seen (though "best" is ambiguous if we merge)
      if (!bestResult) {
        bestResult = result;
        bestPick = [...pick];
      }
      return;
    }

    const group = normalizedGroups[depth];
    for (const opt of group.options) {
      pick[depth] = opt;
      dfs(depth + 1);
    }
  };

  dfs(0);

  // If we found any valid schedules, return them all.
  if (allValidSchedules.length > 0) {
    const extraWarnings = [] as ReturnType<typeof createWarning>[];
    for (const group of normalizedGroups) {
      for (const opt of group.options) {
        if (!successfulOptionCourses.has(opt.course)) {
          extraWarnings.push(
            createWarning(WarningCodes.NO_VALID_SCHEDULE_INCLUDING_COURSE, {
              course: opt.course
            })
          );
        }
      }
    }

    const reference = bestResult!;
    return {
      schedules: allValidSchedules,
      warnings: extraWarnings.map((w) => w.message),
      warning_codes: extraWarnings,
      time_slots: reference.time_slots,
      days_of_week: reference.days_of_week
    };
  }

  const chosen = bestPick.length ? bestPick : normalizedGroups.map((g) => g.options[0]);
  const result = bestResult ?? runForCourses([...baseCourses, ...chosen]);

  // If we had to fall back (no valid schedules found at all), logic remains similar:
  // We can try to explain why the *preferred* option failed (already in result),
  // and arguably we could hint that others failed too, but the existing error messages
  // for the specific run are usually sufficient (e.g. "Time conflict between X and Y").
  
  return result;
};
