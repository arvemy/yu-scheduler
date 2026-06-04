import type {
	CourseEntry,
	GenerateScheduleRequest,
	ScheduleData,
	SessionData,
	Schedule,
	WarningInfo
} from '$lib/types';
import { ErrorCodes, WarningCodes, ERROR_MESSAGES } from '$lib/scheduler/errorCodes';
import {
	buildAllCoursesExcludedWarning,
	buildEligibleSections,
	buildOptionExclusionWarnings,
	buildWarnings,
	createScheduleData,
	createSpecificCourseConflictWarning,
	createTimeConflictsWarning,
	createWarning,
	filterEligibleCourses,
	generateValidSchedules,
	normalizeBlockedHours
} from '$lib/scheduler/helpers';
import { CONFLICT_SAMPLE_LIMIT } from '$lib/scheduler/constants';

const eligibleSectionsCache = new WeakMap<object, ReturnType<typeof buildEligibleSections>>();

const getEligibleSections = (
	data: Record<string, SessionData[]>
): ReturnType<typeof buildEligibleSections> => {
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

const MAX_OPTION_COMBINATIONS = 96;

// Headlines that speak for the whole request ("none of your courses could be
// scheduled"). They get recorded against every option in a failed combination, so
// they must be stripped before reusing per-option warnings to explain a single
// OR-group option that failed coverage — its sibling options may still be schedulable.
const ALL_COURSES_HEADLINE_CODES = new Set<string>([
	WarningCodes.ALL_COURSES_EXCLUDED,
	WarningCodes.ALL_COURSES_NO_DATA,
	WarningCodes.ALL_COURSES_BLOCKED
]);

const warningKey = (warning: WarningInfo): string =>
	`${warning.code}|${warning.message}|${JSON.stringify(warning.params ?? {})}`;

const uniqueWarnings = (warnings: WarningInfo[]): WarningInfo[] => {
	const seen = new Set<string>();
	const deduped: WarningInfo[] = [];

	for (const warning of warnings) {
		const key = warningKey(warning);
		if (seen.has(key)) continue;
		seen.add(key);
		deduped.push(warning);
	}

	return deduped;
};

const optionKey = (option: CourseEntry): string =>
	JSON.stringify([option.course, option.section ?? null]);

const scheduleKey = (schedule: Schedule): string =>
	schedule.sections.map((section) => `${section.course}|${section.section}`).join('::');

export const generateScheduleFromData = (
	req: GenerateScheduleRequest,
	data: Record<string, SessionData[]>,
	options: GenerateScheduleOptions = {}
): ScheduleData => {
	const selectedCourses = req.courses ?? [];
	const optionGroups = Array.isArray(req.course_option_groups) ? req.course_option_groups : [];

	const eligibleSections = getEligibleSections(data);
	const blockedHours = req.blocked_hours ?? [];
	const blockedSet = normalizeBlockedHours(blockedHours);

	const courseHasMissingData = (course: string): boolean =>
		!eligibleSections[course] || eligibleSections[course].length === 0;

	const buildStaleSectionWarnings = (
		excludedCourses: string[],
		warningCodes: WarningInfo[]
	): WarningInfo[] => {
		const warnedCourses = new Set(
			warningCodes
				.map((warning) => warning.params?.course)
				.filter((course): course is string => typeof course === 'string')
		);

		return excludedCourses
			.filter((course) => !courseHasMissingData(course) && !warnedCourses.has(course))
			.map((course) => createWarning(WarningCodes.OPTION_NOT_SCHEDULABLE, { course }));
	};

	const runForCourses = (courses: CourseEntry[]): ScheduleData => {
		if (courses.length === 0) {
			return createScheduleData([], [ERROR_MESSAGES[ErrorCodes.NO_COURSES_SELECTED]], []);
		}

		const { validCourses, filteredSections, excludedCourses, courseConflicts } =
			filterEligibleCourses(courses, eligibleSections, blockedSet);
		const blockingExcludedCourses = excludedCourses.filter(
			(course) => !courseHasMissingData(course)
		);

		const { warnings, warningCodes } = buildWarnings(
			excludedCourses,
			courseConflicts,
			eligibleSections
		);
		warningCodes.push(...buildStaleSectionWarnings(excludedCourses, warningCodes));

		if (validCourses.length === 0 || blockingExcludedCourses.length > 0) {
			if (validCourses.length === 0) {
				const headline = buildAllCoursesExcludedWarning(
					excludedCourses,
					eligibleSections,
					courseConflicts
				);
				if (headline) warningCodes.push(headline);
			}

			return createScheduleData([], warnings, uniqueWarnings(warningCodes));
		}

		const { validSchedules, conflictPairs } = generateValidSchedules(
			validCourses,
			filteredSections,
			options.onProgress,
			options.shouldCancel
		);

		if (validSchedules.length === 0) {
			if (conflictPairs.length > 0) {
				const conflictDetails: Record<string, string>[] = [];
				const seenCoursePairs = new Set<string>();

				for (const conflict of conflictPairs.slice(0, CONFLICT_SAMPLE_LIMIT)) {
					const { course1, section1, time1, course2, section2, time2, day } = conflict;
					const coursePairKey = [course1, course2].sort().join('|');
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

		return createScheduleData(validSchedules, warnings, uniqueWarnings(warningCodes));
	};

	// Without option groups, every non-missing selected course is mandatory.
	if (optionGroups.length === 0) {
		return runForCourses(selectedCourses);
	}

	// Normalize option groups (remove empty/invalid entries).
	const normalizedGroups = optionGroups
		.map((group) => ({
			options: (Array.isArray(group?.options) ? group.options : []).filter(
				(entry) => entry && typeof entry.course === 'string' && entry.course.trim().length > 0
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

	const optionMissingWarnings: WarningInfo[] = [];
	const activeGroups = normalizedGroups
		.map((group) => {
			const activeOptions: CourseEntry[] = [];
			for (const opt of group.options) {
				if (courseHasMissingData(opt.course)) {
					optionMissingWarnings.push(
						...buildOptionExclusionWarnings(opt, eligibleSections, blockedSet)
					);
				} else {
					activeOptions.push(opt);
				}
			}
			return { options: activeOptions };
		})
		.filter((group) => group.options.length > 0);

	const appendWarnings = (result: ScheduleData, warnings: WarningInfo[]): ScheduleData => {
		const warningCodes = uniqueWarnings([...(result.warning_codes ?? []), ...warnings]);
		return {
			...result,
			warning_codes: warningCodes,
			warnings: warningCodes.map((warning) => warning.message)
		};
	};

	if (activeGroups.length === 0) {
		const result = baseCourses.length > 0 ? runForCourses(baseCourses) : null;
		if (result) return appendWarnings(result, optionMissingWarnings);
		const warningCodes = uniqueWarnings([
			...optionMissingWarnings,
			...(optionMissingWarnings.length > 1 ? [createWarning(WarningCodes.ALL_COURSES_NO_DATA)] : [])
		]);
		return createScheduleData([], [], warningCodes);
	}

	// Explore combinations to find all valid schedules across the option groups.
	let referenceResult: ScheduleData | null = null;

	const allValidSchedules: Schedule[] = [];
	const seenScheduleKeys = new Set<string>();
	const successfulOptionKeys = new Set<string>();
	const successfulWarnings: WarningInfo[] = [];
	const failedWarningsByOptionKey = new Map<string, WarningInfo[]>();
	const failedWarnings: WarningInfo[] = [];
	const processedCombinationKeys = new Set<string>();
	let firstSuccessfulPick: CourseEntry[] | null = null;

	const pick: CourseEntry[] = activeGroups.map((g) => g.options[0]);

	const combinationKey = (combination: CourseEntry[]): string =>
		combination.map((entry) => optionKey(entry)).join('||');

	const processCombination = (combination: CourseEntry[]): boolean => {
		if (options.shouldCancel?.()) return false;

		const key = combinationKey(combination);
		if (processedCombinationKeys.has(key)) return false;
		processedCombinationKeys.add(key);

		const result = runForCourses([...baseCourses, ...combination]);
		if (!referenceResult) referenceResult = result;

		if (result.schedules.length > 0) {
			for (const schedule of result.schedules) {
				const key = scheduleKey(schedule);
				if (seenScheduleKeys.has(key)) continue;
				seenScheduleKeys.add(key);
				allValidSchedules.push(schedule);
			}
			if (!firstSuccessfulPick) firstSuccessfulPick = [...combination];
			successfulWarnings.push(...(result.warning_codes ?? []));
			for (const entry of combination) successfulOptionKeys.add(optionKey(entry));
			return true;
		}

		const resultWarnings = result.warning_codes ?? [];
		failedWarnings.push(...resultWarnings);
		for (const entry of combination) {
			const key = optionKey(entry);
			const existing = failedWarningsByOptionKey.get(key) ?? [];
			existing.push(...resultWarnings);
			failedWarningsByOptionKey.set(key, existing);
		}
		return true;
	};

	let boundedCombinationsProcessed = 0;
	const dfs = (depth: number) => {
		if (options.shouldCancel?.()) return;
		if (boundedCombinationsProcessed >= MAX_OPTION_COMBINATIONS) return;

		if (depth >= activeGroups.length) {
			if (processCombination([...pick])) {
				boundedCombinationsProcessed += 1;
			}
			return;
		}

		const group = activeGroups[depth];
		for (const opt of group.options) {
			pick[depth] = opt;
			dfs(depth + 1);
			if (boundedCombinationsProcessed >= MAX_OPTION_COMBINATIONS) break;
		}
	};

	dfs(0);

	const coverageBasePick = firstSuccessfulPick ?? activeGroups.map((group) => group.options[0]);
	for (let groupIndex = 0; groupIndex < activeGroups.length; groupIndex += 1) {
		for (const opt of activeGroups[groupIndex].options) {
			if (options.shouldCancel?.()) break;
			const coveragePick = [...coverageBasePick];
			coveragePick[groupIndex] = opt;
			processCombination(coveragePick);
		}
	}

	const findOptionCoverage = (groupIndex: number, option: CourseEntry): boolean => {
		const key = optionKey(option);
		if (successfulOptionKeys.has(key)) return true;

		const maxAttempts = MAX_OPTION_COMBINATIONS;
		let attempts = 0;
		let capped = false;
		const forcedPick = activeGroups.map((group) => group.options[0]);
		forcedPick[groupIndex] = option;

		const search = (depth: number) => {
			if (successfulOptionKeys.has(key) || options.shouldCancel?.() || capped) return;

			if (depth >= activeGroups.length) {
				if (attempts >= maxAttempts) {
					capped = true;
					return;
				}
				attempts += 1;
				processCombination([...forcedPick]);
				return;
			}

			if (depth === groupIndex) {
				forcedPick[depth] = option;
				search(depth + 1);
				return;
			}

			for (const candidate of activeGroups[depth].options) {
				forcedPick[depth] = candidate;
				search(depth + 1);
				if (successfulOptionKeys.has(key) || capped) return;
			}
		};

		search(0);
		return successfulOptionKeys.has(key) || capped;
	};

	const dataBackedOptions = new Map<string, { option: CourseEntry; groupIndex: number }>();
	for (let groupIndex = 0; groupIndex < activeGroups.length; groupIndex += 1) {
		for (const opt of activeGroups[groupIndex].options) {
			const key = optionKey(opt);
			if (!dataBackedOptions.has(key)) {
				dataBackedOptions.set(key, { option: opt, groupIndex });
			}
		}
	}

	const uncoveredOptionWarnings: WarningInfo[] = [];
	for (const [key, { option: opt, groupIndex }] of dataBackedOptions) {
		if (successfulOptionKeys.has(key)) continue;
		if (findOptionCoverage(groupIndex, opt)) continue;

		const warningsForOption = (failedWarningsByOptionKey.get(key) ?? []).filter(
			(warning) => !ALL_COURSES_HEADLINE_CODES.has(warning.code)
		);
		uncoveredOptionWarnings.push(
			...(warningsForOption.length > 0
				? warningsForOption
				: buildOptionExclusionWarnings(opt, eligibleSections, blockedSet))
		);
	}

	const blockingWarnings = uniqueWarnings([...optionMissingWarnings, ...uncoveredOptionWarnings]);
	if (uncoveredOptionWarnings.length > 0) {
		return createScheduleData([], [], blockingWarnings);
	}

	if (allValidSchedules.length > 0) {
		const reference = referenceResult!;
		const warningCodes = uniqueWarnings([...optionMissingWarnings, ...successfulWarnings]);
		return {
			schedules: allValidSchedules,
			warnings: warningCodes.map((warning) => warning.message),
			warning_codes: warningCodes,
			time_slots: reference.time_slots,
			days_of_week: reference.days_of_week
		};
	}

	return createScheduleData([], [], uniqueWarnings([...optionMissingWarnings, ...failedWarnings]));
};
