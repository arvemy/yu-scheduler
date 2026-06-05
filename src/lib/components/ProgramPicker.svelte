<script lang="ts">
	import { Popover } from 'bits-ui';
	import { Check, ChevronDown, ChevronRight, GraduationCap, Search } from '@lucide/svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { locale, t } from '$lib/i18n';
	import { normalizeForSearch } from '$lib/utils/search';
	import type { ProgramMeta } from '$lib/types';

	let {
		programs = [],
		currentProgram = null,
		onChangeProgram
	}: {
		programs?: ProgramMeta[];
		currentProgram?: string | null;
		onChangeProgram?: (program: string | null) => void;
	} = $props();

	let open = $state(false);
	let query = $state('');
	// Degree sections start collapsed for a compact drilldown; a search overrides
	// this and force-expands every section that still has matches.
	const expandedDegrees = new SvelteSet<string>();

	// Degrees we know how to label, in the order they should appear. Any other
	// degree the catalog might introduce is appended after these (see below).
	const DEGREE_ORDER = ['associate', 'bachelor', 'master'];

	const programName = (program: ProgramMeta): string =>
		program.name?.[$locale] ?? program.name?.en ?? program.id;

	const facultyName = (program: ProgramMeta): string =>
		program.faculty?.[$locale] ?? program.faculty?.en ?? '';

	const degreeLabel = (degree: string): string => {
		const label = $t(`degree.${degree}`);
		// $t returns the key unchanged when there is no translation; fall back to
		// the raw degree string so an unknown level still reads sensibly.
		return label === `degree.${degree}` ? degree : label;
	};

	const currentLabel = $derived.by(() => {
		if (!currentProgram) return $t('program.all');
		const match = programs.find((program) => program.id === currentProgram);
		return match ? programName(match) : $t('program.all');
	});

	type ProgramRow = { id: string; label: string };
	type FacultyGroup = { key: string; label: string; programs: ProgramRow[] };
	type DegreeGroup = { degree: string; label: string; faculties: FacultyGroup[] };

	// Build the degree -> faculty -> programs tree, filtered by the search query.
	// Explicit loops (not .map().filter() chains) so the filtering actually runs
	// inside $derived.by — see the svelte-derived-filter-gotcha.
	const groups = $derived.by<DegreeGroup[]>(() => {
		const needle = normalizeForSearch(query.trim());
		// Plain objects (not Map/Set): these are transient build scaffolding, not
		// reactive state, and string keys preserve insertion order here.
		const byDegree: Record<string, Record<string, FacultyGroup>> = {};

		for (const program of programs) {
			const name = programName(program);
			const faculty = facultyName(program);
			if (needle) {
				const haystack = normalizeForSearch(`${name} ${faculty} ${degreeLabel(program.degree)}`);
				if (!haystack.includes(needle)) continue;
			}

			let faculties = byDegree[program.degree];
			if (!faculties) {
				faculties = {};
				byDegree[program.degree] = faculties;
			}
			const facultyKey = faculty || 'ÿ'; // sort unnamed faculties last
			let group = faculties[facultyKey];
			if (!group) {
				group = { key: facultyKey, label: faculty, programs: [] };
				faculties[facultyKey] = group;
			}
			group.programs.push({ id: program.id, label: name });
		}

		const orderedDegrees = [
			...DEGREE_ORDER.filter((degree) => byDegree[degree]),
			...Object.keys(byDegree).filter((degree) => !DEGREE_ORDER.includes(degree))
		];

		const result: DegreeGroup[] = [];
		for (const degree of orderedDegrees) {
			const faculties = Object.values(byDegree[degree]).sort((a, b) =>
				a.label.localeCompare(b.label, $locale)
			);
			for (const faculty of faculties) {
				faculty.programs.sort((a, b) => a.label.localeCompare(b.label, $locale));
			}
			result.push({ degree, label: degreeLabel(degree), faculties });
		}
		return result;
	});

	const searching = $derived(query.trim().length > 0);

	const isExpanded = (degree: string): boolean => searching || expandedDegrees.has(degree);

	const toggleDegree = (degree: string) => {
		if (expandedDegrees.has(degree)) expandedDegrees.delete(degree);
		else expandedDegrees.add(degree);
	};

	const handleOpenChange = (value: boolean) => {
		open = value;
		// Reset the filter on close so the picker never reopens with a stale query.
		if (!value) query = '';
	};

	const choose = (program: string | null) => {
		onChangeProgram?.(program);
		// Route through handleOpenChange so closing here also clears the search.
		handleOpenChange(false);
	};
</script>

