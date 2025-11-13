<script lang="ts">
	import ContentViewer from "$lib/components/ContentViewer.svelte";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import TranslationList from "$lib/components/TranslationList.svelte";
	import { saveProject } from "$lib/database";
	import type { PageProps } from "./$types";

	const props: PageProps = $props();
	const path = $derived(props.params.path);
	const project = $derived(props.data.project);
	const resource = $derived(props.data.resource);

	const translations = $derived(project.listTranslationsForPath(path));
	let selectedIds = $derived(project.getActivatedTranslationIdsForPath(path));

	const original = $derived.by(async () => {
		const blob = await resource.getBlob();
		return await blob.text();
	});

	let translated = $derived(project.renderTranslatedContent(path, selectedIds));
</script>

<div class="flex flex-1 gap-2 overflow-auto px-2 pb-2">
	<div class="flex-1 overflow-auto rounded bg-base-200 p-1 [scrollbar-width:none]">
		<TranslationList
			{translations}
			{selectedIds}
			onSelectionChange={async (ids) => {
				selectedIds = ids;
				project.setActivatedTranslationsForPath(path, ids);
				await saveProject(project);
			}}
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
