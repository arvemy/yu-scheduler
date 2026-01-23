<script lang="ts">
	import { DropdownMenu, Select } from 'bits-ui';
	import { locale, setLocale, t } from '$lib/i18n';
	import { translateTerm } from '$lib/utils/term';
	import { useMobile } from '$lib/utils/useMediaQuery.svelte';

	let {
		terms = [],
		currentTerm = null,
		termsLoading = false,
		termsError = false,
		onChangeTerm,
		onOpenWelcome,
		portfolioUrl = 'https://arvemy.github.io'
	}: {
		terms: string[];
		currentTerm: string | null;
		termsLoading: boolean;
		termsError: boolean;
		onChangeTerm: (term: string) => void;
		onOpenWelcome: () => void;
		portfolioUrl?: string;
	} = $props();

	const mobile = useMobile();
	const isMobile = $derived(mobile.isMobile);

	const termItems = $derived(
		terms.map((term) => ({ value: term, label: translateTerm(term, $t) }))
	);

	const languageItems = $derived([
		{ value: 'en', label: $t('language.english') },
		{ value: 'tr', label: $t('language.turkish') }
	]);

	const handleTermChange = (value: string) => {
		onChangeTerm?.(value);
	};

	const handleLanguageChange = (value: string) => {
		if (value === 'en' || value === 'tr') {
			setLocale(value);
		}
	};

	const openExternal = (url: string) => {
		if (typeof window !== 'undefined') {
			window.open(url, '_blank', 'noopener');
		}
	};
</script>

