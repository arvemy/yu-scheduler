import { describe, it, expect } from 'vitest';
import { rangesOverlap, slotStringToRange } from './time';

describe('time utils', () => {
	describe('slotStringToRange', () => {
		it('splits a "HH:MM-HH:MM" slot into start/end', () => {
			expect(slotStringToRange('08:40-09:30')).toEqual({ start: '08:40', end: '09:30' });
		});
	});

	describe('rangesOverlap', () => {
		it('returns true for partially overlapping ranges', () => {
			expect(rangesOverlap({ start: '09:00', end: '10:00' }, { start: '09:30', end: '10:30' })).toBe(
				true
			);
		});

		it('returns true when one range contains the other', () => {
			expect(rangesOverlap({ start: '09:00', end: '12:00' }, { start: '10:00', end: '11:00' })).toBe(
				true
			);
		});

		it('returns false for ranges that only touch at the edge', () => {
			expect(rangesOverlap({ start: '09:00', end: '10:00' }, { start: '10:00', end: '11:00' })).toBe(
				false
			);
		});

		it('returns false for disjoint ranges', () => {
			expect(rangesOverlap({ start: '09:00', end: '10:00' }, { start: '11:00', end: '12:00' })).toBe(
				false
			);
		});

		it('is symmetric in its arguments', () => {
			const a = { start: '09:00', end: '10:00' };
			const b = { start: '09:30', end: '11:00' };
			expect(rangesOverlap(a, b)).toBe(rangesOverlap(b, a));
		});
	});
});
