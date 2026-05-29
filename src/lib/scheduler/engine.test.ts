import { describe, it, expect } from 'vitest';
import { generateScheduleFromData } from './engine';
import { mockCourseData, createSession } from './test-utils';
import type { GenerateScheduleRequest } from '$lib/types';
import { WarningCodes } from './errorCodes';

describe('Scheduler Engine', () => {
	it('returns error if no courses selected', () => {
		const req: GenerateScheduleRequest = {
			courses: [],
			blocked_hours: []
		};
		const result = generateScheduleFromData(req, mockCourseData);
		// The implementation returns ERROR_MESSAGES[ErrorCodes.NO_COURSES_SELECTED] in warnings string array
		// Let's just check length of schedules is 0 and has warnings
		expect(result.schedules.length).toBe(0);
		expect(result.warnings.length).toBeGreaterThan(0);
	});

	it('generates schedules for single course', () => {
		const req: GenerateScheduleRequest = {
			courses: [{ course: 'MATH101' }],
			blocked_hours: []
		};
		const result = generateScheduleFromData(req, mockCourseData);
		expect(result.schedules.length).toBe(2);
		expect(result.warning_codes.length).toBe(0);
	});

	it('handles blocked hours excluding some schedules', () => {
		// Block Monday 09:40-10:30 (eliminates MATH101-01)
		const req: GenerateScheduleRequest = {
			courses: [{ course: 'MATH101' }],
			blocked_hours: [{ day: 'Monday', slot: '09:40-10:30' }]
		};
		const result = generateScheduleFromData(req, mockCourseData);
		expect(result.schedules.length).toBe(1);
		// Should be section 02
		expect(result.schedules[0].sections[0].section).toBe('02');
	});

	describe('Option Groups (OR Logic)', () => {
		it('picks one option from a group', () => {
			// Option Group: [{MATH101}, {HIST101}]
			// MATH101 has 2 sections, HIST101 has 1 section.
			// Total distinct schedules: 2 (from MATH) + 1 (from HIST) = 3?
			// No, the engine generates *valid* schedules.
			// If we say "Pick 1 of [MATH, HIST]", it runs the logic to return ALL valid combinations.

			const req: GenerateScheduleRequest = {
				courses: [],
				course_option_groups: [{ options: [{ course: 'MATH101' }, { course: 'HIST101' }] }],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, mockCourseData);

			// It should find valid schedules for MATH101 (2) AND valid schedules for HIST101 (1)
			// Total should be 3.
			expect(result.schedules.length).toBe(3);

			const courses = new Set(result.schedules.map((s) => s.sections[0].course));
			expect(courses.has('MATH101')).toBe(true);
			expect(courses.has('HIST101')).toBe(true);
		});

		it('combines base courses with option groups', () => {
			// Base: HIST101 (Tue 10-12)
			// Option: [MATH101, PHYS101]
			// MATH101-01 (Mon 9) - Valid
			// MATH101-02 (Tue 14) - Valid
			// PHYS101-01 (Mon 9, Fri 10) - Valid

			const req: GenerateScheduleRequest = {
				courses: [{ course: 'HIST101' }],
				course_option_groups: [{ options: [{ course: 'MATH101' }, { course: 'PHYS101' }] }],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, mockCourseData);

			// All combinations should be valid as HIST (Tue morning) doesn't conflict with others.
			// MATH (2) + PHYS (3 sections? wait PHYS has 01, 01(Fri), 02) -> PHYS has 2 sections (01 and 02).
			// So 2 + 2 = 4 schedules total.
			expect(result.schedules.length).toBe(4);
		});

		it('handles conflicts within options', () => {
			// Create a conflict scenario:
			// Base: COURSE_A (Mon 10-11)
			// Options: [COURSE_B (Mon 10-11), COURSE_C (Tue 10-11)]
			// Result should only contain COURSE_A + COURSE_C.

			const customData = {
				A: [createSession('Monday', '10:00', '11:00')],
				B: [createSession('Monday', '10:00', '11:00')],
				C: [createSession('Tuesday', '10:00', '11:00')]
			};

			const req: GenerateScheduleRequest = {
				courses: [{ course: 'A' }],
				course_option_groups: [{ options: [{ course: 'B' }, { course: 'C' }] }],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, customData);

			expect(result.schedules.length).toBe(1);
			const sections = result.schedules[0].sections;
			expect(sections.map((s) => s.course).sort()).toEqual(['A', 'C']);

			// It should warn that B was excluded/invalid?
			// The engine warnings might report "No valid schedule including B found"
			// warning_codes should contain NO_VALID_SCHEDULE_INCLUDING_COURSE for B.
			const warningCodes = result.warning_codes.map((w) => w.code);
			expect(warningCodes).toContain(WarningCodes.NO_VALID_SCHEDULE_INCLUDING_COURSE);
		});
	});

	it('returns warnings when no schedule possible due to conflicts', () => {
		// MATH101-01 vs PHYS101-01 (Conflict Mon 9)
		// But other sections exist.
		// Let's force a hard conflict.
		// A (Mon 10) vs B (Mon 10) - single sections.

		const customData = {
			A: [createSession('Monday', '10:00', '11:00')],
			B: [createSession('Monday', '10:00', '11:00')]
		};

		const req: GenerateScheduleRequest = {
			courses: [{ course: 'A' }, { course: 'B' }],
			blocked_hours: []
		};

		const result = generateScheduleFromData(req, customData);

		expect(result.schedules.length).toBe(0);
		expect(result.warning_codes.length).toBeGreaterThan(0);
		const codes = result.warning_codes.map((w) => w.code);

		// Expect TIME_CONFLICTS or TIME_CONFLICT_BETWEEN_COURSES
		// Also NO_VALID_SCHEDULE_CONFLICTS
		expect(codes).toContain(WarningCodes.NO_VALID_SCHEDULE_CONFLICTS);
		expect(codes).toContain(WarningCodes.TIME_CONFLICT_BETWEEN_COURSES);
	});

	it('returns warnings when no schedule possible due to blocked hours', () => {
		const req: GenerateScheduleRequest = {
			courses: [{ course: 'MATH101' }],
			// Block all known MATH slots
			blocked_hours: [
				{ day: 'Monday', slot: '09:40-10:30' }, // Blocks 01
				{ day: 'Tuesday', slot: '14:40-15:30' } // Blocks 02
			]
		};

		const result = generateScheduleFromData(req, mockCourseData);

		expect(result.schedules.length).toBe(0);
		expect(result.warning_codes.map((w) => w.code)).toContain(WarningCodes.ALL_COURSES_EXCLUDED);
	});
});
