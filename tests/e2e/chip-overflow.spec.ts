import { expect, test } from '@playwright/test';

const TERM = '2025-2026 Fall';
const TERM_FILE = '2025-2026_fall.json';

// Selection mirroring the reported screenshot: seven OR-connected courses with
// long titles (and a couple with multiple sections, so the section <select>
// widens those chips).
const SELECTED = [
	'MATH 1131',
	'SOFL 1101',
	'HIST 1110',
	'TURK 1110',
	'ISG 9110',
	'ENGL 0020',
	'SOFL 1611'
];
const OR_CONNECTIONS: Record<string, boolean> = {
	'MATH 1131': true,
	'SOFL 1101': true,
	'HIST 1110': true,
	'TURK 1110': true,
	'ISG 9110': true,
	'ENGL 0020': true
};

const session = (day: string, start: string, end: string, section: string) => ({
	Day: day,
	'Start Time': start,
	'End Time': end,
	Section: section,
	Classroom: 'A1'
});

const TERM_DATA: Record<string, ReturnType<typeof session>[]> = {
	'MATH 1131': [session('Monday', '09:40', '10:30', '01')],
	'SOFL 1101': [
		session('Tuesday', '10:40', '11:30', '01'),
		session('Wednesday', '10:40', '11:30', '02')
	],
	'HIST 1110': [session('Thursday', '12:40', '13:30', '01')],
	'TURK 1110': [session('Friday', '08:40', '09:30', '01')],
	'ISG 9110': [session('Monday', '13:40', '14:30', '01')],
	'ENGL 0020': [session('Tuesday', '15:40', '16:30', '01')],
	'SOFL 1611': [
		session('Wednesday', '08:40', '09:30', '01'),
		session('Thursday', '08:40', '09:30', '02')
	]
};

const CATALOG = {
	academic_year: '2025-2026',
	courses: {
		'MATH 1131': { title: { en: 'Calculus I', tr: 'Analiz I' }, akts: 7 },
		'SOFL 1101': {
			title: { en: 'English for Academic Purposes', tr: 'Akademik İngilizce' },
			akts: 4
		},
		'HIST 1110': { title: { en: 'Principles of Atatürk I', tr: 'Atatürk İlkeleri I' }, akts: 2 },
		'TURK 1110': { title: { en: 'Turkish I', tr: 'Türk Dili I' }, akts: 2 },
		'ISG 9110': {
			title: { en: 'Occupational Health and Safety', tr: 'İş Sağlığı ve Güvenliği' },
			akts: 2
		},
		'ENGL 0020': { title: { en: 'Worlds of Literature', tr: 'Edebî Dünyalar' }, akts: 5 },
		'SOFL 1611': { title: { en: 'German I', tr: 'Almanca I' }, akts: 4 }
	},
	programs: []
};

test.beforeEach(async ({ page }) => {
	await page.addInitScript(
		([term, selected, or]) => {
			localStorage.setItem('yuScheduler:welcomeDismissed', 'true');
			localStorage.setItem('yuScheduler:locale', 'en');
			localStorage.setItem('yuScheduler:lastSelectedTerm', term as string);
			// `+page.svelte` restores the selection from the `lastGenerated` key on
			// term change; seeding it here is what actually populates the chips.
			localStorage.setItem(
				`yuScheduler:${term}:lastGenerated`,
				JSON.stringify({ term, selectedCourses: selected, scheduleData: null })
			);
			localStorage.setItem(`yuScheduler:${term}:selectedCourses`, JSON.stringify(selected));
			localStorage.setItem(`yuScheduler:${term}:orConnections`, JSON.stringify(or));
		},
		[TERM, SELECTED, OR_CONNECTIONS] as const
	);

	await page.route('**/data/terms/index.json', (route) =>
		route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify([{ term: TERM, file: TERM_FILE }])
		})
	);
	await page.route(`**/data/terms/${TERM_FILE}`, (route) =>
		route.fulfill({ contentType: 'application/json', body: JSON.stringify(TERM_DATA) })
	);
	await page.route('**/data/catalog/*.json', (route) =>
		route.fulfill({ contentType: 'application/json', body: JSON.stringify(CATALOG) })
	);
});

test('selected OR-connected course chips do not overflow a narrow viewport', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 });
	await page.goto('/');

	// Wait until the seeded selection has rendered as chips.
	await expect(page.getByText('MATH 1131').first()).toBeVisible();
	await expect(page.getByText('SOFL 1611').first()).toBeVisible();

	// The page must not gain a horizontal scrollbar from the chips overflowing.
	const overflow = await page.evaluate(() => ({
		docScroll: document.documentElement.scrollWidth,
		docClient: document.documentElement.clientWidth,
		bodyScroll: document.body.scrollWidth,
		innerWidth: window.innerWidth
	}));

	expect(overflow.docScroll).toBeLessThanOrEqual(overflow.docClient + 1);
	expect(overflow.bodyScroll).toBeLessThanOrEqual(overflow.innerWidth + 1);
});
