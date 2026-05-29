import { describe, it, expect } from 'vitest';
import { getLatestTerm, translateTerm } from './term';
import type { Translator } from '$lib/i18n';

/** Minimal fake translator that resolves only the keys translateTerm needs. */
const makeTranslator = (locale: 'en' | 'tr'): Translator => {
	const dict: Record<string, string> = {
		'locale.code': locale,
		'terms.fall': locale === 'tr' ? 'Güz' : 'Fall',
		'terms.spring': locale === 'tr' ? 'Bahar' : 'Spring',
		'terms.summer': locale === 'tr' ? 'Yaz' : 'Summer'
	};
	return (key) => dict[key] ?? key;
};

describe('translateTerm', () => {
	const en = makeTranslator('en');
	const tr = makeTranslator('tr');

	it('formats a year-range + season term (English: season first)', () => {
		expect(translateTerm('2025-2026 Fall', en)).toBe('Fall 2025-2026');
	});

	it('formats a year-range + season term (Turkish: year first)', () => {
		expect(translateTerm('2025-2026 Fall', tr)).toBe('2025-2026 Güz');
	});

	it('formats a single-year season term', () => {
		expect(translateTerm('Spring 2025', en)).toBe('Spring 2025');
		expect(translateTerm('Spring 2025', tr)).toBe('2025 Bahar');
	});

	it('returns an empty string for empty input', () => {
		expect(translateTerm('', en)).toBe('');
	});

	it('returns the original string for unrecognised formats', () => {
		expect(translateTerm('Not A Term', en)).toBe('Not A Term');
	});
});

describe('getLatestTerm', () => {
	it('picks the most recent year-range term (Spring after Fall in the same academic year)', () => {
		const terms = ['2024-2025 Spring', '2025-2026 Fall', '2025-2026 Spring'];
		expect(getLatestTerm(terms)).toBe('2025-2026 Spring');
	});

	it('orders single-year terms by year then season', () => {
		expect(getLatestTerm(['Fall 2024', 'Spring 2025'])).toBe('Spring 2025');
	});

	it('returns null for an empty list', () => {
		expect(getLatestTerm([])).toBeNull();
	});

	it('falls back to the last element when nothing is recognised', () => {
		expect(getLatestTerm(['alpha', 'beta'])).toBe('beta');
	});
});
