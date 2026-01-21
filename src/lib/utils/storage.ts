import { devWarn } from './logger';
import type { BlockedHour, SavedSchedule, ScheduleData } from '$lib/types';

/**
 * Schema validation result.
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates that a value is a non-null object.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates that a value is an array.
 */
function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Validates that a value is a string.
 */
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Validates that a value is a number.
 */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/**
 * Validates a BlockedHour object.
 */
export function validateBlockedHour(value: unknown): ValidationResult<BlockedHour> {
  if (!isObject(value)) {
    return { success: false, error: 'BlockedHour must be an object' };
  }

  if (!isString(value.day)) {
    return { success: false, error: 'BlockedHour.day must be a string' };
  }

  if (!isString(value.slot)) {
    return { success: false, error: 'BlockedHour.slot must be a string' };
  }

  return {
    success: true,
    data: { day: value.day, slot: value.slot }
  };
}

/**
 * Validates an array of BlockedHour objects.
 */
export function validateBlockedHours(value: unknown): ValidationResult<BlockedHour[]> {
  if (!isArray(value)) {
    return { success: false, error: 'BlockedHours must be an array' };
  }

  const validated: BlockedHour[] = [];
  for (const item of value) {
    const result = validateBlockedHour(item);
    if (!result.success) {
      return { success: false, error: `Invalid blocked hour: ${result.error}` };
    }
    validated.push(result.data!);
  }

  return { success: true, data: validated };
}

/**
 * Validates an array of selected courses (string array).
 */
export function validateSelectedCourses(value: unknown): ValidationResult<string[]> {
  if (!isArray(value)) {
    return { success: false, error: 'Selected courses must be an array' };
  }

  if (!value.every(isString)) {
    return { success: false, error: 'All selected courses must be strings' };
  }

  return { success: true, data: value as string[] };
}

/**
 * Validates course option groups (string[][]).
 * Each group must be an array of 2+ non-empty strings.
 */
export function validateCourseOptionGroups(value: unknown): ValidationResult<string[][]> {
  if (!isArray(value)) {
    return { success: false, error: 'Course option groups must be an array' };
  }

  const validated: string[][] = [];
  for (const group of value) {
    if (!isArray(group)) {
      return { success: false, error: 'Each course option group must be an array' };
    }
    if (group.length < 2) {
      return { success: false, error: 'Each course option group must contain at least 2 courses' };
    }
    if (!group.every((item) => isString(item) && item.trim().length > 0)) {
      return { success: false, error: 'All courses in option groups must be non-empty strings' };
    }
    validated.push(group.map((s) => (s as string).trim()));
  }

  return { success: true, data: validated };
}

/**
 * Validates section choices (Record<string, string | null>).
 */
export function validateSectionChoices(
  value: unknown
): ValidationResult<Record<string, string | null>> {
  if (!isObject(value)) {
    return { success: false, error: 'Section choices must be an object' };
  }

  const validated: Record<string, string | null> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== null && !isString(val)) {
      return { success: false, error: `Section choice for ${key} must be a string or null` };
    }
    validated[key] = val as string | null;
  }

  return { success: true, data: validated };
}

/**
 * Validates ScheduleData structure.
 */
export function validateScheduleData(value: unknown): ValidationResult<ScheduleData> {
  if (!isObject(value)) {
    return { success: false, error: 'ScheduleData must be an object' };
  }

  if (!isArray(value.schedules)) {
    return { success: false, error: 'ScheduleData.schedules must be an array' };
  }

  if (!isArray(value.warnings)) {
    return { success: false, error: 'ScheduleData.warnings must be an array' };
  }

  if (!isArray(value.warning_codes)) {
    return { success: false, error: 'ScheduleData.warning_codes must be an array' };
  }

  if (!isArray(value.time_slots)) {
    return { success: false, error: 'ScheduleData.time_slots must be an array' };
  }

  if (!isArray(value.days_of_week)) {
    return { success: false, error: 'ScheduleData.days_of_week must be an array' };
  }

  return { success: true, data: value as unknown as ScheduleData };
}

/**
 * Validates a SavedSchedule structure.
 */