<header class="header">
	<!-- Floating controls (top-right) -->
	<div class="floating-controls">
		{#if isMobile}
			<!-- Mobile: overflow menu -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class="btn btn-icon" aria-label={$t('nav.more')}>
					<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
						<path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
					</svg>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="menu" sideOffset={8} align="end">
					<DropdownMenu.Item class="menu-item" onSelect={() => openExternal(portfolioUrl)}>
						<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
							<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
						</svg>
						{$t('nav.portfolio')}
					</DropdownMenu.Item>
					<DropdownMenu.Item class="menu-item" onSelect={() => openExternal('https://github.com/arvemy/yu-scheduler')}>
						<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
						</svg>
						{$t('nav.github')}
					</DropdownMenu.Item>
					<DropdownMenu.Item class="menu-item" onSelect={() => openExternal('https://linkedin.com/in/2123ardakorkmaz')}>
						<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
							<path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
						</svg>
						{$t('nav.linkedin')}
					</DropdownMenu.Item>
					<DropdownMenu.Separator class="menu-sep" />
					<DropdownMenu.Item class="menu-item" onSelect={onOpenWelcome}>
						<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
						</svg>
						{$t('nav.showWelcome')}
					</DropdownMenu.Item>
					<DropdownMenu.Separator class="menu-sep" />
					<div class="menu-section-title">{$t('language.switchLanguage')}</div>
					{#each languageItems as item (item.value)}
						<DropdownMenu.Item 
							class="menu-item {$locale === item.value ? 'selected' : ''}"
							onSelect={() => handleLanguageChange(item.value)}
						>
							<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
								<path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
							</svg>
							{item.label}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{:else}
			<!-- Desktop: individual buttons -->
			<button class="btn btn-icon" onclick={onOpenWelcome} aria-label={$t('nav.showWelcome')} title={$t('tooltips.about')}>
				<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
					<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
				</svg>
			</button>
			<Select.Root
				type="single"
				items={languageItems}
				value={$locale}
				onValueChange={handleLanguageChange}
			>
				<Select.Trigger class="btn btn-icon lang-trigger" aria-label={$t('language.switchLanguage')}>
					<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
						<path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
					</svg>
					<span class="lang-code">{$locale === 'en' ? 'EN' : 'TR'}</span>
				</Select.Trigger>
				<Select.Content class="select-content" align="end" sideOffset={4}>
					<Select.Viewport class="select-viewport">
						{#each languageItems as item (item.value)}
							<Select.Item class="select-item" value={item.value} label={item.label}>
								{item.label}
							</Select.Item>
						{/each}
					</Select.Viewport>
				</Select.Content>
			</Select.Root>
		{/if}
	</div>

	<!-- Centered content -->
	<div class="header-center">
		<!-- Author section -->
		<div class="author-section">
			{#if !isMobile}
				<a href={portfolioUrl} target="_blank" rel="noopener" class="social-btn" aria-label={$t('nav.portfolio')} title={$t('tooltips.portfolio')}>
					<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
						<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
					</svg>
				</a>
				<a href="https://github.com/arvemy/yu-scheduler" target="_blank" rel="noopener" class="social-btn" aria-label={$t('nav.github')} title={$t('tooltips.github')}>
					<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
				</a>
				<a href="https://linkedin.com/in/2123ardakorkmaz" target="_blank" rel="noopener" class="social-btn" aria-label={$t('nav.linkedin')} title={$t('tooltips.linkedin')}>
					<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
						<path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
					</svg>
				</a>
			{/if}
		</div>

		<!-- App title -->
		<h1 class="app-title">{$t('app.title')}</h1>

		<!-- Term selector -->
		<div class="term-selector-wrapper">
			{#if termsLoading}
				<div class="skeleton-term"></div>
			{:else if termsError}
				<p class="error-text">{$t('courseSelector.failedToLoadTerms')}</p>
			{:else}
				<Select.Root
					type="single"
					items={termItems}
					value={currentTerm ?? ''}
					onValueChange={handleTermChange}
					disabled={terms.length === 0}
				>
					<Select.Trigger class="term-trigger">
						<span class="term-value">{currentTerm ? translateTerm(currentTerm, $t) : $t('savedSchedules.term')}</span>
						<svg class="chevron" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
							<path d="M7 10l5 5 5-5z"/>
						</svg>
					</Select.Trigger>
					<Select.Content class="select-content term-content" align="center" sideOffset={4}>
						<Select.Viewport class="select-viewport">
							{#each termItems as item (item.value)}
								<Select.Item class="select-item" value={item.value} label={item.label}>
									{item.label}
								</Select.Item>
							{/each}
						</Select.Viewport>
					</Select.Content>
				</Select.Root>
			{/if}
		</div>
	</div>
</header>

<style>
	.header {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: var(--space-sm);
	}

	/* Floating controls - top right */
	.floating-controls {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		display: flex;
		gap: var(--space-sm);
		z-index: 1;
	}

	/* Centered content */
	.header-center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding-top: var(--space-sm);
		/* Reserve vertical space to prevent CLS during font loading */
		min-height: 140px;
	}

	/* Author section */
	.author-section {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-bottom: var(--space-xs);
	}

	.social-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-md);
		background: var(--primary-soft);
		color: var(--primary);
		transition: var(--transition-fast);
	}

	.social-btn:hover {
		background: var(--primary-soft-hover);
		color: var(--primary);
		text-decoration: none;
	}

	/* App title */
	.app-title {
		font-size: 22px;
		font-weight: 900;
		letter-spacing: 2px;
		margin: 0;
		text-transform: uppercase;
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		text-shadow: 0 2px 8px rgba(25, 118, 210, 0.10);
		text-align: center;
		/* Fixed line-height and min-height to prevent CLS */
		line-height: 1.2;
		min-height: 27px;
		padding: 0 var(--space-md);
	}

	/* Term selector */
	.term-selector-wrapper {
		margin-top: var(--space-sm);
		min-height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.skeleton-term {
		width: 220px;
		height: 40px;
		border-radius: var(--radius-md);
		background: linear-gradient(90deg, var(--bg) 25%, var(--bg-secondary) 50%, var(--bg) 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% { background-position: 200% 0; }
		100% { background-position: -200% 0; }
	}

	.error-text {
		color: var(--error);
		font-size: 14px;
		text-align: center;
		margin: 0;
	}

	:global(.term-trigger) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		min-width: 180px;
		height: 40px;
		padding: 0 var(--space-md);
		border-radius: var(--radius-md);
		border: 2px solid rgba(25, 118, 210, 0.2);
		background: var(--surface);
		cursor: pointer;
		font-weight: 800;
		font-size: 14px;
		color: var(--primary);
		letter-spacing: 1px;
		box-shadow: var(--shadow-sm);
		transition: var(--transition);
	}

	:global(.term-trigger:hover) {
		border-color: rgba(25, 118, 210, 0.5);
	}

	:global(.term-trigger:focus) {
		outline: none;
		border-color: var(--primary);
		box-shadow: var(--shadow-md);
	}

	:global(.term-trigger[data-disabled]) {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.term-value {
		text-align: center;
	}

	.chevron {
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	/* Button styles */
	:global(.btn-icon) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		padding: 8px;
		border-radius: var(--radius-md);
		background: var(--primary-soft);
		color: var(--primary);
		border: none;
		cursor: pointer;
		min-width: 36px;
		min-height: 36px;
		transition: var(--transition-fast);
	}

	:global(.btn-icon:hover) {
		background: var(--primary-soft-hover);
		transform: scale(1.05);
	}

	:global(.lang-trigger) {
		padding: 8px 12px;
	}

	.lang-code {
		font-weight: 700;
		font-size: 13px;
		color: var(--primary-strong);
	}

	/* Select dropdown styles */
	:global(.select-content) {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		padding: var(--space-xs);
		max-height: 280px;
		overflow: auto;
		animation: slideIn 0.2s ease;
		z-index: 1001;
	}

	:global(.term-content) {
		min-width: 220px;
	}

	:global(.select-viewport) {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	:global(.select-item) {
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-weight: 500;
		font-size: 14px;
		transition: var(--transition-fast);
	}

	:global(.select-item[data-highlighted]) {
		background: rgba(25, 118, 210, 0.08);
		color: var(--primary);
	}

	:global(.select-item[data-selected]) {
		background: rgba(25, 118, 210, 0.12);
		color: var(--primary);
		font-weight: 600;
	}

	/* Menu dropdown styles */
	:global(.menu) {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-xs);
		box-shadow: var(--shadow-lg);
		animation: slideIn 0.2s ease;
		min-width: 200px;
		max-width: 80vw;
		max-height: 55vh;
		max-height: 55dvh;
		overflow-y: auto;
		z-index: 1001;
	}

	:global(.menu-item) {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-weight: 500;
		font-size: 14px;
		transition: var(--transition-fast);
	}

	:global(.menu-item[data-highlighted]) {
		background: rgba(25, 118, 210, 0.08);
		color: var(--primary);
	}

	:global(.menu-item.selected) {
		font-weight: 600;
	}

	:global(.menu-sep) {
		height: 1px;
		background: var(--border);
		margin: var(--space-xs) 0;
	}

	.menu-section-title {
		padding: var(--space-xs) var(--space-sm);
		font-size: 12px;
		font-weight: 600;
		color: var(--ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-8px) scaleY(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scaleY(1);
		}
	}

	/* Responsive */
	@media (min-width: 600px) {
		.header-center {
			min-height: 160px;
		}

		.app-title {
			font-size: 30px;
			min-height: 36px;
		}

		.floating-controls {
			top: var(--space-md);
			right: var(--space-md);
		}

		:global(.term-trigger) {
			min-width: 220px;
			font-size: 16px;
		}
	}

	@media (min-width: 900px) {
		.header-center {
			min-height: 170px;
		}

		.app-title {
			font-size: 40px;
			min-height: 48px;
		}
	}
</style>
