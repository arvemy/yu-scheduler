import { describe, it, expect } from 'vitest';
import type { CourseMeta } from '$lib/types';
import { computeAktsTotals } from './akts';

/** Build a courseMeta map from a `{ code: akts }` shorthand. */
const meta = (credits: Record<string, number | null>): Record<string, CourseMeta> => {
	const out: Record<string, CourseMeta> = {};
	for (const [code, akts] of Object.entries(credits)) {
		out[code] = { title: { tr: null, en: null }, akts };
	}
	return out;
};

describe('computeAktsTotals', () => {
	it('sums independent (AND) courses', () => {
		const result = computeAktsTotals(['A', 'B', 'C'], {}, meta({ A: 6, B: 6, C: 5 }));
		expect(result).toEqual({ totals: [17], partial: false });
	});

	it('counts an OR pair once when alternatives share credits', () => {
		// A OR B (both 6) + C(5): the schedule includes one of A/B → 6 + 5 = 11.
		const result = computeAktsTotals(['A', 'B', 'C'], { A: true }, meta({ A: 6, B: 6, C: 5 }));
		expect(result).toEqual({ totals: [11], partial: false });
	});

	it('enumerates distinct totals when OR alternatives differ', () => {
		// A(6) OR D(8), then mandatory C(5): 6+5 or 8+5 → 11 or 13.
		const result = computeAktsTotals(['A', 'D', 'C'], { A: true }, meta({ A: 6, D: 8, C: 5 }));
		expect(result).toEqual({ totals: [11, 13], partial: false });
	});

	it('handles every course chained into one OR group (one is scheduled)', () => {
		// Regression for the all-OR selection: each course is an alternative, so the
		// total is one course's credits — the distinct values, not their sum (26).
		const codes = ['MATH', 'SOFL1101', 'HIST', 'TURK', 'ISG', 'ENGL', 'SOFL1611'];
		const or = { MATH: true, SOFL1101: true, HIST: true, TURK: true, ISG: true, ENGL: true };
		const credits = meta({
			MATH: 7,
			SOFL1101: 4,
			HIST: 2,
			TURK: 2,
			ISG: 2,
			ENGL: 5,
			SOFL1611: 4
		});
		const result = computeAktsTotals(codes, or, credits);
		expect(result).toEqual({ totals: [2, 4, 5, 7], partial: false });
	});

	it('combines choices across multiple OR groups', () => {
		// (A6 OR D8) and (F7 OR G4): 6+7, 6+4, 8+7, 8+4 → 10, 12, 13, 15.
		const result = computeAktsTotals(
			['A', 'D', 'F', 'G'],
			{ A: true, F: true },
			meta({ A: 6, D: 8, F: 7, G: 4 })
		);
		expect(result).toEqual({ totals: [10, 12, 13, 15], partial: false });
	});

	it('marks the total partial when a course has no AKTS data', () => {
		const result = computeAktsTotals(['A', 'E'], {}, meta({ A: 6, E: null }));
		expect(result).toEqual({ totals: [6], partial: true });
	});

	it('excludes a mixed known/unknown OR run from the lower bound', () => {
		// A(6) OR E(unknown): the scheduler might pick E, whose credits we don't know
		// (and could be below 6), so 6 is NOT a valid floor. The slot contributes an
		// unknown amount → the running total is unchanged and the result is partial.
		const result = computeAktsTotals(['A', 'E'], { A: true }, meta({ A: 6, E: null }));
		expect(result).toEqual({ totals: [0], partial: true });
	});

	it('keeps the floor from mandatory courses when a mixed OR run is unknown', () => {
		// M(10) mandatory, then A(6) OR Z(unknown). Worst case the scheduler picks Z
		// (>= 0 credits), so the real floor is 10 — not 16.
		const result = computeAktsTotals(['M', 'A', 'Z'], { A: true }, meta({ M: 10, A: 6 }));
		expect(result).toEqual({ totals: [10], partial: true });
	});

	it('ignores a stale OR flag on the last selected course', () => {
		// C is last, so its OR connection has no following course and is dropped.
		const result = computeAktsTotals(['A', 'C'], { C: true }, meta({ A: 6, C: 5 }));
		expect(result).toEqual({ totals: [11], partial: false });
	});

	it('returns an empty selection as a single zero total', () => {
		expect(computeAktsTotals([], {}, meta({}))).toEqual({ totals: [0], partial: false });
	});

	it('treats a course missing from the catalog as unknown', () => {
		const result = computeAktsTotals(['A', 'Z'], {}, meta({ A: 6 }));
		expect(result).toEqual({ totals: [6], partial: true });
	});
});
