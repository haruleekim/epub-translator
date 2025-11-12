<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import ContentViewer from "$lib/components/ContentViewer.svelte";
	import PartitionSelector from "$lib/components/PartitionSelector.svelte";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import TranslationList from "$lib/components/TranslationList.svelte";
	import { getContext } from "$lib/context.svelte";
	import { Partition } from "$lib/core/dom";
	import Project from "$lib/project";
	import NavigationDrawer from "./NavigationDrawer.svelte";
	import TranslationCreationView from "./TranslationCreationView.svelte";

	type Props = {
		project: Project;
		path?: string;
		partition?: Partition;
		onPathChange?: (newPath: string | null) => void;
		onPartitionChange?: (newPartition: Partition | null) => void;
	};

	const cx = getContext();

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

	let translationText = $derived.by<string | undefined>(() => {
		if (!project || !path || !partition) return;
		return "";
	});

	async function handleAddTranslation() {
		if (!translationText || !partition || !path) return;
		project.addTranslation(path, partition, await selectedContent, translationText);
		translationText = "";
		mode = "compose-translations";
		await cx.saveProject(project.id);
	}
</script>

<div class="flex h-screen w-screen flex-col">
	<div class="navbar justify-between gap-1">
		<div>
			<NavigationDrawer
				epub={project.epub}
				{path}
				onPathChange={(newPath) => (path = newPath ?? undefined)}
				onBackToProjectLists={() => goto(resolve("/"))}
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
					<TranslationCreationView
						original={selectedContent}
						bind:translated={translationText}
						targetLanguage={project.targetLanguage}
						onTranslationAdd={handleAddTranslation}
					/>
				{:else if mode === "compose-translations"}
					<TranslationList
						selectedIds={[]}
						translations={Array.from(project.translations.values())}
					/>
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
			{#if mode === "add-translation" && translationText}
				<div class="flex-1 overflow-auto rounded bg-base-200 p-2">
					<TranslationDiff
						original={await selectedContent}
						translated={translationText}
					/>
				</div>
			{:else}
				<code
					class="flex-1 overflow-auto rounded bg-base-200 p-2 text-xs whitespace-pre-wrap"
				>
					{await selectedContent}
				</code>
			{/if}
		</div>
	</div>
</div>
