<script lang="ts">
	import { settled } from "svelte";
	import IconAddCircleOutline from "virtual:icons/mdi/add-circle-outline";
	import IconDifferenceLeft from "virtual:icons/mdi/difference-left";
	import IconEye from "virtual:icons/mdi/eye";
	import IconFormatListNumbered from "virtual:icons/mdi/format-list-numbered";
	import IconHome from "virtual:icons/mdi/home";
	import IconSelectDrag from "virtual:icons/mdi/select-drag";
	import IconSettings from "virtual:icons/mdi/settings";
	import { resolve } from "$app/paths";
	import HtmlViewer from "$lib/components/HtmlViewer.svelte";
	import { getWorkspaceContext } from "$lib/context.svelte";
	import ProjectSettings from "$lib/views/panels/ProjectSettings.svelte";
	import ResourceNavigation from "$lib/views/panels/ResourceNavigation.svelte";
	import TranslationCreation from "$lib/views/panels/TranslationCreation.svelte";
	import TranslationList from "$lib/views/panels/TranslationList.svelte";
	import TranslationPreview from "$lib/views/viewers/TranslationPreview.svelte";

	const cx = getWorkspaceContext();

	const resource = $derived(cx.project.epub.getResource(cx.path));
	const blob = $derived(resource ? resource.getBlob() : Promise.resolve(new Blob()));
	const text = $derived(blob.then((blob) => blob.text()));

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
			<li class:menu-disabled={cx.locked}>
				<!-- svelte-ignore a11y_no_redundant_roles -->
				<a role="link" aria-disabled={cx.locked} href={resolve("/")}>
					<IconHome class="size-4" />
				</a>
			</li>
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.panelMode = "navigate-resources")}
					disabled={cx.locked}
					class:menu-active={cx.panelMode === "navigate-resources"}
				>
					<IconFormatListNumbered class="size-4" />
				</button>
			</li>
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.panelMode = "add-translation")}
					disabled={cx.locked}
					class:menu-active={cx.panelMode === "add-translation"}
				>
					<IconAddCircleOutline class="size-4" />
				</button>
			</li>
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.panelMode = "list-translations")}
					disabled={cx.locked}
					class:menu-active={cx.panelMode === "list-translations"}
				>
					<IconDifferenceLeft class="size-4" />
				</button>
			</li>
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.panelMode = "project-settings")}
					disabled={cx.locked}
					class:menu-active={cx.panelMode === "project-settings"}
				>
					<IconSettings class="size-4" />
				</button>
			</li>
		</ul>
		<div class="overflow-auto">
			{#if cx.panelMode === "navigate-resources"}
				<ResourceNavigation class="w-full overflow-auto" />
			{:else if cx.panelMode === "add-translation"}
				<TranslationCreation class="p-2" />
			{:else if cx.panelMode === "list-translations"}
				<TranslationList class="p-2" />
			{:else if cx.panelMode === "project-settings"}
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

	<div id="viewer" bind:this={viewer} class="col-start-3 overflow-auto">
		<ul
			class="menu menu-horizontal absolute top-2 right-2 z-10 ml-auto flex justify-end menu-xs rounded-2xl bg-base-300/90"
		>
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.viewerMode = "select-partitions")}
					disabled={cx.locked}
					class:menu-active={cx.viewerMode === "select-partitions"}
				>
					<IconSelectDrag class="size-4" />
				</button>
			</li>
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.viewerMode = "preview-translations")}
					disabled={cx.locked}
					class:menu-active={cx.viewerMode === "preview-translations"}
				>
					<IconEye class="size-4" />
				</button>
			</li>
		</ul>
		<div class="h-full w-full overflow-auto">
			{#if cx.viewerMode === "select-partitions"}
				<HtmlViewer
					class="h-full w-full p-2"
					html={await text}
					translations={cx.project.activeTranslationsForPath(cx.path)}
					transformUrl={resource?.resolveUrl}
					partition={cx.partition}
					onSelectionChange={(newPartition) => {
						if (cx.locked) return;
						cx.partition = newPartition;
					}}
				/>
			{:else if cx.viewerMode === "preview-translations"}
				<TranslationPreview class="h-full w-full" />
			{/if}
		</div>
	</div>
</div>
