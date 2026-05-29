/**
 * Shared breakpoint constants for responsive design.
 * Use these values consistently across CSS and JavaScript.
 */
export const BREAKPOINTS = {
	/** Extra small devices (phones in portrait) */
	xs: 480,
	/** Small devices (phones in landscape, small tablets) */
	sm: 600,
	/** Medium devices (tablets) */
	md: 768,
	/** Large devices (desktops) */
	lg: 1024,
	/** Extra large devices (large desktops) */
	xl: 1280
} as const;

/**
 * CSS media query strings for use in JavaScript.
 * These match the breakpoints above.
 */
export const MEDIA_QUERIES = {
	xs: `(max-width: ${BREAKPOINTS.xs - 1}px)`,
	sm: `(max-width: ${BREAKPOINTS.sm - 1}px)`,
	md: `(max-width: ${BREAKPOINTS.md - 1}px)`,
	lg: `(max-width: ${BREAKPOINTS.lg - 1}px)`,
	xl: `(max-width: ${BREAKPOINTS.xl - 1}px)`,
	// Min-width queries for "up" breakpoints
	smUp: `(min-width: ${BREAKPOINTS.sm}px)`,
	mdUp: `(min-width: ${BREAKPOINTS.md}px)`,
	lgUp: `(min-width: ${BREAKPOINTS.lg}px)`,
	xlUp: `(min-width: ${BREAKPOINTS.xl}px)`
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;
