import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom does not implement matchMedia, which `useMediaQuery` (and some bits-ui
// components) rely on. Default to "desktop" (no max-width match); individual
// tests can override window.matchMedia as needed.
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	configurable: true,
	value: vi.fn((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// jsdom lacks these observers; provide inert stubs.
class MockObserver {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
	takeRecords(): [] {
		return [];
	}
}
globalThis.ResizeObserver = MockObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver = MockObserver as unknown as typeof IntersectionObserver;

// jsdom does not implement these layout/pointer APIs that some components call.
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
Element.prototype.animate = vi.fn(
	() =>
		({
			cancel: vi.fn(),
			commitStyles: vi.fn(),
			finish: vi.fn(),
			pause: vi.fn(),
			play: vi.fn(),
			reverse: vi.fn(),
			updatePlaybackRate: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(() => true),
			finished: Promise.resolve(),
			ready: Promise.resolve(),
			playState: 'finished',
			effect: null,
			timeline: null
		}) as unknown as Animation
);
