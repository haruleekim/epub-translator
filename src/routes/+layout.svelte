<script lang="ts">
	import Context, { setContext } from "$lib/context.svelte";
	import "../app.css";

	const { children } = $props();
	const cx = $state(new Context());
	setContext(cx);
</script>

<svelte:head>
	<title>EPUB Translator</title>
</svelte:head>

{@render children()}
