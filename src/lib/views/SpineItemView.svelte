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

	type Mode = "select-partition" | "add-translation" | "compose-translations";
	let mode = $state<Mode>("select-partition");
	$effect(() => {
		if (mode === "add-translation" && !partition) {
			mode = "select-partition";
		}
	});

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

		<ul class="menu menu-horizontal menu-sm">
			<li>
				<button
					class={[mode === "select-partition" && "menu-active"]}
					onclick={() => (mode = "select-partition")}
				>
					Select partition
				</button>
			</li>
			<li class={{ "menu-disabled": !partition }}>
				<button
					class={[mode === "add-translation" && "menu-active"]}
					onclick={() => (mode = "add-translation")}
					disabled={!partition}
				>
					Add translation
				</button>
			</li>
			<li>
				<button
					class={[mode === "compose-translations" && "menu-active"]}
					onclick={() => (mode = "compose-translations")}
				>
					Compose translations
				</button>
			</li>
		</ul>
	</div>

	<div class="flex flex-1 gap-2 overflow-auto px-2 pb-2">
		<div class="flex-1 overflow-auto rounded bg-base-200 p-1 [scrollbar-width:none]">
			{#if path}
				{#if mode === "select-partition"}
					<PartitionSelector bind:partition content={await content} />
				{:else if mode === "add-translation" && partition}
					<p class="p-4">Add a new translation for the selected partition.</p>
				{:else if mode === "compose-translations"}
					<p class="p-4">Compose translations for the selected spine item.</p>
				{/if}
			{/if}
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
</div>
