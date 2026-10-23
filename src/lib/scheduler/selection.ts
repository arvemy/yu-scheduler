import type {
	BlockedHour,
	CourseEntry,
	GenerateScheduleRequest,
	ScheduleData
} from '#lib/types/index.js';
import { getTermKey } from '#lib/storage/keys.js';
import { devWarn } from '#lib/utils/logger.js';
import {
	parseStoredJson,
	validateBlockedHours,
	validateSectionChoices,
	validateSelectedCourses
} from '#lib/utils/storage.js';

/** Chosen section per course; `null` lets the engine pick any section. */
export type SectionChoices = Record<string, string | null>;

/**
 * OR connections between adjacent selected courses: `true` under a course means it
 * is OR-connected to the course after it in the selection order.
 */
export type OrConnections = Record<string, boolean>;

/**
 * Catalog course codes occasionally carry doubled internal whitespace (e.g.
 * "MOTP  2337"), while the term data uses a single space ("MOTP 2337"). Collapse
 * runs of whitespace so catalog lookups line up with term codes.
 */
export const normalizeCode = (code: string): string => code.replace(/\s+/g, ' ').trim();

/**
 * Split the selection into OR groups: each run of OR-connected adjacent courses
 * becomes one group of alternatives. Courses outside any run are left out, since
 * they are mandatory rather than alternatives. An OR flag on the last course has
 * nothing to connect to and is ignored.
 */
export const buildOptionGroups = (courses: string[], orConnections: OrConnections): string[][] => {
	const groups: string[][] = [];
	let current: string[] = [];

	courses.forEach((course, i) => {
		current.push(course);
		const connectsToNext = orConnections[course] && i < courses.length - 1;
		if (!connectsToNext) {
			if (current.length > 1) groups.push(current);
			current = [];
		}
	});

	return groups;
};

/** Inverse of {@link buildOptionGroups}: OR-connect each course to the next in its group. */
export const orConnectionsFromGroups = (groups: string[][] | undefined): OrConnections => {
	const connections: OrConnections = {};
	for (const group of groups ?? []) {
		for (const course of group.slice(0, -1)) {
			connections[course] = true;
		}
	}
	return connections;
};

/** Section choices matching the sections used by one generated schedule. */
export const sectionChoicesFromSchedule = (
	data: ScheduleData,
	scheduleIndex: number
): SectionChoices => {
	const choices: SectionChoices = {};
	for (const section of data.schedules[scheduleIndex]?.sections ?? []) {
		choices[section.course] = section.section;
	}
	return choices;
};

/** Build the engine request for a selection: OR groups become option groups. */
export const buildGenerateRequest = (
	term: string,
	courses: string[],
	sectionChoices: SectionChoices,
	blockedHours: BlockedHour[],
	orConnections: OrConnections
): GenerateScheduleRequest => {
	const toEntry = (course: string): CourseEntry => ({
		course,
		section: sectionChoices[course] || null
	});
	const optionGroups = buildOptionGroups(courses, orConnections);
	const grouped = new Set(optionGroups.flat());

	return {
		courses: courses.filter((course) => !grouped.has(course)).map(toEntry),
		course_option_groups:
			optionGroups.length > 0
				? optionGroups.map((group) => ({ options: group.map(toEntry) }))
				: undefined,
		blocked_hours: blockedHours,
		term
	};
};

/**
 * Identifies everything that feeds schedule generation, so callers can tell
 * whether a generated schedule still matches the current selection.
 */
export const selectionKey = (
	term: string | null,
	courses: string[],
	blockedHours: BlockedHour[],
	sectionChoices: SectionChoices,
	orConnections: OrConnections
): string => {
	const sorted = [...courses].sort();
	const coursesKey = sorted.map((c) => `${c}=${sectionChoices[c] ?? ''}`).join('|');
	const hoursKey = blockedHours
		.map((h) => `${h.day}|${h.slot}`)
		.sort()
		.join('|');
	// Order only matters inside OR groups (options are ranked by preference).
	const groupsKey = buildOptionGroups(courses, orConnections)
		.map((group) => group.join('>'))
		.join('|');
	return `${term ?? 'none'}::${coursesKey}::${hoursKey}::${groupsKey}`;
};

/** A term's persisted selection state; fields that are missing or invalid are omitted. */
export interface StoredTermSelection {
	selectedCourses?: string[];
	blockedHours?: BlockedHour[];
	sectionChoices?: SectionChoices;
	orConnections?: OrConnections;
	activeScheduleIndex?: number;
}

/** Read and validate a term's persisted selection state from localStorage. */
export const loadTermSelection = (term: string): StoredTermSelection => {
	const stored: StoredTermSelection = {};

	const courses = parseStoredJson(getTermKey(term, 'selectedCourses'), validateSelectedCourses);
	if (courses.success && courses.data) stored.selectedCourses = courses.data;

	const hours = parseStoredJson(getTermKey(term, 'blockedHours'), validateBlockedHours);
	if (hours.success && hours.data) stored.blockedHours = hours.data;

	const choices = parseStoredJson(getTermKey(term, 'sectionChoices'), validateSectionChoices);
	if (choices.success && choices.data) stored.sectionChoices = choices.data;

	try {
		const raw = localStorage.getItem(getTermKey(term, 'orConnections'));
		const parsed: unknown = raw ? JSON.parse(raw) : null;
		if (typeof parsed === 'object' && parsed !== null) {
			stored.orConnections = parsed as OrConnections;
		}
	} catch (err) {
		devWarn('Failed to restore OR connections', err);
	}

	try {
		const raw = localStorage.getItem(getTermKey(term, 'activeTab'));
		const index = raw === null ? Number.NaN : parseInt(raw, 10);
		if (!Number.isNaN(index)) stored.activeScheduleIndex = index;
	} catch (err) {
		devWarn('Failed to restore active tab', err);
	}

	return stored;
};
