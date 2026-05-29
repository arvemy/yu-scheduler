<script lang="ts">
	import { Button, Popover } from 'bits-ui';
	import {
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		CircleAlert,
		CircleCheck,
		Download,
		FolderOpen,
		Info,
		LoaderCircle,
		Save,
		Search,
		TriangleAlert,
		X
	} from '@lucide/svelte';
	import { watch, useDebounce } from '$lib/utils/reactivity.svelte';
	import { t } from '$lib/i18n';
	import { DAYS_OF_WEEK, TIME_SLOTS, generateSchedule, getCourses, getSections } from '$lib';
	import type { BlockedHour, CourseEntry, SavedSchedule, ScheduleData } from '$lib/types';
	import Timetable from '$lib/components/Timetable.svelte';
	import SaveScheduleDialog from '$lib/components/SaveScheduleDialog.svelte';
	import SavedSchedulesDialog from '$lib/components/SavedSchedulesDialog.svelte';
	import BottomActionBar from '$lib/components/BottomActionBar.svelte';
	import { downloadScheduleAsImage } from '$lib/utils/downloadSchedule';
	import { onDestroy, onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { useMobile } from '$lib/utils/useMediaQuery.svelte';
	import { devWarn } from '$lib/utils/logger';
	import { translateWarnings } from '$lib/utils/warnings';
	import { SWIPE_THRESHOLD_PX } from '$lib/config/ui';
	import {
		parseStoredJson,
		storeJson,
		validateSelectedCourses,
		validateBlockedHours,
		validateSectionChoices
	} from '$lib/utils/storage';
	import { getTermKey } from '$lib/storage/keys';

	type CancelablePromise<T> = Promise<T> & { cancel: () => void };

	let {
		term,
		selectedCourses = $bindable(),
		blockedHours = $bindable(),
		scheduleData,
		hasGenerated,
		activeScheduleIndex = $bindable(),
		onSchedule,
		onLoadSavedSchedule
	}: {
		term: string | null;
		selectedCourses: string[];
		blockedHours: BlockedHour[];
		scheduleData: ScheduleData | null;
		hasGenerated: boolean;
		activeScheduleIndex: number;
		onSchedule: (data: ScheduleData, courses: string[]) => void;
		onLoadSavedSchedule?: (saved: SavedSchedule) => void;
	} = $props();

	let courses = $state<Record<string, string[]>>({});
	let sections = $state<Record<string, string[]>>({});
	let sectionChoices = $state<Record<string, string | null>>({});
	/**
	 * OR connections between adjacent courses.
	 * Key is course name, value is true if this course is OR-connected to the next course in selectedCourses.
	 */
	let orConnections = $state<Record<string, boolean>>({});
	let loading = $state(true);
	let submitting = $state(false);
	let searchInput = $state('');
	let coursesError = $state('');
	let sectionsError = $state('');

	// Track if initial restoration is complete (to avoid regenerating on load)
	let isInitialized = $state(false);
	// Prevent auto-generation during programmatic state updates (e.g. loading saved schedule)
	let suppressAutoGenerate = $state(false);

	let saveDialogOpen = $state(false);
	let loadDialogOpen = $state(false);
	let actionMessage = $state('');
	let actionTone = $state<'error' | 'success' | ''>('');

	// Course group accordion + search dropdown
	let groupsExpanded = $state(true);
	let searchDropdownOpen = $state(false);
	let searchHighlightIndex = $state(-1);
	let searchBoxEl: HTMLDivElement | null = null;

	const searchBoxAttachment = (node: HTMLDivElement) => {
		searchBoxEl = node;
		return () => {
			if (searchBoxEl === node) searchBoxEl = null;
		};
	};

	// Download state
	let isDownloading = $state(false);
	let scheduleRef = $state<HTMLElement | null>(null);
	let scrollRef = $state<HTMLElement | null>(null);
	let captureRef = $state<HTMLElement | null>(null);
	let captureScrollRef = $state<HTMLElement | null>(null);

	const scheduleRefAttachment = (node: HTMLElement) => {
		scheduleRef = node;
		return () => {
			if (scheduleRef === node) scheduleRef = null;
		};
	};

	const captureRefAttachment = (node: HTMLElement) => {
		captureRef = node;
		return () => {
			if (captureRef === node) captureRef = null;
		};
	};

	// Track which group popover is open
	let openGroup = $state<string | null>(null);

	// Mobile detection using shared composable
	const mobile = useMobile();
	const isMobile = $derived(mobile.isMobile);

	let mobileTab = $state<'courses' | 'schedule'>('courses');

	const closeCourseOverlays = () => {
		searchDropdownOpen = false;
		openGroup = null;
		searchHighlightIndex = -1;
	};

	const setMobileTab = (next: 'courses' | 'schedule') => {
		if (mobileTab === next) return;
		if (next === 'schedule') closeCourseOverlays();
		mobileTab = next;
	};

	let generationEpoch = 0;
	let activeGeneration: CancelablePromise<ScheduleData> | null = null;

	const cancelActiveGeneration = () => {
		if (!activeGeneration) return;
		try {
			activeGeneration.cancel();
		} catch {
			// ignore
		}
		activeGeneration = null;
	};

	onDestroy(() => {
		generationEpoch += 1;
		cancelActiveGeneration();
		triggerScheduleGeneration.cancel();
	});

	onMount(() => {
		const onPointerDown = (event: PointerEvent) => {
			if (!searchBoxEl) return;
			if (event.target instanceof Node && searchBoxEl.contains(event.target)) return;
			searchDropdownOpen = false;
			searchHighlightIndex = -1;
		};

		document.addEventListener('pointerdown', onPointerDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
		};
	});

	// Touch swipe for schedule navigation
	let touchStartX = $state<number | null>(null);
	let touchEndX = $state<number | null>(null);

	const onTouchStart = (e: TouchEvent) => {
		// Timetable uses swipe gestures on mobile (day navigation)
		if (isMobile) return;
		touchEndX = null;
		touchStartX = e.changedTouches[0].clientX;
	};

	const onTouchMove = (e: TouchEvent) => {
		if (isMobile) return;
		touchEndX = e.changedTouches[0].clientX;
	};

	const onTouchEnd = () => {
		if (isMobile) return;
		if (touchStartX == null || touchEndX == null) return;
		if (!scheduleData?.schedules?.length) return;

		const delta = touchStartX - touchEndX;
		if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;

		if (delta > 0 && activeScheduleIndex < scheduleData.schedules.length - 1) {
			// Swipe left - next schedule
			activeScheduleIndex = activeScheduleIndex + 1;
		} else if (delta < 0 && activeScheduleIndex > 0) {
			// Swipe right - previous schedule
			activeScheduleIndex = activeScheduleIndex - 1;
		}
	};

	// Schedule transition state
	let transitioning = $state(false);
	let lastScheduleIndex = $state(0);

	let showWarnings = $state(false);

	const selectionKey = (
		termValue: string | null,
		coursesValue: string[],
		hoursValue: BlockedHour[]
	) => {
		const coursesKey = [...coursesValue].sort().join('|');
		const hoursKey = [...hoursValue]
			.map((h) => `${h.day}|${h.slot}`)
			.sort()
			.join('|');
		return `${termValue ?? 'none'}::${coursesKey}::${hoursKey}`;
	};

	const currentSelectionKey = $derived(selectionKey(term, selectedCourses, blockedHours));

	let lastGeneratedSelectionKey = $state<string | null>(null);

	const hasResultForSelection = $derived(
		Boolean(scheduleData) && hasGenerated && lastGeneratedSelectionKey === currentSelectionKey
	);

	watch(
		() => [hasGenerated, scheduleData] as const,
		([generated, data]) => {
			if (!generated || !data) {
				lastGeneratedSelectionKey = null;
				return;
			}

			lastGeneratedSelectionKey = currentSelectionKey;
		}
	);

	const warningList = $derived(
		scheduleData
			? translateWarnings(scheduleData.warnings || [], scheduleData.warning_codes || [], $t)
			: []
	);

	const totalWarningCount = $derived(warningList.length);

	const warningsExpanded = $derived(totalWarningCount <= 1 || showWarnings);
	const warningPreviewText = $derived(warningList[0] ?? '');

	watch(
		() => [warningList.length, scheduleData?.schedules?.length ?? 0] as const,
		([warningCount, scheduleCount]) => {
			const noSchedules = scheduleCount === 0;
			if (warningCount === 0 && !noSchedules) {
				showWarnings = false;
				return;
			}

			if (noSchedules && warningCount > 0) {
				showWarnings = true;
			}
		}
	);

	watch(
		() => activeScheduleIndex,
		(index) => {
			if (index === lastScheduleIndex) return;
			transitioning = true;
			const timeout = setTimeout(() => {
				transitioning = false;
			}, 260);
			lastScheduleIndex = index;
			return () => clearTimeout(timeout);
		}
	);

	const loadCourses = async (termValue: string) => {
		try {
			loading = true;
			courses = await getCourses(termValue);
			coursesError = '';
		} catch (err) {
			devWarn('Failed to load courses', err);
			coursesError = err instanceof Error ? err.message : $t('courseSelector.failedToLoad');
		} finally {
			loading = false;
		}
	};

	const loadSections = async (termValue: string) => {
		try {
			sections = await getSections(termValue);
			sectionsError = '';
		} catch (err) {
			devWarn('Failed to load sections', err);
			sectionsError =
				err instanceof Error
					? err.message
					: $t('errors.failedToLoadSections', { error: 'sections' });
			sections = {};
		}
	};

	const restoreFromStorage = (termValue: string) => {
		// Restore selected courses with validation
		if (selectedCourses.length === 0) {
			const coursesResult = parseStoredJson(
				getTermKey(termValue, 'selectedCourses'),
				validateSelectedCourses
			);
			if (coursesResult.success && coursesResult.data) {
				selectedCourses = coursesResult.data;
			}
		}

		// Restore blocked hours with validation
		if (blockedHours.length === 0) {
			const blockedResult = parseStoredJson(
				getTermKey(termValue, 'blockedHours'),
				validateBlockedHours
			);
			if (blockedResult.success && blockedResult.data) {
				blockedHours = blockedResult.data;
			}
		}

		// Restore section choices with validation
		if (Object.keys(sectionChoices).length === 0) {
			const choicesResult = parseStoredJson(
				getTermKey(termValue, 'sectionChoices'),
				validateSectionChoices
			);
			if (choicesResult.success && choicesResult.data) {
				sectionChoices = choicesResult.data;
			}
		}

		// Restore OR connections
		if (Object.keys(orConnections).length === 0) {
			try {
				const stored = localStorage.getItem(getTermKey(termValue, 'orConnections'));
				if (stored) {
					const parsed = JSON.parse(stored);
					if (typeof parsed === 'object' && parsed !== null) {
						orConnections = parsed;
					}
				}
			} catch (err) {
				devWarn('Failed to restore OR connections', err);
			}
		}

		// Restore active tab index
		try {
			const storedTab = localStorage.getItem(getTermKey(termValue, 'activeTab'));
			if (storedTab !== null) {
				const idx = parseInt(storedTab, 10);
				if (!Number.isNaN(idx)) activeScheduleIndex = idx;
			}
		} catch (err) {
			devWarn('Failed to restore active tab', err);
		}
	};

	watch(
		() => term,
		(value) => {
			generationEpoch += 1;
			cancelActiveGeneration();
			submitting = false;

			if (!value) return;
			// Reset initialization flag when term changes
			isInitialized = false;
			coursesError = '';
			sectionsError = '';
			sectionChoices = {};
			void loadCourses(value);
			void loadSections(value);
			restoreFromStorage(value);
			// Mark as initialized after a short delay to allow restoration to complete
			setTimeout(() => {
				isInitialized = true;
			}, 100);
		}
	);

	watch(
		() => [term, selectedCourses] as const,
		([termValue, coursesValue]) => {
			if (!termValue) return;
			storeJson(getTermKey(termValue, 'selectedCourses'), coursesValue);
		}
	);

	watch(
		() => [term, blockedHours] as const,
		([termValue, hoursValue]) => {
			if (!termValue) return;
			storeJson(getTermKey(termValue, 'blockedHours'), hoursValue);
		}
	);

	watch(
		() => [term, sectionChoices] as const,
		([termValue, choicesValue]) => {
			if (!termValue) return;
			storeJson(getTermKey(termValue, 'sectionChoices'), choicesValue);
		}
	);

	watch(
		() => [term, orConnections] as const,
		([termValue, connectionsValue]) => {
			if (!termValue) return;
			storeJson(getTermKey(termValue, 'orConnections'), connectionsValue);
		}
	);

	watch(
		() => [term, activeScheduleIndex] as const,
		([termValue, indexValue]) => {
			if (!termValue) return;
			try {
				localStorage.setItem(getTermKey(termValue, 'activeTab'), String(indexValue));
			} catch (err) {
				devWarn('Failed to save active tab', err);
			}
		}
	);

	watch(
		() => [activeScheduleIndex, scheduleData?.schedules?.length] as const,
		([indexValue, lengthValue]) => {
			const maxIndex = Math.max(0, (lengthValue || 1) - 1);
			if (indexValue > maxIndex) activeScheduleIndex = maxIndex;
		}
	);

	// Debounced schedule generation function
	const triggerScheduleGeneration = useDebounce(
		(
			epoch: number,
			termValue: string,
			coursesValue: string[],
			choicesValue: Record<string, string | null>,
			hoursValue: BlockedHour[],
			orConnectionsValue: Record<string, boolean>
		) => {
			if (epoch !== generationEpoch) return;

			submitting = true;
			actionMessage = '';
			actionTone = '';

			// Build option groups from OR connections
			// OR connections between adjacent courses create alternative schedules
			const optionGroups: string[][] = [];

			// Filter orConnections to only include valid adjacent course pairs
			const validOrConnections: Record<string, boolean> = {};
			for (let i = 0; i < coursesValue.length - 1; i++) {
				const course = coursesValue[i];
				if (orConnectionsValue[course]) {
					validOrConnections[course] = true;
				}
			}

			// Build option groups
			// - Courses with OR to next: grouped together (Pick 1 of these)
			// - Courses without OR: separate (Must pick this one)
			let currentGroup: string[] = [];

			for (let i = 0; i < coursesValue.length; i++) {
				const course = coursesValue[i];
				currentGroup.push(course);

				const isOrConnected = validOrConnections[course];

				if (!isOrConnected) {
					// End of a group (either a single course or end of an OR chain)
					if (currentGroup.length > 1) {
						// Only add to optionGroups if it's an OR group (choice > 1)
						// Single items are effectively mandatory, so we leave them out
						// and they will be handled as baseCourses (must include)
						optionGroups.push([...currentGroup]);
					}
					currentGroup = [];
				}
			}

			// Courses NOT in any option group go into the regular courses array
			const groupedCourses = new Set(optionGroups.flat());
			const regularCourses = coursesValue.filter((c) => !groupedCourses.has(c));

			const courseSectionArray: CourseEntry[] = regularCourses.map((course) => ({
				course,
				section: choicesValue[course] || null
			}));

			// Convert option groups to the API format
			const validOptionGroups = optionGroups.map((group) => ({
				options: group.map((course) => ({
					course,
					section: choicesValue[course] || null
				}))
			}));

			cancelActiveGeneration();
			const request = generateSchedule({
				courses: courseSectionArray,
				course_option_groups: validOptionGroups.length > 0 ? validOptionGroups : undefined,
				blocked_hours: hoursValue,
				term: termValue
			}) as CancelablePromise<ScheduleData>;
			activeGeneration = request;

			request
				.then((data) => {
					if (epoch !== generationEpoch) return;

					activeScheduleIndex = 0;
					onSchedule?.(data, coursesValue);
					actionMessage = '';
					actionTone = '';
				})
				.catch((err) => {
					if (epoch !== generationEpoch) return;
					if (err instanceof Error && err.message === 'Cancelled') return;

					devWarn('Failed to generate schedule', err);
					actionMessage =
						err instanceof Error
							? err.message
							: $t('errors.failedToGenerateSchedule', { error: '' });
					actionTone = 'error';
				})
				.finally(() => {
					if (epoch !== generationEpoch) return;

					submitting = false;
					if (activeGeneration === request) {
						activeGeneration = null;
					}
				});
		},
		300 // 300ms debounce delay
	);

	// Auto-generate schedule when selections change
	watch(
		() => [term, selectedCourses, sectionChoices, blockedHours, orConnections] as const,
		([termValue, coursesValue, choicesValue, hoursValue, orConnectionsValue]) => {
			if (suppressAutoGenerate) return;

			generationEpoch += 1;
			const epoch = generationEpoch;
			cancelActiveGeneration();

			if (!termValue || coursesValue.length === 0) {
				submitting = false;
				// Clear schedule if no courses selected
				if (coursesValue.length === 0 && hasGenerated) {
					onSchedule?.(
						{
							schedules: [],
							time_slots: [...TIME_SLOTS],
							days_of_week: [...DAYS_OF_WEEK],
							warnings: [],
							warning_codes: []
						},
						coursesValue
					);
				}
				return;
			}

			// Don't auto-generate until initial restoration is complete
			if (!isInitialized) {
				submitting = false;
				return;
			}

			submitting = true;
			actionMessage = '';
			actionTone = '';

			// Use debounced generation
			triggerScheduleGeneration(
				epoch,
				termValue,
				coursesValue,
				choicesValue,
				hoursValue,
				orConnectionsValue
			);
		},
		{ lazy: true } // Don't run on initial mount
	);

	const filteredGroups = $derived.by(() => {
		const needle = searchInput.trim().toLowerCase();
		return Object.entries(courses)
			.map(([group, list]) => {
				const filtered = needle
					? list.filter((course) => course.toLowerCase().includes(needle))
					: list;
				return { group, courses: filtered };
			})
			.filter((entry) => entry.courses.length > 0);
	});

	type SearchResult = { course: string; group: string };

	const searchResults = $derived.by<SearchResult[]>(() => {
		const needle = searchInput.trim().toLowerCase();
		if (!needle) return [];

		const results: SearchResult[] = [];
		for (const [group, list] of Object.entries(courses)) {
			for (const course of list) {
				const lower = course.toLowerCase();
				if (!lower.includes(needle)) continue;
				results.push({ course, group });
			}
		}

		results.sort((a, b) => {
			const aLower = a.course.toLowerCase();
			const bLower = b.course.toLowerCase();
			const aRank = aLower.startsWith(needle) ? 0 : 1;
			const bRank = bLower.startsWith(needle) ? 0 : 1;
			if (aRank !== bRank) return aRank - bRank;
			return a.course.localeCompare(b.course);
		});

		return results.slice(0, 12);
	});

	const selectCourseFromSearch = (course: string) => {
		if (selectedCourses.includes(course)) return;
		toggleCourse(course);
		searchInput = '';
		searchDropdownOpen = false;
		searchHighlightIndex = -1;
	};

	const onSearchKeyDown = (event: KeyboardEvent) => {
		if (searchInput.trim().length === 0) return;

		if (!searchDropdownOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
			if (searchResults.length === 0) return;
			event.preventDefault();
			searchDropdownOpen = true;
			searchHighlightIndex = event.key === 'ArrowUp' ? searchResults.length - 1 : 0;
			return;
		}

		if (!searchDropdownOpen) return;
		if (searchResults.length === 0) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			searchHighlightIndex = Math.min(
				searchResults.length - 1,
				Math.max(0, searchHighlightIndex + 1)
			);
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			searchHighlightIndex = Math.max(-1, searchHighlightIndex - 1);
			return;
		}

		if (event.key === 'Enter') {
			if (searchHighlightIndex < 0) return;
			event.preventDefault();
			const hit = searchResults[searchHighlightIndex];
			if (!hit) return;
			selectCourseFromSearch(hit.course);
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			searchDropdownOpen = false;
			searchHighlightIndex = -1;
		}
	};

	const toggleCourse = (course: string) => {
		if (selectedCourses.includes(course)) {
			selectedCourses = selectedCourses.filter((c) => c !== course);
			sectionChoices = Object.fromEntries(
				Object.entries(sectionChoices).filter(([key]) => key !== course)
			);
			const newOrConnections: Record<string, boolean> = {};
			for (const [key, val] of Object.entries(orConnections)) {
				if (key !== course && val) {
					newOrConnections[key] = true;
				}
			}
			orConnections = newOrConnections;
		} else {
			selectedCourses = [...selectedCourses, course];
		}
		openGroup = null;
	};

	const handleLoadSchedule = (saved: SavedSchedule) => {
		suppressAutoGenerate = true;
		activeScheduleIndex = saved.activeScheduleIndex ?? 0;
		selectedCourses = saved.selectedCourses;
		blockedHours = saved.blockedHours || [];

		// Convert courseOptionGroups back to orConnections format
		const newOrConnections: Record<string, boolean> = {};
		if (saved.courseOptionGroups) {
			for (const group of saved.courseOptionGroups) {
				// In each group, all courses except the last are OR-connected to the next
				for (let i = 0; i < group.length - 1; i++) {
					newOrConnections[group[i]] = true;
				}
			}
		}
		orConnections = newOrConnections;

		const newChoices: Record<string, string | null> = {};
		const activeSchedule = saved.scheduleData.schedules[activeScheduleIndex];
		activeSchedule?.sections.forEach((section) => {
			newChoices[section.course] = section.section;
		});
		sectionChoices = newChoices;

		if (onLoadSavedSchedule) {
			onLoadSavedSchedule(saved);
		} else {
			onSchedule?.(saved.scheduleData, saved.selectedCourses);
		}

		queueMicrotask(() => {
			suppressAutoGenerate = false;
		});
	};

	// Download handler
	const handleDownload = async () => {
		if (isDownloading) return;

		const node = captureRef ?? scheduleRef;
		if (!node) return;
		isDownloading = true;
		await tick();
		try {
			await downloadScheduleAsImage(
				node,
				captureScrollRef ?? scrollRef,
				activeScheduleIndex,
				(error) => {
					actionMessage = error;
					actionTone = 'error';
				},
				{
					footer: {
						term,
						locale: $t('locale.code'),
						showTimestamp: true,
						labels: {
							termLabel: $t('savedSchedules.term')
						}
					}
				}
			);
			actionMessage = $t('courseSelector.download') + ' ✓';
			actionTone = 'success';
		} catch {
			// Error handled in callback
		} finally {
			isDownloading = false;
		}
	};

	// Computed values for button states
	const canDownload = $derived(
		hasGenerated && scheduleData && scheduleData.schedules && scheduleData.schedules.length > 0
	);
	const canSave = $derived(
		hasGenerated && scheduleData && scheduleData.schedules && scheduleData.schedules.length > 0
	);

	// Current schedule for timetable
	const currentSchedule = $derived(scheduleData?.schedules?.[activeScheduleIndex] ?? null);
	const timeSlots = $derived(
		scheduleData?.time_slots?.length ? scheduleData.time_slots : TIME_SLOTS
	);
	const daysOfWeek = $derived(
		scheduleData?.days_of_week?.length ? scheduleData.days_of_week : DAYS_OF_WEEK
	);
