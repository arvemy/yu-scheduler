import { describe, it, expect } from 'vitest';
import { normalizeForSearch } from './search';

describe('normalizeForSearch', () => {
	it('lets a plain ASCII query match a Turkish dotted-İ title', () => {
		// Regression: "İ".toLowerCase() === "i̇" (combining dot above), which a
		// plain "ingilizce" query would otherwise never match.
		const title = normalizeForSearch('İNGİLİZCE I');
		expect(title.includes(normalizeForSearch('ingilizce'))).toBe(true);
	});

	it('folds Turkish accented letters onto ASCII', () => {
		expect(normalizeForSearch('ÖĞRENCİ')).toBe('ogrenci');
		expect(normalizeForSearch('Çağ')).toBe('cag');
		expect(normalizeForSearch('Şişe')).toBe('sise');
		expect(normalizeForSearch('Üniversite')).toBe('universite');
	});

	it('leaves the combining dot out of a lowercased İ', () => {
		expect(normalizeForSearch('İ')).toBe('i');
		expect(normalizeForSearch('İ')).not.toContain('̇');
	});

	it('lowercases ASCII codes without otherwise altering them', () => {
		expect(normalizeForSearch('MATH 1131')).toBe('math 1131');
	});

	it('folds Turkish dotless ı onto i so lowercase queries match uppercase titles', () => {
		// Regression: catalog titles are uppercase ("KULLANIMI" → "kullanimi") while
		// users type the natural lowercase Turkish form ("kullanımı"). Without folding
		// the dotless ı, the substring check would never match.
		expect(normalizeForSearch('ı')).toBe('i');
		expect(normalizeForSearch('KULLANIMI')).toBe('kullanimi');
		const title = normalizeForSearch('KLAVYE KULLANIMI');
		expect(title.includes(normalizeForSearch('kullanımı'))).toBe(true);
		// ş still folds to s, and the dotless ı now folds to i too.
		expect(normalizeForSearch('ışık')).toBe('isik');
	});

	it('collapses internal whitespace and trims so spacing quirks still match', () => {
		// Regression: the catalog ships a doubled-space "SOFTWARE  ENGINEERING";
		// a normally typed single-space query must still match it.
		expect(normalizeForSearch('SOFTWARE  ENGINEERING')).toBe('software engineering');
		expect(normalizeForSearch('  trim  me  ')).toBe('trim me');
		const title = normalizeForSearch('SOFTWARE  ENGINEERING');
		expect(title.includes(normalizeForSearch('software engineering'))).toBe(true);
	});
});
