import { BREAKPOINTS, type BreakpointKey } from './breakpoints';

/**
 * Svelte 5 composable for responsive breakpoint detection.
 * Uses $state and $effect runes for reactive updates.
 *
 * @param breakpoint - The breakpoint key or pixel value to check against
 * @returns Object with a reactive `matches` getter
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useMediaQuery } from '$lib/utils/useMediaQuery.svelte';
 *
 *   const mobile = useMediaQuery('md'); // true when < 768px
 *   const tablet = useMediaQuery('lg'); // true when < 1024px
 *   const custom = useMediaQuery(500);  // true when < 500px
 * </script>
 *
 * {#if mobile.matches}
 *   <MobileView />
 * {:else}
 *   <DesktopView />
 * {/if}
 * ```
 */
export function useMediaQuery(breakpoint: BreakpointKey | number = 'md') {
	const maxWidth = typeof breakpoint === 'number' ? breakpoint : BREAKPOINTS[breakpoint];

	let matches = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;

		const mediaQuery = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);

		const updateMatch = () => {
			matches = mediaQuery.matches;
		};

		// Set initial value
		updateMatch();

		// Listen for changes
		mediaQuery.addEventListener('change', updateMatch);

		return () => {
			mediaQuery.removeEventListener('change', updateMatch);
		};
	});

	return {
		get matches() {
			return matches;
		}
	};
}

/**
 * Convenience composable specifically for mobile detection.
 * Returns true when viewport is below the medium breakpoint (768px).
 *
 * @param breakpoint - Optional custom breakpoint (defaults to 'md')
 * @returns Object with reactive `isMobile` getter
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useMobile } from '$lib/utils/useMediaQuery.svelte';
 *
 *   const { isMobile } = useMobile();
 * </script>
 *
 * {#if isMobile}
 *   <MobileNav />
 * {:else}
 *   <DesktopNav />
 * {/if}
 * ```
 */
export function useMobile(breakpoint: BreakpointKey | number = 'md') {
	const query = useMediaQuery(breakpoint);

	return {
		get isMobile() {
			return query.matches;
		}
	};
}

/**
 * Composable for detecting small mobile devices (phones).
 * Returns true when viewport is below the small breakpoint (600px).
 */
export function useSmallMobile() {
	return useMobile('sm');
}
