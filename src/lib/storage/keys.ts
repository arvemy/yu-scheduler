export const STORAGE_PREFIX = 'yuScheduler';

// Static Keys
export const STORAGE_KEYS = {
	LOCALE: `${STORAGE_PREFIX}:locale`,
	LAST_SELECTED_TERM: `${STORAGE_PREFIX}:lastSelectedTerm`,
	WELCOME_DISMISSED: `${STORAGE_PREFIX}:welcomeDismissed`,
	// Keeping the existing value for backward compatibility, even though it differs in style
	SAVED_SCHEDULES: 'yuscheduler_saved_schedules',
	STORAGE_TEST: 'yuscheduler_test'
} as const;

// Dynamic Keys
export const getTermKey = (term: string | null, suffix: string): string => {
	const termKey = term || 'none';
	return `${STORAGE_PREFIX}:${termKey}:${suffix}`;
};

export const getLastGeneratedKey = (term: string): string => {
	return getTermKey(term, 'lastGenerated');
};
