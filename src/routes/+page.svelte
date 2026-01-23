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
	import { getTermKey, getLastGeneratedKey } from '$lib/storage/keys';
	import { watch } from 'runed';
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

	const handleClearAll = () => {
		scheduleData = null;
		selectedCourses = [];
		blockedHours = [];
		hasGenerated = false;
		activeScheduleIndex = 0;

		if (currentTerm) {
			try {
				localStorage.removeItem(getTermKey(currentTerm, 'selectedCourses'));
				localStorage.removeItem(getTermKey(currentTerm, 'courseOptionGroups'));
				localStorage.removeItem(getTermKey(currentTerm, 'blockedHours'));
				localStorage.removeItem(getTermKey(currentTerm, 'sectionChoices'));
				localStorage.removeItem(getLastGeneratedKey(currentTerm));
				localStorage.removeItem(getTermKey(currentTerm, 'activeTab'));
			} catch (err) {
				devWarn('Failed to clear localStorage', err);
			}
		}
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

<div class="app-shell">
	<section class="main-paper surface">
		<AppHeader
			terms={terms}
			currentTerm={currentTerm}
			termsLoading={termsLoading}
			termsError={termsError}
			onChangeTerm={handleChangeTerm}
			onOpenWelcome={() => (showWelcomeModal = true)}
		/>
		
		<div class="divider"></div>

		<main>
			<CourseSelector
				term={currentTerm}
				bind:selectedCourses
				bind:blockedHours
				scheduleData={scheduleData}
				hasGenerated={hasGenerated}
				bind:activeScheduleIndex
				onSchedule={handleSchedule}
				onLoadSavedSchedule={handleLoadSavedSchedule}
				onClearAll={handleClearAll}
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

<style>
	.main-paper {
		padding: var(--space-lg);
	}

	.divider {
		height: 1px;
		background: var(--border);
		margin: var(--space-lg) 0;
	}

	main {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	@media (max-width: 720px) {
		.main-paper {
			padding: var(--space-md);
		}

		.divider {
			margin: var(--space-md) 0;
		}
	}
</style>
