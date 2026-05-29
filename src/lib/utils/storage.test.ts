import { describe, it, expect, beforeEach } from 'vitest';
import {
	parseStoredJson,
	storeJson,
	validateBlockedHours,
	validateLastGenerated,
	validateSavedSchedule,
	validateScheduleData,
	validateSelectedCourses
} from './storage';

describe('storage validators', () => {
	describe('validateBlockedHours', () => {
		it('accepts a well-formed array', () => {
			const result = validateBlockedHours([{ day: 'Monday', slot: '09:40-10:30' }]);
			expect(result.success).toBe(true);
			expect(result.data).toEqual([{ day: 'Monday', slot: '09:40-10:30' }]);
		});

		it('rejects non-arrays', () => {
			expect(validateBlockedHours({}).success).toBe(false);
		});

		it('rejects entries with missing fields', () => {
			expect(validateBlockedHours([{ day: 'Monday' }]).success).toBe(false);
		});
	});

	describe('validateSelectedCourses', () => {
		it('accepts a string array', () => {
			expect(validateSelectedCourses(['A', 'B']).success).toBe(true);
		});

		it('rejects arrays containing non-strings', () => {
			expect(validateSelectedCourses(['A', 3]).success).toBe(false);
		});
	});

	describe('validateScheduleData', () => {
		it('requires all array fields to be present', () => {
			const ok = validateScheduleData({
				schedules: [],
				warnings: [],
				warning_codes: [],
				time_slots: [],
				days_of_week: []
			});
			expect(ok.success).toBe(true);
		});

		it('rejects objects missing required fields', () => {
			expect(validateScheduleData({ schedules: [] }).success).toBe(false);
		});
	});

	describe('validateSavedSchedule', () => {
		const valid = {
			id: 'abc',
			name: 'My Schedule',
			term: '2025-2026 Fall',
			selectedCourses: ['MATH 101'],
			scheduleData: {
				schedules: [],
				warnings: [],
				warning_codes: [],
				time_slots: [],
				days_of_week: []
			},
			blockedHours: [{ day: 'Monday', slot: '09:40-10:30' }],
			activeScheduleIndex: 0,
			savedAt: 123456
		};

		it('accepts a complete object', () => {
			const result = validateSavedSchedule(valid);
			expect(result.success).toBe(true);
			expect(result.data?.id).toBe('abc');
		});

		it('rejects when a required field is the wrong type', () => {
			expect(validateSavedSchedule({ ...valid, savedAt: 'soon' }).success).toBe(false);
		});

		it('accepts optional courseOptionGroups when valid', () => {
			const result = validateSavedSchedule({
				...valid,
				courseOptionGroups: [['MATH 101', 'PHYS 101']]
			});
			expect(result.success).toBe(true);
			expect(result.data?.courseOptionGroups).toEqual([['MATH 101', 'PHYS 101']]);
		});
	});

	describe('validateLastGenerated', () => {
		it('accepts a null scheduleData', () => {
			const result = validateLastGenerated({ term: 'X', selectedCourses: [], scheduleData: null });
			expect(result.success).toBe(true);
			expect(result.data?.scheduleData).toBeNull();
		});
	});
});

describe('localStorage helpers', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('round-trips JSON through storeJson / parseStoredJson', () => {
		const stored = storeJson('test:courses', ['A', 'B']);
		expect(stored).toBe(true);

		const result = parseStoredJson('test:courses', validateSelectedCourses);
		expect(result.success).toBe(true);
		expect(result.data).toEqual(['A', 'B']);
	});

	it('returns failure for a missing key', () => {
		expect(parseStoredJson('test:absent', validateSelectedCourses).success).toBe(false);
	});

	it('returns failure for malformed JSON', () => {
		localStorage.setItem('test:bad', '{not json');
		expect(parseStoredJson('test:bad', validateSelectedCourses).success).toBe(false);
	});

	it('returns failure when stored data fails validation', () => {
		storeJson('test:courses', [1, 2, 3]);
		expect(parseStoredJson('test:courses', validateSelectedCourses).success).toBe(false);
	});
});
