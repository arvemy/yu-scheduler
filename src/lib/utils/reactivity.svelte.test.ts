import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import { useDebounce, watch } from './reactivity.svelte';

describe('useDebounce', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('coalesces rapid calls into one trailing invocation with the last args', () => {
		const fn = vi.fn();
		const debounced = useDebounce(fn, 100);

		debounced('a');
		debounced('b');
		debounced('c');
		expect(fn).not.toHaveBeenCalled();

		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith('c');
	});

	it('cancel() drops a pending invocation', () => {
		const fn = vi.fn();
		const debounced = useDebounce(fn, 100);

		debounced('x');
		debounced.cancel();
		vi.advanceTimersByTime(500);
		expect(fn).not.toHaveBeenCalled();
	});

	it('supports a getter delay re-read on each call', () => {
		const fn = vi.fn();
		let delay = 50;
		const debounced = useDebounce(fn, () => delay);

		debounced();
		vi.advanceTimersByTime(50);
		expect(fn).toHaveBeenCalledTimes(1);

		delay = 200;
		debounced();
		vi.advanceTimersByTime(50);
		expect(fn).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(150);
		expect(fn).toHaveBeenCalledTimes(2);
	});
});

describe('watch', () => {
	it('runs eagerly, then again whenever a tracked dependency changes', () => {
		const cleanup = $effect.root(() => {
			let count = $state(0);
			const seen: number[] = [];

			watch(
				() => count,
				(value) => {
					seen.push(value);
				}
			);

			flushSync();
			expect(seen).toEqual([0]);

			count = 1;
			flushSync();
			count = 2;
			flushSync();
			expect(seen).toEqual([0, 1, 2]);
		});
		cleanup();
	});

	it('skips the initial run when { lazy: true }', () => {
		const cleanup = $effect.root(() => {
			let count = $state(0);
			const seen: number[] = [];

			watch(
				() => count,
				(value) => {
					seen.push(value);
				},
				{ lazy: true }
			);

			flushSync();
			expect(seen).toEqual([]);

			count = 5;
			flushSync();
			expect(seen).toEqual([5]);
		});
		cleanup();
	});

	it('passes the previous value and runs the returned cleanup before re-running', () => {
		const cleanup = $effect.root(() => {
			let count = $state(0);
			const previous: (number | undefined)[] = [];
			const cleaned: number[] = [];

			watch(
				() => count,
				(value, prev) => {
					previous.push(prev);
					return () => cleaned.push(value);
				}
			);

			flushSync();
			count = 1;
			flushSync();
			count = 2;
			flushSync();

			expect(previous).toEqual([undefined, 0, 1]);
			expect(cleaned).toEqual([0, 1]);
		});
		cleanup();
	});
});
