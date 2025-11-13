<script lang="ts">
	import ContentViewer from "$lib/components/ContentViewer.svelte";
	import PartitionSelector from "$lib/components/PartitionSelector.svelte";
	import { getContext } from "../context.svelte";
	import type { PageProps } from "./$types";

	const props: PageProps = $props();
	const path = $derived(props.params.path);
	const project = $derived(props.data.project);
	const resource = $derived(props.data.resource);
	let cx = getContext();

	const content = $derived.by(async () => {
		if (!resource) return "";
		const blob = await resource.getBlob();
		return blob.text();
	});

	const selectedContent = $derived.by(async () => {
		if (!resource || !cx.partition) return "";
		return project.getOriginalContent(path, cx.partition);
	});
</script>

<div class="flex flex-1 gap-2 overflow-auto px-2 pb-2">
	<div class="flex-1 overflow-auto rounded bg-base-200 p-1">
		<PartitionSelector bind:partition={cx.partition} content={await content} />
	</div>
	<div class="flex flex-1 flex-col gap-2 overflow-auto">
		<ContentViewer
			class="w-full flex-1 overflow-auto rounded bg-base-200"
			data={await selectedContent}
			mediaType="text/html"
			transformUrl={resource?.resolveUrl}
		/>
		<code class="flex-1 overflow-auto rounded bg-base-200 p-2 text-xs whitespace-pre-wrap">
			{await selectedContent}
		</code>
	</div>
</div>
