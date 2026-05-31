<script lang="ts">
	import { Tooltip } from 'bits-ui';

	let {
		label,
		side = 'top',
		align = 'center',
		sideOffset = 8
	}: {
		label: string;
		side?: 'top' | 'right' | 'bottom' | 'left';
		align?: 'start' | 'center' | 'end';
		sideOffset?: number;
	} = $props();
</script>

<Tooltip.Portal>
	<Tooltip.Content class="tooltip-content" {side} {align} {sideOffset}>
		{label}
		<Tooltip.Arrow class="tooltip-arrow" />
	</Tooltip.Content>
</Tooltip.Portal>
