import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),

		// Content-Security-Policy. `nonce` mode keeps inline scripts strict while
		// letting Cloudflare add the same nonce to injected JavaScript Detections
		// scripts. SvelteKit emits this policy on the document response; the
		// header-only protections it can't express (X-Frame-Options,
		// Referrer-Policy, ...) are set in src/hooks.server.ts for worker
		// responses and mirrored in `_headers` for static assets.
		csp: {
			mode: 'nonce',
			directives: {
				'default-src': ['self'],
				// Cloudflare Web Analytics injects beacon.min.js after the Worker
				// response is generated. The nonce covers inline Cloudflare scripts.
				'script-src': ['self', 'https://static.cloudflareinsights.com'],
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
