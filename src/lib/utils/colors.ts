// Deterministic color generator for courses.
// The previous fixed palette caused frequent collisions (multiple courses sharing the same color)
// when many courses are displayed.

const hashString = (value: string): number => {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash << 5) - hash + value.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
};

export const colorForCourse = (course: string): string => {
	if (!course) return 'hsl(210, 80%, 38%)';

	// Use a golden-angle step to spread hues.
	const hue = (hashString(course) * 137.508) % 360;
	const saturation = 72;
	// Darken yellow-ish hues a bit for better white-text contrast.
	const lightness = hue > 35 && hue < 85 ? 32 : 38;

	return `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`;
};
