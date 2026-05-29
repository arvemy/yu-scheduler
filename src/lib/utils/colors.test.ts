import { describe, it, expect } from 'vitest';
import { colorForCourse } from './colors';

describe('colorForCourse', () => {
	it('should generate distinct hues for similar course codes', () => {
		const c1 = colorForCourse('COMP 3304');
		const c2 = colorForCourse('COMP 3330');

		// Extract hue from hsl string: "hsl(123.4, 72%, 38%)"
		const getHue = (color: string) => parseFloat(color.match(/hsl\(([\d.]+)/)?.[1] || '0');

		const hue1 = getHue(c1);
		const hue2 = getHue(c2);

		// They should be significantly different (e.g., > 10 degrees)
		const diff = Math.abs(hue1 - hue2);
		const circularDiff = Math.min(diff, 360 - diff);

		expect(circularDiff).toBeGreaterThan(10);
	});

	it('should return default color for empty course', () => {
		expect(colorForCourse('')).toBe('hsl(210, 80%, 38%)');
	});

	it('should be deterministic', () => {
		expect(colorForCourse('COMP 1010')).toBe(colorForCourse('COMP 1010'));
	});
});
