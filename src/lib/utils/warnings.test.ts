import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { translateWarning, translateWarnings } from './warnings';
import { setLocale, t as tStore } from '$lib/i18n';
import type { Translator } from '$lib/i18n';
import type { WarningInfo } from '$lib/types';

const warn = (code: string, params: Record<string, unknown> = {}, message = ''): WarningInfo => ({
	code,
	message,
	params
});

describe('translateWarning', () => {
	let t: Translator;
	beforeEach(() => {
		setLocale('en');
		t = get(tStore);
	});

	it('translates a known code with params', () => {
		const result = translateWarning(warn('COURSE_NOT_AVAILABLE', { course: 'MATH 101' }), t);
		expect(result).toContain('MATH 101');
	});

	it('translates a conflict between two courses', () => {
		const result = translateWarning(
			warn('TIME_CONFLICT_BETWEEN_COURSES', { course1: 'MATH 101', course2: 'PHYS 101' }),
			t
		);
		expect(result).toContain('MATH 101');
		expect(result).toContain('PHYS 101');
	});

	it('falls back to the raw message for an unknown code', () => {
		expect(translateWarning(warn('SOMETHING_NEW', {}, 'raw fallback'), t)).toBe('raw fallback');
	});
});

describe('translateWarnings', () => {
	let t: Translator;
	beforeEach(() => {
		setLocale('en');
		t = get(tStore);
	});

	it('de-duplicates identical translated warnings', () => {
		const codes = [
			warn('TIME_CONFLICT_BETWEEN_COURSES', { course1: 'A', course2: 'B' }),
			warn('TIME_CONFLICT_BETWEEN_COURSES', { course1: 'A', course2: 'B' })
		];
		const result = translateWarnings([], codes, t);
		expect(result).toHaveLength(1);
	});

	it('keeps distinct conflict pairs', () => {
		const codes = [
			warn('TIME_CONFLICT_BETWEEN_COURSES', { course1: 'A', course2: 'B' }),
			warn('TIME_CONFLICT_BETWEEN_COURSES', { course1: 'C', course2: 'D' })
		];
		expect(translateWarnings([], codes, t)).toHaveLength(2);
	});

	it('suppresses the generic conflict code when a specific one is present', () => {
		const codes = [
			warn('TIME_CONFLICT_BETWEEN_COURSES', { course1: 'A', course2: 'B' }),
			warn('NO_VALID_SCHEDULE_CONFLICTS')
		];
		const result = translateWarnings([], codes, t);
		const generic = get(tStore)('errors.noValidScheduleConflicts');
		expect(result).not.toContain(generic);
	});

	it('falls back to the plain warnings array when no codes are given', () => {
		expect(translateWarnings(['one', 'one', 'two'], [], t)).toEqual(['one', 'two']);
	});
});
