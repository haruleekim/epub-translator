<script lang="ts">
	import "../app.css";

	const { children } = $props();
</script>

<svelte:head>
	<title>EPUB Translator</title>
</svelte:head>

{@render children()}
