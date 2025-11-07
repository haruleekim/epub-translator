<script lang="ts">
	import ContentViewer from "$lib/components/ContentViewer.svelte";
	import PartitionSelector from "$lib/components/PartitionSelector.svelte";
	import type { Partition } from "$lib/core/common";
	import type { Resource } from "$lib/translator";
	import type Translator from "$lib/translator";

	type Props = {
		translator: Translator;
		resource: Resource;
		partition?: Partition;
	};
	let { translator, resource, partition = $bindable() }: Props = $props();

	const content = $derived(resource.getBlob().then((blob) => blob.text()));

	const partitionContent = $derived.by(async () => {
		[translator, resource, partition];
		if (!partition) return "";
		return translator.getOriginalContent(resource.path, partition);
	});
</script>

<div class="flex h-full w-full flex-col overflow-auto">
	<PartitionSelector content={await content} bind:partition class="flex-1 overflow-auto" />

	<div class="flex h-40 gap-2 overflow-auto bg-base-200">
		<ContentViewer
			data={await partitionContent}
			mediaType="text/html"
			transformUrl={async (url) => {
				return (await resource?.resolveUrl(url)) ?? url;
			}}
			class="flex-1 overflow-auto"
		/>
		<div class="flex-1 overflow-auto text-xs">
			<pre class="whitespace-pre-wrap">{await partitionContent}</pre>
		</div>
	</div>
</div>
