// Deterministic color generator for courses.
// The previous fixed palette caused frequent collisions (multiple courses sharing the same color)
// when many courses are displayed.

// FNV-1a hash function for better avalanche effect on short, similar strings
const hashString = (value: string): number => {
	let hash = 2166136261;
	for (let i = 0; i < value.length; i += 1) {
		hash ^= value.charCodeAt(i);
		// 32-bit FNV prime: 16777619
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
};

// sRGB channel (0-255) -> linear light, per the WCAG relative-luminance formula.
const linearize = (channel: number): number => {
	const c = channel / 255;
	return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

// Minimal HSL -> RGB (0-255) using the standard conversion.
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
	const sat = s / 100;
	const lum = l / 100;
	const k = (n: number) => (n + h / 30) % 12;
	const a = sat * Math.min(lum, 1 - lum);
	const f = (n: number) => lum - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
	return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};

// WCAG contrast ratio of white (#fff) against the given HSL color.
const whiteContrastRatio = (h: number, s: number, l: number): number => {
	const [r, g, b] = hslToRgb(h, s, l);
	const bg = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
	return 1.05 / (bg + 0.05);
};

export const colorForCourse = (course: string): string => {
	if (!course) return 'hsl(210, 80%, 38%)';

	// Use a golden-angle step to spread hues. Round to the same precision we emit
	// so the contrast check below matches the color that actually renders.
	const hue = Number(((hashString(course) * 137.508) % 360).toFixed(1));
	const saturation = 72;

	// Course chips render white label text, so darken each hue just enough to
	// clear WCAG AA (>= 4.5:1) against white. Lighter-reading hues (cyan, green,
	// yellow) end up darker than reds/blues, but every chip stays legible. A
	// small margin (4.55) keeps it clear of the threshold after rounding.
	let lightness = 38;
	while (lightness > 22 && whiteContrastRatio(hue, saturation, lightness) < 4.55) {
		lightness -= 1;
	}

	return `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`;
};
