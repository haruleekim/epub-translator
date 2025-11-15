<script lang="ts">
	import ProjectWorkspace from "$lib/views/ProjectWorkspace.svelte";
	import type { PageProps } from "./$types";

	const props: PageProps = $props();
	const project = $derived(props.data.project);
	const path = $derived(props.data.path);
</script>

<svelte:head>
	<title>{project.epub.title} - EPUB Translator</title>
</svelte:head>

<ProjectWorkspace {project} {path} />
