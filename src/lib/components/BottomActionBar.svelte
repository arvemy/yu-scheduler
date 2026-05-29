<script lang="ts">
	import { t } from '$lib/i18n';
	import { fade, fly } from 'svelte/transition';
	import { Download, FolderOpen, LoaderCircle, Save, Sparkles } from '@lucide/svelte';

	let {
		visible,
		generating,
		canDownload,
		canGenerate = false,
		downloading = false,
		canSave = false,
		onGenerate,
		onDownload,
		onSave,
		onLoad
	}: {
		visible: boolean;
		generating: boolean;
		canDownload: boolean;
		canGenerate?: boolean;
		downloading?: boolean;
		canSave?: boolean;
		onGenerate?: () => void;
		onDownload: () => void;
		onSave?: () => void;
		onLoad?: () => void;
	} = $props();
</script>

{#if visible}
	<div
		class="bottom-action-bar"
		role="toolbar"
		aria-label={$t('courseSelector.actions')}
		transition:fade={{ duration: 200 }}
	>
		<div class="action-buttons" in:fly={{ y: 20, duration: 300, delay: 50 }}>
			<!-- Generating indicator (shown when generating and no generate button) -->
			{#if generating && !onGenerate}
				<div class="generating-indicator">
					<LoaderCircle class="animate-spin text-primary" size={16} />
				</div>
			{/if}

			<!-- Generate Button (only if onGenerate is provided) -->
			{#if onGenerate}
				<button
					class="fab-btn primary"
					onclick={onGenerate}
					disabled={!canGenerate || generating}
					aria-label={generating
						? $t('courseSelector.generatingSchedule')
						: $t('courseSelector.generateSchedule')}
				>
					<Sparkles class="shrink-0" size={16} />
					<span
						>{generating
							? $t('courseSelector.generatingShort')
							: $t('courseSelector.generateShort')}</span
					>
				</button>
			{/if}

			<!-- Download Button -->
			<button
				class="fab-btn outlined"
				onclick={onDownload}
				disabled={!canDownload || downloading}
				aria-label={downloading
					? $t('courseSelector.downloadingImage')
					: $t('courseSelector.download')}
				title={downloading
					? $t('courseSelector.downloadingImage')
					: $t('courseSelector.downloadImage')}
			>
				{#if downloading}
					<LoaderCircle class="animate-spin" size={16} />
				{:else}
					<Download class="shrink-0" size={16} />
				{/if}
			</button>

			<!-- Save Button -->
			{#if onSave}
				<button
					class="fab-btn outlined secondary"
					onclick={onSave}
					disabled={!canSave}
					aria-label={$t('savedSchedules.saveSchedule')}
					title={canSave
						? $t('savedSchedules.saveSchedule')
						: $t('courseSelector.generateScheduleFirst')}
				>
					<Save class="shrink-0" size={16} />
				</button>
			{/if}

			<!-- Load Button -->
			{#if onLoad}
				<button
					class="fab-btn outlined info"
					onclick={onLoad}
					aria-label={$t('savedSchedules.loadSchedule')}
					title={$t('savedSchedules.loadSchedule')}
				>
					<FolderOpen class="shrink-0" size={16} />
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.bottom-action-bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(var(--bottom-action-bar-offset) + var(--safe-area-bottom));
		z-index: var(--z-float);
		display: none;
		pointer-events: none;
		justify-content: center;
	}

	/* Only show on mobile */
	@media (max-width: 768px) {
		.bottom-action-bar {
			display: flex;
		}
	}

	.action-buttons {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 8px;
		pointer-events: auto;
		background: transparent;
	}

	.generating-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 8px 10px;
		background: rgba(255, 255, 255, 0.9);
		border-radius: 999px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		backdrop-filter: blur(6px);
	}

	.fab-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		border: none;
		border-radius: 999px;
		font-weight: 700;
		font-size: 11px;
		letter-spacing: 0.3px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		backdrop-filter: blur(6px);
	}

	.fab-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.fab-btn.primary {
		background: var(--primary);
		color: white;
		padding: 8px 14px;
	}

	.fab-btn.primary:hover:not(:disabled) {
		background: var(--primary-dark);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
	}

	.fab-btn.outlined {
		background: rgba(255, 255, 255, 0.9);
		color: var(--primary);
		border: 1px solid var(--primary);
		padding: 8px 10px;
		min-width: auto;
	}

	.fab-btn.outlined:hover:not(:disabled) {
		background: var(--primary);
		color: white;
		transform: translateY(-1px);
	}

	.fab-btn.outlined.secondary {
		color: var(--secondary);
		border-color: var(--secondary);
	}

	.fab-btn.outlined.secondary:hover:not(:disabled) {
		background: var(--secondary);
		color: white;
	}

	.fab-btn.outlined.info {
		color: var(--info);
		border-color: var(--info);
	}

	.fab-btn.outlined.info:hover:not(:disabled) {
		background: var(--info);
		color: white;
	}
</style>
