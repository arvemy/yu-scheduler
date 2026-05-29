import { dev } from '$app/environment';

/**
 * Log levels for development logging.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Development-only logger that silently ignores logs in production.
 * This provides a way to log useful debugging information during
 * development without cluttering production logs or leaking information.
 *
 * @example
 * ```ts
 * import { devLog, devWarn, devError } from '$lib/utils/logger';
 *
 * try {
 *   localStorage.setItem('key', 'value');
 * } catch (err) {
 *   devWarn('Failed to save to localStorage', err);
 * }
 * ```
 */
export function devLog(message: string, ...args: unknown[]): void {
	if (dev) {
		console.log(`[DEV] ${message}`, ...args);
	}
}

/**
 * Development-only warning logger.
 */
export function devWarn(message: string, ...args: unknown[]): void {
	if (dev) {
		console.warn(`[DEV] ${message}`, ...args);
	}
}

/**
 * Development-only error logger.
 */
export function devError(message: string, ...args: unknown[]): void {
	if (dev) {
		console.error(`[DEV] ${message}`, ...args);
	}
}

/**
 * Development-only debug logger (more verbose than devLog).
 */
export function devDebug(message: string, ...args: unknown[]): void {
	if (dev) {
		console.debug(`[DEV] ${message}`, ...args);
	}
}

/**
 * Generic development logger with configurable level.
 */
export function log(level: LogLevel, message: string, ...args: unknown[]): void {
	if (!dev) return;

	const prefix = `[DEV:${level.toUpperCase()}]`;

	switch (level) {
		case 'debug':
			console.debug(prefix, message, ...args);
			break;
		case 'info':
			console.info(prefix, message, ...args);
			break;
		case 'warn':
			console.warn(prefix, message, ...args);
			break;
		case 'error':
			console.error(prefix, message, ...args);
			break;
	}
}

/**
 * Safely execute a function and log any errors in development.
 * Returns the result or undefined if an error occurred.
 *
 * @example
 * ```ts
 * const value = safeExecute(
 *   () => JSON.parse(localStorage.getItem('data') || ''),
 *   'Failed to parse stored data'
 * );
 * ```
 */
export function safeExecute<T>(fn: () => T, errorMessage = 'Operation failed'): T | undefined {
	try {
		return fn();
	} catch (err) {
		devWarn(errorMessage, err);
		return undefined;
	}
}

/**
 * Safely execute an async function and log any errors in development.
 *
 * @example
 * ```ts
 * const data = await safeExecuteAsync(
 *   () => fetch('/api/data').then(r => r.json()),
 *   'Failed to fetch data'
 * );
 * ```
 */
export async function safeExecuteAsync<T>(
	fn: () => Promise<T>,
	errorMessage = 'Async operation failed'
): Promise<T | undefined> {
	try {
		return await fn();
	} catch (err) {
		devWarn(errorMessage, err);
		return undefined;
	}
}
