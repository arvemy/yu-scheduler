import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),

		// Content-Security-Policy. `hash` mode hashes SvelteKit's inline bootstrap
		// script at build time, so `script-src` stays strict (no 'unsafe-inline')
		// and self-updates on every build. SvelteKit emits this policy on the
		// document response; the header-only protections it can't express
		// (X-Frame-Options, Referrer-Policy, ...) are set in src/hooks.server.ts
		// for worker responses and mirrored in `_headers` for static assets.
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				// Components and bits-ui set inline style attributes (positioning,
				// transitions); those require 'unsafe-inline' and cannot be hashed.
				'style-src': ['self', 'unsafe-inline'],
				// data:/blob: cover the favicon, logos, and the modern-screenshot
				// PNG export (canvas/blob) used by "Download as image".
				'img-src': ['self', 'data:', 'blob:'],
				'font-src': ['self'],
				'connect-src': ['self'],
				'worker-src': ['self', 'blob:'],
				'manifest-src': ['self'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self']
			}
		}
	}
};

export default config;
