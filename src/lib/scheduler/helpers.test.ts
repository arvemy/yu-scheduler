import { describe, it, expect } from 'vitest';
import {
	timeToMinutes,
	normalizeBlockedHours,
	buildEligibleSections,
	sessionOverlapsBlocked,
	checkNoOverlaps,
	filterEligibleCourses,
	generateValidSchedules
} from './helpers';
import { createSession, mockCourseData } from './test-utils';
import type { BlockedHour, CourseEntry } from '$lib/types';

describe('Scheduler Helpers', () => {
	describe('timeToMinutes', () => {
		it('converts HH:MM string to minutes', () => {
			expect(timeToMinutes('00:00')).toBe(0);
			expect(timeToMinutes('01:00')).toBe(60);
			expect(timeToMinutes('10:30')).toBe(630);
			expect(timeToMinutes('23:59')).toBe(1439);
		});

		it('returns 0 for invalid inputs', () => {
			expect(timeToMinutes('')).toBe(0);
			expect(timeToMinutes(null)).toBe(0);
			expect(timeToMinutes(undefined)).toBe(0);
			expect(timeToMinutes('invalid')).toBe(0);
		});
	});

	describe('normalizeBlockedHours', () => {
		it('converts BlockedHour array to Set of strings', () => {
			const input: BlockedHour[] = [
				{ day: 'Monday', slot: '09:40-10:30' },
				{ day: 'Tuesday', slot: '14:40-15:30' }
			];
			const result = normalizeBlockedHours(input);
			expect(result.size).toBe(2);
			expect(result.has('Monday|09:40-10:30')).toBe(true);
			expect(result.has('Tuesday|14:40-15:30')).toBe(true);
		});

		it('ignores invalid days or slots', () => {
			const input: BlockedHour[] = [
				{ day: 'InvalidDay', slot: '09:40-10:30' },
				{ day: 'Monday', slot: 'invalid-time' }
			];
			const result = normalizeBlockedHours(input);
			expect(result.size).toBe(0);
		});
	});

	describe('buildEligibleSections', () => {
		it('groups sessions by course and section', () => {
			const result = buildEligibleSections(mockCourseData);
			
			expect(result['MATH101']).toBeDefined();
			expect(result['MATH101'].length).toBe(2); // 01 and 02
			
			const section01 = result['MATH101'].find(([sec]) => sec === '01');
			expect(section01).toBeDefined();
			expect(section01![1].length).toBe(2); // Mon, Wed
		});

		it('excludes incomplete sessions', () => {
			const badData = {
				'BAD101': [
					createSession('Monday', '', '10:00'), // Missing start
					createSession('Wednesday', '10:00', '') // Missing end
				]
			};
			const result = buildEligibleSections(badData);
			expect(result['BAD101'].length).toBe(0);
		});
	});

	describe('Overlaps', () => {
		describe('sessionOverlapsBlocked', () => {
			const blockedSet = new Set(['Monday|09:00-10:00']);

			it('returns true for overlapping session', () => {
				const session = createSession('Monday', '09:30', '10:30');
				expect(sessionOverlapsBlocked(session, blockedSet)).toBe(true);
			});

			it('returns true for contained session', () => {
				const session = createSession('Monday', '09:15', '09:45');
				expect(sessionOverlapsBlocked(session, blockedSet)).toBe(true);
			});

			it('returns false for adjacent session', () => {
				const session = createSession('Monday', '10:00', '11:00');
				expect(sessionOverlapsBlocked(session, blockedSet)).toBe(false);
			});

			it('returns false for different day', () => {
				const session = createSession('Tuesday', '09:00', '10:00');
				expect(sessionOverlapsBlocked(session, blockedSet)).toBe(false);
			});
		});

		describe('checkNoOverlaps', () => {
			it('returns true for non-overlapping sessions', () => {
				const sessions = [
					createSession('Monday', '09:00', '10:00'),
					createSession('Monday', '10:00', '11:00')
				];
				expect(checkNoOverlaps(sessions)).toBe(true);
			});

			it('returns false for overlapping sessions', () => {
				const sessions = [
					createSession('Monday', '09:00', '10:00'),
					createSession('Monday', '09:30', '10:30')
				];
				expect(checkNoOverlaps(sessions)).toBe(false);
			});
		});
	});

	describe('filterEligibleCourses', () => {
		const eligible = buildEligibleSections(mockCourseData);
		const blocked = new Set<string>();

		it('returns all valid sections when no conflicts', () => {
			const selection: CourseEntry[] = [{ course: 'MATH101' }];
			const result = filterEligibleCourses(selection, eligible, blocked);
			
			expect(result.validCourses).toContain('MATH101');
			expect(result.filteredSections['MATH101'].length).toBe(2);
		});

		it('filters out sections conflicting with blocked hours', () => {
			const blockedMon = new Set(['Monday|09:40-10:30']);
			const selection: CourseEntry[] = [{ course: 'MATH101' }];
			
			const result = filterEligibleCourses(selection, eligible, blockedMon);
			
			// MATH101-01 is Mon 09:40, so it should be filtered out.
			// MATH101-02 is Tue/Thu, so it should remain.
			expect(result.filteredSections['MATH101'].length).toBe(1);
			expect(result.filteredSections['MATH101'][0][0]).toBe('02');
		});

		it('moves course to excluded if all sections blocked', () => {
			const blockedAll = new Set([
				'Monday|09:40-10:30',
				'Tuesday|14:40-15:30'
			]);
			const selection: CourseEntry[] = [{ course: 'MATH101' }];
			
			const result = filterEligibleCourses(selection, eligible, blockedAll);
			
			expect(result.validCourses).not.toContain('MATH101');
			expect(result.excludedCourses).toContain('MATH101');
		});

		it('respects specific section selection', () => {
			const selection: CourseEntry[] = [{ course: 'MATH101', section: '02' }];
			const result = filterEligibleCourses(selection, eligible, blocked);
			
			expect(result.filteredSections['MATH101'].length).toBe(1);
			expect(result.filteredSections['MATH101'][0][0]).toBe('02');
		});
	});

	describe('generateValidSchedules', () => {
		const eligible = buildEligibleSections(mockCourseData);

		it('generates Cartesian product of sections', () => {
			// MATH101 (2 sections) + HIST101 (1 section) = 2 schedules
			const courses = ['MATH101', 'HIST101'];
			// Re-filter to get the structure needed for generateValidSchedules
			const { filteredSections } = filterEligibleCourses(
				courses.map(c => ({ course: c })),
				eligible,
				new Set()
			);

			const { validSchedules } = generateValidSchedules(courses, filteredSections);
			expect(validSchedules.length).toBe(2);
		});

		it('prunes conflicting combinations', () => {
			// MATH101-01 (Mon 9-10) conflicts with PHYS101-01 (Mon 9-10)
			// MATH101-02 (Tue 14) and PHYS101-02 (Mon 14) do not conflict
			
			const courses = ['MATH101', 'PHYS101'];
			const { filteredSections } = filterEligibleCourses(
				courses.map(c => ({ course: c })),
				eligible,
				new Set()
			);

			const { validSchedules, conflictPairs } = generateValidSchedules(courses, filteredSections);
			
			// Expected combinations:
			// MATH-01 + PHYS-01 -> Conflict
			// MATH-01 + PHYS-02 -> Valid (Mon 9 + Mon 14)
			// MATH-02 + PHYS-01 -> Valid (Tue 14 + Mon 9)
			// MATH-02 + PHYS-02 -> Valid (Tue 14 + Mon 14)
			
			expect(validSchedules.length).toBe(3);
			expect(conflictPairs.length).toBeGreaterThan(0);
		});

		it('returns empty if no valid combination exists', () => {
			// Create artificially conflicting data
			const conflictData = {
				'A': [createSession('Monday', '10:00', '11:00')],
				'B': [createSession('Monday', '10:00', '11:00')]
			};
			const eligibleConflict = buildEligibleSections(conflictData);
			const courses = ['A', 'B'];
			const { filteredSections } = filterEligibleCourses(
				courses.map(c => ({ course: c })),
				eligibleConflict,
				new Set()
			);

			const { validSchedules } = generateValidSchedules(courses, filteredSections);
			expect(validSchedules.length).toBe(0);
		});
	});
});
