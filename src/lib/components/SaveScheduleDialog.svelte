<script lang="ts">
	import { Button, Dialog } from 'bits-ui';
	import { watch } from 'runed';
	import { t } from '$lib/i18n';
	import type { BlockedHour, ScheduleData } from '$lib/types';
	import { checkStorageAvailability, saveSchedule } from '$lib/storage/savedSchedules';
	import { translateTerm } from '$lib/utils/term';

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

<Dialog.Root open={open} onOpenChange={(value) => (!value ? onClose?.() : null)}>
	<Dialog.Portal>
		<Dialog.Overlay class="overlay" />
		<Dialog.Content class="dialog">
			<div class="dialog-header">
				<Dialog.Title class="dialog-title">
					<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
						<path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
					</svg>
					{$t('savedSchedules.saveSchedule')}
				</Dialog.Title>
				<Dialog.Close class="close-btn" aria-label={$t('common.close')}>
					<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
						<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
					</svg>
				</Dialog.Close>
			</div>

			{#if storageError}
				<div class="alert error">
					<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
					</svg>
					<span>{$t('savedSchedules.storageError')}: {storageError}</span>
				</div>
			{/if}

			<label class="field">
				<span class="field-label">{$t('savedSchedules.scheduleName')}</span>
				<input type="text" bind:value={name} placeholder={$t('savedSchedules.scheduleName')} />
			</label>

			<div class="details-card">
				<h4>
					<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
					</svg>
					{$t('savedSchedules.scheduleDetails')}
				</h4>
				<div class="details-grid">
					<div class="detail-item">
						<span class="detail-label">{$t('savedSchedules.term')}</span>
						<span class="detail-value">{translateTerm(term, $t)}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">{$t('savedSchedules.courses')}</span>
						<span class="detail-value">{selectedCourses.length} {$t('savedSchedules.coursesSelected')}</span>
					</div>
					<div class="detail-item">
						<span class="detail-label">{$t('courseSelector.schedule')}</span>
						<span class="detail-value">#{activeScheduleIndex + 1}</span>
					</div>
				</div>
			</div>

			{#if error}
				<div class="alert error">
					<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
					</svg>
					<span>{error}</span>
				</div>
			{/if}

			<div class="dialog-actions">
				<Button.Root class="btn btn-ghost" onclick={onClose}>{$t('common.cancel')}</Button.Root>
				<Button.Root class="btn btn-primary" disabled={saving} onclick={handleSave}>
					<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
						<path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
					</svg>
					{saving ? $t('savedSchedules.saving') : $t('savedSchedules.save')}
				</Button.Root>
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

	.details-card h4 svg {
		color: var(--primary);
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
