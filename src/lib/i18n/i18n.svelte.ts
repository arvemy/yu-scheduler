import { dev } from '$app/env';
import { STORAGE_KEYS } from '#lib/storage/keys.js';
import { en, type Messages } from './locales/en.js';
import { tr } from './locales/tr.js';

/** Supported locale codes. */
export type Locale = 'en' | 'tr';

/** A translation lookup: dot-notation key (+ optional params) → resolved string. */
export type Translator = (key: string, params?: Record<string, string | number>) => string;

/**
 * All message catalogues, keyed by locale. English is the canonical shape
 * ({@link Messages}); other locales are checked against it at compile time.
 */
export const messages: Record<Locale, Messages> = { en, tr };

const DEFAULT_LOCALE: Locale = 'en';
const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'tr'];

const isLocale = (value: unknown): value is Locale =>
	typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);

/** Resolve a dot-notation key (e.g. `courseSelector.connector.and`) to a string. */
const getNestedValue = (source: Messages, path: string): string | undefined => {
	const parts = path.split('.');
	let value: unknown = source;
	for (const part of parts) {
		if (!value || typeof value !== 'object') return undefined;
		value = (value as Record<string, unknown>)[part];
	}
	return typeof value === 'string' ? value : undefined;
};

/** Replace `{{token}}` placeholders with the matching param value. */
const applyParams = (template: string, params?: Record<string, string | number>): string => {
	if (!params) return template;
	return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		const value = params[key];
		return value === undefined ? match : String(value);
	});
};

/** Pick the initial locale from storage, the document, or the browser. */
const detectLocale = (): Locale => {
	try {
		const stored = localStorage.getItem(STORAGE_KEYS.LOCALE);
		if (isLocale(stored)) return stored;
	} catch (err) {
		if (dev) console.warn('[DEV] Failed to read locale from localStorage', err);
	}
	if (typeof document !== 'undefined') {
		const lang = document.documentElement.lang;
		if (lang?.startsWith('tr')) return 'tr';
	}
	if (typeof navigator !== 'undefined') {
		const lang = navigator.language || '';
		if (lang.startsWith('tr')) return 'tr';
	}
	return DEFAULT_LOCALE;
};

let currentLocale = $state<Locale>(detectLocale());

/**
 * Reactive i18n state. `i18n.locale` is backed by `$state`, so reading it in a
 * template, `$derived` or `$effect` re-runs when {@link setLocale} changes it.
 */
export const i18n = {
	get locale(): Locale {
		return currentLocale;
	}
};

/**
 * Translate a dot-notation key for the active locale. It reads the locale `$state`,
 * so calls made in templates and `$derived` expressions update on locale change.
 *
 * Pluralisation: pass a numeric `count` param and the lookup first tries
 * `${key}_one` / `${key}_other`, falling back to the base key. Missing keys
 * fall back to English, then to the raw key itself.
 */
export const t: Translator = (key, params) => {
	const active = messages[currentLocale];
	const count = params?.count;
	let template: string | undefined;
	if (typeof count === 'number') {
		const pluralKey = `${key}_${count === 1 ? 'one' : 'other'}`;
		template = getNestedValue(active, pluralKey) ?? getNestedValue(messages.en, pluralKey);
	}
	if (!template) {
		template = getNestedValue(active, key) ?? getNestedValue(messages.en, key);
	}
	return applyParams(template ?? key, params);
};

/** Set the active locale, persisting it and reflecting it on `<html lang>`. */
export const setLocale = (next: Locale): void => {
	currentLocale = next;
	try {
		localStorage.setItem(STORAGE_KEYS.LOCALE, next);
	} catch (err) {
		if (dev) console.warn('[DEV] Failed to save locale to localStorage', err);
	}
	if (typeof document !== 'undefined') {
		document.documentElement.lang = next;
	}
};

export type { Messages };
