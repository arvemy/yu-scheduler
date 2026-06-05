<script lang="ts">
	import '../app.css';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();
</script>

<Toaster position="top-center" richColors closeButton duration={3500} />
{@render children()}
