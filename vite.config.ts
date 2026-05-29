import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), svelteTesting()],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./vitest-setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		// SvelteKit's `$app/*` virtual modules need the framework runtime, so
		// stub the two we use with plain modules for unit/component tests.
		alias: {
			'$app/environment': new URL('./src/test/mocks/app-environment.ts', import.meta.url).pathname,
			'$app/paths': new URL('./src/test/mocks/app-paths.ts', import.meta.url).pathname
		}
	}
});
