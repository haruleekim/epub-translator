<script lang="ts">
	import IconClose from "virtual:icons/mdi/close";
	import IconEye from "virtual:icons/mdi/eye";
	import IconFileUpload from "virtual:icons/mdi/file-upload";
	import IconMenu from "virtual:icons/mdi/menu";
	import IconSelectDrag from "virtual:icons/mdi/select-drag";
	import IconTranslate from "virtual:icons/mdi/translate";
	import ContentViewer from "$lib/components/ContentViewer.svelte";
	import FileTree from "$lib/components/FileTree.svelte";
	import type { Partition } from "$lib/core/common";
	import Translator, { type Input } from "$lib/translator";
	import PartitionSelectorView from "$lib/views/PartitionSelectorView.svelte";
	import TranslationView from "$lib/views/TranslationView.svelte";

	const { defaultInput, defaultPath }: { defaultInput?: Input; defaultPath?: string } = $props();

	let mode = $state<"view" | "select" | "translate">("translate");
	let navigationDrawerOpen = $state(false);
	let showAllResources = $state(false);

	let input = $state<Input | undefined>(defaultInput);
	const translator = $derived.by(async () => {
		if (!input) return;
		return Translator.load(input);
	});

	let path = $state<string | undefined>(defaultPath);

	let partition = $state<Partition>();

	function changeInput(newInput?: Input) {
		input = newInput;
		path = partition = undefined;
		mode = "view";
		translator.then((translator) => {
			path ??= translator?.getSpineItem(0)?.path;
		});
	}

	function changePath(newPath?: string) {
		path = newPath;
		partition = undefined;
	}
</script>

<div class="flex h-screen w-screen flex-col">
	{@render navbar()}
	<div class="relative flex-1 overflow-auto">
		<div class="h-full w-full overflow-auto">
			{#await translator then translator}
				{@const resource = path ? translator?.getResource(path) : undefined}
				{#if mode === "view" && resource}
					<ContentViewer
						data={await resource.getBlob()}
						transformUrl={async (url) => (await resource.resolveUrl(url)) ?? url}
						class="h-full w-full"
					/>
				{:else if mode === "select" && translator && resource}
					<PartitionSelectorView {translator} {resource} bind:partition />
				{:else if mode === "translate" && translator && path}
					<TranslationView {translator} {path} {partition} />
				{/if}
			{/await}
		</div>
	</div>
	<div class="overflow-auto bg-base-200 text-xs select-none">
		<div class="flex justify-between p-2">
			<div class="flex justify-start gap-2">
				<span>{path}</span>
				<code>{partition}</code>
			</div>
			<div
				class={[
					"loading invisible loading-xs loading-spinner",
					$effect.pending() && "visible",
				]}
			></div>
		</div>
	</div>
</div>

{#snippet navbar()}
	<div class="navbar justify-between gap-1">
		<div>
			{@render navigationDrawer()}
		</div>

		<ul class="menu menu-horizontal menu-xs">
			<li>
				<button class={{ "menu-active": mode === "view" }} onclick={() => (mode = "view")}>
					<IconEye class="size-4" />
					View
				</button>
			</li>
			<li>
				<button
					class={{ "menu-active": mode === "select" }}
					onclick={() => (mode = "select")}
				>
					<IconSelectDrag class="size-4" />
					Select
				</button>
			</li>
			<li>
				<button
					class={{ "menu-active": mode === "translate" }}
					onclick={() => (mode = "translate")}
				>
					<IconTranslate class="size-4" />
					Translate
				</button>
			</li>
		</ul>

		<label class="btn border-none font-normal btn-ghost btn-xs">
			<input
				type="file"
				accept="application/epub+zip"
				hidden
				onchange={(event) => changeInput(event.currentTarget.files?.[0])}
			/>
			<IconFileUpload class="size-4" />
			Upload
		</label>
	</div>
{/snippet}

{#snippet navigationDrawer()}
	<div class="drawer">
		<input
			id="navigation-drawer"
			type="checkbox"
			class="drawer-toggle"
			checked={navigationDrawerOpen}
		/>
		<div class="drawer-content">
			<button
				class="btn btn-circle border-none font-normal btn-ghost"
				onclick={() => (navigationDrawerOpen = true)}
			>
				<IconMenu class="size-4" />
			</button>
		</div>
		<div class="drawer-side">
			<button
				aria-label="close sidebar"
				class="drawer-overlay"
				onclick={() => (navigationDrawerOpen = false)}
			></button>
			<div class="flex h-full w-fit flex-col overflow-auto bg-base-200 select-none">
				<button
					class="btn m-2 btn-circle border-none font-normal btn-ghost"
					onclick={() => (navigationDrawerOpen = false)}
				>
					<IconClose class="size-4" />
				</button>
				<div class="w-fit flex-1 overflow-auto">
					{#await translator then translator}
						{#if translator}
							<FileTree
								paths={showAllResources
									? translator.getResourcePaths()
									: translator.listSpinePaths()}
								activePath={path}
								onSelect={(newPath) => {
									changePath(newPath);
									navigationDrawerOpen = false;
								}}
								defaultOpen={!showAllResources}
							/>
						{/if}
					{/await}
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
