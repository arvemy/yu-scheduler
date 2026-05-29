<script lang="ts">
	import { Button, Dialog } from 'bits-ui';
	import { watch } from '$lib/utils/reactivity.svelte';
	import { t } from '$lib/i18n';
	import type { SavedSchedule } from '$lib/types';
	import {
		clearAllSavedSchedules,
		deleteSavedSchedule,
		getSavedSchedules,
		getStorageUsage,
		renameSavedSchedule
	} from '$lib/storage/savedSchedules';
	import { translateTerm } from '$lib/utils/term';

	let {
		open = false,
		onClose,
		onLoadSchedule,
		currentTerm
	}: {
		open: boolean;
		onClose: () => void;
		onLoadSchedule: (schedule: SavedSchedule) => void;
		currentTerm?: string | null;
	} = $props();

	let schedules = $state<SavedSchedule[]>([]);
	let loading = $state(false);
	let error = $state('');
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let storageUsage = $state(0);

	const resolveError = (err: unknown, fallbackKey: string) => {
		if (err instanceof Error) {
			const key = err.message;
			if (key.startsWith('errors.') || key.startsWith('savedSchedules.')) return $t(key);
		}
		return $t(fallbackKey);
	};

	const refresh = () => {
		loading = true;
		error = '';
		try {
			schedules = getSavedSchedules();
			storageUsage = getStorageUsage();
		} catch (err) {
			error = resolveError(err, 'savedSchedules.loadFailed');
		} finally {
			loading = false;
		}
	};

	watch(
		() => open,
		(value) => {
			if (!value) return;
			refresh();
			editingId = null;
			editName = '';
		}
	);

	const formatBytes = (size: number) => {
		if (size < 1024) return `${size} B`;
		if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
		return `${(size / (1024 * 1024)).toFixed(1)} MB`;
	};

	const startRename = (schedule: SavedSchedule) => {
		editingId = schedule.id;
		editName = schedule.name;
	};

	const submitRename = (schedule: SavedSchedule) => {
		try {
			renameSavedSchedule(schedule.id, editName);
			refresh();
			editingId = null;
			editName = '';
		} catch (err) {
			error = resolveError(err, 'savedSchedules.renameFailed');
		}
	};

	const removeSchedule = (schedule: SavedSchedule) => {
		try {
			deleteSavedSchedule(schedule.id);
			refresh();
		} catch (err) {
			error = resolveError(err, 'savedSchedules.deleteFailed');
		}
	};

	const clearAll = () => {
		if (!window.confirm($t('savedSchedules.clearAllConfirm'))) return;
		try {
			clearAllSavedSchedules();
			refresh();
		} catch (err) {
			error = resolveError(err, 'savedSchedules.clearFailed');
		}
	};

	const currentTermSchedules = $derived(
		currentTerm ? schedules.filter((schedule) => schedule.term === currentTerm) : schedules
	);
	const hiddenCount = $derived(
		currentTerm ? schedules.filter((schedule) => schedule.term !== currentTerm).length : 0
	);
</script>

