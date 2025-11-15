<script lang="ts">
	import type { ClassValue } from "svelte/elements";
	import ResourceReader from "$lib/components/ResourceReader.svelte";
	import { getWorkspaceContext } from "$lib/context.svelte";

	const props: { class?: ClassValue | null } = $props();
	const cx = getWorkspaceContext();

	const translated = $derived(
		cx.project.renderTranslatedContent(
			cx.path,
			cx.project.activeTranslationIds.values().toArray(),
		),
	);
</script>

<div class={props.class}>
	{#await translated then translated}
		<ResourceReader
			class="h-full w-full"
			data={translated}
			mediaType="text/html"
			transformUrl={cx.project.epub.getResource(cx.path)?.resolveUrl}
		/>
	{:catch error}
		<div class="h-full w-full p-4">
			<div class="alert text-xs alert-error">{error.message}</div>
		</div>
	{/await}
</div>
