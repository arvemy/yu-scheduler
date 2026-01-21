import type { BlockedHour, SavedSchedule, ScheduleData } from '$lib/types';
import {
	parseStoredJson,
	storeJson,
	type ValidationResult,
	validateSavedSchedule
} from '$lib/utils/storage';

import { STORAGE_KEYS } from './keys';

const STORAGE_KEY = STORAGE_KEYS.SAVED_SCHEDULES;
const MAX_SAVED_SCHEDULES = 10;

const generateId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const validateSavedSchedules = (value: unknown): ValidationResult<SavedSchedule[]> => {
	if (!Array.isArray(value)) {
		return { success: false, error: 'Saved schedules must be an array' };
	}

	const validated: SavedSchedule[] = [];
	for (const item of value) {
		const result = validateSavedSchedule(item);
		if (!result.success || !result.data) continue;
		validated.push(result.data);
	}

	return { success: true, data: validated };
};

export const getSavedSchedules = (): SavedSchedule[] => {
	const result = parseStoredJson(STORAGE_KEY, validateSavedSchedules);
	if (!result.success || !result.data) return [];
	return result.data.sort((a, b) => b.savedAt - a.savedAt);
};

export const saveSchedule = (
	name: string,
	term: string,
	selectedCourses: string[],
	scheduleData: ScheduleData,
	blockedHours: BlockedHour[],
	activeScheduleIndex: number = 0,
	courseOptionGroups?: string[][]
): SavedSchedule => {
	const scheduleToSave = scheduleData.schedules[activeScheduleIndex];
	const newScheduleData: ScheduleData = {
		...scheduleData,
		schedules: scheduleToSave ? [scheduleToSave] : []
	};

	const newSchedule: SavedSchedule = {
		id: generateId(),
		name: name.trim() || `Schedule ${new Date().toLocaleDateString()}`,
		term,
		selectedCourses: [...selectedCourses],
		...(courseOptionGroups && courseOptionGroups.length ? { courseOptionGroups } : {}),
		scheduleData: JSON.parse(JSON.stringify(newScheduleData)),
		blockedHours: [...blockedHours],
		activeScheduleIndex: 0,
		savedAt: Date.now()
	};

	const existingSchedules = getSavedSchedules();
	const updatedSchedules = [newSchedule, ...existingSchedules];
	const trimmedSchedules = updatedSchedules.slice(0, MAX_SAVED_SCHEDULES);
	if (!storeJson(STORAGE_KEY, trimmedSchedules)) {
		throw new Error('Failed to save schedule. Storage might be full.');
	}
	return newSchedule;
};

export const deleteSavedSchedule = (id: string): void => {
	const existingSchedules = getSavedSchedules();
	const filteredSchedules = existingSchedules.filter((schedule) => schedule.id !== id);
	if (!storeJson(STORAGE_KEY, filteredSchedules)) {
		throw new Error('Failed to delete schedule.');
	}
};

export const renameSavedSchedule = (id: string, newName: string): void => {
	const existingSchedules = getSavedSchedules();
	const schedule = existingSchedules.find((entry) => entry.id === id);
	if (!schedule) {
		throw new Error('errors.scheduleNotFound');
	}
	schedule.name = newName.trim() || schedule.name;
	if (!storeJson(STORAGE_KEY, existingSchedules)) {
		throw new Error('errors.failedToRenameSchedule');
	}
};

export const checkStorageAvailability = (): { available: boolean; error?: string } => {
	try {
		const testKey = STORAGE_KEYS.STORAGE_TEST;
		localStorage.setItem(testKey, 'test');
		localStorage.removeItem(testKey);
		return { available: true };
	} catch (error) {
		if (error instanceof Error) {
			return {
				available: false,
				error: error.name === 'QuotaExceededError' ? 'errors.storageQuotaExceeded' : 'errors.storageNotAvailable'
			};
		}
		return { available: false, error: 'errors.unknownStorageError' };
	}
};

export const getStorageUsage = (): number => {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? new Blob([stored]).size : 0;
	} catch {
		return 0;
	}
};

export const clearAllSavedSchedules = (): void => {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		throw new Error('Failed to clear saved schedules.');
	}
};
