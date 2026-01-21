<script lang="ts">
	import { Button, Tabs } from 'bits-ui';
	import { watch } from 'runed';
	import { t } from '$lib/i18n';
	import type { BlockedHour, ScheduleData } from '$lib/types';
	import { translateWarnings } from '$lib/utils/warnings';
	import Timetable from '$lib/components/Timetable.svelte';

	let {
		scheduleData,
		hasGenerated,
		activeScheduleIndex = 0,
		onIndexChange,
		blockedHours,
		onBlockedHoursChange
	}: {
		scheduleData: ScheduleData | null;
		hasGenerated: boolean;
		activeScheduleIndex: number;
		onIndexChange: (index: number) => void;
		blockedHours: BlockedHour[];
		onBlockedHoursChange: (hours: BlockedHour[]) => void;
	} = $props();

	let showWarnings = $state(false);

	const warningList = $derived(
		scheduleData
			? translateWarnings(scheduleData.warnings || [], scheduleData.warning_codes || [], $t)
			: []
	);

	const schedules = $derived(scheduleData?.schedules ?? []);
	const timeSlots = $derived(scheduleData?.time_slots ?? []);
	const daysOfWeek = $derived(scheduleData?.days_of_week ?? []);

	watch(
		() => schedules.length,
		(length) => {
			if (!length) showWarnings = false;
		}
	);

	const handleTabChange = (value: string) => {
		const index = Number(value);
		if (!Number.isNaN(index)) {
			onIndexChange?.(index);
		}
	};
</script>

<section class="results">
	<div class="results-header">
		<div class="title-row">
			<h2 class="results-title">
				<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
					<path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
				</svg>
				{$t('courseSelector.schedule')}
			</h2>
			{#if schedules.length > 0}
				<span class="count-badge success">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
						<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
					</svg>
					{$t('courseSelector.schedulesFound', { count: schedules.length })}
				</span>
			{/if}
		</div>
	</div>

	{#if !hasGenerated}
		<div class="placeholder-card">
			<svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
				<path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
			</svg>
			<h3>{$t('courseSelector.generateSchedule')}</h3>
			<p>{$t('courseSelector.selectCoursesHint') || 'Select your courses and click generate to see available schedules'}</p>
		</div>
	{:else if schedules.length === 0}
		<div class="empty-card">
			<svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
				<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
			</svg>
			<h3>{$t('courseSelector.noSchedulesTitle')}</h3>
			<p>{$t('courseSelector.noSchedulesDesc')}</p>
		</div>
	{:else}
		<div class="results-body">
			<Tabs.Root value={String(activeScheduleIndex)} onValueChange={handleTabChange} class="schedule-tabs">
				<div class="tabs-container">
					<Tabs.List class="tabs-list">
						{#each schedules as _, index (index)}
							<Tabs.Trigger class="tab-trigger" value={String(index)}>
								{$t('courseSelector.schedule')} {index + 1}
							</Tabs.Trigger>
						{/each}
					</Tabs.List>
				</div>

				{#each schedules as schedule, index (index)}
					<Tabs.Content value={String(index)} class="tab-content">
						<Timetable
							schedule={schedule}
							timeSlots={timeSlots}
							daysOfWeek={daysOfWeek}
							blockedHours={blockedHours}
							onBlockedHoursChange={onBlockedHoursChange}
						/>
					</Tabs.Content>
				{/each}
			</Tabs.Root>

			{#if warningList.length > 0}
				<div class="warning-panel">
					<div class="warning-header">
						<div class="warning-title">
							<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
								<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
							</svg>
							<span>{warningList.length} {$t('courseSelector.warnings')}</span>
						</div>
						<Button.Root class="btn btn-ghost" onclick={() => (showWarnings = !showWarnings)}>
							{showWarnings ? $t('courseSelector.hideWarnings') : $t('courseSelector.showWarnings')}
							<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="transform: rotate({showWarnings ? 180 : 0}deg); transition: transform 0.2s">
								<path d="M7 10l5 5 5-5z"/>
							</svg>
						</Button.Root>
					</div>
					{#if showWarnings}
						<ul class="warning-list">
							{#each warningList as warning, i (`${warning}|${i}`)}
								<li>{warning}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	.results {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.results-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.title-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
		align-items: center;
		justify-content: space-between;
	}

	.results-title {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		color: var(--ink);
	}

	.results-title svg {
		color: var(--primary);
	}

	.count-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: 6px 12px;
		border-radius: var(--radius-full);
		font-size: 13px;
		font-weight: 600;
	}

	.count-badge.success {
		background: var(--success-bg);
		color: var(--success-dark);
	}

	.placeholder-card,
	.empty-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--space-xl);
		border-radius: var(--radius-md);
		min-height: 240px;
	}

	.placeholder-card {
		background: var(--bg);
		border: 2px dashed var(--border);
	}

	.placeholder-card svg {
		color: var(--primary);
		opacity: 0.6;
		margin-bottom: var(--space-md);
	}

	.empty-card {
		background: var(--warning-bg);
		border: 1px solid rgba(255, 152, 0, 0.3);
	}

	.empty-card svg {
		color: var(--warning);
		margin-bottom: var(--space-md);
	}

	.placeholder-card h3,
	.empty-card h3 {
		margin: 0 0 var(--space-xs);
		font-size: 1rem;
		font-weight: 700;
		color: var(--ink);
	}

	.placeholder-card p,
	.empty-card p {
		margin: 0;
		color: var(--ink-muted);
		font-size: 14px;
		max-width: 320px;
	}

	.results-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	:global(.schedule-tabs) {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.tabs-container {
		background: rgba(255, 255, 255, 0.7);
		border-radius: var(--radius-lg);
		padding: 4px;
		box-shadow: var(--shadow-sm);
		overflow-x: auto;
	}

	:global(.tabs-list) {
		display: flex;
		gap: 4px;
		min-height: 44px;
	}

	:global(.tab-trigger) {
		flex: none;
		padding: 10px 20px;
		border-radius: var(--radius-md);
		border: none;
		background: transparent;
		cursor: pointer;
		font-weight: 600;
		font-size: 14px;
		color: var(--ink-secondary);
		transition: var(--transition-fast);
		white-space: nowrap;
	}

	:global(.tab-trigger:hover) {
		background: rgba(25, 118, 210, 0.08);
		color: var(--primary);
	}

	:global(.tab-trigger[data-state='active']) {
		background: var(--primary);
		color: white;
		box-shadow: var(--shadow-sm);
	}

	:global(.tab-content) {
		animation: fadeIn 0.3s ease;
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

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
