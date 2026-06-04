<script lang="ts">
	import { Button, Dialog, Tooltip } from 'bits-ui';
	import {
		Calendar,
		Check,
		CircleAlert,
		Clock,
		FolderOpen,
		FolderPlus,
		HardDrive,
		ListFilter,
		Pencil,
		Trash2,
		X
	} from '@lucide/svelte';
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
	import TooltipContent from '$lib/components/ui/TooltipContent.svelte';

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

<Tooltip.Provider delayDuration={350} skipDelayDuration={100} ignoreNonKeyboardFocus>
	<Dialog.Root {open} onOpenChange={(value) => (!value ? onClose?.() : null)}>
		<Dialog.Portal>
			<Dialog.Overlay class="overlay" />
			<Dialog.Content class="dialog wide">
				<div class="dialog-header">
					<Dialog.Title class="dialog-title">
						<FolderOpen class="text-primary" size={24} />
						{$t('savedSchedules.savedSchedules')}
					</Dialog.Title>
					<Tooltip.Root>
						<Dialog.Close>
							{#snippet child({ props })}
								<Tooltip.Trigger {...props} class="close-btn" aria-label={$t('common.close')}>
									<X size={24} />
								</Tooltip.Trigger>
							{/snippet}
						</Dialog.Close>
						<TooltipContent label={$t('common.close')} />
					</Tooltip.Root>
				</div>

				{#if currentTerm}
					<p class="filter-info">
						<ListFilter class="text-primary" size={16} />
						{$t('savedSchedules.showingCurrentTerm', {
							count: currentTermSchedules.length,
							term: translateTerm(currentTerm, $t),
							hidden: hiddenCount
						})}
					</p>
				{/if}

				{#if error}
					<div class="alert error">
						<CircleAlert size={20} />
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
						<FolderPlus class="mb-2 text-ink-muted opacity-50" size={48} />
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
											<Calendar size={14} />
											{translateTerm(schedule.term, $t)}
										</span>
										<span class="meta-item">
											<Clock size={14} />
											{new Date(schedule.savedAt).toLocaleDateString($t('locale.code'))}
										</span>
									</div>
								</div>
								<div class="schedule-actions">
									{#if editingId === schedule.id}
										<Button.Root
											class="btn btn-primary btn-sm"
											onclick={() => submitRename(schedule)}
										>
											<Check size={16} />
											{$t('common.save')}
										</Button.Root>
										<Button.Root class="btn btn-ghost btn-sm" onclick={() => (editingId = null)}>
											{$t('common.cancel')}
										</Button.Root>
									{:else}
										<Button.Root
											class="btn btn-primary btn-sm"
											onclick={() => onLoadSchedule?.(schedule)}
										>
											<FolderOpen size={16} />
											{$t('savedSchedules.loadSchedule')}
										</Button.Root>
										<Tooltip.Root>
											<Tooltip.Trigger
												class="btn btn-ghost btn-sm"
												onclick={() => startRename(schedule)}
												aria-label={`${$t('savedSchedules.renameSchedule')} ${schedule.name}`}
											>
												<Pencil size={16} />
											</Tooltip.Trigger>
											<TooltipContent
												label={`${$t('savedSchedules.renameSchedule')} ${schedule.name}`}
											/>
										</Tooltip.Root>
										<Tooltip.Root>
											<Tooltip.Trigger
												class="btn btn-ghost btn-sm"
												onclick={() => removeSchedule(schedule)}
												aria-label={`${$t('savedSchedules.deleteSchedule')} ${schedule.name}`}
											>
												<Trash2 size={16} />
											</Tooltip.Trigger>
											<TooltipContent
												label={`${$t('savedSchedules.deleteSchedule')} ${schedule.name}`}
											/>
										</Tooltip.Root>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<div class="dialog-footer">
					<div class="storage-info">
						<HardDrive size={16} />
						<span>{$t('savedSchedules.storageUsage')}: {formatBytes(storageUsage)}</span>
					</div>
					{#if schedules.length > 0}
						<Button.Root class="btn btn-ghost" onclick={clearAll}>
							<Trash2 size={18} />
							{$t('savedSchedules.clearAll')}
						</Button.Root>
					{/if}
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
</Tooltip.Provider>

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
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
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
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
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
