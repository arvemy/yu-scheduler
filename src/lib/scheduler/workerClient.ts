import type {
	GenerateScheduleRequest,
	GenerateScheduleWorkerMessage,
	ScheduleData
} from '$lib/types';
import { loadTermData } from '$lib/scheduler/api';

/**
 * Deep clone an object to remove any Svelte 5 $state proxies.
 * This is necessary because proxies cannot be cloned via structuredClone/postMessage.
 */
const toPlainObject = <T>(obj: T): T => {
	try {
		return JSON.parse(JSON.stringify(obj)) as T;
	} catch {
		return obj;
	}
};

export type GenerateScheduleOptions = {
	onProgress?: (processed: number, total: number) => void;
	signal?: AbortSignal;
};

export type CancelablePromise<T> = Promise<T> & { cancel: () => void };

type PendingRequest = {
	resolve: (value: ScheduleData) => void;
	reject: (reason?: unknown) => void;
	onProgress?: (processed: number, total: number) => void;
};

let worker: Worker | null = null;
let cachedTermsInWorker = new Set<string>();
const pendingRequests = new Map<string, PendingRequest>();

const getWorker = (): Worker => {
	if (worker) return worker;
	worker = new Worker(new URL('../workers/scheduler.worker.ts', import.meta.url), {
		type: 'module'
	});
	cachedTermsInWorker = new Set<string>();

	worker.onmessage = (event: MessageEvent<GenerateScheduleWorkerMessage>) => {
		const message = event.data;
		if (!message || !message.type) return;
		const pending = pendingRequests.get(message.id);
		if (!pending) return;

		if (message.type === 'progress') {
			pending.onProgress?.(message.payload.processed, message.payload.total);
			return;
		}

		pendingRequests.delete(message.id);

		if (message.type === 'result') {
			pending.resolve(message.payload);
			return;
		}

		if (message.type === 'error') {
			pending.reject(new Error(message.payload.message));
		}
	};

	worker.onerror = (event) => {
		pendingRequests.forEach(({ reject }) => {
			reject(new Error(event.message || 'Worker error'));
		});
		pendingRequests.clear();
		cachedTermsInWorker.clear();
		try {
			worker?.terminate();
		} catch {
			// ignore
		}
		worker = null;
	};

	return worker;
};

const createId = (): string =>
	typeof crypto !== 'undefined' && 'randomUUID' in crypto
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const generateSchedule = (
	req: GenerateScheduleRequest,
	options: GenerateScheduleOptions = {}
): CancelablePromise<ScheduleData> => {
	const controller = new AbortController();
	if (options.signal) {
		if (options.signal.aborted) controller.abort();
		else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
	}
	const signal = controller.signal;

	const promise = new Promise<ScheduleData>((resolve, reject) => {
		const run = async () => {
			if (signal.aborted) {
				reject(new Error('Cancelled'));
				return;
			}

			let termData;
			try {
				termData = await loadTermData(req.term);
			} catch (error) {
				reject(error);
				return;
			}

			if (signal.aborted) {
				reject(new Error('Cancelled'));
				return;
			}

			const id = createId();
			const activeWorker = getWorker();

			pendingRequests.set(id, { resolve, reject, onProgress: options.onProgress });

			const normalizedRequest: GenerateScheduleRequest = {
				...req,
				term: termData.term
			};

			if (!cachedTermsInWorker.has(termData.term)) {
				activeWorker.postMessage({
					id: createId(),
					type: 'setTermData',
					payload: { term: termData.term, data: termData.data }
				});
				cachedTermsInWorker.add(termData.term);
			}

			// Convert to plain objects to remove Svelte 5 $state proxies.
			// Proxies cannot be cloned via structuredClone/postMessage.
			activeWorker.postMessage({
				id,
				type: 'generate',
				payload: {
					request: toPlainObject(normalizedRequest)
				}
			});

			const cancel = () => {
				if (!pendingRequests.has(id)) return;
				pendingRequests.delete(id);
				activeWorker.postMessage({ id, type: 'cancel' });
				reject(new Error('Cancelled'));
			};

			if (signal.aborted) {
				cancel();
				return;
			}

			signal.addEventListener('abort', cancel, { once: true });
		};
		run().catch(reject);
	});

	const cancelable = promise as CancelablePromise<ScheduleData>;
	cancelable.cancel = () => controller.abort();
	return cancelable;
};
