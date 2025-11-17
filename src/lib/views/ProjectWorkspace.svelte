<script lang="ts">
	import IconArrowBack from "virtual:icons/mdi/arrow-back";
	import IconEyeOutline from "virtual:icons/mdi/eye-outline";
	import IconFileTreeOutline from "virtual:icons/mdi/file-tree-outline";
	import IconSelectDrag from "virtual:icons/mdi/select-drag";
	import IconSettingsOutline from "virtual:icons/mdi/settings-outline";
	import IconTranslate from "virtual:icons/mdi/translate";
	import IconXml from "virtual:icons/mdi/xml";
	import { resolve } from "$app/paths";
	import { getWorkspaceContext } from "$lib/context.svelte";
	import ProjectSettings from "$lib/views/panels/ProjectSettings.svelte";
	import ResourceNavigation from "$lib/views/panels/ResourceNavigation.svelte";
	import TranslationList from "$lib/views/panels/TranslationList.svelte";
	import TranslationEditor from "$lib/views/popups/TranslationEditor.svelte";
	import TranslationPreview from "$lib/views/viewers/TranslationPreview.svelte";
	import TranslationMergeEditor from "./popups/TranslationMergeEditor.svelte";
	import PartitionSelection from "./viewers/PartitionSelection.svelte";

	const cx = getWorkspaceContext();

	let panelWidth = $state(480);
	let resizing = $state<{ prevPanelWidth: number; prevScreenX: number } | null>(null);
</script>

<svelte:window
	onmousemove={(event) => {
		if (resizing && event.buttons & 1) {
			panelWidth = resizing.prevPanelWidth + event.screenX - resizing.prevScreenX;
			panelWidth = Math.max(300, panelWidth);
		}
	}}
	onmouseup={(event) => {
		if (event.button === 0) {
			resizing = null;
		}
	}}
/>

<div
	class="grid h-screen w-screen grid-cols-[var(--panel-width)_auto_1fr] overflow-auto"
	style:--panel-width="{panelWidth}px"
>
	<div
		id="panel"
		class="relative col-start-1 flex flex-col overflow-x-auto bg-base-200/50 [scrollbar-width:none]"
		class:pointer-events-none={resizing}
	>
		<div class="sticky top-0 left-0 z-1 bg-base-300/90 shadow-2xl backdrop-blur-2xl">
			<a
				href={resolve("/")}
				class="btn absolute top-0 left-0 m-2 border-none btn-ghost btn-xs"
			>
				<IconArrowBack class="size-4" />
			</a>
			<ul class="menu menu-horizontal mx-auto flex menu-xs">
				<li>
					<button
						onclick={() => (cx.panelMode = "navigate-resources")}
						class:menu-active={cx.panelMode === "navigate-resources"}
					>
						<IconFileTreeOutline class="size-4" />
					</button>
				</li>
				<li>
					<button
						onclick={() => (cx.panelMode = "list-translations")}
						class:menu-active={cx.panelMode === "list-translations"}
					>
						<IconTranslate class="size-4" />
					</button>
				</li>
				<li>
					<button
						onclick={() => (cx.panelMode = "project-settings")}
						class:menu-active={cx.panelMode === "project-settings"}
					>
						<IconSettingsOutline class="size-4" />
					</button>
				</li>
			</ul>
		</div>
		<div class="flex-1">
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
				resizing = {
					prevPanelWidth: panelWidth,
					prevScreenX: event.screenX,
				};
			}
		}}
	></button>

	<div
		id="viewer"
		class="relative col-start-3 overflow-auto"
		class:pointer-events-none={resizing}
	>
		<ul class="menu menu-horizontal absolute top-2 right-2 menu-xs rounded-2xl bg-base-300/90">
			<li>
				<button
					onclick={() => (cx.viewerMode = "select-partitions-preview")}
					class:menu-active={cx.viewerMode === "select-partitions-preview"}
				>
					<IconSelectDrag class="size-4" />
				</button>
			</li>
			<li>
				<button
					onclick={() => (cx.viewerMode = "select-partitions-markup")}
					class:menu-active={cx.viewerMode === "select-partitions-markup"}
				>
					<IconXml class="size-4" />
				</button>
			</li>
			<li>
				<button
					onclick={() => (cx.viewerMode = "preview-translations")}
					class:menu-active={cx.viewerMode === "preview-translations"}
				>
					<IconEyeOutline class="size-4" />
				</button>
			</li>
		</ul>
		<div class="h-full w-full overflow-auto [scrollbar-width:none]">
			{#if cx.viewerMode === "select-partitions-preview" || cx.viewerMode === "select-partitions-markup"}
				<PartitionSelection />
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
		{:else if cx.popup?.mode === "merge-translations"}
			<TranslationMergeEditor />
		{/if}
	</div>
	<button
		class="modal-backdrop"
		onclick={() => {
			if (cx.popup?.mode === "edit-translation") return;
			cx.popup = null;
		}}>close</button
	>
</dialog>
