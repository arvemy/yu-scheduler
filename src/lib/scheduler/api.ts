import { base } from '$app/paths';
import type { CatalogData, SessionData, TermManifestEntry } from '$lib/types';
import { ErrorCodes, ERROR_MESSAGES } from '$lib/scheduler/errorCodes';
import {
	buildEligibleSections,
	findMatchingSuffix,
	getFileFromTerm,
	getTermNameFromFile,
	getYearFromTerm,
	mapDaysToEnglish
} from '$lib/scheduler/helpers';

export class SchedulerError extends Error {
	code: string;

	constructor(code: string) {
		super(ERROR_MESSAGES[code] ?? 'Unknown error');
		this.code = code;
	}
}

const termCache = new Map<string, Record<string, SessionData[]>>();
const catalogCache = new Map<string, CatalogData>();
let manifestCache: TermManifestEntry[] | null = null;

const withBase = (path: string): string => `${base}${path}`;

const fetchJson = async <T>(url: string): Promise<T> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}`);
	}
	return response.json() as Promise<T>;
};

const loadManifest = async (): Promise<TermManifestEntry[]> => {
	if (manifestCache) return manifestCache;
	const manifest = await fetchJson<TermManifestEntry[]>(withBase('/data/terms/index.json'));
	const supported = (Array.isArray(manifest) ? manifest : []).filter((entry) =>
		Boolean(
			entry &&
			typeof entry.file === 'string' &&
			findMatchingSuffix(entry.file, ['spring.json', 'summer.json', 'fall.json'])
		)
	);

	if (supported.length === 0) {
		throw new SchedulerError(ErrorCodes.NO_COURSE_DATA);
	}

	manifestCache = supported;
	return supported;
};

export const listTerms = async (): Promise<string[]> => {
	try {
		const manifest = await loadManifest();
		return manifest.map((entry) => entry.term);
	} catch (error) {
		if (error instanceof SchedulerError) throw error;
		throw new SchedulerError(ErrorCodes.FAILED_TO_LOAD_TERMS);
	}
};

export const loadTermData = async (
	term?: string | null
): Promise<{ term: string; data: Record<string, SessionData[]> }> => {
	const manifest = await loadManifest();
	let entry: TermManifestEntry | undefined;

	if (term) {
		const expectedFile = getFileFromTerm(term);
		entry = manifest.find((item) => item.file === expectedFile);
		if (!entry) {
			throw new SchedulerError(ErrorCodes.TERM_NOT_FOUND);
		}
		entry = { term: getTermNameFromFile(entry.file), file: entry.file };
	} else {
		entry = manifest[0];
	}

	if (termCache.has(entry.term)) {
		return { term: entry.term, data: termCache.get(entry.term)! };
	}

	const data = await fetchJson<Record<string, SessionData[]>>(
		withBase(`/data/terms/${entry.file}`)
	);
	const mapped = mapDaysToEnglish(data);
	termCache.set(entry.term, mapped);
	return { term: entry.term, data: mapped };
};

export const getCourses = async (term?: string | null): Promise<Record<string, string[]>> => {
	try {
		const { data } = await loadTermData(term);
		const groupedCourses: Record<string, string[]> = {};

		for (const course of Object.keys(data)) {
			if (typeof course !== 'string') continue;
			const trimmed = course.trim();
			if (!trimmed) continue;
			const parts = trimmed.split(/\s+/);
			if (parts.length < 2) continue;
			const prefix = parts[0];
			if (!groupedCourses[prefix]) groupedCourses[prefix] = [];
			groupedCourses[prefix].push(trimmed);
		}

		if (Object.keys(groupedCourses).length === 0) {
			throw new SchedulerError(ErrorCodes.NO_COURSE_DATA);
		}

		return groupedCourses;
	} catch (error) {
		if (error instanceof SchedulerError) throw error;
		throw new SchedulerError(ErrorCodes.FAILED_TO_LOAD_COURSES);
	}
};

export const getSections = async (term?: string | null): Promise<Record<string, string[]>> => {
	try {
		const { data } = await loadTermData(term);
		const eligibleSections = buildEligibleSections(data);
		const sectionMap: Record<string, string[]> = {};
		for (const [course, sections] of Object.entries(eligibleSections)) {
			sectionMap[course] = sections.map(([section]) => section);
		}
		return sectionMap;
	} catch (error) {
		if (error instanceof SchedulerError) throw error;
		throw new SchedulerError(ErrorCodes.FAILED_TO_LOAD_SECTIONS);
	}
};

const emptyCatalog = (year: string): CatalogData => ({
	academic_year: year,
	courses: {},
	programs: []
});

/**
 * Load the slim OBS catalog (course titles/credits/links + program membership)
 * for a term's academic year. Enrichment is optional, so a missing catalog
 * (e.g. a year that hasn't been crawled) resolves to an empty catalog rather
 * than throwing — the picker still works code-only.
 */
export const loadCatalog = async (term?: string | null): Promise<CatalogData> => {
	const year = term ? getYearFromTerm(term) : null;
	if (!year) return emptyCatalog('');

	const cached = catalogCache.get(year);
	if (cached) return cached;

	let catalog: CatalogData;
	try {
		catalog = await fetchJson<CatalogData>(withBase(`/data/catalog/${year}.json`));
	} catch {
		catalog = emptyCatalog(year);
	}
	catalogCache.set(year, catalog);
	return catalog;
};