<Popover.Root {open} onOpenChange={handleOpenChange}>
	<Popover.Trigger class="term-trigger program-trigger" aria-label={$t('program.ariaLabel')}>
		<span class="term-value">{currentLabel}</span>
		<ChevronDown class="shrink-0" size={18} aria-hidden="true" />
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content class="program-picker" sideOffset={4} align="center">
			<div class="picker-search">
				<Search class="pointer-events-none absolute left-3 text-ink-muted" size={18} />
				<input
					type="text"
					placeholder={$t('program.searchPlaceholder')}
					aria-label={$t('program.searchPlaceholder')}
					bind:value={query}
					{@attach (node: HTMLInputElement) => {
						// Focus after bits-ui's open auto-focus settles on the content wrapper,
						// so the caret reliably lands in the search field instead.
						const id = requestAnimationFrame(() => node.focus());
						return () => cancelAnimationFrame(id);
					}}
				/>
			</div>

			<div class="picker-list" role="listbox" aria-label={$t('program.ariaLabel')}>
				<button
					type="button"
					class="picker-all {currentProgram == null ? 'selected' : ''}"
					role="option"
					aria-selected={currentProgram == null}
					onclick={() => choose(null)}
				>
					<span>{$t('program.all')}</span>
					{#if currentProgram == null}
						<Check size={16} aria-hidden="true" />
					{/if}
				</button>

				{#if groups.length === 0}
					<div class="picker-empty">{$t('program.noResults')}</div>
				{:else}
					{#each groups as degreeGroup (degreeGroup.degree)}
						{@const expanded = isExpanded(degreeGroup.degree)}
						<div class="degree-group">
							<button
								type="button"
								class="degree-header"
								aria-expanded={expanded}
								onclick={() => toggleDegree(degreeGroup.degree)}
							>
								<ChevronRight
									size={16}
									class="degree-caret {expanded ? 'rotate-90' : ''}"
									aria-hidden="true"
								/>
								<GraduationCap size={16} aria-hidden="true" />
								<span class="degree-name">{degreeGroup.label}</span>
							</button>

							{#if expanded}
								{#each degreeGroup.faculties as faculty (faculty.key)}
									{#if faculty.label}
										<div class="faculty-header">{faculty.label}</div>
									{/if}
									{#each faculty.programs as program (program.id)}
										<button
											type="button"
											class="program-item {program.id === currentProgram ? 'selected' : ''}"
											role="option"
											aria-selected={program.id === currentProgram}
											onclick={() => choose(program.id)}
										>
											<span class="program-name">{program.label}</span>
											{#if program.id === currentProgram}
												<Check class="shrink-0" size={16} aria-hidden="true" />
											{/if}
										</button>
									{/each}
								{/each}
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>

<style>
	:global(.program-picker) {
		display: flex;
		flex-direction: column;
		width: min(420px, calc(100vw - var(--space-md)));
		max-height: min(70vh, 480px);
		max-height: min(70dvh, 480px);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		padding: var(--space-xs);
		z-index: 1001;
		animation: slideIn 0.2s ease;
	}

	.picker-search {
		position: relative;
		display: flex;
		align-items: center;
		padding: var(--space-xs);
	}

	.picker-search input {
		width: 100%;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 10px 12px 10px 40px;
		font-size: 14px;
		background: var(--surface);
		transition: var(--transition);
	}

	.picker-search input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: var(--shadow-focus);
	}

	.picker-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		overflow-y: auto;
		padding: var(--space-xs);
		padding-top: 0;
	}

	.picker-all,
	.program-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		width: 100%;
		text-align: left;
		padding: 9px 12px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 14px;
		color: var(--ink-secondary);
		transition: var(--transition-fast);
	}

	.program-item {
		padding-left: 22px;
		font-size: 13px;
	}

	.picker-all:hover,
	.program-item:hover {
		background: rgba(25, 118, 210, 0.08);
		color: var(--primary-dark);
	}

	.picker-all.selected,
	.program-item.selected {
		background: rgba(25, 118, 210, 0.12);
		color: var(--primary-dark);
		font-weight: 600;
	}

	.picker-all {
		font-weight: 600;
		color: var(--ink);
		margin-bottom: 2px;
	}

	.program-name {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.degree-group {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.degree-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		width: 100%;
		padding: 9px 10px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		color: var(--ink);
		font-weight: 700;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		transition: var(--transition-fast);
	}

	.degree-header:hover {
		background: var(--bg);
	}

	:global(.degree-caret) {
		flex-shrink: 0;
		color: var(--ink-muted);
		transition: transform 0.15s ease;
	}

	.degree-name {
		flex: 1;
		text-align: left;
	}

	.faculty-header {
		padding: 8px 12px 4px;
		font-size: 11px;
		font-weight: 800;
		color: var(--ink);
		text-transform: uppercase;
		letter-spacing: 0.4px;
	}

	.picker-empty {
		padding: 16px 12px;
		text-align: center;
		font-size: 14px;
		color: var(--ink-muted);
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
</style>
