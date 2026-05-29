import { untrack } from 'svelte';

/** Cleanup function optionally returned from a {@link watch} callback. */
type WatchCleanup = void | (() => void);

export interface WatchOptions {
	/**
	 * When true, the callback is skipped on the initial effect run and only
	 * fires on subsequent changes (matches Runed's `{ lazy: true }`).
	 */
	lazy?: boolean;
}

/**
 * Run `callback` whenever the reactive values read inside `source` change.
 *
 * A small, dependency-free replacement for Runed's `watch`, built on Svelte 5
 * runes:
 * - `source` is tracked — its reactive reads form the dependency set.
 * - `callback` runs inside `untrack`, so reading/writing state within it does
 *   not extend the dependency set or cause feedback loops.
 * - The callback receives the current and previous source values and may
 *   return a cleanup function (run before the next invocation and on destroy).
 *
 * Must be called during component initialisation or inside an `$effect.root`,
 * because it registers an `$effect` internally.
 *
 * @example
 * ```ts
 * watch(() => [term, courses] as const, ([t, c]) => {
 *   persist(t, c);
 * }, { lazy: true });
 * ```
 */
export function watch<T>(
	source: () => T,
	callback: (value: T, previous: T | undefined) => WatchCleanup,
	options: WatchOptions = {}
): void {
	let previous: T | undefined;
	let hasRun = false;

	$effect(() => {
		const value = source();

		if (options.lazy && !hasRun) {
			hasRun = true;
			previous = value;
			return;
		}

		hasRun = true;
		const cleanup = untrack(() => callback(value, previous));
		previous = value;
		return cleanup;
	});
}

/** A debounced function with a `cancel` method to drop the pending call. */
export interface Debounced<Args extends unknown[]> {
	(...args: Args): void;
	/** Cancel any pending invocation. */
	cancel: () => void;
}

/**
 * Create a debounced version of `fn`. Repeated calls are coalesced so `fn`
 * runs only once `delay` ms have elapsed since the most recent call.
 *
 * A dependency-free replacement for Runed's `useDebounce`. `delay` may be a
 * number or a getter (re-read on every call). The returned function exposes a
 * `cancel()` method.
 */
export function useDebounce<Args extends unknown[]>(
	fn: (...args: Args) => void,
	delay: number | (() => number) = 250
): Debounced<Args> {
	let timer: ReturnType<typeof setTimeout> | undefined;

	const debounced = ((...args: Args) => {
		if (timer !== undefined) clearTimeout(timer);
		const ms = typeof delay === 'function' ? delay() : delay;
		timer = setTimeout(() => {
			timer = undefined;
			fn(...args);
		}, ms);
	}) as Debounced<Args>;

	debounced.cancel = () => {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
		}
	};

	return debounced;
}