export function validateSavedSchedule(value: unknown): ValidationResult<SavedSchedule> {
  if (!isObject(value)) {
    return { success: false, error: 'SavedSchedule must be an object' };
  }

  if (!isString(value.id)) {
    return { success: false, error: 'SavedSchedule.id must be a string' };
  }

  if (!isString(value.name)) {
    return { success: false, error: 'SavedSchedule.name must be a string' };
  }

  if (!isString(value.term)) {
    return { success: false, error: 'SavedSchedule.term must be a string' };
  }

  const coursesResult = validateSelectedCourses(value.selectedCourses);
  if (!coursesResult.success) {
    return { success: false, error: `SavedSchedule.selectedCourses: ${coursesResult.error}` };
  }

  let courseOptionGroups: string[][] | undefined;
  if (value.courseOptionGroups !== undefined) {
    const groupsResult = validateCourseOptionGroups(value.courseOptionGroups);
    if (!groupsResult.success) {
      return { success: false, error: `SavedSchedule.courseOptionGroups: ${groupsResult.error}` };
    }
    courseOptionGroups = groupsResult.data;
  }

  const scheduleDataResult = validateScheduleData(value.scheduleData);
  if (!scheduleDataResult.success) {
    return { success: false, error: `SavedSchedule.scheduleData: ${scheduleDataResult.error}` };
  }

  const blockedResult = validateBlockedHours(value.blockedHours);
  if (!blockedResult.success) {
    return { success: false, error: `SavedSchedule.blockedHours: ${blockedResult.error}` };
  }

  if (!isNumber(value.activeScheduleIndex)) {
    return { success: false, error: 'SavedSchedule.activeScheduleIndex must be a number' };
  }

  if (!isNumber(value.savedAt)) {
    return { success: false, error: 'SavedSchedule.savedAt must be a number' };
  }

  return {
    success: true,
    data: {
      id: value.id,
      name: value.name,
      term: value.term,
      selectedCourses: coursesResult.data!,
      ...(courseOptionGroups ? { courseOptionGroups } : {}),
      scheduleData: scheduleDataResult.data!,
      blockedHours: blockedResult.data!,
      activeScheduleIndex: value.activeScheduleIndex,
      savedAt: value.savedAt
    }
  };
}

/**
 * Validates the last generated schedule structure stored in localStorage.
 */
export interface LastGeneratedData {
  term: string;
  selectedCourses: string[];
  scheduleData: ScheduleData | null;
  blockedHours?: BlockedHour[];
  activeScheduleIndex?: number;
}

export function validateLastGenerated(value: unknown): ValidationResult<LastGeneratedData> {
  if (!isObject(value)) {
    return { success: false, error: 'LastGenerated must be an object' };
  }

  if (!isString(value.term)) {
    return { success: false, error: 'LastGenerated.term must be a string' };
  }

  const coursesResult = validateSelectedCourses(value.selectedCourses);
  if (!coursesResult.success) {
    return { success: false, error: `LastGenerated.selectedCourses: ${coursesResult.error}` };
  }

  let scheduleData: ScheduleData | null = null;
  if (value.scheduleData !== null) {
    const scheduleResult = validateScheduleData(value.scheduleData);
    if (!scheduleResult.success) {
      return { success: false, error: `LastGenerated.scheduleData: ${scheduleResult.error}` };
    }
    scheduleData = scheduleResult.data!;
  }

  let blockedHours: BlockedHour[] | undefined;
  if (value.blockedHours !== undefined) {
    const blockedResult = validateBlockedHours(value.blockedHours);
    if (!blockedResult.success) {
      return { success: false, error: `LastGenerated.blockedHours: ${blockedResult.error}` };
    }
    blockedHours = blockedResult.data;
  }

  let activeScheduleIndex: number | undefined;
  if (value.activeScheduleIndex !== undefined) {
    if (!isNumber(value.activeScheduleIndex)) {
      return { success: false, error: 'LastGenerated.activeScheduleIndex must be a number' };
    }
    activeScheduleIndex = value.activeScheduleIndex;
  }

  return {
    success: true,
    data: {
      term: value.term,
      selectedCourses: coursesResult.data!,
      scheduleData,
      blockedHours,
      activeScheduleIndex
    }
  };
}

/**
 * Safely parse JSON from localStorage with validation.
 *
 * @example
 * ```ts
 * const result = parseStoredJson('yuScheduler:data', validateSelectedCourses);
 * if (result.success) {
 *   selectedCourses = result.data;
 * }
 * ```
 */
export function parseStoredJson<T>(
  key: string,
  validator: (value: unknown) => ValidationResult<T>
): ValidationResult<T> {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return { success: false, error: 'Key not found in localStorage' };
    }

    const parsed = JSON.parse(raw);
    const result = validator(parsed);

    if (!result.success) {
      devWarn(`Invalid data in localStorage[${key}]:`, result.error);
    }

    return result;
  } catch (err) {
    devWarn(`Failed to parse localStorage[${key}]:`, err);
    return { success: false, error: 'Failed to parse JSON' };
  }
}

/**
 * Safely store JSON in localStorage.
 *
 * @returns true if successful, false otherwise
 */
export function storeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    devWarn(`Failed to store to localStorage[${key}]:`, err);
    return false;
  }
}
