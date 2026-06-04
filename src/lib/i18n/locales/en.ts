/**
 * English message catalogue.
 *
 * This is the canonical source of truth for the message tree: its inferred
 * shape ({@link Messages}) is what every other locale must satisfy. Add new
 * keys here first, then mirror them in the other locale files — the
 * `satisfies` check in those files fails the type-check until they match.
 */
export const en = {
	app: {
		title: 'YU Scheduler',
		subtitle: 'Course Planner'
	},
	nav: {
		github: 'GitHub',
		linkedin: 'LinkedIn',
		portfolio: 'Portfolio',
		more: 'More',
		showWelcome: 'About'
	},
	tooltips: {
		portfolio: 'Visit Portfolio',
		github: 'View on GitHub',
		linkedin: 'Connect on LinkedIn',
		about: 'About this app',
		switchLanguage: 'Switch language',
		blockUnblockDay: 'Click to block/unblock entire day',
		clearAll: 'Clear all selections and blocked hours'
	},
	courseSelector: {
		search: 'Search and select courses',
		typeToSearch: 'Type to search courses',
		noResults: 'No courses found',
		selectedCourses: 'Selected Courses',
		courseGroups: 'Course Groups',
		generateSchedule: 'Generate Schedule',
		generateNewSchedule: 'Generate New Schedule',
		generatingSchedule: 'Generating Schedule...',
		download: 'Download',
		schedulesFound: '{{count}} Valid Schedule Found',
		schedulesFound_one: '1 Valid Schedule Found',
		schedulesFound_other: '{{count}} Valid Schedules Found',
		schedule: 'Schedule',
		noSchedulesTitle: 'No Valid Schedule Found',
		noSchedulesDesc: 'Try selecting different courses or removing some blocked hours.',
		failedToLoad: 'Failed to load courses. Please try again later.',
		failedToLoadTerms: 'Unable to load terms. Please refresh the page.',
		reload: 'Reload',
		pleaseSelectCourse: 'Please select at least one course',
		any: 'X',
		sectionSelectAriaLabel: 'Select section for {{course}}',
		removeCourse: 'Remove course {{course}}',
		reorderCourse: 'Drag to reorder course {{course}}',
		showCourses: 'Show courses in group {{group}}',
		blockUnblockCell: 'Block/unblock {{day}} at {{slot}}',
		blockUnblockHour: 'Block/unblock this hour for all days',
		downloadImage: 'Download schedule as image',
		downloadingImage: 'Preparing image…',
		generateShort: 'Generate',
		generatingShort: 'Generating…',
		warnings: 'warnings',
		showWarnings: 'Show warnings',
		hideWarnings: 'Hide warnings',
		showSelectedCourses: 'Show selected courses',
		hideSelectedCourses: 'Hide selected courses',
		blockDay: 'Block all',
		unblockDay: 'Unblock all',
		clearAll: 'Clear All',
		retry: 'Retry',
		sectionsPartialWarning:
			'Some section details failed to load. You can still generate schedules, or retry loading sections.',
		generateScheduleFirst: 'Generate a schedule first to save',
		blockedAdded: '{{count}} block added ({{target}})',
		blockedAdded_one: '1 block added ({{target}})',
		blockedAdded_other: '{{count}} blocks added ({{target}})',
		blocksCleared: '{{count}} block removed ({{target}})',
		blocksCleared_one: '1 block removed ({{target}})',
		blocksCleared_other: '{{count}} blocks removed ({{target}})',
		blockingTip: {
			title: 'Block Time Slots',
			description:
				'Click on time slots to block them from your schedule. This prevents courses from being scheduled at those times.',
			desktop:
				'• Click day headers to block entire days\n• Click time headers to block time across all days\n• Click individual cells to block specific time slots',
			mobile:
				'• Tap day headers to block entire days\n• Tap time slots to block specific time slots',
			gotIt: 'Got it!'
		},
		actions: 'Schedule actions',
		connector: {
			and: 'AND',
			or: 'OR'
		}
	},
	pagination: {
		previous: 'Previous',
		next: 'Next',
		goTo: 'Go to schedule',
		of: 'of'
	},
	timetable: {
		days: {
			Monday: 'Monday',
			Tuesday: 'Tuesday',
			Wednesday: 'Wednesday',
			Thursday: 'Thursday',
			Friday: 'Friday',
			Saturday: 'Saturday',
			Sunday: 'Sunday'
		},
		time: 'Time',
		multipleSections: 'Multiple sections at this time',
		sectionOptions: 'section options',
		clickToBlock: 'Click on cells, rows, or columns to block time slots'
	},
	errors: {
		failedToLoadCourses: 'Failed to load courses: {{error}}',
		failedToLoadSections: 'Failed to load course sections: {{error}}',
		failedToGenerateSchedule: 'Failed to generate schedule: {{error}}',
		failedToDownload: 'Failed to download schedule. Please try again.',
		networkError: 'Network error occurred',
		unexpectedError: 'An unexpected error occurred',
		timeConflicts: 'Conflicts between selected courses.',
		timeConflictBetweenCourses: 'Conflict between {{course1}} and {{course2}}.',
		timeConflictWithBlockedHours: '{{course}} falls on your blocked hours.',
		timeConflictWithSpecificBlockedHours:
			'{{course}} falls on your blocked hours ({{blockedHours}}).',
		noValidScheduleConflicts: 'Course time conflicts prevent a valid schedule.',
		noValidScheduleBlockedHours: 'Blocked time slots prevent a valid schedule.',
		noValidScheduleGeneral: 'No schedule fits your current selections.',
		noValidScheduleIncludingCourse:
			"{{course}} can't be added — it conflicts with your other selected courses.",
		optionNotSchedulable:
			"{{course}} can't be added — the selected section is no longer available.",
		allCoursesExcluded: 'None of your selected courses could be scheduled.',
		allCoursesNoData: 'None of your selected courses have schedule data for this term.',
		allCoursesBlocked: 'All selected courses fall on your blocked hours.',
		serverError: 'Server is temporarily unavailable. Please try again later.',
		serviceUnavailable: 'Service is temporarily down for maintenance.',
		requestTimeout: 'Request took too long to complete. Please try again.',
		courseNoSessionData: '{{course}} has no session data for this term.',
		courseNotAvailable: '{{course}} course is not available for this term',
		termNotFound: 'Course data for the requested term was not found',
		noCourseData: 'No course data is available',
		notFound: 'Requested resource was not found',
		unauthorized: 'Access is not authorized',
		forbidden: 'Access is forbidden',
		failedToLoadTerms: 'Unable to load terms. Please refresh the page.',
		close: 'close',
		contactSupport: 'If this persists, please contact support.',
		scheduleNotFound: 'Schedule not found',
		storageQuotaExceeded: 'Storage quota exceeded',
		storageNotAvailable: 'Storage not available',
		unknownStorageError: 'Unknown storage error',
		failedToRenameSchedule: 'Failed to rename schedule.',
		unknownError: 'Unknown error'
	},
	language: {
		english: 'English',
		turkish: 'Türkçe',
		switchLanguage: 'Switch language'
	},
	terms: {
		fall: 'Fall',
		spring: 'Spring',
		summer: 'Summer'
	},
	locale: {
		code: 'en'
	},
	savedSchedules: {
		saveSchedule: 'Save Schedule',
		savedSchedules: 'Saved Schedules',
		scheduleName: 'Schedule Name',
		scheduleDetails: 'Schedule Details',
		term: 'Term',
		courses: 'Courses',
		coursesSelected: 'selected',
		schedules: 'schedules',
		schedulesGenerated: 'generated',
		currentSchedule: 'Current schedule',
		of: 'of',
		activeSchedulePreview: 'Active Schedule Preview',
		save: 'Save',
		saving: 'Saving...',
		cancel: 'Cancel',
		close: 'Close',
		nameRequired: 'Schedule name is required',
		saveFailed: 'Failed to save schedule',
		storageError: 'Storage Error',
		loadFailed: 'Failed to load saved schedules',
		deleteFailed: 'Failed to delete schedule',
		renameFailed: 'Failed to rename schedule',
		clearFailed: 'Failed to clear schedules',
		noSavedSchedules: 'No Saved Schedules',
		noSavedSchedulesDesc: 'Save your favorite schedules to quickly access them later.',
		showingCurrentTerm:
			'Showing {{count}} schedule for {{term}}. {{hidden}} from other terms are hidden.',
		showingCurrentTerm_one:
			'Showing 1 schedule for {{term}}. {{hidden}} from other terms are hidden.',
		showingCurrentTerm_other:
			'Showing {{count}} schedules for {{term}}. {{hidden}} from other terms are hidden.',
		savedOn: 'Saved on',
		loadSchedule: 'Load Schedule',
		renameSchedule: 'Rename Schedule',
		deleteSchedule: 'Delete Schedule',
		storageUsage: 'Storage Usage',
		clearAll: 'Clear All',
		clearAllConfirm:
			'Are you sure you want to delete all saved schedules? This action cannot be undone.',
		schedule: 'Schedule',
		scheduleWasSaved: 'Schedule "{{name}}" has been saved successfully!',
		scheduleWasLoaded: 'Schedule "{{name}}" has been loaded successfully!'
	},
	welcome: {
		title: 'Welcome to YU Scheduler!',
		description:
			'YU Scheduler is your comprehensive course planning tool for Yaşar University. Easily create and manage your class schedules with our intuitive interface.',
		features: "Here's what you can do:",
		feature1: 'Search and select courses from all available options',
		feature2: 'Generate optimized schedules automatically',
		feature3: "Block specific time slots that don't work for you",
		feature4: 'Save and manage multiple schedule options',
		updates: {
			title: 'Latest Updates',
			term: '2025–2026 Summer',
			items: {
				termCoursesAdded: 'Summer term courses have been added to the system'
			},
			addedOn: 'Added on: Thursday, Jun 4'
		},
		importantNotice:
			'Please verify your schedule at <a href="https://oim.yasar.edu.tr/ders-kayitlari" target="_blank" rel="noopener noreferrer">oim.yasar.edu.tr/ders-kayitlari</a> for the most accurate information.',
		disclaimer:
			'This tool is designed to help students plan their schedules more effectively and is not affiliated with Yaşar University.',
		privacyNote:
			'All data is stored and processed locally in your browser; nothing is transmitted to external servers.',
		dontShowAgain: "Don't show this again",
		getStarted: 'Get Started'
	},
	common: {
		cancel: 'Cancel',
		close: 'Close',
		save: 'Save',
		delete: 'Delete',
		edit: 'Edit',
		load: 'Load',
		share: 'Share',
		expand: 'Expand',
		collapse: 'Collapse'
	}
};

/** The shape every locale catalogue must conform to (derived from English). */
export type Messages = typeof en;
