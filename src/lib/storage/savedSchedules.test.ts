import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleData } from '$lib/types';
import { STORAGE_KEYS } from './keys';
import {
	checkStorageAvailability,
	deleteSavedSchedule,
	getSavedSchedules,
	renameSavedSchedule,
	saveSchedule
} from './savedSchedules';

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
		},
		{
			sections: [
				{
					course: 'PHYS 101',
					section: '02',
					sessions: [
						{
							Day: 'Tuesday',
							'Start Time': '10:40',
							'End Time': '11:30',
							Section: '02',
							Classroom: 'B2'
						}
					]
				}
			]
		}
	],
	warnings: [],
	warning_codes: [],
	time_slots: ['09:40-10:30', '10:40-11:30'],
	days_of_week: ['Monday', 'Tuesday']
};

describe('saved schedule storage', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
		localStorage.clear();
	});

	it('persists only the selected active schedule and saved OR groups', () => {
		const saved = saveSchedule(
			'  Lab plan  ',
			'2025-2026 Fall',
			['MATH 101', 'PHYS 101'],
			scheduleData,
			[{ day: 'Friday', slot: '09:40-10:30' }],
			1,
			[['MATH 101', 'PHYS 101']]
		);

		expect(saved).toMatchObject({
			name: 'Lab plan',
			term: '2025-2026 Fall',
			selectedCourses: ['MATH 101', 'PHYS 101'],
			blockedHours: [{ day: 'Friday', slot: '09:40-10:30' }],
			activeScheduleIndex: 0,
			courseOptionGroups: [['MATH 101', 'PHYS 101']]
		});
		expect(saved.scheduleData.schedules).toEqual([scheduleData.schedules[1]]);
		expect(getSavedSchedules()[0].id).toBe(saved.id);
	});

	it('keeps the newest ten saved schedules', () => {
		vi.useFakeTimers();

		for (let i = 0; i < 12; i += 1) {
			vi.setSystemTime(new Date(2026, 0, 1, 12, 0, i));
			saveSchedule(`Schedule ${i}`, '2025-2026 Fall', ['MATH 101'], scheduleData, []);
		}

		const schedules = getSavedSchedules();
		expect(schedules).toHaveLength(10);
		expect(schedules[0].name).toBe('Schedule 11');
		expect(schedules.at(-1)?.name).toBe('Schedule 2');
	});

	it('renames and deletes schedules through localStorage', () => {
		const saved = saveSchedule('Original', '2025-2026 Fall', ['MATH 101'], scheduleData, []);

		renameSavedSchedule(saved.id, 'Renamed');
		expect(getSavedSchedules()[0].name).toBe('Renamed');

		deleteSavedSchedule(saved.id);
		expect(getSavedSchedules()).toEqual([]);
	});

	it('filters invalid stored schedule entries instead of crashing', () => {
		localStorage.setItem(
			STORAGE_KEYS.SAVED_SCHEDULES,
			JSON.stringify([
				{
					id: 'ok',
					name: 'Valid',
					term: '2025-2026 Fall',
					selectedCourses: ['MATH 101'],
					scheduleData,
					blockedHours: [],
					activeScheduleIndex: 0,
					savedAt: 1
				},
				{ id: 'bad', selectedCourses: [1, 2, 3] }
			])
		);

		expect(getSavedSchedules().map((schedule) => schedule.id)).toEqual(['ok']);
	});

	it('reports quota failures when storage is unavailable', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('full', 'QuotaExceededError');
		});

		expect(checkStorageAvailability()).toEqual({
			available: false,
			error: 'errors.storageQuotaExceeded'
		});
	});
});
