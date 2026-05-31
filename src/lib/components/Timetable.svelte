<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { Tooltip } from 'bits-ui';
	import { ChevronDown, ChevronLeft, ChevronRight, Clock, Lock } from '@lucide/svelte';
	import type { BlockedHour, Schedule, SessionData } from '$lib/types';
	import { t } from '$lib/i18n';
	import { SWIPE_THRESHOLD_PX } from '$lib/config/ui';
	import { rangesOverlap, slotStringToRange } from '$lib/utils/time';
	import { colorForCourse } from '$lib/utils/colors';
	import { useMobile } from '$lib/utils/useMediaQuery.svelte';
	import TooltipContent from '$lib/components/ui/TooltipContent.svelte';

	let {
		schedule,
		timeSlots = [],
		daysOfWeek = [],
		blockedHours = [],
		downloadMode = false,
		onBlockedHoursChange,
		scrollRef = $bindable(null)
	}: {
		schedule: Schedule | null;
		timeSlots: string[];
		daysOfWeek: string[];
		blockedHours: BlockedHour[];
		downloadMode?: boolean;
		onBlockedHoursChange?: (hours: BlockedHour[]) => void;
		scrollRef?: HTMLElement | null;
	} = $props();

	// Track if component has mounted (to prevent hydration mismatch)
	let mounted = $state(false);

	// Mobile detection using shared composable (md breakpoint: < 768px)
	const mobile = useMobile();
	const isMobile = $derived(mobile.isMobile);

	// Mobile day navigation
	let activeDayIndex = $state(0);
	const clampedDayIndex = $derived.by(() => {
		const len = daysOfWeek.length;
		if (len === 0) return 0;
		return Math.min(Math.max(activeDayIndex, 0), len - 1);
	});
	const activeDay = $derived(daysOfWeek[clampedDayIndex] ?? null);

	const prevDay = () => {
		const len = daysOfWeek.length;
		if (len === 0) return;
		activeDayIndex = Math.max(0, clampedDayIndex - 1);
	};

	const nextDay = () => {
		const len = daysOfWeek.length;
		if (len === 0) return;
		activeDayIndex = Math.min(len - 1, clampedDayIndex + 1);
	};

	let touchStartX = $state<number | null>(null);
	let touchStartY = $state<number | null>(null);
	let touchEndX = $state<number | null>(null);
	let touchEndY = $state<number | null>(null);

	const onDayTouchStart = (e: TouchEvent) => {
		touchEndX = null;
		touchEndY = null;
		const touch = e.changedTouches[0];
		touchStartX = touch?.clientX ?? null;
		touchStartY = touch?.clientY ?? null;
	};

	const onDayTouchMove = (e: TouchEvent) => {
		const touch = e.changedTouches[0];
		touchEndX = touch?.clientX ?? null;
		touchEndY = touch?.clientY ?? null;
	};

	const onDayTouchEnd = () => {
		if (touchStartX == null || touchStartY == null) return;
		if (touchEndX == null || touchEndY == null) return;
		if (daysOfWeek.length <= 1) return;

		const dx = touchEndX - touchStartX;
		const dy = touchEndY - touchStartY;
		const absDx = Math.abs(dx);
		const absDy = Math.abs(dy);

		touchStartX = null;
		touchStartY = null;
		touchEndX = null;
		touchEndY = null;

		// Only trigger if horizontal intent dominates
		if (absDx < SWIPE_THRESHOLD_PX) return;
		if (absDx <= absDy) return;

		if (dx < 0) nextDay();
		else prevDay();
	};

	onMount(() => {
		mounted = true;
	});

	// Track expanded groups (for session grouping)
	let expandedGroups = $state<Record<string, boolean>>({});
	const toggleGroup = (key: string) => {
		expandedGroups = { ...expandedGroups, [key]: !expandedGroups[key] };
	};

	const blockedSet = $derived(new Set(blockedHours.map((b) => `${b.day}|${b.slot}`)));
	const makeKey = (day: string, slot: string) => `${day}|${slot}`;
	const bindScrollRef = (node: HTMLElement) => {
		scrollRef = node;
		return () => {
			if (scrollRef === node) scrollRef = null;
		};
	};

	// Build timetable grid
	const grid = $derived.by(() => {
		const gridData: Record<string, Record<string, SessionData[]>> = {};
		daysOfWeek.forEach((day) => {
			gridData[day] = {};
			timeSlots.forEach((slot) => {
				gridData[day][slot] = [];
			});
		});

		if (!schedule?.sections?.length) return gridData;

		const slotRanges = timeSlots.map(slotStringToRange);
		schedule.sections.forEach(({ course, section, sessions }) => {
			sessions.forEach((session) => {
				const day = session.Day;
				const start = session['Start Time'];
				const end = session['End Time'];
				if (!day || !start || !end) return;
				if (!gridData[day]) return;

				const sessionRange = { start, end };
				timeSlots.forEach((slot, idx) => {
					if (rangesOverlap(sessionRange, slotRanges[idx])) {
						gridData[day][slot].push({ ...session, course, section, Day: day });
					}
				});
			});
		});

		return gridData;
	});

	// Group sessions by course and time window for collapse/expand UI
	type GroupedSession = {
		key: string;
		course: string;
		start: string;
		end: string;
		day: string;
		sections: string[];
		classrooms: string[];
		items: SessionData[];
		count: number;
	};

	const groupSessions = (day: string, slot: string, sessions: SessionData[]): GroupedSession[] => {
		const map = new SvelteMap<string, GroupedSession>();
		sessions.forEach((s) => {
			const course = s.course || '';
			const start = s['Start Time'] || '';
			const end = s['End Time'] || '';
			const gKey = `${day}|${slot}|${course}|${start}|${end}`;
			if (!map.has(gKey)) {
				map.set(gKey, {
					key: gKey,
					course,
					start,
					end,
					day,
					sections: s.section ? [s.section] : [],
					classrooms: s.Classroom ? [s.Classroom] : [],
					items: [s],
					count: 1
				});
			} else {
				const g = map.get(gKey)!;
				if (s.section && !g.sections.includes(s.section)) g.sections.push(s.section);
				if (s.Classroom && !g.classrooms.includes(s.Classroom)) g.classrooms.push(s.Classroom);
				g.items.push(s);
				g.count += 1;
			}
		});
		return Array.from(map.values()).sort(
			(a, b) => a.course.localeCompare(b.course) || a.start.localeCompare(b.start)
		);
	};

	/**
	 * Screen-reader summary of the sessions in a populated desktop grid cell.
	 * The cell carries an aria-label (which overrides its visible spans, and
	 * those spans are aria-hidden), so the otherwise-hidden details — section,
	 * the session's own time range, classroom, and any grouped alternatives — are
	 * mirrored here for parity with sighted users. The session range is stated
	 * explicitly rather than relying on the block/unblock slot label, because a
	 * class can span multiple slots (the grid places it in every overlapping
	 * cell), so its real time differs from a given cell's slot. Begins with the
	 * same course code shown in the cell so the accessible name still contains the
	 * visible label (WCAG 2.5.3).
	 */
	const describeCellSessions = (groups: GroupedSession[]): string =>
		groups
			.map((g) => {
				const time = `${g.start}-${g.end}`;
				if (g.count > 1) {
					const options = g.items
						.map((s) => [s.section, s.Classroom].filter(Boolean).join(' '))
						.filter(Boolean)
						.join(', ');
					const optionsLabel = `${g.count} ${$t('timetable.sectionOptions', { count: g.count })}`;
					return `${g.course} (*), ${time}, ${optionsLabel}${options ? `: ${options}` : ''}`;
				}
				const section = g.sections[0] ?? '';
				const room = g.classrooms[0] ? `, ${g.classrooms[0]}` : '';
				return `${g.course} (${section}), ${time}${room}`;
			})
			.join('; ');

	const isBlocked = (day: string, slot: string) => blockedSet.has(makeKey(day, slot));
	const isDayBlocked = (day: string) => timeSlots.every((slot) => isBlocked(day, slot));
	const isSlotBlocked = (slot: string) => daysOfWeek.every((day) => isBlocked(day, slot));

	// Check if any cell in a slot row is expanded
	const isAnyExpandedInSlot = (slot: string) => {
		for (const [k, v] of Object.entries(expandedGroups)) {
			if (v && k.split('|')[1] === slot) return true;
		}
		return false;
	};

	// Check if any group in a cell is expanded
	const isAnyExpandedInCell = (day: string, slot: string) => {
		const prefix = `${day}|${slot}|`;
		for (const [k, v] of Object.entries(expandedGroups)) {
			if (v && k.startsWith(prefix)) return true;
		}
		return false;
	};

	const updateBlockedHours = (next: BlockedHour[]) => {
		onBlockedHoursChange?.(next);
	};

	const toggleCell = (day: string, slot: string) => {
		const key = makeKey(day, slot);
		if (isBlocked(day, slot)) {
			updateBlockedHours(blockedHours.filter((b) => makeKey(b.day, b.slot) !== key));
		} else {
			updateBlockedHours([...blockedHours, { day, slot }]);
		}
	};

	const toggleDay = (day: string) => {
		if (isDayBlocked(day)) {
			updateBlockedHours(blockedHours.filter((b) => b.day !== day));
		} else {
			const additions = timeSlots
				.filter((slot) => !isBlocked(day, slot))
				.map((slot) => ({ day, slot }));
			updateBlockedHours([...blockedHours, ...additions]);
		}
	};

	const toggleSlot = (slot: string) => {
		if (isSlotBlocked(slot)) {
			updateBlockedHours(blockedHours.filter((b) => b.slot !== slot));
		} else {
			const additions = daysOfWeek
				.filter((day) => !isBlocked(day, slot))
				.map((day) => ({ day, slot }));
			updateBlockedHours([...blockedHours, ...additions]);
		}
	};

	const onActivate = (event: KeyboardEvent, action: () => void) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		action();
	};
