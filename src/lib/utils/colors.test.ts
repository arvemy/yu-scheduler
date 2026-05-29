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

	it('keeps white label text at WCAG AA contrast (>= 4.5:1) for every hue', () => {
		const linearize = (ch: number) => {
			const c = ch / 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		};
		const hslToRgb = (h: number, s: number, l: number) => {
			s /= 100;
			l /= 100;
			const k = (n: number) => (n + h / 30) % 12;
			const a = s * Math.min(l, 1 - l);
			const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
			return [f(0), f(8), f(4)].map((x) => Math.round(x * 255));
		};
		const whiteContrast = (color: string) => {
			const m = color.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
			if (!m) throw new Error(`Unexpected color format: ${color}`);
			const [r, g, b] = hslToRgb(Number(m[1]), Number(m[2]), Number(m[3]));
			const bg = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
			return 1.05 / (bg + 0.05);
		};

		// Sweep many course codes so a wide spread of hues is exercised.
		for (let i = 0; i < 300; i += 1) {
			const color = colorForCourse(`COURSE ${i}`);
			expect(whiteContrast(color)).toBeGreaterThanOrEqual(4.5);
		}
	});
});
