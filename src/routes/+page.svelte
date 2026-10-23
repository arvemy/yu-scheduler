<script lang="ts">
	import AppHeader from '#lib/components/AppHeader.svelte';
	import CourseSelector from '#lib/components/CourseSelector.svelte';
	import { t } from '#lib/i18n/index.js';
	import { listTerms, loadCatalog } from '#lib';
	import type { BlockedHour, CatalogData, ScheduleData, SavedSchedule } from '#lib/types/index.js';
	import { dismissWelcomeModal, shouldShowWelcomeModal } from '#lib/storage/welcome.js';
	import { getLatestTerm } from '#lib/utils/term.js';
	import { devWarn } from '#lib/utils/logger.js';
	import { parseStoredJson, storeJson, validateLastGenerated } from '#lib/utils/storage.js';
	import { getLastGeneratedKey, getTermKey } from '#lib/storage/keys.js';
	import { onMount } from 'svelte';

	let terms = $state<string[]>([]);
	let currentTerm = $state<string | null>(null);
	let termsLoading = $state(true);
	let termsError = $state(false);

	// Generated results and the catalog are only ever replaced, never mutated.
	let scheduleData = $state.raw<ScheduleData | null>(null);
	let selectedCourses = $state<string[]>([]);
	let blockedHours = $state<BlockedHour[]>([]);
	let hasGenerated = $state(false);
	let activeScheduleIndex = $state(0);

	const emptyCatalog: CatalogData = { academic_year: '', courses: {}, programs: [] };
	let catalog = $state.raw<CatalogData>(emptyCatalog);
	let currentProgram = $state<string | null>(null);

	let showWelcomeModal = $state(false);
	let dontShowWelcomeAgain = $state(false);

	const documentTitle = $derived(`${t('app.title')} - ${t('app.subtitle')}`);
	const documentLang = $derived(t('locale.code'));

	$effect(() => {
		document.documentElement.lang = documentLang;
	});

	const loadTerms = async () => {
		termsLoading = true;
		termsError = false;
		try {
			const data = await listTerms();
			terms = data;
			if (data.length > 0) {
				switchTerm(getLatestTerm(data) ?? data[0]);
			}
		} catch (err) {
			devWarn('Failed to load terms', err);
			termsError = true;
		} finally {
			termsLoading = false;
		}
	};

	onMount(() => {
		void loadTerms();
		showWelcomeModal = shouldShowWelcomeModal();
	});

	const handleChangeTerm = (term: string) => {
		if (term !== currentTerm) switchTerm(term);
	};

	// Persist the program filter per term. Only user changes are saved here; the
	// per-term restore in `loadCatalogForTerm` sets `currentProgram` directly.
	const handleChangeProgram = (program: string | null) => {
		currentProgram = program;
		if (!currentTerm) return;
		try {
			if (program) {
				localStorage.setItem(getTermKey(currentTerm, 'selectedProgram'), program);
			} else {
				localStorage.removeItem(getTermKey(currentTerm, 'selectedProgram'));
			}
		} catch (err) {
			devWarn('Failed to persist program', err);
		}
	};

	// Load the slim catalog for a term's academic year and restore that term's
	// persisted program filter (cleared if it no longer exists in the catalog —
	// e.g. after switching to a year with different/absent programs).
	const loadCatalogForTerm = async (term: string) => {
		let loaded: CatalogData;
		try {
			loaded = await loadCatalog(term);
		} catch (err) {
			devWarn('Failed to load catalog', err);
			loaded = emptyCatalog;
		}

		// A newer term switch may have started while this load was in flight; ignore
		// the stale result so a slow fetch can't apply another year's catalog/programs.
		if (term !== currentTerm) return;
		catalog = loaded;

		let restored: string | null = null;
		try {
			const stored = localStorage.getItem(getTermKey(term, 'selectedProgram'));
			if (stored && catalog.programs.some((program) => program.id === stored)) {
				restored = stored;
			}
		} catch (err) {
			devWarn('Failed to restore program', err);
		}
		currentProgram = restored;
	};

	// Switch to `term`: reset per-term state, restore its last generated schedule,
	// and load its catalog. CourseSelector is keyed on the term, so it remounts and
	// restores its own per-term state after this runs.
	const switchTerm = (term: string) => {
		currentTerm = term;
		scheduleData = null;
		selectedCourses = [];
		hasGenerated = false;
		blockedHours = [];
		activeScheduleIndex = 0;
		currentProgram = null;
		catalog = emptyCatalog;
		void loadCatalogForTerm(term);

		// Restore last generated schedule with validation
		const result = parseStoredJson(getLastGeneratedKey(term), validateLastGenerated);

		if (result.success && result.data) {
			const saved = result.data;
			if (Array.isArray(saved.selectedCourses)) {
				selectedCourses = saved.selectedCourses;
			}
			if (saved.scheduleData?.schedules) {
				scheduleData = saved.scheduleData;
				hasGenerated = true;
			}
			if (Array.isArray(saved.blockedHours)) {
				blockedHours = saved.blockedHours;
			}
			if (typeof saved.activeScheduleIndex === 'number') {
				activeScheduleIndex = saved.activeScheduleIndex;
			}
		}
	};

	const handleSchedule = (data: ScheduleData, courses: string[]) => {
		scheduleData = data;
		hasGenerated = true;
		activeScheduleIndex = 0;

		const termKey = currentTerm || 'none';

		const payload = {
			term: termKey,
			selectedCourses: courses,
			scheduleData: data,
			blockedHours,
			activeScheduleIndex,
			savedAt: Date.now()
		};

		// Try to persist all generated schedules so they remain after refresh.
		if (!storeJson(getLastGeneratedKey(termKey), payload)) {
			// Fallback: save only the active schedule if full save fails (e.g. quota exceeded)
			const activeSchedule = data.schedules?.[0];
			const persistedScheduleData: ScheduleData = {
				...data,
				schedules: activeSchedule ? [activeSchedule] : []
			};
			const fallbackPayload = {
				...payload,
				scheduleData: persistedScheduleData
			};
			storeJson(getLastGeneratedKey(termKey), fallbackPayload);
		}
	};

	const handleLoadSavedSchedule = (saved: SavedSchedule) => {
		if (saved.term !== currentTerm) {
			switchTerm(saved.term);
		}
		scheduleData = saved.scheduleData;
		selectedCourses = saved.selectedCourses;
		blockedHours = Array.isArray(saved.blockedHours) ? saved.blockedHours : [];
		hasGenerated = Boolean(saved.scheduleData?.schedules?.length);
		activeScheduleIndex = saved.activeScheduleIndex ?? 0;
	};

	const handleWelcomeClose = () => {
		showWelcomeModal = false;
		if (dontShowWelcomeAgain) {
			dismissWelcomeModal();
		}
	};