</script>

<Tooltip.Provider delayDuration={350} skipDelayDuration={100}>
	<div class="timetable-container">
		{#if !mounted}
			<!-- SSR/Loading skeleton - matches expected height to prevent CLS -->
			<div class="timetable-skeleton"></div>
		{:else if !isMobile || downloadMode}
			<!-- Desktop: Table view -->
			<div class="timetable-scroll" {@attach bindScrollRef}>
				<table class="timetable">
					<thead>
						<tr>
							<th class="time-header">
								<Clock class="mx-auto mb-1 block" size={18} />
								<span>{$t('timetable.time')}</span>
							</th>
							{#each daysOfWeek as day (day)}
								<Tooltip.Root>
									<Tooltip.Trigger>
										{#snippet child({ props })}
											<th
												{...props}
												class="day-header"
												class:blocked={isDayBlocked(day)}
												onclick={() => toggleDay(day)}
												onkeydown={(event) => onActivate(event, () => toggleDay(day))}
												role="button"
												tabindex="0"
												aria-pressed={isDayBlocked(day)}
											>
												{$t(`timetable.days.${day}`)}
											</th>
										{/snippet}
									</Tooltip.Trigger>
									<TooltipContent label={$t('tooltips.blockUnblockDay')} />
								</Tooltip.Root>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each timeSlots as slot (slot)}
							{@const rowExpanded = isAnyExpandedInSlot(slot)}
							<tr>
								<Tooltip.Root>
									<Tooltip.Trigger>
										{#snippet child({ props })}
											<th
												{...props}
												class="slot-header"
												class:blocked={isSlotBlocked(slot)}
												class:expanded={rowExpanded}
												onclick={() => toggleSlot(slot)}
												onkeydown={(event) => onActivate(event, () => toggleSlot(slot))}
												role="button"
												tabindex="0"
												aria-pressed={isSlotBlocked(slot)}
											>
												<div class="slot-time">
													<span>{slot.split('-')[0]}</span>
													<span>{slot.split('-')[1]}</span>
												</div>
											</th>
										{/snippet}
									</Tooltip.Trigger>
									<TooltipContent label={$t('courseSelector.blockUnblockHour')} />
								</Tooltip.Root>
								{#each daysOfWeek as day (day)}
									{@const cellExpanded = isAnyExpandedInCell(day, slot)}
									{@const blocked = isBlocked(day, slot)}
									{@const groups = groupSessions(day, slot, grid[day][slot])}
									{@const cellSummary = describeCellSessions(groups)}
									{@const blockCellLabel = $t('courseSelector.blockUnblockCell', {
										day: $t(`timetable.days.${day}`),
										slot
									})}
									<td
										class="cell"
										class:blocked
										class:expanded={cellExpanded}
										onclick={() => toggleCell(day, slot)}
										onkeydown={(event) => onActivate(event, () => toggleCell(day, slot))}
										role="button"
										tabindex="0"
										aria-label={cellSummary ? `${cellSummary}. ${blockCellLabel}` : blockCellLabel}
										aria-pressed={blocked}
									>
										<div class="cell-content" class:blocked>
											{#if blocked && groups.length === 0}
												<div class="blocked-indicator">
													<Lock size={20} />
												</div>
											{/if}
											{#each groups as g (g.key)}
												{@const expanded = !!expandedGroups[g.key]}
												{@const isGrouped = g.count > 1}
												<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
												<div
													class="session-card"
													class:clickable={isGrouped}
													style="background-color: {colorForCourse(g.course)}"
													onclick={(e) => {
														if (isGrouped) {
															e.stopPropagation();
															toggleGroup(g.key);
														}
													}}
													role={isGrouped ? 'button' : undefined}
													tabindex={isGrouped ? 0 : -1}
													onkeydown={(e) => {
														if (isGrouped && (e.key === 'Enter' || e.key === ' ')) {
															e.preventDefault();
															e.stopPropagation();
															toggleGroup(g.key);
														}
													}}
												>
													<div class="session-header">
														<span class="course-code">
															{g.course}
															{isGrouped ? '(*)' : `(${g.sections[0] ?? ''})`}
														</span>
														{#if isGrouped}
															<Tooltip.Root>
																<Tooltip.Trigger
																	class="expand-btn"
																	onclick={(e) => {
																		e.stopPropagation();
																		toggleGroup(g.key);
																	}}
																	aria-expanded={expanded}
																	aria-label={expanded
																		? $t('common.collapse')
																		: $t('common.expand')}
																>
																	<ChevronDown
																		size={16}
																		class="transition-transform {expanded ? 'rotate-180' : ''}"
																		aria-hidden="true"
																	/>
																</Tooltip.Trigger>
																<TooltipContent
																	label={expanded ? $t('common.collapse') : $t('common.expand')}
																/>
															</Tooltip.Root>
														{/if}
													</div>
													<!-- Detail spans are aria-hidden: their info is folded into the
												     cell's aria-label, so the cell's accessible name matches its
												     visible course text (WCAG 2.5.3). -->
													<span class="time-range" aria-hidden="true">{g.start} - {g.end}</span>
													{#if !isGrouped && g.classrooms[0]}
														<span class="classroom" aria-hidden="true">{g.classrooms[0]}</span>
													{/if}
													{#if isGrouped}
														<span class="section-count" aria-hidden="true"
															>{g.count} {$t('timetable.sectionOptions', { count: g.count })}</span
														>
													{/if}
													{#if isGrouped && expanded}
														<div class="expanded-sections" aria-hidden="true">
															{#each g.items as s, i (`${g.key}-${i}`)}
																<span class="section-detail"
																	>{s.section} - {s.Classroom || '-'}</span
																>
															{/each}
														</div>
													{/if}
												</div>
											{/each}
										</div>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<!-- Mobile: single-day view + swipe navigation -->
			<div
				class="mobile-view"
				role="group"
				aria-label={$t('courseSelector.schedule')}
				ontouchstart={onDayTouchStart}
				ontouchmove={onDayTouchMove}
				ontouchend={onDayTouchEnd}
			>
				{#if !activeDay}
					<div class="mobile-empty">-</div>
				{:else}
					<div class="day-card">
						<div class="day-nav-bar" class:blocked={isDayBlocked(activeDay)}>
							<Tooltip.Root>
								<Tooltip.Trigger
									class="day-nav-btn"
									disabled={clampedDayIndex === 0}
									onclick={prevDay}
									aria-label={$t('pagination.previous')}
								>
									<ChevronLeft size={20} aria-hidden="true" />
								</Tooltip.Trigger>
								<TooltipContent label={$t('pagination.previous')} />
							</Tooltip.Root>
							<!-- No aria-label: the accessible name is the visible content
						     (day + position + "Block/Unblock all"), so it matches what a
						     speech-input user says (WCAG 2.5.3); aria-pressed conveys state. -->
							<button
								class="day-nav-center"
								type="button"
								onclick={() => toggleDay(activeDay)}
								aria-pressed={isDayBlocked(activeDay)}
							>
								<span class="day-nav-title">{$t(`timetable.days.${activeDay}`)}</span>
								<span class="day-nav-meta">
									<span class="day-nav-count">{clampedDayIndex + 1} / {daysOfWeek.length}</span>
									<span class="day-action">
										{isDayBlocked(activeDay)
											? $t('courseSelector.unblockDay')
											: $t('courseSelector.blockDay')}
									</span>
								</span>
							</button>
							<Tooltip.Root>
								<Tooltip.Trigger
									class="day-nav-btn"
									disabled={clampedDayIndex >= daysOfWeek.length - 1}
									onclick={nextDay}
									aria-label={$t('pagination.next')}
								>
									<ChevronRight size={20} aria-hidden="true" />
								</Tooltip.Trigger>
								<TooltipContent label={$t('pagination.next')} />
							</Tooltip.Root>
						</div>
						<div class="day-slots">
							{#each timeSlots as slot (slot)}
								{@const blocked = isBlocked(activeDay, slot)}
								{@const groups = groupSessions(activeDay, slot, grid[activeDay][slot])}
								<button
									class="slot-row"
									class:blocked
									onclick={() => toggleCell(activeDay, slot)}
									aria-pressed={blocked}
								>
									<div class="slot-time-mobile">
										<span>{slot.split('-')[0]}</span>
										<span>{slot.split('-')[1]}</span>
									</div>
									<div class="slot-content">
										{#if groups.length === 0}
											{#if blocked}
												<span class="empty-blocked">
													<Lock size={16} />
												</span>
											{:else}
												<span class="empty-slot">-</span>
											{/if}
										{:else}
											<div class="chips-container">
												{#each groups as g (g.key)}
													{@const isGrouped = g.count > 1}
													<span
														class="course-chip"
														style="background-color: {colorForCourse(g.course)}"
													>
														{isGrouped ? `${g.course} (*)` : `${g.course} (${g.sections[0] ?? ''})`}
														{#if g.classrooms[0] && !isGrouped}
															<span class="chip-classroom">{g.classrooms[0]}</span>
														{/if}
													</span>
												{/each}
											</div>
										{/if}
									</div>
									{#if blocked && groups.length > 0}
										<div class="blocked-badge">
											<Lock size={16} />
										</div>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</Tooltip.Provider>

<style>
	.timetable-container {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		/* Reserve minimum height to prevent CLS */
		min-height: var(--timetable-min-height, 600px);
	}

	/* Skeleton for SSR/loading state */
	.timetable-skeleton {
		min-height: var(--timetable-min-height, 600px);
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

	/* Desktop Table Styles */
	.timetable-scroll {
		overflow-x: auto;
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
	}

	.timetable {
		width: 100%;
		border-collapse: collapse;
		min-width: 900px;
		table-layout: fixed;
		background: var(--surface);
	}

	th,
	td {
		border: 1px solid var(--border);
		padding: 0;
		text-align: center;
		vertical-align: top;
	}

	.time-header {
		width: 90px;
		padding: 12px 8px;
		background: var(--bg);
		font-weight: 700;
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--ink-secondary);
		line-height: 1.2;
	}

	.day-header {
		width: 120px;
		padding: 12px 8px;
		background: var(--bg);
		font-weight: 700;
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		cursor: pointer;
		transition: var(--transition-fast);
		user-select: none;
		line-height: 1.2;
	}

	.day-header:hover:not(.blocked) {
		background: rgba(25, 118, 210, 0.08);
		color: var(--primary);
	}

	.day-header.blocked {
		background: var(--neutral-700);
		color: white;
	}

	.day-header.blocked:hover {
		background: var(--ink-secondary);
	}

	.slot-header {
		padding: 0;
		background: var(--bg);
		font-weight: 600;
		font-size: 12px;
		color: var(--ink-secondary);
		cursor: pointer;
		transition: var(--transition-fast);
		user-select: none;
		height: var(--timetable-cell-height, 72px);
		vertical-align: middle;
	}

	.slot-header.expanded {
		height: auto;
	}

	.slot-header:hover:not(.blocked) {
		background: rgba(25, 118, 210, 0.08);
		color: var(--primary);
	}

	.slot-header.blocked {
		background: var(--neutral-700);
		color: white;
	}

	.slot-header.blocked:hover {
		background: var(--ink-secondary);
	}

	.slot-time {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 8px;
		line-height: 1.15;
	}

	.cell {
		height: var(--timetable-cell-height, 72px);
		padding: 4px;
		background: var(--surface);
		cursor: pointer;
		transition: var(--transition-fast);
		vertical-align: middle;
	}

	.cell.expanded {
		height: auto;
	}

	.cell:hover:not(.blocked) {
		background: rgba(25, 118, 210, 0.04);
	}

	.cell.blocked {
		background: var(--error-light);
	}

	.cell.blocked:hover {
		background: var(--error-soft);
	}

	.cell-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: calc(var(--timetable-cell-height, 72px) - 8px);
		height: auto;
		position: relative;
		gap: 4px;
	}

	.cell-content.blocked {
		background-image: repeating-linear-gradient(
			45deg,
			rgba(244, 67, 54, 0.18) 0 10px,
			rgba(244, 67, 54, 0.05) 10px 20px
		);
	}

	.blocked-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(183, 28, 28, 0.8);
	}

	/* Session Card Styles */
	.session-card {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px 8px;
		border-radius: 6px;
		color: white;
		text-align: left;
		box-shadow: var(--shadow-sm);
		width: 90%;
		cursor: default;
		position: relative;
	}

	.session-card.clickable {
		cursor: pointer;
	}

	.session-card.clickable:hover {
		filter: brightness(0.95);
	}

	.session-card.clickable:focus {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	.session-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 4px;
	}

	.course-code {
		font-weight: 700;
		font-size: 12px;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.expand-btn) {
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: white;
		cursor: pointer;
		padding: 2px;
		border-radius: var(--radius-sm);
		transition: var(--transition-fast);
	}

	:global(.expand-btn:hover) {
		background: rgba(255, 255, 255, 0.2);
	}

	/* Detail text stays full-opacity white (hierarchy via size, not opacity) so it
	 * keeps AA contrast on the course-chip color. */
	.time-range {
		font-size: 11px;
	}

	.classroom {
		font-size: 10px;
	}

	.section-count {
		font-size: 10px;
	}

	.expanded-sections {
		margin-top: 4px;
		padding: 6px;
		/* Dark (not light) overlay so the white section text keeps AA contrast. */
		background: rgba(0, 0, 0, 0.18);
		border-radius: 4px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.section-detail {
		font-size: 10px;
		line-height: 1.4;
	}

	/* Mobile Card View Styles */
	.mobile-view {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.mobile-empty {
		min-height: 200px;
		display: grid;
		place-items: center;
		border: 1px dashed var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		color: var(--ink-muted);
	}

	.day-card {
		background: var(--surface);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
	}

	.day-nav-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		background: var(--primary);
		color: white;
	}

	.day-nav-bar.blocked {
		background: var(--neutral-800);
	}

	:global(.day-nav-btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.14);
		color: inherit;
		cursor: pointer;
		transition: var(--transition-fast);
		flex-shrink: 0;
	}

	:global(.day-nav-btn:hover:not(:disabled)) {
		background: rgba(255, 255, 255, 0.22);
	}

	:global(.day-nav-btn:disabled) {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.day-nav-center {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		border: none;
		background: transparent;
		color: inherit;
		padding: 6px 8px;
		cursor: pointer;
		min-height: 36px;
	}

	.day-nav-center:hover {
		background: rgba(255, 255, 255, 0.08);
		border-radius: var(--radius-md);
	}

	.day-nav-title {
		font-weight: 800;
		letter-spacing: 0.2px;
		line-height: 1.1;
	}

	.day-nav-meta {
		display: inline-flex;
		gap: 10px;
		font-size: 12px;
		font-weight: 600;
		/* Full-opacity white: on the primary bar, dimmed white dropped below AA
		 * contrast. Hierarchy vs the title comes from size/weight instead. */
		line-height: 1.1;
	}

	.day-nav-count {
		font-variant-numeric: tabular-nums;
	}

	.day-action {
		font-size: 12px;
		font-weight: 500;
	}

	.day-slots {
		display: flex;
		flex-direction: column;
	}

	.slot-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 16px;
		min-height: 44px;
		border-bottom: 1px solid var(--border-light);
		cursor: pointer;
		background: var(--surface);
		border: none;
		width: 100%;
		text-align: left;
		transition: var(--transition-fast);
	}

	.slot-row:last-child {
		border-bottom: none;
	}

	.slot-row.blocked {
		background: var(--error-light);
	}

	.slot-row:hover:not(.blocked) {
		background: rgba(25, 118, 210, 0.04);
	}

	.slot-time-mobile {
		min-width: 50px;
		display: flex;
		flex-direction: column;
		font-size: 11px;
		color: var(--ink-muted);
		line-height: 1.1;
	}

	.slot-content {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		align-items: center;
	}

	.empty-slot {
		color: var(--ink-muted);
		font-size: 12px;
		opacity: 0.4;
	}

	.empty-blocked {
		color: rgba(183, 28, 28, 0.6);
	}

	.chips-container {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.course-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px 8px;
		border-radius: 12px;
		color: white;
		font-size: 11px;
		font-weight: 600;
		box-shadow: var(--shadow-sm);
	}

	.chip-classroom {
		/* Lighter weight (not lower opacity) for hierarchy, so the room text keeps
		 * AA contrast against the course-chip color. */
		font-weight: 400;
	}

	.blocked-badge {
		display: flex;
		align-items: center;
		color: rgba(183, 28, 28, 0.8);
		flex-shrink: 0;
	}

	@media (max-width: 720px) {
		.timetable {
			min-width: 600px;
		}

		.day-header {
			width: 100px;
			padding: 10px 6px;
			font-size: 11px;
		}

		.time-header {
			width: 70px;
		}

		.cell {
			height: 60px;
		}
	}

	/* Download mode styling - clean appearance for screenshots */
	:global(.download-mode) .timetable-container {
		background: white;
	}

	:global(.download-mode) .timetable-scroll {
		overflow: visible;
		box-shadow: none;
	}

	:global(.download-mode) .timetable {
		box-shadow: none;
	}

	:global(.download-mode) .cell,
	:global(.download-mode) .day-header,
	:global(.download-mode) .slot-header {
		cursor: default;
	}

	:global(.download-mode) .cell:hover,
	:global(.download-mode) .day-header:hover,
	:global(.download-mode) .slot-header:hover {
		background: inherit;
	}
</style>
