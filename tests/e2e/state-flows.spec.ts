import { expect, test, type Page } from '@playwright/test';
import { mockCourseApi, seedBrowserState } from './helpers';

const session = (day: string, start: string, end: string, classroom: string) => ({
	Day: day,
	'Start Time': start,
	'End Time': end,
	Section: '01',
	Classroom: classroom
});

// Adds a second term on top of the default single-term mock.
const mockTwoTerms = async (page: Page) => {
	await page.route('**/data/terms/index.json', async (route) => {
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify([
				{ term: '2025-2026 Fall', file: '2025-2026_fall.json' },
				{ term: '2025-2026 Spring', file: '2025-2026_spring.json' }
			])
		});
	});
	await page.route('**/data/terms/2025-2026_spring.json', async (route) => {
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ 'CHEM 201': [session('Wednesday', '13:40', '14:30', 'C3')] })
		});
	});
};

const selectCourse = async (page: Page, query: string, course: RegExp) => {
	const search = page.getByRole('combobox', { name: 'Type to search courses' });
	await search.fill(query);
	await page.getByRole('option', { name: course }).click();
};

test.beforeEach(async ({ page }) => {
	await seedBrowserState(page);
	await mockCourseApi(page);
});

test('switching terms resets the selection and restores each term on return', async ({ page }) => {
	await mockTwoTerms(page);
	await page.goto('/');

	// The latest term (Spring) is selected first; switch to Fall and pick a course.
	await page.getByRole('combobox', { name: 'Spring 2025-2026' }).click();
	await page.getByRole('option', { name: 'Fall 2025-2026' }).click();
	await selectCourse(page, 'math', /MATH 101/);
	await expect(page.getByText('A1').first()).toBeVisible();

	await page.getByRole('combobox', { name: 'Fall 2025-2026' }).click();
	await page.getByRole('option', { name: 'Spring 2025-2026' }).click();
	await expect(page.getByRole('button', { name: 'Remove course MATH 101' })).toHaveCount(0);
	await selectCourse(page, 'chem', /CHEM 201/);
	await expect(page.getByText('C3').first()).toBeVisible();

	await page.getByRole('combobox', { name: 'Spring 2025-2026' }).click();
	await page.getByRole('option', { name: 'Fall 2025-2026' }).click();
	await expect(page.getByRole('button', { name: 'Remove course MATH 101' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Remove course CHEM 201' })).toHaveCount(0);
	await expect(page.getByText('A1').first()).toBeVisible();
});

test('a loaded saved schedule replaces the current selection', async ({ page }) => {
	await page.goto('/');

	await selectCourse(page, 'math', /MATH 101/);
	await expect(page.getByText('A1').first()).toBeVisible();

	await page.getByRole('button', { name: 'Save Schedule' }).first().click();
	const saveDialog = page.getByRole('dialog');
	await saveDialog.getByPlaceholder('Schedule Name').fill('Plan A');
	await saveDialog.getByRole('button', { name: 'Save', exact: true }).click();
	await expect(saveDialog).toHaveCount(0);

	await page.getByRole('button', { name: 'Remove course MATH 101' }).click();
	await selectCourse(page, 'phys', /PHYS 101/);
	await expect(page.getByText('B2').first()).toBeVisible();

	await page.getByRole('button', { name: 'Load Schedule' }).first().click();
	await page.getByRole('dialog').getByRole('button', { name: 'Load Schedule' }).click();

	await expect(page.getByRole('button', { name: 'Remove course MATH 101' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Remove course PHYS 101' })).toHaveCount(0);
	await expect(page.getByText('A1').first()).toBeVisible();
});

test('switching the language updates the interface', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('combobox', { name: 'Type to search courses' })).toBeVisible();

	await page.getByRole('combobox', { name: /Switch language/ }).click();
	await page.getByRole('option', { name: 'Türkçe' }).click();

	await expect(page.getByRole('combobox', { name: 'Ders aramak için yazın' })).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
});
