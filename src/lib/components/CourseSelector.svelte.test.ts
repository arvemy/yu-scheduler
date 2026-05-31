import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { setLocale } from '$lib/i18n';
import { getTermKey } from '$lib/storage/keys';
import type { ScheduleData } from '$lib/types';

vi.mock('$lib', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib')>();
	return {
		...actual,
		getCourses: vi.fn(),
		getSections: vi.fn(),
		generateSchedule: vi.fn()
	};
});

import { generateSchedule, getCourses, getSections } from '$lib';
import CourseSelector from './CourseSelector.svelte';

const TERM = '2025-2026 Fall';

const scheduleData: ScheduleData = {
	schedules: [
		{
			sections: [
				{
					course: 'MATH 101',
					section: '01',
					sessions: [
						{
							Day: 'Monday',
							'Start Time': '09:40',
							'End Time': '10:30',
							Section: '01',
							Classroom: 'A1'
						}
					]
				}
			]
		}
	],
	warnings: [],
	warning_codes: [],
	time_slots: ['09:40-10:30'],
	days_of_week: ['Monday']
};

const cancelableSchedule = () => {
	const promise = Promise.resolve(scheduleData) as Promise<ScheduleData> & { cancel: () => void };
	promise.cancel = vi.fn();
	return promise;
};

const setMatchMedia = (matches: boolean) => {
	window.matchMedia = vi.fn((query: string) => ({
		matches,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}));
};

const props = (overrides: Partial<Record<string, unknown>> = {}) => ({
	term: TERM,
	selectedCourses: [],
	blockedHours: [],
	scheduleData: null,
	hasGenerated: false,
	activeScheduleIndex: 0,
	onSchedule: vi.fn(),
	onLoadSavedSchedule: vi.fn(),
	...overrides
});

describe('CourseSelector', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		localStorage.clear();
		setLocale('en');
		setMatchMedia(false);
		vi.mocked(getCourses).mockResolvedValue({
			MATH: ['MATH 101', 'MATH 102'],
			PHYS: ['PHYS 101']
		});
		vi.mocked(getSections).mockResolvedValue({
			'MATH 101': ['01', '02'],
			'MATH 102': ['01'],
			'PHYS 101': ['01']
		});
		vi.mocked(generateSchedule).mockImplementation(() => cancelableSchedule());
	});

	it('searches mocked courses, selects a course, persists it, and generates a schedule', async () => {
		const user = userEvent.setup();
		render(CourseSelector, { props: props() });

		const search = await screen.findByRole('combobox', { name: 'Type to search courses' });
		await waitFor(() => expect(getCourses).toHaveBeenCalledWith(TERM));
		await new Promise((resolve) => setTimeout(resolve, 130));
		await user.type(search, 'math');
		await user.click(await screen.findByRole('option', { name: /MATH 101/ }));

		expect(screen.getByText('MATH 101')).toBeInTheDocument();
		expect(
			screen.getByRole('combobox', { name: 'Select section for MATH 101' })
		).toBeInTheDocument();
		await waitFor(() => {
			expect(JSON.parse(localStorage.getItem(getTermKey(TERM, 'selectedCourses')) || '[]')).toEqual(
				['MATH 101']
			);
		});
		await waitFor(() => {
			expect(generateSchedule).toHaveBeenCalledWith(
				expect.objectContaining({
					courses: [{ course: 'MATH 101', section: null }],
					blocked_hours: [],
					term: TERM
				})
			);
		});
	});

	it('renders a load error when course data cannot be fetched', async () => {
		vi.mocked(getCourses).mockRejectedValue(new Error('Network unavailable'));
		render(CourseSelector, { props: props() });

		expect(await screen.findByText('Network unavailable')).toBeInTheDocument();
	});

	it('renders mobile tab controls when the viewport matches the mobile query', async () => {
		setMatchMedia(true);
		render(CourseSelector, { props: props() });

		expect(await screen.findByRole('tab', { name: 'Courses' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		expect(screen.getByRole('tab', { name: 'Schedule' })).toBeInTheDocument();
	});
});
