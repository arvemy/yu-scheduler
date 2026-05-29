import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ScheduleData } from '$lib/types';

// The worker client loads term data before talking to the worker; stub it so
// no network/term files are needed.
vi.mock('$lib/scheduler/api', () => ({
	loadTermData: vi.fn(async (term?: string | null) => ({ term: term ?? 'X', data: {} }))
}));

const FAKE_RESULT: ScheduleData = {
	schedules: [],
	warnings: [],
	warning_codes: [],
	time_slots: [],
	days_of_week: []
};

/** A fake Worker that replies to "generate" messages with a fixed result. */
class FakeWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: unknown) => void) | null = null;

	postMessage(message: { id: string; type: string }): void {
		if (message.type === 'generate') {
			setTimeout(() => {
				this.onmessage?.({
					data: { id: message.id, type: 'result', payload: FAKE_RESULT }
				} as MessageEvent);
			}, 5);
		}
	}

	terminate(): void {}
}

describe('workerClient.generateSchedule (mocked Worker)', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubGlobal('Worker', FakeWorker as unknown as typeof Worker);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('resolves with the result posted back by the worker', async () => {
		const { generateSchedule } = await import('./workerClient');
		const data = await generateSchedule({
			courses: [{ course: 'MATH 101' }],
			blocked_hours: [],
			term: 'X'
		});
		expect(data).toEqual(FAKE_RESULT);
	});

	it('rejects with "Cancelled" when cancel() is called', async () => {
		const { generateSchedule } = await import('./workerClient');
		const pending = generateSchedule({
			courses: [{ course: 'MATH 101' }],
			blocked_hours: [],
			term: 'X'
		});
		pending.cancel();
		await expect(pending).rejects.toThrow('Cancelled');
	});
});
