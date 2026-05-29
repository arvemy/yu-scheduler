<script lang="ts">
	import { Button, Checkbox, Dialog } from 'bits-ui';
	import {
		Check,
		ChevronRight,
		CircleCheck,
		GraduationCap,
		Info,
		Lightbulb,
		TriangleAlert,
		X
	} from '@lucide/svelte';
	import { t } from '$lib/i18n';

	let {
		open = false,
		onClose,
		dontShowAgain = false,
		onDontShowAgainChange
	}: {
		open: boolean;
		onClose: () => void;
		dontShowAgain: boolean;
		onDontShowAgainChange: (value: boolean) => void;
	} = $props();
</script>

<Dialog.Root {open} onOpenChange={(value) => (!value ? onClose?.() : null)}>
	<Dialog.Portal>
		<Dialog.Overlay class="overlay" />
		<Dialog.Content class="dialog">
			<div class="dialog-header">
				<Dialog.Title class="dialog-title">
					<GraduationCap class="size-7 text-primary max-[600px]:size-6" />
					{$t('welcome.title')}
				</Dialog.Title>
				<Dialog.Close class="close-btn" aria-label={$t('common.close')}>
					<X size={24} />
				</Dialog.Close>
			</div>

			<p class="lead">{$t('welcome.description')}</p>

			<div class="features-section">
				<h2 class="section-heading">
					<Lightbulb class="text-primary" size={20} />
					{$t('welcome.features')}
				</h2>
				<ul>
					<li>
						<Check class="shrink-0 text-success" size={16} />
						{$t('welcome.feature1')}
					</li>
					<li>
						<Check class="shrink-0 text-success" size={16} />
						{$t('welcome.feature2')}
					</li>
					<li>
						<Check class="shrink-0 text-success" size={16} />
						{$t('welcome.feature3')}
					</li>
					<li>
						<Check class="shrink-0 text-success" size={16} />
						{$t('welcome.feature4')}
					</li>
				</ul>
			</div>

			<!-- Latest Updates Section -->
			<div class="updates-section">
				<h2 class="section-heading">
					<Info class="text-primary" size={20} />
					{$t('welcome.updates.title')}
				</h2>
				<p class="updates-term">{$t('welcome.updates.term')}</p>
				<ul>
					<li>
						<CircleCheck class="shrink-0 text-success" size={14} />
						{$t('welcome.updates.items.springTermAdded')}
					</li>
				</ul>
				<p class="updates-date">{$t('welcome.updates.addedOn')}</p>
			</div>

			<div class="notice-panel">
				<div class="notice-icon">
					<TriangleAlert size={24} />
				</div>
				<div class="notice-content">
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted, developer-authored i18n string -->
					<p class="notice-text font-semibold">{@html $t('welcome.importantNotice')}</p>
					<p class="notice-text">{$t('welcome.disclaimer')}</p>
					<p class="notice-subtext">{$t('welcome.privacyNote')}</p>
				</div>
			</div>

			<label class="checkbox-label">
				<Checkbox.Root
					checked={dontShowAgain}
					onCheckedChange={onDontShowAgainChange}
					class="checkbox-root"
				>
					{#snippet children({ checked })}
						<span class="checkbox-box" class:checked>
							{#if checked}
								<Check size={16} />
							{/if}
						</span>
					{/snippet}
				</Checkbox.Root>
				<span>{$t('welcome.dontShowAgain')}</span>
			</label>

			<div class="modal-footer">
				<div class="creator-credit">
					Created by <span class="creator-name">Arda Korkmaz</span>
				</div>
				<div class="dialog-actions">
					<Button.Root class="btn btn-primary" onclick={onClose}>
						<ChevronRight size={18} />
						{$t('welcome.getStarted')}
					</Button.Root>
				</div>
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
		width: min(560px, calc(100vw - var(--space-xl)));
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
		font-size: 1.5rem;
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

	.lead {
		margin: 0;
		color: var(--ink-secondary);
		font-size: 15px;
		line-height: 1.6;
	}

	.features-section {
		background: var(--bg);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	.features-section .section-heading {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin: 0 0 var(--space-sm);
		font-size: 14px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--ink);
	}

	.features-section ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.features-section li {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) 0;
		color: var(--ink-secondary);
		font-size: 14px;
	}

	/* Latest Updates Section */
	.updates-section {
		background: rgba(25, 118, 210, 0.04);
		border: 1px solid rgba(25, 118, 210, 0.2);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	.updates-section .section-heading {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin: 0 0 var(--space-xs);
		font-size: 14px;
		font-weight: 800;
		color: var(--ink);
	}

	.updates-term {
		margin: 0 0 var(--space-sm);
		font-size: 14px;
		font-weight: 500;
		color: var(--ink-secondary);
	}

	.updates-section ul {
		margin: 0 0 var(--space-sm);
		padding: 0 0 0 var(--space-md);
		list-style: none;
	}

	.updates-section li {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) 0;
		color: var(--ink-secondary);
		font-size: 13px;
	}

	.updates-date {
		margin: 0;
		font-size: 12px;
		color: var(--ink-muted);
	}

	.notice-panel {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--warning-soft);
		border-radius: var(--radius-md);
		border-left: 4px solid var(--warning-strong);
	}

	.notice-icon {
		color: var(--warning-text);
		flex-shrink: 0;
	}

	.notice-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.notice-text {
		margin: 0;
		font-size: 13px;
		color: var(--ink-warm);
		line-height: 1.5;
	}

	/* The link inside the notice is injected via {@html}, so it inherits the
	 * global anchor styles (primary color, no underline). Override here so it is
	 * distinguished from the surrounding text by more than color (underline) and
	 * meets WCAG AA contrast (4.5:1) against the warning-soft panel background. */
	.notice-text :global(a) {
		color: var(--primary-dark);
		text-decoration: underline;
	}

	.notice-subtext {
		margin: 0;
		font-size: 12px;
		color: var(--ink-muted);
		line-height: 1.5;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-weight: 500;
		font-size: 14px;
		cursor: pointer;
	}

	.checkbox-box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: var(--radius-sm);
		border: 2px solid var(--border);
		background: var(--surface);
		transition: var(--transition-fast);
	}

	:global(button.checkbox-root) {
		outline: none !important;
		box-shadow: none !important;
		border: none !important;
		background: transparent !important;
		padding: 0 !important;
		margin: 0 !important;
	}

	:global(button.checkbox-root:focus-visible) .checkbox-box {
		box-shadow: var(--shadow-focus);
		border-color: var(--primary);
	}

	.checkbox-box.checked {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		padding-top: var(--space-sm);
	}

	.modal-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-md);
		padding-top: var(--space-sm);
		flex-wrap: wrap;
	}

	.creator-credit {
		font-size: 13px;
		color: var(--ink-muted);
	}

	.creator-name {
		font-weight: 700;
		color: var(--primary);
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

	@media (max-width: 600px) {
		:global(.dialog) {
			padding: var(--space-md);
		}

		:global(.dialog-title) {
			font-size: 1.25rem;
		}

		.lead {
			font-size: 14px;
		}

		.features-section,
		.updates-section,
		.notice-panel {
			padding: 12px;
		}
	}
</style>
