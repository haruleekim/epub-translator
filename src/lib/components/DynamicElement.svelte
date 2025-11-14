<script lang="ts" module>
	export const VOID_TAG_NAMES = [
		"area",
		"base",
		"br",
		"col",
		"command",
		"embed",
		"hr",
		"img",
		"input",
		"keygen",
		"link",
		"meta",
		"param",
		"source",
		"track",
		"wbr",
	];
</script>

<script lang="ts">
	const { this: tagName, children, ...attrs }: any = $props();
</script>

{#if VOID_TAG_NAMES.includes(tagName)}
	<svelte:element this={tagName} {...attrs} />
{:else}
	<svelte:element this={tagName} {...attrs}>{@render children()}</svelte:element>
{/if}