</script>

<section class="course-selector">
	{#if isMobile}
		<div class="mobile-tab-switcher" role="tablist" aria-label="Course selector">
			<button
				id="mobile-tab-courses"
				type="button"
				class="mobile-tab"
				role="tab"
				aria-selected={mobileTab === 'courses'}
				tabindex={mobileTab === 'courses' ? 0 : -1}
				onclick={() => setMobileTab('courses')}
			>
				{$t('savedSchedules.courses')}
			</button>
			<button
				id="mobile-tab-schedule"
				type="button"
				class="mobile-tab"
				role="tab"
				aria-selected={mobileTab === 'schedule'}
				tabindex={mobileTab === 'schedule' ? 0 : -1}
				onclick={() => setMobileTab('schedule')}
			>
				{$t('courseSelector.schedule')}
			</button>
		</div>
	{/if}

	{#if !isMobile || mobileTab === 'courses'}
		<div
			class="course-form"
			role={isMobile ? 'tabpanel' : undefined}
			aria-labelledby={isMobile ? 'mobile-tab-courses' : undefined}
		>
			<!-- Search Field -->
			<div class="search-box" {@attach searchBoxAttachment}>
				<div class="search-field">
					<Search class="pointer-events-none absolute left-3 text-ink-muted" size={20} />
					<input
						type="text"
						placeholder={$t('courseSelector.typeToSearch')}
						bind:value={searchInput}
						role="combobox"
						aria-autocomplete="list"
						aria-haspopup="listbox"
						aria-controls="course-search-listbox"
						aria-expanded={searchDropdownOpen && searchInput.trim().length > 0}
						aria-activedescendant={searchHighlightIndex >= 0
							? `course-search-option-${searchHighlightIndex}`
							: undefined}
						onfocus={() => {
							searchDropdownOpen = searchInput.trim().length > 0;
						}}
						oninput={(event) => {
							searchHighlightIndex = -1;
							const value = (event.currentTarget as HTMLInputElement).value;
							searchDropdownOpen = value.trim().length > 0;
						}}
						onkeydown={onSearchKeyDown}
					/>
				</div>

				{#if searchDropdownOpen && searchInput.trim().length > 0}
					<div class="search-results" role="listbox" id="course-search-listbox">
						{#if searchResults.length === 0}
							<div class="search-empty">{$t('courseSelector.noResults')}</div>
						{:else}
							{#each searchResults as result, index (`${result.course}|${result.group}`)}
								{@const isSelected = selectedCourses.includes(result.course)}
								<button
									type="button"
									class="search-result {index === searchHighlightIndex ? 'active' : ''}"
									role="option"
									aria-selected={index === searchHighlightIndex}
									disabled={isSelected}
									id={`course-search-option-${index}`}
									onclick={() => selectCourseFromSearch(result.course)}
								>
									<span class="result-course">{result.course}</span>
									<span class="result-meta">{result.group}</span>
								</button>
							{/each}
						{/if}
					</div>
				{/if}
			</div>

			{#if actionMessage}
				<div class="alert {actionTone}">
					{#if actionTone === 'error'}
						<CircleAlert size={20} />
					{:else}
						<CircleCheck size={20} />
					{/if}
					<span>{actionMessage}</span>
				</div>
			{/if}

			<!-- Course Groups + Selected Courses -->
			<div class="course-groups-container">
				{#if coursesError}
					<div class="alert error">
						<CircleAlert size={20} />
						<span>{coursesError}</span>
					</div>
				{:else}
					<div class="groups-toolbar">
						<div class="groups-toolbar-header">
							<h2 class="section-label">{$t('courseSelector.courseGroups')}</h2>
						</div>
					</div>

					{#if groupsExpanded}
						<div class="groups-accordion" id="course-groups-accordion">
							{#if loading}
								<div class="loading-state">
									<div class="skeleton-grid">
										{#each Array(10) as _, i (i)}
											<div class="skeleton chip"></div>
										{/each}
									</div>
								</div>
							{:else}
								<div class="group-chips">
									{#each filteredGroups as group (group.group)}
										{@const isOpen = openGroup === group.group}
										<Popover.Root
											open={isOpen}
											onOpenChange={(open) => {
												openGroup = open ? group.group : null;
											}}
										>
											<Popover.Trigger
												class="group-chip {isOpen ? 'active' : ''}"
												aria-label={$t('courseSelector.showCourses', {
													group: group.group
												})}
												aria-expanded={isOpen}
											>
												<span class="group-name">{group.group}</span>
												<ChevronRight
													size={16}
													class="transition-transform {isOpen ? 'rotate-90' : ''}"
													aria-hidden="true"
												/>
											</Popover.Trigger>
											<Popover.Portal>
												<Popover.Content class="group-dropdown" sideOffset={4} align="start">
													<div class="dropdown-list" role="listbox" aria-label={group.group}>
														{#each group.courses as course (course)}
															<button
																type="button"
																class="dropdown-item {selectedCourses.includes(course)
																	? 'selected'
																	: ''}"
																onclick={() => toggleCourse(course)}
																role="option"
																aria-selected={selectedCourses.includes(course)}
															>
																{course}
															</button>
														{/each}
													</div>
												</Popover.Content>
											</Popover.Portal>
										</Popover.Root>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Selected Courses -->
					{#if selectedCourses.length > 0}
						<div class="selected-section">
							<div class="selected-header">
								<h2 class="section-label">
									{$t('courseSelector.selectedCourses')} ({selectedCourses.length})
								</h2>
								<button
									type="button"
									class="clear-all-btn"
									onclick={() => (selectedCourses = [])}
									aria-label={$t('tooltips.clearAll')}
									title={$t('tooltips.clearAll')}
								>
									<X size={16} />
									{$t('courseSelector.clearAll')}
								</button>
							</div>
							<div class="selected-chips">
								{#each selectedCourses as course, index (course)}
									{@const courseSections = sections[course]}
									{@const hasMultipleSections = (courseSections?.length ?? 0) > 1}
									{@const isLastCourse = index === selectedCourses.length - 1}
									{@const isOrConnected = orConnections[course] ?? false}
									<div class="selected-chip">
										<span class="chip-label">{course}</span>

										{#if hasMultipleSections}
											<select
												class="chip-section-select"
												aria-label={$t('courseSelector.sectionSelectAriaLabel', { course })}
												value={sectionChoices[course] ?? ''}
												onchange={(event) => {
													const value = (event.currentTarget as HTMLSelectElement).value;
													// Reassign to ensure watchers see a new reference
													// (the schedule generator watches `sectionChoices` as a whole)
													if (!value) {
														if (course in sectionChoices) {
															const { [course]: _ignored, ...rest } = sectionChoices;
															sectionChoices = rest;
														}
														return;
													}

													sectionChoices = {
														...sectionChoices,
														[course]: value
													};
												}}
											>
												<option value="">{$t('courseSelector.any')}</option>
												{#each courseSections as sectionId (sectionId)}
													<option value={sectionId}>{sectionId}</option>
												{/each}
											</select>
										{/if}

										<button
											type="button"
											class="chip-remove group"
											onclick={() => toggleCourse(course)}
											aria-label={$t('courseSelector.removeCourse', { course })}
											title={$t('courseSelector.removeCourse', { course })}
										>
											<X
												class="shrink-0 opacity-70 transition-colors group-hover:text-error"
												size={16}
												aria-hidden="true"
											/>
										</button>
									</div>

									<!-- AND/OR Connector Toggle (between courses) -->
									{#if !isLastCourse}
										<button
											type="button"
											class="connector-toggle {isOrConnected ? 'or-active' : ''}"
											onclick={() => {
												if (isOrConnected) {
													const { [course]: _, ...rest } = orConnections;
													orConnections = rest;
												} else {
													orConnections = {
														...orConnections,
														[course]: true
													};
												}
											}}
											aria-label={isOrConnected
												? $t('courseSelector.connector.or')
												: $t('courseSelector.connector.and')}
											title={isOrConnected
												? $t('courseSelector.connector.or')
												: $t('courseSelector.connector.and')}
										>
											{isOrConnected
												? $t('courseSelector.connector.or')
												: $t('courseSelector.connector.and')}
										</button>
									{/if}
								{/each}
							</div>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Action Buttons Row (Desktop only) -->
			<div class="action-row desktop-only">
				{#if submitting}
					<div class="generating-indicator">
						<LoaderCircle class="animate-spin" size={18} />
						<span>{$t('courseSelector.generatingShort')}</span>
					</div>
				{/if}
				<Button.Root
					class="btn btn-outlined btn-download"
					disabled={!canDownload || isDownloading}
					type="button"
					onclick={handleDownload}
				>
					{#if isDownloading}
						<LoaderCircle class="animate-spin" size={18} />
					{:else}
						<Download size={18} />
					{/if}
					{isDownloading ? $t('courseSelector.downloadingImage') : $t('courseSelector.download')}
				</Button.Root>
				<Button.Root
					class="btn btn-soft"
					type="button"
					onclick={() => (saveDialogOpen = true)}
					disabled={!canSave}
				>
					<Save size={18} />
					{$t('savedSchedules.saveSchedule')}
				</Button.Root>
				<Button.Root class="btn btn-outlined" type="button" onclick={() => (loadDialogOpen = true)}>
					<FolderOpen size={18} />
					{$t('savedSchedules.loadSchedule')}
				</Button.Root>
			</div>

			{#if sectionsError}
				<div class="alert warning">
					<TriangleAlert size={20} />
					<span>{$t('courseSelector.sectionsPartialWarning')}</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Timetable Section (Full Width Below) -->
	{#if !isMobile || mobileTab === 'schedule'}
		<div
			class="timetable-section"
			{@attach scheduleRefAttachment}
			ontouchstart={onTouchStart}
			ontouchmove={onTouchMove}
			ontouchend={onTouchEnd}
			role={isMobile ? 'tabpanel' : undefined}
			aria-labelledby={isMobile ? 'mobile-tab-schedule' : undefined}
		>
			{#if hasResultForSelection && !submitting && totalWarningCount > 0}
				<div class="warning-panel">
					<div class="warning-header">
						<div class="warning-title">
							<TriangleAlert size={20} />
							<span>{totalWarningCount} {$t('courseSelector.warnings')}</span>
						</div>
						{#if totalWarningCount > 1}
							<Button.Root
								class="btn btn-ghost"
								type="button"
								onclick={() => (showWarnings = !showWarnings)}
							>
								{showWarnings
									? $t('courseSelector.hideWarnings')
									: $t('courseSelector.showWarnings')}
								<ChevronDown
									size={18}
									class="transition-transform {showWarnings ? 'rotate-180' : ''}"
								/>
							</Button.Root>
						{/if}
					</div>
					{#if warningsExpanded}
						<ul class="warning-list">
							{#each warningList as warning, i (`${warning}|${i}`)}
								<li>{warning}</li>
							{/each}
						</ul>
					{:else}
						<div class="warning-preview">
							<span>{warningPreviewText}</span>
							<span class="warning-more">(+{totalWarningCount - 1})</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Block Time Slots Hint -->
			<div class="block-hint">
				<span>{$t('timetable.clickToBlock')}</span>
				<button
					type="button"
					class="info-btn"
					title={$t('courseSelector.blockingTip.description')}
					aria-label={$t('courseSelector.blockingTip.title')}
				>
					<Info size={16} aria-hidden="true" />
				</button>
			</div>

			{#if hasGenerated && currentSchedule}
				<!-- Schedule Navigation -->
				{#if scheduleData && scheduleData.schedules.length > 1}
					<div class="schedule-nav">
						<button
							type="button"
							class="nav-btn"
							disabled={activeScheduleIndex === 0}
							onclick={() => (activeScheduleIndex = Math.max(0, activeScheduleIndex - 1))}
							aria-label={$t('pagination.previous')}
						>
							<ChevronLeft size={20} />
						</button>
						<span class="schedule-counter">
							{activeScheduleIndex + 1} / {scheduleData.schedules.length}
						</span>
						<button
							type="button"
							class="nav-btn"
							disabled={activeScheduleIndex >= scheduleData.schedules.length - 1}
							onclick={() =>
								(activeScheduleIndex = Math.min(
									scheduleData.schedules.length - 1,
									activeScheduleIndex + 1
								))}
							aria-label={$t('pagination.next')}
						>
							<ChevronRight size={20} />
						</button>
					</div>
				{/if}
				{#key activeScheduleIndex}
					<div class="timetable-wrapper" class:transitioning in:fade={{ duration: 200 }}>
						<Timetable
							schedule={currentSchedule}
							{timeSlots}
							{daysOfWeek}
							{blockedHours}
							onBlockedHoursChange={(hours) => (blockedHours = hours)}
							bind:scrollRef
						/>
					</div>
				{/key}
			{:else}
				<!-- Empty State Timetable -->
				<Timetable
					schedule={null}
					{timeSlots}
					{daysOfWeek}
					{blockedHours}
					onBlockedHoursChange={(hours) => (blockedHours = hours)}
					bind:scrollRef
				/>
			{/if}
		</div>
	{/if}

	{#if hasGenerated && currentSchedule}
		<div class="capture-only" {@attach captureRefAttachment} aria-hidden="true" inert>
			<Timetable
				schedule={currentSchedule}
				{timeSlots}
				{daysOfWeek}
				{blockedHours}
				downloadMode={true}
				onBlockedHoursChange={(hours) => (blockedHours = hours)}
				bind:scrollRef={captureScrollRef}
			/>
		</div>
	{/if}

	{#if scheduleData}
		<SaveScheduleDialog
			open={saveDialogOpen}
			onClose={() => (saveDialogOpen = false)}
			onSaved={(saved) => {
				actionMessage = $t('savedSchedules.scheduleWasSaved', {
					name: saved.name
				});
				actionTone = 'success';
			}}
			term={term || ''}
			{selectedCourses}
			{scheduleData}
			{blockedHours}
			{activeScheduleIndex}
			{orConnections}
		/>
	{/if}

	<SavedSchedulesDialog
		open={loadDialogOpen}
		onClose={() => (loadDialogOpen = false)}
		onLoadSchedule={(saved) => {
			handleLoadSchedule(saved);
			actionMessage = $t('savedSchedules.scheduleWasLoaded', {
				name: saved.name
			});
			actionTone = 'success';
		}}
		currentTerm={term}
	/>

	<!-- Mobile Bottom Action Bar -->
	<BottomActionBar
		visible={isMobile || selectedCourses.length > 0}
		generating={submitting}
		canDownload={!!canDownload}
		downloading={isDownloading}
		canSave={!!canSave}
		onDownload={handleDownload}
		onSave={() => (saveDialogOpen = true)}
		onLoad={() => (loadDialogOpen = true)}
	/>
</section>

<style>
	.course-selector {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.mobile-tab-switcher {
		display: flex;
		gap: 4px;
		width: 100%;
		padding: 4px;
		position: sticky;
		top: var(--space-sm);
		z-index: var(--z-float);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border);
		background: var(--bg);
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		box-shadow: var(--shadow-sm);
	}

	.mobile-tab {
		flex: 1;
		border: none;
		background: transparent;
		border-radius: calc(var(--radius-lg) - 4px);
		padding: 10px 12px;
		font-size: 13px;
		font-weight: 700;
		color: var(--ink-muted);
		cursor: pointer;
		transition: var(--transition-fast);
	}

	.mobile-tab[aria-selected='true'] {
		background: var(--surface);
		color: var(--primary);
		box-shadow: var(--shadow-sm);
	}

	.mobile-tab:focus-visible {
		outline: none;
		box-shadow: var(--shadow-focus);
	}

	@media (min-width: 769px) {
		.mobile-tab-switcher {
			display: none;
		}
	}

	.course-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	/* Search Field */
	.search-box {
		position: relative;
	}

	.search-field {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-field input {
		width: 100%;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 12px 12px 12px 44px;
		font-size: 14px;
		transition: var(--transition);
		background: var(--surface);
	}

	.search-field input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: var(--shadow-focus);
	}

	.search-results {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		right: 0;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
		z-index: calc(var(--z-float) + 1);
		max-height: 320px;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.search-empty {
		padding: 12px 14px;
		font-size: 14px;
		color: var(--ink-muted);
	}

	.search-result {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		width: 100%;
		text-align: left;
		padding: 10px 14px;
		border: none;
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		transition: var(--transition-fast);
	}

	.search-result:hover:not(:disabled),
	.search-result.active:not(:disabled) {
		background: var(--primary-soft);
		color: var(--primary);
	}

	.search-result:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.result-course {
		font-weight: 700;
	}

	.result-meta {
		font-size: 12px;
		font-weight: 600;
		color: var(--ink-muted);
	}

	/* Alerts */
	.alert {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 12px 16px;
		border-radius: var(--radius-md);
		font-size: 14px;
		font-weight: 500;
	}

	.alert.error {
		background: var(--error-light);
		color: var(--error);
	}

	.alert.success {
		background: var(--success-bg);
		color: var(--success-dark);
	}

	.alert.warning {
		background: var(--warning-bg);
		color: var(--warning-text);
	}

	/* Loading State */
	.course-groups-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.skeleton-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.skeleton {
		background: linear-gradient(90deg, var(--bg) 25%, var(--border-light) 50%, var(--bg) 75%);
		background-size: 200% 100%;
		border-radius: var(--radius-md);
		animation: shimmer 1.5s infinite;
	}

	.skeleton.chip {
		width: 80px;
		height: 36px;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	/* Groups Toolbar */
	.groups-toolbar {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.groups-toolbar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	:global(.group-chip:focus-visible) {
		outline: none;
		box-shadow: var(--shadow-focus);
	}

	:global(.groups-toggle) {
		padding: 8px;
		min-width: 36px;
		min-height: 36px;
		justify-content: center;
	}

	:global(.groups-toggle:disabled) {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.groups-accordion {
		margin-top: var(--space-sm);
		max-height: min(60dvh, 520px);
		overflow-y: auto;
	}

	@media (max-width: 640px) {
		.groups-accordion {
			max-height: min(55dvh, 520px);
		}
	}

	.section-label {
		font-size: 13px;
		font-weight: 500;
		color: var(--ink-muted);
		margin: 0;
	}

	/* Selected Courses Section */
	.selected-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-top: var(--space-sm);
	}

	.selected-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.clear-all-btn {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--error);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: var(--transition-fast);
	}

	.clear-all-btn:hover {
		background: var(--error-light);
	}

	.selected-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		align-items: center;
	}

	.selected-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 10px;
		border: 1.5px solid var(--primary);
		border-radius: var(--radius-md);
		background: rgba(25, 118, 210, 0.08);
		color: var(--primary);
		font-size: 13px;
		font-weight: 600;
		cursor: default;
		transition: var(--transition-fast);
	}

	.chip-section-select {
		margin-left: 4px;
		padding: 1px 4px;
		height: 22px;
		min-width: 6ch;
		width: 6.5ch;
		max-width: 10ch;
		border-radius: var(--radius-sm);
		border: 1px solid color-mix(in srgb, var(--primary) 55%, var(--border));
		background: var(--surface);
		color: var(--ink);
		font-size: 11px;
		font-weight: 600;
		line-height: 1;
	}

	.chip-section-select:focus-visible {
		outline: none;
		box-shadow: var(--shadow-focus);
	}

	.chip-remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-left: 2px;
		padding: 2px;
		border: none;
		background: transparent;
		color: inherit;
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: var(--transition-fast);
	}

	.chip-remove:hover {
		background: rgba(25, 118, 210, 0.12);
	}

	.chip-remove:focus-visible {
		outline: none;
		box-shadow: var(--shadow-focus);
	}

	.chip-label {
		line-height: 1.2;
	}

	/* AND/OR Connector Toggle */
	.connector-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 4px 8px;
		min-width: 36px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg);
		color: var(--ink-muted);
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition: var(--transition-fast);
		flex-shrink: 0;
	}

	.connector-toggle:hover {
		border-color: var(--primary);
		color: var(--primary);
		background: var(--primary-soft);
	}

	.connector-toggle:focus-visible {
		outline: none;
		box-shadow: var(--shadow-focus);
	}

	.connector-toggle.or-active {
		border-color: var(--warning);
		background: var(--warning-bg);
		color: var(--warning-text);
	}

	.connector-toggle.or-active:hover {
		border-color: var(--warning);
		background: color-mix(in srgb, var(--warning-bg) 80%, var(--warning));
	}

	.group-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	:global(.group-chip) {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 8px 12px;
		border: 1px solid var(--primary);
		border-radius: var(--radius-md);
		background: var(--surface);
		font-size: 13px;
		font-weight: 600;
		color: var(--primary);
		cursor: pointer;
		transition: var(--transition);
	}

	:global(.group-chip:hover) {
		background: var(--primary-light);
		color: white;
		border-color: var(--primary-light);
	}

	:global(.group-chip.active) {
		background: var(--primary);
		color: white;
		border-color: var(--primary);
	}

	.group-name {
		font-weight: 600;
	}

	:global(.group-dropdown) {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		z-index: calc(var(--z-float) + 1);
		max-height: 280px;
		overflow-y: auto;
		min-width: 200px;
	}

	.dropdown-list {
		display: flex;
		flex-direction: column;
		padding: var(--space-xs);
	}

	.dropdown-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 10px 14px;
		border: none;
		background: transparent;
		font-size: 14px;
		color: var(--ink);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: var(--transition-fast);
	}

	.dropdown-item:hover {
		background: var(--bg);
	}

	.dropdown-item.selected {
		background: var(--primary);
		color: white;
	}

	/* Action Row */
	.action-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: var(--space-sm);
		padding-top: var(--space-sm);
	}

	/* Generating indicator */
	.generating-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--ink-muted);
		font-size: 14px;
		padding: 0 var(--space-sm);
	}

	/* Desktop only - hide on mobile */
	.action-row.desktop-only {
		display: flex;
	}

	@media (max-width: 768px) {
		.action-row.desktop-only {
			display: none;
		}
	}

	/* Block Hint */
	.block-hint {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-xs);
		font-size: 13px;
		color: var(--ink-muted);
		/* Fixed dimensions to prevent CLS */
		line-height: 1.2;
		min-height: 24px;
	}

	.info-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 4px;
		border: none;
		background: transparent;
		color: var(--ink-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: var(--transition-fast);
	}

	.info-btn:hover {
		color: var(--primary);
	}

	/* Timetable Section */
	.timetable-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		min-height: var(--timetable-min-height);
		/* Contain layout to prevent shifts from affecting other content */
		contain: layout style;
	}

	/* Schedule Navigation */
	.schedule-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
		transition: var(--transition-fast);
	}

	.nav-btn:hover:not(:disabled) {
		background: var(--primary);
		color: white;
		border-color: var(--primary);
	}

	.nav-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.schedule-counter {
		font-size: 14px;
		font-weight: 600;
		color: var(--ink);
		min-width: 60px;
		text-align: center;
	}

	/* Responsive */
	@media (max-width: 600px) {
		.action-row:not(.desktop-only) {
			flex-direction: column;
		}

		.action-row:not(.desktop-only) :global(.btn) {
			width: 100%;
			justify-content: center;
		}
	}

	/* Timetable transition wrapper */
	.timetable-wrapper {
		transition: opacity 0.2s ease;
	}

	.timetable-wrapper.transitioning {
		opacity: 0.7;
	}

	.warning-panel {
		background: var(--warning-bg);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		border: 1px solid rgba(255, 152, 0, 0.2);
	}

	.warning-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.warning-title {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-weight: 600;
		color: var(--warning-text);
	}

	.warning-list {
		margin: var(--space-md) 0 0;
		padding-left: 24px;
		color: var(--warning-text);
		font-size: 14px;
	}

	.warning-list li {
		margin-bottom: var(--space-xs);
	}

	.warning-preview {
		margin-top: var(--space-sm);
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
		align-items: baseline;
		color: var(--warning-text);
		font-size: 14px;
	}

	.warning-more {
		font-weight: 600;
	}

	.capture-only {
		position: fixed;
		left: -20000px;
		top: 0;
		pointer-events: none;
		width: min(1200px, 100vw);
		background: var(--bg);
	}

	/* Add padding at bottom for mobile action bar */
	@media (max-width: 768px) {
		.course-selector {
			padding-bottom: calc(var(--bottom-action-bar-space) + var(--safe-area-bottom));
		}
	}
</style>
