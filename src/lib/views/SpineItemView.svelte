<script lang="ts">
	import IconClose from "virtual:icons/mdi/close";
	import IconMenu from "virtual:icons/mdi/menu";
	import ContentViewer from "$lib/components/ContentViewer.svelte";
	import FileTree from "$lib/components/FileTree.svelte";
	import PartitionSelector from "$lib/components/PartitionSelector.svelte";
	import { Partition } from "$lib/core/dom";
	import Project from "$lib/core/project";

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

	let drawerOpen = $derived<boolean>(path != null && false);
	let showAllResources = $state(false);

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
			{@render drawer()}
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

{#snippet drawer()}
	<div class="drawer">
		<input id="navigation-drawer" type="checkbox" class="drawer-toggle" checked={drawerOpen} />
		<div class="drawer-content">
			<button
				class="btn btn-circle border-none font-normal btn-ghost"
				onclick={() => (drawerOpen = true)}
			>
				<IconMenu class="size-4" />
			</button>
		</div>
		<div class="drawer-side">
			<button
				aria-label="close sidebar"
				class="drawer-overlay"
				onclick={() => (drawerOpen = false)}
			></button>
			<div class="flex h-full w-fit flex-col overflow-auto bg-base-200 select-none">
				<button
					class="btn mx-2 mt-3 mb-1 btn-circle border-none font-normal btn-ghost"
					onclick={() => (drawerOpen = false)}
				>
					<IconClose class="size-4" />
				</button>
				<div class="w-fit flex-1 overflow-auto">
					{#if project}
						<FileTree
							paths={showAllResources
								? project.epub.getResourcePaths()
								: project.epub.listSpinePaths()}
							activePath={path}
							onSelect={(newPath) => (path = newPath)}
							defaultOpen={!showAllResources}
						/>
					{/if}
				</div>
				<label class="label p-4 text-xs">
					<input
						type="checkbox"
						bind:checked={showAllResources}
						class="checkbox checkbox-xs"
					/>
					Show all resources
				</label>
			</div>
		</div>
	</div>
{/snippet}
