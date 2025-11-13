<script lang="ts">
	import IconTrashCan from "virtual:icons/mdi/trash-can";
	import ContentViewer from "$lib/components/ContentViewer.svelte";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import TranslationList from "$lib/components/TranslationList.svelte";
	import { saveProject } from "$lib/database";
	import type { Translation } from "$lib/project";
	import type { PageProps } from "./$types";

	const props: PageProps = $props();
	const path = $derived(props.params.path);
	const project = $derived(props.data.project);
	const resource = $derived(props.data.resource);

	let translations = $derived(project.listTranslationsForPath(path));
	let selectedIds = $derived(project.getActivatedTranslationIdsForPath(path));

	const original = $derived.by(async () => {
		const blob = await resource.getBlob();
		return await blob.text();
	});

	let overlapping = $derived(project.checkOverlaps(selectedIds));

	let translated = $derived(
		project.renderTranslatedContent(path, selectedIds).catch(() => original),
	);
</script>

<div class="flex flex-1 gap-2 overflow-auto px-2 pb-2">
	<div class="flex-1 overflow-auto rounded bg-base-200 p-1 [scrollbar-width:none]">
		{#if await overlapping}
			<div class="alert alert-error">
				Overlapping translations detected! Please adjust your selection.
			</div>
		{:else}
			<div class="alert alert-success">Selected translations are valid.</div>
		{/if}
		<TranslationList
			{translations}
			{selectedIds}
			onSelectionChange={async (ids) => {
				selectedIds = ids;
				project.setActivatedTranslationsForPath(path, ids);
				await saveProject(project);
			}}
			{itemSnippet}
		/>
	</div>
	<div class="flex flex-1 flex-col gap-2 overflow-auto">
		<ContentViewer
			class="w-full flex-1 overflow-auto rounded bg-base-200"
			data={await translated}
			mediaType="text/html"
			transformUrl={resource?.resolveUrl}
		/>
		<div class="flex-1 overflow-auto rounded bg-base-200 p-2">
			<TranslationDiff original={await original} translated={await translated} />
		</div>
	</div>
</div>

{#snippet itemSnippet(translation: Translation)}
	<button
		class="btn btn-circle btn-ghost btn-error"
		onclick={async () => {
			if (confirm("Are you sure you want to delete this translation?")) {
				project.removeTranslation(translation.id);
				translations = translations.filter((t) => t.id !== translation.id);
				await saveProject(project);
			}
		}}
	>
		<IconTrashCan class="size-6" />
	</button>
{/snippet}
