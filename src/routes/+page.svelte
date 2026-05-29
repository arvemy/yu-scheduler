<script lang="ts">
	import AppHeader from '$lib/components/AppHeader.svelte';
	import CourseSelector from '$lib/components/CourseSelector.svelte';
	import WelcomeModal from '$lib/components/WelcomeModal.svelte';
	import { t } from '$lib/i18n';
	import { listTerms } from '$lib';
	import type { BlockedHour, ScheduleData, SavedSchedule } from '$lib/types';
	import { dismissWelcomeModal, shouldShowWelcomeModal } from '$lib/storage/welcome';
	import { getLatestTerm } from '$lib/utils/term';
	import { devWarn } from '$lib/utils/logger';
	import { parseStoredJson, storeJson, validateLastGenerated } from '$lib/utils/storage';
	import { getLastGeneratedKey } from '$lib/storage/keys';
	import { watch } from '$lib/utils/reactivity.svelte';
	import { onMount } from 'svelte';

	let terms = $state<string[]>([]);
	let currentTerm = $state<string | null>(null);
	let termsLoading = $state(true);
	let termsError = $state(false);

	let scheduleData = $state<ScheduleData | null>(null);
	let selectedCourses = $state<string[]>([]);
	let blockedHours = $state<BlockedHour[]>([]);
	let hasGenerated = $state(false);
	let activeScheduleIndex = $state(0);

	let showWelcomeModal = $state(false);
	let dontShowWelcomeAgain = $state(false);

	const documentTitle = $derived(`${$t('app.title')} - ${$t('app.subtitle')}`);
	const documentLang = $derived($t('locale.code'));

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.title = documentTitle;
		document.documentElement.lang = documentLang;
	});

	const loadTerms = async () => {
		termsLoading = true;
		termsError = false;
		try {
			const data = await listTerms();
			terms = data;
			if (data.length > 0) {
				const latest = getLatestTerm(data) ?? data[0];
				currentTerm = latest;
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
		currentTerm = term;
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
			currentTerm = saved.term;
		}
		scheduleData = saved.scheduleData;
		selectedCourses = saved.selectedCourses;
		blockedHours = Array.isArray(saved.blockedHours) ? saved.blockedHours : [];
		hasGenerated = Boolean(saved.scheduleData?.schedules?.length);
		activeScheduleIndex = saved.activeScheduleIndex ?? 0;
	};

	watch(
		() => currentTerm,
		(term) => {
			if (!term) return;

			scheduleData = null;
			selectedCourses = [];
			hasGenerated = false;
			blockedHours = [];
			activeScheduleIndex = 0;

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
		}
	);

	const handleWelcomeClose = () => {
		showWelcomeModal = false;
		if (dontShowWelcomeAgain) {
			dismissWelcomeModal();
		}
	};
</script>

<div class="mx-auto max-w-[1200px] px-4 py-6 max-[720px]:px-2 max-[720px]:py-4">
	<section class="rounded-lg bg-surface p-6 shadow-md max-[720px]:p-4">
		<AppHeader
			{terms}
			{currentTerm}
			{termsLoading}
			{termsError}
			onChangeTerm={handleChangeTerm}
			onOpenWelcome={() => (showWelcomeModal = true)}
		/>

		<div class="my-6 h-px bg-border max-[720px]:my-4"></div>

		<main class="flex flex-col gap-6">
			<CourseSelector
				term={currentTerm}
				bind:selectedCourses
				bind:blockedHours
				{scheduleData}
				{hasGenerated}
				bind:activeScheduleIndex
				onSchedule={handleSchedule}
				onLoadSavedSchedule={handleLoadSavedSchedule}
			/>
		</main>
	</section>
</div>

<WelcomeModal
	open={showWelcomeModal}
	dontShowAgain={dontShowWelcomeAgain}
	onDontShowAgainChange={(value) => (dontShowWelcomeAgain = value)}
	onClose={handleWelcomeClose}
/>
