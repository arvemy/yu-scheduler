<script lang="ts">
	import { Button, Dialog, Tooltip } from 'bits-ui';
	import { CircleAlert, Info, Save, X } from '@lucide/svelte';
	import { watch } from '$lib/utils/reactivity.svelte';
	import { t } from '$lib/i18n';
	import type { BlockedHour, ScheduleData } from '$lib/types';
	import { checkStorageAvailability, saveSchedule } from '$lib/storage/savedSchedules';
	import { translateTerm } from '$lib/utils/term';
	import TooltipContent from '$lib/components/ui/TooltipContent.svelte';

	let {
		open = false,
		onClose,
		onSaved,
		term,
		selectedCourses,
		scheduleData,
		blockedHours,
		activeScheduleIndex = 0,
		orConnections = {}
	}: {
		open: boolean;
		onClose: () => void;
		onSaved: (saved: { id: string; name: string }) => void;
		term: string;
		selectedCourses: string[];
		scheduleData: ScheduleData;
		blockedHours: BlockedHour[];
		activeScheduleIndex: number;
		orConnections?: Record<string, boolean>;
	} = $props();

	let name = $state('');
	let error = $state('');
	let storageError = $state('');
	let saving = $state(false);

	watch(
		() => open,
		(value) => {
			if (!value) return;
			const locale = $t('locale.code');
			name = `${$t('savedSchedules.schedule')} ${new Date().toLocaleDateString(locale)}`;
			error = '';
			const storage = checkStorageAvailability();
			storageError = storage.available ? '' : $t(storage.error || 'errors.storageNotAvailable');
		}
	);

	const handleSave = () => {
		if (!name.trim()) {
			error = $t('savedSchedules.nameRequired');
			return;
		}
		saving = true;
		try {
			// Convert orConnections to courseOptionGroups format for storage
			const courseOptionGroups: string[][] = [];
			let currentGroup: string[] = [];

			for (let i = 0; i < selectedCourses.length; i++) {
				const course = selectedCourses[i];
				currentGroup.push(course);

				// If this course is NOT OR-connected to the next, close the group
				if (!orConnections[course] || i === selectedCourses.length - 1) {
					if (currentGroup.length >= 2) {
						courseOptionGroups.push([...currentGroup]);
					}
					currentGroup = [];
				}
			}

			const saved = saveSchedule(
				name,
				term,
				selectedCourses,
				scheduleData,
				blockedHours,
				activeScheduleIndex,
				courseOptionGroups
			);
			onSaved?.(saved);
			onClose?.();
		} catch (err) {
			error = err instanceof Error ? err.message : $t('savedSchedules.saveFailed');
		} finally {
			saving = false;
		}
	};
</script>

<Tooltip.Provider delayDuration={350} skipDelayDuration={100} ignoreNonKeyboardFocus>
	<Dialog.Root {open} onOpenChange={(value) => (!value ? onClose?.() : null)}>
		<Dialog.Portal>
			<Dialog.Overlay class="overlay" />
			<Dialog.Content class="dialog">
				<div class="dialog-header">
					<Dialog.Title class="dialog-title">
						<Save class="text-primary" size={24} />
						{$t('savedSchedules.saveSchedule')}
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

				{#if storageError}
					<div class="alert error">
						<CircleAlert size={20} />
						<span>{$t('savedSchedules.storageError')}: {storageError}</span>
					</div>
				{/if}

				<label class="field">
					<span class="field-label">{$t('savedSchedules.scheduleName')}</span>
					<input type="text" bind:value={name} placeholder={$t('savedSchedules.scheduleName')} />
				</label>

				<div class="details-card">
					<h4>
						<Info class="text-primary" size={18} />
						{$t('savedSchedules.scheduleDetails')}
					</h4>
					<div class="details-grid">
						<div class="detail-item">
							<span class="detail-label">{$t('savedSchedules.term')}</span>
							<span class="detail-value">{translateTerm(term, $t)}</span>
						</div>
						<div class="detail-item">
							<span class="detail-label">{$t('savedSchedules.courses')}</span>
							<span class="detail-value"
								>{selectedCourses.length} {$t('savedSchedules.coursesSelected')}</span
							>
						</div>
						<div class="detail-item">
							<span class="detail-label">{$t('courseSelector.schedule')}</span>
							<span class="detail-value">#{activeScheduleIndex + 1}</span>
						</div>
					</div>
				</div>

				{#if error}
					<div class="alert error">
						<CircleAlert size={20} />
						<span>{error}</span>
					</div>
				{/if}

				<div class="dialog-actions">
					<Button.Root class="btn btn-ghost" onclick={onClose}>{$t('common.cancel')}</Button.Root>
					<Button.Root class="btn btn-primary" disabled={saving} onclick={handleSave}>
						<Save size={18} />
						{saving ? $t('savedSchedules.saving') : $t('savedSchedules.save')}
					</Button.Root>
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

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.field-label {
		font-size: 14px;
		font-weight: 600;
		color: var(--ink);
	}

	.field input {
		padding: 12px 14px;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		font-size: 14px;
		transition: var(--transition);
	}

	.field input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: var(--shadow-focus);
	}

	.details-card {
		background: var(--bg);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	.details-card h4 {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin: 0 0 var(--space-sm);
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--ink-muted);
	}

	.details-grid {
		display: grid;
		gap: var(--space-sm);
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xs) 0;
	}

	.detail-label {
		font-size: 13px;
		color: var(--ink-muted);
	}

	.detail-value {
		font-size: 14px;
		font-weight: 600;
		color: var(--ink);
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
		padding-top: var(--space-sm);
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
