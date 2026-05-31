import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { setLocale } from '$lib/i18n';
import { STORAGE_KEYS } from '$lib/storage/keys';
import type { ScheduleData } from '$lib/types';
import SaveScheduleDialog from './SaveScheduleDialog.svelte';

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

const props = (overrides: Partial<Record<string, unknown>> = {}) => ({
	open: true,
	onClose: vi.fn(),
	onSaved: vi.fn(),
	term: '2025-2026 Fall',
	selectedCourses: ['MATH 101'],
	scheduleData,
	blockedHours: [],
	activeScheduleIndex: 0,
	orConnections: {},
	...overrides
});

describe('SaveScheduleDialog', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		localStorage.clear();
		setLocale('en');
	});

	it('requires a non-empty schedule name before saving', async () => {
		const user = userEvent.setup();
		const onSaved = vi.fn();
		render(SaveScheduleDialog, { props: props({ onSaved }) });

		const nameInput = await screen.findByLabelText('Schedule Name');
		await waitFor(() => expect(nameInput).not.toHaveValue(''));
		await user.clear(nameInput);
		await user.click(screen.getByRole('button', { name: 'Save' }));

		expect(await screen.findByText('Schedule name is required')).toBeInTheDocument();
		expect(onSaved).not.toHaveBeenCalled();
		expect(localStorage.getItem(STORAGE_KEYS.SAVED_SCHEDULES)).toBeNull();
	});

	it('saves the named schedule and closes the dialog', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onSaved = vi.fn();
		render(SaveScheduleDialog, { props: props({ onClose, onSaved }) });

		const nameInput = await screen.findByLabelText('Schedule Name');
		await fireEvent.input(nameInput, { target: { value: 'Exam-safe plan' } });
		expect(nameInput).toHaveValue('Exam-safe plan');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ name: 'Exam-safe plan' }));
		expect(onClose).toHaveBeenCalledOnce();
		expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_SCHEDULES) || '[]')).toMatchObject([
			{ name: 'Exam-safe plan', selectedCourses: ['MATH 101'] }
		]);
	});

	it('surfaces storage availability errors when localStorage throws', async () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('full', 'QuotaExceededError');
		});

		render(SaveScheduleDialog, { props: props() });

		expect(await screen.findByText(/Storage Error: Storage quota exceeded/)).toBeInTheDocument();
	});
});
