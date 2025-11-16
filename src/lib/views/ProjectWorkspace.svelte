<script lang="ts">
	import IconArrowBack from "virtual:icons/mdi/arrow-back";
	import IconEyeOutline from "virtual:icons/mdi/eye-outline";
	import IconSelectDrag from "virtual:icons/mdi/select-drag";
	import IconSettingsOutline from "virtual:icons/mdi/settings-outline";
	import IconSitemapOutline from "virtual:icons/mdi/sitemap-outline";
	import IconTranslate from "virtual:icons/mdi/translate";
	import IconXml from "virtual:icons/mdi/xml";
	import { resolve } from "$app/paths";
	import { getWorkspaceContext } from "$lib/context.svelte";
	import ProjectSettings from "$lib/views/panels/ProjectSettings.svelte";
	import ResourceNavigation from "$lib/views/panels/ResourceNavigation.svelte";
	import TranslationList from "$lib/views/panels/TranslationList.svelte";
	import TranslationEditor from "$lib/views/popups/TranslationEditor.svelte";
	import TranslationPreview from "$lib/views/viewers/TranslationPreview.svelte";
	import PartitionSelection from "./viewers/PartitionSelection.svelte";

	const cx = getWorkspaceContext();

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
	<div
		id="panel"
		class="relative col-start-1 flex flex-col overflow-auto bg-base-200"
		class:pointer-events-none={panelResizing}
	>
		<a
			aria-disabled={cx.locked}
			href={resolve("/")}
			class="btn absolute top-0 left-0 m-2 border-none btn-ghost btn-xs"
		>
			<IconArrowBack class="size-4" />
		</a>
		<ul class="menu menu-horizontal mx-auto flex menu-xs">
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.panelMode = "navigate-resources")}
					disabled={cx.locked}
					class:menu-active={cx.panelMode === "navigate-resources"}
				>
					<IconSitemapOutline class="size-4" />
				</button>
			</li>
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.panelMode = "list-translations")}
					disabled={cx.locked}
					class:menu-active={cx.panelMode === "list-translations"}
				>
					<IconTranslate class="size-4" />
				</button>
			</li>
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.panelMode = "project-settings")}
					disabled={cx.locked}
					class:menu-active={cx.panelMode === "project-settings"}
				>
					<IconSettingsOutline class="size-4" />
				</button>
			</li>
		</ul>
		<div class="overflow-x-auto overflow-y-scroll">
			{#if cx.panelMode === "navigate-resources"}
				<ResourceNavigation class="w-full" />
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

	<div
		id="viewer"
		class="relative col-start-3 overflow-auto"
		class:pointer-events-none={panelResizing}
	>
		<ul class="menu menu-horizontal absolute top-2 right-2 menu-xs rounded-2xl bg-base-300/90">
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.viewerMode = "select-partitions-preview")}
					disabled={cx.locked}
					class:menu-active={cx.viewerMode === "select-partitions-preview"}
				>
					<IconSelectDrag class="size-4" />
				</button>
			</li>
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.viewerMode = "select-partitions-markup")}
					disabled={cx.locked}
					class:menu-active={cx.viewerMode === "select-partitions-markup"}
				>
					<IconXml class="size-4" />
				</button>
			</li>
			<li class:menu-disabled={cx.locked}>
				<button
					onclick={() => (cx.viewerMode = "preview-translations")}
					disabled={cx.locked}
					class:menu-active={cx.viewerMode === "preview-translations"}
				>
					<IconEyeOutline class="size-4" />
				</button>
			</li>
		</ul>
		<div class="h-full w-full overflow-auto">
			{#if cx.viewerMode === "select-partitions-preview" || cx.viewerMode === "select-partitions-markup"}
				<PartitionSelection class="h-full w-full" />
			{:else if cx.viewerMode === "preview-translations"}
				<TranslationPreview class="h-full w-full" />
			{/if}
		</div>
	</div>
</div>

<dialog class="modal" open={Boolean(cx.popup)}>
	<div class="modal-box max-h-full max-w-2xl">
		<button
			class="btn absolute top-2 right-2 btn-circle btn-ghost btn-xs"
			onclick={() => (cx.popup = null)}>✕</button
		>
		{#if cx.popup?.mode === "edit-translation"}
			<TranslationEditor />
		{/if}
	</div>
</dialog>
