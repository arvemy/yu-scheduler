import type { Page } from '@playwright/test';

export const seedBrowserState = async (page: Page) => {
	await page.addInitScript(() => {
		localStorage.setItem('yuScheduler:welcomeDismissed', 'true');
		localStorage.setItem('yuScheduler:locale', 'en');
	});
};

export const mockCourseApi = async (page: Page) => {
	await page.route('**/data/terms/index.json', async (route) => {
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify([{ term: '2025-2026 Fall', file: '2025-2026_fall.json' }])
		});
	});

	await page.route('**/data/terms/2025-2026_fall.json', async (route) => {
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({
				'MATH 101': [
					{
						Day: 'Monday',
						'Start Time': '09:40',
						'End Time': '10:30',
						Section: '01',
						Classroom: 'A1'
					}
				],
				'PHYS 101': [
					{
						Day: 'Tuesday',
						'Start Time': '10:40',
						'End Time': '11:30',
						Section: '01',
						Classroom: 'B2'
					}
				]
			})
		});
	});
};
