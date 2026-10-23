import { beforeEach, describe, expect, it } from 'vitest';
import { getTermKey } from '#lib/storage/keys.js';
import type { ScheduleData } from '#lib/types/index.js';
import {
	buildGenerateRequest,
	buildOptionGroups,
	loadTermSelection,
	normalizeCode,
	orConnectionsFromGroups,
	sectionChoicesFromSchedule,
	selectionKey
} from './selection';

const TERM = '2025-2026 Fall';

describe('normalizeCode', () => {
	it('collapses internal whitespace and trims', () => {
		expect(normalizeCode('  MOTP   2337 ')).toBe('MOTP 2337');
	});
});

describe('buildOptionGroups', () => {
	it('groups runs of OR-connected adjacent courses', () => {
		expect(buildOptionGroups(['A', 'B', 'C', 'D', 'E'], { A: true, C: true, D: true })).toEqual([
			['A', 'B'],
			['C', 'D', 'E']
		]);
	});

	it('leaves unconnected courses out of the groups', () => {
		expect(buildOptionGroups(['A', 'B'], {})).toEqual([]);
	});

	it('ignores an OR flag on the last course', () => {
		expect(buildOptionGroups(['A', 'B'], { B: true })).toEqual([]);
	});

	it('round-trips through orConnectionsFromGroups', () => {
		const connections = { A: true, C: true };
		const groups = buildOptionGroups(['A', 'B', 'C', 'D'], connections);
		expect(orConnectionsFromGroups(groups)).toEqual(connections);
	});
});

describe('orConnectionsFromGroups', () => {
	it('returns no connections for missing groups', () => {
		expect(orConnectionsFromGroups(undefined)).toEqual({});
	});
});

describe('buildGenerateRequest', () => {
	it('splits mandatory courses from option groups and applies section choices', () => {
		const request = buildGenerateRequest(
			TERM,
			['MATH 101', 'PHYS 101', 'CHEM 101'],
			{ 'MATH 101': '02', 'PHYS 101': null },
			[{ day: 'Monday', slot: '09:40-10:30' }],
			{ 'PHYS 101': true }
		);

		expect(request).toEqual({
			courses: [{ course: 'MATH 101', section: '02' }],
			course_option_groups: [
				{
					options: [
						{ course: 'PHYS 101', section: null },
						{ course: 'CHEM 101', section: null }
					]
				}
			],
			blocked_hours: [{ day: 'Monday', slot: '09:40-10:30' }],
			term: TERM
		});
	});

	it('omits option groups when nothing is OR-connected', () => {
		expect(buildGenerateRequest(TERM, ['MATH 101'], {}, [], {}).course_option_groups).toBe(
			undefined
		);
	});
});

describe('selectionKey', () => {
	const key = (overrides: Partial<Parameters<typeof selectionKey>> = []) => {
		const args: Parameters<typeof selectionKey> = [TERM, ['A', 'B'], [], {}, {}];
		overrides.forEach((value, i) => {
			if (value !== undefined) (args as unknown[])[i] = value;
		});
		return selectionKey(...args);
	};

	it('ignores course order when there are no OR connections', () => {
		expect(key([undefined, ['B', 'A']])).toBe(key());
	});

	it('changes with section choices, blocked hours and OR connections', () => {
		expect(key([undefined, undefined, undefined, { A: '01' }])).not.toBe(key());
		expect(key([undefined, undefined, [{ day: 'Monday', slot: 'x' }]])).not.toBe(key());
		expect(key([undefined, undefined, undefined, undefined, { A: true }])).not.toBe(key());
	});
});

describe('sectionChoicesFromSchedule', () => {
	it('maps each course to its section in the chosen schedule', () => {
		const data = {
			schedules: [
				{ sections: [{ course: 'MATH 101', section: '01', sessions: [] }] },
				{ sections: [{ course: 'MATH 101', section: '02', sessions: [] }] }
			]
		} as unknown as ScheduleData;
		expect(sectionChoicesFromSchedule(data, 1)).toEqual({ 'MATH 101': '02' });
		expect(sectionChoicesFromSchedule(data, 5)).toEqual({});
	});
});

describe('loadTermSelection', () => {
	beforeEach(() => localStorage.clear());

	it('returns an empty object when nothing is stored', () => {
		expect(loadTermSelection(TERM)).toEqual({});
	});

	it('reads every persisted field', () => {
		localStorage.setItem(getTermKey(TERM, 'selectedCourses'), JSON.stringify(['MATH 101']));
		localStorage.setItem(
			getTermKey(TERM, 'blockedHours'),
			JSON.stringify([{ day: 'Monday', slot: '09:40-10:30' }])
		);
		localStorage.setItem(getTermKey(TERM, 'sectionChoices'), JSON.stringify({ 'MATH 101': '01' }));
		localStorage.setItem(getTermKey(TERM, 'orConnections'), JSON.stringify({ 'MATH 101': true }));
		localStorage.setItem(getTermKey(TERM, 'activeTab'), '2');

		expect(loadTermSelection(TERM)).toEqual({
			selectedCourses: ['MATH 101'],
			blockedHours: [{ day: 'Monday', slot: '09:40-10:30' }],
			sectionChoices: { 'MATH 101': '01' },
			orConnections: { 'MATH 101': true },
			activeScheduleIndex: 2
		});
	});

	it('skips malformed values', () => {
		localStorage.setItem(getTermKey(TERM, 'orConnections'), '{not json');
		localStorage.setItem(getTermKey(TERM, 'activeTab'), 'abc');
		expect(loadTermSelection(TERM)).toEqual({});
	});
});