<Dialog.Root open={open} onOpenChange={(value) => (!value ? onClose?.() : null)}>
	<Dialog.Portal>
		<Dialog.Overlay class="overlay" />
		<Dialog.Content class="dialog wide">
			<div class="dialog-header">
				<Dialog.Title class="dialog-title">
					<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
						<path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
					</svg>
					{$t('savedSchedules.savedSchedules')}
				</Dialog.Title>
				<Dialog.Close class="close-btn" aria-label={$t('common.close')}>
					<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
						<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
					</svg>
				</Dialog.Close>
			</div>

			{#if currentTerm}
				<p class="filter-info">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
						<path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
					</svg>
					{$t('savedSchedules.showingCurrentTerm', {
						count: currentTermSchedules.length,
						term: translateTerm(currentTerm, $t),
						hidden: hiddenCount
					})}
				</p>
			{/if}

			{#if error}
				<div class="alert error">
					<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
					</svg>
					<span>{error}</span>
				</div>
			{/if}

			{#if loading}
				<div class="loading-state">
					<div class="skeleton"></div>
					<div class="skeleton"></div>
				</div>
			{:else if currentTermSchedules.length === 0}
				<div class="empty-state">
					<svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
						<path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-1 8h-3v3h-2v-3h-3v-2h3V9h2v3h3v2z"/>
					</svg>
					<h4>{$t('savedSchedules.noSavedSchedules')}</h4>
					<p>{$t('savedSchedules.noSavedSchedulesDesc')}</p>
				</div>
			{:else}
				<div class="schedule-list">
					{#each currentTermSchedules as schedule (schedule.id)}
						<div class="schedule-card">
							<div class="schedule-info">
								{#if editingId === schedule.id}
									<input
										type="text"
										class="rename-input"
										bind:value={editName}
										onkeydown={(e) => e.key === 'Enter' && submitRename(schedule)}
									/>
								{:else}
									<h4 class="schedule-name">{schedule.name}</h4>
								{/if}
								<div class="schedule-meta">
									<span class="meta-item">
										<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
											<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
										</svg>
										{translateTerm(schedule.term, $t)}
									</span>
									<span class="meta-item">
										<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
											<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
										</svg>
										{new Date(schedule.savedAt).toLocaleDateString($t('locale.code'))}
									</span>
								</div>
							</div>
							<div class="schedule-actions">
								{#if editingId === schedule.id}
									<Button.Root class="btn btn-primary btn-sm" onclick={() => submitRename(schedule)}>
										<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
											<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
										</svg>
										{$t('common.save')}
									</Button.Root>
									<Button.Root class="btn btn-ghost btn-sm" onclick={() => (editingId = null)}>
										{$t('common.cancel')}
									</Button.Root>
								{:else}
									<Button.Root class="btn btn-primary btn-sm" onclick={() => onLoadSchedule?.(schedule)}>
										<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
											<path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
										</svg>
										{$t('savedSchedules.loadSchedule')}
									</Button.Root>
									<Button.Root class="btn btn-ghost btn-sm" onclick={() => startRename(schedule)}>
										<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
											<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
										</svg>
									</Button.Root>
									<Button.Root class="btn btn-ghost btn-sm" onclick={() => removeSchedule(schedule)}>
										<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
											<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
										</svg>
									</Button.Root>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<div class="dialog-footer">
				<div class="storage-info">
					<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
						<path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z"/>
					</svg>
					<span>{$t('savedSchedules.storageUsage')}: {formatBytes(storageUsage)}</span>
				</div>
				{#if schedules.length > 0}
					<Button.Root class="btn btn-ghost" onclick={clearAll}>
						<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
							<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
						</svg>
						{$t('savedSchedules.clearAll')}
					</Button.Root>
				{/if}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.overlay) {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		animation: fadeIn 0.2s ease;
		z-index: var(--z-overlay);
	}

	:global(.dialog) {
		position: fixed;
		inset: 50% auto auto 50%;
		transform: translate(-50%, -50%);
		width: min(480px, calc(100vw - var(--space-xl)));
		max-height: calc(100vh - var(--modal-vertical-offset));
		max-height: calc(100dvh - var(--modal-vertical-offset));
		overflow-y: auto;
		background: var(--surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		animation: slideIn 0.3s ease;
		z-index: var(--z-dialog);
	}

	:global(.dialog.wide) {
		width: min(640px, calc(100vw - 32px));
	}

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-md);
	}

	:global(.dialog-title) {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		color: var(--ink);
	}

	:global(.dialog-title) svg {
		color: var(--primary);
	}

	:global(.close-btn) {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-xs);
		border: none;
		background: transparent;
		color: var(--ink-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: var(--transition-fast);
	}

	:global(.close-btn:hover) {
		background: var(--bg);
		color: var(--ink);
	}

	.filter-info {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin: 0;
		padding: var(--space-sm) var(--space-md);
		background: rgba(25, 118, 210, 0.08);
		border-radius: var(--radius-sm);
		font-size: 13px;
		color: var(--ink-muted);
	}

	.filter-info svg {
		color: var(--primary);
	}

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

	.loading-state {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.skeleton {
		height: 80px;
		background: linear-gradient(90deg, var(--bg) 25%, var(--border-light) 50%, var(--bg) 75%);
		background-size: 200% 100%;
		border-radius: var(--radius-md);
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--space-xl);
		background: var(--bg);
		border-radius: var(--radius-md);
		border: 2px dashed var(--border);
	}

	.empty-state svg {
		color: var(--ink-muted);
		opacity: 0.5;
		margin-bottom: var(--space-sm);
	}

	.empty-state h4 {
		margin: 0 0 var(--space-xs);
		font-size: 1rem;
		font-weight: 700;
		color: var(--ink);
	}

	.empty-state p {
		margin: 0;
		font-size: 14px;
		color: var(--ink-muted);
	}

	.schedule-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		max-height: 400px;
		overflow-y: auto;
	}

	.schedule-card {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md);
		background: var(--bg);
		border-radius: var(--radius-md);
		transition: var(--transition-fast);
	}

	.schedule-card:hover {
		box-shadow: var(--shadow-sm);
	}

	.schedule-info {
		flex: 1;
		min-width: 200px;
	}

	.schedule-name {
		margin: 0 0 var(--space-xs);
		font-size: 15px;
		font-weight: 600;
		color: var(--ink);
	}

	.rename-input {
		width: 100%;
		padding: var(--space-sm);
		border: 1px solid var(--primary);
		border-radius: var(--radius-sm);
		font-size: 14px;
		margin-bottom: var(--space-xs);
	}

	.rename-input:focus {
		outline: none;
		box-shadow: var(--shadow-focus);
	}

	.schedule-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: 12px;
		color: var(--ink-muted);
	}

	.schedule-actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		align-items: center;
	}

	:global(.btn-sm) {
		padding: 6px 12px;
		font-size: 13px;
	}

	.dialog-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-md);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--border-light);
	}

	.storage-info {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: 13px;
		color: var(--ink-muted);
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}
</style>
