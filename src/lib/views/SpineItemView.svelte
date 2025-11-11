<script lang="ts">
	import ContentViewer from "$lib/components/ContentViewer.svelte";
	import PartitionSelector from "$lib/components/PartitionSelector.svelte";
	import { Partition } from "$lib/core/dom";
	import Project from "$lib/core/project";
	import NavigationDrawer from "./NavigationDrawer.svelte";

	type Props = {
		project: Project;
		path?: string;
		partition?: Partition;
		onPathChange?: (newPath: string | null) => void;
		onPartitionChange?: (newPartition: Partition | null) => void;
	};

	let { project, ...props }: Props = $props();

	let path = $derived(props.path ?? project.epub.getSpineItem(0)?.path);
	$effect(() => void props.onPathChange?.(path ?? null));

	let partition = $derived.by<Partition | null>(() => {
		[project, path];
		return null;
	});
	$effect(() => void props.onPartitionChange?.(partition));

	const resource = $derived.by(() => {
		if (!project || !path) return;
		return project.epub.getResource(path);
	});

	const content = $derived.by(async () => {
		if (!resource) return "";
		const blob = await resource.getBlob();
		return blob.text();
	});

	const selectedContent = $derived.by(async () => {
		if (!project || !path || !partition) return "";
		return project.getOriginalContent(path, partition);
	});
</script>

<div class="flex h-screen w-screen flex-col">
	<div class="navbar justify-between gap-1">
		<div>
			<NavigationDrawer
				epub={project.epub}
				{path}
				onPathChange={(newPath) => (path = newPath ?? undefined)}
			/>
		</div>

		<ul class="menu menu-horizontal menu-xs"></ul>
	</div>

	<div class="flex flex-1 gap-2 overflow-auto">
		<div class="flex-1 overflow-auto">
			<PartitionSelector bind:partition content={await content} />
		</div>
		<div class="flex flex-1 flex-col gap-2 overflow-auto">
			<ContentViewer
				class="w-full flex-1 overflow-auto rounded bg-base-200"
				data={await selectedContent}
				mediaType="text/html"
				transformUrl={resource?.resolveUrl}
			/>
			<code class="flex-1 overflow-auto rounded bg-base-200 text-xs whitespace-pre-wrap">
				{await selectedContent}
			</code>
		</div>
	</div>
</div>
