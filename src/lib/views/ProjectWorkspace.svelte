<script lang="ts">
	import { settled } from "svelte";
	import IconAddCircleOutline from "virtual:icons/mdi/add-circle-outline";
	import IconDifferenceLeft from "virtual:icons/mdi/difference-left";
	import IconFormatListNumbered from "virtual:icons/mdi/format-list-numbered";
	import IconSettings from "virtual:icons/mdi/settings";
	import IconTrashCan from "virtual:icons/mdi/trash-can";
	import FileTree from "$lib/components/FileTree.svelte";
	import HtmlViewer from "$lib/components/HtmlViewer.svelte";
	import TranslationList from "$lib/components/TranslationList.svelte";
	import type { Partition } from "$lib/core/dom";
	import { saveProject } from "$lib/database";
	import Project, { type Translation } from "$lib/project";
	import TranslationCreationView from "./TranslationCreationView.svelte";

	const props: { project: Project; path: string } = $props();

	const project = $derived(props.project);
	let path = $derived(props.path);
	const resource = $derived(project.epub.getResource(path));
	const blob = $derived(resource ? resource.getBlob() : Promise.resolve(new Blob()));
	const text = $derived(blob.then((blob) => blob.text()));

	let mode = $state<
		"navigate-resources" | "add-translation" | "list-translations" | "project-settings"
	>("navigate-resources");

	let partition = $state<Partition | null>(null);
	const selectedText = $derived(
		partition ? project.getOriginalContent(path, partition) : Promise.resolve(""),
	);

	let partitionLocked = $state(false);

	let translations = $derived(project.listTranslationsForPath(path));
	let activeTranslationIds = $derived(project.getActivatedTranslationIdsForPath(path));
	let activeTranslations = $derived(
		activeTranslationIds
			.map((id) => translations.find((t) => t.id === id))
			.filter(Boolean) as Translation[],
	);

	let viewer = $state<HTMLElement>();
	$effect(() => {
		let cancelled = false;
		text.then(() => settled()).then(() => {
			if (cancelled) return;
			viewer?.scrollTo({ top: 0, left: 0 });
		});
		return () => (cancelled = true);
	});

	let panelWidth = $state(480);
	let panelResizing = $state(false);
</script>

<svelte:window
	onmousemove={(event) => {
		if (panelResizing && event.buttons & 1) {
			panelWidth += event.movementX;
		}
	}}
	onmouseup={(event) => {
		if (event.button === 0) {
			panelResizing = false;
		}
	}}
/>

<div
	class="grid h-screen w-screen grid-cols-[var(--panel-width)_auto_1fr] overflow-auto"
	style:--panel-width="{panelWidth}px"
>
	<div id="panel" class="col-start-1 flex flex-col overflow-auto bg-base-200">
		<ul class="menu menu-horizontal mx-auto flex menu-xs">
			<li>
				<button
					onclick={() => (mode = "navigate-resources")}
					class:menu-active={mode === "navigate-resources"}
				>
					<IconFormatListNumbered class="size-4" />
				</button>
			</li>
			<li>
				<button
					onclick={() => (mode = "add-translation")}
					class:menu-active={mode === "add-translation"}
				>
					<IconAddCircleOutline class="size-4" />
				</button>
			</li>
			<li>
				<button
					onclick={() => (mode = "list-translations")}
					class:menu-active={mode === "list-translations"}
				>
					<IconDifferenceLeft class="size-4" />
				</button>
			</li>
			<li>
				<button
					onclick={() => (mode = "project-settings")}
					class:menu-active={mode === "project-settings"}
				>
					<IconSettings class="size-4" />
				</button>
			</li>
		</ul>
		<div class="overflow-auto">
			{#if mode === "navigate-resources"}
				<FileTree
					class="w-full overflow-auto"
					paths={project.epub.listSpinePaths()}
					activePath={path}
					onSelect={async (newPath) => {
						path = newPath;
						partition = null;
						mode = "navigate-resources";
					}}
				/>
			{:else if mode === "add-translation"}
				<TranslationCreationView
					class="p-2"
					original={selectedText}
					targetLanguage={project.targetLanguage}
					onPartitionLockChange={(locked) => (partitionLocked = locked)}
					onTranslationAdd={async (translated) => {
						if (!partition) return;
						const translationId = project.addTranslation(
							path,
							partition,
							await selectedText,
							translated,
						);
						project.activateTranslation(translationId);
						translations = project.listTranslationsForPath(path);
						activeTranslationIds = project.getActivatedTranslationIdsForPath(path);
						mode = "list-translations";
						await saveProject(project);
					}}
				/>
			{:else if mode === "list-translations"}
				<TranslationList
					class="p-2"
					{translations}
					selectedIds={activeTranslationIds}
					onSelectionChange={async (newIds) => {
						project.setActivatedTranslationsForPath(path, newIds);
						activeTranslationIds = newIds;
						await saveProject(project);
					}}
					itemSnippet={translationItemSnippet}
				/>
			{:else if mode === "project-settings"}
				<div class="p-2">
					<button
						class="btn w-full btn-primary"
						onclick={async () => {
							const blob = await project.exportEpub();
							const url = URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = url;
							a.download = `${project.id}.epub`;
							a.click();
							URL.revokeObjectURL(url);
						}}
					>
						Export translated EPUB
					</button>
				</div>
			{/if}
		</div>
	</div>

	<button
		type="button"
		aria-label="Panel Resizer"
		class="col-start-2 block h-full w-1 cursor-col-resize bg-secondary"
		onmousedown={(event) => {
			if (event.button === 0) {
				panelResizing = true;
			}
		}}
	></button>

	<div id="viewer" bind:this={viewer} class="col-start-3 overflow-auto p-2">
		<HtmlViewer
			class="h-full w-full"
			html={await text}
			translations={activeTranslations}
			transformUrl={resource?.resolveUrl}
			{partition}
			onSelectionChange={(newPartition) => {
				if (partitionLocked) return;
				partition = newPartition;
			}}
		/>
	</div>
</div>

{#snippet translationItemSnippet(translation: Translation)}
	<button
		class="btn btn-circle btn-ghost btn-error"
		onclick={async () => {
			if (confirm("Are you sure you want to delete this translation?")) {
				project.removeTranslation(translation.id);
				translations = translations.filter((t) => t.id !== translation.id);
				activeTranslationIds = activeTranslationIds.filter((id) => id !== translation.id);
				await saveProject(project);
			}
		}}
	>
		<IconTrashCan class="size-6" />
	</button>
{/snippet}
