import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockCourseApi, seedBrowserState } from './helpers';

test.beforeEach(async ({ page }) => {
	await seedBrowserState(page);
	await mockCourseApi(page);
});

test('mobile viewport exposes course and schedule tabs', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');

	await expect(page.getByRole('tab', { name: 'Courses' })).toHaveAttribute('aria-selected', 'true');
	await page.getByRole('tab', { name: 'Schedule' }).click();
	await expect(page.getByRole('tab', { name: 'Schedule' })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await expect(page.getByRole('group', { name: 'Schedule' })).toBeVisible();
});

test('main app content has no detectable axe violations', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'YU Scheduler' })).toBeVisible();

	const accessibilityScanResults = await new AxeBuilder({ page })
		.include('main')
		.disableRules(['color-contrast'])
		.analyze();

	expect(accessibilityScanResults.violations).toEqual([]);
});

test('home route meets a local preview performance smoke budget', async ({ page }) => {
	const startedAt = Date.now();
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'YU Scheduler' })).toBeVisible();
	const timeToVisibleHeading = Date.now() - startedAt;

	const metrics = await page.evaluate(() => {
		const navigation = performance.getEntriesByType('navigation')[0] as
			| PerformanceNavigationTiming
			| undefined;
		const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
		const scriptBytes = resources
			.filter((entry) => entry.initiatorType === 'script')
			.reduce((total, entry) => total + (entry.transferSize || 0), 0);

		return {
			domContentLoadedMs: navigation
				? navigation.domContentLoadedEventEnd - navigation.startTime
				: 0,
			resourceCount: resources.length,
			scriptBytes
		};
	});

	expect(timeToVisibleHeading).toBeLessThan(8_000);
	expect(metrics.domContentLoadedMs).toBeLessThan(5_000);
	expect(metrics.resourceCount).toBeLessThan(100);
	expect(metrics.scriptBytes).toBeLessThan(2_500_000);
});
