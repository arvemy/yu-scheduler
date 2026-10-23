// Test stub for SvelteKit's `$app/paths` virtual module.
// Aliased in vite.config.ts under the `test` config.
export const asset = (path: string): string => `/${path}`;
export const resolve = (path: string): string => (path.startsWith('/') ? path : `/${path}`);
