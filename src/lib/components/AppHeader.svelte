<script lang="ts">
	import { DropdownMenu, Select, Tooltip } from 'bits-ui';
	import { ChevronDown, EllipsisVertical, Info, Languages, User } from '@lucide/svelte';
	import { locale, setLocale, t } from '$lib/i18n';
	import { translateTerm } from '$lib/utils/term';
	import { useMobile } from '$lib/utils/useMediaQuery.svelte';
	import TooltipContent from '$lib/components/ui/TooltipContent.svelte';

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

<Tooltip.Provider delayDuration={350} skipDelayDuration={100}>
	<header class="header">
		<!-- Floating controls (top-right) -->
		<div class="floating-controls">
			{#if isMobile}
				<!-- Mobile: overflow menu -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class="btn btn-icon" aria-label={$t('nav.more')}>
						<EllipsisVertical size={20} />
					</DropdownMenu.Trigger>
					<DropdownMenu.Portal>
						<DropdownMenu.Content class="menu" sideOffset={8} align="end">
							<DropdownMenu.Item class="menu-item" onSelect={() => openExternal(portfolioUrl)}>
								<User size={18} />
								{$t('nav.portfolio')}
							</DropdownMenu.Item>
							<DropdownMenu.Item
								class="menu-item"
								onSelect={() => openExternal('https://github.com/arvemy/yu-scheduler')}
							>
								<img class="menu-brand-icon" src="/github.svg" alt="" aria-hidden="true" />
								{$t('nav.github')}
							</DropdownMenu.Item>
							<DropdownMenu.Item
								class="menu-item"
								onSelect={() => openExternal('https://linkedin.com/in/2123ardakorkmaz')}
							>
								<img class="menu-brand-icon" src="/linkedin.svg" alt="" aria-hidden="true" />
								{$t('nav.linkedin')}
							</DropdownMenu.Item>
							<DropdownMenu.Separator class="menu-sep" />
							<DropdownMenu.Item class="menu-item" onSelect={onOpenWelcome}>
								<Info size={18} />
								{$t('nav.showWelcome')}
							</DropdownMenu.Item>
							<DropdownMenu.Separator class="menu-sep" />
							<div class="menu-section-title">{$t('language.switchLanguage')}</div>
							{#each languageItems as item (item.value)}
								<DropdownMenu.Item
									class="menu-item {$locale === item.value ? 'selected' : ''}"
									onSelect={() => handleLanguageChange(item.value)}
								>
									<Languages size={18} />
									{item.label}
								</DropdownMenu.Item>
							{/each}
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			{:else}
				<!-- Desktop: individual buttons -->
				<Tooltip.Root>
					<Tooltip.Trigger
						class="btn btn-icon"
						onclick={onOpenWelcome}
						aria-label={$t('nav.showWelcome')}
					>
						<Info size={20} />
					</Tooltip.Trigger>
					<TooltipContent label={$t('tooltips.about')} />
				</Tooltip.Root>
				<Select.Root
					type="single"
					items={languageItems}
					value={$locale}
					onValueChange={handleLanguageChange}
				>
					<Select.Trigger
						class="btn btn-icon lang-trigger"
						aria-label={`${$t('language.switchLanguage')} (${$locale === 'en' ? 'EN' : 'TR'})`}
					>
						<Languages size={18} />
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
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<a
									{...props}
									href={portfolioUrl}
									target="_blank"
									rel="noopener"
									class="social-btn"
									aria-label={$t('nav.portfolio')}
								>
									<User size={20} />
								</a>
							{/snippet}
						</Tooltip.Trigger>
						<TooltipContent label={$t('tooltips.portfolio')} />
					</Tooltip.Root>
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<a
									{...props}
									href="https://github.com/arvemy/yu-scheduler"
									target="_blank"
									rel="noopener"
									class="social-btn"
									aria-label={$t('nav.github')}
								>
									<img class="brand-icon" src="/github.svg" alt="" aria-hidden="true" />
								</a>
							{/snippet}
						</Tooltip.Trigger>
						<TooltipContent label={$t('tooltips.github')} />
					</Tooltip.Root>
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<a
									{...props}
									href="https://linkedin.com/in/2123ardakorkmaz"
									target="_blank"
									rel="noopener"
									class="social-btn"
									aria-label={$t('nav.linkedin')}
								>
									<img class="brand-icon" src="/linkedin.svg" alt="" aria-hidden="true" />
								</a>
							{/snippet}
						</Tooltip.Trigger>
						<TooltipContent label={$t('tooltips.linkedin')} />
					</Tooltip.Root>
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
							<span class="term-value"
								>{currentTerm ? translateTerm(currentTerm, $t) : $t('savedSchedules.term')}</span
							>
							<ChevronDown class="shrink-0" size={20} />
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
</Tooltip.Provider>

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

	:global(.social-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: var(--radius-md);
		background: var(--primary-soft);
		color: var(--primary);
		cursor: pointer;
		transition: var(--transition-fast);
	}

	:global(.social-btn:hover) {
		background: var(--primary-soft-hover);
		color: var(--primary);
		text-decoration: none;
	}

	.brand-icon,
	.menu-brand-icon {
		display: block;
		width: 20px;
		height: 20px;
		object-fit: contain;
	}

	.menu-brand-icon {
		width: 18px;
		height: 18px;
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
		text-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
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
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
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
		color: var(--primary-dark);
	}

	:global(.select-item[data-selected]) {
		background: rgba(25, 118, 210, 0.12);
		color: var(--primary-dark);
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
		color: var(--primary-dark);
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
