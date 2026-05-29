import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { locale, t, setLocale, messages, type Locale } from './index';
import { STORAGE_KEYS } from '$lib/storage/keys';

/** Collect the set of dot-notation leaf paths of a nested message object. */
const leafPaths = (obj: Record<string, unknown>, prefix = ''): string[] => {
	const paths: string[] = [];
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (value && typeof value === 'object') {
			paths.push(...leafPaths(value as Record<string, unknown>, path));
		} else {
			paths.push(path);
		}
	}
	return paths.sort();
};

describe('i18n store', () => {
	beforeEach(() => {
		localStorage.clear();
		setLocale('en');
	});

	it('translates keys for the active locale', () => {
		expect(get(t)('app.subtitle')).toBe('Course Planner');
		setLocale('tr');
		expect(get(t)('app.subtitle')).toBe('Ders Planlayıcı');
	});

	it('substitutes {{params}} placeholders', () => {
		expect(get(t)('courseSelector.removeCourse', { course: 'MATH 101' })).toBe(
			'Remove course MATH 101'
		);
	});

	it('resolves plural forms by count', () => {
		expect(get(t)('courseSelector.schedulesFound', { count: 1 })).toBe('1 Valid Schedule Found');
		expect(get(t)('courseSelector.schedulesFound', { count: 3 })).toBe('3 Valid Schedules Found');
	});

	it('returns the key itself when nothing matches', () => {
		expect(get(t)('does.not.exist')).toBe('does.not.exist');
	});

	it('reads nested keys', () => {
		expect(get(t)('courseSelector.connector.or')).toBe('OR');
	});

	it('updates the locale store and persists the choice', () => {
		setLocale('tr');
		expect(get(locale)).toBe('tr');
		expect(localStorage.getItem(STORAGE_KEYS.LOCALE)).toBe('tr');
		expect(document.documentElement.lang).toBe('tr');
	});

	it('keeps English and Turkish catalogues structurally in sync', () => {
		const enPaths = leafPaths(messages.en as unknown as Record<string, unknown>);
		const trPaths = leafPaths(messages.tr as unknown as Record<string, unknown>);
		expect(trPaths).toEqual(enPaths);
	});

	it('exposes every supported locale in messages', () => {
		const locales: Locale[] = ['en', 'tr'];
		for (const code of locales) {
			expect(messages[code]).toBeDefined();
		}
	});
});
