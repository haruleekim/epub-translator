<script lang="ts">
	import { settled } from "svelte";
	import type { ClassValue } from "svelte/elements";
	import PartitionSelector from "$lib/components/PartitionSelector.svelte";
	import { getWorkspaceContext } from "$lib/context.svelte";

	const props: { class?: ClassValue | null } = $props();
	const cx = getWorkspaceContext();

	const resource = $derived(cx.project.epub.getResource(cx.path));
	const blob = $derived(resource ? resource.getBlob() : Promise.resolve(new Blob()));
	const text = $derived(blob.then((blob) => blob.text()));

	let container = $state<HTMLElement>();
	$effect(() => {
		let cancelled = false;
		text.then(() => settled()).then(() => {
			if (cancelled) return;
			container?.scrollTo({ top: 0, left: 0 });
		});
		return () => (cancelled = true);
	});
</script>

<div class={["overflow-auto p-2", props.class]} bind:this={container}>
	<PartitionSelector
		class="h-full w-full"
		mode={cx.viewerMode === "select-partitions-markup" ? "markup" : "preview"}
		html={await text}
		translations={cx.project.activeTranslationsForPath(cx.path)}
		transformUrl={resource?.resolveUrl}
		partition={cx.partition}
		onSelectionChange={(newPartition) => {
			if (cx.locked) return;
			cx.partition = newPartition;
		}}
	/>
</div>
