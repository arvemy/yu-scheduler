export const ErrorCodes = {
	FAILED_TO_LOAD_TERMS: 'FAILED_TO_LOAD_TERMS',
	FAILED_TO_LOAD_COURSES: 'FAILED_TO_LOAD_COURSES',
	FAILED_TO_LOAD_SECTIONS: 'FAILED_TO_LOAD_SECTIONS',
	FAILED_TO_GENERATE_SCHEDULE: 'FAILED_TO_GENERATE_SCHEDULE',
	TERM_NOT_FOUND: 'TERM_NOT_FOUND',
	NO_COURSE_DATA: 'NO_COURSE_DATA',
	COURSE_NO_SESSION_DATA: 'COURSE_NO_SESSION_DATA',
	COURSE_NOT_AVAILABLE: 'COURSE_NOT_AVAILABLE',
	INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
	NO_COURSES_SELECTED: 'NO_COURSES_SELECTED'
} as const;

export const WarningCodes = {
	COURSE_NOT_AVAILABLE: 'COURSE_NOT_AVAILABLE',
	TIME_CONFLICTS: 'TIME_CONFLICTS',
	TIME_CONFLICT_BETWEEN_COURSES: 'TIME_CONFLICT_BETWEEN_COURSES',
	TIME_CONFLICT_WITH_BLOCKED_HOURS: 'TIME_CONFLICT_WITH_BLOCKED_HOURS',
	TIME_CONFLICT_WITH_SPECIFIC_BLOCKED_HOURS: 'TIME_CONFLICT_WITH_SPECIFIC_BLOCKED_HOURS',
	ALL_COURSES_EXCLUDED: 'ALL_COURSES_EXCLUDED',
	ALL_COURSES_NO_DATA: 'ALL_COURSES_NO_DATA',
	ALL_COURSES_BLOCKED: 'ALL_COURSES_BLOCKED',
	NO_VALID_SCHEDULE_CONFLICTS: 'NO_VALID_SCHEDULE_CONFLICTS',
	NO_VALID_SCHEDULE_BLOCKED_HOURS: 'NO_VALID_SCHEDULE_BLOCKED_HOURS',
	NO_VALID_SCHEDULE_GENERAL: 'NO_VALID_SCHEDULE_GENERAL',
	NO_VALID_SCHEDULE_INCLUDING_COURSE: 'NO_VALID_SCHEDULE_INCLUDING_COURSE',
	OPTION_NOT_SCHEDULABLE: 'OPTION_NOT_SCHEDULABLE'
} as const;

export const WARNING_MESSAGES: Record<string, string> = {
	[WarningCodes.COURSE_NOT_AVAILABLE]:
		'{course} course has no session data available for this term.',
	[WarningCodes.TIME_CONFLICTS]: 'Conflicts between selected courses.',
	[WarningCodes.TIME_CONFLICT_BETWEEN_COURSES]: 'Conflict between {course1} and {course2}.',
	[WarningCodes.TIME_CONFLICT_WITH_BLOCKED_HOURS]:
		'{course} conflicts with your blocked time slot.',
	[WarningCodes.TIME_CONFLICT_WITH_SPECIFIC_BLOCKED_HOURS]:
		'{course} conflicts with your blocked time slot at {blocked_hours}.',
	[WarningCodes.ALL_COURSES_EXCLUDED]: 'None of your selected courses could be scheduled.',
	[WarningCodes.ALL_COURSES_NO_DATA]:
		'None of your selected courses have schedule data for this term.',
	[WarningCodes.ALL_COURSES_BLOCKED]: 'All selected courses fall on your blocked hours.',
	[WarningCodes.NO_VALID_SCHEDULE_CONFLICTS]: 'Course time conflicts prevent a valid schedule.',
	[WarningCodes.NO_VALID_SCHEDULE_BLOCKED_HOURS]: 'Blocked time slots prevent a valid schedule.',
	[WarningCodes.NO_VALID_SCHEDULE_GENERAL]: 'No schedule fits your current selections.',
	[WarningCodes.NO_VALID_SCHEDULE_INCLUDING_COURSE]:
		"{course} can't be added — it conflicts with your other selected courses.",
	[WarningCodes.OPTION_NOT_SCHEDULABLE]:
		"{course} can't be added — the selected section is no longer available."
};

export const ERROR_MESSAGES: Record<string, string> = {
	[ErrorCodes.FAILED_TO_LOAD_TERMS]: 'Failed to load terms. Please try again later.',
	[ErrorCodes.FAILED_TO_LOAD_COURSES]: 'Failed to load courses. Please try again later.',
	[ErrorCodes.FAILED_TO_LOAD_SECTIONS]: 'Failed to load course sections. Please try again later.',
	[ErrorCodes.FAILED_TO_GENERATE_SCHEDULE]: 'Failed to generate schedule. Please try again later.',
	[ErrorCodes.TERM_NOT_FOUND]: 'Course data for the requested term was not found.',
	[ErrorCodes.NO_COURSE_DATA]: 'No course data is available.',
	[ErrorCodes.COURSE_NO_SESSION_DATA]: 'Course has no session data available for this term.',
	[ErrorCodes.COURSE_NOT_AVAILABLE]: 'Course is not available for this term.',
	[ErrorCodes.INTERNAL_SERVER_ERROR]: 'An internal server error occurred. Please try again later.',
	[ErrorCodes.NO_COURSES_SELECTED]:
		'No courses selected. Please select at least one course to generate a schedule.'
};
