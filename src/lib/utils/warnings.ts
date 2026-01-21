import type { Translator } from '$lib/i18n';
import type { WarningInfo } from '$lib/types';

const normalizeReason = (reason: string): string => reason.trim().replace(/[.!?]+$/, '');

const formatNoValidSchedule = (reason: string, t: Translator): string => {
	const prefix = t('courseSelector.noSchedulesTitle');
	const trimmed = reason.trim();
	if (trimmed.startsWith(`${prefix}:`)) return trimmed;
	const fallback = t('errors.noValidScheduleGeneral');
	const normalized = normalizeReason(reason || fallback);
	return `${prefix}: ${normalized}.`;
};

const translateDayNames = (text: string, t: Translator): string => {
	const dayMap: Record<string, string> = {
		Monday: t('timetable.days.Monday'),
		Tuesday: t('timetable.days.Tuesday'),
		Wednesday: t('timetable.days.Wednesday'),
		Thursday: t('timetable.days.Thursday'),
		Friday: t('timetable.days.Friday'),
		Saturday: t('timetable.days.Saturday'),
		Sunday: t('timetable.days.Sunday')
	};

	let translatedText = text;
	Object.entries(dayMap).forEach(([englishDay, translatedDay]) => {
		translatedText = translatedText.replace(new RegExp(englishDay, 'g'), translatedDay);
	});

	return translatedText;
};

export const translateWarning = (warning: WarningInfo, t: Translator): string => {
	const { code, message, params } = warning;

	switch (code) {
		case 'COURSE_NOT_AVAILABLE':
			return t('errors.courseNoSessionData', { course: (params?.course as string) || 'Course' });

		case 'TIME_CONFLICTS':
			return t('errors.timeConflicts');

		case 'TIME_CONFLICT_BETWEEN_COURSES':
			return t('errors.timeConflictBetweenCourses', {
				course1: (params?.course1 as string) || 'Course 1',
				course2: (params?.course2 as string) || 'Course 2'
			});

		case 'TIME_CONFLICT_WITH_BLOCKED_HOURS':
			return t('errors.timeConflictWithBlockedHours', {
				course: (params?.course as string) || 'Course'
			});

		case 'TIME_CONFLICT_WITH_SPECIFIC_BLOCKED_HOURS': {
			const blockedHoursText = (params?.blocked_hours as string) || 'your blocked hours';
			const translatedBlockedHours = translateDayNames(blockedHoursText, t);
			return t('errors.timeConflictWithSpecificBlockedHours', {
				course: (params?.course as string) || 'Course',
				blockedHours: translatedBlockedHours
			});
		}

		case 'ALL_COURSES_EXCLUDED':
			return t('errors.allCoursesExcluded');

		case 'NO_VALID_SCHEDULE_CONFLICTS':
			return t('errors.noValidScheduleConflicts');

		case 'NO_VALID_SCHEDULE_BLOCKED_HOURS':
			return t('errors.noValidScheduleBlockedHours');

		case 'NO_VALID_SCHEDULE_GENERAL':
			return t('errors.noValidScheduleGeneral');

		case 'NO_VALID_SCHEDULE_INCLUDING_COURSE':
			return t('errors.noValidScheduleIncludingCourse', {
				course: (params?.course as string) || 'Course'
			});

		default:
			return message;
	}
};

export const translateWarnings = (
	warnings: string[],
	warningCodes: WarningInfo[] = [],
	t: Translator,
	options: { prefixNoSchedule?: boolean } = {}
): string[] => {
	const { prefixNoSchedule = false } = options;
	const dedupe = (items: string[]) => {
		const seen = new Set<string>();
		return items.filter((item) => {
			const key = item.trim();
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	};

	if (warningCodes && warningCodes.length > 0) {
		const translatedWarnings: string[] = [];
		const seenCodes = new Set<string>();

		const specificCodes = [
			'TIME_CONFLICT_BETWEEN_COURSES',
			'TIME_CONFLICT_WITH_SPECIFIC_BLOCKED_HOURS',
			'TIME_CONFLICT_WITH_BLOCKED_HOURS'
		];

		const allowMultipleInstancesCodes = [
			'COURSE_NOT_AVAILABLE',
			'TIME_CONFLICT_BETWEEN_COURSES',
			'TIME_CONFLICT_WITH_SPECIFIC_BLOCKED_HOURS',
			'TIME_CONFLICT_WITH_BLOCKED_HOURS'
		];

		for (const warning of warningCodes) {
			if (specificCodes.includes(warning.code)) {
				translatedWarnings.push(translateWarning(warning, t));
				if (!allowMultipleInstancesCodes.includes(warning.code)) {
					seenCodes.add(warning.code);
				}
			}
		}

		for (const warning of warningCodes) {
			if (seenCodes.has(warning.code)) {
				continue;
			}

			if (
				warning.code === 'NO_VALID_SCHEDULE_CONFLICTS' &&
				warningCodes.some((w) => specificCodes.includes(w.code))
			) {
				continue;
			}

			if (warning.code === 'TIME_CONFLICTS' && warningCodes.some((w) => specificCodes.includes(w.code))) {
				continue;
			}

			if (
				warning.code === 'TIME_CONFLICT_WITH_BLOCKED_HOURS' &&
				warningCodes.some((w) => w.code === 'TIME_CONFLICT_WITH_SPECIFIC_BLOCKED_HOURS')
			) {
				continue;
			}

			if (seenCodes.has(warning.code) && !allowMultipleInstancesCodes.includes(warning.code)) {
				continue;
			}

			if (!allowMultipleInstancesCodes.includes(warning.code)) {
				seenCodes.add(warning.code);
			}
			translatedWarnings.push(translateWarning(warning, t));
		}

		const deduped = dedupe(translatedWarnings);
		return prefixNoSchedule
			? dedupe(deduped.map((entry) => formatNoValidSchedule(entry, t)))
			: deduped;
	}

	const deduped = dedupe(warnings);
	if (!prefixNoSchedule) {
		return deduped;
	}
	if (deduped.length === 0) {
		return [formatNoValidSchedule('', t)];
	}
	return dedupe(deduped.map((entry) => formatNoValidSchedule(entry, t)));
};
