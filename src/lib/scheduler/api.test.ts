import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SessionData } from '$lib/types';

const TERM_INDEX = [{ term: '2025-2026 Fall', file: '2025-2026_fall.json' }];

const TERM_DATA: Record<string, SessionData[]> = {
	'MATH 101': [
		{ Day: 'Monday', 'Start Time': '09:40', 'End Time': '10:30', Section: '01', Classroom: 'A1' }
	],
	'PHYS 101': [
		{ Day: 'Tuesday', 'Start Time': '10:40', 'End Time': '11:30', Section: '01', Classroom: 'B2' }
	]
};

/** A fetch mock that serves the term index and term data, 404 for anything else. */
const makeFetch = (overrides: { indexStatus?: number } = {}) =>
	vi.fn((url: string | URL) => {
		const href = String(url);
		if (href.endsWith('/data/terms/index.json')) {
			return Promise.resolve(
				new Response(JSON.stringify(TERM_INDEX), { status: overrides.indexStatus ?? 200 })
			);
		}
		if (href.endsWith('/data/terms/2025-2026_fall.json')) {
			return Promise.resolve(new Response(JSON.stringify(TERM_DATA), { status: 200 }));
		}
		return Promise.resolve(new Response('not found', { status: 404 }));
	});

// Each test re-imports the module so its in-memory caches start empty.
const importApi = () => import('./api');

describe('scheduler api (mocked fetch)', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubGlobal('fetch', makeFetch());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('listTerms resolves the term names from the manifest', async () => {
		const { listTerms } = await importApi();
		await expect(listTerms()).resolves.toEqual(['2025-2026 Fall']);
	});

	it('getCourses groups course codes by their prefix', async () => {
		const { getCourses } = await importApi();
		const courses = await getCourses('2025-2026 Fall');
		expect(courses).toEqual({
			MATH: ['MATH 101'],
			PHYS: ['PHYS 101']
		});
	});

	it('getSections maps each course to its section ids', async () => {
		const { getSections } = await importApi();
		const sections = await getSections('2025-2026 Fall');
		expect(sections).toEqual({
			'MATH 101': ['01'],
			'PHYS 101': ['01']
		});
	});

	it('loadTermData caches the second call (fetch not called again)', async () => {
		const fetchSpy = makeFetch();
		vi.stubGlobal('fetch', fetchSpy);
		const { loadTermData } = await importApi();

		await loadTermData('2025-2026 Fall');
		const callsAfterFirst = fetchSpy.mock.calls.length;
		await loadTermData('2025-2026 Fall');

		expect(fetchSpy.mock.calls.length).toBe(callsAfterFirst);
	});

	it('throws a SchedulerError with TERM_NOT_FOUND for an unknown term', async () => {
		const { loadTermData, SchedulerError } = await importApi();
		await expect(loadTermData('1999-2000 Fall')).rejects.toBeInstanceOf(SchedulerError);
		await expect(loadTermData('1999-2000 Fall')).rejects.toMatchObject({ code: 'TERM_NOT_FOUND' });
	});

	it('throws FAILED_TO_LOAD_TERMS when the manifest request fails', async () => {
		vi.stubGlobal('fetch', makeFetch({ indexStatus: 500 }));
		const { listTerms } = await importApi();
		await expect(listTerms()).rejects.toMatchObject({ code: 'FAILED_TO_LOAD_TERMS' });
	});

	it('ignores unsupported manifest files when listing terms', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn((url: string | URL) => {
				const href = String(url);
				if (href.endsWith('/data/terms/index.json')) {
					return Promise.resolve(
						new Response(
							JSON.stringify([{ term: 'Draft Import', file: 'draft.json' }, ...TERM_INDEX]),
							{ status: 200 }
						)
					);
				}
				if (href.endsWith('/data/terms/2025-2026_fall.json')) {
					return Promise.resolve(new Response(JSON.stringify(TERM_DATA), { status: 200 }));
				}
				return Promise.resolve(new Response('not found', { status: 404 }));
			})
		);

		const { listTerms } = await importApi();
		await expect(listTerms()).resolves.toEqual(['2025-2026 Fall']);
	});

	it('normalizes Turkish day names in mocked term data', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn((url: string | URL) => {
				const href = String(url);
				if (href.endsWith('/data/terms/index.json')) {
					return Promise.resolve(new Response(JSON.stringify(TERM_INDEX), { status: 200 }));
				}
				if (href.endsWith('/data/terms/2025-2026_fall.json')) {
					return Promise.resolve(
						new Response(
							JSON.stringify({
								'MATH 101': [
									{
										Day: 'PAZARTESI',
										'Start Time': '09:40',
										'End Time': '10:30',
										Section: '01',
										Classroom: 'A1'
									}
								]
							}),
							{ status: 200 }
						)
					);
				}
				return Promise.resolve(new Response('not found', { status: 404 }));
			})
		);

		const { loadTermData } = await importApi();
		const { data } = await loadTermData('2025-2026 Fall');
		expect(data['MATH 101'][0].Day).toBe('Monday');
	});
});
