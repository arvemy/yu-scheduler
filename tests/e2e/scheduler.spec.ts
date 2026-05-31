import { expect, test } from '@playwright/test';
import { mockCourseApi, seedBrowserState } from './helpers';

test.beforeEach(async ({ page }) => {
	await seedBrowserState(page);
	await mockCourseApi(page);
});

test('selects a mocked course, generates a schedule, and restores it after reload', async ({
	page
}) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { name: 'YU Scheduler' })).toBeVisible();
	await expect(page.getByRole('button', { name: /Show courses in group MATH/ })).toBeVisible();
	await page.waitForTimeout(150);
	const search = page.getByRole('combobox', { name: 'Type to search courses' });
	await search.fill('math');
	await page.getByRole('option', { name: /MATH 101/ }).click();

	await expect(page.getByText('MATH 101').first()).toBeVisible();
	await expect(page.getByText('A1').first()).toBeVisible();

	await page.reload();
	await expect(page.getByText('MATH 101').first()).toBeVisible();
	await expect(page.getByText('A1').first()).toBeVisible();
});
