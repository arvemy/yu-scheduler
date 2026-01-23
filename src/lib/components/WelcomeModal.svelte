<script lang="ts">
	import { Button, Checkbox, Dialog } from 'bits-ui';
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

<Dialog.Root open={open} onOpenChange={(value) => (!value ? onClose?.() : null)}>
	<Dialog.Portal>
		<Dialog.Overlay class="overlay" />
		<Dialog.Content class="dialog">
			<div class="dialog-header">
				<Dialog.Title class="dialog-title">
					<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
						<path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
					</svg>
					{$t('welcome.title')}
				</Dialog.Title>
				<Dialog.Close class="close-btn" aria-label={$t('common.close')}>
					<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
						<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
					</svg>
				</Dialog.Close>
			</div>

			<p class="lead">{$t('welcome.description')}</p>

		<div class="features-section">
			<h2 class="section-heading">
				<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
					<path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 017 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
				</svg>
				{$t('welcome.features')}
			</h2>
				<ul>
					<li>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
							<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
						</svg>
						{$t('welcome.feature1')}
					</li>
					<li>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
							<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
						</svg>
						{$t('welcome.feature2')}
					</li>
					<li>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
							<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
						</svg>
						{$t('welcome.feature3')}
					</li>
					<li>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
							<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
						</svg>
						{$t('welcome.feature4')}
					</li>
				</ul>
			</div>

		<!-- Latest Updates Section -->
		<div class="updates-section">
			<h2 class="section-heading">
				<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
					<path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
				</svg>
				{$t('welcome.updates.title')}
			</h2>
				<p class="updates-term">{$t('welcome.updates.term')}</p>
				<ul>
					<li>
						<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
						</svg>
						{$t('welcome.updates.items.springTermAdded')}
					</li>
				</ul>
				<p class="updates-date">{$t('welcome.updates.addedOn')}</p>
			</div>

			<div class="notice-panel">
				<div class="notice-icon">
					<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
						<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
					</svg>
				</div>
				<div class="notice-content">
					<p class="notice-text" style="font-weight: 600;">{@html $t('welcome.importantNotice')}</p>
					<p class="notice-text">{$t('welcome.disclaimer')}</p>
					<p class="notice-subtext">{$t('welcome.privacyNote')}</p>
				</div>
			</div>

			<label class="checkbox-label">
				<Checkbox.Root checked={dontShowAgain} onCheckedChange={onDontShowAgainChange} class="checkbox-root">
					{#snippet children({ checked })}
						<span class="checkbox-box" class:checked={checked}>
							{#if checked}
								<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
									<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
								</svg>
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
						<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
							<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
						</svg>
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

	.features-section .section-heading svg {
		color: var(--primary);
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

	.features-section li svg {
		color: var(--success);
		flex-shrink: 0;
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

	.updates-section .section-heading svg {
		color: var(--primary);
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

	.updates-section li svg {
		color: var(--success);
		flex-shrink: 0;
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

	@media (max-width: 600px) {
		:global(.dialog) {
			padding: var(--space-md);
		}

		:global(.dialog-title) {
			font-size: 1.25rem;
		}

		:global(.dialog-title) svg {
			width: 24px;
			height: 24px;
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
