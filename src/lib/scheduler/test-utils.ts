import type { SessionData } from '$lib/types';

export const createSession = (
	day: string,
	start: string,
	end: string,
	section: string = '01',
	classroom: string = 'Room 101'
): SessionData => ({
	Day: day,
	'Start Time': start,
	'End Time': end,
	Section: section,
	Classroom: classroom,
	// Add other fields to satisfy type if needed, though optional
	course: 'TEST',
	section: section
});

export const mockCourseData: Record<string, SessionData[]> = {
	MATH101: [
		createSession('Monday', '09:40', '10:30', '01'),
		createSession('Wednesday', '09:40', '10:30', '01'),
		createSession('Tuesday', '14:40', '15:30', '02'), // Different section
		createSession('Thursday', '14:40', '15:30', '02')
	],
	PHYS101: [
		createSession('Monday', '09:40', '10:30', '01'), // Conflicts with MATH101-01
		createSession('Friday', '10:40', '12:30', '01'),
		createSession('Monday', '14:40', '16:30', '02') // No conflict
	],
	HIST101: [createSession('Tuesday', '10:40', '12:30', '01')]
};
