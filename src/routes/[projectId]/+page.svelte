<script lang="ts">
	import { tick, untrack } from "svelte";
	import { replaceState } from "$app/navigation";
	import { setWorkspaceContext, WorkspaceContext } from "$lib/context.svelte";
	import ProjectWorkspace from "$lib/views/ProjectWorkspace.svelte";
	import type { PageProps } from "./$types";

	const props: PageProps = $props();

	const cx = $state(
		new WorkspaceContext(
			props.data.project,
			props.data.path,
			props.data.panelMode,
			props.data.viewerMode,
		),
	);
	setWorkspaceContext(cx);

	$effect(() => {
		const url = untrack(() => props.data.url);
		url.searchParams.set("path", cx.path);
		url.searchParams.set("panel", cx.panelMode);
		url.searchParams.set("viewer", cx.viewerMode);
		tick().then(() => replaceState(url, {}));
	});
</script>

<svelte:head>
	<title>{cx.project.epub.title} - EPUB Translator</title>
</svelte:head>

<ProjectWorkspace />
