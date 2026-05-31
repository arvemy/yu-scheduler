import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { setLocale } from '$lib/i18n';
import { STORAGE_KEYS } from '$lib/storage/keys';
import type { SavedSchedule, ScheduleData } from '$lib/types';
import SavedSchedulesDialog from './SavedSchedulesDialog.svelte';

const scheduleData: ScheduleData = {
	schedules: [],
	warnings: [],
	warning_codes: [],
	time_slots: [],
	days_of_week: []
};

const savedSchedule = (overrides: Partial<SavedSchedule>): SavedSchedule => ({
	id: 'schedule-1',
	name: 'Fall Plan',
	term: '2025-2026 Fall',
	selectedCourses: ['MATH 101'],
	scheduleData,
	blockedHours: [],
	activeScheduleIndex: 0,
	savedAt: 100,
	...overrides
});

const writeSchedules = (schedules: SavedSchedule[]) => {
	localStorage.setItem(STORAGE_KEYS.SAVED_SCHEDULES, JSON.stringify(schedules));
};

describe('SavedSchedulesDialog', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
		setLocale('en');
	});

	it('filters saved schedules to the current term and loads the chosen schedule', async () => {
		const user = userEvent.setup();
		const fall = savedSchedule({ id: 'fall', name: 'Fall Plan', term: '2025-2026 Fall' });
		const spring = savedSchedule({
			id: 'spring',
			name: 'Spring Plan',
			term: '2025-2026 Spring',
			savedAt: 200
		});
		writeSchedules([spring, fall]);
		const onLoadSchedule = vi.fn();

		render(SavedSchedulesDialog, {
			props: { open: true, onClose: vi.fn(), onLoadSchedule, currentTerm: '2025-2026 Fall' }
		});

		expect(await screen.findByText('Fall Plan')).toBeInTheDocument();
		expect(screen.queryByText('Spring Plan')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Load Schedule' }));

		expect(onLoadSchedule).toHaveBeenCalledWith(expect.objectContaining({ id: 'fall' }));
	});

	it('shows an error if deleting a saved schedule cannot be persisted', async () => {
		const user = userEvent.setup();
		writeSchedules([savedSchedule({ id: 'fall', name: 'Fall Plan' })]);

		render(SavedSchedulesDialog, {
			props: { open: true, onClose: vi.fn(), onLoadSchedule: vi.fn(), currentTerm: null }
		});

		const deleteButton = await screen.findByRole('button', { name: 'Delete Schedule Fall Plan' });
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('storage failed');
		});
		await user.click(deleteButton);

		expect(await screen.findByText('Failed to delete schedule')).toBeInTheDocument();
	});
});