</script>

<svelte:head>
	<title>{documentTitle}</title>
</svelte:head>

<div class="mx-auto max-w-[1200px] px-4 py-6 max-[720px]:px-2 max-[720px]:py-4">
	<section class="rounded-lg bg-surface p-6 shadow-md max-[720px]:p-4">
		<AppHeader
			{terms}
			{currentTerm}
			{termsLoading}
			{termsError}
			programs={catalog.programs}
			{currentProgram}
			onChangeTerm={handleChangeTerm}
			onChangeProgram={handleChangeProgram}
			onOpenWelcome={() => (showWelcomeModal = true)}
		/>

		<div class="my-6 h-px bg-border max-[720px]:my-4"></div>

		<main class="flex flex-col gap-6">
			{#key currentTerm}
				<CourseSelector
					term={currentTerm}
					{catalog}
					selectedProgram={currentProgram}
					bind:selectedCourses
					bind:blockedHours
					{scheduleData}
					{hasGenerated}
					bind:activeScheduleIndex
					onSchedule={handleSchedule}
					onLoadSavedSchedule={handleLoadSavedSchedule}
				/>
			{/key}
		</main>
	</section>
</div>

<!-- Lazy-loaded: the welcome modal isn't needed for first paint (and never loads
     for returning visitors who dismissed it), keeping it out of the entry bundle. -->
{#if showWelcomeModal}
	{#await import('#lib/components/WelcomeModal.svelte') then { default: WelcomeModal }}
		<WelcomeModal
			open={showWelcomeModal}
			dontShowAgain={dontShowWelcomeAgain}
			onDontShowAgainChange={(value) => (dontShowWelcomeAgain = value)}
			onClose={handleWelcomeClose}
		/>
	{/await}
{/if}
