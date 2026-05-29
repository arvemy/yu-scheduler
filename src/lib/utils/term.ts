import type { Translator } from '$lib/i18n';

export const translateTerm = (term: string, t: Translator): string => {
	if (!term) return '';

	const mSeasonYear = term.match(/^(Fall|Spring|Summer|G[üu]z|Bahar|Yaz)\s+(\d{4})$/i);
	const mYearRangeSeason = term.match(
		/^(\d{4})(?:-(\d{4}))?\s+(Fall|Spring|Summer|G[üu]z|Bahar|Yaz)$/i
	);

	let seasonRaw: string;
	let yearText: string;

	if (mSeasonYear) {
		seasonRaw = mSeasonYear[1].toLowerCase();
		yearText = mSeasonYear[2];
	} else if (mYearRangeSeason) {
		seasonRaw = mYearRangeSeason[3].toLowerCase();
		yearText = mYearRangeSeason[2]
			? `${mYearRangeSeason[1]}-${mYearRangeSeason[2]}`
			: mYearRangeSeason[1];
	} else {
		return term;
	}

	let seasonKey: string;
	switch (seasonRaw) {
		case 'fall':
		case 'guz':
		case 'güz':
			seasonKey = 'terms.fall';
			break;
		case 'spring':
		case 'bahar':
			seasonKey = 'terms.spring';
			break;
		case 'summer':
		case 'yaz':
			seasonKey = 'terms.summer';
			break;
		default:
			return term;
	}

	const locale = t('locale.code');
	const seasonTranslated = t(seasonKey);
	return locale === 'tr' ? `${yearText} ${seasonTranslated}` : `${seasonTranslated} ${yearText}`;
};

export const getLatestTerm = (list: string[]): string | null => {
	const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
	const seasonKey = (raw: string): 'spring' | 'summer' | 'fall' | null => {
		const r = raw.toLowerCase();
		if (r === 'spring' || r === 'bahar') return 'spring';
		if (r === 'summer' || r === 'yaz') return 'summer';
		if (r === 'fall' || r === 'guz' || r === 'güz') return 'fall';
		return null;
	};
	const weightSingle = { spring: 1, summer: 2, fall: 3 } as const;
	const weightRange = { fall: 1, spring: 2, summer: 3 } as const;

	let best: { term: string; score: number } | null = null;
	for (const item of list) {
		const txt = norm(item);
		const m1 = txt.match(/^(Fall|Spring|Summer|G[üu]z|Bahar|Yaz)\s+(\d{4})$/i);
		if (m1) {
			const sk = seasonKey(m1[1]);
			const y = parseInt(m1[2], 10) || 0;
			if (sk) {
				const score = y * 10 + weightSingle[sk];
				if (!best || score > best.score) best = { term: item, score };
				continue;
			}
		}
		const m2 = txt.match(/^(\d{4})\s*-\s*(\d{4})\s+(Fall|Spring|Summer|G[üu]z|Bahar|Yaz)$/i);
		if (m2) {
			const endY = parseInt(m2[2], 10) || 0;
			const sk = seasonKey(m2[3]);
			if (sk) {
				const score = endY * 10 + weightRange[sk];
				if (!best || score > best.score) best = { term: item, score };
				continue;
			}
		}
	}
	return best?.term ?? (list.length ? list[list.length - 1] : null);
};
