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
			for (const schedule of result.schedules) {
				const scheduledCourses = schedule.sections.map((section) => section.course);
				expect(scheduledCourses).not.toEqual(expect.arrayContaining(['MATH101', 'HIST101']));
			}
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

		it('visits every option in OR groups with more than 96 combinations', () => {
			const customData: Record<string, ReturnType<typeof createSession>[]> = {};
			const options = Array.from({ length: 100 }, (_, index) => {
				const course = `OPT${index + 1}`;
				customData[course] = [createSession('Monday', '10:00', '11:00')];
				return { course };
			});

			const req: GenerateScheduleRequest = {
				courses: [],
				course_option_groups: [{ options }],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, customData);
			const scheduledCourses = new Set(
				result.schedules.flatMap((schedule) => schedule.sections.map((section) => section.course))
			);

			expect(result.schedules.length).toBe(100);
			expect(scheduledCourses.size).toBe(100);
			expect(result.warning_codes.length).toBe(0);
		});

		it('bounds multi-group exploration while covering every OR option', () => {
			const customData: Record<string, ReturnType<typeof createSession>[]> = {};
			const groups = Array.from({ length: 8 }, (_, groupIndex) => ({
				options: Array.from({ length: 5 }, (_, optionIndex) => {
					const course = `G${groupIndex + 1}OPT${optionIndex + 1}`;
					const hour = String(8 + groupIndex).padStart(2, '0');
					customData[course] = [createSession('Monday', `${hour}:00`, `${hour}:30`)];
					return { course };
				})
			}));

			const req: GenerateScheduleRequest = {
				courses: [],
				course_option_groups: groups,
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, customData);
			const scheduledCourses = new Set(
				result.schedules.flatMap((schedule) => schedule.sections.map((section) => section.course))
			);

			expect(result.schedules.length).toBeGreaterThan(0);
			expect(result.schedules.length).toBeLessThan(5 ** 8);
			expect(scheduledCourses.size).toBe(40);
			expect(result.warning_codes.length).toBe(0);
		});

		it('returns valid schedules when a conflicting OR option has its coverage search capped', () => {
			// BAD always conflicts with REQ regardless of partner choice, but the 4^4 = 256
			// partner combinations push findOptionCoverage past its 96-attempt cap before it
			// can confirm the conflict exhaustively. GOOD is fully compatible with REQ, so
			// valid schedules exist. The capped result for BAD must be treated as inconclusive
			// rather than blocking those valid GOOD schedules.
			const customData: Record<string, ReturnType<typeof createSession>[]> = {
				REQ: [createSession('Monday', '10:00', '11:00')],
				GOOD: [createSession('Tuesday', '10:00', '11:00')],
				BAD: [createSession('Monday', '10:00', '11:00')]
			};
			const partnerGroups = Array.from({ length: 4 }, (_, groupIndex) => ({
				options: Array.from({ length: 4 }, (_, optionIndex) => {
					const course = `P${groupIndex + 1}OPT${optionIndex + 1}`;
					const hour = String(12 + groupIndex).padStart(2, '0');
					customData[course] = [createSession('Wednesday', `${hour}:00`, `${hour}:30`)];
					return { course };
				})
			}));

			const req: GenerateScheduleRequest = {
				courses: [{ course: 'REQ' }],
				course_option_groups: [
					{ options: [{ course: 'GOOD' }, { course: 'BAD' }] },
					...partnerGroups
				],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, customData);

			// GOOD is compatible with REQ; those schedules must not be suppressed because
			// BAD's coverage search capped out before proving it unschedulable.
			expect(result.schedules.length).toBeGreaterThan(0);
		});

		it('blocks generation when a data-backed OR option cannot appear', () => {
			// Create a conflict scenario:
			// Base: COURSE_A (Mon 10-11)
			// Options: [COURSE_B (Mon 10-11), COURSE_C (Tue 10-11)]
			// COURSE_B has data but can never appear, so the whole result is blocked.

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

			expect(result.schedules.length).toBe(0);
			const warningCodes = result.warning_codes.map((w) => w.code);
			expect(warningCodes).toContain(WarningCodes.TIME_CONFLICT_BETWEEN_COURSES);
			expect(result.warning_codes).toContainEqual(
				expect.objectContaining({
					code: WarningCodes.TIME_CONFLICT_BETWEEN_COURSES,
					params: expect.objectContaining({ course1: 'A', course2: 'B' })
				})
			);
		});

		it('tracks OR coverage by course and section', () => {
			const req: GenerateScheduleRequest = {
				courses: [],
				course_option_groups: [
					{
						options: [
							{ course: 'MATH101', section: '01' },
							{ course: 'MATH101', section: '99' }
						]
					}
				],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, mockCourseData);
			const codes = result.warning_codes.map((warning) => warning.code);

			expect(result.schedules.length).toBe(0);
			expect(codes).toContain(WarningCodes.OPTION_NOT_SCHEDULABLE);
		});
	});

	it('generates with available AND courses when another required course has no data', () => {
		const customData = {
			A: [createSession('Monday', '10:00', '11:00')]
		};

		const req: GenerateScheduleRequest = {
			courses: [{ course: 'A' }, { course: 'GHOST' }],
			blocked_hours: []
		};

		const result = generateScheduleFromData(req, customData);
		const codes = result.warning_codes.map((w) => w.code);

		expect(result.schedules.length).toBe(1);
		expect(result.schedules[0].sections.map((section) => section.course)).toEqual(['A']);
		expect(codes).toContain(WarningCodes.COURSE_NOT_AVAILABLE);
	});

	it('blocks AND generation when a required course is unavailable for reasons other than missing data', () => {
		const req: GenerateScheduleRequest = {
			courses: [{ course: 'MATH101' }, { course: 'PHYS101', section: '99' }],
			blocked_hours: []
		};

		const result = generateScheduleFromData(req, mockCourseData);
		const codes = result.warning_codes.map((w) => w.code);

		expect(result.schedules.length).toBe(0);
		expect(codes).toContain(WarningCodes.OPTION_NOT_SCHEDULABLE);
		expect(codes).not.toContain(WarningCodes.ALL_COURSES_EXCLUDED);
		expect(result.warning_codes).toContainEqual(
			expect.objectContaining({
				code: WarningCodes.OPTION_NOT_SCHEDULABLE,
				params: expect.objectContaining({ course: 'PHYS101' })
			})
		);
	});

	it('reports each failing OR plus required-course combination', () => {
		const customData = {
			X: [createSession('Monday', '10:00', '11:00')],
			Y: [createSession('Monday', '10:00', '11:00')],
			Z: [createSession('Monday', '10:00', '11:00')]
		};

		const req: GenerateScheduleRequest = {
			courses: [{ course: 'Z' }],
			course_option_groups: [{ options: [{ course: 'X' }, { course: 'Y' }] }],
			blocked_hours: []
		};

		const result = generateScheduleFromData(req, customData);
		const conflictPairs = result.warning_codes
			.filter((warning) => warning.code === WarningCodes.TIME_CONFLICT_BETWEEN_COURSES)
			.map((warning) =>
				[warning.params?.course1 as string, warning.params?.course2 as string].sort().join('|')
			);

		expect(result.schedules.length).toBe(0);
		expect(conflictPairs).toContain('X|Z');
		expect(conflictPairs).toContain('Y|Z');
	});

	it('allows an OR option with no data to be skipped while generating the available option', () => {
		const customData = {
			X: [createSession('Tuesday', '10:00', '11:00')],
			Z: [createSession('Monday', '10:00', '11:00')]
		};

		const req: GenerateScheduleRequest = {
			courses: [{ course: 'Z' }],
			course_option_groups: [{ options: [{ course: 'X' }, { course: 'Y' }] }],
			blocked_hours: []
		};

		const result = generateScheduleFromData(req, customData);
		const codes = result.warning_codes.map((w) => w.code);

		expect(result.schedules.length).toBe(1);
		expect(result.schedules[0].sections.map((section) => section.course).sort()).toEqual([
			'X',
			'Z'
		]);
		expect(codes).toContain(WarningCodes.COURSE_NOT_AVAILABLE);
		expect(result.warning_codes).toContainEqual(
			expect.objectContaining({
				code: WarningCodes.COURSE_NOT_AVAILABLE,
				params: expect.objectContaining({ course: 'Y' })
			})
		);
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

	it('reports a per-course blocked warning (no headline) for a single blocked course', () => {
		const req: GenerateScheduleRequest = {
			courses: [{ course: 'MATH101' }],
			// Block all known MATH slots
			blocked_hours: [
				{ day: 'Monday', slot: '09:40-10:30' }, // Blocks 01
				{ day: 'Tuesday', slot: '14:40-15:30' } // Blocks 02
			]
		};

		const result = generateScheduleFromData(req, mockCourseData);
		const codes = result.warning_codes.map((w) => w.code);

		expect(result.schedules.length).toBe(0);
		expect(codes).toContain(WarningCodes.TIME_CONFLICT_WITH_SPECIFIC_BLOCKED_HOURS);
		// A single excluded course explains itself; no "all courses" headline.
		expect(codes).not.toContain(WarningCodes.ALL_COURSES_EXCLUDED);
		expect(codes).not.toContain(WarningCodes.ALL_COURSES_BLOCKED);
	});

	describe('Exclusion reason accuracy', () => {
		it('reports missing data (not a conflict) for a single course with no data', () => {
			const req: GenerateScheduleRequest = {
				courses: [{ course: 'GHOST101' }], // absent from mockCourseData
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, mockCourseData);
			const codes = result.warning_codes.map((w) => w.code);

			expect(result.schedules.length).toBe(0);
			expect(codes).toContain(WarningCodes.COURSE_NOT_AVAILABLE);
			// One course must not trigger an "all courses" headline.
			expect(codes).not.toContain(WarningCodes.ALL_COURSES_EXCLUDED);
			expect(codes).not.toContain(WarningCodes.ALL_COURSES_NO_DATA);
		});

		it('uses the no-data headline when every selected course lacks data', () => {
			const req: GenerateScheduleRequest = {
				courses: [{ course: 'GHOST101' }, { course: 'GHOST102' }],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, mockCourseData);
			const codes = result.warning_codes.map((w) => w.code);

			expect(result.schedules.length).toBe(0);
			expect(codes).toContain(WarningCodes.ALL_COURSES_NO_DATA);
			expect(codes).not.toContain(WarningCodes.ALL_COURSES_EXCLUDED);
		});

		it('uses the blocked headline when every selected course is fully blocked', () => {
			const customData = {
				A: [createSession('Monday', '09:40', '10:30')],
				B: [createSession('Tuesday', '09:40', '10:30')]
			};

			const req: GenerateScheduleRequest = {
				courses: [{ course: 'A' }, { course: 'B' }],
				blocked_hours: [
					{ day: 'Monday', slot: '09:40-10:30' },
					{ day: 'Tuesday', slot: '09:40-10:30' }
				]
			};

			const result = generateScheduleFromData(req, customData);
			const codes = result.warning_codes.map((w) => w.code);

			expect(result.schedules.length).toBe(0);
			expect(codes).toContain(WarningCodes.ALL_COURSES_BLOCKED);
			expect(codes).not.toContain(WarningCodes.ALL_COURSES_EXCLUDED);
		});

		it('falls back to the generic headline when exclusion reasons are mixed', () => {
			const customData = {
				A: [createSession('Monday', '09:40', '10:30')]
				// GHOST is absent → no data
			};

			const req: GenerateScheduleRequest = {
				courses: [{ course: 'A' }, { course: 'GHOST' }],
				blocked_hours: [{ day: 'Monday', slot: '09:40-10:30' }]
			};

			const result = generateScheduleFromData(req, customData);
			const codes = result.warning_codes.map((w) => w.code);

			expect(result.schedules.length).toBe(0);
			expect(codes).toContain(WarningCodes.ALL_COURSES_EXCLUDED);
			expect(codes).not.toContain(WarningCodes.ALL_COURSES_NO_DATA);
			expect(codes).not.toContain(WarningCodes.ALL_COURSES_BLOCKED);
		});

		it('explains an OR option with no data as missing data, not a conflict', () => {
			const req: GenerateScheduleRequest = {
				courses: [],
				course_option_groups: [{ options: [{ course: 'MATH101' }, { course: 'GHOST101' }] }],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, mockCourseData);
			const codes = result.warning_codes.map((w) => w.code);

			// MATH101 schedules still come through.
			expect(result.schedules.length).toBeGreaterThan(0);
			// GHOST101 is missing data — say so rather than "no valid schedule including".
			expect(codes).toContain(WarningCodes.COURSE_NOT_AVAILABLE);
			expect(codes).not.toContain(WarningCodes.NO_VALID_SCHEDULE_INCLUDING_COURSE);
		});

		it('surfaces a generic headline for a single course pinned to a stale section', () => {
			// MATH101 has data, but section 99 does not exist. The exclusion is neither
			// "no data" nor a blocked-hours conflict, so no per-course warning is emitted —
			// the headline must not leave the empty result silent.
			const req: GenerateScheduleRequest = {
				courses: [{ course: 'MATH101', section: '99' }],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, mockCourseData);
			const codes = result.warning_codes.map((w) => w.code);

			expect(result.schedules.length).toBe(0);
			expect(result.warning_codes.length).toBeGreaterThan(0);
			expect(codes).toContain(WarningCodes.ALL_COURSES_EXCLUDED);
			// blocked_hours is empty — never claim a blocked-hours headline.
			expect(codes).not.toContain(WarningCodes.ALL_COURSES_BLOCKED);
		});

		it('does not claim "all blocked" when stale-section courses have no blocked hours', () => {
			const req: GenerateScheduleRequest = {
				courses: [
					{ course: 'MATH101', section: '99' },
					{ course: 'PHYS101', section: '99' }
				],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, mockCourseData);
			const codes = result.warning_codes.map((w) => w.code);

			expect(result.schedules.length).toBe(0);
			expect(codes).toContain(WarningCodes.ALL_COURSES_EXCLUDED);
			expect(codes).not.toContain(WarningCodes.ALL_COURSES_BLOCKED);
			expect(codes).not.toContain(WarningCodes.ALL_COURSES_NO_DATA);
		});

		it('does not block valid schedules when partner combination search for an OR option is capped', () => {
			// HARD is schedulable, but only with a specific partner combo (B06+C01+D01) that
			// sits at position 101 in the depth-first search — past the 96-attempt cap.
			// The main search also hits its cap before trying HARD at all, leaving HARD out
			// of successfulOptionKeys. findOptionCoverage is then called for HARD, also caps,
			// and must return "inconclusive" (not "unschedulable") so the valid EASY schedules
			// found by the main search are not discarded.
			const capTestData = {
				EASY: [createSession('Friday', '10:00', '11:00', '01')],
				HARD: [createSession('Monday', '09:00', '10:00', '01')],
				// B01-B05 share HARD's Monday 09:00 slot (conflict); B06 is clear
				B01: [createSession('Monday', '09:00', '10:00', '01')],
				B02: [createSession('Monday', '09:00', '10:00', '01')],
				B03: [createSession('Monday', '09:00', '10:00', '01')],
				B04: [createSession('Monday', '09:00', '10:00', '01')],
				B05: [createSession('Monday', '09:00', '10:00', '01')],
				B06: [createSession('Tuesday', '12:00', '13:00', '01')],
				C01: [createSession('Tuesday', '10:00', '11:00', '01')],
				C02: [createSession('Wednesday', '10:00', '11:00', '01')],
				C03: [createSession('Thursday', '10:00', '11:00', '01')],
				C04: [createSession('Saturday', '10:00', '11:00', '01')],
				D01: [createSession('Tuesday', '14:00', '15:00', '01')],
				D02: [createSession('Wednesday', '14:00', '15:00', '01')],
				D03: [createSession('Thursday', '14:00', '15:00', '01')],
				D04: [createSession('Monday', '14:00', '15:00', '01')],
				D05: [createSession('Friday', '14:00', '15:00', '01')]
			};

			const req: GenerateScheduleRequest = {
				courses: [],
				course_option_groups: [
					{ options: [{ course: 'EASY' }, { course: 'HARD' }] },
					{
						options: [
							{ course: 'B01' },
							{ course: 'B02' },
							{ course: 'B03' },
							{ course: 'B04' },
							{ course: 'B05' },
							{ course: 'B06' }
						]
					},
					{
						options: [{ course: 'C01' }, { course: 'C02' }, { course: 'C03' }, { course: 'C04' }]
					},
					{
						options: [
							{ course: 'D01' },
							{ course: 'D02' },
							{ course: 'D03' },
							{ course: 'D04' },
							{ course: 'D05' }
						]
					}
				],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, capTestData);

			// Valid EASY schedules were found. HARD's coverage check was capped (inconclusive),
			// so it must not block the result with a false unschedulability warning.
			expect(result.schedules.length).toBeGreaterThan(0);
		});

		it('explains an OR option dropped for a stale pinned section as unavailable, not a conflict', () => {
			const req: GenerateScheduleRequest = {
				courses: [],
				course_option_groups: [
					{ options: [{ course: 'MATH101' }, { course: 'PHYS101', section: '99' }] }
				],
				blocked_hours: []
			};

			const result = generateScheduleFromData(req, mockCourseData);
			const codes = result.warning_codes.map((w) => w.code);

			// PHYS101 has term data, so failing to include it blocks the OR group.
			expect(result.schedules.length).toBe(0);
			// The stale PHYS101 option must not silently disappear from the warnings.
			expect(codes).toContain(WarningCodes.OPTION_NOT_SCHEDULABLE);
			// PHYS101 doesn't actually conflict with anything — don't blame a conflict.
			expect(codes).not.toContain(WarningCodes.NO_VALID_SCHEDULE_INCLUDING_COURSE);
			// Only PHYS101's option failed — MATH101 was schedulable, so the global
			// "none of your courses could be scheduled" headline must not leak through.
			expect(codes).not.toContain(WarningCodes.ALL_COURSES_EXCLUDED);
		});
	});
});
