<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import ContentViewer from "$lib/components/ContentViewer.svelte";
	import TranslationDiff from "$lib/components/TranslationDiff.svelte";
	import { saveProject } from "$lib/database";
	import TranslationCreationView from "$lib/views/TranslationCreationView.svelte";
	import { getContext } from "../context.svelte";
	import type { PageProps } from "./$types";

	const props: PageProps = $props();
	const projectId = $derived(props.params.projectId);
	const path = $derived(props.params.path);
	const project = $derived(props.data.project);
	const resource = $derived(props.data.resource);
	let cx = getContext();

	const selectedContent = $derived.by(async () => {
		if (!resource || !cx.partition) return "";
		return project.getOriginalContent(resource.path, cx.partition);
	});

	let translationText = $derived.by<string>(() => {
		cx.partition;
		return "";
	});

	async function handleAddTranslation() {
		if (!cx.partition) return;
		project.addTranslation(resource.path, cx.partition, await selectedContent, translationText);
		translationText = "";
		await saveProject(project);
		await goto(
			resolve("/[projectId]/[path]/compose-translations", {
				projectId,
				path: encodeURIComponent(path),
			}),
		);
	}
</script>

<div class="flex flex-1 gap-2 overflow-auto px-2 pb-2">
	<div class="flex-1 overflow-auto rounded bg-base-200 p-1">
		<TranslationCreationView
			original={selectedContent}
			bind:translated={translationText}
			targetLanguage={project.targetLanguage}
			onTranslationAdd={handleAddTranslation}
		/>
	</div>
	<div class="flex flex-1 flex-col gap-2 overflow-auto">
		<ContentViewer
			class="w-full flex-1 overflow-auto rounded bg-base-200"
			data={await selectedContent}
			mediaType="text/html"
			transformUrl={resource?.resolveUrl}
		/>
		<div class="flex-1 overflow-auto rounded bg-base-200 p-2">
			<TranslationDiff original={await selectedContent} translated={translationText} />
		</div>
	</div>
</div>
