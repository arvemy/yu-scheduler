import type { Handle } from '@sveltejs/kit/hooks';

/**
 * Security response headers for worker-served responses (the SPA shell document
 * and any SvelteKit routes). Static assets are served by Cloudflare's ASSETS
 * binding instead, which applies the matching rules from the project-root
 * `_headers` file — so the same policy is mirrored there for those responses.
 *
 * The Content-Security-Policy itself is emitted separately by SvelteKit
 * (see the `csp` option of the `sveltekit()` plugin in vite.config.ts), so it is
 * intentionally not set here.
 */
const securityHeaders: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'X-Frame-Options': 'SAMEORIGIN',
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Permissions-Policy':
		'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
	'Strict-Transport-Security': 'max-age=31536000'
};

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	for (const [name, value] of Object.entries(securityHeaders)) {
		response.headers.set(name, value);
	}
	return response;
};
