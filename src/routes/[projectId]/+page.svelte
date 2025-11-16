<script lang="ts">
	import { setWorkspaceContext, WorkspaceContext } from "$lib/context.svelte";
	import ProjectWorkspace from "$lib/views/ProjectWorkspace.svelte";
	import type { PageProps } from "./$types";

	const props: PageProps = $props();

	const cx = $state(new WorkspaceContext(props.data.project, props.data.path));
	setWorkspaceContext(cx);
</script>

<svelte:head>
	<title>{cx.project.epub.title} - EPUB Translator</title>
</svelte:head>

<ProjectWorkspace />
