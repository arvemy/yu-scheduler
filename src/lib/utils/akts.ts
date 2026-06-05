import type { CourseMeta } from '$lib/types';

export interface AktsTotals {
	/**
	 * Distinct possible AKTS totals, ascending. A single value unless OR
	 * alternatives carry different credits (then one entry per possible sum).
	 * Empty only when the selection is empty.
	 */
	totals: number[];
	/**
	 * True when some AKTS data is missing (a mandatory course, or any alternative in
	 * an OR run, has no value), so `totals` is only a lower bound on the real load.
	 */
	partial: boolean;
}

/**
 * Possible AKTS totals for a course selection.
 *
 * Adjacent courses joined by an OR connection are alternatives — the scheduler
 * includes exactly one — so an OR run contributes a single course's credits rather
 * than the sum of every alternative. When a run's alternatives carry different
 * credits the selection has several possible totals (e.g. `2 or 4 or 5 or 7`), so
 * the distinct sums are enumerated instead of being collapsed.
 *
 * `orConnections[code]` means `code` is OR-connected to the *next* selected course;
 * the flag on the last entry has no following course and is ignored, mirroring the
 * scheduler's grouping.
 */
export const computeAktsTotals = (
	selectedCourses: string[],
	orConnections: Record<string, boolean>,
	courseMeta: Record<string, CourseMeta>
): AktsTotals => {
	// Running set of possible totals; each OR run multiplies it by its choices.
	let totals = new Set<number>([0]);
	let partial = false;

	let i = 0;
	while (i < selectedCourses.length) {
		// Collect an OR run: courses chained to the next via `orConnections`.
		const group = [selectedCourses[i]];
		while (i < selectedCourses.length - 1 && orConnections[selectedCourses[i]]) {
			i += 1;
			group.push(selectedCourses[i]);
		}
		i += 1;

		// Distinct known credits among this slot's alternatives (one is chosen).
		const known = new Set<number>();
		let hasUnknown = false;
		for (const code of group) {
			const akts = courseMeta[code]?.akts;
			if (akts == null) hasUnknown = true;
			else known.add(akts);
		}

		// If any alternative lacks AKTS data, the scheduler might pick that one — its
		// credits could be anything, even less than a known sibling's — so the known
		// values are not a valid lower bound for this slot. Treat the whole slot as an
		// unknown (>= 0) contribution: leave the running totals untouched (adding 0)
		// and flag the result as a lower bound. This also covers a fully-unknown slot.
		if (hasUnknown) {
			partial = true;
			continue;
		}

		// Every alternative is known: expand every running total by each possible
		// credit value for this slot.
		const next = new Set<number>();
		for (const t of totals) {
			for (const v of known) next.add(t + v);
		}
		totals = next;
	}

	return { totals: [...totals].sort((a, b) => a - b), partial };
};
