/**
 * Case- and diacritic-insensitive key for substring search matching.
 *
 * JavaScript's locale-independent `toLowerCase()` maps the Turkish dotted capital
 * `İ` to `i` + U+0307 (combining dot above), so `"İNGİLİZCE".toLowerCase()` does
 * not contain a plain `"ingilizce"`. Decomposing to NFD and stripping combining
 * marks removes that dot — and folds `ç ğ ö ş ü` onto `c g o s u` too, so an ASCII
 * query matches accented titles.
 *
 * The Turkish dotless `ı` has no combining mark to strip, so it is folded onto `i`
 * explicitly. Catalog titles are uppercase (`KULLANIMI` → `kullanimi`) while users
 * type the natural lowercase Turkish form (`kullanımı`); without this fold the
 * dotless `ı` in the query would never match the plain `i` in the title.
 */
export const normalizeForSearch = (value: string): string =>
	value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
