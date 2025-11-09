<script lang="ts">
	import queryString from "query-string";
	import IconClose from "virtual:icons/mdi/close";
	import IconEye from "virtual:icons/mdi/eye";
	import IconFileUpload from "virtual:icons/mdi/file-upload";
	import IconMenu from "virtual:icons/mdi/menu";
	import IconSelectDrag from "virtual:icons/mdi/select-drag";
	import IconTranslate from "virtual:icons/mdi/translate";
	import { pushState } from "$app/navigation";
	import ContentViewer from "$lib/components/ContentViewer.svelte";
	import FileTree from "$lib/components/FileTree.svelte";
	import PartitionSelector from "$lib/components/PartitionSelector.svelte";
	import { Partition } from "$lib/core/common";
	import TranslationComposer from "$lib/core/composer";
	import Project from "$lib/core/project";
	import { openDatabase } from "$lib/database";
	import type { PageProps } from "./$types";

	const { params }: PageProps = $props();
	const { projectId } = params;

	const query = queryString.parse(location.search) as Record<string, string>;

	let drawerOpen = $state(false);
	let showAllResources = $state(false);
	let path = $state<string | undefined>(query.path);
	let partition = $state<Partition | undefined>(
		query.partition ? Partition.parse(query.partition) : undefined,
	);

	function changePath(newPath: string) {
		path = newPath;
		partition = undefined;
	}

	$effect(() => {
		const parts: string[] = [];
		if (path) parts.push(`path=${encodeURIComponent(path)}`);
		if (partition) parts.push(`partition=${encodeURIComponent(partition.toString())}`);
		pushState(`?${parts.join("&")}`, {});
	});

	const db = await openDatabase();
	const projectData = $derived(await db.get("projects", projectId));
	const project = $derived(await (projectData && Project.load(projectData)));
	const resource = $derived.by(() => {
		[project, path];
		if (!project || !path) return;
		return project.epub.getResource(path);
	});
	const content = $derived.by(async () => {
		if (!resource) return "";
		const blob = await resource.getBlob();
		return blob.text();
	});
	const composer = $derived(new TranslationComposer(await content));
</script>

{@render navbar()}

<div class="flex gap-4">
	<div class="flex-1">
		<PartitionSelector bind:partition content={await content} />
	</div>
	<div class="flex-1">
		{#if partition}
			<ContentViewer data={composer.getOriginalContent(partition)} mediaType="text/html" />
		{/if}
	</div>
</div>

{#snippet navbar()}
	<div class="navbar justify-between gap-1">
		<div>
			{@render drawer()}
		</div>

		<ul class="menu menu-horizontal menu-xs"></ul>
	</div>
{/snippet}

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
							onSelect={(newPath) => {
								changePath(newPath);
								drawerOpen = false;
							}}
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
