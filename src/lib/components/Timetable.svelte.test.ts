import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Timetable from './Timetable.svelte';
import type { BlockedHour, Schedule } from '$lib/types';

const schedule: Schedule = {
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
};

const timeSlots = ['08:40-09:30', '09:40-10:30', '10:40-11:30'];
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday'];

describe('Timetable', () => {
	it('renders the course placed in the matching time slot', async () => {
		render(Timetable, {
			props: { schedule, timeSlots, daysOfWeek, blockedHours: [] as BlockedHour[] }
		});
		expect(await screen.findByText(/MATH 101/)).toBeInTheDocument();
	});

	it('blocks the whole day when a day header is clicked', async () => {
		const onBlockedHoursChange = vi.fn();
		render(Timetable, {
			props: {
				schedule,
				timeSlots,
				daysOfWeek,
				blockedHours: [] as BlockedHour[],
				onBlockedHoursChange
			}
		});

		const dayHeader = await screen.findByRole('button', { name: 'Monday' });
		await fireEvent.click(dayHeader);

		expect(onBlockedHoursChange).toHaveBeenCalledTimes(1);
		const next = onBlockedHoursChange.mock.calls[0][0] as BlockedHour[];
		expect(next).toHaveLength(timeSlots.length);
		expect(next.every((b) => b.day === 'Monday')).toBe(true);
	});

	it('clears a blocked day when its already-blocked header is clicked', async () => {
		const onBlockedHoursChange = vi.fn();
		const blockedHours: BlockedHour[] = timeSlots.map((slot) => ({ day: 'Monday', slot }));
		render(Timetable, {
			props: { schedule, timeSlots, daysOfWeek, blockedHours, onBlockedHoursChange }
		});

		const dayHeader = await screen.findByRole('button', { name: 'Monday' });
		await fireEvent.click(dayHeader);

		expect(onBlockedHoursChange).toHaveBeenCalledTimes(1);
		expect(onBlockedHoursChange.mock.calls[0][0]).toEqual([]);
	});
});
