export interface TimeRange {
	start: string;
	end: string;
}

const toMinutes = (t: string): number => {
	const [h, m] = t.split(':').map(Number);
	return h * 60 + m;
};

export const rangesOverlap = (a: TimeRange, b: TimeRange): boolean => {
	const aStart = toMinutes(a.start);
	const aEnd = toMinutes(a.end);
	const bStart = toMinutes(b.start);
	const bEnd = toMinutes(b.end);
	return aStart < bEnd && aEnd > bStart;
};

export const slotStringToRange = (slot: string): TimeRange => {
	const [start, end] = slot.split('-');
	return { start, end };
};
