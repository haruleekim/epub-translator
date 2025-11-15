<script lang="ts">
	import { settled } from "svelte";
	import IconAddCircleOutline from "virtual:icons/mdi/add-circle-outline";
	import IconDifferenceLeft from "virtual:icons/mdi/difference-left";
	import IconFormatListNumbered from "virtual:icons/mdi/format-list-numbered";
	import IconSettings from "virtual:icons/mdi/settings";
	import HtmlViewer from "$lib/components/HtmlViewer.svelte";
	import { setWorkspaceContext, WorkspaceContext } from "$lib/context.svelte";
	import Project from "$lib/project.svelte";
	import ProjectSettings from "$lib/views/panels/ProjectSettings.svelte";
	import ResourceNavigation from "$lib/views/panels/ResourceNavigation.svelte";
	import TranslationCreation from "$lib/views/panels/TranslationCreation.svelte";
	import TranslationList from "$lib/views/panels/TranslationList.svelte";

	const props: { project: Project; path: string } = $props();

	const cx = $state(new WorkspaceContext(props.project, props.path));
	setWorkspaceContext(cx);

	const resource = $derived(cx.project.epub.getResource(cx.path));
	const blob = $derived(resource ? resource.getBlob() : Promise.resolve(new Blob()));
	const text = $derived(blob.then((blob) => blob.text()));

	let activeTranslations = $derived(cx.project.activeTranslationsForPath(cx.path));

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
					onclick={() => (cx.mode = "navigate-resources")}
					class:menu-active={cx.mode === "navigate-resources"}
				>
					<IconFormatListNumbered class="size-4" />
				</button>
			</li>
			<li>
				<button
					onclick={() => (cx.mode = "add-translation")}
					class:menu-active={cx.mode === "add-translation"}
				>
					<IconAddCircleOutline class="size-4" />
				</button>
			</li>
			<li>
				<button
					onclick={() => (cx.mode = "list-translations")}
					class:menu-active={cx.mode === "list-translations"}
				>
					<IconDifferenceLeft class="size-4" />
				</button>
			</li>
			<li>
				<button
					onclick={() => (cx.mode = "project-settings")}
					class:menu-active={cx.mode === "project-settings"}
				>
					<IconSettings class="size-4" />
				</button>
			</li>
		</ul>
		<div class="overflow-auto">
			{#if cx.mode === "navigate-resources"}
				<ResourceNavigation class="w-full overflow-auto" />
			{:else if cx.mode === "add-translation"}
				<TranslationCreation class="p-2" />
			{:else if cx.mode === "list-translations"}
				<TranslationList class="p-2" />
			{:else if cx.mode === "project-settings"}
				<ProjectSettings class="p-2" />
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
			partition={cx.partition}
			onSelectionChange={(newPartition) => {
				if (cx.locked) return;
				cx.partition = newPartition;
			}}
		/>
	</div>
</div>
